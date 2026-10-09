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
  const lastPointsSignatureRef = useRef<string>('');

  const [selectedRoute, setSelectedRoute] = useState<GNSSPoint[]>([]);
  const [isSelectionActive, setIsSelectionActive] = useState(false);
  const [mapType, setMapType] = useState<'hybrid' | 'osm' | 'grid'>(
    typeof navigator !== 'undefined' && !navigator.onLine ? 'grid' : 'osm'
  );
  const [scale, setScale] = useState<{ width: number; label: string }>({ width: 75, label: '100 m' });
  const [currentZoom, setCurrentZoom] = useState<number>(6);

  // Initialize selectedRoute with points order if not set
  useEffect(() => {
    if (points.length > 0 && selectedRoute.length === 0) {
      setSelectedRoute([...points]);
    }
  }, [points]);

  // Calculate dynamic scale bar metrics from Leaflet map
  const updateScale = () => {
    const map = leafletMapRef.current;
    if (!map) return;
    try {
      const maxWidth = 88;
      const center = map.getCenter();
      const p1 = map.latLngToContainerPoint(center);
      const p2 = L.point(p1.x + maxWidth, p1.y);
      const targetLatLng = map.containerPointToLatLng(p2);
      const meters = center.distanceTo(targetLatLng);

      if (!meters || meters <= 0 || isNaN(meters)) return;

      const pow10 = Math.pow(10, Math.floor(Math.log10(meters)));
      const d = meters / pow10;
      let factor = 1;
      if (d >= 5) factor = 5;
      else if (d >= 2) factor = 2;
      else factor = 1;
      const roundMeters = factor * pow10;

      const exactWidth = Math.max(52, Math.min(108, Math.round(maxWidth * (roundMeters / meters))));
      const label = roundMeters >= 1000 ? `${roundMeters / 1000} km` : `${roundMeters} m`;

      setScale({ width: exactWidth, label });
    } catch {
      // Safe fallback
    }
  };

  // Leaflet map initialization
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!leafletMapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [39.0, 35.0],
        zoom: 6,
      });

      // Default OpenStreetMap layer - 100% free, no API key required
      const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
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

      const onZoom = () => {
        setCurrentZoom(map.getZoom());
        updateScale();
      };

      map.on('zoomend', onZoom);
      map.on('moveend resize', updateScale);
    }

    // Invalidate map size after tab render and update scale
    const timer = setTimeout(() => {
      if (leafletMapRef.current) {
        leafletMapRef.current.invalidateSize();
        setCurrentZoom(leafletMapRef.current.getZoom());
        updateScale();
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      leafletMapRef.current?.off('zoomend moveend resize');
    };
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
        subdomains: ['a', 'b', 'c'],
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);
    } else {
      // Modern High-Precision CAD Offline Grid Layer (0 network requests, completely offline)
      const OfflineCanvasGrid = L.GridLayer.extend({
        createTile: function (coords: { x: number; y: number; z: number }) {
          const tile = document.createElement('canvas');
          const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
          const size = 256;
          tile.width = size * dpr;
          tile.height = size * dpr;
          tile.style.width = `${size}px`;
          tile.style.height = `${size}px`;

          const ctx = tile.getContext('2d');
          if (!ctx) return tile;

          ctx.scale(dpr, dpr);

          // 1. Base CAD Architectural Canvas Background
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(0, 0, size, size);

          // 2. Minor sub-grid lines (every 32px)
          ctx.strokeStyle = '#f1f5f9';
          ctx.lineWidth = 0.75;
          ctx.beginPath();
          for (let pos = 32; pos < size; pos += 32) {
            if (pos % 64 !== 0) {
              ctx.moveTo(pos, 0);
              ctx.lineTo(pos, size);
              ctx.moveTo(0, pos);
              ctx.lineTo(size, pos);
            }
          }
          ctx.stroke();

          // 3. Medium grid lines (every 64px)
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let pos = 64; pos < size; pos += 64) {
            if (pos % 128 !== 0) {
              ctx.moveTo(pos, 0);
              ctx.lineTo(pos, size);
              ctx.moveTo(0, pos);
              ctx.lineTo(size, pos);
            }
          }
          ctx.stroke();

          // 4. Major grid axes / tile borders (every 128px)
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 1.25;
          ctx.beginPath();
          for (let pos = 0; pos <= size; pos += 128) {
            ctx.moveTo(pos, 0);
            ctx.lineTo(pos, size);
            ctx.moveTo(0, pos);
            ctx.lineTo(size, pos);
          }
          ctx.stroke();

          // 5. Geodetic surveyor reticle crosshairs (+) at 64px intersections
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1;
          const tickLen = 4;
          for (let x = 64; x < size; x += 64) {
            for (let y = 64; y < size; y += 64) {
              ctx.beginPath();
              ctx.moveTo(x - tickLen, y);
              ctx.lineTo(x + tickLen, y);
              ctx.moveTo(x, y - tickLen);
              ctx.lineTo(x, y + tickLen);
              ctx.stroke();
            }
          }

          return tile;
        },
      });

      new (OfflineCanvasGrid as any)({
        attribution: 'Çevrimdışı Izgara',
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

      // Dynamic zoom-responsive font size and padding
      // Zoom levels:
      // <= 8: 9px (compact)
      // 10: 10px
      // 13: 11.5px
      // 15: 13px
      // >= 17: 15px - 16px (large and prominent!)
      const fontSize = Math.max(9, Math.min(16, +(7.5 + (currentZoom - 6) * 0.7).toFixed(1)));
      const paddingY = Math.max(1, Math.min(4, Math.round((currentZoom - 8) * 0.3)));
      const paddingX = Math.max(4, Math.min(10, Math.round((currentZoom - 6) * 0.5)));
      const borderWidth = currentZoom >= 14 ? 2 : 1.5;

      let badgeClass = 'leaflet-marker-badge';
      let labelText = pt.id;

      if (isSelected) {
        if (selIndex === 0) {
          badgeClass += ' start-badge';
          labelText = currentZoom >= 14 ? `1. ${pt.id} (BAŞLANGIÇ)` : `1. ${pt.id}`;
        } else if (selIndex === selectedRoute.length - 1 && selectedRoute.length === points.length) {
          badgeClass += ' end-badge';
          labelText = currentZoom >= 14 ? `${selIndex + 1}. ${pt.id} (BİTİŞ)` : `${selIndex + 1}. ${pt.id}`;
        } else {
          labelText = `${selIndex + 1}. ${pt.id}`;
        }
      }

      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `<div class="${badgeClass}" style="font-size: ${fontSize}px; padding: ${paddingY}px ${paddingX}px; border-width: ${borderWidth}px;">${labelText}</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
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

    const currentSignature = points.map((p) => p.id).join(',');
    if (latLngs.length > 0 && currentSignature !== lastPointsSignatureRef.current) {
      lastPointsSignatureRef.current = currentSignature;
      leafletMapRef.current.fitBounds(L.latLngBounds(latLngs), { padding: [50, 50] });
      setTimeout(updateScale, 150);
    }
  }, [points, selectedRoute, crsSystem, crsDom, isSelectionActive, currentZoom]);

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

          {/* Geodetic North Arrow & Dynamic Linear Scale Bar (Çizgi Ölçek) */}
          <div
            className="absolute bottom-4 left-3 z-400 bg-white/95 backdrop-blur-xs text-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-300 shadow-md flex items-center gap-3 pointer-events-none select-none text-xs"
            title="Kuzey Yönü ve Çizgi Ölçek"
          >
            {/* North Arrow (Kuzey Oku) - Solid Black */}
            <div className="flex items-center gap-1 font-bold text-[11px] pr-2.5 border-r border-slate-300">
              <span className="text-slate-950 font-black text-xs leading-none">▲</span>
              <span className="text-slate-950 tracking-wider">K</span>
            </div>

            {/* Graphic Linear Scale Bar (Çizgi Ölçek - 4 Bölümlü) */}
            <div className="flex flex-col items-center">
              <div
                className="flex justify-between text-[9px] font-mono font-bold text-slate-800 leading-none mb-1"
                style={{ width: `${scale.width}px` }}
              >
                <span>0</span>
                <span>{scale.label}</span>
              </div>
              <div
                className="h-1.5 border border-slate-900 relative flex overflow-hidden shadow-2xs"
                style={{ width: `${scale.width}px` }}
              >
                <div className="w-1/4 h-full bg-slate-950" />
                <div className="w-1/4 h-full bg-white border-l border-slate-900" />
                <div className="w-1/4 h-full bg-slate-950 border-l border-slate-900" />
                <div className="w-1/4 h-full bg-white border-l border-slate-900" />
              </div>
            </div>
          </div>
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
