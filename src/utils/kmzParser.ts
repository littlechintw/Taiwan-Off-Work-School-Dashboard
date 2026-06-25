import JSZip from 'jszip';

export interface KmlFeature {
  name: string;
  description: string;
  // Each polygon: array of [lng, lat] pairs (GeoJSON order)
  polygons: [number, number][][];
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

function parsePlacemark(el: Element): KmlFeature {
  const name = el.querySelector('name')?.textContent?.trim() ?? '';
  const description = el.querySelector('description')?.textContent?.trim() ?? '';
  const polygons: [number, number][][] = [];

  el.querySelectorAll('Polygon').forEach((poly) => {
    const outer = poly.querySelector('outerBoundaryIs coordinates');
    if (outer?.textContent) polygons.push(parseCoords(outer.textContent));
  });

  return { name, description, polygons };
}

export async function parseKmz(buffer: ArrayBuffer): Promise<KmlFeature[]> {
  const zip = await JSZip.loadAsync(buffer);
  const kmlName = Object.keys(zip.files).find((f) => f.endsWith('.kml'));
  if (!kmlName) return [];

  const kmlText = await zip.files[kmlName].async('string');
  const doc = new DOMParser().parseFromString(kmlText, 'application/xml');
  return Array.from(doc.querySelectorAll('Placemark')).map(parsePlacemark);
}

export function featuresToGeoJSON(features: KmlFeature[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: features
      .filter((f) => f.polygons.length > 0)
      .map((f) => ({
        type: 'Feature' as const,
        properties: { name: f.name, description: f.description },
        geometry:
          f.polygons.length === 1
            ? ({ type: 'Polygon', coordinates: [f.polygons[0]] } as GeoJSON.Polygon)
            : ({ type: 'MultiPolygon', coordinates: f.polygons.map((p) => [p]) } as GeoJSON.MultiPolygon),
      })),
  };
}
