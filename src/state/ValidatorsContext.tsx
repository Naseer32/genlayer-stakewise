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

const Ctx = createContext<ValidatorsContextValue | null>(null);

export function ValidatorsProvider({ children }: { children: ReactNode }) {
  const [dataset, setDataset] = useState<ValidatorDataset>(() => loadCachedDataset() ?? demoDataset());
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
    try {
      const next = await fetchLiveDataset(key);
      if (next.source === "live") saveCachedDataset(next);
      setDataset(next);
    } catch (err) {
      const detail = err instanceof Error && err.message ? err.message : "Unknown error.";
      setError(`Could not read validators from the network. ${detail}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const importText = useCallback((text: string, statusHint: ValidatorStatus): ImportOutcome => {
    try {
      const { dataset: next, warnings } = datasetFromText(text, statusHint, "Data pasted by you");
      saveCachedDataset(next);
      setDataset(next);
      setNetworkKey(null);
      setError(null);
      return { ok: true, message: `Imported ${next.validators.length} validator(s).`, warnings };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "Could not read that data.", warnings: [] };
    }
  }, []);

  const loadDemo = useCallback(() => {
    setDataset(demoDataset());
    setNetworkKey(null);
    setError(null);
  }, []);

  const clearImported = useCallback(() => {
    clearCachedDataset();
    setDataset(demoDataset());
    setNetworkKey(null);
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
