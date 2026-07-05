import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { MPIFData, DashboardState, FileState, ValidationResult } from '@/types/mpif';
import { parseMPIF, stringifyMPIF } from '@/utils/mpifParser';

interface MPIFStore {
  // Data state
  mpifData: MPIFData | null;
  
  // UI state
  dashboard: DashboardState;
  fileState: FileState;
  validation: ValidationResult;
  
  // Actions
  loadMPIFFile: (content: string, fileName: string) => Promise<void>;
  createNewMPIF: () => void;
  updateSection: (section: keyof MPIFData, data: any) => void;
  
  // UI actions
  setCurrentSection: (section: string) => void;
  setColumnLayout: (mode: 'single' | 'double') => void;
  
  // File actions
  exportMPIF: () => string;
  saveDraft: () => void;
  loadDraft: () => boolean;
  getDraftInfo: () => { fileName?: string; savedAt: string } | null;
  resetData: () => void;
  clearUnsavedChanges: () => void;
  
  // Validation
  validateData: () => ValidationResult;
  
}

const DRAFT_STORAGE_KEY = 'mpif-gui:draft:v1';

interface StoredMPIFDraft {
  mpifData: MPIFData;
  fileName?: string;
  currentSection?: string;
  savedAt: string;
}

const readStoredDraft = (): StoredMPIFDraft | null => {
  if (typeof window === 'undefined') return null;

  try {
    const rawDraft = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!rawDraft) return null;

    const draft = JSON.parse(rawDraft) as StoredMPIFDraft;
    if (!draft.mpifData || !draft.savedAt) return null;

    return draft;
  } catch {
    return null;
  }
};

const createDefaultMPIFData = (): MPIFData => ({
  metadata: {
    dataName: '',
    creationDate: new Date().toISOString().split('T')[0],
    generatorVersion: '1.1',
    publicationDOI: '',
    procedureStatus: '',
    name: '',
    email: '',
    orcid: '',
    address: '',
    phone: ''
  },
  productInfo: {
    type: '',
    casNumber: '',
    ccdcNumber: '',
    commonName: '',
    systematicName: '',
    formula: '',
    formulaWeight: undefined,
    state: '',
    color: '',
    handlingAtmosphere: '',
    handlingNote: ''
  },
  synthesisGeneral: {
    performedDate: '',
    labTemperature: undefined as any,
    labHumidity: undefined as any,
    reactionType: '',
    reactionTemperature: undefined as any,
    temperatureController: '',
    reactionTime: undefined as any,
    reactionTimeUnit: '',
    reactionAtmosphere: '',
    reactionContainer: '',
    reactionNote: '',
    productAmount: undefined as any,
    productAmountUnit: '',
    productYield: undefined,
    scale: '',
    safetyNote: ''
  },
  synthesisDetails: {
    substrates: [],
    solvents: [],
    catalysts: [],
    vessels: [],
    hardware: [],
    steps: [],
    procedureFull: ''
  },
  characterization: {}
});

const validateMPIFData = (data: MPIFData): ValidationResult => {
  const errors: Array<{ field: string; message: string; section: string }> = [];

  // Validate metadata
  if (!data.metadata.dataName) {
    errors.push({ field: 'dataName', message: 'Data name is required', section: 'metadata' });
  }
  if (!data.metadata.creationDate) {
    errors.push({ field: 'creationDate', message: 'Creation date is required', section: 'metadata' });
  }

  // Validate author details in metadata
  if (!data.metadata.name) {
    errors.push({ field: 'name', message: 'Author name is required', section: 'metadata' });
  }
  if (!data.metadata.email) {
    errors.push({ field: 'email', message: 'Author email is required', section: 'metadata' });
  }
  if (!data.metadata.orcid) {
    errors.push({ field: 'orcid', message: 'ORCID is required', section: 'metadata' });
  }

  // Validate product info
  if (!data.productInfo.commonName) {
    errors.push({ field: 'commonName', message: 'Common name is required', section: 'productInfo' });
  }

  // Validate synthesis general
  if (data.synthesisGeneral.labTemperature !== undefined && data.synthesisGeneral.labTemperature <= -273.15) {
    errors.push({ field: 'labTemperature', message: 'Temperature must be above absolute zero', section: 'synthesisGeneral' });
  }
  if (data.synthesisGeneral.labHumidity !== undefined && (data.synthesisGeneral.labHumidity < 0 || data.synthesisGeneral.labHumidity > 100)) {
    errors.push({ field: 'labHumidity', message: 'Humidity must be between 0 and 100%', section: 'synthesisGeneral' });
  }
  if (data.synthesisGeneral.reactionTime !== undefined && data.synthesisGeneral.reactionTime <= 0) {
    errors.push({ field: 'reactionTime', message: 'Reaction time must be positive', section: 'synthesisGeneral' });
  }
  // Product amount is optional - no validation needed

  // Validate synthesis details - substrates
  if (data.synthesisDetails && data.synthesisDetails.substrates) {
    data.synthesisDetails.substrates.forEach((substrate, index) => {
      if (!substrate.name || substrate.name.trim() === '') {
        errors.push({ 
          field: `substrates[${index}].name`, 
          message: 'Substrate name is required', 
          section: 'synthesisDetails' 
        });
      }
      if (substrate.amount === undefined || substrate.amount <= 0) {
        errors.push({ 
          field: `substrates[${index}].amount`, 
          message: 'Substrate amount is required and must be positive', 
          section: 'synthesisDetails' 
        });
      }
      if (!substrate.amountUnit || substrate.amountUnit.trim() === '') {
        errors.push({ 
          field: `substrates[${index}].amountUnit`, 
          message: 'Substrate amount unit is required', 
          section: 'synthesisDetails' 
        });
      }
    });
  }

  // Validate synthesis details - solvents
  if (data.synthesisDetails && data.synthesisDetails.solvents) {
    data.synthesisDetails.solvents.forEach((solvent, index) => {
      if (!solvent.name || solvent.name.trim() === '') {
        errors.push({ 
          field: `solvents[${index}].name`, 
          message: 'Solvent name is required', 
          section: 'synthesisDetails' 
        });
      }
      if (solvent.amount === undefined || solvent.amount <= 0) {
        errors.push({ 
          field: `solvents[${index}].amount`, 
          message: 'Solvent amount is required and must be positive', 
          section: 'synthesisDetails' 
        });
      }
      if (!solvent.amountUnit || solvent.amountUnit.trim() === '') {
        errors.push({ 
          field: `solvents[${index}].amountUnit`, 
          message: 'Solvent amount unit is required', 
          section: 'synthesisDetails' 
        });
      }
    });
  }

  // Validate synthesis details - catalysts
  if (data.synthesisDetails?.catalysts) {
    data.synthesisDetails.catalysts.forEach((catalyst, index) => {
      if (!catalyst.name || catalyst.name.trim() === '') {
        errors.push({
          field: `catalysts[${index}].name`,
          message: 'Catalyst name is required',
          section: 'synthesisDetails'
        });
      }
      if (catalyst.amount === undefined || catalyst.amount <= 0) {
        errors.push({
          field: `catalysts[${index}].amount`,
          message: 'Catalyst amount is required and must be positive',
          section: 'synthesisDetails'
        });
      }
      if (!catalyst.unit || catalyst.unit.trim() === '') {
        errors.push({
          field: `catalysts[${index}].unit`,
          message: 'Catalyst unit is required',
          section: 'synthesisDetails'
        });
      }
    });
  }

  // Validate synthesis details - vessels
  if (data.synthesisDetails && data.synthesisDetails.vessels) {
    data.synthesisDetails.vessels.forEach((vessel, index) => {
      if (!vessel.material || vessel.material.trim() === '') {
        errors.push({ 
          field: `vessels[${index}].material`, 
          message: 'Vessel material is required', 
          section: 'synthesisDetails' 
        });
      }
      if (!vessel.type || vessel.type.trim() === '') {
        errors.push({ 
          field: `vessels[${index}].type`, 
          message: 'Vessel type is required', 
          section: 'synthesisDetails' 
        });
      }
    });
  }

  // Validate synthesis details - hardware
  if (data.synthesisDetails && data.synthesisDetails.hardware) {
    data.synthesisDetails.hardware.forEach((hardware, index) => {
      if (!hardware.generalName || hardware.generalName.trim() === '') {
        errors.push({ 
          field: `hardware[${index}].generalName`, 
          message: 'Hardware name is required', 
          section: 'synthesisDetails' 
        });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const useMPIFStore = create<MPIFStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    mpifData: null,
    dashboard: {
      currentSection: 'metadata',
      isEditing: false,
      hasUnsavedChanges: false,
      columnLayout: 'single',
    },
    fileState: {
      fileName: undefined,
      lastSaved: undefined,
      isLoading: false,
      error: undefined
    },
    validation: {
      isValid: true,
      errors: []
    },

    // Actions
    loadMPIFFile: async (content: string, fileName: string) => {
      set({ fileState: { ...get().fileState, isLoading: true, error: undefined } });
      
      try {
        const data = parseMPIF(content);
        if (!data.synthesisDetails.catalysts) {
          data.synthesisDetails.catalysts = [];
        }
        
        set({
          mpifData: data,
          fileState: {
            fileName,
            lastSaved: new Date(),
            isLoading: false,
            error: undefined
          },
          validation: {
            isValid: true,
            errors: []
          },
          dashboard: {
            ...get().dashboard,
            hasUnsavedChanges: false,
            isEditing: true
          }
        });
      } catch (error) {
        set({
          fileState: {
            ...get().fileState,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to parse MPIF file'
          }
        });
      }
    },

    createNewMPIF: () => {
      const newMPIFData = createDefaultMPIFData();
      set({
        mpifData: newMPIFData,
        fileState: {
          fileName: 'untitled.mpif',
          lastSaved: undefined,
          isLoading: false,
          error: undefined
        },
        validation: {
          isValid: true,
          errors: []
        },
        dashboard: {
          ...get().dashboard,
          hasUnsavedChanges: true,
          isEditing: true,
          currentSection: 'metadata'
        }
      });
    },


    updateSection: (section: keyof MPIFData, data: any) => {
      const currentData = get().mpifData || createDefaultMPIFData();
      const updatedData = {
        ...currentData,
        [section]: { ...currentData[section], ...data }
      };
      
      set({
        mpifData: updatedData,
        dashboard: { ...get().dashboard, hasUnsavedChanges: true }
      });
    },

    setCurrentSection: (section: string) => {
      set({
        dashboard: { ...get().dashboard, currentSection: section }
      });
    },


    setColumnLayout: (mode: 'single' | 'double') => {
      set({
        dashboard: { ...get().dashboard, columnLayout: mode }
      });
    },


    exportMPIF: () => {
      const data = get().mpifData;
      if (!data) throw new Error('No data to export');
      
      // Create a copy of the data and ensure generatorVersion is set to 1.0
      const exportData = {
        ...data,
        metadata: {
          ...data.metadata,
          generatorVersion: '1.0'
        }
      };
      
      // Validate before export
      const validation = validateMPIFData(exportData);
      set({ validation });
      
      if (!validation.isValid) {
        throw new Error(`Cannot export: ${validation.errors.length} validation errors found. Please fix the incomplete fields first.`);
      }
      
      return stringifyMPIF(exportData);
    },

    saveDraft: () => {
      const data = get().mpifData;
      if (!data || typeof window === 'undefined') return;

      const savedAt = new Date().toISOString();
      const draft: StoredMPIFDraft = {
        mpifData: data,
        fileName: get().fileState.fileName,
        currentSection: get().dashboard.currentSection,
        savedAt
      };

      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      set({
        dashboard: {
          ...get().dashboard,
          hasUnsavedChanges: false
        },
        fileState: {
          ...get().fileState,
          lastSaved: new Date(savedAt)
        }
      });
    },

    loadDraft: () => {
      const draft = readStoredDraft();
      if (!draft) return false;

      set({
        mpifData: draft.mpifData,
        fileState: {
          fileName: draft.fileName || 'draft.mpif',
          lastSaved: new Date(draft.savedAt),
          isLoading: false,
          error: undefined
        },
        validation: {
          isValid: true,
          errors: []
        },
        dashboard: {
          ...get().dashboard,
          currentSection: draft.currentSection || 'metadata',
          hasUnsavedChanges: false,
          isEditing: true
        }
      });

      return true;
    },

    getDraftInfo: () => {
      const draft = readStoredDraft();
      if (!draft) return null;

      return {
        fileName: draft.fileName,
        savedAt: draft.savedAt
      };
    },

    resetData: () => {
      set({
        mpifData: null,
        fileState: {
          fileName: undefined,
          lastSaved: undefined,
          isLoading: false,
          error: undefined
        },
        validation: {
          isValid: true,
          errors: []
        },
        dashboard: {
          ...get().dashboard,
          hasUnsavedChanges: false,
          isEditing: false
        }
      });
    },

    clearUnsavedChanges: () => {
      set({
        dashboard: {
          ...get().dashboard,
          hasUnsavedChanges: false
        },
        fileState: {
          ...get().fileState,
          lastSaved: new Date()
        }
      });
    },

    validateData: () => {
      const data = get().mpifData;
      if (!data) {
        return { isValid: false, errors: [{ field: 'data', message: 'No data to validate', section: 'general' }] };
      }
      
      const validation = validateMPIFData(data);
      set({ validation });
      return validation;
    },

  }))
);
