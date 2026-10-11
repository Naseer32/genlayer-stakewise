import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ValidatorDataset, ValidatorStatus } from "../types/staking";
import { fetchLiveDataset, type NetworkKey } from "../services/liveNetworks";
import { networkConfig } from "../services/networkConfig";
import { fetchSnapshotText, snapshotErrorMessage } from "../services/networkService";
import {
  clearCachedDataset,
  datasetFromText,
  demoDataset,
  unavailableDataset,
  loadCachedDataset,
  saveCachedDataset,
} from "../services/validatorService";

interface ImportOutcome {
  ok: boolean;
  message: string;
  warnings: string[];
}

interface ValidatorsContextValue {
  dataset: ValidatorDataset;
  loading: boolean;
  error: string | null;
  canRefresh: boolean;
  networkKey: NetworkKey | null;
  loadLive: (key: NetworkKey) => Promise<void>;
  loadDemo: () => void;
  importText: (text: string, statusHint: ValidatorStatus) => ImportOutcome;
  clearImported: () => void;
  refresh: () => Promise<void>;
}

const NET_KEY = "stakewise.network.v1";
let autoLoaded = false;

function rememberNetwork(key: NetworkKey): void {
  try {
    localStorage.setItem(NET_KEY, key);
  } catch {
    /* storage can be blocked; the app still works */
  }
}

function forgetNetwork(): void {
  try {
    localStorage.removeItem(NET_KEY);
  } catch {
    /* ignore */
  }
}

function storedNetwork(): NetworkKey | null {
  try {
    const v = localStorage.getItem(NET_KEY);
    return v === "bradbury" || v === "studio" ? v : null;
  } catch {
    return null;
  }
}

const Ctx = createContext<ValidatorsContextValue | null>(null);

export function ValidatorsProvider({ children }: { children: ReactNode }) {
  const [dataset, setDataset] = useState<ValidatorDataset>(() => loadCachedDataset() ?? unavailableDataset("Reading validators from the network…"));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [networkKey, setNetworkKey] = useState<NetworkKey | null>(null);

  const snapshotUrl = networkConfig.snapshotUrl;

  const refresh = useCallback(async () => {
    if (!snapshotUrl) return;
    setLoading(true);
    setError(null);
    try {
      const text = await fetchSnapshotText(snapshotUrl);
      let host = snapshotUrl;
      try {
        host = new URL(snapshotUrl).host;
      } catch {
        /* keep raw url */
      }
      const { dataset: next } = datasetFromText(text, "unknown", `Snapshot from ${host}`);
      saveCachedDataset(next);
      setDataset(next);
      setNetworkKey(null);
      forgetNetwork();
    } catch (err) {
      setError(
        `Could not load the validator snapshot. ${err instanceof Error && err.message ? err.message : snapshotErrorMessage(err)}`,
      );
    } finally {
      setLoading(false);
    }
  }, [snapshotUrl]);

  useEffect(() => {
    if (snapshotUrl) void refresh();
  }, [snapshotUrl, refresh]);

  const loadLive = useCallback(async (key: NetworkKey) => {
    setLoading(true);
    setError(null);
    setNetworkKey(key);
    rememberNetwork(key);
    try {
      const next = await fetchLiveDataset(key);
      if (next.source === "live") saveCachedDataset(next);
      setDataset(next);
    } catch (err) {
      const detail = err instanceof Error && err.message ? err.message : "Unknown error.";
      setDataset((d) => (d.source === "unavailable" ? unavailableDataset("Could not read validators from the network.") : d));
      setError(`Could not read validators from the network. ${detail}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoaded || snapshotUrl) return;
    autoLoaded = true;
    const saved = storedNetwork();
    void loadLive(saved ?? "bradbury");
  }, [loadLive, snapshotUrl]);

  const importText = useCallback((text: string, statusHint: ValidatorStatus): ImportOutcome => {
    try {
      const { dataset: next, warnings } = datasetFromText(text, statusHint, "Data pasted by you");
      saveCachedDataset(next);
      setDataset(next);
      setNetworkKey(null);
      forgetNetwork();
      setError(null);
      return { ok: true, message: `Imported ${next.validators.length} validator(s).`, warnings };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "Could not read that data.", warnings: [] };
    }
  }, []);

  const loadDemo = useCallback(() => {
    setDataset(demoDataset());
    setNetworkKey(null);
      forgetNetwork();
    setError(null);
  }, []);

  const clearImported = useCallback(() => {
    clearCachedDataset();
    setDataset(demoDataset());
    setNetworkKey(null);
      forgetNetwork();
    setError(null);
  }, []);

  const value = useMemo<ValidatorsContextValue>(
    () => ({
      dataset,
      loading,
      error,
      canRefresh: Boolean(snapshotUrl),
      networkKey,
      loadLive,
      loadDemo,
      importText,
      clearImported,
      refresh,
    }),
    [dataset, loading, error, snapshotUrl, networkKey, loadLive, loadDemo, importText, clearImported, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useValidators(): ValidatorsContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useValidators must be used inside ValidatorsProvider");
  return v;
}
