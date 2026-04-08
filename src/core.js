import semverMaxSatisfying from "semver/ranges/max-satisfying.js";

/** @type {Map<string, any>} */
const cache = new Map();

/**
 * @param {string} name
 * @param {string} version
 * @return {any}
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
 * @returns {{ unpacked: number, install: number }}
 */
export const getPackageSize = async (name, version = "latest") => {
	let install = 0;
	let unpacked = 0;

	const recursive = async (name, version, top) => {
		const data = await fetchPackage(name, version);
		console.log(data);
		let size = data.dist.unpackedSize;

		if (size === undefined) {
			const tarball = await fetch(data.dist.tarball).then((res) => res.arrayBuffer());
			size = tarball.byteLength;
		}

		if (top) {
			unpacked += size;
		}

		install += size;

		if (Object.keys(data.dependencies ?? {}).length > 0) {
			for (const dependency in data.dependencies) {
				await recursive(dependency, data.dependencies[dependency], false);
			}
		}
	};

	await recursive(name, version, true);

	return { unpacked, install };
};
