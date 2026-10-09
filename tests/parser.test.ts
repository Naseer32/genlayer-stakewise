import { test } from "node:test";
import assert from "node:assert/strict";
import { parseValidatorInput } from "../src/services/validatorParser.ts";
import { countByStatus, filterValidators } from "../src/services/validatorService.ts";

const A = "0x" + "a".repeat(40);
const B = "0x" + "B".repeat(40);

test("parses JSON array with partial fields", () => {
  const { validators } = parseValidatorInput(JSON.stringify([{ address: A, name: "One", totalStake: "1,200.5", status: "Active" }, { validator: B }]));
  assert.equal(validators.length, 2);
  assert.equal(validators[0].totalStake, 1200.5);
  assert.equal(validators[0].status, "active");
  assert.equal(validators[1].totalStake, undefined);
  assert.equal(validators[1].status, "unknown");
});

test("parses grouped object with statuses", () => {
  const { validators } = parseValidatorInput(JSON.stringify({ active: [A], banned: [B] }));
  assert.equal(validators.find((v) => v.address === A)?.status, "active");
  assert.equal(validators.find((v) => v.address === B)?.status, "banned");
});

test("extracts addresses from plain text and dedupes", () => {
  const { validators, warnings } = parseValidatorInput(`validators: [\n ${A},\n ${A}\n]`, "active");
  assert.equal(validators.length, 1);
  assert.equal(validators[0].status, "active");
  assert.ok(warnings.length > 0);
});

test("rejects empty and junk input", () => {
  assert.throws(() => parseValidatorInput("   "));
  assert.throws(() => parseValidatorInput("hello world"));
  assert.throws(() => parseValidatorInput("{\"foo\": 1}"));
});

test("rejects stake values with units or negatives", () => {
  const { validators } = parseValidatorInput(JSON.stringify([{ address: A, totalStake: "100gen", votingPower: 250, uptime: -1 }]));
  assert.equal(validators[0].totalStake, undefined);
  assert.equal(validators[0].votingPower, undefined);
  assert.equal(validators[0].uptime, undefined);
});

test("counts and filters", () => {
  const { validators } = parseValidatorInput(JSON.stringify([{ address: A, name: "Alpha", status: "active", totalStake: 5 }, { address: B, name: "Beta", status: "banned", totalStake: 9 }]));
  const c = countByStatus(validators);
  assert.equal(c.active, 1);
  assert.equal(c.banned, 1);
  assert.equal(c.statusSupported, true);
  assert.equal(filterValidators(validators, "alp", "all", "stake-desc").length, 1);
  assert.equal(filterValidators(validators, "", "banned", "stake-desc")[0].name, "Beta");
  assert.equal(filterValidators(validators, "", "all", "stake-desc")[0].name, "Beta");
  assert.equal(countByStatus([]).statusSupported, false);
});
