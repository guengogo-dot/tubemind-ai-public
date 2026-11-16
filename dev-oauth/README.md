# TubeMind AI 0.3.0 DEV OAuth bridge

Isolated source draft. **Not deployed and not connected to the extension.**

## Build
From `dev-oauth/`, run `npm install`, `npm run check`, and `npm run build`. Copy `index.html` and generated `auth.js` into a separate DEV-only deployment.

## Deployment constraints
- Do not deploy this directory to the production domain or merge it into `main`.
- OAuth callback currently points at `https://tubemindai.com/auth/`; this must be reconfigured and allowed by Neon Auth for an isolated preview origin before live testing.
- `/api/tubemind-auth-exchange` must be provided on the DEV origin or routed to a separately verified exchange endpoint. The original Vercel API source is not yet recovered.
- The bridge must verify that the current extension ID matches the installed DEV build. Chrome's unpacked extension ID may change without a pinned key.
- Automatic Google OAuth redirect might be blocked by popup or user-activation restrictions; verify in Chromium runtime.
- Do not remove stable extension callback without a migration plan; never redirect a DEV-issued code to the stable extension.
- Never log OAuth codes or JWTs.

This directory is intentionally **not** a working production login until all dependencies and redirects are verified.
