import { Hono } from "hono";
import v0 from "./v0/index.js";

const app = new Hono();

app.route("/v0", v0);

export default app;
