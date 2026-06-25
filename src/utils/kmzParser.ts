import JSZip from 'jszip';

export type KmlStatus = 'both-stopped' | 'school-only' | 'work-only' | 'not-announced' | 'normal' | 'not-in-zone';

export interface KmlFeature {
  countyName: string;
  status: KmlStatus;
  polygons: [number, number][][];
  updateTime: Date | null;
}

function styleUrlToStatus(url: string): KmlStatus {
  if (url.includes('Red')) return 'both-stopped';
  if (url.includes('Purple')) return 'school-only';
  if (url.includes('Orange')) return 'work-only';
  if (url.includes('Yellow')) return 'not-announced';
  if (url.includes('Blue')) return 'normal';
  if (url.includes('NoColor')) return 'not-in-zone';
  return 'normal';
}

function parseCoords(text: string): [number, number][] {
  return text
    .trim()
    .split(/\s+/)
    .map((c) => {
      const [lng, lat] = c.split(',').map(Number);
      return [lng, lat] as [number, number];
    })
    .filter(([lng, lat]) => !isNaN(lng) && !isNaN(lat));
}

function parseTWDateTime(s: string): Date | null {
  // "2026/06/25 11:15:04"
  const m = s.match(/(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
}

function parseKml(text: string): KmlFeature[] {
  // Inject missing xmlns:xsi so the strict XML parser doesn't bail on xsi:schemaLocation
  const fixedText = text.replace(
    /(<kml\b[^>]*)(>)/,
    '$1 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"$2',
  );
  const doc = new DOMParser().parseFromString(fixedText, 'application/xml');
  if (doc.documentElement?.tagName?.toLowerCase().includes('parsererror')) return [];
  const features: KmlFeature[] = [];

  // County folders are direct children of <Document>
  const countyFolders = Array.from(doc.querySelectorAll('Folder')).filter(
    (f) => f.parentElement?.tagName === 'Document',
  );

  for (const folder of countyFolders) {
    const nameEl = Array.from(folder.children).find((c) => c.tagName === 'name');
    const countyName = nameEl?.textContent?.trim() ?? '';
    if (!countyName) continue;

    for (const pm of Array.from(folder.querySelectorAll('Placemark'))) {
      const styleUrl = pm.querySelector('styleUrl')?.textContent?.trim() ?? '';
      const status = styleUrlToStatus(styleUrl);
      if (status === 'not-in-zone') continue;

      const polygons: [number, number][][] = [];
      for (const poly of Array.from(pm.querySelectorAll('Polygon'))) {
        const coordEl = poly.querySelector('outerBoundaryIs coordinates');
        if (coordEl?.textContent) {
          const coords = parseCoords(coordEl.textContent);
          if (coords.length > 2) polygons.push(coords);
        }
      }
      if (polygons.length === 0) continue;

      const desc = pm.querySelector('description')?.textContent ?? '';
      const timeMatch = desc.match(/更新時間<\/td>\s*<td>([^<]+)/);
      const updateTime = timeMatch ? parseTWDateTime(timeMatch[1].trim()) : null;

      features.push({ countyName, status, polygons, updateTime });
    }
  }

  return features;
}

export async function parseKmz(buffer: ArrayBuffer): Promise<KmlFeature[]> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const kmlName = Object.keys(zip.files).find((f) => f.endsWith('.kml'));
    if (kmlName) {
      const kmlText = await zip.files[kmlName].async('string');
      return parseKml(kmlText);
    }
  } catch {
    // not a zip, fall through
  }
  const text = new TextDecoder().decode(buffer);
  if (text.includes('<Placemark') || text.includes('<kml')) {
    return parseKml(text);
  }
  return [];
}

const ACTIVE_STATUSES: KmlStatus[] = ['both-stopped', 'school-only', 'work-only'];

export function featuresToGeoJSON(features: KmlFeature[]): GeoJSON.FeatureCollection {
  // A county is partially affected if it has active-status polygons AND non-active-status polygons
  const countyHasNonActive = new Set<string>();
  const countyHasActive = new Set<string>();
  features.forEach((f) => {
    if (f.polygons.length === 0) return;
    if (ACTIVE_STATUSES.includes(f.status)) countyHasActive.add(f.countyName);
    if (f.status === 'normal' || f.status === 'not-announced') countyHasNonActive.add(f.countyName);
  });

  return {
    type: 'FeatureCollection',
    features: features
      .filter((f) => f.polygons.length > 0)
      .map((f) => ({
        type: 'Feature' as const,
        properties: {
          countyName: f.countyName,
          status: f.status,
          isPartial:
            ACTIVE_STATUSES.includes(f.status) &&
            countyHasActive.has(f.countyName) &&
            countyHasNonActive.has(f.countyName),
        },
        geometry:
          f.polygons.length === 1
            ? ({ type: 'Polygon', coordinates: [f.polygons[0]] } as GeoJSON.Polygon)
            : ({ type: 'MultiPolygon', coordinates: f.polygons.map((p) => [p]) } as GeoJSON.MultiPolygon),
      })),
  };
}
