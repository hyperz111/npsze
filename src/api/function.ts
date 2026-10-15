import { handle } from "hono/netlify";
import app from "./index.js";

export default handle(app);
