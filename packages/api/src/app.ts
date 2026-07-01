import { Hono } from "hono";

const app = new Hono()
  .get("/", (c) => c.json({ message: "Hello World" }))
  .get("/:name", (c) => {
    const { name } = c.req.param();
    return c.json({ message: `Hello ${name}` });
  });

export default app;
