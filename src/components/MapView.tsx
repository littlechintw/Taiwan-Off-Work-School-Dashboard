import React from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { KmlStatus } from '../utils/kmzParser';

interface Props {
  kmlGeoJSON: GeoJSON.FeatureCollection | null;
}

const STATUS_STYLE: Record<KmlStatus, L.PathOptions> = {
  'both-stopped':  { fillColor: '#ef4444', fillOpacity: 0.45, color: '#dc2626', weight: 1.5 },
  'school-only':   { fillColor: '#3b82f6', fillOpacity: 0.45, color: '#2563eb', weight: 1.5 },
  'work-only':     { fillColor: '#f97316', fillOpacity: 0.45, color: '#ea580c', weight: 1.5 },
  'not-announced': { fillColor: '#fbbf24', fillOpacity: 0.15, color: '#d97706', weight: 0.8 },
  'normal':        { fillColor: '#94a3b8', fillOpacity: 0.05, color: '#94a3b8', weight: 0.4 },
  'not-in-zone':   { fillColor: 'transparent', fillOpacity: 0, color: 'transparent', weight: 0 },
};

const ACTIVE_STATUSES: KmlStatus[] = ['both-stopped', 'school-only', 'work-only'];

const STATUS_TEXT: Record<KmlStatus, string> = {
  'both-stopped':  '停班停課',
  'school-only':   '停課（照常上班）',
  'work-only':     '停班（照常上課）',
  'not-announced': '未公布',
  'normal':        '正常',
  'not-in-zone':   '',
};

function TaiwanFitBounds() {
  const map = useMap();
  React.useEffect(() => {
    map.fitBounds([[20.4, 117.5], [26.5, 122.5]], { padding: [6, 6] });
    map.setMaxBounds([[19.0, 115.0], [28.0, 125.0]]);
  }, [map]);
  return null;
}

function kmlStyle(feature?: GeoJSON.Feature): L.PathOptions {
  const status = (feature?.properties as { status?: KmlStatus } | null)?.status ?? 'normal';
  return STATUS_STYLE[status] ?? STATUS_STYLE['normal'];
}

const onEachKmlFeature = (feature: GeoJSON.Feature, layer: L.Layer) => {
  const props = feature.properties as { countyName: string; status: KmlStatus; isPartial?: boolean } | null;
  if (!props) return;
  const { countyName, status, isPartial } = props;

  if (ACTIVE_STATUSES.includes(status)) {
    const label = isPartial ? `部分區域${STATUS_TEXT[status]}` : STATUS_TEXT[status];
    (layer as L.Path).bindTooltip(
      `<div class="kml-tip-name">${countyName}</div><div class="kml-tip-status">${label}</div>`,
      { permanent: true, direction: 'center', className: 'kml-county-label' },
    );
    (layer as L.Path).bindPopup(`<strong>${countyName}</strong><br/>${label}`);
  }
};

export const MapView: React.FC<Props> = ({ kmlGeoJSON }) => {

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

    </div>
  );
};
