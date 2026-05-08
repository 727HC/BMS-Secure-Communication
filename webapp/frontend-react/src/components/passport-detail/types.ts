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
  bmsBindingCode32?: number;
  rawPayloadHashVerified?: boolean;
}

export interface Credential {
  credentialId?: string;
  credType?: string;
  status?: string;
  issuedAt?: string;
  expiresAt?: string;
  holderDid?: string;
  issuerMsp?: string;
}

export interface IssuerCatalogItem {
  issuerMsp: string;
  types: string[];
}

export interface PhysicalHistoryVerification {
  status?: 'VERIFIED' | 'MISMATCH' | 'PENDING';
  verifiedAt?: string;
  reason?: string;
  signals?: {
    socMatched?: boolean;
    didMatched?: boolean;
    vinMatched?: boolean;
    fcMatched?: boolean;
    bmsIdentifierMatched?: boolean;
  };
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
  bmsManagementId?: string;
  bmsBindingId?: string;
  bmsBindingCode32?: number;
  regulatoryVerificationStatus?: 'VERIFIED' | 'PARTIAL' | 'PENDING' | 'FAILED' | string;
  regulatoryVerifiedAt?: string;
  regulatoryVerifier?: string;
  regulatoryEvidenceIds?: string[];
  physicalHistoryVerification?: PhysicalHistoryVerification | null;
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
