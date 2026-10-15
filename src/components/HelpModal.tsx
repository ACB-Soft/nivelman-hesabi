import React from 'react';
import {
  BookOpen,
  Cpu,
  ShieldCheck,
  Info,
  X,
  Mail,
  Lock
} from 'lucide-react';
import { Sqrt } from './Sqrt';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-50 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] text-slate-800 animate-in zoom-in-95"
      >
        {/* Header */}
        <div className="bg-white px-5 sm:px-7 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Yardım & Hakkında
              </h2>
              <p className="text-xs text-slate-500">
                Temel jeodezik formüller, hesap standartları ve sistem bilgileri
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            title="Kapat"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-7 space-y-8">
          {/* Bölüm: Teknik Altyapı (Nasıl Çalışır?) */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-amber-200">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-tight">
                  Nasıl Çalışır?
                </h3>
                <p className="text-xs text-slate-500">
                  Temel jeodezik formüller, hesap adımları ve tolerans standartları
                </p>
              </div>
            </div>

            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-6">
              {/* 1. Temel Yükseklik İlişkisi */}
              <div className="space-y-2.5">
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded flex items-center justify-center text-[11px] font-mono font-bold">
                    1
                  </span>
                  <span>Temel Yükseklik İlişkisi</span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed text-justify">
                  Uydu bazlı GNSS ölçümleri doğrudan referans elipsoidine göre geometrik yükseklik (<b>h</b>) sağlar. Jeodezik uygulamalarda ve haritacılıkta kullanılan yükseklik ise ortalama deniz seviyesini baz alan Ortometrik Yükseklik (<b>H</b>)'tir. Bu iki yükseklik arasındaki fark Jeoit Ondülasyonu (<b>N</b>) ile ifade edilir:
                </p>
                <div className="bg-slate-100 text-slate-900 p-3.5 rounded-xl font-mono text-lg sm:text-xl font-bold flex justify-center items-center gap-4 my-2 shadow-inner tracking-wide">
                  <span className="text-emerald-700">H = h - N</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px] text-slate-600 pt-1">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <strong className="text-slate-800 block mb-1">h (Elipsoit Yüksekliği)</strong>
                    GNSS alıcısı tarafından WGS84/GRS80 elipsoidine dik ölçülen geometrik yükseklik.
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <strong className="text-slate-800 block mb-1">N (Jeoit Ondülasyonu)</strong>
                    TG-20, EGM-96 vb. modellerden elde edilen jeoid-elipsoid yükseklik farkı.
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <strong className="text-slate-800 block mb-1">H (Ortometrik Yükseklik)</strong>
                    Jeoid referans yüzeyinden olan fiziksel, nivelman esaslı gerçek yükseklik.
                  </div>
                </div>
              </div>

              {/* 2. Güzergah Dengelemesi ve Kapanma Hatası Hesabı */}
              <div className="space-y-2.5">
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded flex items-center justify-center text-[11px] font-mono font-bold">
                    2
                  </span>
                  <span>Güzergah Dengelemesi ve Kapanma Hatası Hesabı</span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed text-justify">
                  Güzergah, bilinen iki röper noktası (Başlangıç A ve Bitiş B) arasında çekilmiş dayalı nivelman güzergahıdır:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono">
                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1">
                    <div className="font-bold text-sky-700 text-xs font-sans">1. Teorik Kot Farkı</div>
                    <div className="font-bold text-slate-900 bg-white p-2 rounded border border-slate-300 text-center">
                      &Delta;H<sub>gerçek</sub> = H<sub>B</sub> - H<sub>A</sub>
                    </div>
                    <p className="text-[10px] font-sans text-slate-500">Röperlerin tanımlı hassas kot farkı.</p>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1">
                    <div className="font-bold text-sky-700 text-xs font-sans">2. Ölçülen GNSS Kot Farkı</div>
                    <div className="font-bold text-slate-900 bg-white p-2 rounded border border-slate-300 text-center">
                      &Delta;H<sub>GNSS</sub> = (h<sub>B</sub> - N<sub>B</sub>) - (h<sub>A</sub> - N<sub>A</sub>)
                    </div>
                    <p className="text-[10px] font-sans text-slate-500">Ölçülen ham ortometrik kot farkı.</p>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1">
                    <div className="font-bold text-sky-700 text-xs font-sans">3. Kapanma Hatası (W)</div>
                    <div className="font-bold text-slate-900 bg-white p-2 rounded border border-slate-300 text-center">
                      W = &Delta;H<sub>gerçek</sub> - &Delta;H<sub>GNSS</sub> [m]
                    </div>
                    <p className="text-[10px] font-sans text-slate-500">W<sub>mm</sub> = W &middot; 1000 [mm]</p>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1">
                    <div className="font-bold text-sky-700 text-xs font-sans">4. Datum Ofseti (&Delta;H<sub>offset</sub>)</div>
                    <div className="font-bold text-slate-900 bg-white p-2 rounded border border-slate-300 text-center">
                      &Delta;H<sub>offset</sub> = H<sub>A</sub> - (h<sub>A</sub> - N<sub>A</sub>)
                    </div>
                    <p className="text-[10px] font-sans text-slate-500">Başlangıç röperi sabit sistem kayması.</p>
                  </div>
                </div>
              </div>

              {/* 3. Düzeltme Dağıtım Yöntemi */}
              <div className="space-y-2.5">
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded flex items-center justify-center text-[11px] font-mono font-bold">
                    3
                  </span>
                  <span>Düzeltme Dağıtım Yöntemi </span>
                </h4>
                <div className="bg-amber-50/60 border border-amber-200 p-3.5 rounded-xl space-y-2 text-xs">
                  <strong className="text-amber-900 block font-semibold text-xs">
                    Kenar Uzunluğuna Göre Orantılı Dağıtım
                  </strong>
                  <p className="text-slate-600 leading-relaxed text-justify">
                    Kapanma hatası W, güzergahtaki komşu noktalar arasındaki yatay mesafe (S<sub>i</sub>) ile orantılı olarak dağıtılır:
                  </p>
                  <div className="bg-white p-2.5 rounded border border-amber-300 font-mono text-sm sm:text-base font-bold text-amber-900 text-center">
                    v<sub>i</sub> = W &middot; ( S<sub>i</sub> / S<sub>toplam</sub> )
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs font-mono space-y-1.5">
                  <div className="font-bold text-slate-800 text-xs font-sans">Nihai Dengelenmiş Kot Hesabı (H<sub>i</sub>):</div>
                  <div className="bg-white p-2.5 rounded border border-slate-300 text-emerald-700 font-bold text-sm sm:text-base text-center">
                    H<sub>i</sub> = (h<sub>i</sub> - N<sub>i</sub>) + &Delta;H<sub>offset</sub> + &Sigma;<sub>k=1</sub><sup>i</sup> v<sub>k</sub>
                  </div>
                </div>
              </div>

              {/* 4. Tolerans Hesabı */}
              <div className="space-y-2.5">
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded flex items-center justify-center text-[11px] font-mono font-bold">
                    4
                  </span>
                  <span>Tolerans Hesabı ve Standartlar</span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed text-justify">
                  Büyük Ölçekli Harita ve Harita Bilgileri Üretim Yönetmeliği (BÖHHBÜY) uyarınca nivelman kapanma toleransı (T):
                </p>
                <div className="bg-slate-100 text-slate-900 p-3 rounded-xl font-mono text-base sm:text-lg font-bold flex justify-center items-center gap-3 my-2 shadow-inner">
                  <span className="flex items-center gap-1.5">
                    <span>T = m &middot;</span>
                    <Sqrt>S<sub>km</sub></Sqrt>
                    <span>[mm]</span>
                  </span>
                </div>
                <ul className="text-xs text-slate-600 space-y-1.5 pl-2">
                  <li>
                    <b>S<sub>km</sub>:</b> Kilometre cinsinden toplam güzergah uzunluğu (S<sub>toplam</sub> / 1000).
                  </li>
                  <li className="flex items-center gap-1 flex-wrap">
                    <span><b>m:</b> Tolerans katsayısı (Örn. Standart Geometrik / GNSS nivelmanında m = 12 mm/</span>
                    <Sqrt>km</Sqrt>
                    <span>).</span>
                  </li>
                  <li>
                    <b>Kabul Kriteri:</b> Eğer <b>|W<sub>mm</sub>| &le; T</b> ise dengeleme kabul edilir; aksi takdirde saha ölçülerinin tekrarlanması gerekir.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Bölüm 3: Veri Güvenliği */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-emerald-200">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-tight">
                  Veri Güvenliği
                </h3>
                <p className="text-xs text-slate-500">
                  Cihaz içi yerel depolama ve kriptografik bütünlük koruması
                </p>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-5 space-y-3">
              <div className="flex items-start gap-3">
                <Lock className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                <div className="text-xs text-emerald-950 leading-relaxed space-y-2 text-justify font-medium">
                  <p>
                    <b>Yerel Depolama (Local Storage):</b> Proje ve ölçüm verileriniz tamamen tarayıcınızın güvenli yerel depolama alanında saklanır. Harici sunuculara hiçbir koordinat veya ölçüm verisi aktarılmaz.
                  </p>
                 
                  <p className="text-[11px] text-emerald-800">
                    Önemli Not: Tarayıcı geçmişinizi ve önbelleğinizi temizlediğinizde veya cihazınızı sıfırladığınızda yerel veriler silinebilir. Çalışmalarınızı düzenli olarak <b>JSON Proje Yedeği</b> alarak arşivleyiniz.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Bölüm 4: Hakkında */}
          <section className="space-y-4 pb-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-800 rounded-xl flex items-center justify-center text-white shadow-md shadow-slate-300">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-tight">
                  Hakkında
                </h3>
                <p className="text-xs text-slate-500">
                  Uygulama sürümü, geliştirici ve iletişim bilgileri
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
              <p className="text-xs text-slate-700 font-medium leading-relaxed text-justify">
                Bu uygulama, GNSS Nivelmanı saha çalışmalarında ve büro hesaplarında hızlı, güvenilir ve standartlara tam uyumlu güzergah dengelemesi sağlamak amacıyla geliştirilmiştir.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div className="flex flex-col space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Yazılım / Sürüm
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    Nivelman Hesabı v1.0
                  </span>
                </div>
                <div className="flex flex-col space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    İletişim & Geri Bildirim
                  </span>
                  <a
                    href="mailto:acbmaps@gmail.com"
                    className="text-xs font-bold text-sky-600 hover:text-sky-700 hover:underline flex items-center gap-1"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>bsrmaps@gmail.com</span>
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:px-6 bg-white border-t border-slate-200 flex justify-between items-center shrink-0">
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            BSR Maps
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition shadow-xs cursor-pointer ml-auto"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
