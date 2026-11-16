import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./auth-src.dev.js", import.meta.url), "utf8");
const beta = "https://ijiihdnkpfngnnoodnnliokgklkondnj.chromiumapp.org/tubemind-auth";
const stable = "https://bkmmiijignhokjblbjoafabollhgjdkk.chromiumapp.org/tubemind-auth";
assert.ok(source.includes("const DEV_EXTENSION_ID = \"ijiihdnkpfngnnoodnnliokgklkondnj\""), "DEV extension ID must be pinned");
assert.ok(source.includes("chromiumapp.org/tubemind-auth"), "Chrome identity callback must be present");
assert.ok(!source.includes(stable), "DEV bridge must never redirect codes to the stable extension");
assert.ok(!source.includes("https://jiihdnkpfngnnoodnnliokgklko.chromiumapp.org"), "broken callback must be removed");
assert.ok(!source.includes("fallbackFlow"), "unsafe verifier fallback must be removed");
assert.ok(source.includes("if (extensionCallback && !validExtensionCallback(extensionCallback))"), "unknown callbacks must be rejected");
assert.ok(source.includes("const CALLBACK = new URL(location.pathname, location.origin).toString()"), "OAuth must return to isolated DEV origin");
assert.ok(source.includes("void startGoogleSignIn()"), "extension flow must start automatically");
assert.ok(source.includes("params.has(\"neon_auth_session_verifier\")"), "OAuth verifier return must be handled");
assert.ok(source.includes("readFlow()"), "OAuth flow must be recovered from storage");
assert.ok(source.includes('fetch("/api/tubemind-auth-exchange"'), "code issue endpoint must remain intact");
console.log("DEV OAuth source invariants: PASS (static only; browser OAuth not tested)");
