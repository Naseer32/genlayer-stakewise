/**
 * Read-only access to the StakeWise Advisor Intelligent Contract on Bradbury.
 * No wallet, no account and no gas are involved: it only calls view methods.
 */
export const ADVISOR_ADDRESS = "0x2F0aA208f5767be28CBd62C7BA50ddEa36715D84";
export const ADVISOR_EXPLORER_URL = `https://explorer-bradbury.genlayer.com/address/${ADVISOR_ADDRESS}`;

export interface AdvisorPlan {
  name: string;
  allocations: { validator: string; bps: number }[];
  metrics: { validators: number; largest_bps: number; effective_x100: number; risk: string };
}

export interface AdvisorAnalysis {
  risk: string;
  validators: number;
  largest_bps: number;
  effective_x100: number;
  summary: string;
  suggestion: string;
}

export type AdvisorLookup =
  | { found: false; planCount: number }
  | { found: true; planCount: number; plan: AdvisorPlan; analysis: AdvisorAnalysis | null };

async function getClient() {
  const [{ createClient }, { testnetBradbury }] = await Promise.all([
    import("genlayer-js"),
    import("genlayer-js/chains"),
  ]);
  return createClient({ chain: testnetBradbury });
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

export async function lookupAdvisor(owner: string): Promise<AdvisorLookup> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(owner)) throw new Error("Enter a full wallet address that starts with 0x.");
  const client = await getClient();
  const address = ADVISOR_ADDRESS as `0x${string}`;

  const countRaw = await client.readContract({ address, functionName: "get_plan_count", args: [] });
  const planCount = Number(countRaw);

  const has = await client.readContract({ address, functionName: "has_plan", args: [owner] });
  if (has !== true) return { found: false, planCount };

  const plan = JSON.parse(asText(await client.readContract({ address, functionName: "get_plan", args: [owner] }))) as AdvisorPlan;

  let analysis: AdvisorAnalysis | null = null;
  try {
    analysis = JSON.parse(asText(await client.readContract({ address, functionName: "get_analysis", args: [owner] }))) as AdvisorAnalysis;
  } catch {
    analysis = null; // no analysis saved yet for this plan
  }
  return { found: true, planCount, plan, analysis };
}
