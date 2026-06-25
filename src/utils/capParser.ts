import type { CapAlert, AlertInfo, AlertArea } from '../types';

const CAP_NS = 'urn:oasis:names:tc:emergency:cap:1.2';
const CAP_NS_V1 = 'urn:oasis:names:tc:emergency:cap:1.1';

function getText(el: Element, tag: string): string {
  const nsEl = el.getElementsByTagNameNS(CAP_NS, tag)[0];
  if (nsEl) return nsEl.textContent?.trim() ?? '';
  const plain = el.getElementsByTagName(tag)[0];
  return plain?.textContent?.trim() ?? '';
}

function getDate(el: Element, tag: string): Date | null {
  const text = getText(el, tag);
  if (!text) return null;
  const d = new Date(text);
  return isNaN(d.getTime()) ? null : d;
}

function parseStopStatus(text: string): { stopWork: boolean; stopSchool: boolean } {
  const notWork = /不停班|不停止上班|照常上班/.test(text);
  const notSchool = /不停課|不停止上課|照常上課/.test(text);
  return {
    stopWork: !notWork && /停止上班|停班/.test(text),
    stopSchool: !notSchool && /停止上課|停課/.test(text),
  };
}

// Parse Chinese datetime like "2026/6/25 下午 02:00:00" or "2026/6/25 上午 11:20:00"
function parseTWDate(s: string): Date | null {
  if (!s) return null;
  const m = s.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})\s*(上午|下午)\s*(\d{1,2}):(\d{2}):(\d{2})/);
  if (m) {
    let hour = parseInt(m[5]);
    if (m[4] === '下午' && hour !== 12) hour += 12;
    if (m[4] === '上午' && hour === 12) hour = 0;
    return new Date(
      `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}T${String(hour).padStart(2, '0')}:${m[6]}:${m[7]}+08:00`,
    );
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// Parse NCDR Atom feed where each <entry> has cap: namespace fields and summary text
function parseAtomEntry(entry: Element): CapAlert | null {
  try {
    const getTag = (tag: string) => entry.getElementsByTagName(tag)[0]?.textContent?.trim() ?? '';
    const getCapTag = (tag: string) =>
      (entry.getElementsByTagNameNS(CAP_NS_V1, tag)[0] ??
        entry.getElementsByTagNameNS(CAP_NS, tag)[0])?.textContent?.trim() ?? '';

    const id = getTag('id') || crypto.randomUUID();
    const updated = getTag('updated');
    const sent = updated ? new Date(updated) : new Date();
    const status = getCapTag('status');
    const msgType = getCapTag('msgType');
    const effective = parseTWDate(getCapTag('effective'));
    const expires = parseTWDate(getCapTag('expires'));
    const title = getTag('title');
    const summary = entry.getElementsByTagName('summary')[0]?.textContent?.trim() ?? '';
    const sender = entry.getElementsByTagName('author')[0]?.getElementsByTagName('name')[0]?.textContent?.trim() ?? '';

    // Extract area name and status from summary
    // Pattern: [停班停課通知]<areaName>:<statusText>
    const match = summary.match(/\[停班停課通知\]([^:：]+)[：:](.+)/);
    const areaName = match?.[1]?.trim() ?? title;
    const statusText = match?.[2]?.trim() ?? summary;
    const stopStatus = parseStopStatus(statusText);

    const area: AlertArea = { name: areaName, stopWork: stopStatus.stopWork, stopSchool: stopStatus.stopSchool };
    const info: AlertInfo = {
      language: 'zh-TW',
      event: '停班停課',
      effective,
      expires,
      headline: title,
      description: summary,
      areas: [area],
    };

    return { id, sender, sent, status, msgType, info: [info] };
  } catch {
    return null;
  }
}

function extractAreaStatuses(description: string): Map<string, { stopWork: boolean; stopSchool: boolean }> {
  const map = new Map<string, { stopWork: boolean; stopSchool: boolean }>();
  const re = /([^\n，,。；;]+(?:市|縣))[：:\s]*([^\n，；;。]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(description)) !== null) {
    const areaName = m[1].trim();
    const statusText = m[2].trim();
    if (/停班|停課|上班|上課/.test(statusText)) {
      map.set(areaName, parseStopStatus(statusText));
    }
  }
  return map;
}

function parseArea(areaEl: Element, infoDescription: string): AlertArea {
  const name = getText(areaEl, 'areaDesc');
  const areaStatuses = extractAreaStatuses(infoDescription);

  let stopWork = false;
  let stopSchool = false;

  for (const [key, val] of areaStatuses) {
    if (name.includes(key) || key.includes(name)) {
      stopWork = val.stopWork;
      stopSchool = val.stopSchool;
      break;
    }
  }

  if (!stopWork && !stopSchool && areaStatuses.size === 0) {
    const s = parseStopStatus(infoDescription);
    stopWork = s.stopWork;
    stopSchool = s.stopSchool;
  }

  return { name, stopWork, stopSchool };
}

function parseInfo(infoEl: Element): AlertInfo {
  const description = getText(infoEl, 'description');
  const headline = getText(infoEl, 'headline');

  const nsAreas = infoEl.getElementsByTagNameNS(CAP_NS, 'area');
  const areaEls = nsAreas.length > 0 ? Array.from(nsAreas) : Array.from(infoEl.getElementsByTagName('area'));
  const areas: AlertArea[] = areaEls.map((a) => parseArea(a, description));

  const infoStatus = parseStopStatus(description + ' ' + headline);
  if (areas.length > 0 && !areas.some((a) => a.stopWork || a.stopSchool)) {
    areas.forEach((a) => {
      a.stopWork = infoStatus.stopWork;
      a.stopSchool = infoStatus.stopSchool;
    });
  }

  return {
    language: getText(infoEl, 'language'),
    event: getText(infoEl, 'event'),
    effective: getDate(infoEl, 'effective'),
    expires: getDate(infoEl, 'expires'),
    headline,
    description,
    areas,
  };
}

function parseAlertEl(el: Element): CapAlert | null {
  try {
    const nsInfos = el.getElementsByTagNameNS(CAP_NS, 'info');
    const infoEls = nsInfos.length > 0 ? Array.from(nsInfos) : Array.from(el.getElementsByTagName('info'));
    const sent = getDate(el, 'sent') ?? new Date();
    return {
      id: getText(el, 'identifier') || crypto.randomUUID(),
      sender: getText(el, 'sender'),
      sent,
      status: getText(el, 'status'),
      msgType: getText(el, 'msgType'),
      info: infoEls.map(parseInfo),
    };
  } catch {
    return null;
  }
}

export function parseCapFeed(xml: string): CapAlert[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const alerts: CapAlert[] = [];

  // 1. Full CAP alert elements with namespace
  const nsAlerts = doc.getElementsByTagNameNS(CAP_NS, 'alert');
  if (nsAlerts.length > 0) {
    Array.from(nsAlerts).forEach((el) => {
      const a = parseAlertEl(el);
      if (a) alerts.push(a);
    });
    return alerts;
  }

  // 2. Full CAP alert elements without namespace
  const plainAlerts = doc.getElementsByTagName('alert');
  if (plainAlerts.length > 0) {
    Array.from(plainAlerts).forEach((el) => {
      const a = parseAlertEl(el);
      if (a) alerts.push(a);
    });
    return alerts;
  }

  // 3. NCDR Atom feed: each <entry> has cap: fields + summary text (no embedded CAP XML)
  const entries = doc.getElementsByTagName('entry');
  if (entries.length > 0) {
    Array.from(entries).forEach((entry) => {
      const a = parseAtomEntry(entry);
      if (a) alerts.push(a);
    });
    return alerts;
  }

  // 4. RSS <item> with embedded CAP XML in <description>/<content>
  const items = doc.getElementsByTagName('item');
  Array.from(items).forEach((item) => {
    const contentEl = item.getElementsByTagName('content')[0] ?? item.getElementsByTagName('description')[0];
    if (!contentEl) return;
    const inner = contentEl.textContent ?? '';
    if (!inner.includes('alert') && !inner.includes('Alert')) return;
    try {
      const inner2 = parser.parseFromString(inner, 'application/xml');
      const innerNs = inner2.getElementsByTagNameNS(CAP_NS, 'alert');
      const innerPlain = inner2.getElementsByTagName('alert');
      const els = innerNs.length > 0 ? innerNs : innerPlain;
      Array.from(els).forEach((el) => {
        const a = parseAlertEl(el);
        if (a) alerts.push(a);
      });
    } catch {
      // ignore
    }
  });

  return alerts;
}
