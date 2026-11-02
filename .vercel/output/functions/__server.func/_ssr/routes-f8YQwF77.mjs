import { i as __toESM } from "../_runtime.mjs";
import { b as require_jsx_runtime, q as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as EyeOff, i as Eye, n as RefreshCw, o as ExternalLink, r as Lock } from "../_libs/lucide-react.mjs";
import { i as getSeatPlan, n as Route, r as SHEET_EDIT_URL } from "./router-snLOtGnv.mjs";
import { r as bandFor, t as BANDS } from "./seat-plan-D-o9TAIQ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-f8YQwF77.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var LEFT = [
	0,
	1,
	2,
	3
];
var RIGHT = [
	4,
	5,
	6,
	7
];
var ROWS_BACK_TO_FRONT = [
	4,
	3,
	2,
	1,
	0
];
var PASS_HASH = "eafa8d7ce4f9a2fd94e491b48c7f83ad180466680cd0d44d016b9192ff4a5143";
var UNLOCK_KEY = "seat-plan-unlock";
function formatWhen(iso) {
	return new Intl.DateTimeFormat("en-PH", {
		timeZone: "Asia/Manila",
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit"
	}).format(new Date(iso));
}
function norm(value) {
	return value.toLowerCase().replace(/\s+/g, " ").trim();
}
async function passwordMatches(password) {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
	return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("") === PASS_HASH;
}
function Home() {
	const initial = Route.useLoaderData();
	const [plan, setPlan] = (0, import_react.useState)(initial);
	const [warning, setWarning] = (0, import_react.useState)(null);
	const [refreshing, setRefreshing] = (0, import_react.useState)(false);
	const [query, setQuery] = (0, import_react.useState)("");
	const [unlocked, setUnlocked] = (0, import_react.useState)(false);
	const [showNumbers, setShowNumbers] = (0, import_react.useState)(false);
	const [gate, setGate] = (0, import_react.useState)(null);
	const [password, setPassword] = (0, import_react.useState)("");
	const [gateError, setGateError] = (0, import_react.useState)(null);
	const [checkingPassword, setCheckingPassword] = (0, import_react.useState)(false);
	const dialogRef = (0, import_react.useRef)(null);
	const planOk = plan.ok;
	(0, import_react.useEffect)(() => {
		try {
			if (sessionStorage.getItem(UNLOCK_KEY) === "1") setUnlocked(true);
		} catch {}
	}, []);
	(0, import_react.useEffect)(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		if (gate && !dialog.open) dialog.showModal();
		if (!gate && dialog.open) dialog.close();
	}, [gate]);
	(0, import_react.useEffect)(() => {
		let stop = false;
		const pull = async (fresh) => {
			setRefreshing(true);
			try {
				const next = await getSeatPlan({ data: { fresh } });
				if (stop) return;
				if (next.ok) {
					setPlan(next);
					setWarning(null);
				} else if (planOk) setWarning(next.message);
				else setPlan(next);
			} finally {
				if (!stop) setRefreshing(false);
			}
		};
		const id = window.setInterval(() => {
			pull(false);
		}, 15e3);
		return () => {
			stop = true;
			window.clearInterval(id);
		};
	}, [planOk]);
	const desks = plan.ok ? plan.desks : [];
	const byKey = (0, import_react.useMemo)(() => {
		const map = /* @__PURE__ */ new Map();
		for (const desk of desks) map.set(`${desk.rowFromFront}:${desk.col}`, desk);
		return map;
	}, [desks]);
	const needle = norm(query);
	const filtering = needle.length > 0;
	const hits = filtering ? desks.filter((d) => d.student && norm(d.student.name).includes(needle)).length : 0;
	(0, import_react.useEffect)(() => {
		if (!filtering) return;
		document.querySelector("[data-hit='true']")?.scrollIntoView({
			block: "nearest",
			inline: "nearest"
		});
	}, [
		filtering,
		needle,
		plan
	]);
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
		} catch {}
	}
	function lock() {
		setUnlocked(false);
		setShowNumbers(false);
		try {
			sessionStorage.removeItem(UNLOCK_KEY);
		} catch {}
	}
	function ask(intent) {
		if (unlocked) {
			if (intent === "numbers") setShowNumbers(true);
			else window.open(SHEET_EDIT_URL, "_blank", "noopener,noreferrer");
			return;
		}
		setPassword("");
		setGateError(null);
		setGate(intent);
	}
	async function submitPassword(event) {
		event.preventDefault();
		setCheckingPassword(true);
		try {
			if (!await passwordMatches(password)) {
				setGateError("That password isn’t right.");
				return;
			}
			const intent = gate;
			rememberUnlock();
			setPassword("");
			setGateError(null);
			setGate(null);
			if (intent === "numbers") setShowNumbers(true);
			if (intent === "sheet") window.open(SHEET_EDIT_URL, "_blank", "noopener,noreferrer");
		} finally {
			setCheckingPassword(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "page",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "top",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "eyebrow",
						children: "Live from the class sheet"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Seat plan" }),
					plan.ok ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "status",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "tabular-nums",
								children: plan.studentCount
							}),
							" students",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								"aria-hidden": "true",
								children: " · "
							}),
							"synced ",
							formatWhen(plan.fetchedAt),
							refreshing ? " · checking" : "",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								"aria-hidden": "true",
								children: " · "
							}),
							showNumbers ? "numbers on" : "numbers hidden"
						]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "status",
						children: "Waiting on the recitation sheet"
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "tools no-print",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: "find",
							value: query,
							onChange: (event) => setQuery(event.target.value),
							placeholder: "Find a student",
							"aria-label": "Find a student",
							type: "search",
							suppressHydrationWarning: true
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							className: "btn btn-ghost",
							type: "button",
							onClick: () => void refreshNow(),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, {
								size: 16,
								strokeWidth: 2,
								"aria-hidden": "true"
							}), "Refresh"]
						}),
						showNumbers ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							className: "btn btn-ghost",
							type: "button",
							onClick: () => setShowNumbers(false),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOff, {
								size: 16,
								strokeWidth: 2,
								"aria-hidden": "true"
							}), "Hide numbers"]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							className: "btn btn-ghost",
							type: "button",
							onClick: () => ask("numbers"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, {
								size: 16,
								strokeWidth: 2,
								"aria-hidden": "true"
							}), "Show numbers"]
						}),
						unlocked ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							className: "btn btn-ghost",
							type: "button",
							onClick: lock,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, {
								size: 16,
								strokeWidth: 2,
								"aria-hidden": "true"
							}), "Lock"]
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							className: "btn btn-ink",
							type: "button",
							onClick: () => ask("sheet"),
							children: ["Open sheet", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, {
								size: 16,
								strokeWidth: 2,
								"aria-hidden": "true"
							})]
						})
					]
				})]
			}),
			warning ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "note",
				children: warning
			}) : null,
			!plan.ok ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "note",
				children: plan.message
			}) : null,
			plan.ok && plan.eyesightOverflow.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "note",
				children: "More than six students are marked for eyesight. The six with the fewest recitations are in front. The rest join the regular zigzag and keep an eye mark."
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "back-label",
				children: "Back of the room"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "swipe no-print",
				children: "Swipe sideways to see every column."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "scroll",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: filtering ? "room is-filtering" : "room",
					children: ROWS_BACK_TO_FRONT.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						row,
						byKey,
						needle,
						showNumbers
					}, row))
				})
			}),
			filtering && hits === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "miss",
				children: "No one by that name on the plan."
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "teachers",
				children: "Teacher’s Table"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "front-label",
				children: "Front of the room"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
				className: "legend",
				"aria-label": "Recitation colors",
				children: [BANDS.map((band) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: `swatch desk-${band.id}`,
					"aria-hidden": "true"
				}), band.label] }, band.id)), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "swatch swatch-eyesight",
					"aria-hidden": "true"
				}), "Eyesight seat"] })]
			}),
			plan.ok && plan.studentCount === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "empty-sheet",
				children: "The sheet has no students yet."
			}) : null,
			plan.ok && plan.unseated.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "unseated",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "No desk left" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: plan.unseated.map((student) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "chip",
					children: [student.name, showNumbers ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "tabular-nums",
						children: [" · ", student.points]
					}) : null]
				}, student.name)) })]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
				className: "how",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", { children: "How seats are chosen" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "The six front desks are for students with eyesight difficulty. Among them, the fewest recitations sit farthest left. Until the sheet says otherwise, those seats are Berdin, Soriano, Gumba, Llames, de Luna, and Yap." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Add a column named Eyesight and mark Yes or No. Once anyone is marked, the sheet decides the front row instead of that fixed list." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Everyone else walks a zigzag from the bottom-left: left to right, then right to left, up to the back. Fewest recitations go first. The same score is broken by last name, A to Z. A leading de or de la is skipped, so de Luna sorts with L." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Colors match the printed chart: under 10, under 15, under 20, under 25. Scores of 25 or more use the deeper blue. Exact counts stay hidden until the class password. The plan rechecks the sheet every few seconds." })
				] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dialog", {
				ref: dialogRef,
				className: "gate",
				onClose: () => {
					setGate(null);
					setPassword("");
					setGateError(null);
				},
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: (event) => void submitPassword(event),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "eyebrow",
							children: "Class password"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: gate === "sheet" ? "Open the sheet" : "Show recitation numbers" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "gate-copy",
							children: gate === "sheet" ? "The spreadsheet stays locked until the class password is entered." : "Names and colors stay visible. The exact counts need the class password."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							className: "gate-label",
							htmlFor: "class-password",
							children: "Password"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "class-password",
							className: "find gate-input",
							type: "password",
							value: password,
							autoComplete: "current-password",
							onChange: (event) => {
								setPassword(event.target.value);
								setGateError(null);
							}
						}),
						gateError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "gate-error",
							children: gateError
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "gate-actions",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "btn btn-ghost",
								type: "button",
								onClick: () => dialogRef.current?.close(),
								children: "Cancel"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "btn btn-ink",
								type: "submit",
								disabled: checkingPassword || !password,
								children: checkingPassword ? "Checking" : "Unlock"
							})]
						})
					]
				})
			})
		]
	});
}
function Row({ row, byKey, needle, showNumbers }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		LEFT.map((col) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DeskCard, {
			desk: byKey.get(`${row}:${col}`),
			needle,
			showNumbers
		}, `${row}-${col}`)),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "aisle",
			"aria-hidden": "true"
		}),
		RIGHT.map((col) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DeskCard, {
			desk: byKey.get(`${row}:${col}`),
			needle,
			showNumbers
		}, `${row}-${col}`))
	] });
}
function DeskCard({ desk, needle, showNumbers }) {
	if (!desk) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "gap",
		"aria-hidden": "true"
	});
	const student = desk.student;
	if (!student) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "desk desk-empty",
		"aria-label": "Empty desk"
	});
	const hit = needle.length > 0 && norm(student.name).includes(needle);
	const eyesightLook = student.eyesight || desk.role === "eyesight";
	const label = [
		student.name,
		showNumbers ? `${student.points} recitations` : "",
		eyesightLook ? "eyesight seat" : ""
	].filter(Boolean).join(", ");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: [
			"desk",
			`desk-${bandFor(student.points)}`,
			eyesightLook ? "desk-eyesight" : "",
			hit ? "desk-hit" : ""
		].filter(Boolean).join(" "),
		"aria-label": label,
		"data-hit": hit ? "true" : void 0,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "desk-last",
				children: student.lastName
			}),
			student.givenName ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "desk-given",
				children: student.givenName
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "desk-meta",
				children: [eyesightLook ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, {
					size: 14,
					strokeWidth: 2,
					"aria-hidden": "true"
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {}), showNumbers ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "desk-points",
					children: student.points
				}) : null]
			})
		]
	});
}
//#endregion
export { Home as component };
