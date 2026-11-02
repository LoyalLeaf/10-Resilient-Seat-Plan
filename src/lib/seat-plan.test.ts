import assert from "node:assert/strict";
import test from "node:test";
import { arrange, arrangeCsv, bandFor, type Student } from "./seat-plan.ts";

function student(
  name: string,
  points: number,
  eyesight = false,
): Student {
  const [lastName = "", givenName = ""] = name.split(",").map((part) => part.trim());
  return { name, lastName, givenName, points, eyesight };
}

test("eyesight six sit front-left, lowest on the left", () => {
  const eyes = ["A", "B", "C", "D", "E", "F"].map((id, i) =>
    student(`${id}, Kid`, [3, 1, 2, 5, 4, 4][i] ?? 0, true),
  );
  const plan = arrange(eyes, true);
  const front = plan.desks
    .filter((d) => d.rowFromFront === 0 && d.role === "eyesight")
    .sort((a, b) => a.col - b.col)
    .map((d) => d.student?.lastName);
  assert.deepEqual(front, ["B", "C", "A", "E", "F", "D"]);
});

test("regular seats zigzag from the front, skipping eyesight desks", () => {
  const eyes = [1, 2, 3, 4, 5, 6].map((n) => student(`Eye${n}, A`, n, true));
  const regular = Array.from({ length: 12 }, (_, i) => student(`R${String(i).padStart(2, "0")}, A`, 10 + i));
  const plan = arrange([...eyes, ...regular], true);
  const at = (row: number, col: number) =>
    plan.desks.find((d) => d.rowFromFront === row && d.col === col)?.student?.lastName;
  assert.equal(at(0, 6), "R00");
  assert.equal(at(0, 7), "R01");
  assert.equal(at(1, 7), "R02");
  assert.equal(at(1, 0), "R09");
  assert.equal(at(2, 0), "R10");
  assert.equal(at(2, 1), "R11");
});

test("same score breaks by last name", () => {
  const plan = arrange(
    [
      student("Santos, Bea", 4),
      student("Santos, Ana", 4),
      student("Aquino, Liza", 4),
    ],
    false,
  );
  const names = plan.desks
    .filter((d) => d.student)
    .sort((a, b) => a.rowFromFront - b.rowFromFront || a.col - b.col)
    .map((d) => d.student?.lastName + " " + d.student?.givenName);
  assert.deepEqual(names.slice(0, 3), ["Aquino Liza", "Santos Ana", "Santos Bea"]);
});

test("known eyesight names are detected when the sheet has no column", () => {
  const csv = [
    "Name,Recitations",
    '"BERDIN, Mathew S.",10',
    '"YAP, Chahna Mishael F.",16',
    '"ANDRADE, Ysabella Faye",8',
    '"CODIA, Bielle Jonahs A.",9',
  ].join("\n");
  const plan = arrangeCsv(csv);
  assert.equal(plan.usedEyesightColumn, false);
  const front = plan.desks
    .filter((d) => d.role === "eyesight" && d.student)
    .sort((a, b) => a.col - b.col)
    .map((d) => d.student?.lastName);
  assert.deepEqual(front, ["BERDIN", "YAP"]);
  assert.equal(
    plan.desks.find((d) => d.rowFromFront === 0 && d.col === 6)?.student?.lastName,
    "ANDRADE",
  );
  assert.equal(
    plan.desks.find((d) => d.rowFromFront === 0 && d.col === 7)?.student?.lastName,
    "CODIA",
  );
});

test("an Eyesight column replaces the built-in six", () => {
  const csv = [
    "Name,Recitations,Eyesight",
    '"BERDIN, Mathew S.",10,No',
    '"CRUZ, Ana",3,Yes',
  ].join("\n");
  const plan = arrangeCsv(csv);
  assert.equal(plan.usedEyesightColumn, true);
  const seated = plan.desks.find((d) => d.student?.lastName === "BERDIN");
  assert.equal(seated?.role, "regular");
  const front = plan.desks.find((d) => d.student?.lastName === "CRUZ");
  assert.equal(front?.role, "eyesight");
  assert.equal(front?.col, 0);
});

test("surname particles do not jump ahead of the main name", () => {
  const plan = arrange(
    [
      student("de Luna, Viktoria", 16, true),
      student("Llames, Cianna", 16, true),
      student("Yap, Chahna", 16, true),
    ],
    true,
  );
  const front = plan.desks
    .filter((d) => d.role === "eyesight" && d.student)
    .sort((a, b) => a.col - b.col)
    .map((d) => d.student?.lastName);
  assert.deepEqual(front, ["Llames", "de Luna", "Yap"]);
});

test("bands follow the printed legend and extend past 25", () => {
  assert.equal(bandFor(0), "rose");
  assert.equal(bandFor(9), "rose");
  assert.equal(bandFor(10), "sand");
  assert.equal(bandFor(14), "sand");
  assert.equal(bandFor(15), "mint");
  assert.equal(bandFor(19), "mint");
  assert.equal(bandFor(20), "ice");
  assert.equal(bandFor(24), "ice");
  assert.equal(bandFor(25), "deep");
  assert.equal(bandFor(28), "deep");
});

test("students past the last desk are listed, not dropped", () => {
  const many = Array.from({ length: 40 }, (_, i) => student(`N${i}, A`, i));
  const plan = arrange(many, false);
  assert.equal(plan.unseated.length, 9);
  assert.equal(plan.desks.filter((d) => d.student).length, 31);
});
