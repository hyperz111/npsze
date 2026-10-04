import { defineConfig } from "rolldown/config";

export default defineConfig({
	input: "src/api/index.ts",
	output: {
		dir: "dist/api",
		format: "esm",
	},
	platform: "node",
	resolve: {
		conditionNames: ["production"],
	},
});
