import { GNSSPoint, CRSSystem, AdjustmentResult } from '../types/gnss';

export interface SavedProject {
  id: string;
  name: string;
  updatedAt: string;
  pointCount: number;
  startPointId: string;
  endPointId: string;
  totalDistKm?: number;
  closingErrorMm?: number;
  isAccepted?: boolean;
  data: {
    points: GNSSPoint[];
    parameters: {
      startKnownH: string;
      endKnownH: string;
      toleranceCoef: string;
      crsSystem: CRSSystem;
      crsDom: string;
    };
    adjustmentResults?: AdjustmentResult | null;
  };
}

const STORAGE_KEY = 'bsr_nivelman_projects_v1';

export function getSavedProjects(): SavedProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Kayıtlı projeler yüklenirken hata:', err);
    return [];
  }
}

export function saveProjectToStorage(project: SavedProject): void {
  try {
    const list = getSavedProjects();
    // Varsa mevcut id'yi veya aynı başlangıç-bitiş ve nokta sayılı son projeyi güncelle
    const filtered = list.filter((p) => p.id !== project.id);
    const updated = [project, ...filtered];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Proje kaydedilirken hata:', err);
  }
}

export function deleteProjectFromStorage(id: string): void {
  try {
    const list = getSavedProjects();
    const updated = list.filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Proje silinirken hata:', err);
  }
}
