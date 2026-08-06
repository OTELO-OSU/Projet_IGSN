default: help

# The e2e stack: prod-built apps + auth stack on shifted ports (own compose
# project so it runs beside `make dev`).
E2E_COMPOSE = docker compose -p igsn-e2e -f docker-compose.e2e.yml
E2E_URL = ADMIN_URL=http://localhost:4001 FRONTEND_URL=http://localhost:4000
E2E_UP = trap '$(E2E_COMPOSE) down -v' EXIT; \
	$(E2E_COMPOSE) up -d --build && \
	echo "waiting for admin, frontend, keycloak and saml-idp..." && \
	timeout 300 sh -c 'until curl -sfo /dev/null http://localhost:4001 && curl -sfo /dev/null http://localhost:4000 && curl -sfo /dev/null http://localhost:18080/realms/igsn/.well-known/openid-configuration && curl -sfo /dev/null http://localhost:18081/simplesaml/saml2/idp/metadata.php; do sleep 2; done'

help:									## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(firstword $(MAKEFILE_LIST)) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

install:								## Install dependencies
	@pnpm install
	@pnpm exec playwright install

# Worktrees always land in worktrees/, because .devcontainer/worktree derives the
# repo root from that fixed depth (../..) to keep git working in the container.
WT = worktrees/$(subst /,-,$(BRANCH))
create-worktree:							## Create worktrees/<branch> for BRANCH=<name>, branching if it is new
	@test -n "$(BRANCH)" || { echo "usage: make create-worktree BRANCH=feat/my-thing"; exit 1; }
	@if git show-ref --verify --quiet refs/heads/$(BRANCH); then \
		git worktree add $(WT) $(BRANCH); \
	else \
		git worktree add $(WT) -b $(BRANCH); \
	fi
	@$(MAKE) -C $(WT) install
	@printf '\nnow run: code %s   (Reopen in Container, pick "Projet IGSN (worktree)")\n' $(WT)

lint: generate
	@pnpm lint:apply
	@pnpm fmt:apply

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

generate:								## Recompile the i18n catalogs and route trees, if their sources changed
	@./scripts/generate-if-stale.sh

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
