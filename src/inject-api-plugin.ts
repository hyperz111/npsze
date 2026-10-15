import { type Plugin, type ViteDevServer, type PreviewServer } from "vite";
import { Hono } from "hono";
import { getRequestListener } from "@hono/node-server";
import api from "./api/index.js";

const plugin = (): Plugin => {
	const middleware = getRequestListener(api.fetch);

	const configure = (server: ViteDevServer | PreviewServer) => {
		server.middlewares.use((request, response, next) => {
			if (request.url?.startsWith("/api")) {
				middleware(request, response);
			} else {
				next();
			}
		});
	};

	return {
		name: "inject-api",
		configureServer: configure,
		configurePreviewServer: configure,
	};
};

export default plugin;
