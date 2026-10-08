import "./style.css";
import { filesize } from "filesize";
import { type AnalyzeResult } from "./api/v0/types.js";

const LABELS = {
	unpacked: "Unpacked Size",
	install: "Install Size",
};

let currentBottomElement: HTMLElement = (() => {
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

	const root = document.createElement("section");
	root.id = "suggestions";

	const message = document.createElement("b");
	message.innerText = "Try these:";
	root.appendChild(message);

	for (const suggestion of suggestions) {
		const link = document.createElement("a");
		link.href = `/?package=${suggestion}@latest`;
		link.innerText = suggestion;

		root.appendChild(link);
	}

	return root;
})();

const main = document.querySelector<HTMLDivElement>("main")!;
const input = document.querySelector<HTMLInputElement>("input")!;
const button = document.querySelector<HTMLButtonElement>("button")!;

const getSize = (name: string): Promise<AnalyzeResult> =>
	fetch(`/api/v0/package/${name}`).then((response) => response.json());

const createResultElement = (result: AnalyzeResult): HTMLElement => {
	const root = document.createElement("section");
	root.id = "result";
	root.className = "grid";

	for (const key in LABELS) {
		const parent = document.createElement("div");

		const label = document.createElement("span");
		label.innerText = LABELS[key as keyof typeof LABELS];
		parent.appendChild(label);

		parent.appendChild(document.createElement("br"));

		const value = document.createElement("b");
		value.innerText = filesize(result[key as keyof typeof LABELS]);
		parent.appendChild(value);

		root.appendChild(parent);
	}

	return root;
};

const update = async (packageName: string) => {
	input.value = packageName;

	button.disabled = true;
	button.setAttribute("aria-busy", "true");
	button.setAttribute("aria-label", "Fetching...");
	button.innerText = "Fetching...";

	try {
		const result = await getSize(packageName);
		const nameAndVersion = `${result.name}@${result.version}`;

		const url = `/?package=${nameAndVersion}`;
		history.pushState(null, "", url);

		input.value = nameAndVersion;
		document.title = `${nameAndVersion} - npsze`;

		main.removeChild(currentBottomElement);
		main.appendChild((currentBottomElement = createResultElement(result)));
	} catch (error) {
		alert(error);
	}

	button.disabled = false;
	button.removeAttribute("aria-busy");
	button.removeAttribute("aria-label");
	button.innerText = "Get";
};

button.addEventListener("click", async () => {
	await update(input.value);
});

window.addEventListener("popstate", () => {
	history.back();
});

document.addEventListener("DOMContentLoaded", async () => {
	main.appendChild(currentBottomElement);

	const url = new URL(window.location.href);
	const packageName = url.searchParams.get("package");
	if (packageName !== null) {
		await update(packageName);
	}
});
