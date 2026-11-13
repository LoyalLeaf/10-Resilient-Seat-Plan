export type ClassSnapshot = {
  students: SeatStudent[];
  fetchedAt: string;
  sheetOk: boolean;
  sharedOk: boolean;
  notice: string;
};

export type SeatStudent = {
  id: string;
  name: string;
  lastName: string;
  givenName: string;
  points: number;
  sheetPoints: number;
  eyesight: boolean;
  hasOverride: boolean;
  canEdit: boolean;
};

export type Desk = {
  rowFromFront: number;
  col: number;
  role: "eyesight" | "regular";
  student: SeatStudent | null;
};

export type Plan = {
  desks: Desk[];
  unseated: SeatStudent[];
  studentCount: number;
};

export type RosterEntry = {
  id: string;
  name: string;
  lastName: string;
  givenName: string;
};

type RowSpec = { cols: number[]; eyesight: number[] };

const EYESIGHT: Array<[string, string]> = [
  ["berdin", "mathew"],
  ["soriano", "jaye"],
  ["gumba", "malaika"],
  ["llames", "cianna"],
  ["de luna", "viktoria"],
  ["yap", "chahna"],
];

const ROWS: RowSpec[] = [
  { cols: [0, 1, 2, 3, 4, 5, 6, 7], eyesight: [0, 1, 2, 3, 4, 5] },
  { cols: [0, 1, 2, 3, 4, 5, 6, 7], eyesight: [] },
  { cols: [0, 1, 2, 3, 4, 5, 6, 7], eyesight: [] },
  { cols: [0, 1, 2, 3, 4, 5, 6, 7], eyesight: [] },
  { cols: [2, 3, 4, 5, 6], eyesight: [] },
];

/** Stable ids. Pins stay on the server. Names match the LRN list. */
const ROSTER_NAMES = [
  ["s01", "Arickx, Christoff R."],
  ["s02", "Berdin, Mathew S."],
  ["s03", "Datoon, Joshua Caleb D."],
  ["s04", "Olivan, Rein Christian S."],
  ["s05", "Ortile, Jun Christian O."],
  ["s06", "Patetico, Jesutivo Noah"],
  ["s07", "Prellegera, John Stephen P."],
  ["s08", "Tominio, Carlo V."],
  ["s09", "Andrade, Ysabella Faye B."],
  ["s10", "Babasa, Ghislaine Br."],
  ["s11", "Barameda, Summer VSN."],
  ["s12", "Biag, Nigel Shane C."],
  ["s13", "Codia, Bielle Jonahs A."],
  ["s14", "Colecha, Kim N."],
  ["s15", "Dacillo, Luvly Jhamella C."],
  ["s16", "Dacuya, Althea Joy F."],
  ["s17", "De la Fuente, Samiel Yara R."],
  ["s18", "De Luna, Viktoria R."],
  ["s19", "Gumba, Malaika Ysabella C."],
  ["s20", "Lista, Matilda Beatriz D."],
  ["s21", "Llames, Cianna Margarette T."],
  ["s22", "Lumawon, Xyriel"],
  ["s23", "Mar, Janna Charlie O."],
  ["s24", "Mengorio, Jelien Purz"],
  ["s25", "Moises, Jinky Faye A."],
  ["s26", "Morta, Amaia B."],
  ["s27", "Opiana, Chriatia Fatima M."],
  ["s28", "Quiapon, Princess Corrine Y."],
  ["s29", "Ramos, Jaira Nicole S."],
  ["s30", "Robrigado, Xiarah Nicolette O."],
  ["s31", "Rojero, Samara Kate D."],
  ["s32", "Saclag, Precious Jade R."],
  ["s33", "Satuito, Jaira Airies C."],
  ["s34", "Soriano, Jaye Anne Nazareth R."],
  ["s35", "Teodoro, Ella Jezrell E."],
  ["s36", "Viray, Dennise Keith Y."],
  ["s37", "Yap, Chahna Mishael F."],
] as const;

export const CHAHNA_ID = "s37";

export const DIRECTORY: RosterEntry[] = ROSTER_NAMES.map(([id, name]) => ({
  id,
  name,
  lastName: lastNameOf(name),
  givenName: givenNameOf(name),
}));

const DIRECTORY_BY_ID = new Map(DIRECTORY.map((entry) => [entry.id, entry]));

export const BANDS = [
  { id: "rose", label: "Under 10" },
  { id: "sand", label: "10+" },
  { id: "mint", label: "15+" },
  { id: "ice", label: "20+" },
  { id: "deep", label: "25+" },
  { id: "lilac", label: "30+" },
  { id: "amber", label: "35+" },
  { id: "teal", label: "40+" },
  { id: "indigo", label: "45+" },
  { id: "gold", label: "50" },
] as const;

const PARTICLES = new Set([
  "de",
  "del",
  "dela",
  "la",
  "los",
  "las",
  "san",
  "santa",
  "sta",
  "sto",
]);

export function norm(value: string): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\./g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function lastNameOf(full: string): string {
  const i = full.indexOf(",");
  return (i === -1 ? full : full.slice(0, i)).trim();
}

export function givenNameOf(full: string): string {
  const i = full.indexOf(",");
  return (i === -1 ? "" : full.slice(i + 1)).trim();
}

function squash(value: string): string {
  return value.replace(/(.)\1+/g, "$1");
}

export function sortLastName(last: string): string {
  const parts = last.split(/\s+/).filter(Boolean);
  let index = 0;
  while (
    index < parts.length - 1 &&
    PARTICLES.has(parts[index].toLowerCase().replace(/\./g, ""))
  ) {
    index += 1;
  }
  return index > 0 ? parts.slice(index).join(" ") : last;
}

export function prettyName(raw: string): string {
  const last = lastNameOf(raw);
  const given = givenNameOf(raw).replace(/\s+/g, " ").trim();
  const parts = last.split(/\s+/).filter(Boolean);
  const prettyLast = parts
    .map((part, index) => {
      const token = part.replace(/\./g, "");
      const lower = token.toLowerCase();
      const particle = PARTICLES.has(lower);
      const lastPart = index === parts.length - 1;
      if (particle && !lastPart) {
        if (index === 0 && lower === "de" && parts.length > 2) return "De";
        return lower;
      }
      if (!token) return "";
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    })
    .filter(Boolean)
    .join(" ");
  return given ? `${prettyLast}, ${given}` : prettyLast;
}

export function isKnownEyesight(name: string): boolean {
  const last = norm(lastNameOf(name));
  const given = norm(givenNameOf(name));
  return EYESIGHT.some(([l, g]) => last === l && given.startsWith(g));
}

export function isChahnaName(name: string): boolean {
  return norm(lastNameOf(name)) === "yap" && norm(givenNameOf(name)).startsWith("chahna");
}

export function bandFor(points: number): string {
  if (points < 10) return "rose";
  if (points < 15) return "sand";
  if (points < 20) return "mint";
  if (points < 25) return "ice";
  if (points < 30) return "deep";
  if (points < 35) return "lilac";
  if (points < 40) return "amber";
  if (points < 45) return "teal";
  if (points < 50) return "indigo";
  return "gold";
}

export function matchDirectory(rawName: string): RosterEntry | null {
  const last = norm(lastNameOf(rawName));
  const exact = DIRECTORY.filter((entry) => norm(entry.lastName) === last);
  if (exact.length === 1) return exact[0];
  const folded = DIRECTORY.filter((entry) => squash(norm(entry.lastName)) === squash(last));
  if (folded.length === 1) return folded[0];
  return null;
}

export function slugId(rawName: string): string {
  const last = norm(lastNameOf(rawName)).replace(/\s+/g, "-");
  const given = norm(givenNameOf(rawName)).split(" ").filter((part) => part.length > 1)[0] || "student";
  const slug = `${last}-${given}`.replace(/[^a-z0-9-]/g, "").slice(0, 48);
  return `x-${slug || "student"}`;
}

export function isEditableId(id: string): boolean {
  return DIRECTORY_BY_ID.has(id);
}

function compareStudents(a: SeatStudent, b: SeatStudent): number {
  if (a.points !== b.points) return a.points - b.points;
  const byLast = sortLastName(a.lastName).localeCompare(sortLastName(b.lastName), "en", {
    sensitivity: "base",
  });
  if (byLast !== 0) return byLast;
  return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
}

export function sortByRecitation(students: SeatStudent[]): SeatStudent[] {
  return students.slice().sort(compareStudents);
}

export function rosterFallback(counts: Record<string, number>): SeatStudent[] {
  return DIRECTORY.map((entry) => studentFromParts(entry.id, entry.name, 0, counts, true));
}

export function studentsFromRows(
  rows: Array<{ name: string; points: number }>,
  counts: Record<string, number>,
): SeatStudent[] {
  const seen = new Set<string>();
  const students: SeatStudent[] = [];
  rows.forEach((row) => {
    const raw = row.name.trim().replace(/\s+/g, " ");
    if (!raw || /^name$/i.test(raw)) return;
    const match = matchDirectory(raw);
    const id = match?.id ?? slugId(raw);
    if (seen.has(id)) return;
    seen.add(id);
    const display = prettyName(raw);
    students.push(studentFromParts(id, display, row.points, counts, Boolean(match)));
  });
  return students;
}

function studentFromParts(
  id: string,
  name: string,
  sheetPoints: number,
  counts: Record<string, number>,
  canEdit: boolean,
): SeatStudent {
  const hasOverride = Object.prototype.hasOwnProperty.call(counts, id);
  const points = hasOverride ? counts[id] : sheetPoints;
  return {
    id,
    name,
    lastName: lastNameOf(name),
    givenName: givenNameOf(name),
    points,
    sheetPoints,
    hasOverride,
    canEdit,
    eyesight: isKnownEyesight(name) || id === CHAHNA_ID,
  };
}

export function arrange(students: SeatStudent[]): Plan {
  const chahna = students.find((student) => student.id === CHAHNA_ID || isChahnaName(student.name));
  const others = students.filter((student) => student !== chahna);
  const eyesightSorted = others.filter((student) => student.eyesight).slice().sort(compareStudents);
  const frontOthers = eyesightSorted.slice(0, 5);
  const overflow = eyesightSorted.slice(5);
  const front: SeatStudent[] = [];
  if (chahna) front.push({ ...chahna, eyesight: true });
  front.push(...frontOthers);
  while (front.length < 6 && overflow.length) {
    const next = overflow.shift();
    if (next) front.push(next);
  }
  const placed = new Set(front);
  const regular = others.filter((student) => !placed.has(student)).slice().sort(compareStudents);

  const byKey = new Map<string, Desk>();
  ROWS.forEach((row, rowFromFront) => {
    const eyes = new Set(row.eyesight);
    row.cols.forEach((col) => {
      byKey.set(`${rowFromFront}:${col}`, {
        rowFromFront,
        col,
        role: eyes.has(col) ? "eyesight" : "regular",
        student: null,
      });
    });
  });

  front.forEach((student, index) => {
    if (index > 5) return;
    const desk = byKey.get(`0:${index}`);
    if (desk) desk.student = student;
  });

  const path: Array<{ rowFromFront: number; col: number }> = [];
  ROWS.forEach((row, rowFromFront) => {
    const eyes = new Set(row.eyesight);
    const cols = rowFromFront % 2 === 0 ? row.cols : row.cols.slice().reverse();
    cols.forEach((col) => {
      if (!eyes.has(col)) path.push({ rowFromFront, col });
    });
  });

  const unseated: SeatStudent[] = [];
  regular.forEach((student, index) => {
    const slot = path[index];
    if (!slot) {
      unseated.push(student);
      return;
    }
    const desk = byKey.get(`${slot.rowFromFront}:${slot.col}`);
    if (desk) desk.student = student;
  });

  return { desks: [...byKey.values()], unseated, studentCount: students.length };
}

export function sanitizeCounts(input: unknown): Record<string, number> {
  if (!input || typeof input !== "object") return {};
  const counts: Record<string, number> = {};
  Object.entries(input as Record<string, unknown>).forEach(([id, value]) => {
    if (!/^(s\d{2}|x-[a-z0-9-]{1,60})$/.test(id)) return;
    const points = Math.round(Number(value));
    if (!Number.isFinite(points)) return;
    counts[id] = Math.min(999, Math.max(0, points));
  });
  return counts;
}
