default: help

E2E_COMPOSE = docker compose -p igsn-e2e -f docker-compose.e2e.yml
E2E_URL = ADMIN_URL=http://localhost:4001 FRONTEND_URL=http://localhost:4000
E2E_UP = trap '$(E2E_COMPOSE) down -v' EXIT; \
	$(E2E_COMPOSE) up -d --build --wait --wait-timeout 300

help:									## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(firstword $(MAKEFILE_LIST)) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

install:								## Install dependencies
	@pnpm install
	@pnpm exec playwright install

lint: generate
	@pnpm lint:apply
	@pnpm fmt:apply

STAGED = git --no-pager diff --cached --name-only --diff-filter=ACMR

lint-staged:
	@($(STAGED) | grep -E '\.(ts|tsx)$$' | xargs -r pnpm oxlint --fix)
	@($(STAGED) | grep -E '\.(js|json|ts|tsx|md)$$' | xargs -r pnpm oxfmt)

test:
	@pnpm test

test-domain:							## Run domain tests only
	@pnpm test --project @projet-igsn/domain

test-api:								## Run api tests only
	@pnpm test --project @projet-igsn/api

test-frontend:							## Run frontend tests only
	@pnpm test --project @projet-igsn/frontend

test-admin:								## Run admin tests only
	@pnpm test --project @projet-igsn/admin

test-browser:
	@pnpm test:browser

test-watch:
	@pnpm test:watch

test-e2e:								## Start a throwaway prod stack, run auth e2e tests, tear down
	@$(E2E_UP) && $(E2E_URL) pnpm test:e2e

test-e2e-ui:								## Same, but open Playwright UI mode (http://localhost:8090)
	@$(E2E_UP) && $(E2E_URL) pnpm test:e2e:ui

dev:
	docker compose \
		-f docker-compose.dev.yml \
		up  \
		--watch \
		--build \
		--attach admin --attach api --attach frontend

compose-down:
	docker compose -f docker-compose.dev.yml down -v

db-migrate:								## Run migrations on the local dev Postgres (dev stack must be up)
	@docker compose -f docker-compose.dev.yml run --rm api pnpm -F @projet-igsn/api migrate

db-seed:									## Seed the local dev Postgres with sample data (dev stack must be up, migrations applied)
	@docker compose -f docker-compose.dev.yml exec -T api pnpm -F @projet-igsn/api seed

db-seed-demo:								## Reset the dev Postgres to the 100-sample demo dataset (dev stack must be up, migrations applied)
	@docker compose -f docker-compose.dev.yml exec -T api pnpm -F @projet-igsn/api seed:demo

mail-digest:								## Mail the pending-accounts digest now instead of waiting for 7:00; read it on http://localhost:1080 (dev stack must be up)
	@docker compose -f docker-compose.dev.yml exec -T api pnpm -F @projet-igsn/api digest:send

db-psql:									## Open a psql shell on the local dev Postgres (dev stack must be up)
	@docker compose -f docker-compose.dev.yml exec postgres psql -U igsn -d igsn

db-reset:								## Fully reset the dev Postgres database, then re-run migrations (dev stack must be up)
	@docker compose -f docker-compose.dev.yml exec -T postgres \
		psql -U igsn -d igsn -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
	@docker compose -f docker-compose.dev.yml run --rm api pnpm -F @projet-igsn/api migrate

DUMP ?= bdd-igsn.sql
IMPORT_LOG ?= import-legacy.log
db-import-legacy:							## Import the legacy pg_dump ($(DUMP)) into the new schema; skips go to $(IMPORT_LOG)
	@docker compose -f docker-compose.dev.yml exec -T postgres \
		psql -U igsn -d igsn -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS legacy_import" -c "CREATE DATABASE legacy_import"
	@docker compose -f docker-compose.dev.yml exec -T postgres \
		psql -U igsn -d legacy_import -c "CREATE ROLE karim" -c "CREATE ROLE userdbigsn" || true
	@docker compose -f docker-compose.dev.yml exec -T postgres \
		psql -U igsn -d legacy_import -q < $(DUMP)
	@docker compose -f docker-compose.dev.yml exec -T -e LEGACY_DATABASE_NAME=legacy_import api \
		pnpm -F @projet-igsn/api import:legacy 2>&1 | tee $(IMPORT_LOG)
	@docker compose -f docker-compose.dev.yml exec -T postgres \
		psql -U igsn -d igsn -c "DROP DATABASE IF EXISTS legacy_import"

material-tree:							## Dump the full material tree, indented by depth
	@pnpm -F @projet-igsn/domain material-tree

material-tree-json:						## Dump the material vocabulary structure as JSON
	@pnpm -F @projet-igsn/domain material-tree:json

CATALOGS = packages/admin/src/paraglide/messages.js packages/frontend/src/paraglide/messages.js
ROUTE_TREES = packages/admin/src/routeTree.gen.ts packages/frontend/src/routeTree.gen.ts

generate: $(CATALOGS) $(ROUTE_TREES)	## Recompile the i18n catalogs and route trees, if their sources changed
	@:

$(CATALOGS) &: $(wildcard packages/*/messages/*.json packages/*/project.inlang/settings.json)
	@pnpm -r --parallel run compile-i18n

$(ROUTE_TREES) &: $(shell find packages/*/src/routes -type d)
	@pnpm -r --parallel run generate-routes
	@touch $(ROUTE_TREES)

preprod-deploy:							## Deploy to preprod over SSH (requires DOMAIN=...)
	@DOMAIN=$(DOMAIN) ./infra/preprod/scripts/deploy.sh

preprod-ssh:							## Open temporary SSH access to the preprod host and connect
	@./infra/preprod/scripts/ssh-access.sh connect

preprod-ssh-send-key:					## Install your SSH key on the preprod host (optional SSH_PUBLIC_KEY_PATH=...)
	@./infra/preprod/scripts/ssh-send-key.sh "$(SSH_PUBLIC_KEY_PATH)"

preprod-tofu-init:						## Init preprod tofu (S3 backend)
	@tofu -chdir=infra/preprod/tf init -backend-config=backend.hcl

preprod-tofu-plan:						## Plan preprod infra changes
	@tofu -chdir=infra/preprod/tf plan

preprod-tofu-apply:						## Apply preprod infra changes
	@tofu -chdir=infra/preprod/tf apply
