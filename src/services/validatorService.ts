import type {
  DataSource,
  Validator,
  ValidatorDataset,
  ValidatorStatus,
} from "../types/staking";
import { createDemoDataset } from "./demoData.ts";
import { parseValidatorInput } from "./validatorParser.ts";

const CACHE_KEY = "stakewise.dataset.v1";

export function unavailableDataset(message: string): ValidatorDataset {
  return {
    source: "unavailable",
    sourceLabel: "No validator data",
    validators: [],
    note: message,
  };
}

export function demoDataset(): ValidatorDataset {
  return createDemoDataset();
}

/** Builds a dataset from pasted or downloaded text. `origin` says where the text came from. */
export function datasetFromText(
  text: string,
  statusHint: ValidatorStatus,
  origin: string,
): { dataset: ValidatorDataset; warnings: string[] } {
  const { validators, warnings } = parseValidatorInput(text, statusHint);
  return {
    dataset: {
      source: "imported",
      sourceLabel: origin,
      validators,
      lastUpdated: new Date().toISOString(),
    },
    warnings,
  };
}

/* ---------- local cache (browser only, never contains secrets) ---------- */

interface CachedPayload {
  validators: Validator[];
  sourceLabel: string;
  savedAt: string;
}

export function saveCachedDataset(dataset: ValidatorDataset): void {
  if (dataset.source !== "imported" && dataset.source !== "live") return;
  try {
    const payload: CachedPayload = {
      validators: dataset.validators,
      sourceLabel: dataset.sourceLabel,
      savedAt: dataset.lastUpdated ?? new Date().toISOString(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* storage can be blocked; the app works without it */
  }
}

export function loadCachedDataset(): ValidatorDataset | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw) as CachedPayload;
    if (!Array.isArray(payload.validators) || payload.validators.length === 0) return null;
    return {
      source: "cached",
      sourceLabel: `${payload.sourceLabel} (saved in this browser)`,
      validators: payload.validators,
      lastUpdated: payload.savedAt,
      note: "Cached data may be out of date. Import again to refresh it.",
    };
  } catch {
    return null;
  }
}

export function clearCachedDataset(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

/* ---------- queries used by the pages ---------- */

export interface StatusCounts {
  total: number;
  active: number;
  quarantined: number;
  banned: number;
  unknown: number;
  /** False when the data source gave no status for any validator. */
  statusSupported: boolean;
}

export function countByStatus(validators: Validator[]): StatusCounts {
  const counts = { total: validators.length, active: 0, quarantined: 0, banned: 0, unknown: 0 };
  for (const v of validators) counts[v.status] += 1;
  return { ...counts, statusSupported: validators.length > 0 && counts.unknown < validators.length };
}

export type SortKey = "stake-desc" | "stake-asc" | "name" | "power-desc";
export type StatusFilter = "all" | ValidatorStatus;

export function displayName(v: Validator): string {
  return v.name ?? `Unnamed validator`;
}

export function filterValidators(
  list: Validator[],
  query: string,
  status: StatusFilter,
  sort: SortKey,
): Validator[] {
  const q = query.trim().toLowerCase();
  const filtered = list.filter((v) => {
    if (status !== "all" && v.status !== status) return false;
    if (q === "") return true;
    return (v.name ?? "").toLowerCase().includes(q) || v.address.toLowerCase().includes(q);
  });
  const num = (n: number | undefined, missing: number) => (n === undefined ? missing : n);
  const sorted = [...filtered];
  switch (sort) {
    case "stake-desc":
      sorted.sort((a, b) => num(b.totalStake, -1) - num(a.totalStake, -1));
      break;
    case "stake-asc":
      sorted.sort((a, b) => num(a.totalStake, Infinity) - num(b.totalStake, Infinity));
      break;
    case "power-desc":
      sorted.sort((a, b) => num(b.votingPower, -1) - num(a.votingPower, -1));
      break;
    case "name":
      sorted.sort((a, b) => (a.name ?? "\uffff" + a.address).localeCompare(b.name ?? "\uffff" + b.address));
      break;
  }
  return sorted;
}

/** Validators suggested for comparison examples when the user has not allocated to 2+ yet. */
export function suggestComparisonPool(validators: Validator[], size = 3): Validator[] {
  return validators
    .filter((v) => v.status === "active" || v.status === "unknown")
    .sort((a, b) => (b.totalStake ?? -1) - (a.totalStake ?? -1))
    .slice(0, size);
}

export const SOURCE_LABELS: Record<DataSource, string> = {
  live: "Live",
  cached: "Cached",
  imported: "Imported",
  demo: "Demo data",
  unavailable: "Unavailable",
};
