import { cache, getPackageSize, parsePackageName } from "./core.js";
import { text, select, spinner } from "@clack/prompts";
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
					`Usage: ${pkg.name} [package] [..options]`,
					"",
					`${pkg.description}.`,
					"By default, if you don't take the `package` argument, it will enter the interactive mode.",
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
	} catch (error) {
		// @ts-ignore
		p.stderr.write(error.message ? `Error: ${error.message}` : error.stack);
		p.stdout.write("\n");
		return 1;
	}

	if (packageName === undefined) {
		return 0;
	}

	const { name, version } = parsePackageName(packageName);
	const s = spinner();
	s.start(`Fetching ${name}@${version}`);

	try {
		const result = await getPackageSize(name, version, s.message);
		s.stop(`Succesfully fetch ${name}@${version}`);
		console.log(result);
		return 0;
	} catch (error) {
		s.error(`Failed fetch ${name}@${version} with error: ${error.message}`);
		return 1;
	}
};
