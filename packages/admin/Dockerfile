FROM node:24-alpine as base

# Git hooks are irrelevant in the image, and .git isn't in the build context.
ENV HUSKY=0

# Patch base packages, then add curl for container healthchecks.
RUN apk upgrade --no-cache && apk add --no-cache curl

RUN npm install -g pnpm

RUN mkdir -p /app/packages

ADD package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json /app/
ADD packages/admin /app/packages/admin
ADD packages/domain /app/packages/domain
ADD packages/design-system /app/packages/design-system

WORKDIR /app/packages/admin

FROM base as dev

RUN pnpm -F @projet-igsn/admin install --frozen-lockfile

CMD ["pnpm", "-F", "@projet-igsn/admin", "dev"]

FROM base as build

# Vite bakes VITE_* at build time, so the API URL is a build arg for this SPA.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# "pkg..." installs admin AND its workspace deps' external deps (design-system),
# which a bare -F filter omits.
RUN pnpm -F "@projet-igsn/admin..." install --frozen-lockfile

RUN pnpm -F @projet-igsn/admin build

FROM caddy:alpine

RUN apk upgrade --no-cache && apk add --no-cache curl

ENV PORT=8080

COPY --from=build /app/packages/admin/dist /srv
COPY packages/admin/Caddyfile /etc/caddy/Caddyfile
