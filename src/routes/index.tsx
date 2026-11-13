import { createFileRoute } from "@tanstack/react-router";
import { Eye, Pencil, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { checkClassPassword, checkSheetPin, checkStudentPin, getClassState, setRecitation } from "@/lib/recitations.functions";
import {
  BANDS,
  arrange,
  bandFor,
  norm,
  sortByRecitation,
  type ClassSnapshot,
  type Desk,
  type SeatStudent,
} from "@/lib/seat-plan";

type Snapshot = ClassSnapshot;

const UNLOCK_KEY = "seat-plan-unlock";
const SHEET_LRN_KEY = "seat-plan-sheet-lrn";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [showNumbers, setShowNumbers] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [gateError, setGateError] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetUnlocked, setSheetUnlocked] = useState(false);
  const [sheetLrn, setSheetLrn] = useState("");
  const [sheetLrnError, setSheetLrnError] = useState(false);
  const [editing, setEditing] = useState<SeatStudent | null>(null);
  const [editStep, setEditStep] = useState<1 | 2>(1);
  const [lrn, setLrn] = useState("");
  const [nextPoints, setNextPoints] = useState("");
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const next = await getClassState();
      setSnapshot(next);
    } catch {
      setSnapshot((current) =>
        current
          ? { ...current, notice: "Couldn’t refresh the class copy. The seats on screen are unchanged." }
          : current,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(UNLOCK_KEY) === "1") setUnlocked(true);
      if (sessionStorage.getItem(SHEET_LRN_KEY) === "1") setSheetUnlocked(true);
    } catch {
      /* session storage can be blocked */
    }
    void refresh();
    const id = window.setInterval(() => void refresh(), 8000);
    const onVis = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refresh]);

  const students = snapshot?.students ?? [];
  const plan = useMemo(() => (students.length ? arrange(students) : null), [students]);
  const byKey = useMemo(() => {
    const map = new Map<string, Desk>();
    plan?.desks.forEach((desk) => map.set(`${desk.rowFromFront}:${desk.col}`, desk));
    return map;
  }, [plan]);
  const ranked = useMemo(() => sortByRecitation(students), [students]);
  const needle = norm(query);
  const hits = needle
    ? (plan?.desks.filter((desk) => desk.student && norm(desk.student.name).includes(needle)).length ?? 0)
    : 0;
  const when = snapshot?.fetchedAt
    ? new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(snapshot.fetchedAt))
    : "";

  async function submitGate(event: FormEvent) {
    event.preventDefault();
    const result = await checkClassPassword({ data: { password } });
    if (!result.ok) {
      setGateError(true);
      return;
    }
    setUnlocked(true);
    setShowNumbers(true);
    setGateOpen(false);
    setPassword("");
    setGateError(false);
    try {
      sessionStorage.setItem(UNLOCK_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  async function unlockSheet(event: FormEvent) {
    event.preventDefault();
    const result = await checkSheetPin({ data: { pin: sheetLrn.trim() } });
    if (!result.ok) {
      setSheetLrnError(true);
      return;
    }
    setSheetUnlocked(true);
    setSheetLrn("");
    setSheetLrnError(false);
    try {
      sessionStorage.setItem(SHEET_LRN_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  async function submitEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    if (!editing.canEdit) {
      setEditError("No LRN is on file for this student.");
      setEditStep(1);
      return;
    }
    if (editStep === 1) {
      const result = await checkStudentPin({ data: { studentId: editing.id, pin: lrn.trim() } });
      if (!result.ok) {
        setLrn("");
        setEditStep(1);
        setEditError(result.message);
        return;
      }
      setEditing({ ...editing, points: result.points });
      setNextPoints(String(result.points));
      setEditStep(2);
      setEditError("");
      return;
    }
    setSaving(true);
    const result = await setRecitation({
      data: { studentId: editing.id, pin: lrn.trim(), points: Number(nextPoints) },
    });
    setSaving(false);
    if (!result.ok) {
      setLrn("");
      setEditStep(1);
      setNextPoints("");
      setEditError(result.message);
      return;
    }
    setSnapshot(result.snapshot);
    setEditing(null);
    setEditStep(1);
    setLrn("");
    setNextPoints("");
    setEditError("");
  }

  function openEdit(student: SeatStudent) {
    setEditing(student);
    setEditStep(1);
    setLrn("");
    setNextPoints("");
    setEditError(student.canEdit ? "" : "No LRN is on file for this student.");
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 pb-16">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="m-0 flex items-center gap-2 text-xs font-bold tracking-widest text-muted uppercase">
            <span className="live-dot" aria-hidden />
            Shared class seat plan
          </p>
          <h1 className="mt-1 font-display text-4xl font-medium tracking-tight">Seat plan</h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            {!plan
              ? "Loading the class sheet"
              : `${plan.studentCount} students · updated ${when}${loading ? " · checking" : ""} · ${
                  showNumbers ? "numbers on" : "numbers hidden"
                }`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="h-11 w-56 max-w-full rounded-lg border border-line bg-paper px-3 text-sm font-semibold text-ink"
            type="search"
            placeholder="Find a student"
            aria-label="Find a student"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button
            type="button"
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-line px-4 text-sm font-semibold"
            onClick={() => {
              setLoading(true);
              void refresh();
            }}
          >
            <RefreshCw className="size-4" aria-hidden />
            Refresh
          </button>
          <button
            type="button"
            className="inline-flex h-11 items-center rounded-lg border border-line px-4 text-sm font-semibold"
            onClick={() => {
              if (showNumbers) {
                setShowNumbers(false);
                return;
              }
              if (unlocked) {
                setShowNumbers(true);
                return;
              }
              setGateOpen(true);
              setPassword("");
              setGateError(false);
            }}
          >
            {showNumbers ? "Hide numbers" : "Show numbers"}
          </button>
          {unlocked ? (
            <button
              type="button"
              className="inline-flex h-11 items-center rounded-lg border border-line px-4 text-sm font-semibold"
              onClick={() => {
                setUnlocked(false);
                setShowNumbers(false);
                try {
                  sessionStorage.removeItem(UNLOCK_KEY);
                } catch {
                  /* ignore */
                }
              }}
            >
              Lock
            </button>
          ) : null}
          <button
            type="button"
            className="inline-flex h-11 items-center rounded-lg bg-ink px-4 text-sm font-semibold text-paper"
            onClick={() => setSheetOpen(true)}
          >
            Class sheet
          </button>
        </div>
      </header>

      {snapshot?.notice ? (
        <p className="mb-3 rounded-lg bg-rose px-4 py-3 text-sm text-rose-fg">{snapshot.notice}</p>
      ) : null}

      <p className="mb-2 text-center text-xs font-bold tracking-widest text-muted uppercase">Back of the room</p>
      {!plan ? <p className="mb-4 text-sm text-muted">Arranging the seats…</p> : null}
      {plan ? (
        <>
          <p className="mb-2 text-xs text-muted lg:hidden">Swipe sideways to see every column.</p>
          <div className="overflow-x-auto pb-2">
            <div className={needle ? "room [&_.desk:not(.desk-hit)]:opacity-40" : "room"}>
              {[4, 3, 2, 1, 0].map((row) => (
                <Row key={row} row={row} byKey={byKey} needle={needle} showNumbers={showNumbers} onEdit={openEdit} />
              ))}
            </div>
          </div>
          {needle && hits === 0 ? <p className="text-sm text-muted">No one by that name on the plan.</p> : null}
          <div className="mx-auto mt-4 max-w-md rounded-lg bg-ink px-6 py-4 text-center font-display text-xl text-paper">
            Teacher’s table
          </div>
          <p className="mt-3 text-center text-xs font-bold tracking-widest text-muted uppercase">Front of the room</p>
        </>
      ) : null}

      <ul className="mt-6 flex list-none flex-wrap gap-x-4 gap-y-2 p-0 text-sm">
        {BANDS.map((band) => (
          <li key={band.id} className="flex items-center gap-2">
            <span className={`desk-${band.id} size-4 rounded-full border border-ink/20`} />
            {band.label}
          </li>
        ))}
        <li className="flex items-center gap-2">
          <span className="size-4 rounded-full border-2 border-dashed border-ink bg-paper" />
          Eyesight seat
        </li>
      </ul>

      {plan && plan.unseated.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-sm font-bold">No desk left</h2>
          <ul className="mt-2 flex list-none flex-wrap gap-2 p-0">
            {plan.unseated.map((student) => (
              <li key={student.id} className="rounded-full border border-line bg-paper px-3 py-1 text-sm">
                {student.name}
                {showNumbers ? ` · ${student.points}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <details className="mt-6 max-w-2xl border-t border-line pt-4">
        <summary className="cursor-pointer font-bold">How seats are chosen</summary>
        <ul className="mt-2 space-y-2 text-sm text-muted">
          <li>Chahna Yap stays at the front-left eyesight seat, no matter her score. The other five eyesight seats rank left to right, fewest recitations first.</li>
          <li>Everyone else zigzags from the front-left regular seats: left to right, then right to left, toward the back. Fewest first. The same score sorts by last name, skipping a leading de or de la.</li>
          <li>Colors mark the bands: under 10, then 10, 15, 20, 25, 30, 35, 40, 45, and 50. Exact counts stay hidden until the class password.</li>
          <li>The class sheet lists everyone from fewest recitations to most. Those counts stay hidden until a student’s last four LRN digits are entered.</li>
          <li>The pencil asks for that student’s own last four LRN digits, then saves the new count for the whole class. Seats move as soon as it saves, including on other open pages.</li>
        </ul>
        <p className="mt-3 text-sm">
          <a className="font-bold underline" href="/pages/index.html" download="index.html">
            Download index.html
          </a>
          <span className="text-muted"> for GitHub Pages. Put that file in the site root. It uses the same shared counts.</span>
        </p>
      </details>

      {sheetOpen ? (
        <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-ink/40 p-4">
          <section className="mt-6 w-full max-w-3xl rounded-2xl border-2 border-ink bg-paper p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold tracking-widest text-muted uppercase">Class sheet</p>
                <h2 className="mt-1 font-display text-2xl">Recitations</h2>
                <p className="text-sm text-muted">Fewest recitations first. Same score, then last name.</p>
              </div>
              <button
                type="button"
                className="h-11 rounded-lg border border-line px-4 text-sm font-semibold"
                onClick={() => setSheetOpen(false)}
              >
                Close
              </button>
            </div>
            {sheetUnlocked ? (
              <p className="mt-4 text-sm text-muted">Counts are unlocked for this visit.</p>
            ) : (
              <form className="mt-4 flex flex-wrap items-end gap-2" onSubmit={(event) => void unlockSheet(event)}>
                <div>
                  <label className="block text-sm font-bold" htmlFor="sheet-lrn">
                    Last 4 of LRN
                  </label>
                  <input
                    id="sheet-lrn"
                    className="mt-2 h-11 w-40 rounded-lg border border-line bg-paper px-3"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    autoComplete="off"
                    value={sheetLrn}
                    onChange={(event) => {
                      setSheetLrn(event.target.value);
                      setSheetLrnError(false);
                    }}
                  />
                </div>
                <button type="submit" className="h-11 rounded-lg bg-ink px-4 text-sm font-semibold text-paper">
                  Unlock counts
                </button>
                {sheetLrnError ? <p className="text-sm text-rose-fg">That LRN does not match a student.</p> : null}
              </form>
            )}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs tracking-widest text-muted uppercase">
                    <th className="py-2 pr-3 font-bold">Rank</th>
                    <th className="py-2 pr-3 font-bold">Name</th>
                    <th className="py-2 font-bold">Recitations</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((student, index) => (
                    <tr key={student.id} className="border-b border-line">
                      <td className="py-2 pr-3 tabular-nums">{index + 1}</td>
                      <td className="py-2 pr-3">{student.name}</td>
                      <td className="py-2 font-bold tabular-nums">
                        {sheetUnlocked ? (
                          <>
                            {student.points}
                            {student.hasOverride ? "*" : ""}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}

      {gateOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4">
          <form
            className="w-full max-w-sm rounded-2xl border-2 border-ink bg-paper p-6"
            onSubmit={(event) => void submitGate(event)}
          >
            <p className="text-xs font-bold tracking-widest text-muted uppercase">Class password</p>
            <h2 className="mt-2 font-display text-xl">Show recitation numbers</h2>
            <p className="text-sm text-muted">
              Names and colors stay visible. The exact counts on the seat plan need the class password.
            </p>
            <label className="mt-4 block text-sm font-bold" htmlFor="class-password">
              Password
            </label>
            <input
              id="class-password"
              className="mt-2 h-11 w-full rounded-lg border border-line bg-paper px-3"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setGateError(false);
              }}
              autoFocus
            />
            {gateError ? <p className="mt-2 text-sm text-rose-fg">That password isn’t right.</p> : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="h-11 rounded-lg border border-line px-4 text-sm font-semibold"
                onClick={() => setGateOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="h-11 rounded-lg bg-ink px-4 text-sm font-semibold text-paper">
                Unlock
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {editing ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4">
          <form className="w-full max-w-sm rounded-2xl border-2 border-ink bg-paper p-6" onSubmit={(event) => void submitEdit(event)}>
            <p className="text-xs font-bold tracking-widest text-muted uppercase">Student edit</p>
            <h2 className="mt-2 font-display text-xl">{editing.name}</h2>
            <p className="text-sm text-muted">
              {editStep === 1
                ? "Enter the last four digits of this student’s LRN. The current count stays hidden until that matches."
                : "That LRN matches. Change the count, then save. The seat plan moves for everyone."}
            </p>
            {editStep === 1 ? (
              <>
                <label className="mt-4 block text-sm font-bold" htmlFor="edit-lrn">
                  Last 4 of LRN
                </label>
                <input
                  id="edit-lrn"
                  className="mt-2 h-11 w-full rounded-lg border border-line bg-paper px-3"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  autoComplete="off"
                  value={lrn}
                  onChange={(event) => {
                    setLrn(event.target.value);
                    setEditError("");
                  }}
                  autoFocus
                  disabled={!editing.canEdit}
                />
                {editError ? <p className="mt-2 text-sm text-rose-fg">{editError}</p> : null}
              </>
            ) : (
              <>
                <p className="mt-4 text-sm">
                  Current recitations: <span className="font-bold tabular-nums">{editing.points}</span>
                </p>
                <label className="mt-4 block text-sm font-bold" htmlFor="edit-points">
                  New recitation count
                </label>
                <input
                  id="edit-points"
                  className="mt-2 h-11 w-full rounded-lg border border-line bg-paper px-3"
                  type="number"
                  min={0}
                  max={999}
                  step={1}
                  value={nextPoints}
                  onChange={(event) => setNextPoints(event.target.value)}
                  autoFocus
                />
              </>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="h-11 rounded-lg border border-line px-4 text-sm font-semibold"
                onClick={() => {
                  setEditing(null);
                  setEditStep(1);
                  setLrn("");
                  setNextPoints("");
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-11 rounded-lg bg-ink px-4 text-sm font-semibold text-paper"
                disabled={saving || !editing.canEdit}
              >
                {editStep === 1 ? "Continue" : saving ? "Saving" : "Save"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}

function Row({
  row,
  byKey,
  needle,
  showNumbers,
  onEdit,
}: {
  row: number;
  byKey: Map<string, Desk>;
  needle: string;
  showNumbers: boolean;
  onEdit: (student: SeatStudent) => void;
}) {
  return (
    <>
      {[0, 1, 2, 3].map((col) => (
        <DeskCard key={col} desk={byKey.get(`${row}:${col}`)} needle={needle} showNumbers={showNumbers} onEdit={onEdit} />
      ))}
      <div aria-hidden />
      {[4, 5, 6, 7].map((col) => (
        <DeskCard key={col} desk={byKey.get(`${row}:${col}`)} needle={needle} showNumbers={showNumbers} onEdit={onEdit} />
      ))}
    </>
  );
}

function DeskCard({
  desk,
  needle,
  showNumbers,
  onEdit,
}: {
  desk: Desk | undefined;
  needle: string;
  showNumbers: boolean;
  onEdit: (student: SeatStudent) => void;
}) {
  if (!desk) return <div aria-hidden />;
  const student = desk.student;
  if (!student) return <div className="desk desk-empty" aria-label="Empty desk" />;
  const hit = Boolean(needle && norm(student.name).includes(needle));
  const eyesight = student.eyesight || desk.role === "eyesight";
  return (
    <article className={`desk desk-${bandFor(student.points)} ${eyesight ? "desk-eyesight" : ""} ${hit ? "desk-hit" : ""}`}>
      <p className="m-0 text-xs font-bold tracking-wide uppercase leading-tight break-words">{student.lastName}</p>
      {student.givenName ? <p className="mt-1 text-xs leading-tight break-words">{student.givenName}</p> : null}
      <div className="mt-auto flex items-end justify-between gap-1 pt-2">
        {eyesight ? <Eye className="mb-3 size-3.5" aria-label="Eyesight seat" /> : <span />}
        {showNumbers ? (
          <span className="mb-3 ml-auto text-sm font-bold tabular-nums">
            {student.points}
            {student.hasOverride ? "*" : ""}
          </span>
        ) : (
          <span className="ml-auto" />
        )}
        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-md text-current"
          aria-label={`Edit recitations for ${student.name}`}
          title="Edit recitations"
          onClick={() => onEdit(student)}
        >
          <Pencil className="size-3.5" />
        </button>
      </div>
    </article>
  );
}
