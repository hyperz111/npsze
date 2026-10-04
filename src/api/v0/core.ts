import { gunzip } from "node:zlib";
import { promisify } from "node:util";
import { HTTPException } from "hono/http-exception";
import { unpackTar } from "modern-tar";
import { findMaxSatisfying } from "verkit";
import { shouldChange, getPackageData, setPackageData } from "#store-v0";
import { type AnalyzeResult } from "./types.ts";

export const parsePackageName = (packageName: string): { name: string; version: string } => {
	const atIndex = packageName.lastIndexOf("@");

	if (atIndex > 0) {
		const name = packageName.slice(0, atIndex);
		const version = packageName.slice(atIndex + 1) || "latest";

		return { name, version };
	}
	return { name: packageName, version: "latest" };
};

interface FetchResult {
	name: string;
	version: string;
	size: number;
	dependencies: Record<string, string>;
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

const fetchPackage = async (name: string, version: string): Promise<FetchResult> => {
	if (version.startsWith("npm:")) {
		({ name, version } = parsePackageName(version.slice(4)));
	}

	if (await shouldChange(name)) {
		const response = await fetch(`https://registry.npmjs.org/${name}`, {
			headers: {
				Accept: "application/vnd.npm.install-v1+json",
			},
		});

		if (!response.ok) {
			throw new HTTPException(response.status, { message: response.statusText });
		}

		const data = (await response.json()) as ResponseResult;

		await setPackageData(name, {
			t: data["dist-tags"],
			v: Object.fromEntries(
				Object.entries(data.versions).map(([key, value]) => [
					key,
					{
						p: value.dist.unpackedSize ?? value.dist.tarball,
						...(value.dependencies ? { d: value.dependencies } : {}),
					},
				]),
			),
		});
	}

	const data = (await getPackageData(name))!;

	const selectedVersion = findMaxSatisfying(Object.keys(data.v), data.t[version] ?? version);
	if (selectedVersion === null) {
		throw new RangeError(`Cannot find version "${version}" on "${name}"`);
	}

	const target = data.v[selectedVersion]!;
	if (typeof target.p === "string") {
		target.p = await fetch(target.p)
			.then((res) => res.arrayBuffer())
			.then((buffer) => gunzipPromise(buffer))
			.then((tar) => unpackTar(tar))
			.then((entries) => entries.reduce((before, current) => before + current.header.size, 0));
	}

	return {
		name,
		version: selectedVersion,
		size: target.p as number,
		dependencies: target.d ?? {},
	};
};

const gunzipPromise = promisify(gunzip);

export const getPackageSize = async (name: string, version: string): Promise<AnalyzeResult> => {
	let install = 0;
	let unpacked = 0;
	const seen = new Set<string>();

	const recursive = async (n: string, v: string, top: boolean) => {
		const data = await fetchPackage(n, v);
		const namespace = `${data.name}@${data.version}`;
		if (seen.has(namespace)) {
			return;
		}

		if (top) {
			unpacked += data.size;
			version = data.version;
		}
		install += data.size;

		seen.add(namespace);

		for (const [name, version] of Object.entries(data.dependencies)) {
			await recursive(name, version, false);
		}
	};

	await recursive(name, version, true);

	return { name, version, unpacked, install };
};
