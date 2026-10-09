import type { Validator, ValidatorStatus } from "../types/staking";

export interface ParseResult {
  validators: Validator[];
  warnings: string[];
}

const ADDRESS_FULL = /^0x[a-fA-F0-9]{40}$/;
const ADDRESS_ANY = /0x[a-fA-F0-9]{40}/g;

const ADDRESS_KEYS = ["address", "validator", "validatorAddress", "wallet", "walletAddress", "id"];
const NAME_KEYS = ["name", "moniker", "identity", "label"];
const TOTAL_KEYS = ["totalStake", "total_stake", "stake"];
const DELEGATED_KEYS = ["delegatedStake", "delegated_stake", "delegated", "totalDelegated"];
const POWER_KEYS = ["votingPower", "voting_power"];
const UPTIME_KEYS = ["uptime", "uptimePercent"];

const GROUP_KEYS: Record<string, ValidatorStatus | undefined> = {
  validators: undefined,
  items: undefined,
  activeValidators: "active",
  active_validators: "active",
  active: "active",
  quarantinedValidators: "quarantined",
  quarantined_validators: "quarantined",
  quarantined: "quarantined",
  bannedValidators: "banned",
  banned_validators: "banned",
  banned: "banned",
};

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  return undefined;
}

/** Plain numbers or numeric strings only. Values with units (e.g. "100gen" or wei) are rejected on purpose. */
function toNumber(v: unknown): number | undefined {
  if (typeof v === "number") return Number.isFinite(v) && v >= 0 ? v : undefined;
  if (typeof v === "string") {
    const t = v.trim().replace(/,/g, "");
    if (/^\d+(\.\d+)?$/.test(t)) return Number(t);
  }
  return undefined;
}

function toStatus(v: unknown, fallback: ValidatorStatus): ValidatorStatus {
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "active" || s === "quarantined" || s === "banned") return s;
  }
  return fallback;
}

function normalizeItem(
  item: unknown,
  index: number,
  fallbackStatus: ValidatorStatus,
  warnings: string[],
): Validator | null {
  if (typeof item === "string") {
    if (!ADDRESS_FULL.test(item.trim())) {
      warnings.push(`Skipped entry ${index + 1}: not a valid 0x address.`);
      return null;
    }
    const address = item.trim();
    return { id: address.toLowerCase(), address, status: fallbackStatus };
  }
  if (item && typeof item === "object") {
    const obj = item as Record<string, unknown>;
    const rawAddress = pick(obj, ADDRESS_KEYS);
    if (typeof rawAddress !== "string" || !ADDRESS_FULL.test(rawAddress.trim())) {
      warnings.push(`Skipped entry ${index + 1}: no valid 0x address found.`);
      return null;
    }
    const address = rawAddress.trim();
    const name = pick(obj, NAME_KEYS);
    const clampPercent = (n: number | undefined) => (n !== undefined && n <= 100 ? n : undefined);
    return {
      id: address.toLowerCase(),
      address,
      name: typeof name === "string" && name.trim() !== "" ? name.trim() : undefined,
      status: toStatus(obj.status, fallbackStatus),
      totalStake: toNumber(pick(obj, TOTAL_KEYS)),
      delegatedStake: toNumber(pick(obj, DELEGATED_KEYS)),
      votingPower: clampPercent(toNumber(pick(obj, POWER_KEYS))),
      uptime: clampPercent(toNumber(pick(obj, UPTIME_KEYS))),
    };
  }
  warnings.push(`Skipped entry ${index + 1}: unsupported format.`);
  return null;
}

function dedupe(list: Validator[], warnings: string[]): Validator[] {
  const seen = new Set<string>();
  const out: Validator[] = [];
  for (const v of list) {
    if (seen.has(v.id)) continue;
    seen.add(v.id);
    out.push(v);
  }
  if (out.length < list.length) warnings.push(`${list.length - out.length} duplicate address(es) ignored.`);
  return out;
}

/**
 * Parses validator data pasted by the user (or fetched from a configured snapshot URL).
 * Accepts: a JSON array, a JSON object with groups (validators / active / quarantined / banned),
 * or any text containing 0x addresses (for example CLI output).
 * Nothing is invented: any field that is missing stays undefined.
 */
export function parseValidatorInput(text: string, statusHint: ValidatorStatus = "unknown"): ParseResult {
  const trimmed = text.trim();
  if (trimmed === "") throw new Error("Paste validator data first.");

  const warnings: string[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    parsed = undefined;
  }

  if (parsed !== undefined && typeof parsed === "object" && parsed !== null) {
    const collected: Validator[] = [];
    if (Array.isArray(parsed)) {
      parsed.forEach((item, i) => {
        const v = normalizeItem(item, i, statusHint, warnings);
        if (v) collected.push(v);
      });
    } else {
      const obj = parsed as Record<string, unknown>;
      let foundGroup = false;
      for (const key of Object.keys(GROUP_KEYS)) {
        const group = obj[key];
        if (Array.isArray(group)) {
          foundGroup = true;
          const groupStatus = GROUP_KEYS[key] ?? statusHint;
          group.forEach((item, i) => {
            const v = normalizeItem(item, i, groupStatus, warnings);
            if (v) collected.push(v);
          });
        }
      }
      if (!foundGroup) {
        throw new Error("The JSON has no validator list. Use an array, or an object with a validators / active / quarantined / banned array.");
      }
    }
    const validators = dedupe(collected, warnings);
    if (validators.length === 0) throw new Error("No valid validators were found in the data.");
    return { validators, warnings };
  }

  const matches = Array.from(new Set(trimmed.match(ADDRESS_ANY) ?? []));
  if (matches.length === 0) throw new Error("No JSON or 0x validator addresses were found in the text.");
  warnings.push("Plain address list: names, stake, voting power and performance are not available for these validators.");
  const validators = dedupe(
    matches.map((address) => ({ id: address.toLowerCase(), address, status: statusHint })),
    warnings,
  );
  return { validators, warnings };
}
