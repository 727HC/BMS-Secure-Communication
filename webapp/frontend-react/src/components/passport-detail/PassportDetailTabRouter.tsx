import { lazy } from 'react';
import type { Passport, BmuRecord, Credential, IssuerCatalogItem, GbaCompliance } from './types';

const IdentityTab = lazy(() => import('./IdentityTab'));
const ComplianceTab = lazy(() => import('./ComplianceTab'));
const TraceabilityTab = lazy(() => import('./TraceabilityTab'));
const DataTab = lazy(() => import('./DataTab'));
const TrustTab = lazy(() => import('./TrustTab'));

export type DetailTab = 'identity' | 'compliance' | 'traceability' | 'data' | 'trust';

interface Props {
  activeTab: DetailTab;
  passport: Passport;
  gbaCompliance: GbaCompliance;
  grade: 'A' | 'B' | 'C' | 'D';
  vcList: Credential[];
  bmuRecords: BmuRecord[];
  issuers: IssuerCatalogItem[];
  org: string | null;
  isManufacturer: boolean;
  isEV: boolean;
  isService: boolean;
  isRegulator: boolean;
  onUpdateRegulatory: () => void;
  onVerifyPhysical: () => void;
  onVerifyVc: (id: string) => void;
  onRevokeVc: (id: string) => void;
  onRequestVc: () => void;
  onApproveVc: () => void;
  onRejectVc: () => void;
}

export default function PassportDetailTabRouter({
  activeTab,
  passport,
  gbaCompliance,
  grade,
  vcList,
  bmuRecords,
  issuers,
  org,
  isManufacturer,
  isEV,
  isService,
  isRegulator,
  onUpdateRegulatory,
  onVerifyPhysical,
  onVerifyVc,
  onRevokeVc,
  onRequestVc,
  onApproveVc,
  onRejectVc,
}: Props) {
  switch (activeTab) {
    case 'identity':
      return <IdentityTab passport={passport} />;
    case 'compliance':
      return (
        <ComplianceTab
          passport={passport}
          gbaCompliance={gbaCompliance}
          complianceGrade={grade}
          vcList={vcList}
          canUpdateRegulatory={isRegulator}
          onUpdateRegulatory={onUpdateRegulatory}
        />
      );
    case 'traceability':
      return (
        <TraceabilityTab
          passport={passport}
          bmuRecords={bmuRecords}
          canVerifyPhysical={isManufacturer || isRegulator}
          onVerifyPhysical={onVerifyPhysical}
        />
      );
    case 'data':
      return <DataTab bmuRecords={bmuRecords} passportId={passport?.passportId} />;
    case 'trust':
      return (
        <TrustTab
          passport={passport}
          vcList={vcList}
          onVerify={onVerifyVc}
          onRevoke={onRevokeVc}
          canRequest={isManufacturer || isEV || isService}
          canApproveOrReject={isRegulator || org === 'ManufacturerMSP'}
          onRequest={onRequestVc}
          onApprove={onApproveVc}
          onReject={onRejectVc}
          issuers={issuers}
        />
      );
    default:
      return null;
  }
}
