/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GNSSPoint, AdjustmentResult, CRSSystem } from './types/gnss';
import { performAdjustment } from './utils/geodesy';
import { DataTableTab } from './components/DataTableTab';
import { MapRouteTab } from './components/MapRouteTab';
import { ResultsTab } from './components/ResultsTab';
import { ReportTab } from './components/ReportTab';
import { DocsTab } from './components/DocsTab';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import {
  Layers,
  Table,
  MapPin,
  BarChart3,
  FileText,
  BookOpen,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'data' | 'map' | 'results' | 'report' | 'docs'>('data');
  const [points, setPoints] = useState<GNSSPoint[]>([]);

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
      setAdjustmentResults(res);
      setIsLoading(false);
      setActiveTab('results');
      showToast('Dengeleme hesabı başarıyla tamamlandı!');
    }, 600);
  };

  const handleApplyRouteToTable = (ordered: GNSSPoint[]) => {
    setPoints(ordered);
    setActiveTab('data');
  };

  return (
    <div className="bg-slate-50 text-slate-800 font-sans min-h-screen flex flex-col antialiased">
      {/* Offline Connectivity Indicator */}
      <OfflineIndicator />

      {/* Top Header */}
      <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 no-print sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center space-x-3.5">
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 mb-6 space-x-2 sm:space-x-4 no-print overflow-x-auto custom-scrollbar">
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

          <button
            onClick={() => setActiveTab('docs')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'docs'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>Teknik Dokümantasyon</span>
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === 'data' && (
          <DataTableTab
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
            results={adjustmentResults}
            onSwitchToData={() => setActiveTab('data')}
          />
        )}

        {activeTab === 'report' && (
          <ReportTab results={adjustmentResults} />
        )}

        {activeTab === 'docs' && (
          <DocsTab />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-4 text-center border-t border-slate-800 no-print mt-auto">
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
        <div className="fixed bottom-5 right-5 bg-emerald-600 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-lg z-50 flex items-center gap-2 animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
