export interface MaintenanceLog {
  timestamp?: string;
  maintenanceType?: string;
  description?: string;
  technician?: string;
}

export interface AccidentLog {
  timestamp?: string;
  severity?: string;
  description?: string;
  reporter?: string;
}

export interface BmuRecord {
  recordId?: string;
  timestamp?: string;
  soc?: number;
  voltage?: number;
  current?: number;
  temperature?: number;
  dischargeCycles?: number;
  statusFlags?: number;
}

export interface Credential {
  credentialId?: string;
  credType?: string;
  status?: string;
  issuedAt?: string;
  expiresAt?: string;
  holderDid?: string;
}

export interface Passport {
  passportId?: string;
  batteryId?: string;
  did?: string;
  status?: string;
  model?: string;
  serialNumber?: string;
  manufacturerName?: string;
  manufactureCountry?: string;
  cellManufacturer?: string;
  cellManufactureCountry?: string;
  manufactureDate?: string;
  cellType?: string;
  chemistry?: string;
  cellCount?: number;
  weight?: number;
  totalEnergy?: number;
  energyDensity?: number;
  ratedCapacity?: number;
  expectedLifespan?: number;
  voltageRange?: string;
  temperatureRange?: string;
  vin?: string;
  evManufacturer?: string;
  evAssemblyCountry?: string;
  installDate?: string;
  currentSoc?: number;
  currentSoh?: number;
  soce?: number;
  soh?: number;
  totalDischargeCycles?: number;
  remainingLifeCycle?: number;
  recycleAvailable?: boolean;
  recyclingRates?: Record<string, number>;
  manufacturingProcess?: string;
  disposalMethod?: string;
  carbonFootprint?: string;
  recycledElementContent?: string;
  extensionInfo?: string;
  maintenanceLogs?: MaintenanceLog[];
  accidentLogs?: AccidentLog[];
  [key: string]: unknown;
}

export interface GbaField {
  idx: number;
  key: keyof Passport;
  label: string;
  group: string;
  filled: boolean;
}

export interface GbaGroup {
  name: string;
  fields: GbaField[];
}

export interface GbaCompliance {
  filled: number;
  total: number;
  pct: number;
  allFilled: boolean;
  groups: GbaGroup[];
}
