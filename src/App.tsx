/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GNSSPoint, AdjustmentResult, CRSSystem } from './types/gnss';
import { performAdjustment } from './utils/geodesy';
import { HomeTab } from './components/HomeTab';
import { DataTableTab } from './components/DataTableTab';
import { MapRouteTab } from './components/MapRouteTab';
import { ResultsTab } from './components/ResultsTab';
import { ReportTab } from './components/ReportTab';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import {
  SavedProject,
  getSavedProjects,
  saveProjectToStorage,
  deleteProjectFromStorage,
  updateProjectNameInStorage
} from './utils/projectStorage';
import {
  Layers,
  Table,
  MapPin,
  BarChart3,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Home
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'data' | 'map' | 'results' | 'report'>('home');
  const [points, setPoints] = useState<GNSSPoint[]>([]);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  useEffect(() => {
    setSavedProjects(getSavedProjects());
  }, []);

  useEffect(() => {
    document.title = 'Nivelman Hesabı';
    try {
      if (window.top && window.top !== window) {
        window.top.document.title = 'Nivelman Hesabı';
      }
    } catch {
      // Cross-origin iframe restriction, safely ignore
    }
  }, []);

  const [projectName, setProjectName] = useState<string>('');
  const [startKnownH, setStartKnownH] = useState<string>('');
  const [endKnownH, setEndKnownH] = useState<string>('');
  const [toleranceCoef, setToleranceCoef] = useState<string>('12');
  const [crsSystem, setCrsSystem] = useState<CRSSystem>('itrf3');
  const [crsDom, setCrsDom] = useState<string>('30');

  const [adjustmentResults, setAdjustmentResults] = useState<AdjustmentResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const handleCalculate = () => {
    if (points.length < 2) {
      alert('Dengeleme hesabı için en az 2 nokta girmelisiniz!');
      return;
    }

    if (startKnownH === '' || endKnownH === '') {
      alert('Lütfen Başlangıç (HA) ve Bitiş (HB) Röper Kotlarını giriniz!');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const hA = parseFloat(startKnownH);
      const hB = parseFloat(endKnownH);
      const mVal = parseFloat(toleranceCoef) || 12;
      const domVal = parseInt(crsDom) || 30;

      const res = performAdjustment(points, hA, hB, mVal, crsSystem, domVal);
      if (!res) {
        setIsLoading(false);
        alert('Dengeleme hesabı yapılamadı. Lütfen nokta koordinatlarını kontrol ediniz.');
        return;
      }
      setAdjustmentResults(res);
      setIsLoading(false);
      setActiveTab('results');
      showToast('Dengeleme hesabı başarıyla tamamlandı!');

      // Dengelemenin yapıldığı tarih ve saati kaydet
      const now = new Date();
      const calculationDate = now.toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const startId = points[0]?.id || 'A';
      const endId = points[points.length - 1]?.id || 'B';
      const projId = currentProjectId || `proj_${Date.now()}`;
      setCurrentProjectId(projId);

      const autoProject: SavedProject = {
        id: projId,
        name: projectName.trim() || `${startId} - ${endId} Nivelman Güzergahı`,
        calculatedAt: calculationDate,
        updatedAt: calculationDate,
        pointCount: points.length,
        startPointId: startId,
        endPointId: endId,
        totalDistKm: res.totalDistKm,
        closingErrorMm: res.W_mm,
        isAccepted: res.isAccepted,
        data: {
          points,
          parameters: {
            startKnownH,
            endKnownH,
            toleranceCoef,
            crsSystem,
            crsDom,
          },
          adjustmentResults: res,
        },
      };
      saveProjectToStorage(autoProject);
      setSavedProjects(getSavedProjects());
    }, 600);
  };

  const handleNewProject = () => {
    setCurrentProjectId(null);
    setPoints([]);
    setStartKnownH('');
    setEndKnownH('');
    setProjectName('');
    setAdjustmentResults(null);
    setActiveTab('data');
    showToast('Yeni proje başlatıldı. Veri girişine geçildi.');
  };

  const handleOpenProject = (project: SavedProject) => {
    // Sadece projeyi açıyoruz - yeni dengeleme yapılmadıkça tekrar tekrar kayıt YAPILMAZ
    setCurrentProjectId(project.id);
    setProjectName(project.name);
    setPoints(project.data.points || []);
    if (project.data.parameters) {
      setStartKnownH(project.data.parameters.startKnownH || '');
      setEndKnownH(project.data.parameters.endKnownH || '');
      setToleranceCoef(project.data.parameters.toleranceCoef || '12');
      if (project.data.parameters.crsSystem) setCrsSystem(project.data.parameters.crsSystem);
      if (project.data.parameters.crsDom) setCrsDom(project.data.parameters.crsDom);
    }
    setAdjustmentResults(project.data.adjustmentResults || null);

    if (project.data.adjustmentResults) {
      setActiveTab('results');
    } else {
      setActiveTab('data');
    }
    showToast(`"${project.name}" projesi açıldı.`);
  };

  const handleRenameProject = (id: string, newName: string) => {
    updateProjectNameInStorage(id, newName);
    setSavedProjects(getSavedProjects());
    if (currentProjectId === id) {
      setProjectName(newName);
    }
    showToast(`Proje ismi güncellendi: "${newName}"`);
  };

  const handleDeleteProject = (id: string) => {
    deleteProjectFromStorage(id);
    setSavedProjects(getSavedProjects());
    if (currentProjectId === id) {
      setCurrentProjectId(null);
    }
    showToast('Proje silindi.');
  };

  const handleApplyRouteToTable = (ordered: GNSSPoint[]) => {
    setPoints(ordered);
    setActiveTab('data');
  };

  const handleBackupJSON = () => {
    if (!adjustmentResults && points.length === 0) {
      alert('Yedeklenecek veri bulunamadı!');
      return;
    }

    const currentProj = currentProjectId
      ? savedProjects.find((p) => p.id === currentProjectId)
      : null;
    const calcDate =
      currentProj?.calculatedAt ||
      currentProj?.updatedAt ||
      (adjustmentResults
        ? new Date().toLocaleString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : undefined);

    const backupData = {
      app: 'BSR Maps - Nivelman Hesabı',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      id: currentProjectId || undefined,
      name: projectName.trim() || undefined,
      projectName: projectName.trim() || undefined,
      calculatedAt: calcDate,
      updatedAt: calcDate,
      points: points,
      parameters: {
        startKnownH,
        endKnownH,
        toleranceCoef,
        crsSystem,
        crsDom,
      },
      adjustmentResults: adjustmentResults,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    const startId = points[0]?.id || 'A';
    const endId = points[points.length - 1]?.id || 'B';
    const safeName = projectName.trim()
      ? projectName.trim().replace(/\s+/g, '_')
      : `Nivelman_Yedek_${startId}_${endId}`;
    a.href = url;
    a.download = `${safeName}_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Hesap yedeği başarıyla indirildi (.json)');
  };

  const handleRestoreBackup = (data: any) => {
    try {
      if (!data) throw new Error('Geçersiz dosya');

      // 0. Proje İsmini aktar
      const importedName = data.name || data.projectName || '';
      if (importedName) {
        setProjectName(importedName);
      }

      // 1. Nokta listesini çıkar
      const pts = Array.isArray(data) ? data : (data.points || []);
      if (!Array.isArray(pts) || pts.length === 0) {
        alert('Geçersiz yedek dosyası: Nokta verisi bulunamadı!');
        return;
      }

      const validatedPoints: GNSSPoint[] = pts.map((p: any, idx: number) => ({
        id: String(p.id ?? `P.${idx + 1}`),
        y: Number(p.y) || 0,
        x: Number(p.x) || 0,
        h: Number(p.h) || 0,
        n: Number(p.n) || 0,
        knownH: p.knownH !== undefined && p.knownH !== null ? Number(p.knownH) : null,
      }));

      setPoints(validatedPoints);

      // 2. Parametreleri aktar
      if (data.parameters) {
        if (data.parameters.startKnownH !== undefined && data.parameters.startKnownH !== null) {
          setStartKnownH(String(data.parameters.startKnownH));
        }
        if (data.parameters.endKnownH !== undefined && data.parameters.endKnownH !== null) {
          setEndKnownH(String(data.parameters.endKnownH));
        }
        if (data.parameters.toleranceCoef !== undefined && data.parameters.toleranceCoef !== null) {
          setToleranceCoef(String(data.parameters.toleranceCoef));
        }
        if (data.parameters.crsSystem) {
          setCrsSystem(data.parameters.crsSystem);
        }
        if (data.parameters.crsDom !== undefined && data.parameters.crsDom !== null) {
          setCrsDom(String(data.parameters.crsDom));
        }
      } else {
        if (data.H_start !== undefined && data.H_start !== null) setStartKnownH(String(data.H_start));
        if (data.H_end !== undefined && data.H_end !== null) setEndKnownH(String(data.H_end));
        if (data.m_coef !== undefined && data.m_coef !== null) setToleranceCoef(String(data.m_coef));
        if (data.crsSystem) setCrsSystem(data.crsSystem);
        if (data.dom !== undefined && data.dom !== null) setCrsDom(String(data.dom));
      }

      // 3. Dengeleme sonuçlarını aktar (varsa)
      let adjRes: AdjustmentResult | null = null;
      if (data.adjustmentResults) {
        adjRes = data.adjustmentResults;
        setAdjustmentResults(data.adjustmentResults);
      } else if (data.points && data.H_start !== undefined && data.deltaH_real !== undefined) {
        adjRes = data as AdjustmentResult;
        setAdjustmentResults(data as AdjustmentResult);
      } else {
        setAdjustmentResults(null);
      }

      // 4. Proje ID'sini ve tarihini belirle
      const importedId = data.id || `proj_${Date.now()}`;
      setCurrentProjectId(importedId);

      // Eğer dosyada dengeleme sonuçları varsa ve henüz listede yoksa,
      // orijinal dengelendiği tarih bilgisiyle ekle (şimdiki saatle ezme!)
      const alreadyInList = savedProjects.some((p) => p.id === importedId);
      const originalDate =
        data.calculatedAt ||
        data.updatedAt ||
        (data.exportedAt
          ? new Date(data.exportedAt).toLocaleString('tr-TR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : new Date().toLocaleString('tr-TR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }));

      if (!alreadyInList && adjRes) {
        const startId = validatedPoints[0]?.id || 'A';
        const endId = validatedPoints[validatedPoints.length - 1]?.id || 'B';
        const importedProj: SavedProject = {
          id: importedId,
          name: importedName || `${startId} - ${endId} Nivelman Güzergahı`,
          calculatedAt: originalDate,
          updatedAt: originalDate,
          pointCount: validatedPoints.length,
          startPointId: startId,
          endPointId: endId,
          totalDistKm: adjRes?.totalDistKm || data.totalDistKm,
          closingErrorMm: adjRes?.W_mm || data.W_mm,
          isAccepted: adjRes?.isAccepted !== undefined ? adjRes.isAccepted : data.isAccepted,
          data: {
            points: validatedPoints,
            parameters: {
              startKnownH: data.parameters?.startKnownH || String(data.H_start || ''),
              endKnownH: data.parameters?.endKnownH || String(data.H_end || ''),
              toleranceCoef: data.parameters?.toleranceCoef || String(data.m_coef || '12'),
              crsSystem: data.parameters?.crsSystem || data.crsSystem || 'itrf3',
              crsDom: String(data.parameters?.crsDom || data.dom || '30'),
            },
            adjustmentResults: adjRes,
          },
        };
        saveProjectToStorage(importedProj);
        setSavedProjects(getSavedProjects());
      }

      if (adjRes) {
        setActiveTab('results');
      } else {
        setActiveTab('data');
      }

      showToast(`${validatedPoints.length} nokta ve tüm hesap parametreleri başarıyla yüklendi!`);
    } catch (err) {
      console.error(err);
      alert('Yedek dosyası okunurken hata oluştu. Lütfen geçerli bir .json dosyası seçiniz.');
    }
  };

  return (
    <div className="bg-slate-50 text-slate-800 font-sans min-h-screen flex flex-col antialiased">
      {/* Offline Connectivity Indicator */}
      <OfflineIndicator />

      {/* Top Header */}
      <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 no-print sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div
              className="flex items-center space-x-3.5 cursor-pointer"
              onClick={() => setActiveTab('home')}
              title="Anasayfaya Git"
            >
              <img
                src="./icon.svg"
                alt="Nivelman Hesabı Logo"
                className="w-12 h-12 sm:w-14 sm:h-14 object-contain shrink-0 drop-shadow-md hover:scale-105 transition-transform"
              />
              <div>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  Nivelman Hesabı
                </h1>
                <p className="text-xs text-slate-400 hidden sm:block">
                  Dayalı GNSS Nivelmanı Uygulaması
                </p>
              </div>
            </div>

            {/* Header Right Actions: PWA Install */}
            <div className="flex items-center gap-2.5">
              <PWAInstallButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-16">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 mb-6 space-x-2 sm:space-x-4 no-print overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab('home')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'home'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Home className="w-4 h-4 text-sky-600" />
            <span>Anasayfa</span>
          </button>

          <button
            onClick={() => setActiveTab('data')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'data'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>Veri Girişi</span>
            <span className="bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
              {points.length} Nokta
            </span>
          </button>

          <button
            onClick={() => setActiveTab('map')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'map'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>Güzergah Seçimi (Harita)</span>
          </button>

          <button
            onClick={() => setActiveTab('results')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'results'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-sky-600" />
            <span>Dengeleme Sonuçları</span>
            {adjustmentResults && (
              <span
                className={`w-2 h-2 rounded-full ${
                  adjustmentResults.isAccepted ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
            )}
          </button>

          <button
            onClick={() => setActiveTab('report')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'report'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4 text-amber-600" />
            <span>Rapor ve Çıktı Al</span>
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === 'home' && (
          <HomeTab
            onNewProject={handleNewProject}
            onRestoreBackup={handleRestoreBackup}
            onOpenProject={handleOpenProject}
            savedProjects={savedProjects}
            onDeleteProject={handleDeleteProject}
            onRenameProject={handleRenameProject}
          />
        )}

        {activeTab === 'data' && (
          <DataTableTab
            projectName={projectName}
            setProjectName={setProjectName}
            points={points}
            setPoints={setPoints}
            startKnownH={startKnownH}
            setStartKnownH={setStartKnownH}
            endKnownH={endKnownH}
            setEndKnownH={setEndKnownH}
            toleranceCoef={toleranceCoef}
            setToleranceCoef={setToleranceCoef}
            crsSystem={crsSystem}
            setCrsSystem={setCrsSystem}
            crsDom={crsDom}
            setCrsDom={setCrsDom}
            onCalculate={handleCalculate}
            onSwitchToMap={() => setActiveTab('map')}
            showToast={showToast}
            onRestoreBackup={handleRestoreBackup}
          />
        )}

        {activeTab === 'map' && (
          <MapRouteTab
            points={points}
            setPoints={setPoints}
            crsSystem={crsSystem}
            crsDom={crsDom}
            onApplyRouteToTable={handleApplyRouteToTable}
            showToast={showToast}
          />
        )}

        {activeTab === 'results' && (
          <ResultsTab
            projectName={projectName}
            results={adjustmentResults}
            onSwitchToData={() => setActiveTab('data')}
            onBackupJSON={handleBackupJSON}
          />
        )}

        {activeTab === 'report' && (
          <ReportTab
            projectName={projectName}
            results={adjustmentResults}
            onBackupJSON={handleBackupJSON}
          />
        )}
      </main>

      {/* Fixed Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-xs text-slate-400 text-xs py-2.5 text-center border-t border-slate-800 shadow-md no-print">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <span>BSR Maps - Nivelman Hesabı v1.0</span>
        </div>
      </footer>

      {/* Calculation Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-white no-print">
          <div className="bg-white text-slate-800 p-6 sm:p-8 rounded-2xl shadow-2xl flex flex-col items-center space-y-4 max-w-sm w-full text-center border border-slate-100 animate-in zoom-in-95">
            <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin" />
            <div>
              <h4 className="font-bold text-base text-slate-800">Dengeleme Hesabı Yapılıyor</h4>
              <p className="text-xs text-slate-500 mt-1">
                Ortometrik kotlar ve kenar orantılı düzeltmeler hesaplanıyor...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-12 sm:bottom-14 right-4 sm:right-5 bg-emerald-600 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl z-50 flex items-center gap-2 animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
