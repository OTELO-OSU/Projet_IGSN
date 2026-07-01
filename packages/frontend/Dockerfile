FROM node:24-alpine as base

# Git hooks are irrelevant in the image, and .git isn't in the build context.
ENV HUSKY=0

# Patch base packages, then add curl for container healthchecks.
RUN apk upgrade --no-cache && apk add --no-cache curl

RUN npm install -g pnpm

RUN mkdir -p /app/packages

ADD package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json /app/
ADD packages/frontend /app/packages/frontend
ADD packages/domain /app/packages/domain
ADD packages/design-system /app/packages/design-system

WORKDIR /app/packages/frontend

FROM base as dev

RUN pnpm -F @projet-igsn/frontend install --frozen-lockfile

CMD ["pnpm", "-F", "@projet-igsn/frontend", "dev"]

FROM base as build

# Vite inlines VITE_* into the client bundle at build time, so the API URL must
# be a build arg for any browser-side code (the SSR server also reads it from
# the runtime env; this covers the client half).
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# "pkg..." installs frontend AND its workspace deps' external deps (e.g.
# design-system's class-variance-authority), which a bare -F filter omits.
RUN pnpm -F "@projet-igsn/frontend..." install --frozen-lockfile

RUN pnpm -F @projet-igsn/frontend build

FROM node:24-alpine as prod

RUN apk upgrade --no-cache && apk add --no-cache curl

WORKDIR /app

ENV PORT=8080

# Nitro output is self-contained (bundles its own deps); the api URL is read
# from the runtime env by the SSR server.
COPY --from=build /app/packages/frontend/.output /app/.output

# Drop root: the SSR server only reads its (root-owned, world-readable) output.
USER node

CMD ["node", ".output/server/index.mjs"]
