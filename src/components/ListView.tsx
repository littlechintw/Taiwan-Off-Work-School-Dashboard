import React from 'react';
import type { CapAlert } from '../types';
import { findCounty } from '../data/taiwanCounties';

interface Props {
  alerts: CapAlert[];
}

interface CountyGroup {
  countyName: string;
  districts: string[];
  stopWork: boolean;
  stopSchool: boolean;
  latestSent: Date;
  earliestEffective: Date | null;
  latestExpires: Date | null;
}

function fmtDate(d: Date | null): string {
  if (!d) return '--';
  return d.toLocaleString('zh-TW', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

export const ListView: React.FC<Props> = ({ alerts }) => {
  const active = alerts.filter((a) => a.status === 'Actual' && a.msgType !== 'Cancel');

  const countyMap = new Map<string, CountyGroup>();
  active.forEach((alert) => {
    alert.info.forEach((info) => {
      info.areas.forEach((area) => {
        const county = findCounty(area.name);
        const countyName = county?.name ?? area.name;
        const district = county ? area.name.replace(countyName, '').trim() : '';

        if (!countyMap.has(countyName)) {
          countyMap.set(countyName, {
            countyName,
            districts: [],
            stopWork: false,
            stopSchool: false,
            latestSent: alert.sent,
            earliestEffective: info.effective,
            latestExpires: info.expires,
          });
        }
        const g = countyMap.get(countyName)!;
        g.stopWork = g.stopWork || area.stopWork;
        g.stopSchool = g.stopSchool || area.stopSchool;
        if (alert.sent > g.latestSent) g.latestSent = alert.sent;
        if (info.effective && (!g.earliestEffective || info.effective < g.earliestEffective))
          g.earliestEffective = info.effective;
        if (info.expires && (!g.latestExpires || info.expires > g.latestExpires))
          g.latestExpires = info.expires;
        if (district && !g.districts.includes(district)) g.districts.push(district);
      });
    });
  });

  const groups = Array.from(countyMap.values()).sort(
    (a, b) => b.latestSent.getTime() - a.latestSent.getTime(),
  );

  if (groups.length === 0) {
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
      {groups.map((g) => {
        const cls = g.stopWork && g.stopSchool ? 'both' : g.stopWork ? 'work' : g.stopSchool ? 'school' : 'normal';
        return (
          <div key={g.countyName} className={`alert-card area-${cls}`}>
            <div className="card-header">
              <div className="card-title">{g.countyName}</div>
              <div className="area-tags">
                {g.stopWork && <span className="tag tag-work">停班</span>}
                {g.stopSchool && <span className="tag tag-school">停課</span>}
              </div>
            </div>

            {/* Show affected scope */}
            {g.districts.length === 0 ? (
              <div className="district-scope">全縣市</div>
            ) : (
              <div className="district-list">
                {g.districts.map((d) => (
                  <span key={d} className="district-chip">{d}</span>
                ))}
              </div>
            )}

            <div className="card-meta">
              <span>發布：{fmtDate(g.latestSent)}</span>
              {g.earliestEffective && <span>生效：{fmtDate(g.earliestEffective)}</span>}
              {g.latestExpires && <span>到期：{fmtDate(g.latestExpires)}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
};
