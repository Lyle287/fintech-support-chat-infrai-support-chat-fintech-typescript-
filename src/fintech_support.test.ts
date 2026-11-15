import test from "node:test";
import assert from "node:assert/strict";
import { openSupportSession, InfraiClient } from "./fintech_support.ts";

test("a payment review opens chat and archives the transcript", async () => {
  const calls: Array<{ path: string; body?: Record<string, unknown> }> = [];
  const client = new InfraiClient("test-key");
  client.request = async <T>(path, _method, body): Promise<T> => {
    calls.push({ path, body });
    if (path.includes("channel/create")) return { channel: "support-pay_1" } as T;
    if (path.includes("token/issue")) return { token: "client-token" } as T;
    return { message_id: "message-1" } as T;
  };
  const result = await openSupportSession({ customerId: "c_1", customerEmail: "care@example.com", paymentId: "pay_1", amountCents: 12500, transcript: "Please review." }, client);
  assert.equal(result.transcriptMessageId, "message-1");
  assert.equal(calls.find((call) => call.path.includes("publish"))?.body?.event, "payment.review.requested");
  assert.equal(calls.find((call) => call.path.includes("email/send"))?.body?.body, "Please review.");
});
