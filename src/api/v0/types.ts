export interface AnalyzeResult {
	name: string;
	version: string;
	unpacked: number;
	install: number;
}

export interface Schema {
	t: Record<string, string>;
	v: Record<
		string,
		{
			p: number | string;
			d?: Record<string, string>;
		}
	>;
}

export interface Metadata {
	lastUpdatedAt: number;
}
