import type { NetworkConfig, NetworkStatusInfo } from "../types/staking";

const TIMEOUT_MS = 8000;

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function describeError(err: unknown): string {
  if (err instanceof DOMException && err.name === "AbortError") {
    return `No response within ${TIMEOUT_MS / 1000} seconds.`;
  }
  if (err instanceof TypeError) return "The endpoint could not be reached (offline, wrong URL, or blocked by CORS).";
  return err instanceof Error ? err.message : "Unknown error.";
}

/**
 * Read-only connection check. Sends a single `eth_chainId` request, which cannot change any state.
 * A successful check says the endpoint answers; it does NOT mean validator data is live.
 */
export async function checkNetwork(config: NetworkConfig): Promise<NetworkStatusInfo> {
  const checkedAt = new Date().toISOString();
  if (!config.rpcUrl) {
    return {
      state: "unconfigured",
      message:
        "No RPC endpoint is configured. Set VITE_GENLAYER_RPC_URL after verifying it in the official GenLayer documentation.",
      checkedAt,
    };
  }
  try {
    const res = await fetchWithTimeout(config.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
    });
    if (!res.ok) {
      return { state: "unreachable", message: `The endpoint answered with HTTP ${res.status}.`, checkedAt };
    }
    const json = (await res.json()) as { result?: unknown };
    if (typeof json.result !== "string" || !/^0x[0-9a-fA-F]+$/.test(json.result)) {
      return { state: "unreachable", message: "The endpoint did not return a valid chain ID.", checkedAt };
    }
    const chainId = parseInt(json.result, 16);
    if (config.expectedChainId !== undefined && chainId !== config.expectedChainId) {
      return {
        state: "mismatch",
        chainId,
        message: `Chain ID ${chainId} does not match the expected ${config.expectedChainId}. Do not trust data from this endpoint.`,
        checkedAt,
      };
    }
    return {
      state: "connected",
      chainId,
      message:
        config.expectedChainId === undefined
          ? "The endpoint answered, but its chain ID is not verified because VITE_GENLAYER_CHAIN_ID is not set."
          : "The endpoint answered and its chain ID matches the configured value.",
      checkedAt,
    };
  } catch (err) {
    return { state: "unreachable", message: describeError(err), checkedAt };
  }
}

/** Downloads a JSON snapshot of validators from an operator-configured URL. Parsing happens elsewhere. */
export async function fetchSnapshotText(url: string): Promise<string> {
  const res = await fetchWithTimeout(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`The snapshot URL answered with HTTP ${res.status}.`);
  return res.text();
}

export function snapshotErrorMessage(err: unknown): string {
  return describeError(err);
}
