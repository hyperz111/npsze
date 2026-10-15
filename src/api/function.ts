import { handle } from "hono/netlify";
import { type Config } from "@netlify/functions";
import app from "./index.js";

export default handle(app);

export const config: Config = {
	path: "/api/*",
	rateLimit: {
		windowLimit: 10,
		windowSize: 60,
		aggregateBy: ["ip", "domain"],
	},
};
