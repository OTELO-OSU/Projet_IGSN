import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono()
  .use(
    "*",
    cors({
      // Reflect the request origin only if it is in CORS_ORIGINS (comma-separated).
      // Empty/unset => deny all. No "*": forbidden together with credentials.
      origin: (origin) =>
        (process.env.CORS_ORIGINS ?? "")
          .split(",")
          .map((o) => o.trim())
          .filter(Boolean)
          .includes(origin)
          ? origin
          : null,
      credentials: true,
    }),
  )
  .get("/", (c) => c.json({ message: "Hello World" }))
  .get("/:name", (c) => {
    const { name } = c.req.param();
    return c.json({ message: `Hello ${name}` });
  });

export default app;
