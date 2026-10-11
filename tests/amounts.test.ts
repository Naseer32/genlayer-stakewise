import { test } from "node:test";
import assert from "node:assert/strict";
import { genToWei, weiToGenString } from "../src/services/amounts.ts";

test("genToWei converts exactly", () => {
  assert.equal(genToWei("42"), 42000000000000000000n);
  assert.equal(genToWei("1.5"), 1500000000000000000n);
  assert.equal(genToWei("0.000000000000000001"), 1n);
  assert.equal(genToWei("1,000"), 1000000000000000000000n);
  assert.equal(genToWei(".5"), 500000000000000000n);
});

test("genToWei rejects bad input", () => {
  assert.equal(genToWei(""), null);
  assert.equal(genToWei("abc"), null);
  assert.equal(genToWei("-1"), null);
  assert.equal(genToWei("1e5"), null);
  assert.equal(genToWei("42gen"), null);
  assert.equal(genToWei("0.0000000000000000001"), null);
});

test("weiToGenString round-trips", () => {
  assert.equal(weiToGenString(42000000000000000000n), "42");
  assert.equal(weiToGenString(1500000000000000000n), "1.5");
  assert.equal(weiToGenString(1n), "0.000000000000000001");
  assert.equal(weiToGenString(0n), "0");
});
