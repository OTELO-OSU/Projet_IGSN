FROM node:24-alpine as base

# Git hooks are irrelevant in the image, and .git isn't in the build context.
ENV HUSKY=0

# Patch base packages, then add curl for container healthchecks.
RUN apk upgrade --no-cache && apk add --no-cache curl

RUN npm install -g pnpm

RUN mkdir -p /app/packages

ADD package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json /app/
ADD packages/api /app/packages/api
ADD packages/domain /app/packages/domain

WORKDIR /app/packages/api

FROM base as dev

RUN pnpm -F @projet-igsn/api install --frozen-lockfile

CMD ["pnpm", "-F", "@projet-igsn/api", "dev"]

FROM base as prod

ENV PORT=8080

# --ignore-scripts: skip the root `prepare` (husky), which isn't installed in
# --prod mode. The api has no dependencies with native build steps.
RUN pnpm -F @projet-igsn/api install --prod --frozen-lockfile --ignore-scripts

# Drop root: the app only reads its (root-owned, world-readable) files at runtime.
USER node

# main.ts is run directly; Node 24 strips TS types natively (no tsc needed).
CMD ["node", "src/main.ts"]
