import "server-only";

import { createHash, createHmac } from "node:crypto";

export type StorageVisibility = "public" | "private";

interface StorageConfig {
  endpoint: URL;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  publicBucket: string;
  privateBucket: string;
  forcePathStyle: boolean;
}

function config(): StorageConfig {
  const endpoint = process.env.STORAGE_ENDPOINT;
  const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID;
  const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY;
  const publicBucket = process.env.STORAGE_PUBLIC_BUCKET;
  const privateBucket = process.env.STORAGE_PRIVATE_BUCKET;
  if (!endpoint || !accessKeyId || !secretAccessKey || !publicBucket || !privateBucket) {
    throw new Error("Storage is not configured. Set STORAGE_ENDPOINT, credentials, and both bucket names.");
  }
  return {
    endpoint: new URL(endpoint),
    region: process.env.STORAGE_REGION || "auto",
    accessKeyId,
    secretAccessKey,
    sessionToken: process.env.STORAGE_SESSION_TOKEN,
    publicBucket,
    privateBucket,
    forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE !== "false",
  };
}

function encode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac("sha256", key).update(value).digest();
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function amzDate(date: Date): { full: string; short: string } {
  const full = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { full, short: full.slice(0, 8) };
}

function objectUrl(bucket: string, objectKey: string, cfg: StorageConfig): URL {
  const url = new URL(cfg.endpoint);
  const keyPath = objectKey.split("/").map(encode).join("/");
  const basePath = url.pathname.replace(/\/$/, "");
  if (cfg.forcePathStyle) {
    url.pathname = `${basePath}/${encode(bucket)}/${keyPath}`;
  } else {
    url.hostname = `${bucket}.${url.hostname}`;
    url.pathname = `${basePath}/${keyPath}`;
  }
  return url;
}

export function bucketForVisibility(visibility: StorageVisibility): string {
  const cfg = config();
  return visibility === "public" ? cfg.publicBucket : cfg.privateBucket;
}

export function generateObjectKey(visibility: StorageVisibility, mimeType: string, id: string): string {
  const extension = mimeType === "image/jpeg" ? "jpg" : mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "pdf";
  const prefix = visibility === "public" ? "public" : "private";
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "/");
  return `${prefix}/${date}/${id}.${extension}`;
}

export function presignObject(options: {
  bucket: string;
  objectKey: string;
  method: "GET" | "PUT" | "HEAD" | "DELETE";
  expiresSeconds?: number;
}): string {
  const cfg = config();
  const now = new Date();
  const { full, short } = amzDate(now);
  const service = "s3";
  const scope = `${short}/${cfg.region}/${service}/aws4_request`;
  const url = objectUrl(options.bucket, options.objectKey, cfg);
  const params = new Map<string, string>([
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", `${cfg.accessKeyId}/${scope}`],
    ["X-Amz-Date", full],
    ["X-Amz-Expires", String(Math.min(options.expiresSeconds ?? 300, 900))],
    ["X-Amz-SignedHeaders", "host"],
  ]);
  if (cfg.sessionToken) params.set("X-Amz-Security-Token", cfg.sessionToken);

  const canonicalQuery = [...params]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${encode(key)}=${encode(value)}`)
    .join("&");
  const canonicalRequest = [
    options.method,
    url.pathname,
    canonicalQuery,
    `host:${url.host}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", full, scope, hash(canonicalRequest)].join("\n");
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${cfg.secretAccessKey}`, short), cfg.region), service), "aws4_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  url.search = `${canonicalQuery}&X-Amz-Signature=${signature}`;
  return url.toString();
}

export async function putObject(bucket: string, objectKey: string, body: Uint8Array, mimeType: string): Promise<void> {
  const payload = new Uint8Array(body.byteLength);
  payload.set(body);
  const response = await fetch(presignObject({ bucket, objectKey, method: "PUT", expiresSeconds: 180 }), {
    method: "PUT",
    headers: { "content-type": mimeType },
    body: payload.buffer,
  });
  if (!response.ok) throw new Error(`Object storage upload failed (${response.status})`);
}

export async function inspectObject(bucket: string, objectKey: string): Promise<{ size: number; contentType: string; bytes: Uint8Array }> {
  const head = await fetch(presignObject({ bucket, objectKey, method: "HEAD", expiresSeconds: 120 }), { method: "HEAD" });
  if (!head.ok) throw new Error(`Object storage verification failed (${head.status})`);
  const size = Number(head.headers.get("content-length") || 0);
  const contentType = (head.headers.get("content-type") || "application/octet-stream").split(";")[0].trim().toLowerCase();
  const object = await fetch(presignObject({ bucket, objectKey, method: "GET", expiresSeconds: 120 }));
  if (!object.ok) throw new Error(`Object storage signature check failed (${object.status})`);
  return { size, contentType, bytes: new Uint8Array(await object.arrayBuffer()) };
}
