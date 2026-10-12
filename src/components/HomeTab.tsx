import React, { useState, useRef } from 'react';
import { SavedProject } from '../utils/projectStorage';
import { DocsTab } from './DocsTab';
import {
  FilePlus2,
  FolderOpen,
  Upload,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Trash2,
  Download,
  X,
  ArrowRight,
  BookOpen
} from 'lucide-react';

interface HomeTabProps {
  onNewProject: () => void;
  onRestoreBackup: (data: any) => void;
  onOpenProject: (project: SavedProject) => void;
  savedProjects: SavedProject[];
  onDeleteProject: (id: string) => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  onNewProject,
  onRestoreBackup,
  onOpenProject,
  savedProjects,
  onDeleteProject,
}) => {
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        onRestoreBackup(parsed);
        setIsLoadModalOpen(false);
      } catch (err) {
        alert('Dosya okunamadı: Geçersiz JSON biçimi.');
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadProjectJSON = (p: SavedProject) => {
    const blob = new Blob([JSON.stringify(p.data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${p.name.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2">
      {/* Hidden File Input for Bilgisayardan Dosya Seç */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json,application/json"
        className="hidden"
      />

      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 text-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-700/60 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-4">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Nivelman Hesabı Platformuna Hoş Geldiniz
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            İki röper noktası arasındaki GNSS veya geometrik nivelman güzergahlarını standartlara uygun olarak dengeleyin, kapanma hatalarını hesaplayın, harita üzerinde güzergahınızı inceleyin ve resmi raporlar oluşturun.
          </p>
          <div className="pt-1">
            <button
              onClick={() => setIsDocsOpen(true)}
              className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700/90 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 transition cursor-pointer"
              title="Teknik formülleri ve dengeleme standartlarını inceleyin"
            >
              <BookOpen className="w-3.5 h-3.5 text-sky-400" />
              <span>Teknik Altyapı</span>
            </button>
          </div>
        </div>

        {/* Decorative Grid Pattern Background */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none hidden md:block">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="home-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#home-grid)" />
          </svg>
        </div>
      </div>

      {/* Main Action Cards (Yeni Proje Başlat & Proje Yükle) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Yeni Proje Başlat */}
        <div
          onClick={onNewProject}
          className="group bg-white hover:bg-sky-50/40 p-6 sm:p-8 rounded-2xl border-2 border-slate-200 hover:border-sky-500 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FilePlus2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                Yeni Proje Başlat
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Sıfırdan yeni bir nivelman dengeleme çalışması başlatın ve doğrudan veri girişi sayfasına geçiş yapın.
              </p>
            </div>
          </div>

          <div className="pt-6 flex items-center text-xs font-bold text-sky-600 group-hover:text-sky-700">
            <span>Veri Girişine Başla</span>
            <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 2: Proje Yükle (.json) */}
        <div
          onClick={() => setIsLoadModalOpen(true)}
          className="group bg-white hover:bg-indigo-50/40 p-6 sm:p-8 rounded-2xl border-2 border-slate-200 hover:border-indigo-500 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FolderOpen className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                  Proje Yükle (.json)
                </h3>
                {savedProjects.length > 0 && (
                  <span className="text-[11px] font-semibold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                    {savedProjects.length} Kayıtlı
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Eski projeleri listeleyin veya bilgisayardan bir .json dosyası seçerek projeyi açın.
              </p>
            </div>
          </div>

          <div className="pt-6 flex items-center text-xs font-bold text-indigo-600 group-hover:text-indigo-700">
            <span>Projeleri İncele ve Aç</span>
            <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Recent Projects Section (Direct Access on Home Screen) */}
      {savedProjects.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-600" />
              <span>Son Kaydedilen Projeler</span>
            </h3>
            <button
              onClick={() => setIsLoadModalOpen(true)}
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 cursor-pointer"
            >
              Tümünü Yönet ({savedProjects.length})
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {savedProjects.slice(0, 3).map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-xl border border-slate-200 hover:border-sky-300 bg-slate-50/60 hover:bg-white transition-all shadow-xs flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-900 truncate" title={p.name}>
                      {p.name}
                    </h4>
                    {p.isAccepted !== undefined && (
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.2 rounded shrink-0 ${
                          p.isAccepted
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {p.isAccepted ? 'Kabul' : 'Ret'}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {p.updatedAt}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-600 pt-2 border-t border-slate-200">
                  <span className="flex items-center gap-1 font-mono">
                    <MapPin className="w-3 h-3 text-sky-600" />
                    <span>{p.pointCount} Nokta</span>
                  </span>
                  {p.totalDistKm !== undefined && (
                    <span className="font-mono text-slate-500">
                      {p.totalDistKm.toFixed(2)} km
                    </span>
                  )}
                  <button
                    onClick={() => onOpenProject(p)}
                    className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold rounded-md transition cursor-pointer"
                  >
                    Aç
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Proje Yükle Modal */}
      {isLoadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <FolderOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Proje Yükle (.json)</h3>
                  <p className="text-[11px] text-slate-500">
                    Kayıtlı projelerden seçin veya bilgisayarınızdan dosya yükleyin
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsLoadModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto custom-scrollbar space-y-6">
              {/* Option 1: Bilgisayardan Dosya Seç */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <FileCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">
                      Bilgisayardan Dosya Seç (.json)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Bilgisayarınızda kayıtlı bir .json yedek dosyasını açın
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Bilgisayardan Dosya Seç (.json)</span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <span className="relative bg-white px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Kayıtlı Projeler ({savedProjects.length})
                </span>
              </div>

              {/* Option 2: Kayıtlı Projeler Listesi */}
              <div className="space-y-2.5">
                {savedProjects.length === 0 ? (
                  <div className="text-center py-10 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                    <FolderOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">Henüz Kayıtlı Proje Yok</p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                      Yeni bir proje başlatıp dengeleme hesabı tamamlandığında, projeleriniz otomatik olarak bu alanda listelenecektir.
                    </p>
                  </div>
                ) : (
                  savedProjects.map((p) => (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition-all flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {p.name}
                          </h4>
                          {p.isAccepted !== undefined ? (
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                p.isAccepted
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {p.isAccepted ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Kabul Edildi</span>
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                                  <span>Tolerans Dışı</span>
                                </>
                              )}
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                              Taslak
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{p.updatedAt}</span>
                          </span>
                          <span>•</span>
                          <span className="font-mono">{p.pointCount} Nokta</span>
                          {p.totalDistKm !== undefined && (
                            <>
                              <span>•</span>
                              <span className="font-mono">{p.totalDistKm.toFixed(3)} km</span>
                            </>
                          )}
                          {p.closingErrorMm !== undefined && (
                            <>
                              <span>•</span>
                              <span className="font-mono">W: {p.closingErrorMm.toFixed(2)} mm</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleDownloadProjectJSON(p)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                          title="Projeyi .json olarak indir"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`"${p.name}" projesi silinsin mi?`)) {
                              onDeleteProject(p.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Projeyi sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            onOpenProject(p);
                            setIsLoadModalOpen(false);
                          }}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center gap-1 cursor-pointer"
                        >
                          <span>Projeyi Aç</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsLoadModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teknik Altyapı Modal */}
      {isDocsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Teknik Altyapı</h3>
                  <p className="text-[11px] text-slate-500">
                    Jeodezik formüller, dengeleme teorisi ve tolerans standartları
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDocsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar">
              <DocsTab />
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsDocsOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
