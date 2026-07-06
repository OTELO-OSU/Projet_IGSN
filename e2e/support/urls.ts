// Each app's own base URL. Page objects navigate to their app explicitly (not
// via a Playwright `baseURL`) so a single cross-app journey can drive both the
// admin and the frontend origin with one `page`.
export const adminUrl = process.env.ADMIN_URL ?? "http://localhost:3001";
export const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
