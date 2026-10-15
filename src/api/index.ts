import { Hono } from "hono";
import v0 from "./v0/index.js";

const app = new Hono();

app.use("*", async (c, next) => {
  console.log("Method:", c.req.method);
  console.log("Path:", c.req.path);
  console.log("URL:", c.req.url);

  await next();
});

app.route("/v0", v0);

export default app;
