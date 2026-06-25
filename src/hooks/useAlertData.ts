import { useState, useEffect, useCallback, useRef } from 'react';
import type { CapAlert, DataState, RefreshInterval } from '../types';
import { parseCapFeed } from '../utils/capParser';
import { parseKmz, featuresToGeoJSON, type KmlFeature } from '../utils/kmzParser';

const WORKER_BASE = 'https://twoff.littlechintw.workers.dev';

async function fetchText(path: string): Promise<string> {
  const res = await fetch(`${WORKER_BASE}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function fetchBinary(path: string): Promise<ArrayBuffer> {
  const res = await fetch(`${WORKER_BASE}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.arrayBuffer();
}

export interface AlertData extends DataState {
  kmlFeatures: KmlFeature[];
  kmlGeoJSON: GeoJSON.FeatureCollection | null;
  kmlDataTime: Date | null;
  refresh: () => void;
}

export function useAlertData(refreshIntervalMinutes: RefreshInterval): AlertData {
  const [state, setState] = useState<DataState>({
    alerts: [],
    lastFetched: null,
    latestDataTime: null,
    nextRefreshAt: null,
    loading: true,
    error: null,
  });
  const [kmlFeatures, setKmlFeatures] = useState<KmlFeature[]>([]);
  const [kmlGeoJSON, setKmlGeoJSON] = useState<GeoJSON.FeatureCollection | null>(null);
  const [kmlDataTime, setKmlDataTime] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const xml = await fetchText('/cap');
      const alerts: CapAlert[] = parseCapFeed(xml);

      const latestDataTime =
        alerts.length > 0
          ? alerts.reduce<Date>((best, a) => (a.sent > best ? a.sent : best), alerts[0].sent)
          : null;

      const now = new Date();
      setState({
        alerts,
        lastFetched: now,
        latestDataTime,
        nextRefreshAt: new Date(now.getTime() + refreshIntervalMinutes * 60 * 1000),
        loading: false,
        error: null,
      });

      // KMZ is optional — don't fail the whole load if it errors
      fetchBinary('/kmz')
        .then(async (buf) => {
          const features = await parseKmz(buf);
          setKmlFeatures(features);
          setKmlGeoJSON(featuresToGeoJSON(features));
          const latest = features.reduce<Date | null>((best, f) => {
            if (!f.updateTime) return best;
            return !best || f.updateTime > best ? f.updateTime : best;
          }, null);
          setKmlDataTime(latest);
        })
        .catch((e) => console.warn('KMZ load failed:', e));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: `資料載入失敗: ${err instanceof Error ? err.message : String(err)}`,
      }));
    }
  }, [refreshIntervalMinutes]);

  useEffect(() => {
    fetchData();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(fetchData, refreshIntervalMinutes * 60 * 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchData, refreshIntervalMinutes]);

  return { ...state, kmlFeatures, kmlGeoJSON, kmlDataTime, refresh: fetchData };
}
