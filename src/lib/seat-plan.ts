/** Classroom seat plan: eyesight front six, then zigzag from the bottom-left. */

export type Band = "rose" | "sand" | "mint" | "ice" | "deep";

export type Student = {
  name: string;
  lastName: string;
  givenName: string;
  points: number;
  eyesight: boolean;
};

export type Desk = {
  rowFromFront: number;
  col: number;
  role: "eyesight" | "regular";
  student: Student | null;
};

export type Arrangement = {
  desks: Desk[];
  unseated: Student[];
  eyesightOverflow: Student[];
  usedEyesightColumn: boolean;
};

const EYESIGHT_FALLBACK: Array<[string, string]> = [
  ["berdin", "mathew"],
  ["soriano", "jaye"],
  ["gumba", "malaika"],
  ["llames", "cianna"],
  ["de luna", "viktoria"],
  ["yap", "chahna"],
];

/** Rows from the teacher's table backward. Back row has no desks on the outer columns. */
const ROWS: { cols: number[]; eyesight: number[] }[] = [
  { cols: [0, 1, 2, 3, 4, 5, 6, 7], eyesight: [0, 1, 2, 3, 4, 5] },
  { cols: [0, 1, 2, 3, 4, 5, 6, 7], eyesight: [] },
  { cols: [0, 1, 2, 3, 4, 5, 6, 7], eyesight: [] },
  { cols: [0, 1, 2, 3, 4, 5, 6, 7], eyesight: [] },
  { cols: [2, 3, 4, 5, 6], eyesight: [] },
];

export const BANDS: { id: Band; label: string }[] = [
  { id: "rose", label: "Under 10" },
  { id: "sand", label: "Under 15" },
  { id: "mint", label: "Under 20" },
  { id: "ice", label: "Under 25" },
  { id: "deep", label: "25 and up" },
];

export function bandFor(points: number): Band {
  if (points < 10) return "rose";
  if (points < 15) return "sand";
  if (points < 20) return "mint";
  if (points < 25) return "ice";
  return "deep";
}

export function lastNameOf(full: string): string {
  const i = full.indexOf(",");
  return (i === -1 ? full : full.slice(0, i)).trim();
}

export function givenNameOf(full: string): string {
  const i = full.indexOf(",");
  return (i === -1 ? "" : full.slice(i + 1)).trim();
}

function norm(value: string): string {
  return value
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isKnownEyesight(name: string): boolean {
  const last = norm(lastNameOf(name));
  const given = norm(givenNameOf(name));
  return EYESIGHT_FALLBACK.some(([l, g]) => last === l && given.startsWith(g));
}

function sortLastName(last: string): string {
  const particles = new Set(["de", "del", "dela", "la", "los", "las", "san", "santa", "sta", "sto"]);
  const parts = last.split(/\s+/).filter(Boolean);
  let index = 0;
  while (
    index < parts.length - 1 &&
    particles.has(parts[index].toLowerCase().replace(/\./g, ""))
  ) {
    index += 1;
  }
  return index > 0 ? parts.slice(index).join(" ") : last;
}

function compareStudents(a: Student, b: Student): number {
  if (a.points !== b.points) return a.points - b.points;
  const byLast = sortLastName(a.lastName).localeCompare(sortLastName(b.lastName), "en", {
    sensitivity: "base",
  });
  if (byLast !== 0) return byLast;
  return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
}

function regularPath(): { rowFromFront: number; col: number }[] {
  const path: { rowFromFront: number; col: number }[] = [];
  ROWS.forEach((row, rowFromFront) => {
    const eyesight = new Set(row.eyesight);
    const cols = rowFromFront % 2 === 0 ? row.cols : [...row.cols].reverse();
    for (const col of cols) {
      if (eyesight.has(col)) continue;
      path.push({ rowFromFront, col });
    }
  });
  return path;
}

export function arrange(students: Student[], usedEyesightColumn: boolean): Arrangement {
  const eyesightSorted = students.filter((s) => s.eyesight).slice().sort(compareStudents);
  const front = eyesightSorted.slice(0, 6);
  const eyesightOverflow = eyesightSorted.slice(6);
  const regular = students
    .filter((s) => !front.includes(s))
    .slice()
    .sort(compareStudents);

  const byKey = new Map<string, Desk>();
  ROWS.forEach((row, rowFromFront) => {
    const eyesight = new Set(row.eyesight);
    for (const col of row.cols) {
      byKey.set(`${rowFromFront}:${col}`, {
        rowFromFront,
        col,
        role: eyesight.has(col) ? "eyesight" : "regular",
        student: null,
      });
    }
  });

  front.forEach((student, index) => {
    const desk = byKey.get(`0:${index}`);
    if (desk) desk.student = student;
  });

  const path = regularPath();
  const unseated: Student[] = [];
  regular.forEach((student, index) => {
    const slot = path[index];
    if (!slot) {
      unseated.push(student);
      return;
    }
    const desk = byKey.get(`${slot.rowFromFront}:${slot.col}`);
    if (desk) desk.student = student;
  });

  const desks = [...byKey.values()].sort((a, b) =>
    a.rowFromFront === b.rowFromFront ? a.col - b.col : b.rowFromFront - a.rowFromFront,
  );

  return { desks, unseated, eyesightOverflow, usedEyesightColumn };
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
      continue;
    }
    if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(cur);
      cur = "";
    } else if (c === "\n") {
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
    } else if (c !== "\r") cur += c;
  }
  if (cur.length > 0 || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

function headerIndex(headers: string[], aliases: string[]): number {
  const normalized = headers.map((h) => norm(h));
  return normalized.findIndex((h) => aliases.some((a) => h === a || h.includes(a)));
}

function looksLikeHeader(row: string[]): boolean {
  return /name|student|recitation|point|score|eyesight/.test(row.join(" ").toLowerCase());
}

function parsePoints(raw: string): number {
  const cleaned = raw.trim().replace(/,/g, "");
  if (!cleaned) return 0;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function markedEyesight(raw: string): boolean {
  const value = raw.trim().toLowerCase();
  if (!value) return false;
  return !["no", "n", "false", "0", "none", "-"].includes(value);
}

export function studentsFromCsv(csv: string): {
  students: Student[];
  usedEyesightColumn: boolean;
} {
  const table = parseCsv(csv);
  if (table.length === 0) return { students: [], usedEyesightColumn: false };

  const header = looksLikeHeader(table[0] ?? []);
  const head = header ? (table[0] ?? []) : [];
  const body = header ? table.slice(1) : table;

  const nameIdx = header ? Math.max(0, headerIndex(head, ["name", "student"])) : 0;
  const pointsIdx = header
    ? headerIndex(head, ["recitation", "point", "score", "number", "count"])
    : 1;
  const eyesightIdx = header ? headerIndex(head, ["eyesight", "eye sight", "vision"]) : -1;
  const resolvedPoints = pointsIdx >= 0 ? pointsIdx : 1;

  const anyMarked =
    eyesightIdx >= 0 && body.some((r) => markedEyesight(r[eyesightIdx] ?? ""));

  const students: Student[] = [];
  for (const cells of body) {
    const name = (cells[nameIdx] ?? "").trim().replace(/\s+/g, " ");
    if (!name || /^name$/i.test(name)) continue;
    const points = parsePoints(cells[resolvedPoints] ?? "");
    const eyesight = anyMarked
      ? markedEyesight(cells[eyesightIdx] ?? "")
      : isKnownEyesight(name);
    students.push({
      name,
      lastName: lastNameOf(name),
      givenName: givenNameOf(name),
      points,
      eyesight,
    });
  }
  return { students, usedEyesightColumn: anyMarked };
}

export function arrangeCsv(csv: string): Arrangement & { studentCount: number } {
  const { students, usedEyesightColumn } = studentsFromCsv(csv);
  return { ...arrange(students, usedEyesightColumn), studentCount: students.length };
}
