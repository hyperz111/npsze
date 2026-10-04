// This file contains shims for dev environment.
// Will be replaced with Netlify Blobs on production.
import { type Schema, type Metadata } from "./types.ts";

const ONE_DAY_DURATION = 1000 * 60 * 60 * 24;
const store = new Map<string, { metadata: Metadata; data: Schema }>();

export const shouldChange = async (packageName: string): Promise<boolean> => {
	const data = store.get(packageName);
	if (!data || Date.now() > data.metadata.lastUpdatedAt + ONE_DAY_DURATION) {
		return await Promise.resolve(true);
	}
	return await Promise.resolve(false);
};

export const setPackageData = async (packageName: string, data: Schema): Promise<void> => {
	await Promise.resolve();
	store.set(packageName, {
		metadata: {
			lastUpdatedAt: Date.now(),
		},
		data,
	});
};

export const getPackageData = async (packageName: string): Promise<Schema | undefined> => {
	return await Promise.resolve(store.get(packageName)?.data);
};
