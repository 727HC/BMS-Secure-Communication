app.component('recycling-page', {
  props: ['auth', 'api'],
  emits: ['navigate'],
  setup(props, { emit }) {
    const { ref, computed, onMounted } = Vue;

    const passports = ref([]);
    const loading = ref(false);
    const activeTab = ref('all');
    const submitting = ref(false);

    // Modal state
    const showAnalysisResultModal = ref(false);
    const showRecycleToggleModal = ref(false);
    const showExtractModal = ref(false);
    const showDisposeConfirm = ref(false);
    const selectedPassport = ref(null);

    // Role checks
    const isEVManufacturer = computed(() => props.auth.orgMsp === MSP.EV_MANUFACTURER);
    const isService = computed(() => props.auth.orgMsp === MSP.SERVICE);
    const isRegulator = computed(() => props.auth.orgMsp === MSP.REGULATOR);
    const canRequestAnalysis = computed(() => isEVManufacturer.value);
    const canSubmitAnalysis = computed(() => isService.value);
    const canToggleRecycle = computed(() => isService.value || isRegulator.value);
    const canExtract = computed(() => isRegulator.value);
    const canDispose = computed(() => isRegulator.value);

    // Forms
    const analysisForm = ref({ soh: '', soce: '', remainingLifeCycle: '', recycleAvailable: false });
    const recycleToggleValue = ref(false);
    const extractEntries = ref([{ key: '', value: '' }]);

    const tabs = [
      { key: 'all', label: '전체', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
      { key: 'recyclable', label: '재활용가능', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
      { key: 'recycling', label: '재활용중', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
      { key: 'disposed', label: '폐기완료', icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' },
    ];

    // 재활용 관련 배터리만 필터
    function isRecyclingRelated(p) {
      return p.recycleAvailable === true ||
        p.status === 'ACTIVE' ||
        p.status === 'ANALYSIS' ||
        p.status === 'RECYCLING' ||
        p.status === 'DISPOSED' ||
        (p.recyclingRates && Object.keys(p.recyclingRates).length > 0);
    }

    const tabCounts = computed(() => ({
      all: passports.value.filter(isRecyclingRelated).length,
      recyclable: passports.value.filter(p => p.recycleAvailable === true).length,
      recycling: passports.value.filter(p => p.status === 'RECYCLING').length,
      disposed: passports.value.filter(p => p.status === 'DISPOSED').length,
    }));

    const filteredPassports = computed(() => {
      if (activeTab.value === 'recyclable') {
        return passports.value.filter(p => p.recycleAvailable === true);
      }
      if (activeTab.value === 'recycling') {
        return passports.value.filter(p => p.status === 'RECYCLING');
      }
      if (activeTab.value === 'disposed') {
        return passports.value.filter(p => p.status === 'DISPOSED');
      }
      // 전체: 재활용 관련 배터리만
      return passports.value.filter(isRecyclingRelated);
    });

    async function fetchPassports() {
      loading.value = true;
      try {
        const data = await props.api.get('/passports');
        passports.value = Array.isArray(data) ? data : (data.records || []);
      } catch (e) {
        window.$toast('error', '여권 목록 조회 실패: ' + e.message);
      } finally {
        loading.value = false;
      }
    }

    function getSohColor(soh) {
      if (soh === null || soh === undefined) return 'text-[rgba(250,250,245,0.35)]';
      if (soh > 80) return 'text-[#c8ff00]';
      if (soh >= 50) return 'text-amber-600';
      return 'text-[#ff6b6b]';
    }

    function getSohBg(soh) {
      if (soh === null || soh === undefined) return 'bg-[#33302a]';
      if (soh > 80) return 'bg-[#34d399]';
      if (soh >= 50) return 'bg-[#fbbf24]';
      return 'bg-[#ef4444]';
    }

    function getSohTrackBg(soh) {
      if (soh === null || soh === undefined) return 'bg-[#1f1d17]';
      if (soh > 80) return 'bg-[rgba(200,255,0,0.08)]';
      if (soh >= 50) return 'bg-[rgba(255,184,0,0.1)]';
      return 'bg-[rgba(239,68,68,0.1)]';
    }

    // Use global STATUS_CONFIG, getStatusBadge from app.js
    const statusConfig = STATUS_CONFIG;

    function getRecyclingRateEntries(rates) {
      if (!rates || typeof rates !== 'object') return [];
      return Object.entries(rates).map(([key, value]) => ({ key, value }));
    }

    function getRateBarColor(value) {
      if (value >= 80) return 'bg-[#34d399]';
      if (value >= 50) return 'bg-[#60a5fa]';
      return 'bg-[#fbbf24]';
    }

    // Analysis request
    async function requestAnalysis(passport) {
      try {
        await retryOnConflict(() => props.api.post('/analysis/' + passport.passportId + '/request', {}));
        window.$toast('success', '분석 요청이 등록되었습니다.');
        await fetchPassports();
      } catch (e) {
        window.$toast('error', '분석 요청 실패: ' + e.message);
      }
    }

    // Analysis result modal
    function openAnalysisResult(passport) {
      selectedPassport.value = passport;
      analysisForm.value = { soh: '', soce: '', remainingLifeCycle: '', recycleAvailable: false };
      showAnalysisResultModal.value = true;
    }

    async function submitAnalysisResult() {
      submitting.value = true;
      try {
        await retryOnConflict(() => props.api.post('/analysis/' + selectedPassport.value.passportId + '/result', {
          soh: Number(analysisForm.value.soh),
          soce: Number(analysisForm.value.soce),
          remainingLifeCycle: Number(analysisForm.value.remainingLifeCycle),
          recycleAvailable: analysisForm.value.recycleAvailable,
        }));
        window.$toast('success', '분석 결과가 제출되었습니다.');
        closeModals();
        await fetchPassports();
      } catch (e) {
        window.$toast('error', '분석 결과 제출 실패: ' + e.message);
      } finally {
        submitting.value = false;
      }
    }

    // Recycle toggle
    function openRecycleToggle(passport) {
      selectedPassport.value = passport;
      recycleToggleValue.value = passport.recycleAvailable || false;
      showRecycleToggleModal.value = true;
    }

    async function submitRecycleToggle() {
      submitting.value = true;
      try {
        await retryOnConflict(() => props.api.put('/recycling/' + selectedPassport.value.passportId + '/availability', {
          available: recycleToggleValue.value,
        }));
        window.$toast('success', '재활용 판정이 업데이트되었습니다.');
        closeModals();
        await fetchPassports();
      } catch (e) {
        window.$toast('error', '재활용 판정 실패: ' + e.message);
      } finally {
        submitting.value = false;
      }
    }

    // Extract modal
    function openExtract(passport) {
      selectedPassport.value = passport;
      extractEntries.value = [{ key: '리튬', value: '' }, { key: '코발트', value: '' }];
      showExtractModal.value = true;
    }

    function addExtractEntry() {
      extractEntries.value.push({ key: '', value: '' });
    }

    function removeExtractEntry(index) {
      extractEntries.value.splice(index, 1);
    }

    async function submitExtract() {
      submitting.value = true;
      try {
        const recyclingRates = {};
        extractEntries.value.forEach(e => {
          if (e.key.trim()) {
            recyclingRates[e.key.trim()] = Number(e.value);
          }
        });
        await retryOnConflict(() => props.api.post('/recycling/' + selectedPassport.value.passportId + '/extract', {
          recyclingRates,
        }));
        window.$toast('success', '원자재 추출이 기록되었습니다.');
        closeModals();
        await fetchPassports();
      } catch (e) {
        window.$toast('error', '원자재 추출 기록 실패: ' + e.message);
      } finally {
        submitting.value = false;
      }
    }

    // Dispose
    function openDispose(passport) {
      selectedPassport.value = passport;
      showDisposeConfirm.value = true;
    }

    async function submitDispose() {
      submitting.value = true;
      try {
        await retryOnConflict(() => props.api.post('/recycling/' + selectedPassport.value.passportId + '/dispose', {}));
        window.$toast('success', '폐기 처리가 완료되었습니다.');
        closeModals();
        await fetchPassports();
      } catch (e) {
        window.$toast('error', '폐기 처리 실패: ' + e.message);
      } finally {
        submitting.value = false;
      }
    }

    function closeModals() {
      showAnalysisResultModal.value = false;
      showRecycleToggleModal.value = false;
      showExtractModal.value = false;
      showDisposeConfirm.value = false;
      selectedPassport.value = null;
    }

    function hasAnyAction(p) {
      return (canRequestAnalysis.value || canSubmitAnalysis.value || canToggleRecycle.value || canExtract.value || canDispose.value) && p.status !== 'DISPOSED';
    }

    onMounted(fetchPassports);

    return {
      passports, loading, activeTab, filteredPassports, tabs, tabCounts, submitting,
      showAnalysisResultModal, showRecycleToggleModal, showExtractModal, showDisposeConfirm,
      selectedPassport, analysisForm, recycleToggleValue, extractEntries,
      isEVManufacturer, isService, isRegulator,
      canRequestAnalysis, canSubmitAnalysis, canToggleRecycle, canExtract, canDispose,
      fetchPassports, getSohColor, getSohBg, getSohTrackBg, getStatusBadge,
      getRecyclingRateEntries, getRateBarColor, hasAnyAction,
      requestAnalysis, openAnalysisResult, submitAnalysisResult,
      openRecycleToggle, submitRecycleToggle,
      openExtract, addExtractEntry, removeExtractEntry, submitExtract,
      openDispose, submitDispose,
      closeModals,
    };
  },
  template: `
  <div style="display:flex;flex-direction:column;gap:16px;">

    <!-- ====== PAGE HEADER ====== -->
    <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.25rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--color-border);">
      <div class="sn-page-head-main">
        <p class="sn-eyebrow" style="margin:0 0 0.35rem;color:#0f766e;">재활용 처리</p>
        <h1 class="sn-page-title">재활용 처리</h1>
        <p class="sn-page-subtitle">분석 요청부터 추출·폐기까지 단계별로 관리합니다.</p>
      </div>
      <button @click="fetchPassports" class="sn-btn sn-btn-ghost" style="font-size:0.82rem;flex-shrink:0;">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
        새로고침
      </button>
    </div>

    <div class="sn-panel sn-summary-grid sn-summary-grid-4">
      <div class="sn-summary-lead">
        <p class="sn-eyebrow sn-summary-title">요약</p>
        <p class="sn-summary-copy-strong">분석 → 판정 → 추출 → 폐기</p>
        <p class="sn-summary-copy">분석 요청부터 추출과 폐기까지 필요한 처리를 한곳에서 확인합니다.</p>
      </div>
      <div>
        <p class="sn-eyebrow sn-stat-card-title" style="color:#2563eb;">분석 대기</p>
        <p class="sn-stat-count" style="color:#2563eb;">{{ filteredPassports.filter(p => !p.recycleAvailable && p.status !== 'RECYCLING' && p.status !== 'DISPOSED').length }}</p>
        <p class="sn-stat-note">판정 전 확인</p>
      </div>
      <div>
        <p class="sn-eyebrow sn-stat-card-title" style="color:#16a34a;">재활용 승인</p>
        <p class="sn-stat-count" style="color:#16a34a;">{{ tabCounts.recyclable }}</p>
        <p class="sn-stat-note">추출 가능</p>
      </div>
      <div>
        <p class="sn-eyebrow sn-stat-card-title" style="color:#dc2626;">종결 보관</p>
        <p class="sn-stat-count" style="color:#dc2626;">{{ tabCounts.disposed }}</p>
        <p class="sn-stat-note">폐기 완료</p>
      </div>
    </div>

    <!-- ====== STATUS SUMMARY CARDS ====== -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">
      <div class="sn-panel" style="padding:10px 14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <span class="sn-eyebrow">검토 대상</span>
          <div style="width:28px;height:28px;border-radius:8px;background:#f5f5f5;display:flex;align-items:center;justify-content:center;">
            <svg width="14" height="14" fill="none" stroke="#a3a3a3" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
          </div>
        </div>
        <span style="font-family:'JetBrains Mono',monospace;font-size:1.5rem;font-weight:800;color:#171717;">{{ tabCounts.all }}</span>
        <p style="font-size:0.75rem;color:#6b7280;margin:0.35rem 0 0;">검토할 여권</p>
      </div>
      <div class="sn-panel" style="padding:10px 14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <span class="sn-eyebrow" style="color:#16a34a;">재활용 승인</span>
          <div style="width:28px;height:28px;border-radius:8px;background:#f0fdf4;display:flex;align-items:center;justify-content:center;">
            <svg width="14" height="14" fill="none" stroke="#16a34a" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
        </div>
        <span style="font-family:'JetBrains Mono',monospace;font-size:1.5rem;font-weight:800;color:#16a34a;">{{ tabCounts.recyclable }}</span>
        <p style="font-size:0.75rem;color:#6b7280;margin:0.35rem 0 0;">추출 가능 상태</p>
      </div>
      <div class="sn-panel" style="padding:10px 14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <span class="sn-eyebrow" style="color:#2563eb;">추출 진행</span>
          <div style="width:28px;height:28px;border-radius:8px;background:#eff6ff;display:flex;align-items:center;justify-content:center;">
            <svg width="14" height="14" fill="none" stroke="#2563eb" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          </div>
        </div>
        <span style="font-family:'JetBrains Mono',monospace;font-size:1.5rem;font-weight:800;color:#2563eb;">{{ tabCounts.recycling }}</span>
        <p style="font-size:0.75rem;color:#6b7280;margin:0.35rem 0 0;">원자재 회수 중</p>
      </div>
      <div class="sn-panel" style="padding:10px 14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <span class="sn-eyebrow">폐기 완료</span>
          <div style="width:28px;height:28px;border-radius:8px;background:#f5f5f5;display:flex;align-items:center;justify-content:center;">
            <svg width="14" height="14" fill="none" stroke="#a3a3a3" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </div>
        </div>
        <span style="font-family:'JetBrains Mono',monospace;font-size:1.5rem;font-weight:800;color:#a3a3a3;">{{ tabCounts.disposed }}</span>
        <p style="font-size:0.75rem;color:#6b7280;margin:0.35rem 0 0;">폐기 기록 보관</p>
      </div>
    </div>

    <!-- ====== FILTER TABS ====== -->
    <div style="display:flex;gap:4px;border-bottom:1px solid rgba(0,0,0,0.06);">
      <button v-for="tab in tabs" :key="tab.key" @click="activeTab = tab.key"
        style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;font-size:0.85rem;font-weight:500;cursor:pointer;border:none;background:none;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all 0.2s;"
        :style="activeTab===tab.key ? 'color:#171717;border-bottom-color:#171717;' : 'color:#a3a3a3;'">
        <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" :d="tab.icon"/>
        </svg>
        {{ tab.label }}
        <span style="font-family:'JetBrains Mono',monospace;font-size:0.75rem;padding:1px 7px;border-radius:12px;background:#f5f5f5;"
          :style="activeTab===tab.key ? 'color:#171717;' : 'color:#a3a3a3;'">{{ tabCounts[tab.key] }}</span>
      </button>
    </div>

    <!-- ====== LOADING STATE ====== -->
    <div v-if="loading" style="display: flex; align-items: center; justify-content: center; min-height: 40vh;">
      <div style="width: 28px; height: 28px; border: 2px solid rgba(0,0,0,0.06); border-top-color: var(--color-accent); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
    </div>

    <!-- ====== EMPTY STATE ====== -->
    <div v-else-if="filteredPassports.length === 0" style="padding: 3rem; text-align: center; border: 1px dashed var(--color-border); border-radius: 0.5rem;">
      <p style="font-size: 0.875rem; color: var(--color-text-3); margin-bottom: 0;">회수 검토 대상이 없습니다. 분석 요청이나 재활용 판정이 기록되면 여기에 누적됩니다.</p>
    </div>

    <!-- ====== GROUPED SECTION VIEW (structural change from flat table) ====== -->
    <div v-else style="display:flex;flex-direction:column;gap:1.25rem;">

      <!-- Section: 분석 대기 -->
      <template v-if="filteredPassports.filter(p => !p.recycleAvailable && p.status !== 'RECYCLING' && p.status !== 'DISPOSED').length > 0">
        <div>
          <div style="display:flex;align-items:center;gap:0.625rem;padding:0.5rem 0.75rem;background:#f8faff;border:1px solid #dbeafe;border-radius:6px 6px 0 0;">
            <span style="font-size:0.75rem;font-weight:700;color:#2563eb;">분석 대기</span>
            <span style="font-size:0.75rem;font-weight:700;background:#dbeafe;color:#2563eb;padding:0.125rem 0.5rem;border-radius:99px;">{{ filteredPassports.filter(p => !p.recycleAvailable && p.status !== 'RECYCLING' && p.status !== 'DISPOSED').length }}</span>
          </div>
          <div style="border:1px solid #dbeafe;border-top:none;border-radius:0 0 6px 6px;overflow:hidden;">
            <div v-for="(p, idx) in filteredPassports.filter(p => !p.recycleAvailable && p.status !== 'RECYCLING' && p.status !== 'DISPOSED')" :key="p.passportId"
              :style="idx > 0 ? 'border-top:1px solid rgba(0,0,0,0.05);' : ''"
              style="background:#fff;padding:0.75rem 1rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;">
              <div style="min-width:0;">
                <div style="font-family:'JetBrains Mono',monospace;font-size:0.875rem;font-weight:600;color:#374151;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ p.passportId }}</div>
                <div style="font-size:0.875rem;color:#6b7280;margin-top:2px;">시리얼: {{ p.serialNumber || '-' }}</div>
              </div>
              <div style="display:flex;align-items:center;gap:0.5rem;flex-shrink:0;" @click.stop>
                <button v-if="canRequestAnalysis" @click="requestAnalysis(p)"
                  class="sn-btn sn-btn-ghost" style="font-size:0.875rem;padding:4px 10px;display:inline-flex;align-items:center;gap:4px;color:#2563eb;border-color:#2563eb;">
                  <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                  분석 요청
                </button>
                <button v-if="canSubmitAnalysis" @click="openAnalysisResult(p)"
                  class="sn-btn sn-btn-ghost" style="font-size:0.875rem;padding:4px 10px;display:inline-flex;align-items:center;gap:4px;color:#7c3aed;border-color:#7c3aed;">
                  <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  분석 결과
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Section: 재활용 가능 -->
      <template v-if="filteredPassports.filter(p => p.recycleAvailable === true && p.status !== 'RECYCLING' && p.status !== 'DISPOSED').length > 0">
        <div>
          <div style="display:flex;align-items:center;gap:0.625rem;padding:0.5rem 0.75rem;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px 6px 0 0;">
            <span style="font-size:0.75rem;font-weight:700;color:#16a34a;">재활용 가능</span>
            <span style="font-size:0.75rem;font-weight:700;background:#bbf7d0;color:#16a34a;padding:0.125rem 0.5rem;border-radius:99px;">{{ filteredPassports.filter(p => p.recycleAvailable === true && p.status !== 'RECYCLING' && p.status !== 'DISPOSED').length }}</span>
          </div>
          <div style="border:1px solid #bbf7d0;border-top:none;border-radius:0 0 6px 6px;overflow:hidden;">
            <div v-for="(p, idx) in filteredPassports.filter(p => p.recycleAvailable === true && p.status !== 'RECYCLING' && p.status !== 'DISPOSED')" :key="p.passportId"
              :style="idx > 0 ? 'border-top:1px solid rgba(0,0,0,0.05);' : ''"
              style="background:#fff;padding:0.75rem 1rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;">
              <div style="min-width:0;flex:1;">
                <div style="font-family:'JetBrains Mono',monospace;font-size:0.875rem;font-weight:600;color:#374151;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ p.passportId }}</div>
                <div style="font-size:0.875rem;color:#6b7280;margin-top:2px;">
                  SOH: <span :class="getSohColor(p.currentSoh)" style="font-weight:600;">{{ p.currentSoh != null ? p.currentSoh + '%' : '미측정' }}</span>
                </div>
                <!-- Recycling rates -->
                <div v-if="getRecyclingRateEntries(p.recyclingRates).length > 0" style="display:flex;flex-direction:column;gap:4px;margin-top:6px;">
                  <div v-for="entry in getRecyclingRateEntries(p.recyclingRates)" :key="entry.key"
                    style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:0.75rem;color:#6b7280;width:56px;text-align:right;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" :title="entry.key">{{ entry.key }}</span>
                    <div style="flex:1;height:5px;background:#f1f5f9;border-radius:999px;overflow:hidden;min-width:50px;">
                      <div :class="getRateBarColor(entry.value)" style="height:5px;border-radius:999px;transition:width 0.4s;" :style="{ width: Math.min(entry.value, 100) + '%' }"></div>
                    </div>
                    <span style="font-family:'JetBrains Mono',monospace;font-size:0.75rem;font-weight:700;color:#374151;width:32px;flex-shrink:0;">{{ entry.value }}%</span>
                  </div>
                </div>
              </div>
              <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;" @click.stop>
                <button v-if="canToggleRecycle" @click="openRecycleToggle(p)"
                  class="sn-btn sn-btn-ghost" style="font-size:0.875rem;padding:4px 10px;display:inline-flex;align-items:center;gap:4px;color:#059669;border-color:#059669;">
                  <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  재활용 판정
                </button>
                <button v-if="canExtract" @click="openExtract(p)"
                  class="sn-btn sn-btn-ghost" style="font-size:0.875rem;padding:4px 10px;display:inline-flex;align-items:center;gap:4px;color:#d97706;border-color:#d97706;">
                  <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                  원자재 추출
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Section: 원자재 추출 완료 (RECYCLING status) -->
      <template v-if="filteredPassports.filter(p => p.status === 'RECYCLING').length > 0">
        <div>
          <div style="display:flex;align-items:center;gap:0.625rem;padding:0.5rem 0.75rem;background:#fffbeb;border:1px solid #fde68a;border-radius:6px 6px 0 0;">
            <span style="font-size:0.75rem;font-weight:700;color:#d97706;">원자재 추출 완료</span>
            <span style="font-size:0.75rem;font-weight:700;background:#fde68a;color:#d97706;padding:0.125rem 0.5rem;border-radius:99px;">{{ filteredPassports.filter(p => p.status === 'RECYCLING').length }}</span>
          </div>
          <div style="border:1px solid #fde68a;border-top:none;border-radius:0 0 6px 6px;overflow:hidden;">
            <div v-for="(p, idx) in filteredPassports.filter(p => p.status === 'RECYCLING')" :key="p.passportId"
              :style="idx > 0 ? 'border-top:1px solid rgba(0,0,0,0.05);' : ''"
              style="background:#fff;padding:0.75rem 1rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;">
              <div style="min-width:0;">
                <div style="font-family:'JetBrains Mono',monospace;font-size:0.875rem;font-weight:600;color:#374151;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ p.passportId }}</div>
                <div style="font-size:0.875rem;color:#6b7280;margin-top:2px;">시리얼: {{ p.serialNumber || '-' }}</div>
              </div>
              <div style="display:flex;align-items:center;gap:0.5rem;flex-shrink:0;" @click.stop>
                <button v-if="canDispose" @click="openDispose(p)"
                  class="sn-btn sn-btn-danger" style="font-size:0.875rem;padding:4px 10px;display:inline-flex;align-items:center;gap:4px;">
                  <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  폐기 처리
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Section: 폐기 -->
      <template v-if="filteredPassports.filter(p => p.status === 'DISPOSED').length > 0">
        <div>
          <div style="display:flex;align-items:center;gap:0.625rem;padding:0.5rem 0.75rem;background:#fef2f2;border:1px solid #fecaca;border-radius:6px 6px 0 0;">
            <span style="font-size:0.75rem;font-weight:700;color:#dc2626;">폐기</span>
            <span style="font-size:0.75rem;font-weight:700;background:#fecaca;color:#dc2626;padding:0.125rem 0.5rem;border-radius:99px;">{{ filteredPassports.filter(p => p.status === 'DISPOSED').length }}</span>
          </div>
          <div style="border:1px solid #fecaca;border-top:none;border-radius:0 0 6px 6px;overflow:hidden;">
            <div v-for="(p, idx) in filteredPassports.filter(p => p.status === 'DISPOSED')" :key="p.passportId"
              :style="idx > 0 ? 'border-top:1px solid rgba(0,0,0,0.05);' : ''"
              style="background:#fff;padding:0.75rem 1rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;">
              <div style="min-width:0;">
                <div style="font-family:'JetBrains Mono',monospace;font-size:0.875rem;font-weight:600;color:#374151;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ p.passportId }}</div>
                <div style="font-size:0.875rem;color:#6b7280;margin-top:2px;">시리얼: {{ p.serialNumber || '-' }}</div>
              </div>
              <span style="font-size:0.875rem;color:#6b7280;">폐기 완료</span>
            </div>
          </div>
        </div>
      </template>

    </div>

    <!-- ==================== MODALS ==================== -->

    <!-- ====== ANALYSIS RESULT MODAL ====== -->
    <div v-if="showAnalysisResultModal" class="sn-overlay" @click.self="closeModals">
      <div class="sn-modal" style="max-width:460px;width:100%;">
        <div style="padding:18px 24px;border-bottom:1px solid rgba(0,0,0,0.06);display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:34px;height:34px;border-radius:10px;background:#f5f5f5;display:flex;align-items:center;justify-content:center;">
              <svg width="16" height="16" fill="none" stroke="#525252" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <h3 style="font-size:1.1rem;font-weight:700;color:#171717;margin:0;">분석 결과 제출</h3>
          </div>
          <button @click="closeModals" class="sn-btn sn-btn-ghost" style="padding:6px;">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div style="padding:20px 24px;display:flex;flex-direction:column;gap:16px;">
          <div style="padding:12px;background:#fafafa;box-shadow:inset 0 0 0 1px rgba(0,0,0,0.06);border-radius:8px;">
            <p class="sn-eyebrow" style="margin:0 0 2px;">대상 여권</p>
            <p class="font-mono" style="font-size:0.85rem;font-weight:600;color:#171717;margin:0;">{{ selectedPassport?.passportId }}</p>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
            <div>
              <label style="display:block;font-size:0.82rem;font-weight:600;color:#525252;margin-bottom:6px;">SOH (%) <span style="color:#dc2626;">*</span></label>
              <input v-model="analysisForm.soh" type="number" min="0" max="100" step="0.1" placeholder="0.0" class="sn-input" style="width:100%;font-variant-numeric:tabular-nums;" />
            </div>
            <div>
              <label style="display:block;font-size:0.82rem;font-weight:600;color:#525252;margin-bottom:6px;">SOCE (%) <span style="color:#dc2626;">*</span></label>
              <input v-model="analysisForm.soce" type="number" min="0" max="100" step="0.1" placeholder="0.0" class="sn-input" style="width:100%;font-variant-numeric:tabular-nums;" />
            </div>
          </div>
          <div>
            <label style="display:block;font-size:0.82rem;font-weight:600;color:#525252;margin-bottom:6px;">잔여 수명 사이클 <span style="color:#dc2626;">*</span></label>
            <input v-model="analysisForm.remainingLifeCycle" type="number" min="0" step="1" placeholder="0" class="sn-input" style="width:100%;font-variant-numeric:tabular-nums;" />
          </div>
          <div style="display:flex;align-items:center;padding:12px;background:#fafafa;box-shadow:inset 0 0 0 1px rgba(0,0,0,0.06);border-radius:8px;">
            <label style="display:flex;align-items:center;cursor:pointer;flex:1;">
              <div style="position:relative;">
                <input type="checkbox" v-model="analysisForm.recycleAvailable" style="position:absolute;opacity:0;width:0;height:0;" />
                <div :style="{ width:'36px',height:'20px',borderRadius:'10px',background: analysisForm.recycleAvailable ? '#059669' : '#e5e5e5',transition:'background 0.2s' }"></div>
                <div :style="{ position:'absolute',top:'2px',left: analysisForm.recycleAvailable ? '18px' : '2px',width:'16px',height:'16px',borderRadius:'50%',background:'#ffffff',boxShadow:'0 1px 3px rgba(0,0,0,0.2)',transition:'left 0.2s' }"></div>
              </div>
              <span style="margin-left:12px;font-size:0.85rem;font-weight:600;" :style="{ color: analysisForm.recycleAvailable ? '#059669' : '#a3a3a3' }">
                {{ analysisForm.recycleAvailable ? '재활용 가능' : '재활용 불가' }}
              </span>
            </label>
          </div>
        </div>
        <div style="padding:14px 24px;border-top:1px solid rgba(0,0,0,0.06);display:flex;justify-content:flex-end;gap:10px;">
          <button @click="closeModals" class="sn-btn sn-btn-ghost">취소</button>
          <button @click="submitAnalysisResult"
            :disabled="!analysisForm.soh || !analysisForm.soce || !analysisForm.remainingLifeCycle || submitting"
            class="sn-btn sn-btn-accent" style="display:inline-flex;align-items:center;gap:6px;"
            :style="(!analysisForm.soh || !analysisForm.soce || !analysisForm.remainingLifeCycle || submitting) ? 'opacity:0.4;cursor:not-allowed;' : ''">
            <svg v-if="submitting" style="animation:spin 0.8s linear infinite;" width="16" height="16" fill="none" viewBox="0 0 24 24">
              <circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            {{ submitting ? '제출 중...' : '제출' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ====== RECYCLE TOGGLE MODAL ====== -->
    <div v-if="showRecycleToggleModal" class="sn-overlay" @click.self="closeModals">
      <div class="sn-modal" style="max-width:400px;width:100%;">
        <div style="padding:18px 24px;border-bottom:1px solid rgba(0,0,0,0.06);display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:34px;height:34px;border-radius:10px;background:#f0fdf4;display:flex;align-items:center;justify-content:center;">
              <svg width="16" height="16" fill="none" stroke="#059669" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <h3 style="font-size:1.1rem;font-weight:700;color:#171717;margin:0;">재활용 판정</h3>
          </div>
          <button @click="closeModals" class="sn-btn sn-btn-ghost" style="padding:6px;">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div style="padding:20px 24px;">
          <div style="padding:12px;background:#fafafa;box-shadow:inset 0 0 0 1px rgba(0,0,0,0.06);border-radius:8px;margin-bottom:20px;">
            <p class="sn-eyebrow" style="margin:0 0 2px;">대상 여권</p>
            <p class="font-mono" style="font-size:0.85rem;font-weight:600;color:#171717;margin:0;">{{ selectedPassport?.passportId }}</p>
          </div>
          <div style="display:flex;align-items:center;justify-content:center;padding:24px 0;">
            <label style="display:flex;align-items:center;cursor:pointer;">
              <div style="position:relative;">
                <input type="checkbox" v-model="recycleToggleValue" style="position:absolute;opacity:0;width:0;height:0;" />
                <div :style="{ width:'56px',height:'28px',borderRadius:'14px',background: recycleToggleValue ? '#059669' : '#e5e5e5',transition:'background 0.2s' }"></div>
                <div :style="{ position:'absolute',top:'2px',left: recycleToggleValue ? '30px' : '2px',width:'24px',height:'24px',borderRadius:'50%',background:'#ffffff',boxShadow:'0 1px 3px rgba(0,0,0,0.2)',transition:'left 0.2s' }"></div>
              </div>
              <span style="margin-left:16px;font-size:1rem;font-weight:600;" :style="{ color: recycleToggleValue ? '#059669' : '#a3a3a3' }">
                {{ recycleToggleValue ? '재활용 가능' : '재활용 불가' }}
              </span>
            </label>
          </div>
        </div>
        <div style="padding:14px 24px;border-top:1px solid rgba(0,0,0,0.06);display:flex;justify-content:flex-end;gap:10px;">
          <button @click="closeModals" class="sn-btn sn-btn-ghost">취소</button>
          <button @click="submitRecycleToggle" :disabled="submitting"
            class="sn-btn sn-btn-accent" style="display:inline-flex;align-items:center;gap:6px;"
            :style="submitting ? 'opacity:0.4;cursor:not-allowed;' : ''">
            <svg v-if="submitting" style="animation:spin 0.8s linear infinite;" width="16" height="16" fill="none" viewBox="0 0 24 24">
              <circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            {{ submitting ? '저장 중...' : '판정 저장' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ====== EXTRACT MODAL ====== -->
    <div v-if="showExtractModal" class="sn-overlay" @click.self="closeModals">
      <div class="sn-modal" style="max-width:460px;width:100%;">
        <div style="padding:18px 24px;border-bottom:1px solid rgba(0,0,0,0.06);display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:34px;height:34px;border-radius:10px;background:#fffbeb;display:flex;align-items:center;justify-content:center;">
              <svg width="16" height="16" fill="none" stroke="#d97706" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
              </svg>
            </div>
            <h3 style="font-size:1.1rem;font-weight:700;color:#171717;margin:0;">원자재 추출 기록</h3>
          </div>
          <button @click="closeModals" class="sn-btn sn-btn-ghost" style="padding:6px;">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div style="padding:20px 24px;display:flex;flex-direction:column;gap:14px;">
          <div style="padding:12px;background:#fafafa;box-shadow:inset 0 0 0 1px rgba(0,0,0,0.06);border-radius:8px;">
            <p class="sn-eyebrow" style="margin:0 0 2px;">대상 여권</p>
            <p class="font-mono" style="font-size:0.85rem;font-weight:600;color:#171717;margin:0;">{{ selectedPassport?.passportId }}</p>
          </div>
          <label style="font-size:0.82rem;font-weight:600;color:#525252;">회수율 (원자재별 %)</label>
          <div v-for="(entry, idx) in extractEntries" :key="idx" style="display:flex;align-items:center;gap:8px;">
            <input v-model="entry.key" type="text" placeholder="원자재명" class="sn-input" style="flex:1;" />
            <div style="position:relative;width:80px;">
              <input v-model="entry.value" type="number" min="0" max="100" step="0.1" placeholder="0" class="sn-input" style="width:100%;padding-right:24px;font-variant-numeric:tabular-nums;" />
              <span style="position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:0.72rem;color:#a3a3a3;">%</span>
            </div>
            <button v-if="extractEntries.length > 1" @click="removeExtractEntry(idx)" class="sn-btn sn-btn-ghost" style="padding:6px;color:#dc2626;">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
          <button @click="addExtractEntry" class="sn-btn sn-btn-ghost" style="display:inline-flex;align-items:center;gap:4px;color:#059669;font-size:0.82rem;align-self:flex-start;">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
            원자재 추가
          </button>
        </div>
        <div style="padding:14px 24px;border-top:1px solid rgba(0,0,0,0.06);display:flex;justify-content:flex-end;gap:10px;">
          <button @click="closeModals" class="sn-btn sn-btn-ghost">취소</button>
          <button @click="submitExtract" :disabled="submitting"
            class="sn-btn sn-btn-accent" style="display:inline-flex;align-items:center;gap:6px;"
            :style="submitting ? 'opacity:0.4;cursor:not-allowed;' : ''">
            <svg v-if="submitting" style="animation:spin 0.8s linear infinite;" width="16" height="16" fill="none" viewBox="0 0 24 24">
              <circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            {{ submitting ? '기록 중...' : '추출 기록' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ====== DISPOSE CONFIRMATION MODAL ====== -->
    <div v-if="showDisposeConfirm" class="sn-overlay" @click.self="closeModals">
      <div class="sn-modal" style="max-width:400px;width:100%;">
        <div style="padding:18px 24px;border-bottom:1px solid rgba(0,0,0,0.06);display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:34px;height:34px;border-radius:10px;background:#fef2f2;display:flex;align-items:center;justify-content:center;">
              <svg width="16" height="16" fill="none" stroke="#dc2626" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <h3 style="font-size:1.1rem;font-weight:700;color:#171717;margin:0;">폐기 처리 확인</h3>
          </div>
          <button @click="closeModals" class="sn-btn sn-btn-ghost" style="padding:6px;">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div style="padding:20px 24px;">
          <div style="padding:16px;background:#fef2f2;box-shadow:inset 0 0 0 1px rgba(220,38,38,0.15);border-radius:10px;display:flex;align-items:flex-start;gap:12px;">
            <svg width="20" height="20" fill="none" stroke="#dc2626" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0;margin-top:2px;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <div>
              <p style="font-size:0.85rem;font-weight:600;color:#dc2626;margin:0 0 4px;">이 작업은 되돌릴 수 없습니다</p>
              <p style="font-size:0.78rem;color:#525252;margin:0;">
                여권 <span class="font-mono" style="font-weight:700;">{{ selectedPassport?.passportId }}</span>을(를) 영구적으로 폐기 처리합니다.
              </p>
            </div>
          </div>
        </div>
        <div style="padding:14px 24px;border-top:1px solid rgba(0,0,0,0.06);display:flex;justify-content:flex-end;gap:10px;">
          <button @click="closeModals" class="sn-btn sn-btn-ghost">취소</button>
          <button @click="submitDispose" :disabled="submitting"
            class="sn-btn sn-btn-danger" style="display:inline-flex;align-items:center;gap:6px;"
            :style="submitting ? 'opacity:0.4;cursor:not-allowed;' : ''">
            <svg v-if="submitting" style="animation:spin 0.8s linear infinite;" width="16" height="16" fill="none" viewBox="0 0 24 24">
              <circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            {{ submitting ? '처리 중...' : '폐기 확인' }}
          </button>
        </div>
      </div>
    </div>
  </div>
  `,
});
