type Child = string | HTMLElement;

export const tag = <T extends keyof HTMLElementTagNameMap>(
	name: T,
	attributes?: Record<string, unknown> | null,
	children?: Child | Array<Child>,
): HTMLElement => {
	const root = document.createElement(name);

	if (attributes) {
		for (const [key, value] of Object.entries(attributes)) {
			root.setAttribute(key, String(value));
		}
	}

	if (children) {
		const normalized = Array.isArray(children) ? children : [children];
		for (const child of normalized) {
			if (typeof child === "string") {
				root.appendChild(document.createTextNode(child));
			} else {
				root.appendChild(child);
			}
		}
	}

	return root;
};

export const edit = <T extends HTMLElement>(
	node: T,
	attributes?: Record<string, unknown> | null,
	children?: Child | Array<Child>,
): T => {
	if (attributes) {
		for (const [key, value] of Object.entries(attributes)) {
			if (value == null) {
				node.removeAttribute(key);
			} else {
				node.setAttribute(key, String(value));
			}
		}
	}

	if (children) {
		node.replaceChildren();

		const normalized = Array.isArray(children) ? children : [children];
		for (const child of normalized) {
			if (typeof child === "string") {
				node.appendChild(document.createTextNode(child));
			} else {
				node.appendChild(child);
			}
		}
	}

	return node;
};
