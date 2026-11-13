import { createServerFn } from "@tanstack/react-start";

export const getClassState = createServerFn({ method: "GET" }).handler(async () => {
  const { readClass } = await import("./class-store.server");
  return readClass();
});

export const checkStudentPin = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const data = input as { studentId?: unknown; pin?: unknown };
    const studentId = String(data?.studentId ?? "");
    const pin = String(data?.pin ?? "").trim();
    if (!/^(s\d{2}|x-[a-z0-9-]{1,60})$/.test(studentId)) throw new Error("Unknown student");
    if (!/^\d{4}$/.test(pin)) return { studentId, pin: "" };
    return { studentId, pin };
  })
  .handler(async ({ data }) => {
    if (!data.pin) return { ok: false as const, message: "That LRN does not match. Try again." };
    const { lookupPin } = await import("./class-store.server");
    return lookupPin(data.studentId, data.pin);
  });

export const setRecitation = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const data = input as { studentId?: unknown; pin?: unknown; points?: unknown };
    const studentId = String(data?.studentId ?? "");
    const pin = String(data?.pin ?? "");
    const points = Number(data?.points);
    if (!/^(s\d{2}|x-[a-z0-9-]{1,60})$/.test(studentId)) {
      throw new Error("Unknown student");
    }
    if (!/^\d{4}$/.test(pin)) throw new Error("Enter the last 4 digits of the LRN.");
    if (!Number.isFinite(points)) throw new Error("Enter a recitation count.");
    return { studentId, pin, points };
  })
  .handler(async ({ data }) => {
    const { writeRecitation } = await import("./class-store.server");
    return writeRecitation(data.studentId, data.pin, data.points);
  });

export const checkClassPassword = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const password = String((input as { password?: unknown })?.password ?? "");
    if (password.length < 1 || password.length > 80) throw new Error("Enter the class password.");
    return { password };
  })
  .handler(async ({ data }) => {
    const { classPasswordOk } = await import("./class-store.server");
    return { ok: classPasswordOk(data.password) };
  });

export const checkSheetPin = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const pin = String((input as { pin?: unknown })?.pin ?? "").trim();
    if (!/^\d{4}$/.test(pin)) return { pin: "" };
    return { pin };
  })
  .handler(async ({ data }) => {
    if (!data.pin) return { ok: false };
    const { sheetPinOk } = await import("./class-store.server");
    return { ok: sheetPinOk(data.pin) };
  });
