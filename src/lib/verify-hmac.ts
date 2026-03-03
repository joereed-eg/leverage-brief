import crypto from "crypto";

const SHARED_SECRET = process.env.HMAC_SECRET || "fulcrum-dev-secret";

/**
 * Verify HMAC-SHA256 signature from incoming webhook request.
 * Rejects replays older than 5 minutes.
 */
export function verifyHmac(
  payload: string,
  timestamp: string,
  signature: string
): { valid: boolean; reason?: string } {
  // Replay protection: reject if older than 5 minutes
  const requestTime = new Date(timestamp).getTime();
  const now = Date.now();
  if (isNaN(requestTime) || Math.abs(now - requestTime) > 5 * 60 * 1000) {
    return { valid: false, reason: "Timestamp expired or invalid" };
  }

  const message = `${timestamp}.${payload}`;
  const expected = crypto
    .createHmac("sha256", SHARED_SECRET)
    .update(message)
    .digest("hex");

  const valid = crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expected, "hex")
  );

  return valid ? { valid: true } : { valid: false, reason: "Signature mismatch" };
}

/**
 * Extract and verify HMAC from a Next.js Request object.
 * Returns parsed body if valid, throws descriptive error if not.
 */
export async function verifyRequest(
  request: Request
): Promise<Record<string, unknown>> {
  const timestamp = request.headers.get("X-Fulcrum-Timestamp");
  const signature = request.headers.get("X-Fulcrum-Signature");

  if (!timestamp || !signature) {
    throw new Error("Missing HMAC headers");
  }

  const payload = await request.text();
  const result = verifyHmac(payload, timestamp, signature);

  if (!result.valid) {
    throw new Error(result.reason || "HMAC verification failed");
  }

  return JSON.parse(payload);
}
