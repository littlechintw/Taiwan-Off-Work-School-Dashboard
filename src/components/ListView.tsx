import React from 'react';
import type { CapAlert } from '../types';

interface Props {
  alerts: CapAlert[];
}

function fmtDate(d: Date | null): string {
  if (!d) return '--';
  return d.toLocaleString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

export const ListView: React.FC<Props> = ({ alerts }) => {
  const active = alerts.filter((a) => a.status === 'Actual' && a.msgType !== 'Cancel');

  if (active.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">✅</div>
        <h3>目前無停班停課通報</h3>
        <p>資料將依設定間隔自動更新</p>
      </div>
    );
  }

  return (
    <div className="list-view">
      {active.map((alert) => {
        const info = alert.info[0];
        const allAreas = alert.info.flatMap((i) => i.areas);
        return (
          <div key={alert.id} className="alert-card">
            <div className="card-header">
              <div className="card-title">{info?.headline || info?.event || '天然災害停班停課通報'}</div>
              <div className="card-time">發布：{fmtDate(alert.sent)}</div>
            </div>

            {(info?.effective || info?.expires) && (
              <div className="card-meta">
                {info.effective && <span>生效：{fmtDate(info.effective)}</span>}
                {info.expires && <span>到期：{fmtDate(info.expires)}</span>}
              </div>
            )}

            <div className="areas-grid">
              {allAreas.map((area, i) => {
                const cls = area.stopWork && area.stopSchool ? 'both' : area.stopWork ? 'work' : area.stopSchool ? 'school' : 'normal';
                return (
                  <div key={i} className={`area-chip area-${cls}`}>
                    <span className="area-name">{area.name}</span>
                    <div className="area-tags">
                      {area.stopWork && <span className="tag tag-work">停班</span>}
                      {area.stopSchool && <span className="tag tag-school">停課</span>}
                      {!area.stopWork && !area.stopSchool && <span className="tag tag-normal">通報</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {info?.description && (
              <details className="card-detail">
                <summary>詳細說明</summary>
                <pre>{info.description}</pre>
              </details>
            )}
          </div>
        );
      })}
    </div>
  );
};
