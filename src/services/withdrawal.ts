import { BRADBURY_CHAIN_ID } from "./wallet";
import { weiToGenString } from "./amounts";

type ClientConfig = NonNullable<Parameters<typeof import("genlayer-js").createClient>[0]>;

export interface PendingExit {
  epoch: bigint;
  stakeGen: string;
}

export interface Position {
  validator: string;
  shares: bigint;
  stakeGen: string;
  pending: PendingExit[];
}

export interface PositionsResult {
  positions: Position[];
  currentEpoch: bigint;
  failed: number;
}

async function loadSdk() {
  const [{ createClient }, { testnetBradbury }] = await Promise.all([
    import("genlayer-js"),
    import("genlayer-js/chains"),
  ]);
  return { createClient, testnetBradbury };
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

/**
 * Read-only. Looks through the given validators for any stake or pending withdrawal
 * belonging to this wallet. The contract allows one validator at a time, so at most one is expected.
 */
export async function readPositions(delegator: string, validators: string[]): Promise<PositionsResult> {
  const { createClient, testnetBradbury } = await loadSdk();
  const client = createClient({ chain: testnetBradbury });
  const epochInfo = await client.getEpochInfo();

  let failed = 0;
  const infos = await mapLimit(validators, 4, async (validator) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await client.getStakeInfo(delegator as `0x${string}`, validator as `0x${string}`);
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
      }
    }
    failed += 1;
    return null;
  });

  const positions: Position[] = [];
  infos.forEach((info, i) => {
    if (!info) return;
    if (info.shares > 0n || info.pendingWithdrawals.length > 0) {
      positions.push({
        validator: validators[i],
        shares: info.shares,
        stakeGen: info.stake,
        pending: info.pendingWithdrawals.map((w) => ({ epoch: w.epoch, stakeGen: w.stake })),
      });
    }
  });
  return { positions, currentEpoch: epochInfo.currentEpoch, failed };
}

async function writeClient(account: string, chainId: number | null) {
  if (chainId !== BRADBURY_CHAIN_ID) throw new Error("Switch your wallet to Bradbury testnet first.");
  const provider = typeof window !== "undefined" ? window.ethereum : undefined;
  if (!provider) throw new Error("No wallet found.");
  const { createClient, testnetBradbury } = await loadSdk();
  return createClient({
    chain: testnetBradbury,
    account: account as `0x${string}`,
    provider: provider as unknown as ClientConfig["provider"],
  });
}

/** Starts the withdrawal of ALL shares from one validator. Funds are claimable only after the waiting period. */
export async function exitAll(params: {
  validator: string;
  shares: bigint;
  account: string;
  chainId: number | null;
}): Promise<{ transactionHash: string }> {
  if (params.shares <= 0n) throw new Error("There is nothing to withdraw.");
  if (!/^0x[a-fA-F0-9]{40}$/.test(params.validator)) throw new Error("That is not a valid validator address.");
  const client = await writeClient(params.account, params.chainId);
  const result = await client.delegatorExit({
    validator: params.validator as `0x${string}`,
    shares: params.shares,
  });
  return { transactionHash: result.transactionHash };
}

/** Claims matured withdrawals. The contract decides whether the waiting period is over. */
export async function claimFunds(params: {
  validator: string;
  account: string;
  chainId: number | null;
}): Promise<{ transactionHash: string }> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(params.validator)) throw new Error("That is not a valid validator address.");
  const client = await writeClient(params.account, params.chainId);
  const result = await client.delegatorClaim({
    validator: params.validator as `0x${string}`,
    delegator: params.account as `0x${string}`,
  });
  return { transactionHash: result.transactionHash };
}

export { weiToGenString };
