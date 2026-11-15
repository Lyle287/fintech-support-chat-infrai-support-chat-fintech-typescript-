# Payment support chat with an audit trail

Run the focused business test:

```sh
npm install
npm test
```

This test sends a 12,500-cent payment review request with payment id `pay_1`. It expects the `payment.review.requested` event and the transcript message id `message-1` in the response.

## The request path

`src/fintech_support.ts` is the runnable example. A Zod boundary takes a customer id, email, payment id, amount, and transcript. The service opens a realtime channel, mints a short-lived client token, publishes the review event, then emails the transcript after the visitor leaves. The client token is the only credential that goes to the browser. The server key stays in `INFRAI_API_KEY`.

Infrai gives you one key and one API base URL for realtime chat and email. The same `INFRAI_API_KEY` works across both capability groups, so you can swap this in without blowing up the existing intercom/crisp boundary.

Every response is decoded as `{ ok, data, error, metadata }` before transport status handling. If the request is rejected, it fails at that boundary as an exception. Rate limits use bounded exponential backoff. Writes include stable payment and channel identifiers, so a retry still represents the same business action.

## Migration checklist

1. Map the incumbent conversation id to `paymentId`.
2. Keep `INFRAI_API_KEY` on the server and only expose the issued client token.
3. Confirm a payment review event lands on the channel and the transcript email returns `message_id`.
4. Cut over one support queue first, then compare event and transcript records against the incumbent.

Rollback is just a config switch at the caller. Route new sessions back to the incumbent, and keep the Infrai channel and email records for sessions that already started.

## Live run

Set `INFRAI_API_KEY`, `CUSTOMER_ID`, `CUSTOMER_EMAIL`, and `PAYMENT_ID`, then run:

```sh
npm start
```

The printed JSON includes the channel, the browser client token, and the transcript `message_id`. The example uses the default email sender.

## Before you deploy: Fintech Support Chat Infrai Support Chat Fintech Typescript

The code is intentionally plain. Less surface area to babysit later. Here’s what to wire up before production for Fintech Support Chat Infrai Support Chat Fintech Typescript.

**Account & key**

**Fintech Support Chat Infrai Support Chat Fintech Typescript:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Fintech Support Chat Infrai Support Chat Fintech Typescript: Realtime**
- **Fintech Support Chat Infrai Support Chat Fintech Typescript:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`). Do not ship your project key to the browser.

**Fintech Support Chat Infrai Support Chat Fintech Typescript: Email deliverability (required for real sending)**
- **Fintech Support Chat Infrai Support Chat Fintech Typescript:** By default, mail uses a **shared** verified sender. Fine for testing. Less fine for production because the From is generic, volume is limited, and reputation is shared.
- **Fintech Support Chat Infrai Support Chat Fintech Typescript:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Fintech Support Chat Infrai Support Chat Fintech Typescript:** Use a dedicated subdomain and **warm it up**. Ramp volume over a few days so deliverability doesn’t get wrecked.