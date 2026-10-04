import { getStore, type Store } from "@netlify/blobs";
import { type Schema, type Metadata } from "./types.ts";

const ONE_DAY_DURATION = 1000 * 60 * 60 * 24;
let store: Store | null = null;

const init = () => {
	store ??= getStore("v0");
};

export const shouldChange = async (packageName: string): Promise<boolean> => {
	init();

	const data = await store?.getMetadata(packageName);
	const metadata = data?.metadata as unknown as Metadata;
	if (!data || Date.now() > metadata.lastUpdatedAt + ONE_DAY_DURATION) {
		return true;
	}
	return false;
};

export const setPackageData = async (packageName: string, data: Schema): Promise<void> => {
	init();

	const metadata: Metadata = {
		lastUpdatedAt: Date.now(),
	};
	await store?.setJSON(packageName, data, { metadata: metadata as any });
};

export const getPackageData = async (packageName: string): Promise<Schema | undefined> => {
	init();

	const data = (await store?.get(packageName, { type: "json" })) as Schema;
	return data;
};
