import assert from "node:assert/strict";
import test from "node:test";
import { parsePageSection, parseSiteSetting } from "./schemas";

test("CMS rejects executable markup and unknown section types", () => {
  assert.throws(() => parsePageSection("home", "hero", { eyebrow: "x", title: "<script>alert(1)</script>", highlight: "x", description: "x", primaryLabel: "x", primaryHref: "/configure", secondaryLabel: "x", secondaryHref: "/screens" }));
  assert.throws(() => parsePageSection("home", "arbitrary", {}));
});

test("site settings allow only reviewed keys and safe URLs", () => {
  assert.equal(parseSiteSetting("business.timezone", "Asia/Qatar"), "Asia/Qatar");
  assert.throws(() => parseSiteSetting("social.instagram", "javascript:alert(1)"));
  assert.throws(() => parseSiteSetting("unknown.secret", "x"));
});
