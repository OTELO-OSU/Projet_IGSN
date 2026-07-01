default: help

help:									## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(firstword $(MAKEFILE_LIST)) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

install:								## Install dependencies
	@pnpm install
	
install-browsers: install				## Install playwright browsers
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
