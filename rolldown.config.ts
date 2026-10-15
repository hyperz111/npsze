import { defineConfig } from "rolldown/config";
import pkg from "./package.json" with { type: "json" };

export default defineConfig({
	input: "src/api/function.ts",
	output: {
		file: "dist/functions/api.js",
		format: "esm",
	},
	platform: "node",
	resolve: {
		conditionNames: ["production"],
	},
	external: Object.keys(pkg.dependencies).map((name) => new RegExp(`${name}.*`)),
});
