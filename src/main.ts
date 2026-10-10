import "./style.css";
import { createResultElement, createSuggestionElement } from "./elements.js";
import { edit } from "./html.js";
import { type AnalyzeResult } from "./api/v0/types.js";

let currentBottomElement: HTMLElement;

const main = document.querySelector<HTMLDivElement>("main")!;
const input = document.querySelector<HTMLInputElement>("input")!;
const button = document.querySelector<HTMLButtonElement>("button")!;

const getSize = (name: string): Promise<AnalyzeResult> =>
	fetch(`/api/v0/package/${name}`).then((response) => response.json());

const updateByPackage = async (packageName: string) => {
	edit(
		button,
		{
			disabled: "true",
			"aria-busy": "true",
			"aria-label": "Fetching",
		},
		"Fetching...",
	);

	try {
		const result = await getSize(packageName);
		const nameAndVersion = `${result.name}@${result.version}`;

		document.title = `${nameAndVersion} - npsze`;

		main.removeChild(currentBottomElement);
		main.appendChild((currentBottomElement = createResultElement(result)));
	} catch (error) {
		alert(error);
	}

	edit(
		button,
		{
			disabled: null,
			"aria-busy": null,
			"aria-label": null,
		},
		"Get",
	);
};

const update = async () => {
	if (currentBottomElement) {
		main.removeChild(currentBottomElement);
	}
	main.appendChild((currentBottomElement = createSuggestionElement()));

	document.title = "npsze";
	edit(input, { value: "" });

	const url = new URL(window.location.href);
	const packageName = url.searchParams.get("package");
	if (packageName !== null) {
		await updateByPackage(packageName);
	}
};

button.addEventListener("click", async () => {
	history.pushState(null, "", `/?package=${input.value}`);
	await updateByPackage(input.value);
});

window.addEventListener("popstate", async () => {
	await update();
});

document.addEventListener("DOMContentLoaded", async () => {
	await update();
});
