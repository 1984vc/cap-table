import holdingHtml from "./pages/holding.html";
import dashboardHtml from "./pages/dashboard.html";
import demoHtml from "./pages/demo.html";

interface WorksheetData {
	id: string;
	edit_key: string;
	worksheet_data: string; // JSON serialized data
	version: number;
	last_modified: string;
	created_at: string;
}

// Default worksheet data structure
function getDefaultWorksheetData() {
	return {
		revenue: {
			amount: 0,
			growthMode: 'linear' as const,
			growthRate: 10,
			growthInterval: 'monthly' as const
		},
		costs: [],
		startDate: new Date().toISOString().split('T')[0],
		runway: 24,
		initialFunding: 0,
		valuation: {
			preMoneyValuation: 0,
			equityGiven: 0
		},
		teamMembers: [],
		office: {
			type: 'remote' as const,
			cost: 0
		},
		metrics: {
			currentMRR: 0,
			customerCount: 0,
			churnRate: 0,
			cac: 0,
			ltv: 0
		}
	};
}

function generateBase58Id(length: number = 8): string {
	const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
	let result = '';
	for (let i = 0; i < length; i++) {
		result += alphabet[Math.floor(Math.random() * alphabet.length)];
	}
	return result;
}

function parseCompositeId(compositeId: string): { id: string; editKey?: string } | null {
	const parts = compositeId.split('-');
	if (parts.length === 1) {
		return { id: parts[0] };
	}
	if (parts.length === 2) {
		return { id: parts[0], editKey: parts[1] };
	}
	return null;
}

function validateBase58(str: string): boolean {
	const base58Regex = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;
	return base58Regex.test(str);
}

// Durable Object for managing WebSocket connections per worksheet
export class WorksheetCoordinatorDurableObject implements DurableObject {
	private state: DurableObjectState;
	private env: Env;
	private sessions: Set<WebSocket>;

	constructor(state: DurableObjectState, env: Env) {
		this.state = state;
		this.env = env;
		this.sessions = new Set();
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		
		// Handle WebSocket upgrade
		if (request.headers.get("Upgrade") === "websocket") {
			const webSocketPair = new WebSocketPair();
			const [client, server] = Object.values(webSocketPair);

			this.state.acceptWebSocket(server);
			this.sessions.add(server);
			console.log(`🔗 WebSocket connected. Total sessions: ${this.sessions.size}`);

			return new Response(null, {
				status: 101,
				webSocket: client,
			});
		}

		// Handle broadcast messages from the main worker
		if (request.method === "POST" && url.pathname === "/broadcast") {
			const message = await request.text();
			console.log(`🔊 Durable Object received broadcast message:`, message);
			console.log(`👥 Broadcasting to ${this.sessions.size} connected clients`);
			this.broadcast(message);
			return new Response("OK");
		}

		return new Response("Not found", { status: 404 });
	}

	async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
		// Echo messages to all connected clients
		const response = JSON.stringify({
			type: "message",
			data: message,
			connections: this.sessions.size,
			timestamp: new Date().toISOString()
		});

		this.broadcast(response);
	}

	async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
		this.sessions.delete(ws);
	}

	async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
		this.sessions.delete(ws);
	}

	private broadcast(message: string): void {
		this.sessions.forEach((ws) => {
			try {
				if (ws.readyState === WebSocket.READY_STATE_OPEN) {
					ws.send(message);
				}
			} catch (error) {
				console.error("Error broadcasting to WebSocket:", error);
				this.sessions.delete(ws);
			}
		});
	}
}

async function handleGet(request: Request, env: Env, compositeId: string): Promise<Response> {
	const corsHeaders = {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, X-Edit-Key, X-Object-Id",
	};

	const parsedId = parseCompositeId(compositeId);
	if (!parsedId) {
		return new Response(JSON.stringify({ error: "Invalid ID format" }), {
			status: 400,
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		});
	}

	const { id, editKey } = parsedId;

	try {
		// Query the D1 database for the worksheet
		const result = await env.DB.prepare(
			"SELECT id, edit_key, worksheet_data, version, last_modified FROM finance_worksheets WHERE id = ?"
		).bind(id).first<WorksheetData>();

		if (!result) {
			// Worksheet doesn't exist - create it with default data if edit key is provided
			if (editKey) {
				// Auto-create worksheet with default data
				const now = new Date().toISOString();
				const defaultData = getDefaultWorksheetData();
				const version = 1;

				try {
					await env.DB.prepare(
						"INSERT INTO finance_worksheets (id, edit_key, worksheet_data, version, last_modified, created_at) VALUES (?, ?, ?, ?, ?, ?)"
					).bind(id, editKey, JSON.stringify(defaultData), version, now, now).run();

					// Return the newly created worksheet
					const publicData = {
						data: defaultData,
						version: version,
						lastModified: now,
						created: true // Signal that this was just created
					};

					return new Response(JSON.stringify(publicData), {
						status: 200,
						headers: { ...corsHeaders, "Content-Type": "application/json" },
					});
				} catch (createError) {
					console.error("Error creating worksheet:", createError);
					return new Response(JSON.stringify({ error: "Failed to create worksheet" }), {
						status: 500,
						headers: { ...corsHeaders, "Content-Type": "application/json" },
					});
				}
			} else {
				// No edit key provided, return 404
				return new Response(JSON.stringify({ 
					error: "Worksheet not found",
					message: "To create a new worksheet, include the edit key in the URL (e.g., /api/objects/id-editkey)"
				}), {
					status: 404,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				});
			}
		}

		// Check edit key if provided
		if (editKey && editKey !== result.edit_key) {
			return new Response(JSON.stringify({ error: "Invalid edit key" }), {
				status: 403,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});
		}

		// Parse the stored JSON data
		const worksheetData = JSON.parse(result.worksheet_data);

		const publicData = {
			data: worksheetData,
			version: result.version,
			lastModified: result.last_modified,
		};

		return new Response(JSON.stringify(publicData), {
			status: 200,
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Error in GET handler:", error);
		return new Response(JSON.stringify({ error: "Internal server error" }), {
			status: 500,
			headers: { ...corsHeaders, "Content-Type": "application/json" }
		});
	}
}

async function handlePut(request: Request, env: Env, compositeId: string): Promise<Response> {
	const corsHeaders = {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, X-Edit-Key, X-Object-Id",
	};

	try {
		const body = await request.text();
		let newData: any;

		try {
			newData = JSON.parse(body);
		} catch {
			return new Response(JSON.stringify({ error: "Invalid JSON" }), {
				status: 400,
				headers: { ...corsHeaders, "Content-Type": "application/json" }
			});
		}

		const editKey = request.headers.get('X-Edit-Key');
		const objectId = request.headers.get('X-Object-Id');
		
		const parsedId = parseCompositeId(compositeId);
		if (!parsedId) {
			return new Response(JSON.stringify({ error: "Invalid ID format" }), {
				status: 400,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});
		}

		const { id } = parsedId;

		// Check if worksheet exists
		const existing = await env.DB.prepare(
			"SELECT id, edit_key, version FROM finance_worksheets WHERE id = ?"
		).bind(id).first<Pick<WorksheetData, 'id' | 'edit_key' | 'version'>>();

		if (existing) {
			// Update existing worksheet
			// Check if edit key matches from either header or URL
			const urlEditKey = parsedId.editKey;
			const validEditKey = editKey || urlEditKey;
			
			if (!validEditKey || validEditKey !== existing.edit_key) {
				return new Response(JSON.stringify({ error: "Edit key required for updates" }), {
					status: 403,
					headers: { ...corsHeaders, "Content-Type": "application/json" }
				});
			}

			const newVersion = existing.version + 1;
			const now = new Date().toISOString();

			await env.DB.prepare(
				"UPDATE finance_worksheets SET worksheet_data = ?, version = ?, last_modified = ? WHERE id = ?"
			).bind(JSON.stringify(newData), newVersion, now, id).run();

			// Broadcast update to connected WebSocket clients via Durable Object
			const durableObjectId = env.WORKSHEET_COORDINATOR.idFromName(id);
			const durableObjectStub = env.WORKSHEET_COORDINATOR.get(durableObjectId);
			
			// Send only notification with version info, not the full data
			const updateMessage = JSON.stringify({
				type: "update",
				worksheetId: id,
				version: newVersion,
				lastModified: now
			});

			try {
				console.log(`📡 Broadcasting update notification for worksheet ${id}, version ${newVersion}`);
				await durableObjectStub.fetch("http://fake-host/broadcast", {
					method: "POST",
					body: updateMessage
				});
				console.log(`✅ Broadcast successful for worksheet ${id}`);
			} catch (error) {
				console.error("❌ Error broadcasting to Durable Object:", error);
			}

			const responseData = {
				data: newData,
				version: newVersion,
				lastModified: now,
			};

			return new Response(JSON.stringify(responseData), {
				status: 200,
				headers: { ...corsHeaders, "Content-Type": "application/json" }
			});
		} else {
			// Create new worksheet
			// Accept edit key from either header or URL
			const urlEditKey = parsedId.editKey;
			const finalEditKey = editKey || urlEditKey || generateBase58Id(16);
			
			const worksheetId = objectId || id;
			const now = new Date().toISOString();
			const version = 1;

			await env.DB.prepare(
				"INSERT INTO finance_worksheets (id, edit_key, worksheet_data, version, last_modified, created_at) VALUES (?, ?, ?, ?, ?, ?)"
			).bind(worksheetId, finalEditKey, JSON.stringify(newData), version, now, now).run();

			// Broadcast creation to connected WebSocket clients via Durable Object
			const durableObjectId = env.WORKSHEET_COORDINATOR.idFromName(worksheetId);
			const durableObjectStub = env.WORKSHEET_COORDINATOR.get(durableObjectId);
			
			// Send only notification with version info, not the full data
			const createMessage = JSON.stringify({
				type: "update",
				worksheetId: worksheetId,
				version: version,
				lastModified: now
			});

			try {
				console.log(`📡 Broadcasting creation notification for worksheet ${worksheetId}, version ${version}`);
				await durableObjectStub.fetch("http://fake-host/broadcast", {
					method: "POST",
					body: createMessage
				});
				console.log(`✅ Broadcast successful for worksheet ${worksheetId}`);
			} catch (error) {
				console.error("❌ Error broadcasting to Durable Object:", error);
			}

			const responseData = {
				data: newData,
				version: version,
				lastModified: now,
				id: worksheetId,
				editKey: finalEditKey
			};

			return new Response(JSON.stringify(responseData), {
				status: 200,
				headers: { ...corsHeaders, "Content-Type": "application/json" }
			});
		}
	} catch (error) {
		console.error("Error in PUT handler:", error);
		return new Response(JSON.stringify({ error: "Failed to update object" }), {
			status: 500,
			headers: { ...corsHeaders, "Content-Type": "application/json" }
		});
	}
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const corsHeaders = {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, X-Edit-Key, X-Object-Id",
		};

		if (request.method === "OPTIONS") {
			return new Response(null, { headers: corsHeaders });
		}

		// Handle API routes
		const apiMatch = url.pathname.match(/^\/api\/objects\/([^\/]+)(?:\/(.*))?$/);
		if (apiMatch) {
			const [, compositeId, subPath] = apiMatch;

			const parsedId = parseCompositeId(compositeId);
			if (!parsedId || !validateBase58(parsedId.id) || (parsedId.editKey && !validateBase58(parsedId.editKey))) {
				return new Response(JSON.stringify({ error: "Invalid ID format. Expected base58ID or base58ID-base58EditKey" }), {
					status: 404,
					headers: { ...corsHeaders, "Content-Type": "application/json" }
				});
			}

			// Handle WebSocket upgrade for this worksheet
			if (subPath === "ws" && request.headers.get("Upgrade") === "websocket") {
				const durableObjectId = env.WORKSHEET_COORDINATOR.idFromName(parsedId.id);
				const durableObjectStub = env.WORKSHEET_COORDINATOR.get(durableObjectId);
				return durableObjectStub.fetch(request);
			}

			// Handle regular API requests
			if (request.method === "GET") {
				return handleGet(request, env, compositeId);
			} else if (request.method === "PUT") {
				return handlePut(request, env, compositeId);
			} else {
				return new Response("Method not allowed", { 
					status: 405, 
					headers: corsHeaders 
				});
			}
		}

		// Serve static assets (React app)
		try {
			return await (env as any).ASSETS.fetch(request);
		} catch (error) {
			// If asset not found, serve index.html for client-side routing
			try {
				const indexRequest = new Request(new URL("/index.html", request.url), request);
				return await (env as any).ASSETS.fetch(indexRequest);
			} catch (indexError) {
				return new Response("Not found", { status: 404, headers: corsHeaders });
			}
		}
	},
} satisfies ExportedHandler<Env>;
