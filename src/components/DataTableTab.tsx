import React, { useState } from 'react';
import { GNSSPoint, CRSSystem } from '../types/gnss';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  FileSpreadsheet,
  Route,
  Calculator,
  Sliders,
  Globe2,
  FileText,
  X,
  Check
} from 'lucide-react';

interface DataTableTabProps {
  points: GNSSPoint[];
  setPoints: React.Dispatch<React.SetStateAction<GNSSPoint[]>>;
  startKnownH: string;
  setStartKnownH: (val: string) => void;
  endKnownH: string;
  setEndKnownH: (val: string) => void;
  toleranceCoef: string;
  setToleranceCoef: (val: string) => void;
  crsSystem: CRSSystem;
  setCrsSystem: (val: CRSSystem) => void;
  crsDom: string;
  setCrsDom: (val: string) => void;
  onCalculate: () => void;
  onSwitchToMap: () => void;
  showToast: (msg: string) => void;
}

export const DataTableTab: React.FC<DataTableTabProps> = ({
  points,
  setPoints,
  startKnownH,
  setStartKnownH,
  endKnownH,
  setEndKnownH,
  toleranceCoef,
  setToleranceCoef,
  crsSystem,
  setCrsSystem,
  crsDom,
  setCrsDom,
  onCalculate,
  onSwitchToMap,
  showToast
}) => {
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const handleAddRow = () => {
    const nextIdx = points.length + 1;
    const lastPt = points.length > 0 ? points[points.length - 1] : { y: 500000, x: 4400000, h: 100, n: 38 };
    setPoints([
      ...points,
      {
        id: `N.${nextIdx}`,
        y: lastPt.y + 500,
        x: lastPt.x,
        h: lastPt.h + 2,
        n: lastPt.n,
        knownH: null
      }
    ]);
  };

  const handleRemoveRow = (index: number) => {
    const updated = [...points];
    updated.splice(index, 1);
    setPoints(updated);
  };

  const handleMoveRow = (index: number, direction: number) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= points.length) return;
    const updated = [...points];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    setPoints(updated);
  };

  const handleUpdatePoint = (index: number, field: keyof GNSSPoint, value: any) => {
    const updated = [...points];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setPoints(updated);
  };

  const handleClearAll = () => {
    if (confirm('Tüm veriler temizlensin mi?')) {
      setPoints([]);
      setStartKnownH('');
      setEndKnownH('');
      showToast('Veriler temizlendi');
    }
  };

  const handleProcessPasted = () => {
    if (!pasteText.trim()) {
      setPasteModalOpen(false);
      return;
    }

    const lines = pasteText.trim().split(/\r?\n/);
    const newPoints: GNSSPoint[] = [];

    lines.forEach((line) => {
      if (!line.trim()) return;
      let parts: string[] = [];
      if (line.includes('\t')) {
        parts = line.split('\t').map((p) => p.trim());
      } else if (line.includes(';')) {
        parts = line.split(';').map((p) => p.trim());
      } else {
        parts = line.split(/\s+/).map((p) => p.trim());
      }

      if (parts.length >= 5) {
        const parseNum = (str: string) => {
          if (!str) return 0;
          return parseFloat(str.replace(',', '.')) || 0;
        };

        newPoints.push({
          id: parts[0],
          y: parseNum(parts[1]),
          x: parseNum(parts[2]),
          h: parseNum(parts[3]),
          n: parseNum(parts[4]),
          knownH: null
        });
      }
    });

    if (newPoints.length >= 2) {
      setPoints(newPoints);
      setPasteModalOpen(false);
      setPasteText('');
      showToast(`${newPoints.length} nokta başarıyla aktarıldı!`);
    } else {
      alert('Geçerli veri satırı bulunamadı! Lütfen en az 2 satır ve 5 kolon (NoktaAdı, Y, X, h, N) girdiğinizden emin olun.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Parameters & Configuration Panel */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 no-print space-y-4">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sky-600" />
              <span>Dengeleme Parametreleri ve Tolerans Ayarları</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-600 mb-1">
                Başlangıç Kotu H<sub>A</sub> (m)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.0001"
                  value={startKnownH}
                  onChange={(e) => setStartKnownH(e.target.value)}
                  placeholder="0.0000"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 pr-8 font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition"
                />
                <span className="absolute right-2.5 top-2 text-slate-400 font-mono">m</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Başlangıç Röper Noktası (A)</span>
            </div>

            <div>
              <label className="block font-medium text-slate-600 mb-1">
                Bitiş Kotu H<sub>B</sub> (m)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.0001"
                  value={endKnownH}
                  onChange={(e) => setEndKnownH(e.target.value)}
                  placeholder="0.0000"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 pr-8 font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition"
                />
                <span className="absolute right-2.5 top-2 text-slate-400 font-mono">m</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Bitiş Röper Noktası (B)</span>
            </div>

            <div>
              <label className="block font-medium text-slate-600 mb-1">
                Tolerans Katsayısı m (mm/&radic;<span className="underline">km</span>)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  value={toleranceCoef}
                  onChange={(e) => setToleranceCoef(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 pr-12 font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition"
                />
                <span className="absolute right-2.5 top-2 text-slate-400 font-mono text-[10px]">mm</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">T = m &middot; &radic;S<sub>km</sub> (Standart: 12 mm/&radic;km)</span>
            </div>

            <div>
              <label className="block font-medium text-slate-600 mb-1">Düzeltme Dağıtım Yöntemi</label>
              <div className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-slate-700 font-medium text-xs">
                Kenar Uzunluklarına Göre (S<sub>i</sub> Orantılı)
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">BÖHHBÜY Jeodezik standart yöntem</span>
            </div>
          </div>
        </div>

        {/* Projection & Datum System */}
        <div className="pt-3 border-t border-slate-200">
          <h3 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
            <Globe2 className="w-4 h-4 text-emerald-600" />
            <span>Proje Koordinat Sistemi ve Dilim Tanımı (Harita & KML İçin)</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-600 mb-1">Projeksiyon / Datum Sistemi</label>
              <select
                value={crsSystem}
                onChange={(e) => {
                  const newSys = e.target.value as CRSSystem;
                  setCrsSystem(newSys);
                  if (newSys === 'utm6') {
                    if (['30', '36', '42'].includes(crsDom)) {
                      if (crsDom === '30') setCrsDom('33');
                      else if (crsDom === '36') setCrsDom('39');
                      else if (crsDom === '42') setCrsDom('45');
                    }
                  }
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition"
              >
                <option value="itrf3">ITRF96 / TUREF (3° Dilimli TM)</option>
                <option value="utm6">UTM / WGS84 (6° Dilimli)</option>
                <option value="ed50">ED50 (3° Dilimli Gauss-Krüger)</option>
              </select>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Nokta metrik koordinat referansı</span>
            </div>

            <div>
              <label className="block font-medium text-slate-600 mb-1">
                {crsSystem === 'utm6' ? 'UTM 6° Dilim No ve DOM' : 'Dilim Orta Meridyeni (DOM - 3°)'}
              </label>
              <select
                value={crsDom}
                onChange={(e) => setCrsDom(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition"
              >
                {crsSystem === 'utm6' ? (
                  <>
                    <option value="27">Zone 35 / DOM 27° (24°-30°D / Trakya, Çanakkale, İzmir)</option>
                    <option value="33">Zone 36 / DOM 33° (30°-36°D / İstanbul, Bursa, Ankara, Antalya)</option>
                    <option value="39">Zone 37 / DOM 39° (36°-42°D / Samsun, Kayseri, Mersin, Trabzon, Adana)</option>
                    <option value="45">Zone 38 / DOM 45° (42°-48°D / Erzurum, Diyarbakır, Van, Kars, Hakkari)</option>
                  </>
                ) : (
                  <>
                    <option value="27">DOM 27° (Dilim 9 / Çanakkale, Balıkesir B., İzmir)</option>
                    <option value="30">DOM 30° (Dilim 10 / İstanbul, Bursa, Kocaeli, Muğla)</option>
                    <option value="33">DOM 33° (Dilim 11 / Bolu, Eskişehir, Ankara B., Antalya)</option>
                    <option value="36">DOM 36° (Dilim 12 / Zonguldak, Ankara D., Konya, Mersin)</option>
                    <option value="39">DOM 39° (Dilim 13 / Samsun, Kayseri, Sivas, Adana)</option>
                    <option value="42">DOM 42° (Dilim 14 / Ordu, Giresun, Erzincan, Gaziantep)</option>
                    <option value="45">DOM 45° (Dilim 15 / Trabzon, Erzurum, Diyarbakır, Mardin, Van)</option>
                  </>
                )}
              </select>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                {crsSystem === 'utm6'
                  ? '6° UTM Dilim Numarası ve Dilim Orta Meridyeni'
                  : '3° TM Dilim Orta Meridyeni (BÖHHBÜY standardı)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setPasteModalOpen(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors border border-slate-700 flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Excel'den Yapıştır</span>
          </button>

          <button
            onClick={onSwitchToMap}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Route className="w-3.5 h-3.5" />
            <span>Haritada Sırala</span>
          </button>

          <button
            onClick={onCalculate}
            className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Hesapla</span>
          </button>

          <button
            onClick={handleAddRow}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 transition flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600" />
            <span>Satır Ekle</span>
          </button>

          <button
            onClick={handleClearAll}
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-medium rounded-lg border border-rose-200 transition flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Temizle</span>
          </button>
        </div>
      </div>

      {/* Main Points Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto max-h-[550px] custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 w-12 text-center font-bold text-slate-500">#</th>
                <th className="py-3 px-3 min-w-[120px] font-bold">Nokta Adı</th>
                <th className="py-3 px-3 min-w-[130px] font-bold">Sağa Değer Y (m)</th>
                <th className="py-3 px-3 min-w-[130px] font-bold">Yukarı Değer X (m)</th>
                <th className="py-3 px-3 min-w-[130px] font-bold">Elipsoid Yük. h (m)</th>
                <th className="py-3 px-3 min-w-[130px] font-bold">Jeoit Yük. N (m)</th>
                <th className="py-3 px-3 min-w-[130px] font-bold bg-amber-50/70 text-amber-900 border-l border-r border-amber-200">
                  Bilinen H (m)
                </th>
                <th className="py-3 px-3 w-28 text-center font-bold no-print">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-slate-700 bg-white">
              {points.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-sans">
                    <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-600">Henüz veri girilmedi.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Yukarıdaki <strong>"Excel'den Yapıştır"</strong> veya <strong>"Satır Ekle"</strong> butonlarını kullanarak veri girişi yapabilirsiniz.
                    </p>
                  </td>
                </tr>
              ) : (
                points.map((pt, idx) => {
                  const isStart = idx === 0;
                  const isEnd = idx === points.length - 1;

                  return (
                    <tr
                      key={idx}
                      className={idx % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-100/50'}
                    >
                      <td className="py-2 px-3 text-center text-slate-400 text-[11px] font-bold">{idx + 1}</td>
                      <td className="py-1.5 px-3">
                        <input
                          type="text"
                          value={pt.id || ''}
                          onChange={(e) => handleUpdatePoint(idx, 'id', e.target.value)}
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-sky-500 font-semibold focus:bg-white px-1 py-0.5 outline-none rounded"
                        />
                      </td>
                      <td className="py-1.5 px-3">
                        <input
                          type="number"
                          step="0.0001"
                          value={pt.y !== null && !isNaN(pt.y) ? pt.y : ''}
                          onChange={(e) => handleUpdatePoint(idx, 'y', parseFloat(e.target.value) || 0)}
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-sky-500 focus:bg-white px-1 py-0.5 outline-none rounded"
                        />
                      </td>
                      <td className="py-1.5 px-3">
                        <input
                          type="number"
                          step="0.0001"
                          value={pt.x !== null && !isNaN(pt.x) ? pt.x : ''}
                          onChange={(e) => handleUpdatePoint(idx, 'x', parseFloat(e.target.value) || 0)}
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-sky-500 focus:bg-white px-1 py-0.5 outline-none rounded"
                        />
                      </td>
                      <td className="py-1.5 px-3">
                        <input
                          type="number"
                          step="0.0001"
                          value={pt.h !== null && !isNaN(pt.h) ? pt.h : ''}
                          onChange={(e) => handleUpdatePoint(idx, 'h', parseFloat(e.target.value) || 0)}
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-sky-500 focus:bg-white px-1 py-0.5 outline-none rounded"
                        />
                      </td>
                      <td className="py-1.5 px-3">
                        <input
                          type="number"
                          step="0.001"
                          value={pt.n !== null && !isNaN(pt.n) ? pt.n : ''}
                          onChange={(e) => handleUpdatePoint(idx, 'n', parseFloat(e.target.value) || 0)}
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-sky-500 focus:bg-white px-1 py-0.5 outline-none rounded"
                        />
                      </td>
                      <td className="py-1.5 px-3 bg-amber-50/40 border-l border-r border-amber-200">
                        {isStart || isEnd ? (
                          <span className="font-bold text-amber-900 px-1">
                            {isStart ? (startKnownH !== '' ? startKnownH : '0.0000') : endKnownH !== '' ? endKnownH : '0.0000'}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px] italic px-1">Ara Nokta</span>
                        )}
                      </td>
                      <td className="py-1.5 px-3 text-center no-print">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleMoveRow(idx, -1)}
                            disabled={isStart}
                            className={`p-1 rounded ${isStart ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:text-sky-600 hover:bg-slate-100'}`}
                            title="Yukarı Taşı"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveRow(idx, 1)}
                            disabled={isEnd}
                            className={`p-1 rounded ${isEnd ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:text-sky-600 hover:bg-slate-100'}`}
                            title="Aşağı Taşı"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemoveRow(idx)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paste Modal */}
      {pasteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span>Excel / CSV Veri Yapıştır</span>
              </h3>
              <button
                onClick={() => setPasteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Excel tablonuzdan kolonları sırasıyla kopyalayıp aşağıdaki alana yapıştırabilirsiniz:
              <br />
              <code className="bg-slate-100 text-sky-700 px-1.5 py-0.5 rounded font-mono text-[11px] mt-1 inline-block">
                NoktaAdı [Tab/Boşluk/Virgül] SAGA(Y) [Tab/...] YUKARI(X) [Tab/...] ELIPSOID(h) [Tab/...] ONDULASYON(N)
              </code>
            </p>

            <textarea
              rows={8}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Örnek:&#10;RS.01	598859.4975	4434798.9084	158.6000	38.150&#10;P.02	599426.0361	4434671.4488	161.4556	38.144&#10;RS.02	602350.9200	4433980.6000	173.2380	38.118"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 font-mono text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none custom-scrollbar"
            />

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setPasteModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
              >
                İptal
              </button>
              <button
                onClick={handleProcessPasted}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow transition flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Verileri Aktar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
