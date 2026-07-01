---
paths:
  - "docker-compose*.yml"
  - "**/Dockerfile"
  - "**/*.conf"
---

# Infra Security

Response headers applied at the edge (reverse proxy / CDN / static host) that
serves the apps. They are set across all responses, not per route, so they live
in infra config, not in app code.

## Service exposure

Expose only user-facing services (`frontend`, `admin`, `api`) to the public
network. Keep internal services (database, caches, queues) on a private network,
reachable only by the services that need them. Never publish their ports.

## Required HTTP headers

Every production response serving an app must include:

    Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
    X-Content-Type-Options: nosniff
    X-Frame-Options: DENY
    Referrer-Policy: strict-origin-when-cross-origin
    Permissions-Policy: camera=(), microphone=(), geolocation=()

## Content Security Policy

Configure a production CSP with a per-request nonce for scripts instead of
`unsafe-inline`. Adjust origins to the actual project; do not copy this verbatim.

    Content-Security-Policy:
      default-src 'self';
      script-src 'self' 'nonce-{RANDOM}';
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https:;
      connect-src 'self';
      frame-src 'none';
      object-src 'none';
      base-uri 'self';
