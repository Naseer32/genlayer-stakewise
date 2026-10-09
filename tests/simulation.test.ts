import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeSimulation,
  concentration,
  convertRaw,
  estimateRewards,
  evenSplit,
  parseNumber,
  parseTotal,
} from "../src/services/simulation.ts";

test("parseNumber is strict", () => {
  assert.equal(parseNumber("1,000.5"), 1000.5);
  assert.equal(parseNumber(".5"), 0.5);
  assert.equal(parseNumber("abc"), null);
  assert.equal(parseNumber("-5"), null);
  assert.equal(parseNumber("1e5"), null);
  assert.equal(parseNumber(""), null);
});

test("parseTotal flags empty, invalid, zero", () => {
  assert.ok(parseTotal("").error);
  assert.ok(parseTotal("x").error);
  assert.ok(parseTotal("0").error);
  assert.equal(parseTotal("1000").value, 1000);
});

test("amount mode: complete, partial, over", () => {
  let r = computeSimulation("1000", "amount", [
    { validatorId: "a", raw: "600" },
    { validatorId: "b", raw: "400" },
  ]);
  assert.equal(r.status, "complete");
  assert.equal(r.remaining, 0);
  assert.equal(r.rows[0].percent, 60);

  r = computeSimulation("1000", "amount", [{ validatorId: "a", raw: "250" }]);
  assert.equal(r.status, "partial");
  assert.equal(r.remaining, 750);

  r = computeSimulation("1000", "amount", [
    { validatorId: "a", raw: "700" },
    { validatorId: "b", raw: "400" },
  ]);
  assert.equal(r.status, "over");
  assert.equal(r.remaining, -100);
});

test("single amount above total is rejected", () => {
  const r = computeSimulation("100", "amount", [{ validatorId: "a", raw: "150" }]);
  assert.equal(r.status, "incomplete");
  assert.ok(r.rows[0].error);
  assert.equal(r.allocated, 0);
});

test("percent mode math", () => {
  const r = computeSimulation("2000", "percent", [
    { validatorId: "a", raw: "25" },
    { validatorId: "b", raw: "75" },
  ]);
  assert.equal(r.status, "complete");
  assert.equal(r.rows[0].amount, 500);
  assert.equal(r.rows[1].amount, 1500);
  const bad = computeSimulation("2000", "percent", [{ validatorId: "a", raw: "101" }]);
  assert.ok(bad.rows[0].error);
});

test("empty and missing-value rows are flagged", () => {
  assert.equal(computeSimulation("", "amount", []).status, "no-total");
  assert.equal(computeSimulation("100", "amount", []).status, "empty");
  const r = computeSimulation("100", "amount", [{ validatorId: "a", raw: "" }]);
  assert.equal(r.status, "incomplete");
});

test("evenSplit sums exactly", () => {
  const pct = evenSplit(3, 1000, "percent").map(Number);
  assert.equal(Math.round(pct.reduce((a, b) => a + b, 0) * 1e6) / 1e6, 100);
  const amt = evenSplit(3, 1000, "amount").map(Number);
  assert.equal(Math.round(amt.reduce((a, b) => a + b, 0) * 1e6) / 1e6, 1000);
  const r = computeSimulation("1000", "amount", evenSplit(3, 1000, "amount").map((raw, i) => ({ validatorId: String(i), raw })));
  assert.equal(r.status, "complete");
});

test("convertRaw keeps meaning", () => {
  assert.equal(convertRaw("25", "percent", "amount", 1000), "250");
  assert.equal(convertRaw("250", "amount", "percent", 1000), "25");
});

test("concentration", () => {
  assert.deepEqual(concentration([100]), { largest: 100, effectiveCount: 1 });
  assert.deepEqual(concentration([50, 50]), { largest: 50, effectiveCount: 2 });
});

test("rewards are not estimated without verified parameters", () => {
  const r = estimateRewards({ verified: false }, 1000);
  assert.equal(r.available, false);
  assert.ok(r.missing.length > 0);
  const r2 = estimateRewards({ verified: true, annualRewardPercent: 10, validatorCommissionPercent: 10 }, 1000);
  assert.equal(r2.available, true);
  assert.equal(r2.annualNet, 90);
});
