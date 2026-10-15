import React from 'react';
import {
  BookOpen,
  Cpu,
  ShieldCheck,
  Info,
  X,
  FileSpreadsheet,
  MapPin,
  Calculator,
  FileText,
  Mail,
  Lock,
  Compass,
  CheckCircle2,
  HardDrive
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
                Kullanım kılavuzu, teknik jeodezik altyapı, formüller ve sistem bilgileri
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
          {/* Bölüm 1: Kullanım Kılavuzu */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-200">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-tight">
                  Kullanım Kılavuzu
                </h3>
                <p className="text-xs text-slate-500">
                  Uygulamanın adım adım iş akışı ve temel özellikleri
                </p>
              </div>
            </div>

            <div className="space-y-3.5">
              {/* Adım 1: Veri Girişi & Proje Yönetimi */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
                <h4 className="font-bold text-slate-900 text-sm uppercase flex items-center gap-2">
                  <span className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                    1
                  </span>
                  <span>Proje Yönetimi & Veri Girişi</span>
                </h4>
                <p className="text-slate-600 text-xs leading-relaxed text-justify">
                  Saha ölçümlerinizi hızlıca sisteme aktarabilir veya manuel oluşturabilirsiniz:
                </p>
                <ul className="text-xs text-slate-600 space-y-2 pl-1">
                  <li className="flex items-start gap-2">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600 mt-0.5 shrink-0" />
                    <span><b>Çoklu Format Desteği:</b> Ölçüm verilerinizi CSV, Excel (.xlsx/.xls) veya boşluk/tab ile ayrılmış Metin (.txt) dosyalarından tek tıkla içe aktarın.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Compass className="w-3.5 h-3.5 text-indigo-600 mt-0.5 shrink-0" />
                    <span><b>Koordinat Sistemi Tanımlama:</b> Projeniz için ITRF96 (3° TM), ED50 (3° TM) veya UTM (6°) sistemlerinden birini ve ilgili Dilim Orta Meridyenini (DOM) seçin.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 mt-0.5 shrink-0" />
                    <span><b>Röper Kotları & Tolerans:</b> Başlangıç (HA) ve Bitiş (HB) bilinen nivelman röper kotlarını girin; BÖHHBÜY tolerans katsayısını (varsayılan: 12 mm/√km) belirleyin.</span>
                  </li>
                </ul>
              </div>

              {/* Adım 2: Güzergah Seçimi (Harita) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
                <h4 className="font-bold text-slate-900 text-sm uppercase flex items-center gap-2">
                  <span className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                    2
                  </span>
                  <span>Güzergah Seçimi & İnteraktif Harita</span>
                </h4>
                <p className="text-slate-600 text-xs leading-relaxed text-justify">
                  Noktalarınız arasındaki fiziksel nivelman bağlantısını harita üzerinde doğrulayın:
                </p>
                <ul className="text-xs text-slate-600 space-y-2 pl-1">
                  <li className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600 mt-0.5 shrink-0" />
                    <span><b>İnteraktif Güzergah Çizimi:</b> Harita üzerinde noktalara tıklayarak veya seçim sırası panelini kullanarak nivelman poligon hattını oluşturun.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Compass className="w-3.5 h-3.5 text-indigo-600 mt-0.5 shrink-0" />
                    <span><b>Köşe Koordinatları:</b> Harita dış köşelerine 4 adet '+' kros işareti ve anlık Enlem / Boylam coğrafi koordinatları yerleştirilir.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 mt-0.5 shrink-0" />
                    <span><b>Harita İndirme & Pafta:</b> Yüksek çözünürlüklü uydu ve sokak altlığıyla, köşe krosları ve kuzey okuyla birlikte anlık A4 ölçekli PNG harita paftası indirin.</span>
                  </li>
                </ul>
              </div>

              {/* Adım 3: Dengeleme Hesabı */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
                <h4 className="font-bold text-slate-900 text-sm uppercase flex items-center gap-2">
                  <span className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                    3
                  </span>
                  <span>Dengeleme Hesabı & Kriterler</span>
                </h4>
                <p className="text-slate-600 text-xs leading-relaxed text-justify">
                  GNSS ölçüleri ile jeoit modeli entegrasyonu yapılarak BÖHHBÜY kurallarınca dengeleme icra edilir:
                </p>
                <ul className="text-xs text-slate-600 space-y-2 pl-1">
                  <li className="flex items-start gap-2">
                    <Calculator className="w-3.5 h-3.5 text-indigo-600 mt-0.5 shrink-0" />
                    <span><b>Kenar Orantılı Düzeltme Dağıtımı:</b> Kapanma hatası (W), güzergahtaki ardışık noktalar arasındaki yatay mesafeler oranında dağıtılır.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 mt-0.5 shrink-0" />
                    <span><b>Tolerans Değerlendirmesi:</b> Toplam güzergah uzunluğuna bağlı teorik tolerans sınırı (T) hesaplanır ve kapanma hatasının izin verilen limit içinde kalıp kalmadığı otomatik denetlenir.</span>
                  </li>
                </ul>
              </div>

              {/* Adım 4: Raporlama ve Dışa Aktarma */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
                <h4 className="font-bold text-slate-900 text-sm uppercase flex items-center gap-2">
                  <span className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                    4
                  </span>
                  <span>Raporlama & Veri Dışa Aktarma</span>
                </h4>
                <p className="text-slate-600 text-xs leading-relaxed text-justify">
                  Sonuçları kurum ve onay standartlarına uygun resmi formatlarda belgeleyin:
                </p>
                <ul className="text-xs text-slate-600 space-y-2 pl-1">
                  <li className="flex items-start gap-2">
                    <FileText className="w-3.5 h-3.5 text-indigo-600 mt-0.5 shrink-0" />
                    <span><b>Resmi Nivelman Karnesi:</b> Firma/Kurum başlığı, güzergah özeti, kapanma ve tolerans tablosu içeren baskıya hazır A4 Dengeleme Raporu alın.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <HardDrive className="w-3.5 h-3.5 text-indigo-600 mt-0.5 shrink-0" />
                    <span><b>Farklı Format Çıktıları:</b> Dengelenmiş sonuçları Excel (.xlsx), Metin (.txt), Google Earth (.kml) ve dijital imzalı JSON proje yedeği olarak kaydedin.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Bölüm 2: Teknik Altyapı (Nasıl Çalışır?) */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-amber-200">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-tight">
                  Nasıl Çalışır? (Teknik Altyapı)
                </h3>
                <p className="text-xs text-slate-500">
                  Temel jeodezik formüller, hesap adımları ve BÖHHBÜY tolerans standartları
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
                  <span>Düzeltme Dağıtım Yöntemi (BÖHHBÜY Standardı)</span>
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
                  <p>
                    <b>Kriptografik HMAC-SHA256 Koruması:</b> Projenizi dışa aktardığınızda (JSON Yedek), verilerinizin bütünlüğü dijital imza ile mühürlenir. Dosya harici olarak tahrif edilirse içe aktarma sırasında sistem sizi uyarır.
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
                Bu uygulama, GNSS Nivelmanı saha çalışmalarında ve büro hesaplarında hızlı, güvenilir ve BÖHHBÜY standartlarına tam uyumlu güzergah dengelemesi sağlamak amacıyla geliştirilmiştir. Çevrimdışı PWA desteği sayesinde sahada internet olmadan da kesintisiz çalışabilirsiniz.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div className="flex flex-col space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Yazılım / Sürüm
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    Nivelman Hesabı v1.0.0 (BSR Maps)
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
                    <span>acbmaps@gmail.com</span>
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:px-6 bg-white border-t border-slate-200 flex justify-between items-center shrink-0">
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            BSR Maps &middot; GNSS Nivelmanı Dengeleme Sistemi
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
