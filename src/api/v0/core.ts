import { gunzip } from "node:zlib";
import { promisify } from "node:util";
import { HTTPException } from "hono/http-exception";
import { unpackTar } from "modern-tar";
import { findMaxSatisfying } from "verkit";
import { shouldChange, getPackageData, setPackageData } from "#store-v0";
import { type AnalyzeResult, type Schema } from "./types.js";

export const parsePackageName = (packageName: string): { name: string; version: string } => {
	const atIndex = packageName.lastIndexOf("@");

	if (atIndex > 0) {
		const name = packageName.slice(0, atIndex);
		const version = packageName.slice(atIndex + 1) || "latest";

		return { name, version };
	}
	return { name: packageName, version: "latest" };
};

interface ResolvedPackage {
	name: string;
	version: string;
	range: string;
	size: number | string;
	dependencies: Record<string, string>;
}

interface PackageNode extends ResolvedPackage {
	installName: string;
	parent: PackageNode | null;
	children: Map<string, PackageNode>;
	depth: number;
	location: string;
}

interface ResponseResult {
	"dist-tags": Record<string, string>;
	versions: Record<
		string,
		{
			dist: {
				unpackedSize?: number;
				tarball: string;
			};
			dependencies?: Record<string, string>;
		}
	>;
}

const fetchCache = new Map<string, Promise<Schema>>();
const sizeCache = new Map<string, Promise<number>>();
const gunzipPromise = promisify(gunzip);

const fetchRegistryPackage = async (name: string): Promise<Schema> => {
	const response = await fetch(`https://registry.npmjs.org/${name}`, {
		headers: {
			Accept: "application/vnd.npm.install-v1+json",
		},
	});

	if (!response.ok) {
		throw new HTTPException(response.status as any, { message: response.statusText });
	}

	const responseData = (await response.json()) as ResponseResult;
	const transformed: Schema = {
		t: responseData["dist-tags"],
		v: Object.fromEntries(
			Object.entries(responseData.versions).map(([key, value]) => [
				key,
				{
					p: value.dist.unpackedSize ?? value.dist.tarball,
					...(value.dependencies ? { d: value.dependencies } : {}),
				},
			]),
		),
	};

	await setPackageData(name, transformed);
	return transformed;
};

const getPackageSchema = (name: string): Promise<Schema> => {
	const cached = fetchCache.get(name);
	if (cached) return cached;

	const pending = (async () => {
		if (!(await shouldChange(name))) {
			const data = await getPackageData(name);
			if (data) {
				return data;
			}
		}

		return fetchRegistryPackage(name);
	})();

	fetchCache.set(name, pending);
	pending.catch(() => fetchCache.delete(name));
	return pending;
};

const resolvePackage = async (name: string, version: string): Promise<ResolvedPackage> => {
	if (version.startsWith("npm:")) {
		({ name, version } = parsePackageName(version.slice(4)));
	}

	const data = await getPackageSchema(name);
	const selectedVersion = findMaxSatisfying(Object.keys(data.v), data.t[version] ?? version);
	if (selectedVersion === null) {
		throw new RangeError(`Cannot find version "${version}" on "${name}"`);
	}

	const target = data.v[selectedVersion]!;
	return {
		name,
		version: selectedVersion,
		range: version,
		size: target.p,
		dependencies: target.d ?? {},
	};
};

const getPackageSize = async (name: string, version: string): Promise<number> => {
	const data = await resolvePackage(name, version);
	if (typeof data.size === "number") {
		return data.size;
	}

	const key = `${data.name}@${data.version}`;
	let pending = sizeCache.get(key);
	if (!pending) {
		pending = (async () => {
			const response = await fetch(data.size as string);
			if (!response.ok) {
				throw new HTTPException(response.status as any, { message: response.statusText });
			}

			const buffer = await response.arrayBuffer();
			const tar = await gunzipPromise(buffer);
			const entries = await unpackTar(tar);
			const size = entries.reduce((total, entry) => total + entry.header.size, 0);

			const schema = await getPackageSchema(data.name);
			const target = schema.v[data.version];
			if (target && typeof target.p === "string") {
				target.p = size;
				await setPackageData(data.name, schema);
			}

			return size;
		})();

		sizeCache.set(key, pending);
		pending.catch(() => sizeCache.delete(key));
	}

	return pending;
};

const satisfies = (current: PackageNode, requested: ResolvedPackage): boolean => {
	if (current.name !== requested.name) {
		return false;
	}

	return findMaxSatisfying([current.version], requested.range) !== null || current.version === requested.version;
};

const getLocation = (parent: PackageNode, name: string): string =>
	parent.location ? `${parent.location}/node_modules/${name}` : `node_modules/${name}`;

export const analyzePackage = async (name: string, version: string): Promise<AnalyzeResult> => {
	const rootPackage = await resolvePackage(name, version);
	const root: PackageNode = {
		...rootPackage,
		installName: rootPackage.name,
		parent: null,
		children: new Map(),
		depth: 0,
		location: "",
	};

	// Arborist processes shallower nodes first, then sorts by their physical path.
	const queue: PackageNode[] = [root];
	let queueSorted = true;
	while (queue.length) {
		if (!queueSorted) {
			queue.sort((a, b) => a.depth - b.depth || a.location.localeCompare(b.location, "en"));
			queueSorted = true;
		}

		const node = queue.shift()!;
		const dependencies = Object.entries(node.dependencies).sort(([a], [b]) => a.localeCompare(b, "en"));
		const resolved = await Promise.all(
			dependencies.map(([dependencyName, dependencyRange]) => resolvePackage(dependencyName, dependencyRange)),
		);

		for (let index = 0; index < dependencies.length; index++) {
			const [dependencyName] = dependencies[index]!;
			const dependency = resolved[index]!;

			// Walk from the requesting package towards the root. Reuse the nearest
			// valid package; otherwise place at the highest location before a conflict.
			let cursor: PackageNode | null = node;
			let placement = node;
			let existing: PackageNode | undefined;

			while (cursor) {
				const current = cursor.children.get(dependencyName);
				if (current) {
					if (satisfies(current, dependency)) {
						existing = current;
					}
					break;
				}

				placement = cursor;
				cursor = cursor.parent;
			}

			if (existing) {
				continue;
			}

			const child: PackageNode = {
				...dependency,
				installName: dependencyName,
				parent: placement,
				children: new Map(),
				depth: placement.depth + 1,
				location: getLocation(placement, dependencyName),
			};

			placement.children.set(dependencyName, child);
			queue.push(child);
			queueSorted = false;
		}
	}

	const unpacked = await getPackageSize(root.name, root.version);
	let install = unpacked;
	const nodes: PackageNode[] = [...root.children.values()];
	while (nodes.length) {
		const node = nodes.pop()!;
		install += await getPackageSize(node.name, node.version);
		nodes.push(...node.children.values());
	}

	return {
		name: root.name,
		version: root.version,
		unpacked,
		install,
	};
};
