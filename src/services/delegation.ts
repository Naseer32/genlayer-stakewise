import { BRADBURY_CHAIN_ID } from "./wallet";
import { encodeJoin, sendStakingTx } from "./walletTx";
import { weiToGenString } from "./amounts";

type ClientConfig = NonNullable<Parameters<typeof import("genlayer-js").createClient>[0]>;

export interface DelegationRules {
  minDelegationWei: bigint;
  minDelegationGen: string;
}

export interface DelegationReceipt {
  transactionHash: string;
  amountGen: string;
}

/** Read-only. Reads the minimum delegation from the staking contract via genlayer-js. */
export async function readDelegationRules(): Promise<DelegationRules> {
  const [{ createClient }, { testnetBradbury }] = await Promise.all([
    import("genlayer-js"),
    import("genlayer-js/chains"),
  ]);
  const client = createClient({ chain: testnetBradbury });
  const info = await client.getEpochInfo();
  return {
    minDelegationWei: info.delegatorMinStakeRaw,
    minDelegationGen: info.delegatorMinStake,
  };
}

/** Turns contract and wallet errors into plain language. */
export function delegationErrorMessage(err: unknown): string {
  const parts: string[] = [];
  let cur: unknown = err;
  for (let i = 0; i < 6 && cur; i++) {
    const e = cur as { message?: string; shortMessage?: string; code?: number; data?: { errorName?: string }; cause?: unknown };
    if (e.code === 4001) return "You rejected the request in your wallet. Nothing was sent.";
    if (e.shortMessage) parts.push(e.shortMessage);
    if (e.message) parts.push(e.message);
    if (e.data?.errorName) parts.push(e.data.errorName);
    cur = e.cause;
  }
  const text = parts.join(" ");
  if (text.includes("DelegatorBelowMinimumStake")) return "The amount is below the minimum delegation set by the staking contract.";
  if (text.includes("DelegatorMayNotJoinTwoValidatorsSimultaneously")) {
    return "This wallet already delegates to a different validator. The contract allows only one validator at a time.";
  }
  if (text.includes("DelegatorMayNotJoinWithZeroValue")) return "The amount cannot be zero.";
  if (text.includes("ValidatorNotActive")) return "This validator is not active, so it cannot receive delegations.";
  if (text.includes("ValidatorNotJoined")) return "This validator is not registered in the staking contract.";
  if (/insufficient funds|exceeds the balance|insufficient balance/i.test(text)) {
    return "Your wallet does not have enough test GEN for this amount plus network fees.";
  }
  return parts[0] ? parts[0] : "The delegation failed for an unknown reason. Nothing was confirmed.";
}

/**
 * Sends a delegation through the user's wallet. The wallet shows the transaction and the user approves it.
 * The amount is always a bigint in wei. The app never holds a private key.
 */
export async function delegateTo(params: {
  validator: string;
  amountWei: bigint;
  account: string;
  chainId: number | null;
}): Promise<DelegationReceipt> {
  if (params.chainId !== BRADBURY_CHAIN_ID) {
    throw new Error("Switch your wallet to Bradbury testnet first.");
  }
  if (params.amountWei <= 0n) throw new Error("The amount must be greater than zero.");
  if (!/^0x[a-fA-F0-9]{40}$/.test(params.validator)) throw new Error("That is not a valid validator address.");
  const out = await sendStakingTx({
    account: params.account,
    chainId: params.chainId,
    data: encodeJoin(params.validator),
    valueWei: params.amountWei,
  });
  if (out.status === "reverted") {
    throw new Error("The transaction was confirmed on the network but failed. Nothing was delegated.");
  }
  return {
    transactionHash: out.transactionHash,
    amountGen: weiToGenString(params.amountWei),
  };
}
