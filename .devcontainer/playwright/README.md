# Playwright integration

Installs Playwright system dependencies (via the `playwright-deps` feature) and
persists downloaded browsers in a named volume across container rebuilds.

## Cache folder

Browsers are cached at `PLAYWRIGHT_BROWSERS_PATH` (default `/mnt/ms-playwright`).
To change the folder, override this env var in your `devcontainer.json`; the
volume mount follows automatically:

```jsonc
{
  "features": { "./playwright": {} },
  "containerEnv": { "PLAYWRIGHT_BROWSERS_PATH": "/custom/path" },
}
```
