FROM node:24-alpine AS base

# Git hooks are irrelevant in the image, and .git isn't in the build context.
ENV HUSKY=0

# Patch base packages, then add curl for container healthchecks.
RUN apk upgrade --no-cache && apk add --no-cache curl

RUN npm install -g pnpm

RUN mkdir -p /app/packages

# Manifests first so the `pnpm install` layer caches across source edits.
ADD package.json pnpm-lock.yaml pnpm-workspace.yaml /app/
ADD packages/frontend/package.json /app/packages/frontend/
ADD packages/domain/package.json /app/packages/domain/
ADD packages/design-system/package.json /app/packages/design-system/

WORKDIR /app/packages/frontend

# `...` selects frontend AND its workspace deps (design-system, domain), so their
# node_modules get populated too — the design-system build needs its own react
# (react-compiler injects `import "react/compiler-runtime"` into its source).
RUN pnpm -F "@projet-igsn/frontend..." install --frozen-lockfile

# Then the source (busts only the layers below, not the install above).
ADD tsconfig.base.json /app/
ADD packages/frontend /app/packages/frontend
ADD packages/domain /app/packages/domain
ADD packages/design-system /app/packages/design-system

FROM base AS dev

CMD ["pnpm", "-F", "@projet-igsn/frontend", "dev"]

FROM base AS build

# Vite inlines VITE_* into the client bundle at build time, so the API URL must
# be a build arg for any browser-side code (the SSR server also reads it from
# the runtime env; this covers the client half).
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm -F @projet-igsn/frontend build

FROM node:24-alpine AS prod

RUN apk upgrade --no-cache && apk add --no-cache curl

WORKDIR /app

ENV PORT=8080

# Nitro output is self-contained (bundles its own deps); the api URL is read
# from the runtime env by the SSR server.
COPY --from=build /app/packages/frontend/.output /app/.output

# Drop root: the SSR server only reads its (root-owned, world-readable) output.
USER node

CMD ["node", ".output/server/index.mjs"]
