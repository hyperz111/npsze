import "./style.css";
import { createResultElement, createSuggestionElement, createErrorElement } from "./elements.js";
import { edit } from "./html.js";
import { type AnalyzeResult } from "./api/v0/types.js";

let currentBottomElement: HTMLElement | undefined;
let currentErrorElement: HTMLElement | undefined;

const main = document.querySelector<HTMLDivElement>("main")!;
const input = document.querySelector<HTMLInputElement>("input")!;
const button = document.querySelector<HTMLButtonElement>("button")!;

const getSize = async (name: string): Promise<AnalyzeResult> => {
	const response = await fetch(`/api/v0/package/${name}`);
	if (!response.ok) {
		throw new Error(`${response.status} ${response.statusText}`);
	}
	return await response.json();
};

const updateByPackage = async (packageName: string) => {
	if (currentErrorElement) {
		currentErrorElement.remove();
		currentErrorElement = undefined;
	}

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
		main.prepend((currentErrorElement = createErrorElement(error as Error)));
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
		currentBottomElement.remove();
		currentBottomElement = undefined;
	}
	main.appendChild((currentBottomElement = createSuggestionElement()));

	document.title = "npsze";
	edit(input, { value: "" });

	const url = new URL(window.location.href);
	const packageName = url.searchParams.get("package");
	if (packageName !== null) {
		edit(input, { value: packageName });
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
