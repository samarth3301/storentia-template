import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const SECRET = "whsec_test";

function signedRequest(overrides: {
	secret?: string;
	timestamp?: string;
	body?: string;
	signature?: string;
} = {}) {
	const body = overrides.body ?? JSON.stringify({ id: "evt_1", type: "order.confirmed", data: {} });
	const timestamp = overrides.timestamp ?? String(Math.floor(Date.now() / 1000));
	const signature =
		overrides.signature ??
		`sha256=${createHmac("sha256", overrides.secret ?? SECRET).update(`${timestamp}.${body}`).digest("hex")}`;

	return new Request("https://store.example/api/storentia/events", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			"x-storentia-signature": signature,
			"x-storentia-timestamp": timestamp,
		},
		body,
	});
}

describe("storentia event receiver", () => {
	beforeEach(() => {
		process.env.STORENTIA_EVENT_SECRET = SECRET;
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		delete process.env.STORENTIA_EVENT_SECRET;
	});

	it("accepts a correctly signed delivery", async () => {
		const response = await POST(signedRequest());
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ received: true });
	});

	it("rejects a signature made with the wrong secret", async () => {
		const response = await POST(signedRequest({ secret: "whsec_guessed" }));
		expect(response.status).toBe(401);
	});

	it("rejects a body altered after signing", async () => {
		const timestamp = String(Math.floor(Date.now() / 1000));
		const signature = `sha256=${createHmac("sha256", SECRET).update(`${timestamp}.{"amount":1}`).digest("hex")}`;
		const response = await POST(
			signedRequest({ timestamp, signature, body: '{"amount":100000}' }),
		);
		expect(response.status).toBe(401);
	});

	it("rejects a replayed delivery", async () => {
		const old = String(Math.floor(Date.now() / 1000) - 3600);
		const response = await POST(signedRequest({ timestamp: old }));
		expect(response.status).toBe(400);
	});

	it("rejects a delivery with no signature", async () => {
		const response = await POST(
			new Request("https://store.example/api/storentia/events", {
				method: "POST",
				body: "{}",
			}),
		);
		expect(response.status).toBe(400);
	});

	it("refuses everything when no secret is configured", async () => {
		delete process.env.STORENTIA_EVENT_SECRET;
		const response = await POST(signedRequest());
		expect(response.status).toBe(503);
	});
});
