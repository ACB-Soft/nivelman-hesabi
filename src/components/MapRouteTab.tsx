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
  MapPin,
  Printer,
  Maximize2,
  Sliders,
  Target,
  Eye,
  EyeOff,
  Compass,
  Type,
  FileText,
  Move,
  MousePointer,
  ZoomIn,
  ZoomOut,
  X
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
  const printFrameLayerRef = useRef<L.LayerGroup | null>(null);
  const lastPointsSignatureRef = useRef<string>('');
  const clickToPlaceRef = useRef<boolean>(false);

  // Modal Çıktı Haritası (Print Preview Map) Referansları
  const previewMapContainerRef = useRef<HTMLDivElement | null>(null);
  const previewMapRef = useRef<L.Map | null>(null);
  const previewMarkersLayerRef = useRef<L.LayerGroup | null>(null);
  const previewPolylineRef = useRef<L.Polyline | null>(null);
  const [previewScale, setPreviewScale] = useState<{ width: number; label: string }>({ width: 75, label: '100 m' });

  const [selectedRoute, setSelectedRoute] = useState<GNSSPoint[]>([]);
  const [isSelectionActive, setIsSelectionActive] = useState(false);
  const [mapType, setMapType] = useState<'hybrid' | 'osm' | 'grid'>(
    typeof navigator !== 'undefined' && !navigator.onLine ? 'grid' : 'osm'
  );
  const [scale, setScale] = useState<{ width: number; label: string }>({ width: 75, label: '100 m' });
  const [currentZoom, setCurrentZoom] = useState<number>(6);

  // 1- Nokta Adı Büyüklüğü (Punto)
  const [pointPunto, setPointPunto] = useState<number | 'auto'>('auto');
  // 2- Kağıt Boyutu: A3 / A4 ve Yönelim: Yatay / Dikey
  const [paperFormat, setPaperFormat] = useState<'A4' | 'A3'>('A4');
  const [paperOrientation, setPaperOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const paperSize = `${paperFormat.toLowerCase()}-${paperOrientation}` as 'a4-landscape' | 'a4-portrait' | 'a3-landscape' | 'a3-portrait';

  // 3- Ölçek: 1/25.000 vs.
  const [printScale, setPrintScale] = useState<number | 'auto'>(25000);
  const [customScaleValue, setCustomScaleValue] = useState<number>(25000);
  const [isCustomScale, setIsCustomScale] = useState<boolean>(false);

  // Harita Baskı Popup Modal ve Çıktı Çerçevesi (Print Frame) Durumu
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [showPrintFrame, setShowPrintFrame] = useState<boolean>(false);
  const [frameCenter, setFrameCenter] = useState<[number, number] | null>(null);
  const [isClickToPlaceActive, setIsClickToPlaceActive] = useState<boolean>(false);

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
      const printFrameGroup = L.layerGroup().addTo(map);
      const line = L.polyline([], {
        color: '#ff0000',
        weight: 4,
        opacity: 0.85,
        dashArray: undefined,
      }).addTo(map);

      leafletMapRef.current = map;
      markersLayerRef.current = markersGroup;
      printFrameLayerRef.current = printFrameGroup;
      polylineRef.current = line;

      const onZoom = () => {
        setCurrentZoom(map.getZoom());
        updateScale();
      };

      const onMapClick = (e: L.LeafletMouseEvent) => {
        if (clickToPlaceRef.current) {
          setFrameCenter([e.latlng.lat, e.latlng.lng]);
          setIsClickToPlaceActive(false);
        }
      };

      map.on('zoomend', onZoom);
      map.on('moveend resize', updateScale);
      map.on('click', onMapClick);
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
      leafletMapRef.current?.off('zoomend moveend resize click');
    };
  }, []);

  useEffect(() => {
    clickToPlaceRef.current = isClickToPlaceActive;
  }, [isClickToPlaceActive]);

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

      // Dynamic zoom-responsive font size and padding, or user-selected punto
      let fontSizePx = Math.max(9, Math.min(16, +(7.5 + (currentZoom - 6) * 0.7).toFixed(1)));
      let paddingY = Math.max(1, Math.min(4, Math.round((currentZoom - 8) * 0.3)));
      let paddingX = Math.max(4, Math.min(10, Math.round((currentZoom - 6) * 0.5)));
      let borderWidth = currentZoom >= 14 ? 2 : 1.5;

      if (pointPunto !== 'auto') {
        // 1 pt ≈ 1.333 px
        fontSizePx = Math.max(8, Math.round(pointPunto * 1.333));
        paddingY = Math.max(1, Math.min(6, Math.round(pointPunto * 0.25)));
        paddingX = Math.max(3, Math.min(12, Math.round(pointPunto * 0.5)));
      }

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
        html: `<div class="${badgeClass}" style="font-size: ${fontSizePx}px; padding: ${paddingY}px ${paddingX}px; border-width: ${borderWidth}px;">${labelText}</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker(latLng, { icon: customIcon });

      marker.on('click', () => {
        handleMarkerClick(pt);
      });

      marker.bindPopup(`
        <div style="font-family:sans-serif;font-size:12px;line-height:1.4">
          <b style="color:#ff0000;font-size:13px">${pt.id}</b><br/>
          <b>Sağa (Y):</b> ${pt.y.toFixed(4)} m<br/>
          <b>Yukarı (X):</b> ${pt.x.toFixed(4)} m<br/>
          <b>Elipsoid (h):</b> ${pt.h.toFixed(4)} m<br/>
          <b>Jeoit (N):</b> ${pt.n.toFixed(3)} m
        </div>
      `);

      markersGroup.addLayer(marker);

      // Add a small black circle marker on the route
      const circle = L.circleMarker(latLng, {
        radius: 3,
        fillColor: '#000000',
        color: '#000000',
        weight: 1,
        opacity: 1,
        fillOpacity: 1
      });
      markersGroup.addLayer(circle);
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
  }, [points, selectedRoute, crsSystem, crsDom, isSelectionActive, currentZoom, pointPunto]);

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

  // Güzergah merkez koordinatını hesaplar
  const getRouteCenterLatLng = (): [number, number] => {
    const pts = selectedRoute.length > 0 ? selectedRoute : points;
    if (pts.length > 0) {
      const valid = pts
        .map((p) => convertPointToWGS84(p, crsSystem, crsDom))
        .filter((c) => c.lat !== 0 || c.lon !== 0);
      if (valid.length > 0) {
        const avgLat = valid.reduce((acc, c) => acc + c.lat, 0) / valid.length;
        const avgLon = valid.reduce((acc, c) => acc + c.lon, 0) / valid.length;
        return [avgLat, avgLon];
      }
    }
    if (leafletMapRef.current) {
      const c = leafletMapRef.current.getCenter();
      return [c.lat, c.lng];
    }
    return [39.0, 35.0];
  };

  // Kağıt boyutu ve ölçeğe göre arazideki kaplama alanını (metre) hesaplar
  const getFrameCoverageMeters = () => {
    let paperWidthMm = 297;
    let paperHeightMm = 210;
    if (paperSize === 'a4-portrait') {
      paperWidthMm = 210;
      paperHeightMm = 297;
    } else if (paperSize === 'a3-landscape') {
      paperWidthMm = 420;
      paperHeightMm = 297;
    } else if (paperSize === 'a3-portrait') {
      paperWidthMm = 297;
      paperHeightMm = 420;
    }

    let effectiveScale = isCustomScale ? customScaleValue : typeof printScale === 'number' ? printScale : 25000;
    if (printScale === 'auto' && !isCustomScale) {
      const pts = selectedRoute.length > 0 ? selectedRoute : points;
      if (pts.length > 0) {
        const xs = pts.map((p) => p.x);
        const ys = pts.map((p) => p.y);
        const spanX = Math.max(10, Math.max(...xs) - Math.min(...xs)); // kuzey-güney
        const spanY = Math.max(10, Math.max(...ys) - Math.min(...ys)); // doğu-batı

        const neededScaleW = (spanY * 1.35) / (paperWidthMm / 1000);
        const neededScaleH = (spanX * 1.35) / (paperHeightMm / 1000);
        const needed = Math.max(neededScaleW, neededScaleH, 1000);

        const standardScales = [1000, 2000, 5000, 10000, 15000, 20000, 25000, 50000, 100000];
        effectiveScale = standardScales.find((s) => s >= needed) || Math.ceil(needed / 10000) * 10000;
      }
    }

    const widthMeters = (paperWidthMm / 1000) * effectiveScale;
    const heightMeters = (paperHeightMm / 1000) * effectiveScale;

    return {
      paperWidthMm,
      paperHeightMm,
      effectiveScale,
      widthMeters,
      heightMeters,
    };
  };

  // Çıktı alanının coğrafi sınırlarını (LatLngBounds) hesaplar
  const getFrameLatLngBounds = (center: [number, number]): L.LatLngBounds => {
    const { widthMeters, heightMeters } = getFrameCoverageMeters();
    const [centerLat, centerLon] = center;

    const deltaLat = (heightMeters / 2) / 111139;
    const rad = (centerLat * Math.PI) / 180;
    const deltaLon = (widthMeters / 2) / (111139 * Math.max(0.1, Math.cos(rad)));

    const southWest = L.latLng(centerLat - deltaLat, centerLon - deltaLon);
    const northEast = L.latLng(centerLat + deltaLat, centerLon + deltaLon);
    return L.latLngBounds(southWest, northEast);
  };

  // Baskı Çerçevesini (Çıktı Alanını) Harita Üzerinde Çiz
  useEffect(() => {
    if (!leafletMapRef.current || !printFrameLayerRef.current) return;
    const frameGroup = printFrameLayerRef.current;
    frameGroup.clearLayers();

    if (!showPrintFrame) return;

    const center = frameCenter || getRouteCenterLatLng();
    const bounds = getFrameLatLngBounds(center);
    const { effectiveScale, widthMeters, heightMeters } = getFrameCoverageMeters();

    const paperLabel = paperSize.startsWith('a3') ? 'A3' : 'A4';
    const orientLabel = paperSize.endsWith('portrait') ? 'Dikey' : 'Yatay';
    const widthKm = (widthMeters / 1000).toFixed(2);
    const heightKm = (heightMeters / 1000).toFixed(2);

    // Ana Çıktı Çerçevesi Dikdörtgeni (Mavi/İndigo kesikli pafta çizgisi)
    const rect = L.rectangle(bounds, {
      color: '#4f46e5',
      weight: 2,
      dashArray: '6, 6',
      fillColor: '#6366f1',
      fillOpacity: 0.05,
      interactive: false,
    });
    frameGroup.addLayer(rect);

    // Çerçeve Bilgi Etiketi (Kuzeybatı köşesinde rozet)
    const nw = bounds.getNorthWest();
    const infoBadgeIcon = L.divIcon({
      className: 'print-frame-badge-icon',
      html: `
        <div class="bg-indigo-950/95 backdrop-blur-xs text-white text-[10px] font-mono px-2.5 py-1 rounded-md border border-indigo-400/60 shadow-lg whitespace-nowrap flex items-center gap-1.5 pointer-events-none -translate-y-full -translate-x-1">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span class="font-bold text-sky-300">${paperLabel} ${orientLabel}</span>
          <span class="text-indigo-200">1/${effectiveScale.toLocaleString('tr-TR')}</span>
          <span class="text-indigo-300 text-[9px]">(${widthKm} × ${heightKm} km)</span>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
    const infoMarker = L.marker(nw, { icon: infoBadgeIcon, interactive: false });
    frameGroup.addLayer(infoMarker);

    // Köşe işaretçileri (CAD pafta köşe imleri)
    const corners = [bounds.getNorthWest(), bounds.getNorthEast(), bounds.getSouthWest(), bounds.getSouthEast()];
    const cornerMarkers = corners.map((corner) => {
      const cornerMark = L.circleMarker(corner, {
        radius: 4,
        color: '#4f46e5',
        weight: 1.5,
        fillColor: '#ffffff',
        fillOpacity: 1,
        interactive: false,
      });
      frameGroup.addLayer(cornerMark);
      return cornerMark;
    });

    // Orta Sürükleme Tutamacı (Center Draggable Anchor Handle)
    const centerMarkerIcon = L.divIcon({
      className: 'print-frame-center-handle',
      html: `
        <div class="group cursor-grab active:cursor-grabbing flex flex-col items-center -translate-x-1/2 -translate-y-1/2 pointer-events-auto select-none" title="Çıktı alanını taşımak için sürükleyin">
          <div class="w-8 h-8 rounded-full bg-indigo-600 text-white shadow-xl flex items-center justify-center border-2 border-white ring-2 ring-indigo-400/50 hover:scale-110 transition-transform">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="5 9 2 12 5 15"></polyline>
              <polyline points="9 5 12 2 15 5"></polyline>
              <polyline points="15 19 12 22 9 19"></polyline>
              <polyline points="19 9 22 12 19 15"></polyline>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <line x1="12" y1="2" x2="12" y2="22"></line>
            </svg>
          </div>
          <span class="mt-1 bg-indigo-950/95 text-[10px] font-sans font-semibold text-white px-2 py-0.5 rounded-md shadow-md whitespace-nowrap border border-indigo-400/40">
            Çıktı Alanını Sürükle
          </span>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });

    const centerMarker = L.marker(L.latLng(center[0], center[1]), {
      icon: centerMarkerIcon,
      draggable: true,
      zIndexOffset: 600,
    });

    centerMarker.on('drag', (e: any) => {
      const newPos = e.latlng;
      const newBounds = getFrameLatLngBounds([newPos.lat, newPos.lng]);
      rect.setBounds(newBounds);
      infoMarker.setLatLng(newBounds.getNorthWest());
      const newCorners = [newBounds.getNorthWest(), newBounds.getNorthEast(), newBounds.getSouthWest(), newBounds.getSouthEast()];
      cornerMarkers.forEach((cm, i) => cm.setLatLng(newCorners[i]));
    });

    centerMarker.on('dragend', (e: any) => {
      const newPos = e.latlng;
      setFrameCenter([newPos.lat, newPos.lng]);
    });

    frameGroup.addLayer(centerMarker);
  }, [showPrintFrame, paperSize, printScale, customScaleValue, isCustomScale, frameCenter, points, selectedRoute]);

  // Çıktı alanına (Baskı Çerçevesine) odaklan
  const handleFocusPrintFrame = () => {
    if (!leafletMapRef.current) return;
    const center = frameCenter || getRouteCenterLatLng();
    const bounds = getFrameLatLngBounds(center);
    leafletMapRef.current.fitBounds(bounds, { padding: [25, 25], animate: true });
    setTimeout(updateScale, 200);
    showToast('Harita seçilen çıktı çerçevesine odaklandı');
  };

  // Çıktı çerçevesini güzergah merkezine taşı
  const handleCenterFrameOnRoute = () => {
    const c = getRouteCenterLatLng();
    setFrameCenter(c);
    showToast('Çıktı alanı güzergah merkezine taşındı');
  };

  // Çıktı çerçevesini mevcut harita merkezine taşı
  const handleCenterFrameOnView = () => {
    if (!leafletMapRef.current) return;
    const c = leafletMapRef.current.getCenter();
    setFrameCenter([c.lat, c.lng]);
    showToast('Çıktı alanı mevcut harita merkezine taşındı');
  };

  // Tüm noktaları ekrana sığdırma (Limit Ekran / Zoom Extents)
  const handleZoomToExtents = () => {
    if (!leafletMapRef.current || points.length === 0) return;
    const allLatLngs: [number, number][] = [];
    points.forEach((pt) => {
      const coords = convertPointToWGS84(pt, crsSystem, crsDom);
      if (coords.lat !== 0 || coords.lon !== 0) {
        allLatLngs.push([coords.lat, coords.lon]);
      }
    });

    if (allLatLngs.length > 0) {
      leafletMapRef.current.fitBounds(L.latLngBounds(allLatLngs), {
        padding: [50, 50],
        animate: true,
      });
      setTimeout(updateScale, 200);
      showToast('Tüm veri limit ekrana sığdırıldı');
    }
  };

  // Toplam güzergah uzunluğu (metre)
  const getTotalRouteDistanceMeters = (): number => {
    const pts = selectedRoute.length > 0 ? selectedRoute : points;
    if (pts.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const dx = pts[i + 1].y - pts[i].y; // Sağa
      const dy = pts[i + 1].x - pts[i].x; // Yukarı
      total += Math.sqrt(dx * dx + dy * dy);
    }
    return total;
  };

  // Harita Baskı ve Çıktı Düzenleme Seçenekleri Popup Modalı Aç/Kapat
  const handleOpenPrintModal = () => {
    setShowPrintFrame(true);
    setIsPrintModalOpen(true);
  };

  const handleClosePrintModal = () => {
    setIsPrintModalOpen(false);
    setShowPrintFrame(false);
    setIsClickToPlaceActive(false);
  };

  // Modal içindeki Çıktı Haritasını (Preview Leaflet Map) Başlat
  useEffect(() => {
    if (!isPrintModalOpen || !previewMapContainerRef.current) return;

    if (previewMapRef.current) {
      previewMapRef.current.remove();
      previewMapRef.current = null;
    }

    const center = frameCenter || getRouteCenterLatLng();
    const previewMap = L.map(previewMapContainerRef.current, {
      center: [center[0], center[1]],
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
    });
    previewMapRef.current = previewMap;

    // Altlık Katmanı Ekle
    const applyBase = (type: 'hybrid' | 'osm' | 'grid') => {
      previewMap.eachLayer((l) => {
        if (l instanceof L.GridLayer) previewMap.removeLayer(l);
      });

      if (type === 'hybrid') {
        L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
          maxZoom: 20,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        }).addTo(previewMap);
      } else if (type === 'osm') {
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          subdomains: ['a', 'b', 'c'],
        }).addTo(previewMap);
      } else {
        const OfflineGrid = L.GridLayer.extend({
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
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, 0, size, size);
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let pos = 32; pos < size; pos += 32) {
              ctx.moveTo(pos, 0); ctx.lineTo(pos, size);
              ctx.moveTo(0, pos); ctx.lineTo(size, pos);
            }
            ctx.stroke();
            return tile;
          },
        });
        new OfflineGrid().addTo(previewMap);
      }
    };

    applyBase(mapType);

    // Güzergah Polylinesi
    const polyline = L.polyline([], {
      color: '#0284c7',
      weight: 3.5,
      opacity: 0.95,
      smoothFactor: 1,
    }).addTo(previewMap);
    previewPolylineRef.current = polyline;

    // Noktalar Katman Grubu
    const markersGroup = L.layerGroup().addTo(previewMap);
    previewMarkersLayerRef.current = markersGroup;

    // Dinamik Çizgi Ölçek Hesaplama
    const updatePreviewScaleBar = () => {
      try {
        const maxWidth = 75;
        const c = previewMap.getCenter();
        const p1 = previewMap.latLngToContainerPoint(c);
        const p2 = L.point(p1.x + maxWidth, p1.y);
        const targetLatLng = previewMap.containerPointToLatLng(p2);
        const meters = c.distanceTo(targetLatLng);
        if (!meters || meters <= 0 || isNaN(meters)) return;
        const pow10 = Math.pow(10, Math.floor(Math.log10(meters)));
        let niceMeters = Math.round(meters / pow10) * pow10;
        if (niceMeters === 0) niceMeters = pow10;
        const actualWidth = Math.max(30, Math.min(115, Math.round((niceMeters / meters) * maxWidth)));
        const label = niceMeters >= 1000 ? `${(niceMeters / 1000).toFixed(niceMeters % 1000 === 0 ? 0 : 1)} km` : `${niceMeters} m`;
        setPreviewScale({ width: actualWidth, label });
      } catch {
        // ignore
      }
    };

    previewMap.on('moveend zoomend resize', () => {
      updatePreviewScaleBar();
      const c = previewMap.getCenter();
      setFrameCenter([c.lat, c.lng]);
    });

    const timer = setTimeout(() => {
      if (previewMapRef.current) {
        previewMapRef.current.invalidateSize({ animate: false });
        const bounds = getFrameLatLngBounds(center);
        previewMapRef.current.fitBounds(bounds, { padding: [10, 10], animate: false });
        updatePreviewScaleBar();
      }
    }, 120);

    return () => {
      clearTimeout(timer);
      previewMap.remove();
      previewMapRef.current = null;
      previewMarkersLayerRef.current = null;
      previewPolylineRef.current = null;
    };
  }, [isPrintModalOpen, mapType]);

  // Modal içindeki Çıktı Haritası Noktalarını ve Sınırlarını Senkronize Et
  useEffect(() => {
    if (!isPrintModalOpen || !previewMapRef.current || !previewMarkersLayerRef.current || !previewPolylineRef.current) return;
    const map = previewMapRef.current;
    const markersGroup = previewMarkersLayerRef.current;
    const polyline = previewPolylineRef.current;

    markersGroup.clearLayers();
    polyline.setLatLngs([]);

    const pts = selectedRoute.length > 0 ? selectedRoute : points;
    if (pts.length === 0) return;

    const lineLatLngs: [number, number][] = [];

    pts.forEach((pt, idx) => {
      const coords = convertPointToWGS84(pt, crsSystem, crsDom);
      if (coords.lat === 0 && coords.lon === 0) return;
      const latLng: [number, number] = [coords.lat, coords.lon];
      lineLatLngs.push(latLng);

      const isStart = idx === 0;
      const isEnd = idx === pts.length - 1 && pts.length > 1;

      // Kullanıcının seçtiği nokta adı puntosu
      let fontSizePx = 11;
      let paddingY = 2;
      let paddingX = 5;
      if (pointPunto !== 'auto') {
        fontSizePx = Math.max(8, Math.round(pointPunto * 1.333));
        paddingY = Math.max(1, Math.min(6, Math.round(pointPunto * 0.25)));
        paddingX = Math.max(3, Math.min(12, Math.round(pointPunto * 0.5)));
      }

      let badgeClass = 'leaflet-marker-badge';
      let labelText = `${idx + 1}. ${pt.id}`;
      if (isStart) {
        badgeClass += ' start-badge';
        labelText = `1. ${pt.id} (A)`;
      } else if (isEnd) {
        badgeClass += ' end-badge';
        labelText = `${idx + 1}. ${pt.id} (B)`;
      }

      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `<div class="${badgeClass}" style="font-size: ${fontSizePx}px; padding: ${paddingY}px ${paddingX}px; pointer-events: none;">${labelText}</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker(latLng, { icon: customIcon, interactive: false });
      markersGroup.addLayer(marker);

      const dot = L.circleMarker(latLng, {
        radius: 3,
        fillColor: '#000000',
        color: '#000000',
        weight: 1,
        fillOpacity: 1,
        interactive: false,
      });
      markersGroup.addLayer(dot);
    });

    if (lineLatLngs.length > 0) {
      polyline.setLatLngs(lineLatLngs);
    }

    const center = frameCenter || getRouteCenterLatLng();
    const bounds = getFrameLatLngBounds(center);

    const timer = setTimeout(() => {
      if (previewMapRef.current) {
        previewMapRef.current.invalidateSize({ animate: false });
        previewMapRef.current.fitBounds(bounds, { padding: [10, 10], animate: false });
      }
    }, 80);

    return () => clearTimeout(timer);
  }, [
    isPrintModalOpen,
    pointPunto,
    paperFormat,
    paperOrientation,
    printScale,
    customScaleValue,
    isCustomScale,
    frameCenter,
    points,
    selectedRoute,
    crsSystem,
    crsDom,
  ]);

  // Çıktı Haritasını Tüm Noktalara Sığdır
  const handlePreviewFitAll = () => {
    if (!previewMapRef.current) return;
    const pts = selectedRoute.length > 0 ? selectedRoute : points;
    const valid = pts
      .map((p) => convertPointToWGS84(p, crsSystem, crsDom))
      .filter((c) => c.lat !== 0 || c.lon !== 0)
      .map((c) => [c.lat, c.lon] as [number, number]);
    if (valid.length > 0) {
      previewMapRef.current.fitBounds(L.latLngBounds(valid), { padding: [25, 25], animate: true });
      const c = previewMapRef.current.getCenter();
      setFrameCenter([c.lat, c.lng]);
      showToast('Çıktı haritası tüm noktaları kapsayacak şekilde odaklandı');
    }
  };

  // Haritayı seçilen kağıt boyutu, ölçek ve çerçeveye göre tam sayfa yazdır / PDF
  const handlePrintMap = () => {
    const isA3 = paperFormat === 'A3';
    const isPortrait = paperOrientation === 'portrait';
    const paperName = isA3 ? 'a3' : 'a4';
    const orientation = isPortrait ? 'portrait' : 'landscape';

    // Dinamik landscape/portrait @page stilini ekle
    let printStyle = document.getElementById('map-print-page-style') as HTMLStyleElement | null;
    if (!printStyle) {
      printStyle = document.createElement('style');
      printStyle.id = 'map-print-page-style';
      document.head.appendChild(printStyle);
    }
    printStyle.innerHTML = `@page { size: ${paperName} ${orientation}; margin: 0; }`;

    // Sadece CAD harita ekranını / paftayı yazdırma moduna al
    document.body.classList.add('print-map-only');

    const center = frameCenter || getRouteCenterLatLng();
    const frameBounds = getFrameLatLngBounds(center);

    if (previewMapRef.current) {
      previewMapRef.current.invalidateSize({ animate: false });
      previewMapRef.current.fitBounds(frameBounds, { padding: [10, 10], animate: false });
    }
    if (leafletMapRef.current) {
      leafletMapRef.current.invalidateSize({ animate: false });
      leafletMapRef.current.fitBounds(frameBounds, { padding: [10, 10], animate: false });
    }

    const cleanup = () => {
      document.body.classList.remove('print-map-only');
      const styleTag = document.getElementById('map-print-page-style');
      if (styleTag) styleTag.remove();

      if (previewMapRef.current) {
        previewMapRef.current.invalidateSize({ animate: false });
        previewMapRef.current.fitBounds(frameBounds, { padding: [10, 10], animate: false });
      }
      if (leafletMapRef.current) {
        leafletMapRef.current.invalidateSize({ animate: false });
        updateScale();
      }
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);

    setTimeout(() => {
      if (previewMapRef.current) {
        previewMapRef.current.invalidateSize({ animate: false });
        previewMapRef.current.fitBounds(frameBounds, { padding: [10, 10], animate: false });
      }
      window.print();
      setTimeout(cleanup, 2500);
    }, 180);
  };

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
      {/* Top Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3 no-print">
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

          <button
            onClick={handleOpenPrintModal}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg shadow transition flex items-center gap-1.5 cursor-pointer no-print"
            title="Harita yazdırma ve pafta ayarları penceresini aç"
          >
            <Printer className="w-3.5 h-3.5 text-sky-400" />
            <span>Haritayı Yazdır / PDF</span>
          </button>
        </div>
      </div>

      {/* Info Status Banner */}
      <div className="bg-slate-100 text-slate-700 px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between font-medium no-print">
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
        <div className="lg:col-span-3 h-[520px] rounded-xl overflow-hidden border border-slate-200 shadow-inner relative z-0 map-container-print">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Leaflet Harita Ekranının Üzerindeki Eylem Butonları */}
          <div className="absolute top-3 right-3 z-400 flex items-center gap-1.5 flex-wrap no-print">
            <button
              onClick={handleOpenPrintModal}
              className="bg-slate-900/90 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg border border-slate-700 shadow-md flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition backdrop-blur-xs"
              title="Harita yazdırma ve pafta ayarları penceresini aç"
            >
              <Printer className="w-3.5 h-3.5 text-sky-400" />
              <span>Haritayı Yazdır / PDF</span>
            </button>

            <button
              onClick={handleZoomToExtents}
              className="bg-white/95 hover:bg-white text-slate-700 hover:text-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-300 shadow-md flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition"
              title="Tüm noktaları ve güzergahı ekrana sığdır (Limit Ekran)"
            >
              <Maximize2 className="w-3.5 h-3.5 text-sky-600" />
              <span>Limit Ekran</span>
            </button>
          </div>

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
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col h-[520px] no-print">
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

      {/* Harita Baskı ve Çıktı Düzenleme Seçenekleri Popup Modalı */}
      {isPrintModalOpen && (
        <div
          className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto no-print"
          onClick={handleClosePrintModal}
        >
          <div
            className="bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 max-w-6xl w-full max-h-[94vh] flex flex-col overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                    Harita Baskı ve Çıktı Düzenleme Seçenekleri
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500">
                    Nokta punto büyüklüğü, kağıt formatı ve ölçek ayarlarını düzenleyin; çıktı haritasını anlık önizleyin.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClosePrintModal}
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg transition cursor-pointer"
                title="Kapat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: 2 Kolonlu Düzen (Sol: Parametreler, Sağ: Çıktı Haritası) */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 min-h-0 overflow-y-auto custom-scrollbar">
              {/* Sol Kolon: Baskı ve Pafta Seçenekleri */}
              <div className="lg:col-span-5 flex flex-col gap-3 overflow-y-auto max-h-[75vh] pr-1 custom-scrollbar">
                {/* 1. Seçenek: Nokta Adı Büyüklüğü (x punto) */}
                <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Type className="w-4 h-4 text-sky-600" />
                      <span>1. Nokta Adı Büyüklüğü</span>
                    </label>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 border border-sky-200">
                      {pointPunto === 'auto' ? 'Otomatik (Dinamik)' : `${pointPunto} punto`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={pointPunto}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPointPunto(val === 'auto' ? 'auto' : parseInt(val, 10));
                      }}
                      className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none shadow-2xs"
                    >
                      <option value="auto">Otomatik (Dinamik Zoom)</option>
                      <option value="8">8 Punto (Çok Küçük)</option>
                      <option value="9">9 Punto (Kompakt)</option>
                      <option value="10">10 Punto (Standart Harita)</option>
                      <option value="11">11 Punto</option>
                      <option value="12">12 Punto (Okunaklı)</option>
                      <option value="14">14 Punto (Büyük)</option>
                      <option value="16">16 Punto (Geniş Pafta)</option>
                      <option value="18">18 Punto (Ekstra Büyük)</option>
                      <option value="20">20 Punto</option>
                      <option value="24">24 Punto (Maksimum)</option>
                    </select>

                    <div className="flex items-center gap-0.5 bg-white p-0.5 rounded-lg border border-slate-300 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => {
                          if (pointPunto === 'auto') setPointPunto(9);
                          else setPointPunto(Math.max(6, pointPunto - 1));
                        }}
                        className="w-7 h-7 flex items-center justify-center text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer"
                        title="Puntoyu Azalt"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (pointPunto === 'auto') setPointPunto(11);
                          else setPointPunto(Math.min(24, pointPunto + 1));
                        }}
                        className="w-7 h-7 flex items-center justify-center text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer"
                        title="Puntoyu Artır"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Punto Slider */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-[10px] text-slate-500 font-mono font-medium">6pt</span>
                    <input
                      type="range"
                      min="6"
                      max="24"
                      step="1"
                      value={pointPunto === 'auto' ? 10 : pointPunto}
                      onChange={(e) => setPointPunto(parseInt(e.target.value, 10))}
                      className="flex-1 accent-sky-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-500 font-mono font-medium">24pt</span>
                  </div>
                </div>

                {/* 2. Seçenek: Kağıt Boyutu: A3 / A4 ve Yönelim: Yatay / Dikey */}
                <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-sky-600" />
                      <span>2. Kağıt Boyutu ve Yönelim</span>
                    </label>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {paperFormat} {paperOrientation === 'landscape' ? 'Yatay' : 'Dikey'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Kağıt Ebatı */}
                    <div>
                      <span className="text-[10px] font-semibold text-slate-600 block mb-1">
                        Kağıt Boyutu:
                      </span>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={() => setPaperFormat('A4')}
                          className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition cursor-pointer flex flex-col items-center leading-tight ${
                            paperFormat === 'A4'
                              ? 'bg-sky-600 border-sky-600 text-white shadow-xs'
                              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span>A4</span>
                          <span
                            className={`text-[9px] font-normal font-mono ${
                              paperFormat === 'A4' ? 'text-sky-100' : 'text-slate-400'
                            }`}
                          >
                            297×210 mm
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaperFormat('A3')}
                          className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition cursor-pointer flex flex-col items-center leading-tight ${
                            paperFormat === 'A3'
                              ? 'bg-sky-600 border-sky-600 text-white shadow-xs'
                              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span>A3</span>
                          <span
                            className={`text-[9px] font-normal font-mono ${
                              paperFormat === 'A3' ? 'text-sky-100' : 'text-slate-400'
                            }`}
                          >
                            420×297 mm
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Yönelim */}
                    <div>
                      <span className="text-[10px] font-semibold text-slate-600 block mb-1">
                        Yönelim:
                      </span>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={() => setPaperOrientation('landscape')}
                          className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition cursor-pointer flex flex-col items-center leading-tight ${
                            paperOrientation === 'landscape'
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span>Yatay</span>
                          <span
                            className={`text-[9px] font-normal ${
                              paperOrientation === 'landscape' ? 'text-indigo-100' : 'text-slate-400'
                            }`}
                          >
                            Landscape
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaperOrientation('portrait')}
                          className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition cursor-pointer flex flex-col items-center leading-tight ${
                            paperOrientation === 'portrait'
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span>Dikey</span>
                          <span
                            className={`text-[9px] font-normal ${
                              paperOrientation === 'portrait' ? 'text-indigo-100' : 'text-slate-400'
                            }`}
                          >
                            Portrait
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Seçenek: Harita Çıktı Ölçeği (1/25.000 vs.) */}
                <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-sky-600" />
                      <span>3. Harita Çıktı Ölçeği</span>
                    </label>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                      1/{getFrameCoverageMeters().effectiveScale.toLocaleString('tr-TR')}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <select
                      value={isCustomScale ? 'custom' : printScale}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'custom') {
                          setIsCustomScale(true);
                        } else if (val === 'auto') {
                          setIsCustomScale(false);
                          setPrintScale('auto');
                        } else {
                          setIsCustomScale(false);
                          setPrintScale(parseInt(val, 10));
                        }
                      }}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono font-medium focus:border-sky-500 outline-none shadow-2xs"
                    >
                      <option value="auto">Otomatik (Güzergaha En Uygun)</option>
                      <option value="1000">1 / 1.000 (Büyük Ölçek / Detay)</option>
                      <option value="2000">1 / 2.000</option>
                      <option value="5000">1 / 5.000 (Kadastro / İmar)</option>
                      <option value="10000">1 / 10.000</option>
                      <option value="20000">1 / 20.000</option>
                      <option value="25000">1 / 25.000 (Standart Topografik)</option>
                      <option value="50000">1 / 50.000</option>
                      <option value="100000">1 / 100.000 (Bölgesel Genel)</option>
                      <option value="custom">Özel Ölçek Belirle...</option>
                    </select>

                    {/* Hızlı Ölçek Butonları */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {[5000, 10000, 25000, 50000].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            setIsCustomScale(false);
                            setPrintScale(s);
                          }}
                          className={`px-2 py-0.5 text-[10px] font-mono rounded-md border transition cursor-pointer ${
                            !isCustomScale && printScale === s
                              ? 'bg-sky-600 border-sky-600 text-white font-bold shadow-2xs'
                              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          1/{s >= 1000 ? `${s / 1000}k` : s}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomScale(false);
                          setPrintScale('auto');
                        }}
                        className={`px-2 py-0.5 text-[10px] font-mono rounded-md border transition cursor-pointer ${
                          !isCustomScale && printScale === 'auto'
                            ? 'bg-emerald-600 border-emerald-600 text-white font-bold shadow-2xs'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        Otomatik
                      </button>
                    </div>

                    {isCustomScale ? (
                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="text-xs font-mono text-slate-600 font-semibold">1 /</span>
                        <input
                          type="number"
                          step="500"
                          min="500"
                          max="500000"
                          value={customScaleValue}
                          onChange={(e) =>
                            setCustomScaleValue(Math.max(100, parseInt(e.target.value || '1000', 10)))
                          }
                          className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-mono focus:border-sky-500 outline-none"
                          placeholder="Örn. 25000"
                        />
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-500 flex items-center justify-between pt-0.5">
                        <span>Arazide Kapsam Alanı:</span>
                        <span className="font-mono font-bold text-slate-700">
                          {(getFrameCoverageMeters().widthMeters / 1000).toFixed(2)} km ×{' '}
                          {(getFrameCoverageMeters().heightMeters / 1000).toFixed(2)} km
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Çıktı Haritası Kontrolleri & Altlık Seçimi */}
                <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700">
                      Çıktı Haritası Navigasyonu & Altlık:
                    </span>
                    <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 text-[10px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setMapType('osm')}
                        className={`px-2 py-0.5 rounded transition ${
                          mapType === 'osm' ? 'bg-sky-600 text-white' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Sokak
                      </button>
                      <button
                        type="button"
                        onClick={() => setMapType('hybrid')}
                        className={`px-2 py-0.5 rounded transition ${
                          mapType === 'hybrid' ? 'bg-sky-600 text-white' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Uydu
                      </button>
                      <button
                        type="button"
                        onClick={() => setMapType('grid')}
                        className={`px-2 py-0.5 rounded transition ${
                          mapType === 'grid' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Izgara
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={handleCenterFrameOnRoute}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                      title="Çıktı alanını güzergah merkezine taşı"
                    >
                      <Target className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Güzergaha Ortala</span>
                    </button>

                    <button
                      type="button"
                      onClick={handlePreviewFitAll}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                      title="Tüm noktaları çıktı haritasına sığdır"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-sky-600" />
                      <span>Tüm Noktaları Sığdır</span>
                    </button>
                  </div>
                </div>

                {/* Özet Bilgi Kartı */}
                <div className="bg-sky-50/70 rounded-xl p-2.5 border border-sky-100 text-[11px] text-sky-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-sky-600 shrink-0" />
                    <span>
                      Güzergah: <b>{points.length}</b> Nokta • ~
                      <b>{(getTotalRouteDistanceMeters() / 1000).toFixed(2)} km</b>
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-sky-700 font-bold">{crsSystem}</span>
                </div>
              </div>

              {/* Sağ Kolon: Çıktı Haritası (Baskı Önizleme) */}
              <div className="lg:col-span-7 flex flex-col min-h-[460px] lg:min-h-0 h-full space-y-2">
                {/* Önizleme Üst Bilgi Barı */}
                <div className="flex items-center justify-between px-1 text-xs no-print-preview">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-sky-600" />
                      <span>Çıktı Haritası Önizleme</span>
                    </span>
                    <span className="text-[10px] text-slate-500 hidden sm:inline">
                      (Yazdırılacak nihai pafta görünümü)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {paperFormat} {paperOrientation === 'landscape' ? 'Yatay' : 'Dikey'}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      1/{getFrameCoverageMeters().effectiveScale.toLocaleString('tr-TR')}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                      {pointPunto === 'auto' ? 'Oto Punto' : `${pointPunto} pt`}
                    </span>
                  </div>
                </div>

                {/* Çizim Masası / Pafta Önizleme Alanı */}
                <div className="flex-1 bg-slate-100 p-2 sm:p-3 rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden relative min-h-[380px]">
                  {/* CAD Pafta Kağıdı (Paper Sheet) */}
                  <div
                    className={`map-print-target bg-white shadow-xl border border-slate-300 rounded-lg overflow-hidden flex flex-col relative transition-all duration-200 ${
                      paperOrientation === 'landscape'
                        ? 'w-full aspect-[297/210] max-h-[480px]'
                        : 'h-full aspect-[210/297] max-h-[480px] w-auto mx-auto'
                    }`}
                  >
                    {/* Antet (CAD Pafta Başlığı) */}
                    <div className="bg-slate-900 text-white px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-xs shrink-0 select-none">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                        <div>
                          <div className="font-bold text-[11px] tracking-wide leading-tight text-white uppercase">
                            GNSS NİVELMAN VE GÜZERGAH PLANI
                          </div>
                          <div className="text-[9px] text-slate-400 leading-none">
                            {points.length} Nokta • Güzergah: ~{(getTotalRouteDistanceMeters() / 1000).toFixed(2)} km
                          </div>
                        </div>
                      </div>

                      <div className="text-right text-[9px] font-mono leading-tight text-slate-300">
                        <span className="text-sky-300 font-bold">1/{getFrameCoverageMeters().effectiveScale.toLocaleString('tr-TR')}</span>
                        <span className="mx-1">•</span>
                        <span>{paperFormat} {paperOrientation === 'landscape' ? 'Yatay' : 'Dikey'}</span>
                        <span className="mx-1">•</span>
                        <span>{crsSystem}</span>
                      </div>
                    </div>

                    {/* Leaflet Harita Alanı */}
                    <div className="flex-1 w-full relative overflow-hidden bg-slate-50">
                      <div ref={previewMapContainerRef} className="w-full h-full" />

                      {/* Kuzey Oku (North Arrow) */}
                      <div
                        className="absolute top-2.5 right-2.5 z-400 bg-white/95 backdrop-blur-xs text-slate-950 px-2 py-1 rounded border border-slate-300 shadow-sm flex items-center gap-1 font-bold text-[10px] pointer-events-none select-none"
                        title="Kuzey Yönü"
                      >
                        <span className="text-slate-950 font-black text-xs leading-none">▲</span>
                        <span className="tracking-wider">K</span>
                      </div>

                      {/* Çizgi Ölçek (Dynamic Linear Scale Bar) */}
                      <div
                        className="absolute bottom-2 left-2 z-400 bg-white/95 backdrop-blur-xs text-slate-800 px-2 py-1 rounded border border-slate-300 shadow-sm flex flex-col items-center pointer-events-none select-none"
                        title="Çizgi Ölçek"
                      >
                        <div
                          className="flex justify-between text-[8px] font-mono font-bold text-slate-800 leading-none mb-0.5"
                          style={{ width: `${previewScale.width}px` }}
                        >
                          <span>0</span>
                          <span>{previewScale.label}</span>
                        </div>
                        <div
                          className="h-1 border border-slate-900 relative flex overflow-hidden"
                          style={{ width: `${previewScale.width}px` }}
                        >
                          <div className="w-1/4 h-full bg-slate-950" />
                          <div className="w-1/4 h-full bg-white border-l border-slate-900" />
                          <div className="w-1/4 h-full bg-slate-950 border-l border-slate-900" />
                          <div className="w-1/4 h-full bg-white border-l border-slate-900" />
                        </div>
                      </div>
                    </div>

                    {/* Lejant ve Alt Bilgi Şeridi */}
                    <div className="bg-slate-50 border-t border-slate-200 px-3 py-1 flex items-center justify-between text-[9px] text-slate-600 shrink-0 select-none">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 font-semibold">
                          <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
                          <span>1. Başlangıç (A)</span>
                        </span>
                        <span className="flex items-center gap-1 font-semibold">
                          <span className="w-2 h-2 rounded-full bg-rose-600 inline-block"></span>
                          <span>Bitiş (B)</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-3.5 h-0.5 bg-sky-600 inline-block"></span>
                          <span>Güzergah Hattı</span>
                        </span>
                      </div>

                      <div className="font-mono text-[9px] text-slate-500">
                        Tarih: {new Date().toLocaleDateString('tr-TR')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/80 shrink-0">
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                Haritayı yazdırdığınızda yukarıda önizlenen pafta tam sayfa olarak yazıcı veya PDF çıktısına aktarılır.
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={handleClosePrintModal}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
                >
                  Vazgeç
                </button>

                <button
                  type="button"
                  onClick={handlePrintMap}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-white" />
                  <span>Haritayı Yazdır / PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
