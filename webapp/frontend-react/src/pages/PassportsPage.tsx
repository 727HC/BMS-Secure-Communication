import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { toastFromError } from '../lib/chaincodeErrorMessages';
import { useAuth } from '../contexts/AuthContext';
import { useOrgRoles } from '../lib/useOrgRoles';
import PassportCreateModal, { type PassportCreateFormData } from '../components/modals/passports/PassportCreateModal';
import { PageHead } from '../components/ui';
import {
  PAGE_SIZE,
  type GbaFilter,
  type ListResponse,
  type Passport,
} from '../components/passports/lib';
import PassportsSummaryCard from '../components/passports/PassportsSummaryCard';
import PassportsListCard from '../components/passports/PassportsListCard';
import PassportsDistributionCard from '../components/passports/PassportsDistributionCard';
import PassportsFilterBar from '../components/passports/PassportsFilterBar';
import { usePassportsAnalytics } from '../components/passports/usePassportsAnalytics';
import { usePassportsData } from '../components/passports/usePassportsData';
import PassportsLoadingSkeleton from '../components/passports/PassportsLoadingSkeleton';
import { usePassportsLabels } from '../components/passports/usePassportsLabels';

const INITIAL_EXTENDED_FIELDS = [
  'manufacturingProcess',
  'disposalMethod',
  'recycledElementContent',
  'extensionInfo',
] as const;
type InitialExtendedField = typeof INITIAL_EXTENDED_FIELDS[number];
type PassportCreatePayload = Omit<PassportCreateFormData, InitialExtendedField>;
const INITIAL_BMS_BINDING_SOURCE = {
  sourceType: 'BMS_BINDING',
  sourceId: 'did:battery:001#BMS-MGMT-001',
  dataHash: 'b3c37ed2cdd2831cc0c212445905ced4a20ea51e129bff2e7418deddf7223178',
  result: true,
  details: {
    bmsManagementId: 'BMS-MGMT-001',
    bmsBindingId: 'did:battery:001#BMS-MGMT-001',
    bmsBindingCode32: '0x2c9a0e0c',
  },
};

function buildCreatePayload(data: PassportCreateFormData): PassportCreatePayload {
  const {
    manufacturingProcess: _manufacturingProcess,
    disposalMethod: _disposalMethod,
    recycledElementContent: _recycledElementContent,
    extensionInfo: _extensionInfo,
    ...payload
  } = data;
  return payload;
}

function normalizeExtendedValue(fieldName: InitialExtendedField, value: string): string {
  const trimmed = value.trim();
  if (fieldName === 'recycledElementContent' || fieldName === 'extensionInfo') {
    return JSON.stringify(JSON.parse(trimmed));
  }
  return trimmed;
}

function buildInitialExtendedAttributes(data: PassportCreateFormData) {
  const payload = {
    manufacturingProcess: data.manufacturingProcess.trim(),
    disposalMethod: data.disposalMethod.trim(),
    recycledElementContent: data.recycledElementContent.trim()
      ? normalizeExtendedValue('recycledElementContent', data.recycledElementContent)
      : '',
    extensionInfo: data.extensionInfo.trim()
      ? normalizeExtendedValue('extensionInfo', data.extensionInfo)
      : '',
    reason: '초기 발급 시 3차년도 확장 속성 등록',
  };
  const hasValue = INITIAL_EXTENDED_FIELDS.some((fieldName) => Boolean(payload[fieldName]));
  return hasValue ? payload : null;
}

export default function PassportsPage() {
  const navigate = useNavigate();
  const { org } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'gba'>('latest');
  const [gbaFilter, setGbaFilter] = useState<GbaFilter>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { isManufacturer, isRegulator } = useOrgRoles(org);

  const {
    passports,
    setPassports,
    filteredPassports,
    paginatedPassports,
    loading,
    currentPage,
    setCurrentPage,
    totalPages,
  } = usePassportsData({ searchQuery, filterStatus, gbaFilter, sortBy });

  const {
    totalCount,
    activeCount,
    maintenanceCount,
    endOfLifeCount,
    avgGba,
    vinPendingCount,
    reviewReadyCount,
    statusDistSegments,
    statusLegendItems,
    manufacturerBarItems,
    chemistryBarItems,
  } = usePassportsAnalytics(passports);

  const { registerScopeLabel, registerSummary } = usePassportsLabels({ isManufacturer, isRegulator });

  const viewDetail = (id?: string) => id && navigate(`/passports/${id}`);
  const openIssueFlow = () => setShowCreateModal(true);
  const closeIssueFlow = () => setShowCreateModal(false);

  const submitCreate = async (data: PassportCreateFormData) => {
    setCreating(true);
    setSubmitError(null);
    try {
      const created = await api.post<{ passportId?: string }>('/passports', buildCreatePayload(data));
      const nextPassportId = created.passportId || data.passportId;
      const extendedAttributes = buildInitialExtendedAttributes(data);
      if (extendedAttributes) {
        await api.post(`/passports/${encodeURIComponent(nextPassportId)}/extended-attributes`, extendedAttributes);
      }
      await api.post(`/passports/${encodeURIComponent(nextPassportId)}/bms-binding`, {
        reason: 'initial BMS binding',
      });
      await api.post(`/passports/${encodeURIComponent(nextPassportId)}/source-verification`, INITIAL_BMS_BINDING_SOURCE);
      closeIssueFlow();
      navigate(`/passports/${nextPassportId}`);

      api.get<ListResponse<Passport> | Passport[]>('/passports')
        .then((refresh) => {
          const list = Array.isArray(refresh) ? refresh : refresh.records || [];
          setPassports(list);
        })
        .catch(() => {
          // 목록 새로고침 실패는 생성 성공/상세 이동을 막지 않는다.
        });
    } catch (err) {
      const { toast, debug, category } = toastFromError(err);
      console.warn('[passports] mutation failed', { category, debug });
      setSubmitError(toast);
    } finally {
      setCreating(false);
    }
  };

  const hasActiveFilters = Boolean(searchQuery || filterStatus || gbaFilter !== 'all');
  const showingFrom = filteredPassports.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const showingTo = Math.min(currentPage * PAGE_SIZE, filteredPassports.length);

  if (loading) {
    return <PassportsLoadingSkeleton />;
  }

  return (
    <div data-page="passports" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHead
        title="배터리 여권 등록부"
        subtitle={registerSummary}
        actions={isManufacturer ? (
          <button onClick={openIssueFlow} className="sn-btn sn-btn-accent" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            발급 접수
          </button>
        ) : undefined}
      />

      {submitError && (
        <div role="alert" style={{ padding: '0.9rem 1rem', borderRadius: '0.85rem', background: 'var(--color-danger-soft)', color: 'var(--color-danger)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>{submitError}</span>
        </div>
      )}

      <PassportsSummaryCard registerScopeLabel={registerScopeLabel} totalCount={totalCount} activeCount={activeCount} maintenanceCount={maintenanceCount} endOfLifeCount={endOfLifeCount} avgGba={avgGba} reviewReadyCount={reviewReadyCount} vinPendingCount={vinPendingCount} />

      <PassportsDistributionCard
        totalCount={totalCount}
        statusDistSegments={statusDistSegments}
        statusLegendItems={statusLegendItems}
        manufacturerBarItems={manufacturerBarItems}
        chemistryBarItems={chemistryBarItems}
      />

      <PassportsFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterStatus={filterStatus}
        onFilterStatusChange={setFilterStatus}
        gbaFilter={gbaFilter}
        onGbaFilterChange={setGbaFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        filteredCount={filteredPassports.length}
        hasActiveFilters={hasActiveFilters}
        currentPage={currentPage}
        totalPages={totalPages}
      />

      <PassportsListCard
        filteredPassports={filteredPassports}
        paginatedPassports={paginatedPassports}
        showingFrom={showingFrom}
        showingTo={showingTo}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onView={viewDetail}
        hasActiveFilters={hasActiveFilters}
        isManufacturer={isManufacturer}
      />

      <PassportCreateModal
        open={showCreateModal}
        submitting={creating}
        onClose={closeIssueFlow}
        onSubmit={submitCreate}
      />
    </div>
  );
}
