import { filesize } from "filesize";
import { tag } from "./html.js";
import { type AnalyzeResult } from "./api/v0/types.js";

export const createResultElement = (result: AnalyzeResult): HTMLElement => {
	return tag("article", { id: "result" }, [
		tag("header", null, [tag("span", null, `${result.name}@${result.version}`)]),
		tag("section", { class: "grid" }, [
			tag("div", null, [tag("span", null, "Unpacked Size"), tag("br"), tag("strong", null, filesize(result.unpacked))]),
			tag("div", null, [tag("span", null, "Install Size"), tag("br"), tag("strong", null, filesize(result.install))]),
		]),
	]);
};

export const createSuggestionElement = () => {
	const suggestions = [
		"react",
		"svelte",
		"vue",
		"solid-js",
		"lit",
		"vite",
		"vitest",
		"mocha",
		"eslint",
		"esbuild",
		"rollup",
		"rolldown",
		"webpack",
		"prettier",
		"typescript",
	];

	return tag("section", { id: "suggestions" }, [
		tag("strong", null, "Try these:"),
		...suggestions.map((suggestion) => tag("a", { href: `/?package=${suggestion}@latest` }, suggestion)),
	]);
};

export const createErrorElement = (error: Error) => {
	return tag("article", { id: "error" }, [
		tag("strong", null, `${error.name}:`),
		` ${error.message}`
	]);
};
