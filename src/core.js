import semverMaxSatisfying from "semver/ranges/max-satisfying.js";

/** @type {Map<string, any>} */
const cache = new Map();

/**
 * @param {string} name
 * @param {string} version
 * @return {Promise<any>}
 */
const fetchPackage = async (name, version) => {
	try {
		/** @type {any} */
		let response;

		if (cache.has(name)) {
			response = cache.get(name);
		} else {
			response = await fetch(`https://registry.npmjs.org/${name}`, {
				headers: {
					Accept: "application/vnd.npm.install-v1+json",
				},
			}).then((res) => res.json());
		}

		const selectedVersion = semverMaxSatisfying(Object.keys(response.versions), response["dist-tags"]?.[version] ?? version);
		if (selectedVersion === null) {
			throw new RangeError(`Cannot find version "${version}" on "${name}"`);
		}

		return response.versions[selectedVersion];
	} catch (error) {
		throw error;
	}
};

/**
 * @param {string} name
 * @param {string} [version="latest"]
 * @returns {Promise<{ unpacked: number, install: number }>}
 */
export const getPackageSize = async (name, version = "latest") => {
	let install = 0;
	let unpacked = 0;
	/** @type {Set<string>} */
	const seen = new Set();

	const recursive = async (name, version, top) => {
		const data = await fetchPackage(name, version);
		const namespace = `${data.name}@${data.version}`;
		if (seen.has(namespace)) {
			return;
		}

		let size = data.dist.unpackedSize;

		if (size === undefined) {
			const tarball = await fetch(data.dist.tarball).then((res) => res.arrayBuffer());
			size = tarball.byteLength;
			data.dist.unpackedSize = size;
		}

		if (top) {
			unpacked += size;
		}

		install += size;

		seen.add(namespace);

		if ("dependencies" in data && Object.keys(data.dependencies).length > 0) {
			for (const dependency in data.dependencies) {
				await recursive(dependency, data.dependencies[dependency], false);
			}
		}
	};

	await recursive(name, version, true);

	return { unpacked, install };
};
