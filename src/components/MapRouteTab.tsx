import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { GNSSPoint, CRSSystem } from '../types/gnss';
import { convertPointToWGS84 } from '../utils/geodesy';
import {
  Play,
  Square,
  RotateCcw,
  RotateCw,
  Check,
  Info,
  ListOrdered,
  Layers,
  MapPin
} from 'lucide-react';

interface MapRouteTabProps {
  points: GNSSPoint[];
  setPoints: React.Dispatch<React.SetStateAction<GNSSPoint[]>>;
  crsSystem: CRSSystem;
  crsDom: string;
  onApplyRouteToTable: (ordered: GNSSPoint[]) => void;
  showToast: (msg: string) => void;
}

export const MapRouteTab: React.FC<MapRouteTabProps> = ({
  points,
  crsSystem,
  crsDom,
  onApplyRouteToTable,
  showToast,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  const [selectedRoute, setSelectedRoute] = useState<GNSSPoint[]>([]);
  const [isSelectionActive, setIsSelectionActive] = useState(false);
  const [mapType, setMapType] = useState<'hybrid' | 'osm' | 'grid'>(
    typeof navigator !== 'undefined' && !navigator.onLine ? 'grid' : 'osm'
  );

  // Initialize selectedRoute with points order if not set
  useEffect(() => {
    if (points.length > 0 && selectedRoute.length === 0) {
      setSelectedRoute([...points]);
    }
  }, [points]);

  // Leaflet map initialization
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!leafletMapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [39.0, 35.0],
        zoom: 6,
      });

      // Default OpenStreetMap layer
      const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      });

      osmLayer.addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      const line = L.polyline([], {
        color: '#0284c7',
        weight: 4,
        opacity: 0.85,
        dashArray: undefined,
      }).addTo(map);

      leafletMapRef.current = map;
      markersLayerRef.current = markersGroup;
      polylineRef.current = line;
    }

    // Invalidate map size after tab render
    const timer = setTimeout(() => {
      leafletMapRef.current?.invalidateSize();
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  // Update Tile Layer if switched
  useEffect(() => {
    if (!leafletMapRef.current) return;
    const map = leafletMapRef.current;

    // Remove existing tile/grid layers
    map.eachLayer((layer) => {
      if (layer instanceof L.GridLayer) {
        map.removeLayer(layer);
      }
    });

    if (mapType === 'hybrid') {
      L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Maps Satellite',
      }).addTo(map);
    } else if (mapType === 'osm') {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);
    } else {
      // Local Canvas Grid Layer (0 network requests, completely offline)
      const OfflineCanvasGrid = L.GridLayer.extend({
        createTile: function (coords: { x: number; y: number; z: number }) {
          const tile = document.createElement('canvas');
          tile.width = 256;
          tile.height = 256;
          const ctx = tile.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, 0, 256, 256);
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let x = 0; x <= 256; x += 64) {
              ctx.moveTo(x, 0);
              ctx.lineTo(x, 256);
            }
            for (let y = 0; y <= 256; y += 64) {
              ctx.moveTo(0, y);
              ctx.lineTo(256, y);
            }
            ctx.stroke();

            ctx.fillStyle = '#94a3b8';
            ctx.font = '10px monospace';
            ctx.fillText(`Izgara (${coords.z}/${coords.x}/${coords.y})`, 8, 16);
          }
          return tile;
        },
      });
      new (OfflineCanvasGrid as any)({
        attribution: 'Yerel Vektör Izgarası (Çevrimdışı)',
      }).addTo(map);
    }
  }, [mapType]);

  // Redraw Markers and Polyline
  useEffect(() => {
    if (!leafletMapRef.current || !markersLayerRef.current || !polylineRef.current) return;

    const markersGroup = markersLayerRef.current;
    const polyline = polylineRef.current;

    markersGroup.clearLayers();
    polyline.setLatLngs([]);

    if (points.length === 0) return;

    const latLngs: L.LatLngExpression[] = [];

    points.forEach((pt) => {
      const coords = convertPointToWGS84(pt, crsSystem, crsDom);
      if (coords.lat === 0 && coords.lon === 0) return;

      const latLng: [number, number] = [coords.lat, coords.lon];
      latLngs.push(latLng);

      const selIndex = selectedRoute.findIndex((sp) => sp.id === pt.id);
      const isSelected = selIndex !== -1;

      let badgeClass = 'leaflet-marker-badge';
      let labelText = pt.id;

      if (isSelected) {
        if (selIndex === 0) {
          badgeClass += ' start-badge';
          labelText = `1. ${pt.id} (BAŞLANGIÇ)`;
        } else if (selIndex === selectedRoute.length - 1 && selectedRoute.length === points.length) {
          badgeClass += ' end-badge';
          labelText = `${selIndex + 1}. ${pt.id} (BİTİŞ)`;
        } else {
          labelText = `${selIndex + 1}. ${pt.id}`;
        }
      }

      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `<div class="${badgeClass}">${labelText}</div>`,
        iconSize: [120, 26],
        iconAnchor: [60, 13],
      });

      const marker = L.marker(latLng, { icon: customIcon });

      marker.on('click', () => {
        handleMarkerClick(pt);
      });

      marker.bindPopup(`
        <div style="font-family:sans-serif;font-size:12px;line-height:1.4">
          <b style="color:#0284c7;font-size:13px">${pt.id}</b><br/>
          <b>Sağa (Y):</b> ${pt.y.toFixed(4)} m<br/>
          <b>Yukarı (X):</b> ${pt.x.toFixed(4)} m<br/>
          <b>Elipsoid (h):</b> ${pt.h.toFixed(4)} m<br/>
          <b>Jeoit (N):</b> ${pt.n.toFixed(3)} m
        </div>
      `);

      markersGroup.addLayer(marker);
    });

    if (selectedRoute.length > 0) {
      const lineLatLngs = selectedRoute.map((pt) => {
        const c = convertPointToWGS84(pt, crsSystem, crsDom);
        return [c.lat, c.lon] as [number, number];
      });
      polyline.setLatLngs(lineLatLngs);
    }

    if (latLngs.length > 0) {
      leafletMapRef.current.fitBounds(L.latLngBounds(latLngs), { padding: [50, 50] });
    }
  }, [points, selectedRoute, crsSystem, crsDom, isSelectionActive]);

  const handleMarkerClick = (point: GNSSPoint) => {
    if (!isSelectionActive) return;

    const existingIdx = selectedRoute.findIndex((p) => p.id === point.id);
    if (existingIdx !== -1) {
      showToast(`${point.id} zaten seçildi!`);
      return;
    }

    const updated = [...selectedRoute, point];
    setSelectedRoute(updated);

    if (updated.length === points.length) {
      showToast('Tüm güzergah noktaları sıraya alındı!');
    }
  };

  const toggleRouteSelectionMode = () => {
    if (points.length === 0) {
      alert('Güzergah seçmek için önce veri tablosuna nokta ekleyin!');
      return;
    }

    const nextState = !isSelectionActive;
    setIsSelectionActive(nextState);

    if (nextState) {
      // Starting clean selection
      setSelectedRoute([]);
      showToast('Güzergah Seçim Modu Açıldı. Haritadaki Başlangıç Noktasına Tıklayın!');
    } else {
      showToast('Güzergah Seçim Modu Kapatıldı.');
    }
  };

  const handleUndo = () => {
    if (selectedRoute.length > 0) {
      const updated = [...selectedRoute];
      const removed = updated.pop();
      setSelectedRoute(updated);
      showToast(`${removed?.id} seçimi geri alındı.`);
    }
  };

  const handleReset = () => {
    setSelectedRoute([]);
    showToast('Güzergah seçimi sıfırlandı.');
  };

  const handleApply = () => {
    if (selectedRoute.length < 2) {
      alert('Güzergahı aktarmak için en az 2 nokta seçmelisiniz!');
      return;
    }

    if (selectedRoute.length < points.length) {
      if (
        !confirm(
          `Toplam ${points.length} noktadan sadece ${selectedRoute.length} adedi seçildi. Yalnızca seçilen noktaları tabloya aktarmak istiyor musunuz?`
        )
      ) {
        return;
      }
    }

    onApplyRouteToTable(selectedRoute);
    showToast('Harita güzergah sıralaması tabloya aktarıldı!');
  };

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
      {/* Top Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setMapType('osm')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1 ${
              mapType === 'osm'
                ? 'bg-white text-sky-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sokak
          </button>
          <button
            onClick={() => setMapType('hybrid')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1 ${
              mapType === 'hybrid'
                ? 'bg-white text-sky-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Uydu
          </button>
          <button
            onClick={() => setMapType('grid')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1 ${
              mapType === 'grid'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Sıfır internet/ağ bağımlılığı - Yerel vektörel ızgara altlığı"
          >
            <span>Çevrimdışı Izgara</span>
            <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${mapType === 'grid' ? 'bg-emerald-700/80 text-emerald-100' : 'bg-slate-200 text-slate-600'}`}>0 Ağ</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={toggleRouteSelectionMode}
            className={`px-3.5 py-1.5 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer ${
              isSelectionActive
                ? 'bg-amber-600 hover:bg-amber-500'
                : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            {isSelectionActive ? (
              <>
                <Square className="w-3.5 h-3.5" />
                <span>Seçimi Bitir</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Güzergah Seçimini Başlat</span>
              </>
            )}
          </button>

          <button
            onClick={handleUndo}
            disabled={selectedRoute.length === 0}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 transition flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Geri Al</span>
          </button>

          <button
            onClick={handleReset}
            disabled={selectedRoute.length === 0}
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-600 text-xs font-medium rounded-lg border border-rose-200 transition flex items-center gap-1 cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Sıfırla</span>
          </button>

          <button
            onClick={handleApply}
            className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg shadow transition flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Güzergahı Tabloya Aktar</span>
          </button>
        </div>
      </div>

      {/* Info Status Banner */}
      <div className="bg-slate-100 text-slate-700 px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between font-medium">
        <span className="flex items-center gap-2">
          <Info className="w-4 h-4 text-sky-600 shrink-0" />
          <span>
            {isSelectionActive ? (
              selectedRoute.length === 0 ? (
                'Harita üzerinden BAŞLANGIÇ RÖPERİNE (A) tıklayın.'
              ) : selectedRoute.length < points.length ? (
                `Sıradaki (${selectedRoute.length + 1}.) noktaya harita üzerinden tıklayın.`
              ) : (
                'Tüm noktalar seçildi! "Güzergahı Tabloya Aktar" butonuna basarak sıralamayı güncelleyebilirsiniz.'
              )
            ) : (
              'Noktalar tablo sırasına göre otomatik yüklenmiştir. Yeniden sıralamak için "Güzergah Seçimini Başlat" butonuna tıklayın.'
            )}
          </span>
        </span>
        <span className="bg-sky-100 text-sky-800 font-mono font-bold px-2.5 py-1 rounded-md text-[11px] shrink-0 ml-2">
          Seçilen: {selectedRoute.length} / {points.length}
        </span>
      </div>

      {/* Map & Sequence Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Map Container */}
        <div className="lg:col-span-3 h-[520px] rounded-xl overflow-hidden border border-slate-200 shadow-inner relative z-0">
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>

        {/* Selected Sequence Panel */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col h-[520px]">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ListOrdered className="w-4 h-4 text-sky-600" />
              <span>Seçim Sırası</span>
            </span>
            <span className="text-[10px] text-slate-400 font-normal">Sırasıyla</span>
          </h4>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
            {selectedRoute.length === 0 ? (
              <div className="text-center text-slate-400 text-xs py-16 font-sans">
                <MapPin className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                Henüz harita üzerinden nokta seçilmedi veya sıra boş.
              </div>
            ) : (
              selectedRoute.map((pt, idx) => {
                const isStart = idx === 0;
                const isEnd = idx === selectedRoute.length - 1 && selectedRoute.length === points.length;

                let tagClass = 'bg-slate-200 text-slate-700';
                let tagText = `Sıra ${idx + 1}`;

                if (isStart) {
                  tagClass = 'bg-emerald-600 text-white font-bold';
                  tagText = 'A (Başlangıç)';
                } else if (isEnd) {
                  tagClass = 'bg-rose-600 text-white font-bold';
                  tagText = 'B (Bitiş)';
                }

                return (
                  <div
                    key={pt.id + idx}
                    className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-800">{pt.id}</span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${tagClass}`}>
                      {tagText}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
