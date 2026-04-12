import { getPackageSize, parsePackageName } from "./core.js";
import { parseArgs } from "node:util";
import pkg from "../package.json" with { type: "json" };

/**
 * @param {typeof process} p
 * @returns {Promise<number>}
 */
export const run = async (p) => {
	/** @type {string | undefined} */
	let packageName;

	try {
		const parsed = parseArgs({
			args: p.argv.slice(2),
			options: {
				help: { type: "boolean", short: "h" },
				version: { type: "boolean", short: "v" },
			},
			allowPositionals: true,
		});

		if (parsed.values.help) {
			p.stdout.write(
				[
					`Usage: ${pkg.name} <package> [..options]`,
					"",
					`${pkg.description}.`,
					"",
					"Options:",
					"  -h, --help       Show program help.",
					"  -v, --version    Show program version.",
					"",
				].join("\n"),
			);
			return 0;
		}

		if (parsed.values.version) {
			p.stdout.write(pkg.version);
			p.stdout.write("\n");
			return 0;
		}

		packageName = parsed.positionals[0];

		if (packageName === undefined) {
			throw new TypeError("The `package` argument is must be fill");
		}
	} catch (error) {
		// @ts-ignore
		p.stderr.write(error.message ? `Error: ${error.message}` : error.stack);
		p.stdout.write("\n");
		return 1;
	}

	const { name, version } = parsePackageName(packageName);

	try {
		const result = await getPackageSize(name, version, (n, v) => p.stdout.write(`Fetching ${n}@${v}\n`));
		p.stdout.write(`Succesfully fetch ${name}@${version}\n`);
		console.log(result);
		return 0;
	} catch (error) {
		p.stdout.write(`Failed fetch ${name}@${version} with error: ${error.message}\n`);
		return 1;
	}
};
