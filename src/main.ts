import "./style.css";
import { filesize } from "filesize";
import { type AnalyzeResult } from "./api/v0/types.ts";

const LABELS = {
	unpacked: "Unpacked size",
	install: "Install Size",
};

let currentResultElement: HTMLElement | null = null;

const main = document.querySelector<HTMLDivElement>("main")!;
const input = document.querySelector<HTMLInputElement>("input")!;
const button = document.querySelector<HTMLButtonElement>("button")!;

const getSize = (name: string): Promise<AnalyzeResult> =>
	fetch(`/api/v0/package/${name}`).then((response) => response.json());
const createResultElement = (result: AnalyzeResult): HTMLElement => {
	const root = document.createElement("div");
	root.id = "result";

	for (const key in LABELS) {
		const parent = document.createElement("div");

		const label = document.createElement("p");
		label.innerText = LABELS[key as keyof typeof LABELS];
		parent.appendChild(label);

		const value = document.createElement("p");
		value.innerText = filesize(result[key as keyof typeof LABELS]);
		parent.appendChild(value);

		root.appendChild(parent);
	}

	return root;
};
const update = async (packageName: string) => {
	try {
		const result = await getSize(packageName);
		const nameAndVersion = `${result.name}@${result.version}`;

		history.pushState(null, "", `/?package=${nameAndVersion}`);
		input.value = nameAndVersion;
		document.title = `${nameAndVersion} - npsze`;

		if (currentResultElement !== null) {
			main.removeChild(currentResultElement);
		}
		main.appendChild((currentResultElement = createResultElement(result)));
	} catch (error) {
		alert(error);
	}
};

button.addEventListener("click", () => {
	return update(input.value);
});

document.addEventListener("DOMContentLoaded", async () => {
	const url = new URL(window.location.href);
	const packageName = url.searchParams.get("package");
	if (packageName !== null) {
		await update(packageName);
	}
});
