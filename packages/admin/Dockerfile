FROM node:24-alpine AS base

# Git hooks are irrelevant in the image, and .git isn't in the build context.
ENV HUSKY=0

# Patch base packages, then add curl for container healthchecks.
RUN apk upgrade --no-cache && apk add --no-cache curl

RUN npm install -g pnpm

# Everything under /app runs as node (uid 1000 = the host dev user): dev
# bind-mounts src and the server generates files through the mount (paraglide,
# routeTree.gen.ts), which must not come back root-owned on the host.
RUN mkdir -p /app/packages && chown node:node /app /app/packages
USER node

# Manifests first so the `pnpm install` layer caches across source edits.
ADD --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml /app/
ADD --chown=node:node packages/admin/package.json /app/packages/admin/
ADD --chown=node:node packages/domain/package.json /app/packages/domain/
ADD --chown=node:node packages/design-system/package.json /app/packages/design-system/

WORKDIR /app/packages/admin

# `...` selects admin AND its workspace deps (design-system, domain), so their
# node_modules get populated too — the design-system build needs its own react
# (react-compiler injects `import "react/compiler-runtime"` into its source).
RUN pnpm -F "@projet-igsn/admin..." install --frozen-lockfile

# Then the source (busts only the layers below, not the install above).
ADD --chown=node:node tsconfig.base.json /app/
ADD --chown=node:node packages/admin /app/packages/admin
ADD --chown=node:node packages/domain /app/packages/domain
ADD --chown=node:node packages/design-system /app/packages/design-system

FROM base AS dev

CMD ["pnpm", "-F", "@projet-igsn/admin", "dev"]

FROM base AS build

# Vite bakes VITE_* at build time: the API URL, Keycloak authority, client id,
# and public frontend URL are fixed into the bundle here. Default to the dev
# stack; e2e overrides the authority (different port), prod overrides them for
# the real Keycloak (see docs/adr/0003-production-auth-keycloak.md).
ARG VITE_API_URL=http://localhost:3002
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_OIDC_AUTHORITY=http://localhost:8080/realms/igsn
ENV VITE_OIDC_AUTHORITY=$VITE_OIDC_AUTHORITY
ARG VITE_OIDC_CLIENT_ID=igsn-admin
ENV VITE_OIDC_CLIENT_ID=$VITE_OIDC_CLIENT_ID
ARG VITE_FRONTEND_URL=http://localhost:3000
ENV VITE_FRONTEND_URL=$VITE_FRONTEND_URL

RUN pnpm -F @projet-igsn/admin build

FROM caddy:alpine AS prod

RUN apk upgrade --no-cache && apk add --no-cache curl

ENV PORT=8080

COPY --from=build /app/packages/admin/dist /srv
COPY packages/admin/Caddyfile /etc/caddy/Caddyfile
