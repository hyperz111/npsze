import semverMaxSatisfying from "semver/ranges/max-satisfying.js";
import { gunzip } from "node:zlib";
import { promisify } from "node:util";

/**
 * @typedef {Object} FetchResult
 * @property {string} name
 * @property {string} version
 * @property {number} unpacked
 * @property {Record<string, string>} dependencies
 * @property {string} tarball
 */

/**
 * @typedef {Object} CacheValue
 * @property {Record<string, string>} tags
 * @property {Record<string, Omit<FetchResult, "name" | "version">>} versions
 */

/**
 * @param {string} packageName
 * @returns {{ name: string, version: string }}
 */
export const parsePackageName = (packageName) => {
	const atIndex = packageName.lastIndexOf("@");

	if (atIndex > 0) {
		const name = packageName.slice(0, atIndex);
		const version = packageName.slice(atIndex + 1) || "latest";

		return { name, version };
	}
	return { name: packageName, version: "latest" };
};

/** @type {Map<string, CacheValue>} */
export const cache = new Map();

/**
 * @param {string} name
 * @param {string} version
 * @return {Promise<FetchResult>}
 */
const fetchPackage = async (name, version) => {
	try {
		if (!cache.has(name)) {
			const response = await fetch(`https://registry.npmjs.org/${name}`, {
				headers: {
					Accept: "application/vnd.npm.install-v1+json",
				},
			}).then((res) => res.json());

			cache.set(name, {
				tags: response["dist-tags"],
				versions: Object.fromEntries(
					Object.entries(response.versions).map(([key, value]) => {
						const newValue = {
							unpacked: value.dist.unpackedSize,
							tarball: value.dist.tarball,
							dependencies: value.dependencies ?? {},
						};

						// Add peerDependencies to dependencies
						if (Object.keys(value.peerDependencies ?? {}).length > 0) {
							for (const dependency in value.peerDependencies) {
								if (value.peerDependenciesMeta?.[dependency].optional !== true) {
									newValue.dependencies[dependency] = value.peerDependencies[dependency];
								}
							}
						}

						return [key, newValue];
					}),
				),
			});
		}

		const data = cache.get(name);

		const selectedVersion = semverMaxSatisfying(Object.keys(data.versions), data.tags[version] ?? version);
		if (selectedVersion === null) {
			throw new RangeError(`Cannot find version "${version}" on "${name}"`);
		}

		return {
			name,
			version: selectedVersion,
			...data.versions[selectedVersion],
		};
	} catch (error) {
		throw error;
	}
};

const gunzipPromise = promisify(gunzip);

/**
 * @param {string} name
 * @param {string} version
 * @param {(message: string) => void} onFetch
 * @returns {Promise<Omit<FetchResult, "dependencies" | "tarball"> & { install: number }>}
 */
export const getPackageSize = async (name, version, onFetch) => {
	let install = 0;
	let unpacked = 0;
	/** @type {Set<string>} */
	const seen = new Set();

	const recursive = async (n, v, top) => {
		onFetch(`Fetching ${n}@${v}`);

		const data = await fetchPackage(n, v);
		const namespace = `${data.name}@${data.version}`;
		if (seen.has(namespace)) {
			return;
		}

		if (data.unpacked === undefined) {
			const tarball = await fetch(data.tarball)
				.then((res) => res.arrayBuffer())
				.then((buffer) => gunzipPromise(buffer));
			data.unpacked = tarball.byteLength;
		}

		const size = data.unpacked;

		if (top) {
			unpacked += size;
			version = data.version;
		}

		install += size;

		seen.add(namespace);

		for (const dependency in data.dependencies) {
			await recursive(dependency, data.dependencies[dependency], false);
		}
	};

	await recursive(name, version, true);

	return { name, version, unpacked, install };
};
