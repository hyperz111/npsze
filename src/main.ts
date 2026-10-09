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

const updateByPackage = async (packageName: string, pushHistory: boolean) => {
	if (pushHistory) {
		console.log("pushState");
		history.pushState(null, "", `/?package=${packageName}`);
	}

	edit(input, { value: packageName });
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

		input.value = nameAndVersion;
		document.title = `${nameAndVersion} - npsze`;

		console.log("replaceState");
		history.replaceState(null, "", `/?package=${nameAndVersion}`);

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

const update = async (pushHistory: boolean) => {
	if (currentBottomElement) {
		main.removeChild(currentBottomElement);
	}
	main.appendChild((currentBottomElement = createSuggestionElement()));

	document.title = "npsze";
	edit(input, { value: "" });

	const url = new URL(window.location.href);
	const packageName = url.searchParams.get("package");
	if (packageName !== null) {
		await updateByPackage(packageName, pushHistory);
	}
};

button.addEventListener("click", async () => {
	await updateByPackage(input.value, true);
});

window.addEventListener("popstate", async () => {
	await update(false);
});

document.addEventListener("DOMContentLoaded", async () => {
	await update(false);
});
