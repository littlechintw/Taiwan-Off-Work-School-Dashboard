import React, { useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { CapAlert } from '../types';
import { TAIWAN_COUNTIES, findCounty } from '../data/taiwanCounties';
import type { KmlStatus } from '../utils/kmzParser';

interface Props {
  alerts: CapAlert[];
  kmlGeoJSON: GeoJSON.FeatureCollection | null;
}

interface CountyStatus {
  name: string;
  stopWork: boolean;
  stopSchool: boolean;
}

const OUTER_ISLANDS = ['澎湖縣', '金門縣', '連江縣'];

const STATUS_STYLE: Record<KmlStatus, { fillColor: string; fillOpacity: number; color: string; weight: number }> = {
  'both-stopped':   { fillColor: '#ef4444', fillOpacity: 0.45, color: '#dc2626', weight: 1.5 },
  'school-only':    { fillColor: '#3b82f6', fillOpacity: 0.45, color: '#2563eb', weight: 1.5 },
  'work-only':      { fillColor: '#f97316', fillOpacity: 0.45, color: '#ea580c', weight: 1.5 },
  'not-announced':  { fillColor: '#fbbf24', fillOpacity: 0.18, color: '#d97706', weight: 1 },
  'normal':         { fillColor: '#94a3b8', fillOpacity: 0.06, color: '#94a3b8', weight: 0.5 },
  'not-in-zone':    { fillColor: 'transparent', fillOpacity: 0, color: 'transparent', weight: 0 },
};

const ACTIVE_STATUSES: KmlStatus[] = ['both-stopped', 'school-only', 'work-only'];

function statusLabel(status: KmlStatus): string {
  if (status === 'both-stopped') return '停班停課';
  if (status === 'school-only') return '停課（照常上班）';
  if (status === 'work-only') return '停班（照常上課）';
  return '';
}

function TaiwanFitBounds() {
  const map = useMap();
  React.useEffect(() => {
    // Bounds that include 金門 (lng ~118.4), 澎湖 (lng ~119.6), 馬祖 (lng ~120)
    map.fitBounds([[20.4, 117.5], [26.5, 122.5]], { padding: [6, 6] });
    map.setMaxBounds([[19.0, 115.0], [28.0, 125.0]]);
  }, [map]);
  return null;
}

const onEachKmlFeature = (feature: GeoJSON.Feature, layer: L.Layer) => {
  const props = feature.properties as { countyName: string; status: KmlStatus } | null;
  if (!props) return;
  const { countyName, status } = props;
  if (ACTIVE_STATUSES.includes(status)) {
    (layer as L.Path).bindTooltip(countyName, {
      permanent: true,
      direction: 'center',
      className: 'kml-county-label',
    });
  }
  const label = statusLabel(status);
  if (label) {
    (layer as L.Path).bindPopup(`<strong>${countyName}</strong><br/>${label}`);
  }
};

function kmlStyle(feature?: GeoJSON.Feature): L.PathOptions {
  const status = (feature?.properties as { status?: KmlStatus } | null)?.status ?? 'normal';
  return STATUS_STYLE[status] ?? STATUS_STYLE['normal'];
}

export const MapView: React.FC<Props> = ({ alerts, kmlGeoJSON }) => {
  const countyStatuses = useMemo<CountyStatus[]>(() => {
    const map = new Map<string, CountyStatus>();
    TAIWAN_COUNTIES.forEach((c) =>
      map.set(c.name, { name: c.name, stopWork: false, stopSchool: false }),
    );
    alerts.forEach((alert) => {
      if (alert.msgType === 'Cancel' || alert.status !== 'Actual') return;
      alert.info.forEach((info) => {
        info.areas.forEach((area) => {
          const county = findCounty(area.name);
          if (!county) return;
          const s = map.get(county.name)!;
          s.stopWork = s.stopWork || area.stopWork;
          s.stopSchool = s.stopSchool || area.stopSchool;
        });
      });
    });
    return Array.from(map.values());
  }, [alerts]);

  const outerIslands = OUTER_ISLANDS.map((name) => {
    const s = countyStatuses.find((c) => c.name === name) ?? { name, stopWork: false, stopSchool: false };
    return s;
  });

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <MapContainer
        center={[23.8, 120.5]}
        zoom={7}
        style={{ height: '100%', width: '100%' }}
        minZoom={6}
        maxZoom={13}
      >
        <TaiwanFitBounds />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {kmlGeoJSON && kmlGeoJSON.features.length > 0 && (
          <GeoJSON
            key={kmlGeoJSON.features.length}
            data={kmlGeoJSON}
            style={kmlStyle}
            onEachFeature={onEachKmlFeature}
          />
        )}
      </MapContainer>

      {/* Outer islands floating status panel */}
      <div className="outer-islands-panel">
        {outerIslands.map((island) => {
          const active = island.stopWork || island.stopSchool;
          const cls = island.stopWork && island.stopSchool
            ? 'island-both'
            : island.stopWork ? 'island-work'
            : island.stopSchool ? 'island-school'
            : 'island-normal';
          return (
            <div key={island.name} className={`island-chip ${cls}`}>
              <span className="island-name">{island.name}</span>
              <span className="island-status">
                {island.stopWork && island.stopSchool ? '停班停課'
                  : island.stopWork ? '停班'
                  : island.stopSchool ? '停課'
                  : '正常'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
