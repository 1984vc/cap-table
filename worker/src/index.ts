import holdingHtml from "./pages/holding.html";
import dashboardHtml from "./pages/dashboard.html";
import demoHtml from "./pages/demo.html";
import { decompressState, isLegacyHash } from "./utils/stateCompression";
import { fitConversion, buildPricedRoundCapTable, populateSafeCaps, CapTableRowType, CommonRowType } from "@1984vc/cap-table";
import type { SAFENote, CommonStockholder, SeriesInvestor, StakeHolder } from "@1984vc/cap-table";

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
	private sessions: Map<WebSocket, { lastPing: number; isAlive: boolean; worksheetId: string }>;
	private cleanupInterval?: number;
	private worksheetId: string | null = null;

	constructor(state: DurableObjectState, env: Env) {
		this.state = state;
		this.env = env;
		this.sessions = new Map();
		
		// Start periodic cleanup of dead connections
		this.startCleanupInterval();
	}

	private startCleanupInterval(): void {
		// Clean up dead connections every 60 seconds
		this.cleanupInterval = setInterval(() => {
			this.cleanupDeadConnections();
		}, 60000) as any;
	}

	private cleanupDeadConnections(): void {
		const now = Date.now();
		const deadConnections: WebSocket[] = [];
		
		this.sessions.forEach((sessionInfo, ws) => {
			// Consider connection dead if no ping received in last 45 seconds (more generous than client timeout)
			// This accounts for client heartbeat interval (10s) + timeout (5s) + retry count (3) + buffer
			const deadThreshold = 45000; // 45 seconds
			const timeSinceLastPing = now - sessionInfo.lastPing;
			
			if (timeSinceLastPing > deadThreshold || ws.readyState !== WebSocket.OPEN) {
				deadConnections.push(ws);
				console.log(`🧹 Marking connection as dead: ${timeSinceLastPing}ms since last ping, readyState: ${ws.readyState}`);
			}
		});

		deadConnections.forEach(ws => {
			console.log(`🧹 Cleaning up dead WebSocket connection`);
			this.sessions.delete(ws);
			try {
				if (ws.readyState === WebSocket.OPEN) {
					ws.close(1000, 'Connection cleanup');
				}
			} catch (error) {
				console.error('Error closing dead connection:', error);
			}
		});

		if (deadConnections.length > 0) {
			console.log(`🧹 Cleaned up ${deadConnections.length} dead connections. Active sessions: ${this.sessions.size}`);
		}
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		
		// Handle WebSocket upgrade
		if (request.headers.get("Upgrade") === "websocket") {
			// Extract worksheet ID from URL path or query params
			const pathMatch = url.pathname.match(/\/api\/objects\/([^\/]+)\/ws/);
			const worksheetId = pathMatch ? pathMatch[1].split('-')[0] : url.searchParams.get('worksheetId');
			
			if (!worksheetId) {
				return new Response("Missing worksheet ID", { status: 400 });
			}
			
			// Set the worksheet ID for this DO instance if not already set
			if (!this.worksheetId) {
				this.worksheetId = worksheetId;
			} else if (this.worksheetId !== worksheetId) {
				// This shouldn't happen if routing is correct, but log it
				console.warn(`⚠️ Worksheet ID mismatch: expected ${this.worksheetId}, got ${worksheetId}`);
			}

			const webSocketPair = new WebSocketPair();
			const [client, server] = Object.values(webSocketPair);

			this.state.acceptWebSocket(server);
			this.sessions.set(server, { 
				lastPing: Date.now(), 
				isAlive: true, 
				worksheetId: worksheetId 
			});
			
			console.group(`🔗 WebSocket Connection Established`);
			console.log(`🕐 Connected at:`, new Date().toISOString());
			console.log(`🌐 Request URL:`, request.url);
			console.log(`📋 Worksheet ID:`, worksheetId);
			console.log(`📊 Total active sessions:`, this.sessions.size);
			console.log(`🔗 WebSocket pair created successfully`);
			console.groupEnd();

			return new Response(null, {
				status: 101,
				webSocket: client,
			});
		}

		// Handle broadcast messages from the main worker
		if (request.method === "POST" && url.pathname === "/broadcast") {
			const message = await request.text();
			
			console.group(`🔊 Durable Object Broadcast`);
			console.log(`🕐 Broadcast at:`, new Date().toISOString());
			console.log(`📄 Raw message:`, message);
			console.log(`📊 Message size:`, message.length, 'bytes');
			console.log(`👥 Active sessions:`, this.sessions.size);
			
			let parsedMessage;
			try {
				parsedMessage = JSON.parse(message);
				console.log(`📥 Parsed message:`, parsedMessage);
				console.log(`🏷️ Message type:`, parsedMessage.type);
				if (parsedMessage.worksheetId) {
					console.log(`📋 Worksheet ID:`, parsedMessage.worksheetId);
					
					// Verify this broadcast is for the correct worksheet
					if (this.worksheetId && parsedMessage.worksheetId !== this.worksheetId) {
						console.warn(`⚠️ Broadcast worksheet ID mismatch: DO is for ${this.worksheetId}, message is for ${parsedMessage.worksheetId}`);
						return new Response("Worksheet ID mismatch", { status: 400 });
					}
				}
			} catch (e) {
				console.log(`⚠️ Message is not JSON, broadcasting as-is`);
			}
			
			console.groupEnd();
			
			// Only broadcast if we have active sessions
			if (this.sessions.size > 0) {
				this.broadcast(message);
				console.log(`✅ Broadcasted to ${this.sessions.size} sessions`);
			} else {
				console.log(`ℹ️ No active sessions to broadcast to`);
			}
			
			return new Response("OK");
		}

		return new Response("Not found", { status: 404 });
	}

	async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
		console.group(`📨 Durable Object WebSocket Message Received`);
		console.log(`🕐 Timestamp:`, new Date().toISOString());
		console.log(`📄 Raw message:`, message);
		console.log(`📊 Message size:`, typeof message === 'string' ? message.length : message.byteLength, 'bytes');
		console.log(`👥 Active sessions:`, this.sessions.size);
		console.log(`🔗 WebSocket state:`, ws.readyState);
		
		const sessionInfo = this.sessions.get(ws);
		if (!sessionInfo) {
			console.warn(`⚠️ Received message from unknown WebSocket connection`);
			console.groupEnd();
			return;
		}
		
		try {
			if (typeof message === 'string') {
				const parsedMessage = JSON.parse(message);
				console.log(`📥 Parsed message:`, parsedMessage);
				console.log(`🏷️ Message type:`, parsedMessage.type);
				
				// Handle ping/pong for heartbeat
				if (parsedMessage.type === 'ping') {
					// Update last ping time for this session
					sessionInfo.lastPing = Date.now();
					sessionInfo.isAlive = true;
					
					// Send pong response
					const pongResponse = JSON.stringify({
						type: 'pong',
						timestamp: Date.now()
					});
					
					try {
						ws.send(pongResponse);
						console.log(`💓 Sent pong response to client`);
					} catch (error) {
						console.error(`❌ Failed to send pong response:`, error);
					}
					console.groupEnd();
					return;
				}
				
				// Handle other message types - for now, we don't expect clients to send data messages
				// The real-time updates are handled via HTTP PUT + broadcast, not direct WebSocket messages
				console.log(`ℹ️ Received non-ping message from client, ignoring: ${parsedMessage.type}`);
			} else {
				console.log(`📦 Binary message received, ignoring`);
			}
		} catch (e) {
			console.log(`⚠️ Message is not JSON, ignoring`);
		}
		console.groupEnd();
	}

	async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
		console.group(`🔌 Durable Object WebSocket Closed`);
		console.log(`🕐 Closed at:`, new Date().toISOString());
		console.log(`🔢 Close code:`, code);
		console.log(`📝 Close reason:`, reason || 'No reason provided');
		console.log(`✅ Clean close:`, wasClean);
		console.log(`👥 Sessions before removal:`, this.sessions.size);
		console.groupEnd();
		
		this.sessions.delete(ws);
		console.log(`👥 Sessions after removal:`, this.sessions.size);
	}

	async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
		console.group(`❌ Durable Object WebSocket Error`);
		console.log(`🕐 Error at:`, new Date().toISOString());
		console.log(`🔗 WebSocket state:`, ws.readyState);
		console.error(`💥 Error:`, error);
		console.log(`👥 Sessions before removal:`, this.sessions.size);
		console.groupEnd();
		
		this.sessions.delete(ws);
		console.log(`👥 Sessions after removal:`, this.sessions.size);
	}

	private broadcast(message: string): void {
		const deadConnections: WebSocket[] = [];
		let successCount = 0;
		
		this.sessions.forEach((sessionInfo, ws) => {
			try {
				if (ws.readyState === WebSocket.OPEN) {
					ws.send(message);
					successCount++;
				} else {
					// Connection is not open, mark for cleanup
					deadConnections.push(ws);
				}
			} catch (error) {
				console.error("Error broadcasting to WebSocket:", error);
				deadConnections.push(ws);
			}
		});
		
		// Clean up dead connections immediately
		deadConnections.forEach(ws => {
			this.sessions.delete(ws);
		});
		
		if (deadConnections.length > 0) {
			console.log(`🧹 Cleaned up ${deadConnections.length} dead connections during broadcast`);
		}
		
		console.log(`📡 Successfully broadcasted to ${successCount} clients`);
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

async function handleLegacyConversion(request: Request, env: Env): Promise<Response> {
	const corsHeaders = {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
	};

	try {
		const body = await request.text();
		let requestData: { hash: string };

		try {
			requestData = JSON.parse(body);
		} catch {
			return new Response(JSON.stringify({ error: "Invalid JSON" }), {
				status: 400,
				headers: { ...corsHeaders, "Content-Type": "application/json" }
			});
		}

		const { hash } = requestData;

		if (!hash || !isLegacyHash(hash)) {
			return new Response(JSON.stringify({ error: "Invalid or missing legacy hash" }), {
				status: 400,
				headers: { ...corsHeaders, "Content-Type": "application/json" }
			});
		}

		// Decompress the legacy state
		let decompressedState: any;
		try {
			decompressedState = decompressState(hash);
		} catch (error) {
			console.error("Failed to decompress legacy state:", error);
			return new Response(JSON.stringify({ error: "Failed to decompress legacy state" }), {
				status: 400,
				headers: { ...corsHeaders, "Content-Type": "application/json" }
			});
		}

		// Generate new IDs
		const id = generateBase58Id(17); // Shortened UUID length
		const editKey = generateBase58Id(6); // Shortened edit key length
		const now = new Date().toISOString();
		const version = 1;

		// Store the converted state in the database
		try {
			await env.DB.prepare(
				"INSERT INTO finance_worksheets (id, edit_key, worksheet_data, version, last_modified, created_at) VALUES (?, ?, ?, ?, ?, ?)"
			).bind(id, editKey, JSON.stringify(decompressedState), version, now, now).run();

			console.log(`✅ Successfully converted legacy hash to worksheet ${id}`);

			// Return the new IDs and data
			const responseData = {
				id,
				editKey,
				data: decompressedState,
				version,
				lastModified: now,
				converted: true
			};

			return new Response(JSON.stringify(responseData), {
				status: 200,
				headers: { ...corsHeaders, "Content-Type": "application/json" }
			});
		} catch (dbError) {
			console.error("Failed to store converted worksheet:", dbError);
			return new Response(JSON.stringify({ error: "Failed to store converted worksheet" }), {
				status: 500,
				headers: { ...corsHeaders, "Content-Type": "application/json" }
			});
		}
	} catch (error) {
		console.error("Error in legacy conversion handler:", error);
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
			const finalEditKey = editKey || urlEditKey || generateBase58Id(6);
			
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

// Input types for the calculate API
interface CalculateRequest {
	preMoneyValuation: number;
	targetOptionsPool: number;
	shareholders: Array<{ name: string; shares: number }>;
	unusedOptions?: number;
	safes?: Array<{
		name: string;
		investment: number;
		cap: number;
		discount: number;
		type: "pre" | "post";
	}>;
	seriesInvestment?: Array<{ name: string; investment: number }>;
}

type CalculateResult =
	| { success: true; result: { pricePerShare: number; totalShares: number; postMoneyValuation: number; capTable: Array<{ name: string; type: string; shares: number; ownershipPercent: number; investment?: number; pps?: number }>; summary: { totalInvestment: number; founderDilution: number; optionsPoolPercent: number } } }
	| { success: false; error: string };

function runCapTableCalculation(requestData: CalculateRequest): CalculateResult {
	if (typeof requestData?.preMoneyValuation !== 'number' || requestData.preMoneyValuation <= 0) {
		return { success: false, error: "preMoneyValuation must be a positive number" };
	}
	if (!Array.isArray(requestData.shareholders) || requestData.shareholders.length === 0) {
		return { success: false, error: "shareholders must be a non-empty array" };
	}

	try {
		const targetOptionsPct = (requestData.targetOptionsPool || 0) / 100;
		const unusedOptions = requestData.unusedOptions || 0;
		const stakeHolders: StakeHolder[] = [];

		let totalCommonShares = 0;
		for (const shareholder of requestData.shareholders) {
			stakeHolders.push({
				name: shareholder.name,
				shares: shareholder.shares,
				type: CapTableRowType.Common,
				commonType: CommonRowType.Shareholder,
			} as CommonStockholder);
			totalCommonShares += shareholder.shares;
		}

		if (unusedOptions > 0) {
			stakeHolders.push({
				name: "Unused Options",
				shares: unusedOptions,
				type: CapTableRowType.Common,
				commonType: CommonRowType.UnusedOptions,
			} as CommonStockholder);
		}

		const safes: SAFENote[] = (requestData.safes || []).map((safe) => ({
			name: safe.name,
			investment: safe.investment,
			cap: safe.cap,
			discount: (safe.discount || 0) / 100,
			type: CapTableRowType.Safe,
			conversionType: safe.type === "pre" ? "pre" : "post",
		} as SAFENote));

		const processedSafes = populateSafeCaps(safes);
		for (const safe of processedSafes) {
			stakeHolders.push(safe);
		}

		const seriesInvestments: number[] = [];
		for (const investor of requestData.seriesInvestment || []) {
			stakeHolders.push({
				name: investor.name,
				investment: investor.investment,
				type: CapTableRowType.Series,
				round: 1,
			} as SeriesInvestor);
			seriesInvestments.push(investor.investment);
		}

		const conversion = fitConversion(
			requestData.preMoneyValuation,
			totalCommonShares,
			processedSafes,
			unusedOptions,
			targetOptionsPct,
			seriesInvestments
		);

		const capTable = buildPricedRoundCapTable(conversion, stakeHolders);

		const totalSeriesInvestment = seriesInvestments.reduce((a, b) => a + b, 0);
		const totalSafeInvestment = processedSafes.reduce((a, s) => a + s.investment, 0);
		const founderDilution = (1 - (totalCommonShares / conversion.totalShares)) * 100;

		return {
			success: true,
			result: {
				pricePerShare: conversion.pps,
				totalShares: conversion.totalShares,
				postMoneyValuation: requestData.preMoneyValuation + totalSeriesInvestment,
				capTable: [
					...capTable.common.map(row => ({
						name: row.name || '',
						type: "common",
						shares: row.shares,
						ownershipPercent: (row.ownershipPct || 0) * 100,
					})),
					...capTable.safes.map(row => ({
						name: row.name || '',
						type: "safe",
						shares: row.shares || 0,
						ownershipPercent: (row.ownershipPct || 0) * 100,
						investment: row.investment,
						pps: row.pps,
					})),
					...capTable.series.map(row => ({
						name: row.name || '',
						type: "series",
						shares: row.shares,
						ownershipPercent: row.ownershipPct * 100,
						investment: row.investment,
						pps: row.pps,
					})),
					{
						name: capTable.refreshedOptionsPool.name || '',
						type: "options",
						shares: capTable.refreshedOptionsPool.shares || 0,
						ownershipPercent: capTable.refreshedOptionsPool.ownershipPct * 100,
					},
				],
				summary: {
					totalInvestment: totalSeriesInvestment + totalSafeInvestment,
					founderDilution: Math.round(founderDilution * 100) / 100,
					optionsPoolPercent: (conversion.totalOptions / conversion.totalShares) * 100,
				},
			},
		};
	} catch (error) {
		return { success: false, error: error instanceof Error ? error.message : "Calculation failed" };
	}
}

async function handleCalculate(request: Request): Promise<Response> {
	const corsHeaders = {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
	};

	try {
		let requestData: CalculateRequest;
		try {
			requestData = JSON.parse(await request.text());
		} catch {
			return new Response(JSON.stringify({ success: false, error: "Invalid JSON in request body" }), {
				status: 400,
				headers: { ...corsHeaders, "Content-Type": "application/json" }
			});
		}

		const result = runCapTableCalculation(requestData);
		return new Response(JSON.stringify(result, null, 2), {
			status: result.success ? 200 : 400,
			headers: { ...corsHeaders, "Content-Type": "application/json" }
		});
	} catch (error) {
		console.error("Error in calculate handler:", error);
		return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Internal server error" }), {
			status: 500,
			headers: { ...corsHeaders, "Content-Type": "application/json" }
		});
	}
}

// MCP Streamable HTTP transport (2025-03-26 spec)
interface JsonRpcRequest {
	jsonrpc: "2.0";
	id?: string | number;
	method: string;
	params?: unknown;
}

interface JsonRpcResponse {
	jsonrpc: "2.0";
	id: string | number | null;
	result?: unknown;
	error?: { code: number; message: string };
}

function mcpOk(id: string | number | null, result: unknown): string {
	return JSON.stringify({ jsonrpc: "2.0", id, result } satisfies JsonRpcResponse);
}

function mcpErr(id: string | number | null, code: number, message: string): string {
	return JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } } satisfies JsonRpcResponse);
}

const MCP_TOOL = {
	name: "calculate_cap_table",
	description: "Calculate a startup cap table for a funding round. Returns share counts, ownership percentages, price per share, and summary metrics for all stakeholders — common shareholders, SAFE holders, series investors, and the options pool.",
	inputSchema: {
		type: "object",
		properties: {
			preMoneyValuation: { type: "number", description: "Pre-money valuation in dollars" },
			targetOptionsPool: { type: "number", description: "Target options pool as a percentage of post-money shares (e.g. 10 for 10%)" },
			shareholders: {
				type: "array",
				description: "Existing common stockholders",
				items: {
					type: "object",
					properties: {
						name: { type: "string" },
						shares: { type: "number" },
					},
					required: ["name", "shares"],
				},
			},
			unusedOptions: { type: "number", description: "Existing unused options in the pool (default: 0)" },
			safes: {
				type: "array",
				description: "SAFE notes to convert in this round (default: [])",
				items: {
					type: "object",
					properties: {
						name: { type: "string" },
						investment: { type: "number", description: "Investment amount in dollars" },
						cap: { type: "number", description: "Valuation cap in dollars (0 for uncapped)" },
						discount: { type: "number", description: "Discount rate as a percentage (e.g. 20 for 20%, 0 for none)" },
						type: { type: "string", enum: ["pre", "post"], description: "Pre-money or post-money SAFE" },
					},
					required: ["name", "investment", "cap", "discount", "type"],
				},
			},
			seriesInvestment: {
				type: "array",
				description: "New series investors in this priced round (default: [])",
				items: {
					type: "object",
					properties: {
						name: { type: "string" },
						investment: { type: "number", description: "Investment amount in dollars" },
					},
					required: ["name", "investment"],
				},
			},
		},
		required: ["preMoneyValuation", "targetOptionsPool", "shareholders"],
	},
};

async function handleMcp(request: Request): Promise<Response> {
	const corsHeaders = {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
	};

	let rpc: JsonRpcRequest;
	try {
		rpc = JSON.parse(await request.text());
	} catch {
		return new Response(mcpErr(null, -32700, "Parse error"), {
			status: 400,
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		});
	}

	const id = rpc.id ?? null;
	const isNotification = rpc.id === undefined;

	switch (rpc.method) {
		case "initialize":
			return new Response(mcpOk(id, {
				protocolVersion: "2025-03-26",
				capabilities: { tools: {} },
				serverInfo: { name: "startup-finance", version: "1.0.0" },
			}), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

		case "notifications/initialized":
			return new Response(null, { status: 202, headers: corsHeaders });

		case "tools/list":
			return new Response(mcpOk(id, { tools: [MCP_TOOL] }), {
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});

		case "tools/call": {
			const params = rpc.params as { name?: string; arguments?: unknown };
			if (params?.name !== "calculate_cap_table") {
				return new Response(mcpOk(id, {
					content: [{ type: "text", text: `Unknown tool: ${params?.name}` }],
					isError: true,
				}), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
			}
			const calcResult = runCapTableCalculation(params.arguments as CalculateRequest);
			return new Response(mcpOk(id, {
				content: [{ type: "text", text: JSON.stringify(calcResult, null, 2) }],
			}), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
		}

		default:
			if (isNotification) {
				return new Response(null, { status: 202, headers: corsHeaders });
			}
			return new Response(mcpErr(id, -32601, "Method not found"), {
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});
	}
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const corsHeaders = {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, X-Edit-Key, X-Object-Id",
		};

		if (request.method === "OPTIONS") {
			return new Response(null, { headers: corsHeaders });
		}

		// Handle legacy conversion endpoint
		if (url.pathname === "/api/legacy/convert" && request.method === "POST") {
			return handleLegacyConversion(request, env);
		}

		// Handle MCP endpoint (Streamable HTTP, 2025-03-26)
		if (url.pathname === "/mcp" && request.method === "POST") {
			return handleMcp(request);
		}

		// Handle calculate endpoint
		if (url.pathname === "/api/calculate" && request.method === "POST") {
			return handleCalculate(request);
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
