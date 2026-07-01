---
paths:
  - "packages/frontend/**/*.tsx"
  - "packages/frontend/**/*.ts"
  - "packages/admin/**/*.tsx"
  - "packages/admin/**/*.ts"
  - "**/*.html"
---

# Frontend Security

For the apps served to the browser (`frontend`, `admin`). Response headers and
CSP are set at the edge, in infra config.

## XSS prevention

Never inject unsanitized HTML. Avoid `innerHTML` and `dangerouslySetInnerHTML`;
when user-generated HTML is required, sanitize it with a vetted local sanitizer
first.

## Third-party scripts

Load asynchronously. Use SRI when serving from a CDN. Prefer self-hosting
critical dependencies.

## Forms

Validate client-side for UX only; the API revalidates everything. Send the
API-issued CSRF token on all state-changing requests.
