import React, { useMemo, useState } from 'react';
import { StatusBar } from './components/StatusBar';
import { MapView } from './components/MapView';
import { ListView } from './components/ListView';
import { useAlertData } from './hooks/useAlertData';
import { isCurrentAlert } from './utils/alertFilter';
import type { RefreshInterval } from './types';
import './App.css';

type View = 'split' | 'map' | 'list';

export const App: React.FC = () => {
  const [view, setView] = useState<View>('split');
  const [interval, setInterval] = useState<RefreshInterval>(5);
  const data = useAlertData(interval);

  // The feed retains historical entries; only count/list alerts that are still in effect.
  const currentAlerts = useMemo(
    () => data.alerts.filter((a) => isCurrentAlert(a)),
    [data.alerts],
  );

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <div className="header-title">
            <h1>🇹🇼 台灣天然災害停班停課 <small>（非官方）</small></h1>
            {currentAlerts.length > 0 && <span className="alert-badge">{currentAlerts.length} 則通報</span>}
          </div>
          <nav className="view-nav">
            {(['split', 'map', 'list'] as View[]).map((v) => (
              <button key={v} className={view === v ? 'active' : ''} onClick={() => setView(v)}>
                {v === 'split' ? '分割' : v === 'map' ? '地圖' : '清單'}
              </button>
            ))}
          </nav>
        </div>
        <StatusBar
          lastFetched={data.lastFetched}
          latestDataTime={data.latestDataTime}
          kmlDataTime={data.kmlDataTime}
          nextRefreshAt={data.nextRefreshAt}
          loading={data.loading}
          refreshInterval={interval}
          onIntervalChange={setInterval}
          onRefreshNow={data.refresh}
        />
      </header>

      {data.error && (
        <div className="error-banner">
          ⚠️ {data.error}
          <span className="error-hint">　提示：如因跨域限制請嘗試其他瀏覽器或部署至伺服器</span>
        </div>
      )}

      <main className={`main view-${view}`}>
        {view !== 'list' && (
          <div className="map-panel">
            <MapView kmlGeoJSON={data.kmlGeoJSON} />
          </div>
        )}
        {view !== 'map' && (
          <div className="list-panel">
            <ListView alerts={data.alerts} currentAlerts={currentAlerts} />
          </div>
        )}
      </main>

      <footer className="app-footer">
        <span>本工具為非官方服務，資料僅供參考</span>
        <span>
          提供機關：行政院人事行政總處｜來源：
          <a href="https://data.gov.tw/dataset/20457" target="_blank" rel="noreferrer">
            政府資料開放平台
          </a>
        </span>
      </footer>
    </div>
  );
};
