import { GNSSPoint, CRSSystem, AdjustmentResult } from '../types/gnss';

export interface SavedProject {
  id: string;
  name: string;
  calculatedAt?: string;
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
    const existingIndex = list.findIndex((p) => p.id === project.id);
    let updated: SavedProject[];
    if (existingIndex >= 0) {
      // Mevcut projeyi güncelle
      updated = [...list];
      updated[existingIndex] = project;
    } else {
      // Yeni projeyi başa ekle
      updated = [project, ...list];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Proje kaydedilirken hata:', err);
  }
}

export function updateProjectNameInStorage(id: string, newName: string): void {
  try {
    const list = getSavedProjects();
    const updated = list.map((p) => {
      if (p.id === id) {
        return {
          ...p,
          name: newName.trim(),
        };
      }
      return p;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Proje ismi güncellenirken hata:', err);
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
