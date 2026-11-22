// DEV-only source draft for TubeMind AI 0.3.0. Not wired into production.
// Reconstructed from the owner's Vercel auth-src.js, 2026-11-17.
import { createInternalNeonAuth } from "@neondatabase/neon-js/auth";

const AUTH = "https://ep-red-boat-b2at0ihs.neonauth.c-6.eu-central-1.aws.neon.tech/neondb/auth";
// Keep the OAuth return on this isolated DEV origin, never on the production site.
const CALLBACK = new URL(location.pathname, location.origin).toString();
const DEV_EXTENSION_ID = "ijiihdnkpfngnnoodnnliokgklkondnj";
const DEV_EXTENSION_ID_CURRENT = "gddjodeedjcpllaphchfjmfleiegncdc";
const DEV_EXTENSION_ID_INSTALLED = "mcfehbdphboeinbgpgbpifhaophapaog";
const neonAuth = createInternalNeonAuth(AUTH, { fetchOptions: { credentials: "include" } });
const auth = neonAuth.adapter;
const status = document.getElementById("status");
const button = document.getElementById("google");
const params = new URLSearchParams(location.search);
const extensionCallback = params.get("extension_callback");
const linkMode = params.get("mode") === "link";
const CALLBACKS = new Set([
  `https://${DEV_EXTENSION_ID}.chromiumapp.org/tubemind-auth`,
  `https://${DEV_EXTENSION_ID_CURRENT}.chromiumapp.org/tubemind-auth`,
  `https://${DEV_EXTENSION_ID_INSTALLED}.chromiumapp.org/tubemind-auth`,
]);
const FLOW_KEY = "tubemind.extensionAuthFlow";
const FLOW_TTL_MS = 10 * 60 * 1000;

function validExtensionCallback(value) {
  return typeof value === "string" && CALLBACKS.has(value);
}
function setStatus(value) { if (status) status.textContent = value; }
function saveFlow(callback) {
  if (!validExtensionCallback(callback)) return false;
  const flow = JSON.stringify({ callback, mode: linkMode ? "link" : "signin", createdAt: Date.now() });
  sessionStorage.setItem(FLOW_KEY, flow);
  localStorage.setItem(FLOW_KEY, flow);
  return true;
}
function readFlow() {
  for (const storage of [sessionStorage, localStorage]) {
    try {
      const raw = storage.getItem(FLOW_KEY);
      if (!raw) continue;
      const flow = JSON.parse(raw);
      if (typeof flow.createdAt === "number" && Date.now() >= flow.createdAt &&
          Date.now() - flow.createdAt <= FLOW_TTL_MS && validExtensionCallback(flow.callback)) {
        return flow;
      }
      storage.removeItem(FLOW_KEY);
    } catch { storage.removeItem(FLOW_KEY); }
  }
  return null;
}
function errorText(error, fallback) {
  if (typeof error === "string") return error;
  if (error && typeof error.message === "string") return error.message;
  if (error && typeof error.error === "string") return error.error;
  return fallback;
}
async function completeExtensionSignIn() {
  let stage = "flow";
  try {
    // Never guess a callback when storage is lost after OAuth.
    const flow = readFlow();
    if (!flow) {
      setStatus("Sign-in context expired. Return to TubeMind AI and try again.");
      if (button) button.disabled = false;
      return false;
    }
    stage = "neon-session";
    setStatus("Completing secure sign-in...");
    const result = await auth.getSession();
    if (result?.error) throw new Error(errorText(result.error, "Neon session failed"));
    if (!result?.data?.session) throw new Error("Secure session was not established");
    stage = "jwt";
    const token = await neonAuth.getJWTToken();
    if (!token) throw new Error("Secure token was not issued");
    stage = "proxy-issue";
    const response = await fetch("/api/dev-auth-exchange?action=issue", {
      method: "POST",
      headers: { authorization: "Bearer " + token, "content-type": "application/json" },
      body: "{}",
    });
    const issued = await response.json().catch(() => ({}));
    if (!response.ok || !issued.code) {
      throw new Error(errorText(issued, `Exchange failed with HTTP ${response.status}`));
    }
    stage = "redirect";
    const redirect = new URL(flow.callback);
    redirect.searchParams.set("code", issued.code);
    // The code is single-use. Preserve the flow only for diagnostics if navigation fails.
    location.replace(redirect.toString());
    return true;
  } catch (error) {
    if (button) button.disabled = false;
    setStatus(`Sign-in failed at ${stage}: ${errorText(error, "unknown error")}`);
    return false;
  }
}
async function startGoogleSignIn() {
  if (button) button.disabled = true;
  setStatus("Opening Google...");
  try {
    const result = await auth.signIn.social({ provider: "google", callbackURL: CALLBACK });
    if (result?.error) throw new Error(errorText(result.error, "Google sign-in failed"));
  } catch (error) {
    if (button) button.disabled = false;
    setStatus(errorText(error, "Sign-in failed"));
  }
}
async function startVerifiedAccountLink() {
  // Explicit linking only: the user must sign in with existing credentials
  // on the trusted DEV auth origin before initiating Google OAuth.
  const email = document.getElementById("link-email")?.value?.trim();
  const password = document.getElementById("link-password")?.value;
  if (!email || !password) { setStatus("Enter your existing account email and password."); return; }
  if (button) button.disabled = true;
  setStatus("Verifying existing TubeMind account...");
  try {
    const signedIn = await auth.signIn.email({ email, password });
    if (signedIn?.error) throw new Error(errorText(signedIn.error, "Existing account verification failed"));
    const session = await auth.getSession();
    if (session?.error || !session?.data?.session ||
        session?.data?.user?.email?.toLowerCase() !== email.toLowerCase()) {
      throw new Error("Existing account session could not be verified");
    }
    if (session?.data?.user?.emailVerified !== true) {
      throw new Error("Verify the email address of your existing account before linking Google.");
    }
    setStatus("Connecting Google to your existing account...");
    const linked = await auth.linkSocial({ provider: "google", callbackURL: CALLBACK });
    if (linked?.error) throw new Error(errorText(linked.error, "Google account linking failed"));
  } catch (error) {
    if (button) button.disabled = false;
    setStatus(errorText(error, "Account linking failed"));
  }
}
function renderLinkForm() {
  const panel = document.querySelector(".panel");
  if (!panel || !button) return;
  const email = document.createElement("input");
  email.id = "link-email";
  email.type = "email";
  email.autocomplete = "username";
  email.placeholder = "Existing account email";
  email.required = true;
  const password = document.createElement("input");
  password.id = "link-password";
  password.type = "password";
  password.autocomplete = "current-password";
  password.placeholder = "Existing account password";
  password.required = true;
  panel.insertBefore(email, button);
  panel.insertBefore(password, button);
  button.textContent = "Verify account and connect Google";
  button.addEventListener("click", startVerifiedAccountLink);
}
if (linkMode) renderLinkForm();
else if (button) button.addEventListener("click", startGoogleSignIn);
const verifierReturn = params.has("neon_auth_session_verifier");
if (extensionCallback && !validExtensionCallback(extensionCallback)) {
  setStatus("Unrecognized extension callback. Sign-in was not started.");
} else if (verifierReturn) {
  if (button) button.disabled = true;
  void completeExtensionSignIn();
} else if (extensionCallback && saveFlow(extensionCallback)) {
  history.replaceState(null, "", location.pathname);
  if (!linkMode) void startGoogleSignIn();
  else setStatus("Sign in to your existing account to connect Google.");
}
