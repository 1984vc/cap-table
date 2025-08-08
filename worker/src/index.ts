import { DurableObject } from "cloudflare:workers";
import holdingHtml from "./pages/holding.html";
import dashboardHtml from "./pages/dashboard.html";
import demoHtml from "./pages/demo.html";

interface JSONObjectData {
	data: any;
	version: number;
	lastModified: string;
	id?: string;
	editKey?: string;
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

export class JSONObjectStore extends DurableObject<Env> {
	private sessions: Set<WebSocket> = new Set();

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		
		if (url.pathname === "/websocket") {
			return this.handleWebSocketUpgrade(request);
		}

		const corsHeaders = {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		};

		if (request.method === "OPTIONS") {
			return new Response(null, { headers: corsHeaders });
		}

		try {
			if (request.method === "GET") {
				return await this.handleGet(request, corsHeaders);
			} else if (request.method === "PUT") {
				return await this.handlePut(request, corsHeaders);
			} else {
				return new Response("Method not allowed", { 
					status: 405, 
					headers: corsHeaders 
				});
			}
		} catch (error) {
			console.error("Error handling request:", error);
			return new Response("Internal server error", { 
				status: 500, 
				headers: corsHeaders 
			});
		}
	}

	private async handleWebSocketUpgrade(request: Request): Promise<Response> {
		const webSocketPair = new WebSocketPair();
		const [client, server] = Object.values(webSocketPair);

		server.accept();
		this.sessions.add(server);

		server.addEventListener("close", () => {
			this.sessions.delete(server);
		});

		server.addEventListener("error", () => {
			this.sessions.delete(server);
		});

		return new Response(null, {
			status: 101,
			webSocket: client,
		});
	}

	private async handleGet(request: Request, corsHeaders: Record<string, string>): Promise<Response> {
		const url = new URL(request.url);
		const apiMatch = url.pathname.match(/^\/api\/objects\/([^\/]+)/);
		const compositeId = apiMatch ? apiMatch[1] : null;
		const parsedId = compositeId ? parseCompositeId(compositeId) : null;
		const editKey = parsedId ? parsedId.editKey : undefined;

		const stored = await this.ctx.storage.get<JSONObjectData>("jsonData");

		if (!stored || (editKey && editKey !== stored.editKey)) {
			return new Response(JSON.stringify({ error: "Object not found" }), {
				status: 404,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});
		}

		const publicData = {
			data: stored.data,
			version: stored.version,
			lastModified: stored.lastModified,
		};

		return new Response(JSON.stringify(publicData), {
			status: 200,
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		});
	}

	private async handlePut(request: Request, corsHeaders: Record<string, string>): Promise<Response> {
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
			const existing = await this.ctx.storage.get<JSONObjectData>("jsonData");

			if (existing) {
				if (!editKey || editKey !== existing.editKey) {
					return new Response(JSON.stringify({ error: "Edit key required for updates" }), {
						status: 403,
						headers: { ...corsHeaders, "Content-Type": "application/json" }
					});
				}
			} else {
				if (!editKey) {
					return new Response(JSON.stringify({ error: "Edit key required for creation" }), {
						status: 400,
						headers: { ...corsHeaders, "Content-Type": "application/json" }
					});
				}
			}

			const version = existing ? existing.version + 1 : 1;
			
			const objectData: JSONObjectData = {
				data: newData,
				version,
				lastModified: new Date().toISOString(),
				id: objectId || existing?.id,
				editKey: editKey || existing?.editKey
			};

			await this.ctx.storage.put("jsonData", objectData);

			this.broadcast(JSON.stringify({
				type: "update",
				data: objectData.data,
				version: objectData.version,
				lastModified: objectData.lastModified
			}));

			const responseData = {
				data: objectData.data,
				version: objectData.version,
				lastModified: objectData.lastModified,
				...(version === 1 ? { id: objectData.id, editKey: objectData.editKey } : {})
			};

			return new Response(JSON.stringify(responseData), {
				status: 200,
				headers: { ...corsHeaders, "Content-Type": "application/json" }
			});
		} catch (error) {
			console.error("Error in PUT handler:", error);
			return new Response(JSON.stringify({ error: "Failed to update object" }), {
				status: 500,
				headers: { ...corsHeaders, "Content-Type": "application/json" }
			});
		}
	}

	private broadcast(message: string): void {
		this.sessions.forEach((session) => {
			try {
				if (session.readyState === WebSocket.READY_STATE_OPEN) {
					session.send(message);
				}
			} catch (error) {
				console.error("Error broadcasting to WebSocket:", error);
				this.sessions.delete(session);
			}
		});
	}
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const corsHeaders = {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		};

		if (request.method === "OPTIONS") {
			return new Response(null, { headers: corsHeaders });
		}

		// Handle API routes first
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

			const id: DurableObjectId = env.MY_DURABLE_OBJECT.idFromName(parsedId.id);
			const stub = env.MY_DURABLE_OBJECT.get(id);

			const modifiedRequest = new Request(request);
			modifiedRequest.headers.set('X-Edit-Key', parsedId.editKey || '');
			modifiedRequest.headers.set('X-Object-Id', parsedId.id);

			if (subPath === "ws" && request.headers.get("Upgrade") === "websocket") {
				return stub.fetch(new Request(`${url.origin}/websocket`, modifiedRequest));
			}

			return stub.fetch(modifiedRequest);
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
