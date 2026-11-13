import "@tanstack/react-start/server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { getSql } from "@/lib/db";
import { CLASS_PASS_HASH, PINS } from "@/lib/pins.server";
import {
  rosterFallback,
  sanitizeCounts,
  studentsFromRows,
  type ClassSnapshot,
} from "@/lib/seat-plan";

const SHEET_ID = "1Tok7fSsvIQWPN0cSUatx0NEQAPfbxbOR1clv8S1q6l8";
const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/" +
  SHEET_ID +
  "/gviz/tq?tqx=out:json&gid=0";
const BIN_URL = "https://extendsclass.com/api/json-storage/bin/bbbcdde";

const SHEET_TTL_MS = 12_000;
const REMOTE_TTL_MS = 4_000;

type Board = {
  rev: number;
  syncedRev: number;
  dirty: boolean;
  dirtyId: string | null;
  points: Record<string, number>;
};

type SheetCache = {
  at: number;
  rows: Array<{ name: string; points: number }> | null;
};

const memory = globalThis as typeof globalThis & {
  __seatSheet?: SheetCache;
  __seatRemote?: { at: number; doc: Board | null };
  __seatChain?: Promise<unknown>;
};

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const previous = memory.__seatChain ?? Promise.resolve();
  const run = previous.then(task, task);
  memory.__seatChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function hashHex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sameHex(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function pinMatches(id: string, pin: string): boolean {
  const expected = PINS[id];
  if (!expected || pin.length !== expected.length) return false;
  const a = Buffer.from(pin);
  const b = Buffer.from(expected);
  return timingSafeEqual(a, b);
}

function anyPin(pin: string): boolean {
  return Object.values(PINS).some((expected) => {
    if (pin.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(pin), Buffer.from(expected));
  });
}

function parsePayload(text: string): unknown {
  const cut = text.search(/<!doctype/i);
  const json = (cut === -1 ? text : text.slice(0, cut)).trim();
  if (!json) throw new Error("Empty shared copy");
  return JSON.parse(json);
}

function asBoard(value: unknown, fallbackRev = 0): Board {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const rev = Math.max(0, Math.round(Number(record.rev) || fallbackRev));
  return {
    rev,
    syncedRev: rev,
    dirty: false,
    dirtyId: null,
    points: sanitizeCounts(record.points),
  };
}

async function fetchRemote(force: boolean): Promise<Board | null> {
  const cached = memory.__seatRemote;
  if (!force && cached && Date.now() - cached.at < REMOTE_TTL_MS) return cached.doc;
  try {
    const response = await fetch(`${BIN_URL}?t=${Date.now()}`, {
      headers: { Accept: "application/json", "Cache-Control": "no-cache" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(String(response.status));
    const doc = asBoard(parsePayload(await response.text()));
    memory.__seatRemote = { at: Date.now(), doc };
    return doc;
  } catch {
    memory.__seatRemote = { at: Date.now(), doc: null };
    return null;
  }
}

async function putRemote(doc: { rev: number; points: Record<string, number> }): Promise<boolean> {
  try {
    const response = await fetch(BIN_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ rev: doc.rev, points: doc.points }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return false;
    const payload = parsePayload(await response.text()) as { status?: number };
    return payload.status === 0 || payload.status === undefined;
  } catch {
    return false;
  }
}

async function readBoard(): Promise<Board> {
  const sql = await getSql();
  const rows = await sql<{
    rev: number;
    synced_rev: number;
    dirty: boolean;
    dirty_id: string | null;
    points: unknown;
  }>`select rev, synced_rev, dirty, dirty_id, points from class_board where id = 1`;
  const row = rows[0];
  if (!row) {
    return { rev: 0, syncedRev: 0, dirty: false, dirtyId: null, points: {} };
  }
  return {
    rev: Number(row.rev) || 0,
    syncedRev: Number(row.synced_rev) || 0,
    dirty: Boolean(row.dirty),
    dirtyId: row.dirty_id,
    points: sanitizeCounts(row.points),
  };
}

async function writeBoard(board: Board): Promise<void> {
  const sql = await getSql();
  const points = JSON.stringify(board.points);
  await sql`
    update class_board
    set rev = ${board.rev},
        synced_rev = ${board.syncedRev},
        dirty = ${board.dirty},
        dirty_id = ${board.dirtyId},
        points = ${points}::jsonb,
        updated_at = now()
    where id = 1
  `;
}

async function loadSheet(force: boolean): Promise<Array<{ name: string; points: number }> | null> {
  const cached = memory.__seatSheet;
  if (!force && cached && Date.now() - cached.at < SHEET_TTL_MS) return cached.rows;
  try {
    const response = await fetch(`${SHEET_URL}&_=${Date.now()}`, {
      headers: { Accept: "text/plain,*/*" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(String(response.status));
    const text = await response.text();
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("Sheet payload was empty");
    const data = JSON.parse(text.slice(start, end + 1)) as {
      status?: string;
      table?: {
        cols?: Array<{ label?: string }>;
        rows?: Array<{ c?: Array<{ v?: unknown } | null> }>;
      };
    };
    if (data.status !== "ok" || !data.table) throw new Error("Sheet was not public");
    const labels = (data.table.cols || []).map((col) => String(col.label || "").toLowerCase());
    let nameIdx = labels.findIndex((label) => label.includes("name"));
    let pointsIdx = labels.findIndex((label) =>
      ["number", "recitation", "point", "score", "count"].some((alias) => label.includes(alias)),
    );
    if (nameIdx < 0) nameIdx = 0;
    if (pointsIdx < 0) pointsIdx = 1;
    const rows = (data.table.rows || [])
      .map((row) => {
        const name = String(row.c?.[nameIdx]?.v ?? "").trim();
        const raw = row.c?.[pointsIdx]?.v;
        const points = Math.max(0, Math.round(Number(String(raw ?? "").replace(/,/g, "")) || 0));
        return { name, points };
      })
      .filter((row) => row.name && !/^name$/i.test(row.name));
    if (!rows.length) throw new Error("Sheet had no students");
    memory.__seatSheet = { at: Date.now(), rows };
    return rows;
  } catch {
    if (cached?.rows) {
      memory.__seatSheet = { at: Date.now(), rows: cached.rows };
      return cached.rows;
    }
    memory.__seatSheet = { at: Date.now(), rows: null };
    return null;
  }
}

function snapshotFrom(
  counts: Record<string, number>,
  rows: Array<{ name: string; points: number }> | null,
  sharedOk: boolean,
): ClassSnapshot {
  const students = rows ? studentsFromRows(rows, counts) : rosterFallback(counts);
  const sheetOk = Boolean(rows);
  const notices: string[] = [];
  if (!sheetOk) notices.push("The class sheet didn’t load. Showing the saved roster.");
  if (!sharedOk) notices.push("The shared copy didn’t answer. This site will keep trying.");
  return {
    students,
    fetchedAt: new Date().toISOString(),
    sheetOk,
    sharedOk,
    notice: notices.join(" "),
  };
}

async function sync(change: { id: string; points: number } | null): Promise<{
  counts: Record<string, number>;
  sharedOk: boolean;
}> {
  const local = await readBoard();
  let remote = await fetchRemote(Boolean(change));
  let points = { ...(remote ? remote.points : local.points) };
  let rev = remote ? remote.rev : local.rev;
  let dirty = local.dirty;
  let dirtyId = local.dirtyId;

  if (remote && dirty && dirtyId && Object.prototype.hasOwnProperty.call(local.points, dirtyId)) {
    const pending = local.points[dirtyId];
    if (points[dirtyId] !== pending) {
      points[dirtyId] = pending;
      rev = remote.rev + 1;
      dirty = true;
    } else {
      dirty = false;
      dirtyId = null;
    }
  }

  if (change) {
    points = { ...points, [change.id]: change.points };
    rev += 1;
    dirty = true;
    dirtyId = change.id;
  }

  points = sanitizeCounts(points);

  if (remote && dirty) {
    const pushed = await putRemote({ rev, points });
    if (pushed) {
      const check = await fetchRemote(true);
      const idToSee = change?.id ?? dirtyId;
      const expected = idToSee ? points[idToSee] : undefined;
      if (check && (idToSee == null || check.points[idToSee] === expected)) {
        points = check.points;
        rev = check.rev;
        dirty = false;
        dirtyId = null;
        remote = check;
      }
    }
  } else if (!remote && (change || dirty)) {
    dirty = true;
  }

  const sharedOk = Boolean(remote) && !dirty;
  await writeBoard({
    rev,
    syncedRev: sharedOk ? rev : local.syncedRev,
    dirty,
    dirtyId: dirty ? dirtyId : null,
    points,
  });
  memory.__seatRemote = { at: Date.now(), doc: remote ? { ...asBoard({ rev, points }), rev, points } : null };
  return { counts: points, sharedOk };
}

export function readClass(): Promise<ClassSnapshot> {
  return enqueue(async () => {
    const [{ counts, sharedOk }, rows] = await Promise.all([sync(null), loadSheet(false)]);
    return snapshotFrom(counts, rows, sharedOk);
  });
}

export function lookupPin(
  id: string,
  pin: string,
): Promise<{ ok: true; points: number } | { ok: false; message: string }> {
  return enqueue(async () => {
    if (!PINS[id]) return { ok: false, message: "No LRN is on file for this student." };
    if (!pinMatches(id, pin.trim())) {
      return { ok: false, message: "That LRN does not match. Try again." };
    }
    const [{ counts }, rows] = await Promise.all([sync(null), loadSheet(false)]);
    const students = rows ? studentsFromRows(rows, counts) : rosterFallback(counts);
    const student = students.find((item) => item.id === id);
    return { ok: true, points: student?.points ?? 0 };
  });
}

export function writeRecitation(id: string, pin: string, points: number): Promise<
  { ok: true; snapshot: ClassSnapshot } | { ok: false; message: string }
> {
  return enqueue(async () => {
    if (!PINS[id]) {
      return { ok: false, message: "No LRN is on file for this student." };
    }
    if (!pinMatches(id, pin.trim())) {
      return { ok: false, message: "That LRN does not match. Try again." };
    }
    const next = Math.round(Number(points));
    if (!Number.isFinite(next) || next < 0 || next > 999) {
      return { ok: false, message: "Enter a recitation count from 0 to 999." };
    }
    const [{ counts, sharedOk }, rows] = await Promise.all([
      sync({ id, points: next }),
      loadSheet(false),
    ]);
    return { ok: true, snapshot: snapshotFrom(counts, rows, sharedOk) };
  });
}

export function classPasswordOk(password: string): boolean {
  return sameHex(hashHex(password), CLASS_PASS_HASH);
}

export function sheetPinOk(pin: string): boolean {
  return anyPin(pin.trim());
}
