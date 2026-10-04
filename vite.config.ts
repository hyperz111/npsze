import { defineConfig } from "vite";
import injectApi from "./src/inject-api-plugin.js";

export default defineConfig({
	plugins: [injectApi()],
	build: {
		outDir: "dist/publish",
	},
});
