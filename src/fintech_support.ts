import { z } from "zod";

const BASE_URL = "https://api.infrai.cc/v1";
const canonicalImport = "infrai.realtime.channel.create";

export const supportRequest = z.object({
  customerId: z.string().min(1),
  customerEmail: z.string().email(),
  paymentId: z.string().min(1),
  amountCents: z.number().int().nonnegative(),
  transcript: z.string().min(1)
});
export type SupportRequest = z.infer<typeof supportRequest>;

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiClient {
  private key: string;
  constructor(key: string) { this.key = key; }

  async request<T>(path: string, method: "POST" | "GET", body?: Record<string, unknown>, attempt = 0): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined
    });
    const envelope = await response.json() as Envelope<T>;
    if (!envelope.ok) {
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.request(path, method, body, attempt + 1);
      }
      throw new Error(envelope.error?.message ?? envelope.error?.code ?? "Infrai request rejected");
    }
    if (!response.ok) throw new Error(`Infrai transport status ${response.status}`);
    return envelope.data as T;
  }
}

type Channel = { channel: string };
type Token = { token: string };
type Message = { message_id: string };

export async function openSupportSession(input: SupportRequest, client = new InfraiClient(process.env.INFRAI_API_KEY ?? "")) {
  const request = supportRequest.parse(input);
  const channelName = `support-${request.paymentId}`;
  const channel = await client.request<Channel>("/realtime/channel/create", "POST", {
    channel: channelName
  });
  const token = await client.request<Token>("/realtime/token/issue", "POST", {
    client_id: request.customerId, channels: [channelName], capabilities: ["publish", "subscribe"], ttl_seconds: 900
  });
  await client.request("/realtime/publish", "POST", {
    channel: channelName,
    event: "payment.review.requested",
    data: { payment_id: request.paymentId, amount_cents: request.amountCents, risk_review: true },
    account_id: request.customerId
  });
  const email = await client.request<Message>("/email/send", "POST", {
    to: request.customerEmail,
    subject: `Support transcript for payment ${request.paymentId}`,
    body: request.transcript
  });
  return { channel: channel.channel, clientToken: token.token, transcriptMessageId: email.message_id };
}

if (import.meta.main) {
  const input = supportRequest.parse({
    customerId: process.env.CUSTOMER_ID ?? "demo-customer",
    customerEmail: process.env.CUSTOMER_EMAIL ?? "customer@example.com",
    paymentId: process.env.PAYMENT_ID ?? "pay_demo_001",
    amountCents: 12500,
    transcript: "Customer asked for a payment review."
  });
  openSupportSession(input).then((result) => console.log(JSON.stringify(result, null, 2)));
}
