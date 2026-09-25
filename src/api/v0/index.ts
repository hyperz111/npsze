import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { getPackageSize, parsePackageName } from "./core.js";

const app = new Hono();

app.get("/package/*", async (c) => {
	const sliceIndex = c.req.path.indexOf("/package/") + 9;
	const target = c.req.path.slice(sliceIndex);
	const { name, version } = parsePackageName(target);

	try {
		const result = await getPackageSize(name, version);
		return c.json(result);
	} catch (error) {
		if (error instanceof TypeError && error.message === "fetch failed") {
			throw new HTTPException(409);
		} else if (error instanceof HTTPException) {
			throw error;
		} else {
			throw new HTTPException();
		}
	}
});

export default app;
