import { findMaxSatisfying } from "verkit";
import { unpackTar } from "modern-tar";
import { gunzip } from "node:zlib";
import { promisify } from "node:util";

interface FetchResult {
	name: string;
	version: string;
	unpacked?: number;
	dependencies?: Record<string, string>;
	tarball: string;
}

interface CacheValue {
	tags: Record<string, string>;
	versions: Record<string, Omit<FetchResult, "name" | "version">>;
}

export const parsePackageName = (packageName: string): { name: string, version: string } => {
	const atIndex = packageName.lastIndexOf("@");

	if (atIndex > 0) {
		const name = packageName.slice(0, atIndex);
		const version = packageName.slice(atIndex + 1) || "latest";

		return { name, version };
	}
	return { name: packageName, version: "latest" };
};

const cache = new Map<string, CacheValue>();

interface ResponseResult {
	// If we got a http error
	error?: string;
	// needed result
	"dist-tags": Record<string, string>;
	versions: Record<string, {
		dist: {
			unpackedSize?: number;
			tarball: string;
		},
		dependencies?: Record<string, string>
	}>;
}

const fetchPackage = async (name: string, version: string): Promise<FetchResult> => {
	if (version.startsWith("npm:")) {
		({ name, version } = parsePackageName(version.slice(4)));
	}

	if (!cache.has(name)) {
		const response = (
			await fetch(`https://registry.npmjs.org/${name}`, {
				headers: {
					Accept: "application/vnd.npm.install-v1+json",
				},
			}).then((res) => res.json())
		) as ResponseResult;

		if ("error" in response) {
			throw new Error(response.error as string);
		}

		cache.set(name, {
			tags: response["dist-tags"] as Record<string, string>,
			versions: Object.fromEntries(
				Object.entries(response.versions).map(([key, value]) => [
					key,
					{
						unpacked: value.dist.unpackedSize,
						tarball: value.dist.tarball,
						dependencies: value.dependencies,
					},
				]),
			),
		});
	}

	const data = /** @type {CacheValue} */ (cache.get(name));

	const selectedVersion = findMaxSatisfying(Object.keys(data.versions), data.tags[version] ?? version);
	if (selectedVersion === null) {
		throw new RangeError(`Cannot find version "${version}" on "${name}"`);
	}

	return {
		name,
		version: selectedVersion,
		.../** @type {CacheValue["versions"][keyof CacheValue["versions"]]} */ (data.versions[selectedVersion]),
	};
};

const gunzipPromise = promisify(gunzip);

/**
 * @param {string} name
 * @param {string} version
 * @param {(name: string, version: string) => void} onFetch
 * @returns {Promise<{ name: string, version: string, unpacked: number, install: number }>}
 */
export const getPackageSize = async (name, version, onFetch) => {
	let install = 0;
	let unpacked = 0;
	const seen = new Set<string>();

	const recursive = async (n: string, v: string, top: boolean) => {
		onFetch(n, v);

		const data = await fetchPackage(n, v);
		const namespace = `${data.name}@${data.version}`;
		if (seen.has(namespace)) {
			return;
		}

		if (data.unpacked === undefined) {
			const tarball = await fetch(data.tarball)
				.then((res) => res.arrayBuffer())
				.then((buffer) => gunzipPromise(buffer))
				.then((tar) => unpackTar(tar))
				.then((entries) => entries.reduce((before, current) => before + current.header.size, 0));
			data.unpacked = tarball.byteLength;
		}

		const size = data.unpacked;

		if (top) {
			unpacked += size;
			version = data.version;
		}

		install += size;

		seen.add(namespace);

		if (data.dependencies) {
			for (const [name, version] of Object.entries(data.dependencies)) {
				await recursive(name, version, false);
			}
		}

	};

	await recursive(name, version, true);

	return { name, version, unpacked, install };
};
