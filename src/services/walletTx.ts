import { decodeErrorResult, encodeFunctionData, parseAbi, toHex } from "viem";
import { BRADBURY_CHAIN_ID } from "./wallet";

/**
 * Staking transactions signed by the user's WALLET (eth_sendTransaction).
 * genlayer-js 1.1.8 signs staking writes inside the SDK with a local key, which this app never uses.
 * Function and error signatures below come from the staking contract ABI shipped in genlayer-js 1.1.8.
 */
export const STAKING_ADDRESS = "0x4A4449E617F8D10FDeD0b461CadEf83939E821A5";

const STAKING_ABI = parseAbi([
  "function delegatorJoin(address _validator) payable",
  "function delegatorExit(address _validator, uint256 _amount)",
  "function delegatorClaim(address _delegator, address _validator)",
  "error DelegatorBelowMinimumStake()",
  "error DelegatorMayNotJoinTwoValidatorsSimultaneously()",
  "error DelegatorMayNotJoinWithZeroValue()",
  "error DelegatorExitExceedsShares()",
  "error DelegatorExitWouldBeBelowMinimum()",
  "error DelegatorMustExitAllWhenBelowMinimum()",
  "error ValidatorNotActive()",
  "error ValidatorNotJoined()",
]);

export type TxStatus = "success" | "reverted" | "pending";

export function encodeJoin(validator: string): `0x${string}` {
  return encodeFunctionData({ abi: STAKING_ABI, functionName: "delegatorJoin", args: [validator as `0x${string}`] });
}

export function encodeExit(validator: string, shares: bigint): `0x${string}` {
  return encodeFunctionData({ abi: STAKING_ABI, functionName: "delegatorExit", args: [validator as `0x${string}`, shares] });
}

export function encodeClaim(delegator: string, validator: string): `0x${string}` {
  return encodeFunctionData({
    abi: STAKING_ABI,
    functionName: "delegatorClaim",
    args: [delegator as `0x${string}`, validator as `0x${string}`],
  });
}

type Provider = NonNullable<typeof window.ethereum>;

function findRevertData(err: unknown): string | null {
  const isHex = (v: unknown): v is string => typeof v === "string" && /^0x[0-9a-fA-F]{8,}$/.test(v);
  let cur: unknown = err;
  for (let i = 0; i < 6 && cur; i++) {
    const e = cur as { data?: unknown; cause?: unknown };
    if (isHex(e.data)) return e.data;
    if (e.data && typeof e.data === "object") {
      const inner = (e.data as { data?: unknown }).data;
      if (isHex(inner)) return inner;
    }
    cur = e.cause;
  }
  return null;
}

/** Dry run with eth_call. Changes nothing. If the contract would reject it, we say why before asking for a signature. */
async function preflight(provider: Provider, tx: Record<string, string>): Promise<void> {
  try {
    await provider.request({ method: "eth_call", params: [tx, "latest"] });
  } catch (err) {
    const data = findRevertData(err);
    if (!data) return;
    let name: string | null = null;
    try {
      name = decodeErrorResult({ abi: STAKING_ABI, data: data as `0x${string}` }).errorName;
    } catch {
      name = null;
    }
    if (name) throw new Error(`Transaction would fail: ${name}`);
  }
}

async function waitForReceipt(provider: Provider, hash: string): Promise<TxStatus> {
  for (let i = 0; i < 45; i++) {
    try {
      const receipt = (await provider.request({ method: "eth_getTransactionReceipt", params: [hash] })) as
        | { status?: string }
        | null;
      if (receipt && receipt.status !== undefined) return receipt.status === "0x1" ? "success" : "reverted";
    } catch {
      /* keep polling */
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  return "pending";
}

/** The wallet shows the transaction and the user approves or rejects it. The app never holds a key. */
export async function sendStakingTx(params: {
  account: string;
  chainId: number | null;
  data: `0x${string}`;
  valueWei?: bigint;
}): Promise<{ transactionHash: string; status: TxStatus }> {
  if (params.chainId !== BRADBURY_CHAIN_ID) throw new Error("Switch your wallet to Bradbury testnet first.");
  const provider = typeof window !== "undefined" ? window.ethereum : undefined;
  if (!provider) throw new Error("No wallet found.");

  const tx: Record<string, string> = { from: params.account, to: STAKING_ADDRESS, data: params.data };
  if (params.valueWei !== undefined && params.valueWei > 0n) tx.value = toHex(params.valueWei);

  await preflight(provider, tx);
  const hash = (await provider.request({ method: "eth_sendTransaction", params: [tx] })) as string;
  const status = await waitForReceipt(provider, hash);
  return { transactionHash: hash, status };
}
