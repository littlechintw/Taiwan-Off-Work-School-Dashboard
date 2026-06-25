import type { CapAlert, AlertInfo, AlertArea } from '../types';

const CAP_NS = 'urn:oasis:names:tc:emergency:cap:1.2';

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

function extractAreaStatuses(description: string): Map<string, { stopWork: boolean; stopSchool: boolean }> {
  const map = new Map<string, { stopWork: boolean; stopSchool: boolean }>();
  // Match patterns like "台北市：停止上班、停止上課" or "台北市 停班停課"
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

  // Try to find status specific to this area name
  let stopWork = false;
  let stopSchool = false;

  for (const [key, val] of areaStatuses) {
    if (name.includes(key) || key.includes(name)) {
      stopWork = val.stopWork;
      stopSchool = val.stopSchool;
      break;
    }
  }

  // Fallback: parse the whole description
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

  // If no area-level status detected, apply info-level status to all areas
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

  // CAP alerts embedded directly
  const nsAlerts = doc.getElementsByTagNameNS(CAP_NS, 'alert');
  if (nsAlerts.length > 0) {
    Array.from(nsAlerts).forEach((el) => {
      const a = parseAlertEl(el);
      if (a) alerts.push(a);
    });
    return alerts;
  }

  const plainAlerts = doc.getElementsByTagName('alert');
  if (plainAlerts.length > 0) {
    Array.from(plainAlerts).forEach((el) => {
      const a = parseAlertEl(el);
      if (a) alerts.push(a);
    });
    return alerts;
  }

  // Atom/RSS: look inside <content> or <description> of each entry/item
  const feedItems = [
    ...Array.from(doc.getElementsByTagName('entry')),
    ...Array.from(doc.getElementsByTagName('item')),
  ];

  feedItems.forEach((item) => {
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
