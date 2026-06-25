import React, { useEffect, useState } from 'react';
import type { RefreshInterval } from '../types';

interface Props {
  lastFetched: Date | null;
  latestDataTime: Date | null;
  nextRefreshAt: Date | null;
  loading: boolean;
  refreshInterval: RefreshInterval;
  onIntervalChange: (v: RefreshInterval) => void;
  onRefreshNow: () => void;
}

const INTERVALS: RefreshInterval[] = [1, 2, 5, 10, 15, 30];

function formatTime(d: Date | null): string {
  if (!d) return '--';
  return d.toLocaleTimeString('zh-TW', { hour12: false });
}

function formatAgo(d: Date | null): string {
  if (!d) return '';
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return `${sec} 秒前`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} 分鐘前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小時前`;
  return `${Math.floor(hr / 24)} 天前`;
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
  lastFetched,
  latestDataTime,
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

  const ago = formatAgo(latestDataTime);
  const dataAge = latestDataTime
    ? `${formatTime(latestDataTime)}（${ago}）`
    : '尚無資料';

  return (
    <div className="status-bar">
      <div className="status-left">
        <span className={`dot ${loading ? 'dot-loading' : 'dot-ok'}`} />
        <span className="status-item">
          最後更新：<strong>{formatTime(lastFetched)}</strong>
        </span>
        <span className="sep">｜</span>
        <span className="status-item">
          資料時間：<strong>{dataAge}</strong>
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
