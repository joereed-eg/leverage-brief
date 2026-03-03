import CryptoJS from "crypto-js";

const SHARED_SECRET = process.env.NEXT_PUBLIC_WEBHOOK_SECRET || "fulcrum-dev-secret";

export interface SignedPayload {
  payload: string;
  timestamp: string;
  signature: string;
}

/**
 * Sign a payload with HMAC-SHA256 using timestamp + shared secret.
 * Prevents replay attacks by binding signature to timestamp.
 */
export function signPayload(data: Record<string, unknown>): SignedPayload {
  const timestamp = new Date().toISOString();
  const payload = JSON.stringify(data);
  const message = `${timestamp}.${payload}`;
  const signature = CryptoJS.HmacSHA256(message, SHARED_SECRET).toString(
    CryptoJS.enc.Hex
  );

  return { payload, timestamp, signature };
}

/**
 * POST a signed payload to a webhook endpoint.
 */
export async function postSigned(
  url: string,
  data: Record<string, unknown>
): Promise<Response> {
  const { payload, timestamp, signature } = signPayload(data);

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Fulcrum-Timestamp": timestamp,
      "X-Fulcrum-Signature": signature,
    },
    body: payload,
  });
}
