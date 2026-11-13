import assert from "node:assert/strict";
import test from "node:test";
import {
  arrange,
  bandFor,
  matchDirectory,
  prettyName,
  slugId,
  studentsFromRows,
  type SeatStudent,
} from "./seat-plan.ts";

function student(id: string, name: string, points: number, eyesight = false): SeatStudent {
  const [lastName, given = ""] = name.split(",").map((part) => part.trim());
  return {
    id,
    name,
    lastName,
    givenName: given,
    points,
    sheetPoints: points,
    eyesight,
    hasOverride: false,
    canEdit: true,
  };
}

test("Chahna stays front-left and the next eyesight seat is the lowest other", () => {
  const plan = arrange([
    student("s37", "Yap, Chahna Mishael F.", 40, true),
    student("s02", "Berdin, Mathew S.", 1, true),
    student("s19", "Gumba, Malaika Ysabella C.", 3, true),
    student("s09", "Andrade, Ysabella Faye B.", 2),
  ]);
  const frontLeft = plan.desks.find((desk) => desk.rowFromFront === 0 && desk.col === 0);
  assert.equal(frontLeft?.student?.id, "s37");
  const second = plan.desks.find((desk) => desk.rowFromFront === 0 && desk.col === 1);
  assert.equal(second?.student?.id, "s02");
  const firstRegular = plan.desks.find((desk) => desk.rowFromFront === 0 && desk.col === 6);
  assert.equal(firstRegular?.student?.id, "s09");
});

test("regular seats zigzag left-to-right then right-to-left from the front", () => {
  const eyes = [
    student("s37", "Yap, Chahna", 0, true),
    student("s02", "Berdin, Mathew", 1, true),
    student("s19", "Gumba, Malaika", 2, true),
    student("s34", "Soriano, Jaye", 3, true),
    student("s18", "De Luna, Viktoria", 4, true),
    student("s21", "Llames, Cianna", 5, true),
  ];
  const regulars = Array.from({ length: 4 }, (_, index) =>
    student(`s${String(index + 1).padStart(2, "0")}`, `Student, ${String.fromCharCode(65 + index)}`, index + 1),
  );
  regulars[0].id = "r1";
  const plan = arrange([...eyes, ...regulars]);
  const seat = (row: number, col: number) =>
    plan.desks.find((desk) => desk.rowFromFront === row && desk.col === col)?.student?.name;
  assert.equal(seat(0, 6), regulars[0].name);
  assert.equal(seat(0, 7), regulars[1].name);
  assert.equal(seat(1, 7), regulars[2].name);
  assert.equal(seat(1, 6), regulars[3].name);
});

test("bands step at 10, 15, 20, 25, 30, 35, 40, 45, and 50", () => {
  assert.equal(bandFor(9), "rose");
  assert.equal(bandFor(10), "sand");
  assert.equal(bandFor(15), "mint");
  assert.equal(bandFor(20), "ice");
  assert.equal(bandFor(25), "deep");
  assert.equal(bandFor(30), "lilac");
  assert.equal(bandFor(35), "amber");
  assert.equal(bandFor(40), "teal");
  assert.equal(bandFor(45), "indigo");
  assert.equal(bandFor(49), "indigo");
  assert.equal(bandFor(50), "gold");
});

test("sheet spellings still match the LRN roster", () => {
  assert.equal(matchDirectory("BARRAMEDA, Summer VSN")?.id, "s11");
  assert.equal(matchDirectory("ORTILE, Junn Christian O")?.id, "s05");
  assert.equal(matchDirectory("OPIANA, Christhia Fatima M.")?.id, "s27");
  assert.equal(matchDirectory("de LUNA, Viktoria R.")?.id, "s18");
  assert.equal(matchDirectory("DE LA FUENTE, Samiel Yara R.")?.id, "s17");
  assert.equal(matchDirectory("QUIAPON, Princess Corinne Y.")?.id, "s28");
  assert.equal(matchDirectory("TAGUM, Hezeckiah D."), null);
  assert.equal(slugId("TAGUM, Hezeckiah D."), "x-tagum-hezeckiah");
});

test("same score sorts by last name, and an edited count replaces the sheet", () => {
  const students = studentsFromRows(
    [
      { name: "VIRAY, Dennise Keith Y.", points: 8 },
      { name: "ANDRADE, Ysabella Faye", points: 8 },
      { name: "YAP, Chahna Mishael F.", points: 16 },
    ],
    { s09: 30 },
  );
  const andrade = students.find((student) => student.id === "s09");
  assert.equal(andrade?.points, 30);
  assert.equal(andrade?.hasOverride, true);
  assert.equal(prettyName("de LUNA, Viktoria R."), "de Luna, Viktoria R.");
  assert.equal(prettyName("DE LA FUENTE, Samiel Yara R."), "De la Fuente, Samiel Yara R.");
  const plan = arrange(students);
  const names = plan.desks
    .filter((desk) => desk.student && desk.role === "regular")
    .sort((a, b) => a.rowFromFront - b.rowFromFront || a.col - b.col);
  assert.equal(names[0]?.student?.id, "s36");
});
