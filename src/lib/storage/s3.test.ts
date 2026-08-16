import assert from "node:assert/strict";
import test from "node:test";
import { bucketForVisibility, generateObjectKey, presignObject, resolveStorageConfig } from "./s3";

const railwayEnvironment = {
  NODE_ENV: "test",
  AWS_ENDPOINT_URL: "https://storage.railway.app",
  AWS_S3_BUCKET_NAME: "ledwave-staging-a1b2c3",
  AWS_DEFAULT_REGION: "auto",
  AWS_ACCESS_KEY_ID: "test-access-key",
  AWS_SECRET_ACCESS_KEY: "test-secret-key",
} satisfies NodeJS.ProcessEnv;

test("Railway AWS variables configure one private bucket with virtual-host URLs", () => {
  const config = resolveStorageConfig(railwayEnvironment);
  assert.equal(config.endpoint.toString(), "https://storage.railway.app/");
  assert.equal(config.region, "auto");
  assert.equal(config.forcePathStyle, false);
  assert.equal(bucketForVisibility("public", railwayEnvironment), "ledwave-staging-a1b2c3");
  assert.equal(bucketForVisibility("private", railwayEnvironment), "ledwave-staging-a1b2c3");

  const url = new URL(presignObject({
    bucket: "ledwave-staging-a1b2c3",
    objectKey: "public/2026/08/16/01234567-89ab-cdef-0123-456789abcdef.png",
    method: "GET",
    expiresSeconds: 60,
    responseContentDisposition: "attachment; filename*=UTF-8''invoice.pdf",
  }, railwayEnvironment));
  assert.equal(url.hostname, "ledwave-staging-a1b2c3.storage.railway.app");
  assert.equal(url.pathname, "/public/2026/08/16/01234567-89ab-cdef-0123-456789abcdef.png");
  assert.equal(url.searchParams.get("X-Amz-Expires"), "60");
  assert.equal(url.searchParams.get("response-content-disposition"), "attachment; filename*=UTF-8''invoice.pdf");
  assert.equal(url.toString().includes("test-secret-key"), false);
});

test("storage rejects unsafe endpoints, object keys, and unsupported media", () => {
  assert.throws(() => resolveStorageConfig({ ...railwayEnvironment, AWS_ENDPOINT_URL: "http://storage.example.com" }));
  assert.throws(() => presignObject({ bucket: "ledwave-staging-a1b2c3", objectKey: "../secret", method: "GET" }, railwayEnvironment));
  assert.throws(() => generateObjectKey("public", "text/html", "01234567-89ab-cdef-0123-456789abcdef"));
});
