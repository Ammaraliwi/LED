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

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Storage is not configured. Missing ${name}.`);
  return value;
}

function validBucketName(value: string): boolean {
  return /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(value) && !value.includes("..") && !/^\d+\.\d+\.\d+\.\d+$/.test(value);
}

export function resolveStorageConfig(env: NodeJS.ProcessEnv = process.env): StorageConfig {
  const endpointUrl = new URL(required(env.AWS_ENDPOINT_URL, "AWS_ENDPOINT_URL"));
  const bucket = required(env.AWS_S3_BUCKET_NAME, "AWS_S3_BUCKET_NAME");
  if (endpointUrl.protocol !== "https:" && endpointUrl.hostname !== "localhost" && endpointUrl.hostname !== "127.0.0.1") {
    throw new Error("Object storage endpoint must use HTTPS.");
  }
  if (!validBucketName(bucket)) throw new Error("Object storage bucket name is invalid.");
  const urlStyle = env.AWS_S3_URL_STYLE?.toLowerCase();
  if (urlStyle && urlStyle !== "virtual" && urlStyle !== "path") throw new Error("AWS_S3_URL_STYLE must be virtual or path.");
  return {
    endpoint: endpointUrl,
    region: required(env.AWS_DEFAULT_REGION, "AWS_DEFAULT_REGION"),
    accessKeyId: required(env.AWS_ACCESS_KEY_ID, "AWS_ACCESS_KEY_ID"),
    secretAccessKey: required(env.AWS_SECRET_ACCESS_KEY, "AWS_SECRET_ACCESS_KEY"),
    sessionToken: env.AWS_SESSION_TOKEN,
    publicBucket: bucket,
    privateBucket: bucket,
    // Current Railway buckets are virtual-hosted by default. Older buckets can
    // explicitly opt into path style with AWS_S3_URL_STYLE=path.
    forcePathStyle: urlStyle === "path",
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

function assertSafeObjectKey(objectKey: string): void {
  if (
    objectKey.length < 1 ||
    objectKey.length > 1024 ||
    objectKey.startsWith("/") ||
    objectKey.includes("\\") ||
    objectKey.includes("..") ||
    objectKey.includes("//") ||
    !/^[A-Za-z0-9][A-Za-z0-9/_\-.]*$/.test(objectKey)
  ) throw new Error("Object key is invalid.");
}

export function bucketForVisibility(visibility: StorageVisibility, env: NodeJS.ProcessEnv = process.env): string {
  const cfg = resolveStorageConfig(env);
  return visibility === "public" ? cfg.publicBucket : cfg.privateBucket;
}

export function generateObjectKey(visibility: StorageVisibility, mimeType: string, id: string): string {
  const extensions: Readonly<Record<string, string>> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
  };
  const extension = extensions[mimeType];
  if (!extension || !/^[a-f0-9-]{16,64}$/i.test(id)) throw new Error("Cannot generate an object key for this file.");
  const prefix = visibility === "public" ? "public" : "private";
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "/");
  return `${prefix}/${date}/${id}.${extension}`;
}

export function presignObject(options: {
  bucket: string;
  objectKey: string;
  method: "GET" | "PUT" | "HEAD" | "DELETE";
  expiresSeconds?: number;
  responseContentDisposition?: string;
}, env: NodeJS.ProcessEnv = process.env): string {
  const cfg = resolveStorageConfig(env);
  assertSafeObjectKey(options.objectKey);
  if (!Number.isInteger(options.expiresSeconds ?? 300) || (options.expiresSeconds ?? 300) < 1) throw new Error("Signed URL expiry is invalid.");
  if (options.responseContentDisposition && (options.method !== "GET" || /[\r\n]/.test(options.responseContentDisposition) || options.responseContentDisposition.length > 512)) {
    throw new Error("Signed response disposition is invalid.");
  }
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
  if (options.responseContentDisposition) params.set("response-content-disposition", options.responseContentDisposition);

  const canonicalQuery = [...params]
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
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

export async function deleteObject(bucket: string, objectKey: string): Promise<void> {
  const response = await fetch(presignObject({ bucket, objectKey, method: "DELETE", expiresSeconds: 120 }), { method: "DELETE" });
  if (!response.ok) throw new Error(`Object storage deletion failed (${response.status})`);
}
