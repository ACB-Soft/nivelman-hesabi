import React from 'react';
import { AdjustmentResult } from '../types/gnss';
import { Sqrt } from './Sqrt';
import { Printer, AlertCircle } from 'lucide-react';

interface ReportTabProps {
  results: AdjustmentResult | null;
}

export const ReportTab: React.FC<ReportTabProps> = ({ results }) => {
  if (!results) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-700">Rapor Oluşturulamadı</h3>
        <p className="text-xs text-slate-500">
          Raporu görüntülemek ve yazdırmak için lütfen önce <strong>Hesapla</strong> işlemini gerçekleştirin.
        </p>
      </div>
    );
  }

  const res = results;
  const today = new Date().toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-md space-y-6 max-w-5xl mx-auto print:shadow-none print:border-none print:p-0">
        {/* Action Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4 no-print">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Nivelman Dengeleme Raporu</h2>
            <p className="text-xs text-slate-500">
              Yazdırılabilir veya PDF olarak kaydedilebilir resmi jeodezik hesap raporu
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow transition flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Raporu Yazdır / PDF</span>
          </button>
        </div>

        {/* Printable Content */}
        <div className="space-y-6">
          {/* Report Header */}
          <div className="text-center border-b border-slate-300 pb-4">
            <h1 className="text-xl font-bold uppercase tracking-wider text-slate-900">
              NİVELMAN HESABI
            </h1>
            <p className="text-xs text-slate-600 mt-1 font-semibold">GÜZERGAH DENGELEME RAPORU</p>
            <div className="flex justify-between items-center text-[11px] text-slate-500 mt-4 px-2">
              <span>
                <strong>Rapor Tarihi:</strong> {today}
              </span>
              <span>
                <strong>Yazılım:</strong> BSR Maps - Nivelman Hesabı
              </span>
            </div>
          </div>

          {/* Project Summary Box */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="space-y-1">
              <p>
                <strong>Başlangıç Noktası (A):</strong> {res.points[0]?.id} (H ={' '}
                {res.H_start.toFixed(4)} m)
              </p>
              <p>
                <strong>Bitiş Noktası (B):</strong> {res.points[res.points.length - 1]?.id} (H ={' '}
                {res.H_end.toFixed(4)} m)
              </p>
              <p>
                <strong>Toplam Nokta Sayısı:</strong> {res.points.length} adet
              </p>
              <p>
                <strong>Toplam Güzergah Uzunluğu:</strong> {res.totalDist.toFixed(2)} m (
                {res.totalDistKm.toFixed(3)} km)
              </p>
            </div>
            <div className="space-y-1">
              <p>
                <strong>Teorik Kot Farkı (&Delta;H<sub>gerçek</sub>):</strong>{' '}
                {res.deltaH_real >= 0 ? '+' : ''}
                {res.deltaH_real.toFixed(4)} m
              </p>
              <p>
                <strong>GNSS Ölçülen Kot Farkı (&Delta;H<sub>GNSS</sub>):</strong>{' '}
                {res.deltaH_gnss >= 0 ? '+' : ''}
                {res.deltaH_gnss.toFixed(4)} m
              </p>
              <p>
                <strong>Başlangıç Datum Offset (&Delta;H<sub>offset</sub>):</strong>{' '}
                {res.startOffset >= 0 ? '+' : ''}
                {res.startOffset.toFixed(4)} m
              </p>
              <p>
                <strong>Kapanma Hatası (W):</strong> {res.W_mm >= 0 ? '+' : ''}
                {res.W_mm.toFixed(2)} mm
              </p>
              <p className="flex items-center gap-1 flex-wrap">
                <strong>Tolerans Sınırı (T = m&middot;<Sqrt>S<sub>km</sub></Sqrt>):</strong>{' '}
                <span>&plusmn; {res.T_mm.toFixed(2)} mm</span>
                <span>(m = {res.m_coef} mm/<Sqrt>km</Sqrt>, Durum:{' '}
                  <strong className={res.isAccepted ? 'text-emerald-700' : 'text-rose-700'}>
                    {res.isAccepted ? 'KABUL' : 'RED'}
                  </strong>
                )</span>
              </p>
            </div>
          </div>

          {/* Table */}
          <div>
            <h4 className="text-xs font-bold uppercase text-slate-800 mb-2 border-b border-slate-300 pb-1">
              Dengelenmiş Nokta Yükseklikleri Çizelgesi
            </h4>
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-200 text-slate-800 font-bold border-y border-slate-400">
                  <th className="py-1.5 px-2 text-center">#</th>
                  <th className="py-1.5 px-2">Nokta Adı</th>
                  <th className="py-1.5 px-2">Y (m)</th>
                  <th className="py-1.5 px-2">X (m)</th>
                  <th className="py-1.5 px-2">h (m)</th>
                  <th className="py-1.5 px-2">N (m)</th>
                  <th className="py-1.5 px-2">Birikimli S (m)</th>
                  <th className="py-1.5 px-2">v (mm)</th>
                  <th className="py-1.5 px-2">Birikimli Düz. (m)</th>
                  <th className="py-1.5 px-2 text-right font-bold">Dengeli H (m)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 font-mono">
                {res.points.map((pt, idx) => {
                  const corrText =
                    idx === 0
                      ? '-'
                      : (pt.correctionMm >= 0 ? '+' : '') + pt.correctionMm.toFixed(1);
                  const cumCorrText =
                    (pt.cumCorrectionM >= 0 ? '+' : '') + pt.cumCorrectionM.toFixed(4);

                  return (
                    <tr key={pt.id + idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="py-1 px-2 text-center text-slate-500">{idx + 1}</td>
                      <td className="py-1 px-2 font-bold text-slate-900">{pt.id}</td>
                      <td className="py-1 px-2">{pt.y.toFixed(3)}</td>
                      <td className="py-1 px-2">{pt.x.toFixed(3)}</td>
                      <td className="py-1 px-2">{pt.h.toFixed(4)}</td>
                      <td className="py-1 px-2">{pt.n.toFixed(3)}</td>
                      <td className="py-1 px-2">{pt.cumDist.toFixed(1)}</td>
                      <td className="py-1 px-2 font-semibold text-amber-900">{corrText}</td>
                      <td className="py-1 px-2 font-semibold text-sky-900">{cumCorrText}</td>
                      <td className="py-1 px-2 text-right font-bold text-slate-900">
                        {pt.adjustedH.toFixed(4)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
            <div>
              <p className="font-bold text-slate-800">Hesaplayan</p>
              <div className="h-16" />
              <p className="text-slate-500">İmza / Kaşe</p>
            </div>
            <div>
              <p className="font-bold text-slate-800">Kontrol Eden</p>
              <div className="h-16" />
              <p className="text-slate-500">İmza / Kaşe</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
