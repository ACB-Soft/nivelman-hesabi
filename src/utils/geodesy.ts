import proj4 from 'proj4';
import * as XLSX from 'xlsx';
import { GNSSPoint, ProcessedPoint, AdjustmentResult, CRSSystem } from '../types/gnss';

export function getProj4Def(system: CRSSystem, domVal: number | string): string {
  const dom = domVal ? Number(domVal) : 33;

  if (system === 'itrf3') {
    return `+proj=tmerc +lat_0=0 +lon_0=${dom} +k=1 +x_0=500000 +y_0=0 +ellps=GRS80 +units=m +no_defs`;
  } else if (system === 'utm6') {
    return `+proj=tmerc +lat_0=0 +lon_0=${dom} +k=0.9996 +x_0=500000 +y_0=0 +ellps=WGS84 +units=m +no_defs`;
  } else if (system === 'ed50') {
    return `+proj=tmerc +lat_0=0 +lon_0=${dom} +k=1 +x_0=500000 +y_0=0 +ellps=intl +towgs84=-87,-98,-121,0,0,0,0 +units=m +no_defs`;
  }
  return '+proj=longlat +datum=WGS84 +no_defs';
}

export function convertPointToWGS84(
  pt: { x: number; y: number },
  system: CRSSystem,
  domVal: number | string
): { lat: number; lon: number } {
  const sourceCRS = getProj4Def(system, domVal);
  const wgs84CRS = '+proj=longlat +datum=WGS84 +no_defs';
  try {
    const converted = proj4(sourceCRS, wgs84CRS, [pt.y, pt.x]);
    return { lon: converted[0], lat: converted[1] };
  } catch (e) {
    console.error('Proj4 conversion error:', e);
    return { lon: 0, lat: 0 };
  }
}

export function performAdjustment(
  points: GNSSPoint[],
  H_start: number,
  H_end: number,
  m_coef: number = 12,
  system: CRSSystem = 'itrf3',
  domVal: number = 33
): AdjustmentResult | null {
  if (!points || points.length < 2) return null;

  let totalDist = 0;
  const processedPoints: ProcessedPoint[] = [];

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    const rawH = (pt.h || 0) - (pt.n || 0);

    let segDist = 0;
    if (i > 0) {
      const prev = points[i - 1];
      const dy = (pt.y || 0) - (prev.y || 0);
      const dx = (pt.x || 0) - (prev.x || 0);
      segDist = Math.sqrt(dy * dy + dx * dx);
      totalDist += segDist;
    }

    const coords = convertPointToWGS84(pt, system, domVal);

    processedPoints.push({
      id: pt.id || `P${i + 1}`,
      y: pt.y || 0,
      x: pt.x || 0,
      h: pt.h || 0,
      n: pt.n || 0,
      knownH: i === 0 ? H_start : i === points.length - 1 ? H_end : null,
      rawH: rawH,
      segDist: segDist,
      cumDist: totalDist,
      correctionMm: 0,
      cumCorrectionM: 0,
      adjustedH: 0,
      lat: coords.lat,
      lon: coords.lon,
    });
  }

  const H_raw_start = processedPoints[0].rawH;
  const H_raw_end = processedPoints[processedPoints.length - 1].rawH;
  const deltaH_gnss = H_raw_end - H_raw_start;
  const deltaH_real = H_end - H_start;

  // Closing error: W = DeltaH_real - DeltaH_gnss
  const W_meters = deltaH_real - deltaH_gnss;
  const W_mm = W_meters * 1000.0;

  const totalDistKm = totalDist / 1000.0;
  // Tolerance T = m * sqrt(S_km)
  const T_mm = m_coef * Math.sqrt(totalDistKm > 0 ? totalDistKm : 1.0);
  const startOffset = H_start - H_raw_start;
  const offsetMm = startOffset * 1000.0;

  let currentCumClosureMm = 0;

  for (let i = 0; i < processedPoints.length; i++) {
    if (i === 0) {
      processedPoints[i].correctionMm = 0;
      processedPoints[i].cumCorrectionM = startOffset;
      processedPoints[i].adjustedH = H_start;
    } else {
      const v_i_meters = totalDist > 0 ? W_meters * (processedPoints[i].segDist / totalDist) : 0;
      const v_i_mm = v_i_meters * 1000.0;
      currentCumClosureMm += v_i_mm;

      processedPoints[i].correctionMm = v_i_mm;
      processedPoints[i].cumCorrectionM = startOffset + currentCumClosureMm / 1000.0;
      processedPoints[i].adjustedH = processedPoints[i].rawH + processedPoints[i].cumCorrectionM;
    }
  }

  return {
    points: processedPoints,
    H_start,
    H_end,
    totalDist,
    totalDistKm,
    deltaH_real,
    deltaH_gnss,
    startOffset,
    offsetMm,
    W_meters,
    W_mm,
    T_mm,
    m_coef,
    isAccepted: Math.abs(W_mm) <= T_mm,
  };
}

export function exportAdjustmentToExcel(res: AdjustmentResult) {
  const statusText = res.isAccepted ? 'KABUL (Tolerans İçi)' : 'RED (Tolerans Aşıldı)';

  const summaryRows = [
    ['GNSS NİVELMAN HESABI DENGELEME ÇİZELGESİ'],
    [],
    ['Başlangıç Noktası (A):', `${res.points[0].id} (H = ${res.H_start.toFixed(4)} m)`],
    ['Bitiş Noktası (B):', `${res.points[res.points.length - 1].id} (H = ${res.H_end.toFixed(4)} m)`],
    ['Toplam Nokta Sayısı:', `${res.points.length} adet`],
    ['Toplam Güzergah Uzunluğu:', `${res.totalDist.toFixed(2)} m (${res.totalDistKm.toFixed(3)} km)`],
    ['Teorik Kot Farkı (ΔHgerçek):', `${res.deltaH_real >= 0 ? '+' : ''}${res.deltaH_real.toFixed(4)} m`],
    ['GNSS Ölçülen Kot Farkı (ΔHGNSS):', `${res.deltaH_gnss >= 0 ? '+' : ''}${res.deltaH_gnss.toFixed(4)} m`],
    ['Başlangıç Datum Offset (ΔHoffset):', `${res.startOffset >= 0 ? '+' : ''}${res.startOffset.toFixed(4)} m`],
    ['Kapanma Hatası (W):', `${res.W_mm >= 0 ? '+' : ''}${res.W_mm.toFixed(2)} mm (${res.W_meters.toFixed(4)} m)`],
    ['Tolerans Sınırı (T):', `± ${res.T_mm.toFixed(2)} mm (Durum: ${statusText})`],
    []
  ];

  const headers = [
    'Sıra No',
    'Nokta Adı',
    'Sağa Değer Y (m)',
    'Yukarı Değer X (m)',
    'Elipsoid Yükseklik h (m)',
    'Jeoit Yükseklik N (m)',
    'Ham Ortometrik H (m)',
    'Mesafe S (m)',
    'Birikimli Mesafe S (m)',
    'Düzeltme v (mm)',
    'Birikimli Düzeltme (m)',
    'Dengelenmiş Kot H (m)'
  ];

  const dataRows = res.points.map((pt, idx) => [
    idx + 1,
    pt.id,
    Number(pt.y.toFixed(4)),
    Number(pt.x.toFixed(4)),
    Number(pt.h.toFixed(4)),
    Number(pt.n.toFixed(4)),
    Number(pt.rawH.toFixed(4)),
    Number(pt.segDist.toFixed(2)),
    Number(pt.cumDist.toFixed(2)),
    idx === 0 ? 0 : Number(pt.correctionMm.toFixed(2)),
    Number(pt.cumCorrectionM.toFixed(4)),
    Number(pt.adjustedH.toFixed(4))
  ]);

  const sheetData = [...summaryRows, headers, ...dataRows];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Dengeleme Sonuçları');

  const colWidths = [
    { wch: 10 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
    { wch: 22 }, { wch: 20 }, { wch: 22 }, { wch: 15 },
    { wch: 22 }, { wch: 16 }, { wch: 22 }, { wch: 22 }
  ];
  worksheet['!cols'] = colWidths;

  const fileName = `GNSS_Nivelman_Dengeleme_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

export function exportAdjustmentToKML(res: AdjustmentResult) {
  const pts = res.points;
  const lineCoords = pts
    .map((p) => `${(p.lon || 0).toFixed(7)},${(p.lat || 0).toFixed(7)},${p.adjustedH.toFixed(3)}`)
    .join('\n          ');

  let placemarksXML = '';
  pts.forEach((pt, idx) => {
    const isStart = idx === 0;
    const isEnd = idx === pts.length - 1;
    let styleId = 'intermediatePointStyle';
    let pointType = 'Ara Nokta';

    if (isStart) {
      styleId = 'startPointStyle';
      pointType = 'Başlangıç Röperi (A)';
    } else if (isEnd) {
      styleId = 'endPointStyle';
      pointType = 'Bitiş Röperi (B)';
    }

    placemarksXML += `
    <Placemark>
      <name>${pt.id}</name>
      <description><![CDATA[<b>Tip:</b> ${pointType}<br><b>Dengeli Kot (H):</b> ${pt.adjustedH.toFixed(4)} m<br><b>Metrik Y (Sağa):</b> ${pt.y.toFixed(3)} m<br><b>Metrik X (Yukarı):</b> ${pt.x.toFixed(3)} m]]></description>
      <styleUrl>#${styleId}</styleUrl>
      <Point>
        <coordinates>${(pt.lon || 0).toFixed(7)},${(pt.lat || 0).toFixed(7)},${pt.adjustedH.toFixed(3)}</coordinates>
      </Point>
    </Placemark>`;
  });

  const kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>GNSS Nivelman Güzergahı</name>
    <description>GNSS Nivelman Dengeleme KML Çıktısı</description>

    <Style id="startPointStyle">
      <IconStyle>
        <scale>1.3</scale>
        <Icon>
          <href>https://maps.google.com/mapfiles/kml/pushpin/grn-pushpin.png</href>
        </Icon>
      </IconStyle>
    </Style>

    <Style id="intermediatePointStyle">
      <IconStyle>
        <scale>1.0</scale>
        <Icon>
          <href>https://maps.google.com/mapfiles/kml/pushpin/blue-pushpin.png</href>
        </Icon>
      </IconStyle>
    </Style>

    <Style id="endPointStyle">
      <IconStyle>
        <scale>1.3</scale>
        <Icon>
          <href>https://maps.google.com/mapfiles/kml/pushpin/red-pushpin.png</href>
        </Icon>
      </IconStyle>
    </Style>

    <Style id="routeLineStyle">
      <LineStyle>
        <color>ff0000ff</color>
        <width>4</width>
      </LineStyle>
    </Style>

    <Placemark>
      <name>Nivelman Güzergah Hattı</name>
      <styleUrl>#routeLineStyle</styleUrl>
      <LineString>
        <tessellate>1</tessellate>
        <altitudeMode>clampToGround</altitudeMode>
        <coordinates>
          ${lineCoords}
        </coordinates>
      </LineString>
    </Placemark>
${placemarksXML}
  </Document>
</kml>`;

  const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `GNSS_Nivelman_Guzergah_${new Date().toISOString().slice(0, 10)}.kml`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportRoutePointsToKML(
  points: GNSSPoint[],
  crsSystem: CRSSystem,
  crsDom: string,
  projectName?: string
) {
  if (!points || points.length === 0) return;

  const ptsWithCoords = points.map((p) => {
    const wgs = convertPointToWGS84(p, crsSystem, crsDom);
    return {
      ...p,
      lat: wgs.lat,
      lon: wgs.lon,
      calcH: p.h - p.n,
    };
  });

  const lineCoords = ptsWithCoords
    .filter((p) => p.lat !== 0 || p.lon !== 0)
    .map((p) => `${(p.lon || 0).toFixed(7)},${(p.lat || 0).toFixed(7)},${p.calcH.toFixed(3)}`)
    .join('\n          ');

  let placemarksXML = '';
  ptsWithCoords.forEach((pt, idx) => {
    const isStart = idx === 0;
    const isEnd = idx === ptsWithCoords.length - 1;
    let styleId = 'intermediatePointStyle';
    let pointType = 'Ara Nokta';

    if (isStart) {
      styleId = 'startPointStyle';
      pointType = 'Başlangıç Röperi (A)';
    } else if (isEnd) {
      styleId = 'endPointStyle';
      pointType = 'Bitiş Röperi (B)';
    }

    placemarksXML += `
    <Placemark>
      <name>${pt.id}</name>
      <description><![CDATA[<b>Tip:</b> ${pointType}<br><b>Yaklaşık Kot (H):</b> ${pt.calcH.toFixed(4)} m<br><b>Elipsoid Yük. (h):</b> ${pt.h.toFixed(4)} m<br><b>Jeoit Yük. (N):</b> ${pt.n.toFixed(3)} m<br><b>Metrik Y (Sağa):</b> ${pt.y.toFixed(3)} m<br><b>Metrik X (Yukarı):</b> ${pt.x.toFixed(3)} m]]></description>
      <styleUrl>#${styleId}</styleUrl>
      <Point>
        <coordinates>${(pt.lon || 0).toFixed(7)},${(pt.lat || 0).toFixed(7)},${pt.calcH.toFixed(3)}</coordinates>
      </Point>
    </Placemark>`;
  });

  const kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${projectName ? `${projectName} - Güzergah` : 'GNSS Nivelman Güzergahı'}</name>
    <description>GNSS Nivelman Güzergah KML Çıktısı</description>

    <Style id="startPointStyle">
      <IconStyle>
        <scale>1.3</scale>
        <Icon>
          <href>https://maps.google.com/mapfiles/kml/pushpin/grn-pushpin.png</href>
        </Icon>
      </IconStyle>
    </Style>

    <Style id="intermediatePointStyle">
      <IconStyle>
        <scale>1.0</scale>
        <Icon>
          <href>https://maps.google.com/mapfiles/kml/pushpin/blue-pushpin.png</href>
        </Icon>
      </IconStyle>
    </Style>

    <Style id="endPointStyle">
      <IconStyle>
        <scale>1.3</scale>
        <Icon>
          <href>https://maps.google.com/mapfiles/kml/pushpin/red-pushpin.png</href>
        </Icon>
      </IconStyle>
    </Style>

    <Style id="routeLineStyle">
      <LineStyle>
        <color>ff0000ff</color>
        <width>4</width>
      </LineStyle>
    </Style>

    <Placemark>
      <name>Nivelman Güzergah Hattı</name>
      <styleUrl>#routeLineStyle</styleUrl>
      <LineString>
        <tessellate>1</tessellate>
        <altitudeMode>clampToGround</altitudeMode>
        <coordinates>
          ${lineCoords}
        </coordinates>
      </LineString>
    </Placemark>
${placemarksXML}
  </Document>
</kml>`;

  const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `GNSS_Nivelman_Guzergah_${new Date().toISOString().slice(0, 10)}.kml`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
