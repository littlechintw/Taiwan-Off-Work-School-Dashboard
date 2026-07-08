import React, { useEffect, useState } from 'react';
import type { RefreshInterval } from '../types';

interface Props {
  capFetchedAt: Date | null;
  capDataTime: Date | null;
  kmlFetchedAt: Date | null;
  kmlDataTime: Date | null;
  nextRefreshAt: Date | null;
  loading: boolean;
  refreshInterval: RefreshInterval;
  onIntervalChange: (v: RefreshInterval) => void;
  onRefreshNow: () => void;
}

const INTERVALS: RefreshInterval[] = [3, 5, 10, 15, 30, 60];

function formatTime(d: Date | null): string {
  if (!d) return '--';
  const date = d.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const time = d.toLocaleTimeString('zh-TW', { hour12: false });
  return `${date} ${time}`;
}


function formatCountdown(d: Date | null): string {
  if (!d) return '';
  const sec = Math.max(0, Math.floor((d.getTime() - Date.now()) / 1000));
  if (sec === 0) return '更新中…';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
}

export const StatusBar: React.FC<Props> = ({
  capFetchedAt,
  capDataTime,
  kmlFetchedAt,
  kmlDataTime,
  nextRefreshAt,
  loading,
  refreshInterval,
  onIntervalChange,
  onRefreshNow,
}) => {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="status-bar">
      <div className="status-left">
        <span className={`dot ${loading ? 'dot-loading' : 'dot-ok'}`} />
        <span className="status-group">
          <span className="group-label">通報</span>
          <span className="status-item">抓取：<strong>{formatTime(capFetchedAt)}</strong></span>
          <span className="sep">·</span>
          <span className="status-item">資料：<strong>{formatTime(capDataTime)}</strong></span>
        </span>
        <span className="status-group">
          <span className="group-label">地圖</span>
          <span className="status-item">抓取：<strong>{formatTime(kmlFetchedAt)}</strong></span>
          <span className="sep">·</span>
          <span className="status-item">資料：<strong>{formatTime(kmlDataTime)}</strong></span>
        </span>
      </div>
      <div className="status-right">
        <span className="status-item countdown">
          下次更新：<strong>{loading ? '更新中…' : formatCountdown(nextRefreshAt)}</strong>
        </span>
        <button className="btn-refresh" onClick={onRefreshNow} disabled={loading}>
          立即更新
        </button>
        <label className="interval-label">
          自動更新
          <select
            value={refreshInterval}
            onChange={(e) => onIntervalChange(Number(e.target.value) as RefreshInterval)}
            className="interval-select"
          >
            {INTERVALS.map((v) => (
              <option key={v} value={v}>
                {v} 分鐘
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
};
