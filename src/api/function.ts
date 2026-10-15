import { Hono } from "hono";
import { handle } from "hono/netlify";
import base from "./index.js";

const app = new Hono();
app.use("*", async (c, next) => {
  console.log("Method:", c.req.method);
  console.log("Path:", c.req.path);
  console.log("URL:", c.req.url);

  await next();
});
app.route("/api", base);

export default handle(app);
