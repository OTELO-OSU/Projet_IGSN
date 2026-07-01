default: help

help:									## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(firstword $(MAKEFILE_LIST)) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

install:								## Install dependencies
	@pnpm install
	@pnpm exec playwright install

lint:
	@pnpm lint:apply
	@pnpm fmt:apply

test:
	@pnpm test

test-browser:
	@pnpm test:browser

test-watch:
	@pnpm test:watch

dev:
	docker compose \
		-f docker-compose.dev.yml \
		up  \
		--watch \
		--build

auth:									## Start only Keycloak + the dev SAML IdP (detached)
	docker compose -f docker-compose.dev.yml up -d keycloak saml-idp

generate-routes:
	@pnpm -F @projet-igsn/frontend generate-routes

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
