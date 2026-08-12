---
paths:
  - "packages/frontend/**/*.tsx"
  - "packages/frontend/**/*.ts"
  - "packages/admin/**/*.tsx"
  - "packages/admin/**/*.ts"
  - "**/*.html"
---

# Frontend Security

For the apps served to the browser (`frontend`, `admin`); response headers and CSP live in infra config.

- Never inject unsanitized HTML, and avoid `innerHTML` and `dangerouslySetInnerHTML`.
- Sanitize user-generated HTML with a vetted local sanitizer when it is unavoidable.
- Load third-party scripts asynchronously, with SRI when served from a CDN, and prefer self-hosting critical dependencies.
- Validate forms client-side for UX only, since the API revalidates everything.
- Gate a super-admin page with `admin/src/auth/super-admin-only.tsx`, which renders nothing until `currentUser` answers and redirects home on failure, and never as the boundary: `requireSuperAdmin` on the api is.
- Send the API-issued CSRF token on all state-changing requests.
