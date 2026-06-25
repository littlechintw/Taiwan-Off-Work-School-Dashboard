import React, { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { CapAlert } from '../types';
import { TAIWAN_COUNTIES, findCounty } from '../data/taiwanCounties';

interface Props {
  alerts: CapAlert[];
  kmlGeoJSON: GeoJSON.FeatureCollection | null;
}

interface CountyStatus {
  name: string;
  lat: number;
  lng: number;
  stopWork: boolean;
  stopSchool: boolean;
  headlines: string[];
}

// Keep map viewport within Taiwan bounds
function BoundsRestrictor() {
  const map = useMap();
  React.useEffect(() => {
    map.setMaxBounds([
      [20.0, 116.0],
      [27.0, 123.5],
    ]);
  }, [map]);
  return null;
}

export const MapView: React.FC<Props> = ({ alerts, kmlGeoJSON }) => {
  const countyStatuses = useMemo<CountyStatus[]>(() => {
    const map = new Map<string, CountyStatus>();
    TAIWAN_COUNTIES.forEach((c) =>
      map.set(c.name, { name: c.name, lat: c.lat, lng: c.lng, stopWork: false, stopSchool: false, headlines: [] }),
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
          const hl = info.headline || info.event;
          if (hl && !s.headlines.includes(hl)) s.headlines.push(hl);
        });
      });
    });

    return Array.from(map.values());
  }, [alerts]);

  function markerColor(s: CountyStatus): string {
    if (s.stopWork && s.stopSchool) return '#ef4444';
    if (s.stopWork) return '#f97316';
    if (s.stopSchool) return '#3b82f6';
    return '#94a3b8';
  }

  return (
    <MapContainer
      center={[23.6, 120.9]}
      zoom={7}
      style={{ height: '100%', width: '100%' }}
      minZoom={6}
      maxZoom={13}
    >
      <BoundsRestrictor />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* KMZ polygon overlay when available */}
      {kmlGeoJSON && kmlGeoJSON.features.length > 0 && (
        <GeoJSON
          key={JSON.stringify(kmlGeoJSON.features.length)}
          data={kmlGeoJSON}
          style={() => ({
            fillColor: '#ef4444',
            fillOpacity: 0.25,
            color: '#ef4444',
            weight: 2,
          })}
        />
      )}

      {countyStatuses.map((county) => {
        const active = county.stopWork || county.stopSchool;
        return (
          <CircleMarker
            key={county.name}
            center={[county.lat, county.lng]}
            radius={active ? 16 : 9}
            pathOptions={{
              fillColor: markerColor(county),
              color: active ? '#fff' : '#64748b',
              weight: active ? 2 : 1,
              fillOpacity: active ? 0.9 : 0.3,
            }}
          >
            <Popup>
              <strong style={{ fontSize: 14 }}>{county.name}</strong>
              {active ? (
                <div style={{ marginTop: 6 }}>
                  {county.stopWork && <div>🚫 停止上班</div>}
                  {county.stopSchool && <div>📚 停止上課</div>}
                  {county.headlines.map((h, i) => (
                    <div key={i} style={{ marginTop: 6, fontSize: 12, color: '#555' }}>
                      {h}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ marginTop: 4, color: '#666' }}>目前無停班停課通報</div>
              )}
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
};
