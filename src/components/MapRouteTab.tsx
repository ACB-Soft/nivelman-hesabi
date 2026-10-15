import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { toPng } from 'html-to-image';
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
  MapPin,
  Maximize2,
  Type,
  Download,
  Loader2,
  FileImage,
  Sliders,
  Compass,
  ZoomIn,
  ZoomOut,
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
  const a4SheetRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const lastPointsSignatureRef = useRef<string>('');

  const [selectedRoute, setSelectedRoute] = useState<GNSSPoint[]>([]);
  const [isSelectionActive, setIsSelectionActive] = useState(false);
  const [mapType, setMapType] = useState<'satellite' | 'osm' | 'grid'>('satellite');
  const [scale, setScale] = useState<{ width: number; label: string }>({ width: 75, label: '100 m' });
  const [currentZoom, setCurrentZoom] = useState<number>(6);

  // 1- Nokta Adı Büyüklüğü (Varsayılan 1 punto)
  const [pointPunto, setPointPunto] = useState<number | 'auto'>(1);

  // A4 Kağıt Yönelimi: Yatay (297x210 mm) / Dikey (210x297 mm)
  const [paperOrientation, setPaperOrientation] = useState<'landscape' | 'portrait'>('landscape');

  // PNG Dışa Aktarma Yükleniyor Durumu
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Harita Ekranının Yüksekliğini İzleme (Seçim Sırası Menüsünü Harita Ekranı ile Birebir Eşitleme)
  const [mapScreenHeight, setMapScreenHeight] = useState<number | null>(null);

  useEffect(() => {
    const updateHeight = () => {
      if (a4SheetRef.current) {
        if (window.innerWidth >= 1024) {
          setMapScreenHeight(a4SheetRef.current.offsetHeight);
        } else {
          setMapScreenHeight(null);
        }
      }
    };

    updateHeight();

    const observer = new ResizeObserver(() => {
      updateHeight();
    });

    if (a4SheetRef.current) {
      observer.observe(a4SheetRef.current);
    }

    window.addEventListener('resize', updateHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  // Initialize selectedRoute with points order if not set
  useEffect(() => {
    if (points.length > 0 && selectedRoute.length === 0) {
      setSelectedRoute([...points]);
    }
  }, [points]);

  // Dynamic linear scale bar metrics from Leaflet map
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
        minZoom: 2,
        maxZoom: 22,
        zoomSnap: 0.25,
        zoomDelta: 0.25,
        wheelPxPerZoomLevel: 100,
        attributionControl: false,
        zoomControl: false,
      });

      // Varsayılan Saf Yüksek Çözünürlüklü Uydu Katmanı (lyrs=s, scale=2)
      const satelliteLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=s&scale=2&x={x}&y={y}&z={z}', {
        maxZoom: 22,
        maxNativeZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        crossOrigin: true,
        tileSize: 256,
      });

      satelliteLayer.addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      const line = L.polyline([], {
        color: '#dc2626',
        weight: 3.5,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      leafletMapRef.current = map;
      markersLayerRef.current = markersGroup;
      polylineRef.current = line;

      const onZoom = () => {
        setCurrentZoom(map.getZoom());
        updateScale();
      };

      map.on('zoom zoomend', onZoom);
      map.on('moveend resize', updateScale);
    }

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

    map.eachLayer((layer) => {
      if (layer instanceof L.GridLayer) {
        map.removeLayer(layer);
      }
    });

    if (mapType === 'satellite') {
      // Saf Uydu Görüntüsü (Hibrit görünümden çıkarıldı - lyrs=s, scale=2 ile ultra yüksek çözünürlük)
      L.tileLayer('https://{s}.google.com/vt/lyrs=s&scale=2&x={x}&y={y}&z={z}', {
        maxZoom: 22,
        maxNativeZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        crossOrigin: true,
        tileSize: 256,
      }).addTo(map);
    } else if (mapType === 'osm') {
      // Yüksek Çözünürlüklü Sokak Haritası (Retina / detectRetina aktif)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 22,
        maxNativeZoom: 19,
        subdomains: ['a', 'b', 'c'],
        crossOrigin: true,
        detectRetina: true,
      }).addTo(map);
    } else {
      // Modern High-Precision CAD Offline Grid Layer (100% canvas, 0 CORS constraints)
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

          // 4. Major grid axes (every 128px)
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

          // Grid lines are preserved, crosshairs (+) removed per user request
          return tile;
        },
      });

      new (OfflineCanvasGrid as any)({}).addTo(map);
    }
  }, [mapType]);

  // Invalidate map size when A4 orientation changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (leafletMapRef.current) {
        leafletMapRef.current.invalidateSize();
        updateScale();
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [paperOrientation]);

  // Redraw Markers and Polyline with Intelligent Collision Detection
  useEffect(() => {
    if (!leafletMapRef.current || !markersLayerRef.current || !polylineRef.current) return;

    const map = leafletMapRef.current;
    const markersGroup = markersLayerRef.current;
    const polyline = polylineRef.current;

    markersGroup.clearLayers();
    polyline.setLatLngs([]);

    if (points.length === 0) return;

    const latLngs: L.LatLngExpression[] = [];

    // 1- Punto büyüklüğü belirleme
    let baseFontSize = Math.max(9, Math.min(16, +(7.5 + (currentZoom - 6) * 0.7).toFixed(1)));
    if (pointPunto !== 'auto') {
      baseFontSize = Math.round(8 + pointPunto * 1.0);
    }

    // 2- Noktaları hazırla ve ekran piksel izdüşümlerini hesapla
    interface MarkerItem {
      pt: GNSSPoint;
      latLng: [number, number];
      proj: L.Point;
      fontSizePx: number;
      width: number;
      height: number;
      position: 'bottom' | 'top';
      isSelected: boolean;
      selIndex: number;
      dotClass: string;
      labelClass: string;
      labelText: string;
    }

    const items: MarkerItem[] = [];

    points.forEach((pt) => {
      const coords = convertPointToWGS84(pt, crsSystem, crsDom);
      if (coords.lat === 0 && coords.lon === 0) return;

      const latLng: [number, number] = [coords.lat, coords.lon];
      latLngs.push(latLng);

      const proj = map.project(L.latLng(coords.lat, coords.lon), currentZoom);

      const selIndex = selectedRoute.findIndex((sp) => sp.id === pt.id);
      const isSelected = selIndex !== -1;

      let dotClass = 'survey-marker-dot';
      let labelClass = 'survey-marker-label';
      const labelText = pt.id;

      if (isSelected) {
        if (selIndex === 0) {
          dotClass += ' start-dot';
          labelClass += ' start-label';
        } else if (selIndex === selectedRoute.length - 1 && selectedRoute.length === points.length) {
          dotClass += ' end-dot';
          labelClass += ' end-label';
        } else {
          labelClass += ' route-label';
        }
      }

      // Yaklaşık metin genişliği ve yüksekliği (çakışma tespiti için)
      const width = Math.max(18, labelText.length * (baseFontSize * 0.65) + 6);
      const height = baseFontSize * 1.25 + 4;

      items.push({
        pt,
        latLng,
        proj,
        fontSizePx: baseFontSize,
        width,
        height,
        position: 'bottom', // Varsayılan nokta altı
        isSelected,
        selIndex,
        dotClass,
        labelClass,
        labelText,
      });
    });

    // 3- Çakışma Tespiti ve Nokta İsmini Üste Alma Algoritması
    // Birbiriyle çakışan veya altındaki komşu noktayı kapatan yerlerde, nokta ismi noktanın üstüne yazdırılır
    const getLabelBox = (item: MarkerItem, pos: 'bottom' | 'top') => {
      const halfW = item.width / 2;
      if (pos === 'top') {
        return {
          x1: item.proj.x - halfW,
          y1: item.proj.y - 6 - item.height,
          x2: item.proj.x + halfW,
          y2: item.proj.y - 6,
        };
      } else {
        return {
          x1: item.proj.x - halfW,
          y1: item.proj.y + 6,
          x2: item.proj.x + halfW,
          y2: item.proj.y + 6 + item.height,
        };
      }
    };

    const getDotBox = (item: MarkerItem) => ({
      x1: item.proj.x - 5,
      y1: item.proj.y - 5,
      x2: item.proj.x + 5,
      y2: item.proj.y + 5,
    });

    const isBoxColliding = (
      b1: { x1: number; y1: number; x2: number; y2: number },
      b2: { x1: number; y1: number; x2: number; y2: number },
      margin = 2
    ) => {
      return !(
        b1.x2 + margin < b2.x1 ||
        b1.x1 - margin > b2.x2 ||
        b1.y2 + margin < b2.y1 ||
        b1.y1 - margin > b2.y2
      );
    };

    const evaluateCost = (
      index: number,
      candidatePos: 'bottom' | 'top',
      list: MarkerItem[]
    ) => {
      const box = getLabelBox(list[index], candidatePos);
      let cost = candidatePos === 'top' ? 0.05 : 0; // Varsayılan olarak altta kalma eğilimi

      for (let j = 0; j < list.length; j++) {
        if (j === index) continue;
        const other = list[j];
        const otherBox = getLabelBox(other, other.position);
        const otherDot = getDotBox(other);

        if (isBoxColliding(box, otherBox, 2)) {
          cost += 10;
        }
        if (isBoxColliding(box, otherDot, 2)) {
          cost += 15;
        }
      }
      return cost;
    };

    // Ekran üzerinde yukarıda (kuzeyde) olan noktalara (küçük y) öncelik vererek sıralı optimizasyon
    const sortedIndices = items.map((_, i) => i).sort((a, b) => items[a].proj.y - items[b].proj.y);

    for (let pass = 0; pass < 2; pass++) {
      for (const idx of sortedIndices) {
        const costBottom = evaluateCost(idx, 'bottom', items);
        const costTop = evaluateCost(idx, 'top', items);

        if (costTop < costBottom) {
          items[idx].position = 'top';
        } else if (costBottom <= costTop && items[idx].position === 'top') {
          items[idx].position = 'bottom';
        }
      }
    }

    // 4- Marker nesnelerini oluştur ve haritaya ekle
    items.forEach((item) => {
      const posClass = item.position === 'top' ? 'label-pos-top' : 'label-pos-bottom';

      // Nokta sembolü tam koordinatta, isim ise çakışmasız olarak altta ya da üstte ortalı
      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div class="survey-marker-container ${posClass}">
            <div class="${item.dotClass}"></div>
            <div class="${item.labelClass}" style="font-size: ${item.fontSizePx}px;">
              ${item.labelText}
            </div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker(item.latLng, { icon: customIcon });

      marker.on('click', () => {
        handleMarkerClick(item.pt);
      });

      marker.bindPopup(`
        <div style="font-family:sans-serif;font-size:12px;line-height:1.4">
          <b style="color:#ff0000;font-size:13px">${item.pt.id}</b><br/>
          <b>Sağa (Y):</b> ${item.pt.y.toFixed(4)} m<br/>
          <b>Yukarı (X):</b> ${item.pt.x.toFixed(4)} m<br/>
          <b>Elipsoid (h):</b> ${item.pt.h.toFixed(4)} m<br/>
          <b>Jeoit (N):</b> ${item.pt.n.toFixed(3)} m
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
        padding: [40, 40],
        animate: true,
      });
      setTimeout(updateScale, 200);
      showToast('Tüm güzergah limit ekrana sığdırıldı');
    }
  };

  // Toplam güzergah uzunluğu (metre)
  const getTotalRouteDistanceMeters = (): number => {
    const pts = selectedRoute.length > 0 ? selectedRoute : points;
    if (pts.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const dx = pts[i + 1].y - pts[i].y;
      const dy = pts[i + 1].x - pts[i].x;
      total += Math.sqrt(dx * dx + dy * dy);
    }
    return total;
  };

  // Punto ayar butonları (1-10 aralığında gezinme)
  const handlePuntoChange = (newPunto: number | 'auto') => {
    setPointPunto(newPunto);
  };

  const handleStepPunto = (delta: number) => {
    const current = pointPunto === 'auto' ? 1 : pointPunto;
    const nextVal = Math.min(10, Math.max(1, current + delta));
    setPointPunto(nextVal);
  };

  // Hassas Yakınlaştırma / Uzaklaştırma ve Ara Birimler (0.25 ve 1.0 adımları)
  const handleZoomStep = (delta: number) => {
    if (!leafletMapRef.current) return;
    const map = leafletMapRef.current;
    const current = map.getZoom();
    const nextVal = Math.max(2, Math.min(22, Math.round((current + delta) * 100) / 100));
    map.setZoom(nextVal);
  };

  // A4 Ekranının PNG Görseli Olarak İndirilmesi
  const handleDownloadPng = async () => {
    if (!a4SheetRef.current) return;

    try {
      setIsExporting(true);
      showToast('Harita PNG görseli hazırlanıyor...');

      // Haritanın son render durumunu garantile
      if (leafletMapRef.current) {
        leafletMapRef.current.invalidateSize({ animate: false });
      }

      await new Promise((resolve) => setTimeout(resolve, 250));

      const element = a4SheetRef.current;

      const dataUrl = await toPng(element, {
        cacheBust: true,
        pixelRatio: 3, // 3x Ultra HD yüksek çözünürlüklü ve net mühendislik çıktısı
        backgroundColor: '#ffffff',
        filter: (node: HTMLElement) => {
          // 'no-export' sınıfına sahip arayüz kontrol butonlarını PNG görseline dahil etme
          if (node?.classList && typeof node.classList.contains === 'function') {
            if (node.classList.contains('no-export')) return false;
          }
          return true;
        },
      });

      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `gnss_harita_${paperOrientation}_${dateStr}.png`;

      const downloadLink = document.createElement('a');
      downloadLink.download = filename;
      downloadLink.href = dataUrl;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();

      showToast('Harita görseli (Ultra HD PNG) başarıyla indirildi!');
    } catch (err: any) {
      console.error('Harita PNG indirme hatası:', err);
      if (mapType === 'satellite') {
        showToast('Uydu altlığı CORS kısıtlaması nedeniyle indirilemedi. Lütfen "Sokak" veya "Çevrimdışı Izgara" altlığına geçip tekrar deneyin.');
      } else {
        showToast('Harita görseli indirilirken hata oluştu: ' + (err?.message || 'Lütfen tekrar deneyin.'));
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
      {/* 1. Üst İşlem Çubuğu (Top Action Bar) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        {/* Altlık Katman Seçimi (Varsayılan: Uydu) */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setMapType('satellite')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1 ${
              mapType === 'satellite'
                ? 'bg-white text-sky-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Uydu
          </button>
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
            onClick={() => setMapType('grid')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1 ${
              mapType === 'grid'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Sıfır internet/ağ bağımlılığı - Yerel vektörel ızgara altlığı (PNG indirmede %100 garantili)"
          >
            <span>Çevrimdışı Izgara</span>
          </button>
        </div>

        {/* Güzergah ve Harita İndir Eylem Butonları */}
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
            className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg shadow transition flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Güzergahı Tabloya Aktar</span>
          </button>
        </div>
      </div>

      {/* 2. Ana Harita Üzerindeki Ayar ve Seçenekler Paneli */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Nokta Adı Büyüklüğü (Hızlı seçim butonları kaldırıldı, yalnızca stepper) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <Type className="w-4 h-4 text-sky-600" />
            <span>Nokta Adı Büyüklüğü:</span>
          </div>

          {/* Stepper Butonları (- / +) ve Rozet */}
          <div className="flex items-center bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden">
            <button
              onClick={() => handleStepPunto(-1)}
              disabled={pointPunto !== 'auto' && pointPunto <= 1}
              className="px-2.5 py-1 text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition font-bold cursor-pointer text-xs"
              title="1 punto küçült"
            >
              -
            </button>
            <span className="px-3 py-1 font-mono font-bold text-sky-800 text-xs min-w-[56px] text-center bg-sky-50/70 border-x border-slate-200">
              {pointPunto === 'auto' ? '1 pt' : `${pointPunto} pt`}
            </span>
            <button
              onClick={() => handleStepPunto(1)}
              disabled={pointPunto !== 'auto' && pointPunto >= 10}
              className="px-2.5 py-1 text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition font-bold cursor-pointer text-xs"
              title="1 punto büyüt"
            >
              +
            </button>
          </div>
        </div>

        {/* Hassas Yakınlaştırma (Ara Birimler), Limit Ekran ve Harita İndir (Limit Ekranın Sağında) */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Hassas Yakınlaştırma & Ara Birimler */}
          <div className="flex items-center bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden">
            <button
              onClick={() => handleZoomStep(-1)}
              className="px-2 py-1 text-slate-700 hover:bg-slate-100 font-bold transition cursor-pointer text-xs"
              title="1 kademe uzaklaştır (-1.0)"
            >
              -1
            </button>
            <button
              onClick={() => handleZoomStep(-0.25)}
              className="px-1.5 py-1 text-sky-700 hover:bg-sky-50 font-semibold text-[11px] border-l border-slate-200 transition cursor-pointer"
              title="Ara birim: Hassas uzaklaştır (-0.25)"
            >
              -0.25
            </button>
            <span className="px-2 py-1 font-mono font-bold text-sky-900 text-xs min-w-[54px] text-center bg-sky-50/70 border-x border-slate-200">
              {currentZoom.toFixed(2)}x
            </span>
            <button
              onClick={() => handleZoomStep(0.25)}
              className="px-1.5 py-1 text-sky-700 hover:bg-sky-50 font-semibold text-[11px] border-r border-slate-200 transition cursor-pointer"
              title="Ara birim: Hassas yakınlaştır (+0.25)"
            >
              +0.25
            </button>
            <button
              onClick={() => handleZoomStep(1)}
              className="px-2 py-1 text-slate-700 hover:bg-slate-100 font-bold transition cursor-pointer text-xs"
              title="1 kademe yakınlaştır (+1.0)"
            >
              +1
            </button>
          </div>

          {/* Limit Ekran Butonu */}
          <button
            onClick={handleZoomToExtents}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-300 shadow-2xs transition flex items-center gap-1 text-xs font-medium cursor-pointer"
            title="Tüm noktaları ekrana sığdır (Limit Ekran)"
          >
            <Maximize2 className="w-3.5 h-3.5 text-sky-600" />
            <span>Limit Ekran</span>
          </button>

          {/* Harita İndir Butonu - Limit Ekran butonunun hemen sağında */}
          <button
            onClick={handleDownloadPng}
            disabled={isExporting}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-75 text-white rounded-lg shadow-2xs transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            title="Harita ekranını yüksek çözünürlüklü PNG görseli olarak indir"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Hazırlanıyor...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Harita İndir</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Info Status Banner */}
      <div className="bg-slate-100 text-slate-700 px-3.5 py-2 rounded-xl text-xs flex items-center justify-between font-medium">
        <span className="flex items-center gap-2">
          <Info className="w-4 h-4 text-sky-600 shrink-0" />
          <span>
            {isSelectionActive ? (
              selectedRoute.length === 0 ? (
                'Harita üzerinden BAŞLANGIÇ NOKTASINA (A) tıklayın.'
              ) : selectedRoute.length < points.length ? (
                `Sıradaki (${selectedRoute.length + 1}.) noktaya harita üzerinden tıklayın.`
              ) : (
                'Tüm noktalar seçildi! "Güzergahı Tabloya Aktar" butonuna basarak sıralamayı güncelleyebilirsiniz.'
              )
            ) : (
              'Harita ekranı yatay formattadır. "Harita İndir" butonu ile pafta görselini PNG olarak indirebilirsiniz.'
            )}
          </span>
        </span>
        <span className="bg-sky-100 text-sky-800 font-mono font-bold px-2.5 py-0.5 rounded-md text-[11px] shrink-0 ml-2">
          {selectedRoute.length} / {points.length} Nokta
        </span>
      </div>

      {/* 3. Harita Alanı & Güzergah Sıralama Listesi (Yükseklikleri Harita Ekranı ile Birebir Eşitlendi) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        {/* Harita Ekranı (A4 Yatay: 297/210 mm) */}
        <div className="lg:col-span-3">
          <div
            ref={a4SheetRef}
            className="w-full aspect-[297/210] max-h-[580px] bg-white shadow-xs border border-slate-200 rounded-2xl overflow-hidden flex flex-col relative isolate z-0 transition-all duration-200"
          >
            {/* Açık Tema Pafta Anteti - Ortalanmış Başlık */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-center text-xs shrink-0 select-none relative z-10">
              <h3 className="font-bold text-[11px] sm:text-xs tracking-wider leading-tight text-slate-800 uppercase text-center">
                GNSS NİVELMANI GÜZERGAH PLANI
              </h3>
            </div>

            {/* Leaflet Harita Alanı */}
            <div className="flex-1 w-full relative overflow-hidden bg-slate-50 isolate">
              <div ref={mapContainerRef} className="w-full h-full relative z-0" />

              {/* Geodetik Kuzey Oku ve Çizgi Ölçek (Kuzey Oku Ölçeğin Solunda - PNG Çıktısına Dahildir) */}
              <div className="absolute bottom-2.5 left-2.5 z-20 flex items-center gap-1.5 pointer-events-none select-none">
                {/* Kuzey Oku */}
                <div
                  className="bg-white/95 backdrop-blur-xs text-slate-900 px-2 py-1 rounded border border-slate-300 shadow-sm flex items-center gap-1 font-bold text-[10px]"
                  title="Kuzey Yönü"
                >
                  <span className="text-slate-950 font-black text-xs leading-none">▲</span>
                  <span className="tracking-wider">K</span>
                </div>

                {/* Dinamik Çizgi Ölçek */}
                <div
                  className="bg-white/95 backdrop-blur-xs text-slate-800 px-2 py-1 rounded border border-slate-300 shadow-sm flex flex-col items-center"
                  title="Çizgi Ölçek"
                >
                  <div
                    className="flex justify-between text-[8px] font-mono font-bold text-slate-800 leading-none mb-0.5"
                    style={{ width: `${scale.width}px` }}
                  >
                    <span>0</span>
                    <span>{scale.label}</span>
                  </div>
                  <div
                    className="h-1 border border-slate-900 relative flex overflow-hidden"
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

            {/* Pafta Lejantı & Alt Bilgi Şeridi */}
            <div className="bg-slate-50 border-t border-slate-200 px-3.5 py-1.5 flex items-center justify-between text-[9px] text-slate-600 shrink-0 select-none relative z-10">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1 font-semibold text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
                  <span>1. Başlangıç (A)</span>
                </span>
                <span className="flex items-center gap-1 font-semibold text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-rose-600 inline-block"></span>
                  <span>Bitiş (B)</span>
                </span>
                <span className="flex items-center gap-1.5 text-slate-700">
                  <span className="w-3.5 h-0.5 bg-rose-600 inline-block"></span>
                  <span>Güzergah Hattı</span>
                  <span className="font-semibold text-slate-800 ml-0.5">
                    (~{(getTotalRouteDistanceMeters() / 1000).toFixed(2)} km)
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Güzergah Sıralama Paneli (Yüksekliği harita ekranı ile birebir eşitlendi) */}
        <div
          style={
            mapScreenHeight
              ? {
                  height: `${mapScreenHeight}px`,
                  maxHeight: `${mapScreenHeight}px`,
                  minHeight: `${mapScreenHeight}px`,
                }
              : undefined
          }
          className="lg:col-span-1 bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col min-h-0 overflow-hidden"
        >
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between shrink-0">
            <span className="flex items-center gap-1.5">
              <ListOrdered className="w-4 h-4 text-sky-600" />
              <span>Seçim Sırası</span>
            </span>
            <span className="text-[10px] text-slate-400 font-normal">Sırasıyla</span>
          </h4>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1 min-h-0">
            {selectedRoute.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-xs py-10 font-sans">
                <MapPin className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                <span>Henüz harita üzerinden nokta seçilmedi veya sıra boş.</span>
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
                    className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between text-xs font-mono"
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
