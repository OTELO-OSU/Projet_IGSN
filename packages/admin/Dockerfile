FROM node:24-alpine AS base

ENV HUSKY=0

RUN apk upgrade --no-cache && apk add --no-cache curl

RUN npm install -g pnpm

RUN mkdir -p /app/packages && chown node:node /app /app/packages
USER node

ADD --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml /app/
ADD --chown=node:node packages/admin/package.json /app/packages/admin/
ADD --chown=node:node packages/domain/package.json /app/packages/domain/
ADD --chown=node:node packages/design-system/package.json /app/packages/design-system/

WORKDIR /app/packages/admin

RUN pnpm -F "@projet-igsn/admin..." install --frozen-lockfile

ADD --chown=node:node tsconfig.base.json /app/
ADD --chown=node:node packages/admin /app/packages/admin
ADD --chown=node:node packages/domain /app/packages/domain
ADD --chown=node:node packages/design-system /app/packages/design-system

FROM base AS dev

CMD ["pnpm", "-F", "@projet-igsn/admin", "dev"]

FROM base AS build

ARG VITE_API_URL=http://localhost:3000/api
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_OIDC_AUTHORITY=http://localhost:8080/realms/igsn
ENV VITE_OIDC_AUTHORITY=$VITE_OIDC_AUTHORITY
ARG VITE_OIDC_CLIENT_ID=igsn-admin
ENV VITE_OIDC_CLIENT_ID=$VITE_OIDC_CLIENT_ID
ARG VITE_FRONTEND_URL=http://localhost:3000
ENV VITE_FRONTEND_URL=$VITE_FRONTEND_URL
ARG VITE_UPLOAD_LIMIT=5
ENV VITE_UPLOAD_LIMIT=$VITE_UPLOAD_LIMIT
ARG VITE_SAMPLE_LOCK_POLL_SECONDS=30
ENV VITE_SAMPLE_LOCK_POLL_SECONDS=$VITE_SAMPLE_LOCK_POLL_SECONDS

RUN pnpm -F @projet-igsn/admin build

FROM caddy:alpine AS prod

RUN apk upgrade --no-cache && apk add --no-cache curl

ENV PORT=8080

COPY --from=build /app/packages/admin/dist /srv/admin
COPY packages/admin/Caddyfile /etc/caddy/Caddyfile
