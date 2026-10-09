import React from 'react';
import { BookOpen, Check } from 'lucide-react';
import { Sqrt } from './Sqrt';

export const DocsTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3 text-sky-600 mb-2">
            <BookOpen className="w-6 h-6" />
            <h2 className="text-xl font-bold text-slate-900">Teknik Dokümantasyon</h2>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Bu sayfa, GNSS Nivelmanı Dengeleme yazılımının temel jeodezik formüllerini, hesap adımlarını ve tolerans standartlarını açıklamaktadır.
          </p>
        </div>

        {/* Section 1 */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 text-xs flex items-center justify-center font-mono">
              1
            </span>
            <span>Temel Yükseklik İlişkisi</span>
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Uydu bazlı GNSS ölçümleri doğrudan referans elipsoidine göre geometrik yükseklik (<b>h</b>) sağlar. Jeodezik uygulamalarda ve haritacılıkta kullanılan yükseklik ise ortalama deniz seviyesini baz alan Ortometrik Yükseklik (<b>H</b>)'tir. Bu iki yükseklik arasındaki fark Jeoit Ondülasyonu (<b>N</b>) ile ifade edilir:
          </p>
          <div className="bg-slate-100 text-slate-900 p-5 rounded-xl font-mono text-xl sm:text-2xl font-bold flex justify-center items-center gap-4 my-3 shadow-inner tracking-wide">
            <span className="text-emerald-700">H = h - N</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-600 pt-1">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <strong className="text-slate-800 block mb-1">h (Elipsoit Yüksekliği)</strong>
              GNSS alıcısı tarafından WGS84 veya GRS80 elipsoidine dik olarak ölçülen geometrik yüksekliktir.
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <strong className="text-slate-800 block mb-1">N (Jeoit Ondülasyonu)</strong>
              TG-20, EGM-96 gibi jeoit modellerinden elde edilen jeoid-elipsoid yüksekliği farkıdır.
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <strong className="text-slate-800 block mb-1">H (Ortometrik Yükseklik)</strong>
              Jeoid referans yüzeyinden (çekim alanı dik doğrultusu boyunca) olan gerçek fiziksel nivelman yüksekliğidir.
            </div>
          </div>
        </div>

        {/* Section 2 */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 text-xs flex items-center justify-center font-mono">
              2
            </span>
            <span>Güzergah Dengelemesi ve Kapanma Hatası Hesabı</span>
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Güzergah, bilinen iki röper noktası (Başlangıç A ve Bitiş B) arasında çekilmiş bir dayalı nivelman güzergahıdır:
          </p>

          <div className="space-y-3 text-xs text-slate-700 font-mono">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-1.5">
              <div className="font-bold text-sky-700 text-sm">1. Teorik Kot Farkı (&Delta;H<sub>gerçek</sub>)</div>
              <div className="text-base font-bold text-slate-900 bg-white p-2.5 rounded border border-slate-300">
                &Delta;H<sub>gerçek</sub> = H<sub>B</sub> - H<sub>A</sub>
              </div>
              <p className="text-[11px] font-sans text-slate-500">
                Röper noktalarının tanımlı (onaylı) hassas ortometrik yükseklik farkıdır.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-1.5">
              <div className="font-bold text-sky-700 text-sm">2. Ölçülen GNSS Kot Farkı (&Delta;H<sub>GNSS</sub>)</div>
              <div className="text-base font-bold text-slate-900 bg-white p-2.5 rounded border border-slate-300">
                &Delta;H<sub>GNSS</sub> = (h<sub>B</sub> - N<sub>B</sub>) - (h<sub>A</sub> - N<sub>A</sub>)
              </div>
              <p className="text-[11px] font-sans text-slate-500">
                GNSS ölçümleri ve jeoid ondülasyonu ile elde edilen ham ortometrik yükseklik farkıdır.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-1.5">
              <div className="font-bold text-sky-700 text-sm">3. Kapanma Hatası (W)</div>
              <div className="text-base font-bold text-slate-900 bg-white p-2.5 rounded border border-slate-300">
                W = &Delta;H<sub>gerçek</sub> - &Delta;H<sub>GNSS</sub> [m]
              </div>
              <div className="text-base font-bold text-slate-900 bg-white p-2.5 rounded border border-slate-300">
                W<sub>mm</sub> = W &middot; 1000 [mm]
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-1.5">
              <div className="font-bold text-sky-700 text-sm">4. Datum Ofseti (&Delta;H<sub>offset</sub>)</div>
              <div className="text-base font-bold text-slate-900 bg-white p-2.5 rounded border border-slate-300">
                &Delta;H<sub>offset</sub> = H<sub>A</sub> - (h<sub>A</sub> - N<sub>A</sub>)
              </div>
              <p className="text-[11px] font-sans text-slate-500">
                Başlangıç röperinin tanımlı (onaylı) kotu ile ölçülen ham kotu arasındaki sabit sistem kaymasıdır.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3 */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 text-xs flex items-center justify-center font-mono">
              3
            </span>
            <span>Düzeltme Dağıtım Yöntemi</span>
          </h3>
          <div className="bg-amber-50/50 border border-amber-200 p-4 rounded-xl space-y-3 text-xs">
            <strong className="text-amber-900 block font-semibold text-sm">
              Kenar Uzunluğuna Göre Dağıtım (BÖHHBÜY Standardı)
            </strong>
            <p className="text-slate-600 leading-relaxed">
              Kapanma hatası W, güzergahtaki komşu noktalar arasındaki yatay mesafe (S<sub>i</sub>) ile orantılı olarak dağıtılır:
            </p>
            <div className="bg-white p-3 rounded border border-amber-300 font-mono text-base font-bold text-amber-900 text-center">
              v<sub>i</sub> = W &middot; ( S<sub>i</sub> / S<sub>toplam</sub> )
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-mono space-y-2">
            <div className="font-bold text-slate-800 text-sm">Nihai Dengelenmiş Kot Hesabı (H<sub>i</sub>):</div>
            <p className="text-slate-600 font-sans text-[11px]">
              Her nokta için dengelenmiş ortometrik yükseklik şu formülle hesaplanır:
            </p>
            <div className="bg-white p-3 rounded border border-slate-300 text-emerald-700 font-bold text-base sm:text-lg text-center">
              H<sub>i</sub> = (h<sub>i</sub> - N<sub>i</sub>) + &Delta;H<sub>offset</sub> + &Sigma;<sub>k=1</sub><sup>i</sup> v<sub>k</sub>
            </div>
          </div>
        </div>

        {/* Section 4 */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 text-xs flex items-center justify-center font-mono">
              4
            </span>
            <span>Tolerans Hesabı</span>
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Büyük Ölçekli Harita ve Harita Bilgileri Üretim Yönetmeliği (BÖHHBÜY) uyarınca nivelman kapanma toleransı (T):
          </p>
          <div className="bg-slate-100 text-slate-900 p-4 rounded-xl font-mono text-lg sm:text-xl font-bold flex justify-center items-center gap-3 my-3 shadow-inner">
            <span className="flex items-center gap-2">
              <span>T = m &middot;</span>
              <Sqrt>S<sub>km</sub></Sqrt>
              <span>[mm]</span>
            </span>
          </div>
          <ul className="list-disc list-inside text-xs text-slate-600 space-y-1.5 pl-2">
            <li>
              <b>S<sub>km</sub>:</b> Kilometre cinsinden toplam güzergah uzunluğu (S<sub>toplam</sub> / 1000).
            </li>
            <li className="flex items-center gap-1 flex-wrap">
              <span><b>m:</b> Tolerans katsayısı (Örn. Standart Geometrik / GNSS nivelmanında m = 12 mm/</span>
              <Sqrt>km</Sqrt>
              <span>).</span>
            </li>
            <li>
              <b>Kriter:</b> Eğer <b>|W<sub>mm</sub>| &le; T</b> ise dengeleme kabul edilir; aksi durumda ölçülerin tekrarı gerekir.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
