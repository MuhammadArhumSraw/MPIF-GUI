// MPIF Data Structure Types

export interface MPIFData {
  metadata: MPIFMetadata;
  productInfo: ProductInfo;
  synthesisGeneral: SynthesisGeneral;
  synthesisDetails: SynthesisDetails;
  characterization: Characterization;
}

export interface MPIFMetadata {
  dataName: string;
  creationDate: string;
  generatorVersion: string;
  publicationDOI?: string;
  procedureStatus: '' | 'test' | 'success' | 'failure';
  name: string;
  email: string;
  orcid: string;
  address?: string;
  phone?: string;
}

export interface CIFData {
  dataName: string;
  properties: { [key: string]: string };
  loops: Array<{
    headers: string[];
    data: string[][];
  }>;
}

export interface ProductInfo {
  type: '' | 'porous framework material' | 'inorganic' | 'organic' | 'composite' | 'other';
  casNumber?: string;
  ccdcNumber?: string;
  commonName: string;
  systematicName?: string;
  formula?: string;
  formulaWeight?: number | undefined;
  state: '' | 'solid' | 'liquid' | 'gas' | 'suspension' | 'other';
  color: string;
  handlingAtmosphere: '' | 'air' | 'inert' | 'water-free' | 'oxygen-free' | 'other';
  handlingNote?: string;
  cif?: CIFData | string; // Support both structured and string format
}

export interface SynthesisGeneral {
  performedDate: string;
  labTemperature: number | undefined;
  labHumidity: number | undefined;
  reactionType: '' | 'mix' | 'diffusion' | 'evaporation' | 'microwave' | 'mechanochemical' | 'electrochemical' | 'sonochemical' | 'photochemical' | 'flow' | 'other';
  reactionTemperature: number | undefined;
  temperatureController: '' | 'ambient' | 'oven' | 'oil_bath' | 'water_bath' | 'dry_bath' | 'hot_plate' | 'microwave' | 'furnace' | 'other' | 'liquid_bath';
  reactionTime: number | undefined;
  reactionTimeUnit: '' | 's' | 'min' | 'h' | 'days';
  reactionAtmosphere: '' | 'air' | 'dry' | 'inert' | 'vacuum' | 'other';
  reactionContainer: string;
  reactionNote?: string;
  productAmount: number | undefined;
  productAmountUnit: '' | 'mg' | 'g' | 'kg' | 'μL' | 'mL' | 'L';
  productYield?: number;
  scale: '' | 'milligram' | 'gram' | 'multigram' | 'kilogram';
  safetyNote?: string;
  // Special reaction type parameters
  evaporationMethod?: 'ambient' | 'reduced_pressure' | 'spray_drying' | 'other';
  microwavePower?: number;
  mechanochemicalMethod?: 'ball_milling' | 'grinding' | 'screw_extruder' | 'other';
  electrochemicalCathode?: string;
  electrochemicalAnode?: string;
  electrochemicalReference?: string;
  electrochemicalVoltage?: number;
  electrochemicalCurrent?: number;
  sonicationMethod?: 'bath' | 'probe' | 'other';
  sonicationPower?: number;
  sonicationPowerUnit?: 'W' | 'kHz';
  photochemicalWavelength?: number;
  photochemicalPower?: number;
  photochemicalSource?: string;
}

export interface SynthesisDetails {
  substrates: Substrate[];
  solvents: Solvent[];
  catalysts: Catalyst[];
  vessels: Vessel[];
  hardware: Hardware[];
  steps: ProcedureStep[];
  procedureFull?: string;
}

export interface Substrate {
  id: string;
  name: string;
  molarity?: number;
  molarityUnit?: string;
  amount: number | undefined;
  amountUnit: string;
  supplier?: string;
  purity?: number;
  casNumber?: string;
  smiles?: string;
}

export interface Solvent {
  id: string;
  name: string;
  molarity?: number;
  molarityUnit?: string;
  amount: number | undefined;
  amountUnit: string;
  supplier?: string;
  purity?: number;
  casNumber?: string;
  smiles?: string;
}

export interface Catalyst {
  id: string;
  name: string;
  amount: number | undefined;
  unit: string;
  supplier?: string;
  purity?: number;
  casNumber?: string;
  smiles?: string;
  note?: string;
}

export interface Vessel {
  id: string;
  volume: number | undefined;
  volumeUnit: string;
  material: string;
  type: '' | 'Vial' | 'Jar' | 'Autoclave' | 'Beaker' | 'Flask' | 'Centrifuge-tube' | 'Other';
  supplier?: string;
  purpose: '' | 'Storing' | 'Reaction' | 'Other';
  note?: string;
}

export interface Hardware {
  id: string;
  purpose: '' | 'Heating/Cooling' | 'Atmosphere-control' | 'Stirring/Mixing' | 'Synthesis-devise' | 'Transferring' | 'Separation' | 'Drying' | 'Other';
  generalName: string;
  productName?: string;
  supplier?: string;
  note?: string;
}

export interface ProcedureStep {
  id: string;
  type: '' | 'Preparation' | 'Reaction' | 'Work-up';
  atmosphere: '' | 'Air' | 'Dry' | 'Inert' | 'Vacuum' | 'Other';
  detail: string;
}

export interface AIFData {
  dataName: string;
  properties: { [key: string]: string };
  adsorptionData: Array<{
    pressure: number;
    loading: number;
  }>;
  desorptionData?: Array<{
    pressure: number;
    loading: number;
  }>;
}

export interface Characterization {
  pxrd?: PXRDData;
  tga?: TGAData;
  adsorption?: AdsorptionData;
  desorption?: DesorptionData;
  aif?: AIFData | string; // Support both structured and string format
}

export interface PXRDData {
  source: 'Cu' | 'Cr' | 'Fe' | 'Co' | 'Mo' | 'Ag' | 'synchrotron' | 'other';
  wavelength?: number;
  data: Array<{
    twoTheta: number;
    intensity: number;
  }>;
}

export interface TGAData {
  data: Array<{
    temperature: number;
    weightPercent: number;
  }>;
}

export interface AdsorptionData {
  experimentalTemperature?: number;
  experimentalMethod?: string;
  sampleMass?: number;
  sampleId?: string;
  materialId?: string;
  sampleInfo?: string;
  units?: {
    temperature?: string;
    pressure?: string;
    mass?: string;
    loading?: string;
  };
  data: Array<{
    pressure: number;
    p0: number;
    amount: number;
  }>;
}

export interface DesorptionData {
  data: Array<{
    pressure: number;
    p0: number;
    amount: number;
  }>;
}

// Form validation schemas
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  section: string;
}

// UI State types
export interface DashboardState {
  currentSection: string;
  isEditing: boolean;
  hasUnsavedChanges: boolean;
  columnLayout?: 'single' | 'double';
}

export interface FileState {
  fileName?: string;
  lastSaved?: Date;
  isLoading: boolean;
  error?: string;
} 