import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Receives store events from Storentia.
 *
 * A verified custom domain is subscribed to its own store's events
 * automatically, pointing here. Every delivery is signed with a secret that
 * only this store and the platform know, so this route can tell a real event
 * from anyone who found the URL.
 *
 * Set STORENTIA_EVENT_SECRET to the secret shown when the subscription was
 * created (dashboard → store → event subscriptions).
 */

// Deliveries older than this are refused, so a captured request cannot be
// replayed later. The timestamp is part of what was signed.
const MAX_SKEW_SECONDS = 300;

type StorentiaEvent = {
	id: string;
	type: string;
	source: string;
	store_id?: string;
	user_id?: string;
	occurred_at: string;
	data?: Record<string, unknown>;
};

function verify(secret: string, timestamp: string, body: string, signature: string): boolean {
	const expected = `sha256=${createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")}`;

	const received = Buffer.from(signature);
	const computed = Buffer.from(expected);
	// timingSafeEqual throws on a length mismatch, and comparing lengths first
	// is what leaks nothing here — an attacker learns only that it was wrong.
	if (received.length !== computed.length) return false;
	return timingSafeEqual(received, computed);
}

export async function POST(request: Request): Promise<Response> {
	const secret = process.env.STORENTIA_EVENT_SECRET;
	if (!secret) {
		// Without the secret nothing can be verified, so nothing is accepted.
		console.error("[storentia] STORENTIA_EVENT_SECRET is not set; refusing event");
		return new Response("not configured", { status: 503 });
	}

	const signature = request.headers.get("x-storentia-signature");
	const timestamp = request.headers.get("x-storentia-timestamp");
	if (!signature || !timestamp) {
		return new Response("missing signature", { status: 400 });
	}

	const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
	if (!Number.isFinite(age) || age > MAX_SKEW_SECONDS) {
		return new Response("stale delivery", { status: 400 });
	}

	// The raw body is what was signed — parse only after it verifies.
	const body = await request.text();
	if (!verify(secret, timestamp, body, signature)) {
		return new Response("bad signature", { status: 401 });
	}

	let event: StorentiaEvent;
	try {
		event = JSON.parse(body) as StorentiaEvent;
	} catch {
		return new Response("malformed payload", { status: 400 });
	}

	await handleEvent(event);

	// Anything other than 2xx is retried and eventually dead-lettered, so
	// acknowledge as soon as the event is safely handled.
	return Response.json({ received: true });
}

/**
 * Do something with the event.
 *
 * Deliveries are at-least-once: the same event id can arrive twice if a
 * previous acknowledgement was lost. Anything with a side effect should key
 * off `event.id` to stay idempotent.
 */
async function handleEvent(event: StorentiaEvent): Promise<void> {
	switch (event.type) {
		case "order.confirmed":
			console.log("[storentia] order paid", event.data?.order_id);
			break;
		case "order.payment_failed":
			console.log("[storentia] payment failed", event.data?.order_id, event.data?.reason);
			break;
		case "order.cancelled":
			console.log("[storentia] order cancelled", event.data?.order_id);
			break;
		default:
			console.log("[storentia] event", event.type, event.id);
	}
}
