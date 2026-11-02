import { createServerFn } from "@tanstack/react-start";
import { arrangeCsv, type Arrangement } from "@/lib/seat-plan";

const SHEET_ID = "1Tok7fSsvIQWPN0cSUatx0NEQAPfbxbOR1clv8S1q6l8";

export const SHEET_EDIT_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=0#gid=0`;

const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;

const CACHE_MS = 10_000;

export type SeatPlanOk = Arrangement & {
  ok: true;
  studentCount: number;
  fetchedAt: string;
};

export type SeatPlanErr = {
  ok: false;
  message: string;
};

export type SeatPlanResult = SeatPlanOk | SeatPlanErr;

let cache: { at: number; result: SeatPlanOk } | null = null;
let inflight: Promise<SeatPlanResult> | null = null;

async function loadSheet(): Promise<SeatPlanResult> {
  const response = await fetch(SHEET_CSV_URL, {
    headers: {
      Accept: "text/csv,text/plain,*/*",
      "User-Agent": "RecitationSeatPlan/1.0",
    },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!response.ok) {
    return {
      ok: false,
      message: "The recitation sheet didn't respond. It may be offline or no longer shared.",
    };
  }
  const text = await response.text();
  const sample = text.slice(0, 200).toLowerCase();
  if (sample.includes("<html") || sample.includes("<!doctype")) {
    return {
      ok: false,
      message:
        "The sheet isn't public to the web. In Google Sheets, set sharing to anyone with the link can view.",
    };
  }
  const arranged = arrangeCsv(text);
  return { ok: true, ...arranged, fetchedAt: new Date().toISOString() };
}

export const getSeatPlan = createServerFn({ method: "GET" })
  .validator((input: { fresh?: boolean } | undefined) => ({
    fresh: Boolean(input?.fresh),
  }))
  .handler(async ({ data }): Promise<SeatPlanResult> => {
    const now = Date.now();
    if (!data.fresh && cache && now - cache.at < CACHE_MS) return cache.result;
    if (!data.fresh && inflight) return inflight;

    const run = loadSheet()
      .then((result) => {
        if (result.ok) cache = { at: Date.now(), result };
        return result;
      })
      .catch(() => {
        if (cache) return cache.result;
        return {
          ok: false as const,
          message: "Couldn't reach the recitation sheet. The last plan is still showing if you had one.",
        };
      })
      .finally(() => {
        inflight = null;
      });

    inflight = run;
    return run;
  });
