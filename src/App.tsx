import React, { useState } from 'react';
import { StatusBar } from './components/StatusBar';
import { MapView } from './components/MapView';
import { ListView } from './components/ListView';
import { useAlertData } from './hooks/useAlertData';
import type { RefreshInterval } from './types';
import './App.css';

type View = 'split' | 'map' | 'list';

export const App: React.FC = () => {
  const [view, setView] = useState<View>('split');
  const [interval, setInterval] = useState<RefreshInterval>(5);
  const data = useAlertData(interval);

  const activeCount = data.alerts.filter((a) => a.status === 'Actual' && a.msgType !== 'Cancel').length;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <div className="header-title">
            <h1>🇹🇼 台灣天然災害停班停課</h1>
            {activeCount > 0 && <span className="alert-badge">{activeCount} 則通報</span>}
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
            <MapView alerts={data.alerts} kmlGeoJSON={data.kmlGeoJSON} />
          </div>
        )}
        {view !== 'map' && (
          <div className="list-panel">
            <ListView alerts={data.alerts} />
          </div>
        )}
      </main>

      <footer className="app-footer">
        <span>
          資料來源：
          <a href="https://data.gov.tw/dataset/20457" target="_blank" rel="noreferrer">
            行政院人事行政總處
          </a>
        </span>
        <span>授權：政府資料開放授權條款－第1版</span>
        <span>聯絡：劉先生 (02)23979298#845</span>
        <span>
          原始資料：
          <a href="https://alerts.ncdr.nat.gov.tw" target="_blank" rel="noreferrer">
            NCDR 國家災害防救科技中心
          </a>
        </span>
      </footer>
    </div>
  );
};
