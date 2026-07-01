FROM node:24-alpine AS base

# Git hooks are irrelevant in the image, and .git isn't in the build context.
ENV HUSKY=0

# Patch base packages, then add curl for container healthchecks.
RUN apk upgrade --no-cache && apk add --no-cache curl

RUN npm install -g pnpm

RUN mkdir -p /app/packages

# Manifests first so the `pnpm install` layer caches across source edits. dev and
# prod install differently (prod is --prod), so the install stays per-stage.
ADD package.json pnpm-lock.yaml pnpm-workspace.yaml /app/
ADD packages/api/package.json /app/packages/api/
ADD packages/domain/package.json /app/packages/domain/

WORKDIR /app/packages/api

FROM base AS dev

# `...` selects api AND its workspace deps (domain), so domain's own node_modules
# get populated too.
RUN pnpm -F "@projet-igsn/api..." install --frozen-lockfile

ADD tsconfig.base.json /app/
ADD packages/api /app/packages/api
ADD packages/domain /app/packages/domain

CMD ["pnpm", "-F", "@projet-igsn/api", "dev"]

FROM base AS prod

ENV PORT=8080

# --ignore-scripts: skip the root `prepare` (husky), which isn't installed in
# --prod mode. The api has no dependencies with native build steps.
RUN pnpm -F "@projet-igsn/api..." install --prod --frozen-lockfile --ignore-scripts

ADD tsconfig.base.json /app/
ADD packages/api /app/packages/api
ADD packages/domain /app/packages/domain

# Drop root: the app only reads its (root-owned, world-readable) files at runtime.
USER node

# main.ts is run directly; Node 24 strips TS types natively (no tsc needed).
CMD ["node", "src/main.ts"]
