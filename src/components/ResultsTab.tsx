import React from 'react';
import { AdjustmentResult } from '../types/gnss';
import { Sqrt } from './Sqrt';
import { exportAdjustmentToExcel, exportAdjustmentToKML } from '../utils/geodesy';
import {
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Globe,
  Sliders,
  ListCheck
} from 'lucide-react';

interface ResultsTabProps {
  results: AdjustmentResult | null;
  onSwitchToData: () => void;
}

export const ResultsTab: React.FC<ResultsTabProps> = ({ results, onSwitchToData }) => {
  if (!results) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-4">
        <Sliders className="w-10 h-10 text-slate-300 mx-auto" />
        <h3 className="text-base font-bold text-slate-700">Henüz Dengeleme Hesabı Yapılmadı</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Lütfen Veri Girişi sekmesinden en az 2 nokta, başlangıç ve bitiş röper kotlarını girip <strong>"Hesapla"</strong> butonuna basınız.
        </p>
        <button
          onClick={onSwitchToData}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg shadow transition cursor-pointer"
        >
          Veri Girişine Dön
        </button>
      </div>
    );
  }

  const res = results;

  return (
    <div className="space-y-4">
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-500 uppercase">
            Başlangıç Kotu (H<sub>A</sub>)
          </span>
          <div className="text-base sm:text-lg font-bold font-mono text-slate-800 mt-1">
            {res.H_start.toFixed(4)} m
          </div>
          <span className="text-[10px] text-slate-400">Başlangıç Noktası ({res.points[0]?.id})</span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-500 uppercase">
            Bitiş Kotu (H<sub>B</sub>)
          </span>
          <div className="text-base sm:text-lg font-bold font-mono text-slate-800 mt-1">
            {res.H_end.toFixed(4)} m
          </div>
          <span className="text-[10px] text-slate-400">
            Bitiş Noktası ({res.points[res.points.length - 1]?.id})
          </span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-500 uppercase">Toplam Uzunluk</span>
          <div className="text-base sm:text-lg font-bold font-mono text-sky-600 mt-1">
            {res.totalDist.toFixed(2)} m
          </div>
          <span className="text-[10px] text-slate-400">{res.totalDistKm.toFixed(3)} km</span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-500 uppercase">Tolerans Sınırı (T)</span>
          <div className="text-base sm:text-lg font-bold font-mono text-slate-700 mt-1">
            &plusmn; {res.T_mm.toFixed(2)} mm
          </div>
          <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
            <span>m = {res.m_coef} mm/</span>
            <Sqrt>km</Sqrt>
          </span>
        </div>

        {/* Dengeleme Durumu Kartı */}
        <div
          className={`p-4 rounded-xl border shadow-sm flex flex-col justify-between col-span-1 sm:col-span-2 lg:col-span-1 lg:col-start-5 lg:row-start-1 lg:row-span-2 ${
            res.isAccepted
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-rose-50 border-rose-200'
          }`}
        >
          <span className="text-[11px] font-semibold text-slate-600 uppercase">Dengeleme Durumu</span>
          <div
            className={`text-sm sm:text-base lg:text-lg font-bold mt-1 flex items-center gap-1.5 ${
              res.isAccepted ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {res.isAccepted ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>KABUL</span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-rose-600" />
                <span>RED</span>
              </>
            )}
          </div>
          <span
            className={`text-[10px] font-medium ${
              res.isAccepted ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {res.isAccepted ? '|W| ≤ T Sınırı İçinde' : '|W| > T Tolerans Aşıldı!'}
          </span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-500 uppercase">
            Başlangıç Datum Offset (&Delta;H<sub>offset</sub>)
          </span>
          <div className="text-base sm:text-lg font-bold font-mono text-amber-600 mt-1">
            {res.startOffset >= 0 ? '+' : ''}
            {res.startOffset.toFixed(4)} m
          </div>
          <span className="text-[10px] text-slate-400">Datum Sabit Farkı</span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-500 uppercase">
            Teorik Kot Farkı (&Delta;H<sub>gerçek</sub>)
          </span>
          <div className="text-base sm:text-lg font-bold font-mono text-slate-800 mt-1">
            {res.deltaH_real >= 0 ? '+' : ''}
            {res.deltaH_real.toFixed(4)} m
          </div>
          <span className="text-[10px] text-slate-400">H<sub>B</sub> - H<sub>A</sub></span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-500 uppercase">
            GNSS Ölçülen Kot Farkı (&Delta;H<sub>GNSS</sub>)
          </span>
          <div className="text-base sm:text-lg font-bold font-mono text-slate-800 mt-1">
            {res.deltaH_gnss >= 0 ? '+' : ''}
            {res.deltaH_gnss.toFixed(4)} m
          </div>
          <span className="text-[10px] text-slate-400">Ham Ortometrik Fark</span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-500 uppercase">Kapanma Hatası (W)</span>
          <div
            className={`text-base sm:text-lg font-bold font-mono mt-1 ${
              res.isAccepted ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {res.W_mm >= 0 ? '+' : ''}
            {res.W_mm.toFixed(2)} mm
          </div>
          <span className="text-[10px] text-slate-400">
            {res.W_meters >= 0 ? '+' : ''}
            {res.W_meters.toFixed(4)} m
          </span>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between no-print flex-wrap gap-2">
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <ListCheck className="w-4 h-4 text-sky-600" />
            <span>Dengelenmiş Yükseklik Çizelgesi</span>
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportAdjustmentToExcel(res)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel (.xlsx) İndir</span>
            </button>
            <button
              onClick={() => exportAdjustmentToKML(res)}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded-lg transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>KML İndir</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar max-h-[600px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 w-10 text-center font-bold text-slate-500">#</th>
                <th className="py-3 px-3 font-bold">Nokta Adı</th>
                <th className="py-3 px-3 font-bold">Elipsoid h (m)</th>
                <th className="py-3 px-3 font-bold">Jeoit N (m)</th>
                <th className="py-3 px-3 font-bold">Ham Ort. H (m)</th>
                <th className="py-3 px-3 font-bold">Mesafe S<sub>i</sub> (m)</th>
                <th className="py-3 px-3 font-bold">Birikimli S<sub>top</sub> (m)</th>
                <th className="py-3 px-3 font-bold text-amber-700 bg-amber-50/60 border-l border-amber-200/50">
                  Düzeltme v<sub>i</sub> (mm)
                </th>
                <th className="py-3 px-3 font-bold text-sky-800 bg-sky-50/60 border-r border-sky-200/50">
                  Birikimli Düzeltme (m)
                </th>
                <th className="py-3 px-3 font-bold text-emerald-800 bg-emerald-50/70 text-right">
                  Dengeli Kot H (m)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-slate-700">
              {res.points.map((pt, idx) => {
                const corrText =
                  idx === 0
                    ? '-'
                    : (pt.correctionMm >= 0 ? '+' : '') + pt.correctionMm.toFixed(2);
                const cumCorrText =
                  (pt.cumCorrectionM >= 0 ? '+' : '') + pt.cumCorrectionM.toFixed(4);

                return (
                  <tr
                    key={pt.id + idx}
                    className={idx % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-100/50'}
                  >
                    <td className="py-2.5 px-3 text-center text-slate-400 text-[11px] font-bold">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{pt.id}</td>
                    <td className="py-2.5 px-3">{pt.h.toFixed(4)}</td>
                    <td className="py-2.5 px-3">{pt.n.toFixed(3)}</td>
                    <td className="py-2.5 px-3">{pt.rawH.toFixed(4)}</td>
                    <td className="py-2.5 px-3">
                      {pt.segDist > 0 ? pt.segDist.toFixed(2) : '-'}
                    </td>
                    <td className="py-2.5 px-3">{pt.cumDist.toFixed(2)}</td>
                    <td className="py-2.5 px-3 bg-amber-50/30 border-l border-amber-100 font-semibold text-amber-800">
                      {corrText}
                    </td>
                    <td className="py-2.5 px-3 bg-sky-50/30 border-r border-sky-100 font-semibold text-sky-800">
                      {cumCorrText}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-700 bg-emerald-50/40">
                      {pt.adjustedH.toFixed(4)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
