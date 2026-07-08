import React, { useMemo, useState } from 'react';
import type { CapAlert, AlertInfo } from '../types';
import { findCounty } from '../data/taiwanCounties';
import { isActualAlert, isCurrentAlert, latestSentTime } from '../utils/alertFilter';

interface Props {
  alerts: CapAlert[];
  currentAlerts: CapAlert[];
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

function cleanAnnouncement(desc: string): string {
  return desc
    .replace(/^\[停班停課通知\]/, '')
    .replace(/行政院人事行政總處。.*$/, '')
    .replace(/如有任何問題.*$/, '')
    .trim();
}

function statusCls(stopWork: boolean, stopSchool: boolean) {
  return stopWork && stopSchool ? 'both' : stopWork ? 'work' : stopSchool ? 'school' : 'normal';
}

function AlertMeta({ sent, info }: { sent: Date; info: AlertInfo }) {
  return (
    <div className="card-meta">
      <span>發布：{fmtDate(sent)}</span>
      {info.effective && <span>生效：{fmtDate(info.effective)}</span>}
      {info.expires && <span>到期：{fmtDate(info.expires)}</span>}
    </div>
  );
}

const Empty = ({ lastAlertAt }: { lastAlertAt: Date | null }) => (
  <div className="empty-state">
    <div className="empty-icon">✅</div>
    <h3>目前無停班停課通報</h3>
    <p>資料將依設定間隔自動更新</p>
    {lastAlertAt && <p className="empty-hint">最近一次通報：{fmtDate(lastAlertAt)}</p>}
  </div>
);

function GroupedView({ currentAlerts, lastAlertAt }: { currentAlerts: CapAlert[]; lastAlertAt: Date | null }) {
  const countyMap = new Map<string, CountyGroup>();
  currentAlerts.forEach((alert) => {
    alert.info.forEach((info) => {
      info.areas.forEach((area) => {
        const county = findCounty(area.name);
        const countyName = county?.name ?? area.name;
        const district = county ? area.name.replace(countyName, '').trim() : '';

        if (!countyMap.has(countyName)) {
          countyMap.set(countyName, {
            countyName, districts: [],
            stopWork: false, stopSchool: false,
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
  if (groups.length === 0) return <Empty lastAlertAt={lastAlertAt} />;

  return (
    <div className="list-view">
      {groups.map((g) => (
        <div key={g.countyName} className={`alert-card area-${statusCls(g.stopWork, g.stopSchool)}`}>
          <div className="card-header">
            <div className="card-title">{g.countyName}</div>
            <div className="area-tags">
              {g.stopWork && <span className="tag tag-work">停班</span>}
              {g.stopSchool && <span className="tag tag-school">停課</span>}
            </div>
          </div>
          {g.districts.length === 0 ? (
            <div className="district-scope">全縣市</div>
          ) : (
            <div className="district-list">
              {g.districts.map((d) => <span key={d} className="district-chip">{d}</span>)}
            </div>
          )}
          <div className="card-meta">
            <span>發布：{fmtDate(g.latestSent)}</span>
            {g.earliestEffective && <span>生效：{fmtDate(g.earliestEffective)}</span>}
            {g.latestExpires && <span>到期：{fmtDate(g.latestExpires)}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function AllAlertsView({ alerts, currentAlerts, lastAlertAt }: Props & { lastAlertAt: Date | null }) {
  const [showHistory, setShowHistory] = useState(false);

  const shown = useMemo(() => {
    const source = showHistory ? alerts.filter(isActualAlert) : currentAlerts;
    return [...source].sort((a, b) => b.sent.getTime() - a.sent.getTime());
  }, [alerts, currentAlerts, showHistory]);

  const hasHistory = alerts.filter(isActualAlert).length > currentAlerts.length;
  const now = new Date();

  return (
    <>
      {hasHistory && (
        <label className="history-toggle">
          <input
            type="checkbox"
            checked={showHistory}
            onChange={(e) => setShowHistory(e.target.checked)}
          />
          顯示歷史通報
        </label>
      )}
      {shown.length === 0 ? (
        <Empty lastAlertAt={lastAlertAt} />
      ) : (
        <div className="list-view">
          {shown.flatMap((alert) => {
            const expired = !isCurrentAlert(alert, now);
            return alert.info.flatMap((info) =>
              info.areas.map((area, i) => {
                const announcement = cleanAnnouncement(info.description);
                return (
                  <div
                    key={`${alert.id}-${i}`}
                    className={`alert-card area-${statusCls(area.stopWork, area.stopSchool)}${expired ? ' card-expired' : ''}`}
                  >
                    <div className="card-header">
                      <div className="card-title">{area.name}</div>
                      <div className="area-tags">
                        {expired && <span className="tag tag-expired">已過期</span>}
                        {area.stopWork && <span className="tag tag-work">停班</span>}
                        {area.stopSchool && <span className="tag tag-school">停課</span>}
                        {!area.stopWork && !area.stopSchool && <span className="tag tag-normal">通報</span>}
                      </div>
                    </div>
                    {announcement && <p className="announcement-text">{announcement}</p>}
                    <AlertMeta sent={alert.sent} info={info} />
                  </div>
                );
              }),
            );
          })}
        </div>
      )}
    </>
  );
}

export const ListView: React.FC<Props> = ({ alerts, currentAlerts }) => {
  const [tab, setTab] = useState<'grouped' | 'all'>('grouped');
  const lastAlertAt = useMemo(() => latestSentTime(alerts.filter(isActualAlert)), [alerts]);

  return (
    <div className="list-panel-inner">
      <div className="list-tabs">
        <button className={tab === 'grouped' ? 'active' : ''} onClick={() => setTab('grouped')}>
          縣市彙整
        </button>
        <button className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>
          全部通報 {currentAlerts.length > 0 && <span className="tab-count">{currentAlerts.length}</span>}
        </button>
      </div>
      {tab === 'grouped' ? (
        <GroupedView currentAlerts={currentAlerts} lastAlertAt={lastAlertAt} />
      ) : (
        <AllAlertsView alerts={alerts} currentAlerts={currentAlerts} lastAlertAt={lastAlertAt} />
      )}
    </div>
  );
};
