import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
import { n as arrangeCsv } from "./seat-plan-D-o9TAIQ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/seat-plan.functions-BTuXckV5.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/1Tok7fSsvIQWPN0cSUatx0NEQAPfbxbOR1clv8S1q6l8/export?format=csv&gid=0`;
var CACHE_MS = 1e4;
var cache = null;
var inflight = null;
async function loadSheet() {
	const response = await fetch(SHEET_CSV_URL, {
		headers: {
			Accept: "text/csv,text/plain,*/*",
			"User-Agent": "RecitationSeatPlan/1.0"
		},
		signal: AbortSignal.timeout(8e3),
		cache: "no-store"
	});
	if (!response.ok) return {
		ok: false,
		message: "The recitation sheet didn't respond. It may be offline or no longer shared."
	};
	const text = await response.text();
	const sample = text.slice(0, 200).toLowerCase();
	if (sample.includes("<html") || sample.includes("<!doctype")) return {
		ok: false,
		message: "The sheet isn't public to the web. In Google Sheets, set sharing to anyone with the link can view."
	};
	return {
		ok: true,
		...arrangeCsv(text),
		fetchedAt: (/* @__PURE__ */ new Date()).toISOString()
	};
}
var getSeatPlan_createServerFn_handler = createServerRpc({
	id: "6a54c8a0b159506ac092dc33a58b8ef13c899e24b1c94dbe265f15ff2d8ca719",
	name: "getSeatPlan",
	filename: "src/lib/seat-plan.functions.ts"
}, (opts) => getSeatPlan.__executeServer(opts));
var getSeatPlan = createServerFn({ method: "GET" }).validator((input) => ({ fresh: Boolean(input?.fresh) })).handler(getSeatPlan_createServerFn_handler, async ({ data }) => {
	const now = Date.now();
	if (!data.fresh && cache && now - cache.at < CACHE_MS) return cache.result;
	if (!data.fresh && inflight) return inflight;
	const run = loadSheet().then((result) => {
		if (result.ok) cache = {
			at: Date.now(),
			result
		};
		return result;
	}).catch(() => {
		if (cache) return cache.result;
		return {
			ok: false,
			message: "Couldn't reach the recitation sheet. The last plan is still showing if you had one."
		};
	}).finally(() => {
		inflight = null;
	});
	inflight = run;
	return run;
});
//#endregion
export { getSeatPlan_createServerFn_handler };
