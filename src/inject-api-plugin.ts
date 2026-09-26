import { type Plugin, type ViteDevServer, type PreviewServer } from "vite";
import { Hono } from "hono";
import { getRequestListener } from "@hono/node-server";
import api from "./api/index.js";

const plugin = (): Plugin => {
	const app = new Hono();
	app.route("/api", api);

	const configure = (server: ViteDevServer | PreviewServer) => {
		server.middlewares.use(getRequestListener(app.fetch));
	};

	return {
		name: "inject-api",
		configureServer: configure,
		configurePreviewServer: configure,
	};
};

export default plugin;
