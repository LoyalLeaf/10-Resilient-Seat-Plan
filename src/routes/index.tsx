import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Eye, ExternalLink, EyeOff, Lock, RefreshCw } from "lucide-react";
import { BANDS, bandFor, type Desk } from "@/lib/seat-plan";
import { getSeatPlan, SHEET_EDIT_URL, type SeatPlanResult } from "@/lib/seat-plan.functions";

export const Route = createFileRoute("/")({
  loader: () => getSeatPlan({ data: { fresh: false } }),
  component: Home,
});

const LEFT = [0, 1, 2, 3];
const RIGHT = [4, 5, 6, 7];
const ROWS_BACK_TO_FRONT = [4, 3, 2, 1, 0];
const PASS_HASH = "eafa8d7ce4f9a2fd94e491b48c7f83ad180466680cd0d44d016b9192ff4a5143";
const UNLOCK_KEY = "seat-plan-unlock";

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function norm(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

async function passwordMatches(password: string): Promise<boolean> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return hex === PASS_HASH;
}

function Home() {
  const initial = Route.useLoaderData();
  const [plan, setPlan] = useState<SeatPlanResult>(initial);
  const [warning, setWarning] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [showNumbers, setShowNumbers] = useState(false);
  const [gate, setGate] = useState<null | "numbers" | "sheet">(null);
  const [password, setPassword] = useState("");
  const [gateError, setGateError] = useState<string | null>(null);
  const [checkingPassword, setCheckingPassword] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const planOk = plan.ok;

  useEffect(() => {
    try {
      if (sessionStorage.getItem(UNLOCK_KEY) === "1") setUnlocked(true);
    } catch {
      /* private mode */
    }
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (gate && !dialog.open) dialog.showModal();
    if (!gate && dialog.open) dialog.close();
  }, [gate]);

  useEffect(() => {
    let stop = false;
    const pull = async (fresh: boolean) => {
      setRefreshing(true);
      try {
        const next = await getSeatPlan({ data: { fresh } });
        if (stop) return;
        if (next.ok) {
          setPlan(next);
          setWarning(null);
        } else if (planOk) {
          setWarning(next.message);
        } else {
          setPlan(next);
        }
      } finally {
        if (!stop) setRefreshing(false);
      }
    };
    const id = window.setInterval(() => {
      void pull(false);
    }, 15000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [planOk]);

  const desks = plan.ok ? plan.desks : [];
  const byKey = useMemo(() => {
    const map = new Map<string, Desk>();
    for (const desk of desks) map.set(`${desk.rowFromFront}:${desk.col}`, desk);
    return map;
  }, [desks]);

  const needle = norm(query);
  const filtering = needle.length > 0;
  const hits = filtering
    ? desks.filter((d) => d.student && norm(d.student.name).includes(needle)).length
    : 0;

  useEffect(() => {
    if (!filtering) return;
    document.querySelector("[data-hit='true']")?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }, [filtering, needle, plan]);

  async function refreshNow() {
    setRefreshing(true);
    try {
      const next = await getSeatPlan({ data: { fresh: true } });
      if (next.ok) {
        setPlan(next);
        setWarning(null);
      } else if (plan.ok) setWarning(next.message);
      else setPlan(next);
    } finally {
      setRefreshing(false);
    }
  }

  function rememberUnlock() {
    setUnlocked(true);
    try {
      sessionStorage.setItem(UNLOCK_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  function lock() {
    setUnlocked(false);
    setShowNumbers(false);
    try {
      sessionStorage.removeItem(UNLOCK_KEY);
    } catch {
      /* ignore */
    }
  }

  function ask(intent: "numbers" | "sheet") {
    if (unlocked) {
      if (intent === "numbers") setShowNumbers(true);
      else window.open(SHEET_EDIT_URL, "_blank", "noopener,noreferrer");
      return;
    }
    setPassword("");
    setGateError(null);
    setGate(intent);
  }

  async function submitPassword(event: FormEvent) {
    event.preventDefault();
    const intent = gate;
    const sheetTab = intent === "sheet" ? window.open("", "_blank") : null;
    setCheckingPassword(true);
    try {
      const ok = await passwordMatches(password);
      if (!ok) {
        sheetTab?.close();
        setGateError("That password isn’t right.");
        return;
      }
      rememberUnlock();
      setPassword("");
      setGateError(null);
      setGate(null);
      if (intent === "numbers") setShowNumbers(true);
      if (intent === "sheet" && sheetTab) {
        sheetTab.opener = null;
        sheetTab.location.href = SHEET_EDIT_URL;
      }
    } finally {
      setCheckingPassword(false);
    }
  }

  return (
    <main className="page">
      <header className="top">
        <div>
          <p className="eyebrow">Live from the class sheet</p>
          <h1>Seat plan</h1>
          {plan.ok ? (
            <p className="status">
              <span className="tabular-nums">{plan.studentCount}</span> students
              <span aria-hidden="true"> · </span>
              synced {formatWhen(plan.fetchedAt)}
              {refreshing ? " · checking" : ""}
              <span aria-hidden="true"> · </span>
              {showNumbers ? "numbers on" : "numbers hidden"}
            </p>
          ) : (
            <p className="status">Waiting on the recitation sheet</p>
          )}
        </div>
        <div className="tools no-print">
          <input
            className="find"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a student"
            aria-label="Find a student"
            type="search"
            suppressHydrationWarning
          />
          <button className="btn btn-ghost" type="button" onClick={() => void refreshNow()}>
            <RefreshCw size={16} strokeWidth={2} aria-hidden="true" />
            Refresh
          </button>
          {showNumbers ? (
            <button className="btn btn-ghost" type="button" onClick={() => setShowNumbers(false)}>
              <EyeOff size={16} strokeWidth={2} aria-hidden="true" />
              Hide numbers
            </button>
          ) : (
            <button className="btn btn-ghost" type="button" onClick={() => ask("numbers")}>
              <Eye size={16} strokeWidth={2} aria-hidden="true" />
              Show numbers
            </button>
          )}
          {unlocked ? (
            <button className="btn btn-ghost" type="button" onClick={lock}>
              <Lock size={16} strokeWidth={2} aria-hidden="true" />
              Lock
            </button>
          ) : null}
          <button className="btn btn-ink" type="button" onClick={() => ask("sheet")}>
            Open sheet
            <ExternalLink size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </header>

      {warning ? <p className="note">{warning}</p> : null}
      {!plan.ok ? <p className="note">{plan.message}</p> : null}

      {plan.ok && plan.eyesightOverflow.length > 0 ? (
        <p className="note">
          More than six students are marked for eyesight. The six with the fewest recitations
          are in front. The rest join the regular zigzag and keep an eye mark.
        </p>
      ) : null}

      <p className="back-label">Back of the room</p>
      <p className="swipe no-print">Swipe sideways to see every column.</p>
      <div className="scroll">
        <div className={filtering ? "room is-filtering" : "room"}>
          {ROWS_BACK_TO_FRONT.map((row) => (
            <Row
              key={row}
              row={row}
              byKey={byKey}
              needle={needle}
              showNumbers={showNumbers}
            />
          ))}
        </div>
      </div>
      {filtering && hits === 0 ? <p className="miss">No one by that name on the plan.</p> : null}

      <div className="teachers">Teacher’s Table</div>
      <p className="front-label">Front of the room</p>

      <ul className="legend" aria-label="Recitation colors">
        {BANDS.map((band) => (
          <li key={band.id}>
            <span className={`swatch desk-${band.id}`} aria-hidden="true" />
            {band.label}
          </li>
        ))}
        <li>
          <span className="swatch swatch-eyesight" aria-hidden="true" />
          Eyesight seat
        </li>
      </ul>

      {plan.ok && plan.studentCount === 0 ? (
        <p className="empty-sheet">The sheet has no students yet.</p>
      ) : null}

      {plan.ok && plan.unseated.length > 0 ? (
        <section className="unseated">
          <h2>No desk left</h2>
          <ul>
            {plan.unseated.map((student) => (
              <li key={student.name} className="chip">
                {student.name}
                {showNumbers ? <span className="tabular-nums"> · {student.points}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <details className="how">
        <summary>How seats are chosen</summary>
        <ul>
          <li>
            The six front desks are for students with eyesight difficulty. Among them, the
            fewest recitations sit farthest left. Until the sheet says otherwise, those seats
            are Berdin, Soriano, Gumba, Llames, de Luna, and Yap.
          </li>
          <li>
            Add a column named Eyesight and mark Yes or No. Once anyone is marked, the sheet
            decides the front row instead of that fixed list.
          </li>
          <li>
            Everyone else walks a zigzag from the bottom-left: left to right, then right to
            left, up to the back. Fewest recitations go first. The same score is broken by
            last name, A to Z. A leading de or de la is skipped, so de Luna sorts with L.
          </li>
          <li>
            Colors match the printed chart: under 10, under 15, under 20, under 25. Scores of
            25 or more use the deeper blue. Exact counts stay hidden until the class password.
            The plan rechecks the sheet every few seconds.
          </li>
        </ul>
      </details>

      <dialog
        ref={dialogRef}
        className="gate"
        onClose={() => {
          setGate(null);
          setPassword("");
          setGateError(null);
        }}
      >
        <form onSubmit={(event) => void submitPassword(event)}>
          <p className="eyebrow">Class password</p>
          <h2>{gate === "sheet" ? "Open the sheet" : "Show recitation numbers"}</h2>
          <p className="gate-copy">
            {gate === "sheet"
              ? "The spreadsheet stays locked until the class password is entered."
              : "Names and colors stay visible. The exact counts need the class password."}
          </p>
          <label className="gate-label" htmlFor="class-password">
            Password
          </label>
          <input
            id="class-password"
            className="find gate-input"
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(event) => {
              setPassword(event.target.value);
              setGateError(null);
            }}
          />
          {gateError ? <p className="gate-error">{gateError}</p> : null}
          <div className="gate-actions">
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => dialogRef.current?.close()}
            >
              Cancel
            </button>
            <button className="btn btn-ink" type="submit" disabled={checkingPassword || !password}>
              {checkingPassword ? "Checking" : "Unlock"}
            </button>
          </div>
        </form>
      </dialog>
    </main>
  );
}

function Row({
  row,
  byKey,
  needle,
  showNumbers,
}: {
  row: number;
  byKey: Map<string, Desk>;
  needle: string;
  showNumbers: boolean;
}) {
  return (
    <>
      {LEFT.map((col) => (
        <DeskCard
          key={`${row}-${col}`}
          desk={byKey.get(`${row}:${col}`)}
          needle={needle}
          showNumbers={showNumbers}
        />
      ))}
      <div className="aisle" aria-hidden="true" />
      {RIGHT.map((col) => (
        <DeskCard
          key={`${row}-${col}`}
          desk={byKey.get(`${row}:${col}`)}
          needle={needle}
          showNumbers={showNumbers}
        />
      ))}
    </>
  );
}

function DeskCard({
  desk,
  needle,
  showNumbers,
}: {
  desk: Desk | undefined;
  needle: string;
  showNumbers: boolean;
}) {
  if (!desk) return <div className="gap" aria-hidden="true" />;
  const student = desk.student;
  if (!student) {
    return <div className="desk desk-empty" aria-label="Empty desk" />;
  }
  const hit = needle.length > 0 && norm(student.name).includes(needle);
  const eyesightLook = student.eyesight || desk.role === "eyesight";
  const label = [student.name, showNumbers ? `${student.points} recitations` : "", eyesightLook ? "eyesight seat" : ""]
    .filter(Boolean)
    .join(", ");
  return (
    <article
      className={[
        "desk",
        `desk-${bandFor(student.points)}`,
        eyesightLook ? "desk-eyesight" : "",
        hit ? "desk-hit" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={label}
      data-hit={hit ? "true" : undefined}
    >
      <p className="desk-last">{student.lastName}</p>
      {student.givenName ? <p className="desk-given">{student.givenName}</p> : null}
      <div className="desk-meta">
        {eyesightLook ? <Eye size={14} strokeWidth={2} aria-hidden="true" /> : <span />}
        {showNumbers ? <span className="desk-points">{student.points}</span> : null}
      </div>
    </article>
  );
}
