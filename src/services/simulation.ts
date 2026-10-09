import type {
  AllocationMode,
  AllocationRow,
  ComputedRow,
  ProtocolParams,
  RewardEstimate,
  Scenario,
  SimulationResult,
  SimulationStatus,
} from "../types/staking";

/** Amounts within this distance (in GEN) are treated as equal. */
const TOLERANCE = 1e-6;
export const MAX_TOTAL = 1e12;

export function roundTo(n: number, digits = 6): number {
  const f = 10 ** digits;
  return Math.round((n + Number.EPSILON) * f) / f;
}

/** Strict decimal parser. Accepts "1000", "1,000.5", ".5"; rejects everything else. */
export function parseNumber(input: string): number | null {
  const cleaned = input.trim().replace(/,/g, "");
  if (!/^(\d+\.?\d*|\.\d+)$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function parseTotal(input: string): { value: number | null; error: string | null } {
  if (input.trim() === "") {
    return { value: null, error: "Enter the hypothetical amount of GEN to simulate." };
  }
  const n = parseNumber(input);
  if (n === null) {
    return { value: null, error: "Use digits only, for example 1000 or 2500.5." };
  }
  if (n <= 0) return { value: null, error: "The amount must be greater than 0." };
  if (n > MAX_TOTAL) return { value: null, error: "That amount is too large to simulate." };
  return { value: n, error: null };
}

export function computeSimulation(
  totalInput: string,
  mode: AllocationMode,
  rows: AllocationRow[],
): SimulationResult {
  const { value: total, error: totalError } = parseTotal(totalInput);

  const computed: ComputedRow[] = rows.map((row) => {
    const base = { validatorId: row.validatorId, raw: row.raw };
    if (total === null) return { ...base, amount: null, percent: null, error: null };

    const trimmed = row.raw.trim();
    if (trimmed === "") return { ...base, amount: null, percent: null, error: "Enter a value." };

    const n = parseNumber(trimmed);
    if (n === null) {
      return {
        ...base,
        amount: null,
        percent: null,
        error: mode === "percent" ? "Enter a percentage such as 25 or 12.5." : "Enter an amount such as 250 or 12.5.",
      };
    }
    if (n <= 0) return { ...base, amount: null, percent: null, error: "Must be greater than 0." };

    if (mode === "percent") {
      if (n > 100) {
        return { ...base, amount: null, percent: null, error: "One allocation cannot exceed 100%." };
      }
      return { ...base, amount: roundTo(total * (n / 100)), percent: n, error: null };
    }

    if (n > total + TOLERANCE) {
      return {
        ...base,
        amount: null,
        percent: null,
        error: `Cannot exceed the total of ${total} GEN.`,
      };
    }
    return { ...base, amount: n, percent: roundTo((n / total) * 100, 4), error: null };
  });

  const allocated = roundTo(computed.reduce((sum, r) => sum + (r.amount ?? 0), 0));
  const remaining = total === null ? null : roundTo(total - allocated);
  const allocatedPercent = total === null ? 0 : roundTo((allocated / total) * 100, 4);

  let status: SimulationStatus;
  if (total === null) status = "no-total";
  else if (computed.length === 0) status = "empty";
  else if (allocated > total + TOLERANCE) status = "over";
  else if (computed.some((r) => r.error !== null)) status = "incomplete";
  else if (remaining !== null && remaining > TOLERANCE) status = "partial";
  else status = "complete";

  return {
    total,
    totalError,
    rows: computed,
    allocated,
    remaining: remaining !== null && Math.abs(remaining) < TOLERANCE ? 0 : remaining,
    allocatedPercent,
    status,
  };
}

/** Split `count` allocations evenly. The last entry absorbs rounding so the sum is exact. */
export function evenSplit(count: number, total: number | null, mode: AllocationMode): string[] {
  if (count <= 0) return [];
  const whole = mode === "percent" ? 100 : total;
  if (whole === null) return Array(count).fill("");
  const base = roundTo(whole / count, 4);
  const out: string[] = [];
  for (let i = 0; i < count - 1; i++) out.push(String(base));
  out.push(String(roundTo(whole - base * (count - 1), 4)));
  return out;
}

/** Convert a raw input between amount and percent so the economic meaning is preserved. */
export function convertRaw(
  raw: string,
  from: AllocationMode,
  to: AllocationMode,
  total: number | null,
): string {
  if (from === to) return raw;
  if (total === null) return "";
  const n = parseNumber(raw);
  if (n === null) return raw;
  return from === "percent"
    ? String(roundTo((total * n) / 100, 4))
    : String(roundTo((n / total) * 100, 4));
}

/**
 * Concentration metrics for a set of shares.
 * effectiveCount = 1 / sum(p^2): how many equally-weighted validators the spread is equivalent to.
 */
export function concentration(percents: number[]): { largest: number; effectiveCount: number } {
  const sum = percents.reduce((a, b) => a + b, 0);
  if (sum <= 0) return { largest: 0, effectiveCount: 0 };
  const p = percents.map((x) => x / sum);
  const hhi = p.reduce((a, x) => a + x * x, 0);
  return { largest: roundTo(Math.max(...p) * 100, 2), effectiveCount: roundTo(1 / hhi, 2) };
}

export function buildScenario(
  key: string,
  label: string,
  description: string,
  total: number,
  items: { validatorId: string; percent: number }[],
): Scenario {
  const c = concentration(items.map((i) => i.percent));
  return {
    key,
    label,
    description,
    shares: items.map((i) => ({
      validatorId: i.validatorId,
      percent: roundTo(i.percent, 4),
      amount: roundTo((total * i.percent) / 100),
    })),
    largestSharePercent: c.largest,
    effectiveCount: c.effectiveCount,
  };
}

/**
 * Rewards are NEVER estimated from assumptions. An estimate is produced only when the operator
 * marked the protocol parameters as verified and both reward rate and commission are known.
 */
export function estimateRewards(params: ProtocolParams, allocated: number): RewardEstimate {
  const missing: string[] = [];
  if (!params.verified) missing.push("Protocol parameters are not marked as verified");
  if (params.annualRewardPercent === undefined) missing.push("Verified annual reward rate");
  if (params.validatorCommissionPercent === undefined) missing.push("Verified validator commission");
  missing.push("Validator uptime and penalty history over time (not available in this app)");

  const enough =
    params.verified &&
    params.annualRewardPercent !== undefined &&
    params.validatorCommissionPercent !== undefined;

  if (!enough) return { available: false, missing };

  const gross = allocated * (params.annualRewardPercent! / 100);
  const net = gross * (1 - params.validatorCommissionPercent! / 100);
  return {
    available: true,
    missing: [missing[missing.length - 1]],
    annualGross: roundTo(gross, 4),
    annualNet: roundTo(net, 4),
  };
}
