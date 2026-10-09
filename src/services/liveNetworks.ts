import type { NetworkConfig, Validator, ValidatorDataset, ValidatorStatus } from "../types/staking";

export type NetworkKey = "bradbury" | "studio";

export interface LiveNetwork {
  key: NetworkKey;
  label: string;
  chainId: number;
  rpcUrl: string;
  stakingAddress?: string;
  stakingSupported: boolean;
  note: string;
}

/**
 * Values confirmed on the operator's device:
 * - Bradbury: `genlayer network info` (CLI 0.39.2) and genlayer-js 1.1.8 chain preset.
 * - Studio: genlayer-js 1.1.8 chain preset. The official CLI documents that staking is
 *   not available on localnet/studio, so no staking data is read there.
 */
export const LIVE_NETWORKS: Record<NetworkKey, LiveNetwork> = {
  bradbury: {
    key: "bradbury",
    label: "GenLayer Bradbury Testnet",
    chainId: 4221,
    rpcUrl: "https://rpc-bradbury.genlayer.com",
    stakingAddress: "0x4A4449E617F8D10FDeD0b461CadEf83939E821A5",
    stakingSupported: true,
    note: "Reads the active and quarantined validator lists and each validator's info directly from the staking contract. Read-only.",
  },
  studio: {
    key: "studio",
    label: "GenLayer Studio",
    chainId: 61999,
    rpcUrl: "https://studio.genlayer.com/api",
    stakingSupported: false,
    note: "Studio has no staking: the official GenLayer CLI states staking is not available on localnet/studio. Its internal validators are not production staking validators, so none are shown.",
  },
};

export function toNetworkConfig(n: LiveNetwork): NetworkConfig {
  return {
    id: n.key,
    label: n.label,
    rpcUrl: n.rpcUrl,
    expectedChainId: n.chainId,
    stakingAddress: n.stakingAddress,
    snapshotUrl: undefined,
    verified: true,
  };
}

const ONE_GEN = 10n ** 18n;

function rawToGen(raw: bigint): number {
  return Number(raw / ONE_GEN) + Number(raw % ONE_GEN) / 1e18;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

interface QuarantineEntry {
  permanentlyBanned: boolean;
}

/** Read-only. Never sends a transaction and never needs an account. */
export async function fetchLiveDataset(key: NetworkKey): Promise<ValidatorDataset> {
  const net = LIVE_NETWORKS[key];

  if (!net.stakingSupported) {
    return {
      source: "unavailable",
      sourceLabel: `${net.label}: no staking data`,
      validators: [],
      note: net.note,
    };
  }

  const [{ createClient }, { testnetBradbury }] = await Promise.all([
    import("genlayer-js"),
    import("genlayer-js/chains"),
  ]);
  const client = createClient({ chain: testnetBradbury });

  const activeList = await client.getActiveValidators();

  /* Quarantine list (same contract call the official CLI uses). */
  const quarantine = new Map<string, QuarantineEntry>();
  let quarantineKnown = true;
  try {
    const contract = client.getStakingContract();
    const pageSize = 100n;
    let start = 0n;
    for (let page = 0; page < 10; page++) {
      const chunk = await contract.read.getAllQuarantinedValidators([start, pageSize]);
      for (const q of chunk) {
        quarantine.set(String(q.validator).toLowerCase(), { permanentlyBanned: q.permanentlyBanned });
      }
      if (chunk.length < Number(pageSize)) break;
      start += pageSize;
    }
  } catch {
    quarantineKnown = false;
  }

  /* Union of active validators and any quarantined ones that are not in the active list. */
  const seen = new Set<string>();
  const addresses: string[] = [];
  for (const a of activeList) {
    const k = String(a).toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      addresses.push(String(a));
    }
  }
  const activeIds = new Set(seen);
  for (const k of quarantine.keys()) {
    if (!seen.has(k)) {
      seen.add(k);
      addresses.push(k);
    }
  }

  const infos = await mapLimit(addresses, 5, async (address) => {
    try {
      return await client.getValidatorInfo(address as `0x${string}`);
    } catch {
      return null;
    }
  });

  let failed = 0;
  const validators: Validator[] = addresses.map((address, i) => {
    const info = infos[i];
    const id = address.toLowerCase();
    const q = quarantine.get(id);

    let status: ValidatorStatus;
    if (q?.permanentlyBanned) status = "banned";
    else if (q) status = "quarantined";
    else if (info?.banned) status = "banned";
    else if (!quarantineKnown) status = "unknown";
    else status = activeIds.has(id) ? "active" : "unknown";

    if (!info) {
      failed += 1;
      return { id, address, status };
    }
    const moniker = info.identity?.moniker?.trim();
    return {
      id,
      address,
      name: moniker ? moniker : undefined,
      status,
      totalStake: rawToGen(info.vStakeRaw + info.dStakeRaw),
      delegatedStake: rawToGen(info.dStakeRaw),
    };
  });

  const notes = ["Voting power and uptime are not provided by this adapter."];
  if (!quarantineKnown) notes.unshift("The quarantine list could not be read, so statuses are shown as unknown.");
  if (failed > 0) notes.unshift(`${failed} validator(s) could not have their details read.`);

  return {
    source: "live",
    sourceLabel: `${net.label}, read on-chain`,
    validators,
    lastUpdated: new Date().toISOString(),
    note: notes.join(" "),
  };
}
