# SPEC: US-B1 — Institutional SSO & session

## Intent
A campus user needs to sign in with their institutional Google account and receive a session, so every subsequent request can be authorized as a known, verified identity.

## Inputs / Outputs
Input: a Google OAuth callback (authorization code / ID token).
Output: a session (JWT access + refresh token pair) tied to a `users` row; `401` for any request without a valid session on a protected route.

## Rules
- The institutional-domain restriction is verified SERVER-SIDE from the verified ID token's own claims — never trusted from a client-side domain hint.
- On first successful sign-in for a new email, a `users` row is created with `role: BOOKER` (the creation rule itself belongs to US-B2 — this story only triggers it).
- Session = short-lived access token + refresh token; using the refresh token rotates it rather than silently extending the same token forever.
- Roles are read from the `users` row in the database on every request — never trusted from a claim inside the client-presented token without server-side re-verification.
- No OAuth client secret or token is ever committed — only `.env.example` placeholders.

## Edge cases that must be handled
- A non-institutional-domain Google account attempts sign-in → refused; no session issued, no `users` row created.
- A syntactically valid but tampered/forged JWT (e.g. an edited role claim) → signature verification fails, refused.
- A request with no `Authorization` header on a protected route → `401`, on every protected route, not just some.
- An access token that has simply expired (not tampered) → refused with a distinct signal from "invalid", so the client knows to use the refresh token rather than forcing re-authentication.

## Out of scope
What role a new user gets and how roles are elevated (US-B2). Client-side session storage/page implementation detail.

## Done when
`server/tests/auth-sso.test.js` passes — a valid institutional account signs in; a non-institutional account is refused; a tampered role claim is refused; a no-session request is refused on every protected route — plus the eval rubric for SSO & Session in the Verification & Review Playbook.

## Contract note
`shared/contracts.js` has no session/token response shape (what a successful sign-in actually returns to the client) — flagging for Architect review. `users` and `RoleElevationRequest` already cover the rest.
