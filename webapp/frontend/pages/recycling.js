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
      return 'bg-[rgba(239,68,68,0.1)]0';
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
        await props.api.post('/analysis/' + passport.passportId + '/request', {});
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
        await props.api.post('/analysis/' + selectedPassport.value.passportId + '/result', {
          soh: Number(analysisForm.value.soh),
          soce: Number(analysisForm.value.soce),
          remainingLifeCycle: Number(analysisForm.value.remainingLifeCycle),
          recycleAvailable: analysisForm.value.recycleAvailable,
        });
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
        await props.api.put('/recycling/' + selectedPassport.value.passportId + '/availability', {
          available: recycleToggleValue.value,
        });
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
        await props.api.post('/recycling/' + selectedPassport.value.passportId + '/extract', {
          recyclingRates,
        });
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
        await props.api.post('/recycling/' + selectedPassport.value.passportId + '/dispose', {});
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
  <div style="display:flex;flex-direction:column;gap:24px;">

    <!-- ====== PAGE HEADER ====== -->
    <div class="" style="display:flex;align-items:center;justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:14px;">
        <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#14b8a6,#0d9488);display:flex;align-items:center;justify-content:center;">
          <svg width="22" height="22" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </div>
        <div>
          <h1 class="text-[#fafaf5] font-bold" style="font-family:'Pretendard Variable', sans-serif;font-size:1.35rem;color:#111827;margin:0;">재활용 관리</h1>
          <p style="font-family:'Pretendard Variable', sans-serif;font-size:0.72rem;color:#6b7280;margin-top:2px;">배터리 분석, 재활용 판정 및 폐기 처리 관리</p>
        </div>
      </div>
      <button @click="fetchPassports" class="bg-[#1a1814] border border-[rgba(250,250,245,0.06)] text-[rgba(250,250,245,0.7)] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1f1d17]" style="display:inline-flex;align-items:center;gap:6px;font-size:0.82rem;">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
        새로고침
      </button>
    </div>

    <!-- ====== STATUS SUMMARY CARDS ====== -->
    <div class=" " style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
      <div class="bg-[#1a1814]  border border-[rgba(250,250,245,0.06)] shadow-none" style="padding:14px 16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <span style="font-size:0.68rem;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;">전체</span>
          <div style="width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:#f1f5f9;">
            <svg width="14" height="14" fill="none" stroke="#6b7280" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
          </div>
        </div>
        <span style="font-family:'JetBrains Mono', monospace;font-size:1.5rem;font-weight:800;color:#111827;">{{ tabCounts.all }}</span>
      </div>
      <div class="bg-[#1a1814]  border border-[rgba(250,250,245,0.06)] shadow-none" style="padding:14px 16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <span style="font-size:0.68rem;font-weight:600;color:#059669;text-transform:uppercase;letter-spacing:0.04em;">재활용가능</span>
          <div style="width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:rgba(16,185,129,0.08);">
            <svg width="14" height="14" fill="none" stroke="#059669" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
        </div>
        <span style="font-family:'JetBrains Mono', monospace;font-size:1.5rem;font-weight:800;color:#059669;">{{ tabCounts.recyclable }}</span>
      </div>
      <div class="bg-[#1a1814]  border border-[rgba(250,250,245,0.06)] shadow-none" style="padding:14px 16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <span style="font-size:0.68rem;font-weight:600;color:#60a5fa;text-transform:uppercase;letter-spacing:0.04em;">재활용중</span>
          <div style="width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:rgba(37,99,235,0.08);">
            <svg width="14" height="14" fill="none" stroke="#60a5fa" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          </div>
        </div>
        <span style="font-family:'JetBrains Mono', monospace;font-size:1.5rem;font-weight:800;color:#60a5fa;">{{ tabCounts.recycling }}</span>
      </div>
      <div class="bg-[#1a1814]  border border-[rgba(250,250,245,0.06)] shadow-none" style="padding:14px 16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <span style="font-size:0.68rem;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;">폐기완료</span>
          <div style="width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:#f1f5f9;">
            <svg width="14" height="14" fill="none" stroke="#6b7280" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </div>
        </div>
        <span style="font-family:'JetBrains Mono', monospace;font-size:1.5rem;font-weight:800;color:#6b7280;">{{ tabCounts.disposed }}</span>
      </div>
    </div>

    <!-- ====== FILTER TABS ====== -->
    <div class="flex bg-[#2a2720]  p-1  " style="display:flex;align-items:center;gap:4px;padding:4px;width:fit-content;">
      <button v-for="tab in tabs" :key="tab.key" @click="activeTab = tab.key"
        :class="['flex-1 py-2 text-sm font-medium text-[rgba(250,250,245,0.35)] rounded-lg text-center cursor-pointer hover:text-[rgba(250,250,245,0.7)]', activeTab === tab.key ? 'bg-[#1a1814] text-[#c8ff00] shadow-none' : '']"
        style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;font-size:0.82rem;border-radius:8px;cursor:pointer;transition:all 0.2s;">
        <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" :d="tab.icon"/>
        </svg>
        {{ tab.label }}
        <span style="font-family:'JetBrains Mono', monospace;font-size:0.68rem;padding:1px 7px;border-radius:12px;background:#f1f5f9;margin-left:2px;">
          {{ tabCounts[tab.key] }}
        </span>
      </button>
    </div>

    <!-- ====== LOADING STATE ====== -->
    <div v-if="loading" class="bg-[#1a1814]  border border-[rgba(250,250,245,0.06)] shadow-none  " style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:72px 0;">
      <div style="position:relative;width:40px;height:40px;">
        <div style="position:absolute;inset:0;border-radius:50%;border:3px solid #f1f5f9;"></div>
        <div style="position:absolute;inset:0;border-radius:50%;border:3px solid #14b8a6;border-top-color:transparent;animation:spin 0.8s linear infinite;"></div>
      </div>
      <p style="margin-top:14px;font-size:0.85rem;color:#6b7280;font-family:'Pretendard Variable', sans-serif;">여권 목록을 불러오고 있습니다...</p>
    </div>

    <!-- ====== EMPTY STATE ====== -->
    <div v-else-if="filteredPassports.length === 0" class="bg-[#1a1814]  border border-[rgba(250,250,245,0.06)] shadow-none  " style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:64px 24px;">
      <div style="width:64px;height:64px;border-radius:16px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;margin-bottom:16px;">
        <svg width="32" height="32" fill="none" stroke="#6b7280" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
      </div>
      <h3 style="font-family:'Pretendard Variable', sans-serif;font-size:1rem;color:#111827;margin:0 0 4px;">재활용 관리 대상 배터리가 없습니다</h3>
      <p style="font-size:0.82rem;color:#6b7280;text-align:center;max-width:360px;font-family:'Pretendard Variable', sans-serif;">배터리 여권이 등록되면 재활용 관리를 시작할 수 있습니다.</p>
    </div>

    <!-- ====== MAIN TABLE ====== -->
    <div v-else class="bg-[#1a1814]  border border-[rgba(250,250,245,0.06)] shadow-none bg-[#1a1814]  border border-[rgba(250,250,245,0.06)] shadow-none  " style="overflow:hidden;">
      <!-- Table header strip -->
      <div style="padding:12px 20px;border-bottom:1px solid #f1f5f9;background:#ffffff;display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="bp-dot-signal" style="width:8px;height:8px;"></span>
          <span style="font-family:'Pretendard Variable', sans-serif;font-size:0.82rem;font-weight:600;color:#374151;">재활용 현황</span>
        </div>
        <span class="bg-[rgba(200,255,0,0.08)] text-[#c8ff00]" style="font-family:'JetBrains Mono', monospace;font-size:0.68rem;padding:2px 10px;border-radius:20px;">
          {{ filteredPassports.length }}건
        </span>
      </div>
      <div style="overflow-x:auto;">
        <table class="w-full text-sm" style="width:100%;">
          <thead>
            <tr>
              <th>여권ID</th>
              <th>시리얼</th>
              <th>상태</th>
              <th>SOH</th>
              <th style="text-align:center;">재활용가능</th>
              <th>재활용률</th>
              <th style="text-align:right;">액션</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(p, idx) in filteredPassports" :key="p.passportId">
              <td><span class="font-mono" style="font-size:0.78rem;color:#374151;">{{ p.passportId }}</span></td>
              <td class="font-mono" style="font-size:0.78rem;color:#6b7280;">{{ p.serialNumber || '-' }}</td>
              <td>
                <span :class="['inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', getStatusBadge(p.status).bg]">
                  <span :class="['w-1.5 h-1.5 rounded-full mr-1.5', getStatusBadge(p.status).dot]"></span>
                  {{ getStatusBadge(p.status).label }}
                </span>
              </td>
              <!-- SOH with progress bar -->
              <td>
                <div v-if="p.currentSoh != null" style="display:flex;align-items:center;gap:10px;min-width:110px;">
                  <div style="flex:1;position:relative;">
                    <div class="h-2 bg-[#33302a] rounded-full overflow-hidden" :class="getSohTrackBg(p.currentSoh)" style="height:6px;overflow:hidden;">
                      <div :class="getSohBg(p.currentSoh)" style="height:6px;border-radius:999px;transition:width 0.4s;position:relative;" :style="{ width: Math.min(p.currentSoh, 100) + '%' }">
                        <!-- Shimmer effect -->
                        <div style="position:absolute;inset:0;border-radius:999px;background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.3) 50%,transparent 100%);animation:shimmer 2s infinite;"></div>
                      </div>
                    </div>
                  </div>
                  <span :class="getSohColor(p.currentSoh)" style="font-family:'JetBrains Mono', monospace;font-size:0.82rem;font-weight:700;white-space:nowrap;">
                    {{ p.currentSoh }}%
                  </span>
                </div>
                <span v-else style="font-size:0.75rem;color:#6b7280;">미측정</span>
              </td>
              <!-- Recycle availability badge -->
              <td style="text-align:center;">
                <span v-if="p.recycleAvailable === true" class="bg-[rgba(200,255,0,0.08)] text-[#c8ff00]" style="display:inline-flex;align-items:center;gap:4px;font-size:0.7rem;padding:2px 8px;border-radius:20px;">
                  <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                  가능
                </span>
                <span v-else-if="p.recycleAvailable === false" style="display:inline-flex;align-items:center;gap:4px;font-size:0.7rem;padding:2px 8px;border-radius:20px;background:#f1f5f9;color:#6b7280;border:1px solid #e2e8f0;">
                  <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                  불가
                </span>
                <span v-else style="font-size:0.7rem;padding:2px 8px;border-radius:20px;background:#ffffff;color:#6b7280;border:1px solid #f1f5f9;">
                  미판정
                </span>
              </td>
              <!-- Recycling rates with shimmer -->
              <td>
                <div v-if="getRecyclingRateEntries(p.recyclingRates).length > 0" style="display:flex;flex-direction:column;gap:6px;min-width:140px;">
                  <div v-for="entry in getRecyclingRateEntries(p.recyclingRates)" :key="entry.key"
                    style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:0.7rem;font-weight:500;color:#374151;width:60px;text-align:right;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" :title="entry.key">{{ entry.key }}</span>
                    <div class="h-2 bg-[#33302a] rounded-full overflow-hidden" style="flex:1;height:6px;min-width:50px;background:#f1f5f9;overflow:hidden;">
                      <div :class="getRateBarColor(entry.value)" style="height:6px;border-radius:999px;transition:width 0.4s;position:relative;" :style="{ width: Math.min(entry.value, 100) + '%' }">
                        <!-- Shimmer effect on rate bars -->
                        <div style="position:absolute;inset:0;border-radius:999px;background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.3) 50%,transparent 100%);animation:shimmer 2s infinite;"></div>
                      </div>
                    </div>
                    <span style="font-family:'JetBrains Mono', monospace;font-size:0.7rem;font-weight:700;color:#374151;width:36px;flex-shrink:0;font-variant-numeric:tabular-nums;">{{ entry.value }}%</span>
                  </div>
                </div>
                <span v-else style="font-size:0.75rem;color:#6b7280;">-</span>
              </td>
              <!-- Actions -->
              <td style="text-align:right;">
                <div v-if="hasAnyAction(p)" style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
                  <button v-if="canRequestAnalysis && p.status !== 'DISPOSED'" @click="requestAnalysis(p)"
                    class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium" style="font-size:0.72rem;padding:4px 10px;display:inline-flex;align-items:center;gap:4px;color:#2563eb;border:1px solid #2563eb;background:transparent;width:100%;justify-content:center;">
                    <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                    분석 요청
                  </button>
                  <button v-if="canSubmitAnalysis && p.status !== 'DISPOSED'" @click="openAnalysisResult(p)"
                    class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium" style="font-size:0.72rem;padding:4px 10px;display:inline-flex;align-items:center;gap:4px;color:#7c3aed;border:1px solid #7c3aed;background:transparent;width:100%;justify-content:center;">
                    <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    분석 결과
                  </button>
                  <button v-if="canToggleRecycle && p.status !== 'DISPOSED'" @click="openRecycleToggle(p)"
                    class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium" style="font-size:0.72rem;padding:4px 10px;display:inline-flex;align-items:center;gap:4px;color:#059669;border:1px solid #059669;background:transparent;width:100%;justify-content:center;">
                    <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    재활용 판정
                  </button>
                  <button v-if="canExtract && p.status !== 'DISPOSED'" @click="openExtract(p)"
                    class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium" style="font-size:0.72rem;padding:4px 10px;display:inline-flex;align-items:center;gap:4px;color:#d97706;border:1px solid #d97706;background:transparent;width:100%;justify-content:center;">
                    <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                    원자재 추출
                  </button>
                  <button v-if="canDispose && p.status !== 'DISPOSED'" @click="openDispose(p)"
                    class="bg-[rgba(239,68,68,0.1)] text-[#ff6b6b] border border-red-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100" style="font-size:0.72rem;padding:4px 10px;display:inline-flex;align-items:center;gap:4px;width:100%;justify-content:center;">
                    <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    폐기 처리
                  </button>
                </div>
                <span v-else-if="p.status === 'DISPOSED'" style="font-size:0.75rem;color:#6b7280;">폐기 완료</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ==================== MODALS ==================== -->

    <!-- ====== ANALYSIS RESULT MODAL ====== -->
    <div v-if="showAnalysisResultModal" style="position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:16px;">
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(6px);" @click="closeModals"></div>
      <div class="bg-[#1a1814]  border border-[rgba(250,250,245,0.06)] shadow-none bg-[#1a1814]  border border-[rgba(250,250,245,0.06)] shadow-none " style="position:relative;z-index:1;max-width:460px;width:100%;overflow:hidden;">
        <div style="padding:18px 24px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:34px;height:34px;border-radius:10px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;">
              <svg width="16" height="16" fill="none" stroke="#7c3aed" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <h3 style="font-family:'Pretendard Variable', sans-serif;font-size:1.1rem;font-weight:700;color:#111827;margin:0;">분석 결과 제출</h3>
          </div>
          <button @click="closeModals" class="bg-[#1a1814] border border-[rgba(250,250,245,0.06)] text-[rgba(250,250,245,0.7)] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1f1d17]" style="padding:6px;">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div style="padding:20px 24px;display:flex;flex-direction:column;gap:16px;">
          <div style="padding:12px;background:#ffffff;border:1px solid #f1f5f9;border-radius:8px;">
            <p style="font-size:0.65rem;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 2px;">대상 여권</p>
            <p class="font-mono" style="font-size:0.85rem;font-weight:600;color:#111827;margin:0;">{{ selectedPassport?.passportId }}</p>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
            <div>
              <label style="display:block;font-size:0.82rem;font-weight:600;color:#374151;margin-bottom:6px;">SOH (%) <span style="color:#dc2626;">*</span></label>
              <input v-model="analysisForm.soh" type="number" min="0" max="100" step="0.1" placeholder="0.0" class="w-full px-4 py-2.5 bg-[#1f1d17] border border-[rgba(250,250,245,0.06)]  text-[#fafaf5] outline-none focus:border-[#c8ff00]" style="width:100%;font-variant-numeric:tabular-nums;" />
            </div>
            <div>
              <label style="display:block;font-size:0.82rem;font-weight:600;color:#374151;margin-bottom:6px;">SOCE (%) <span style="color:#dc2626;">*</span></label>
              <input v-model="analysisForm.soce" type="number" min="0" max="100" step="0.1" placeholder="0.0" class="w-full px-4 py-2.5 bg-[#1f1d17] border border-[rgba(250,250,245,0.06)]  text-[#fafaf5] outline-none focus:border-[#c8ff00]" style="width:100%;font-variant-numeric:tabular-nums;" />
            </div>
          </div>
          <div>
            <label style="display:block;font-size:0.82rem;font-weight:600;color:#374151;margin-bottom:6px;">잔여 수명 사이클 <span style="color:#dc2626;">*</span></label>
            <input v-model="analysisForm.remainingLifeCycle" type="number" min="0" step="1" placeholder="0" class="w-full px-4 py-2.5 bg-[#1f1d17] border border-[rgba(250,250,245,0.06)]  text-[#fafaf5] outline-none focus:border-[#c8ff00]" style="width:100%;font-variant-numeric:tabular-nums;" />
          </div>
          <div style="display:flex;align-items:center;padding:12px;background:#ffffff;border:1px solid #f1f5f9;border-radius:8px;">
            <label style="display:flex;align-items:center;cursor:pointer;flex:1;">
              <div style="position:relative;">
                <input type="checkbox" v-model="analysisForm.recycleAvailable" style="position:absolute;opacity:0;width:0;height:0;" />
                <div :style="{ width:'36px',height:'20px',borderRadius:'10px',background: analysisForm.recycleAvailable ? '#059669' : '#e2e8f0',transition:'background 0.2s' }"></div>
                <div :style="{ position:'absolute',top:'2px',left: analysisForm.recycleAvailable ? '18px' : '2px',width:'16px',height:'16px',borderRadius:'50%',background:'#ffffff',boxShadow:'0 1px 3px rgba(0,0,0,0.2)',transition:'left 0.2s' }"></div>
              </div>
              <span style="margin-left:12px;font-size:0.85rem;font-weight:600;" :style="{ color: analysisForm.recycleAvailable ? '#059669' : '#6b7280' }">
                {{ analysisForm.recycleAvailable ? '재활용 가능' : '재활용 불가' }}
              </span>
            </label>
          </div>
        </div>
        <div style="padding:14px 24px;border-top:1px solid #f1f5f9;background:#ffffff;display:flex;justify-content:flex-end;gap:10px;">
          <button @click="closeModals" class="bg-[#1a1814] border border-[rgba(250,250,245,0.06)] text-[rgba(250,250,245,0.7)] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1f1d17]">취소</button>
          <button @click="submitAnalysisResult"
            :disabled="!analysisForm.soh || !analysisForm.soce || !analysisForm.remainingLifeCycle || submitting"
            class="bg-[#c8ff00] text-[#1a1814] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#d4ff33]" style="display:inline-flex;align-items:center;gap:6px;"
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
    <div v-if="showRecycleToggleModal" style="position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:16px;">
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(6px);" @click="closeModals"></div>
      <div class="bg-[#1a1814]  border border-[rgba(250,250,245,0.06)] shadow-none bg-[#1a1814]  border border-[rgba(250,250,245,0.06)] shadow-none " style="position:relative;z-index:1;max-width:400px;width:100%;overflow:hidden;">
        <div style="padding:18px 24px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:34px;height:34px;border-radius:10px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;">
              <svg width="16" height="16" fill="none" stroke="#059669" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <h3 style="font-family:'Pretendard Variable', sans-serif;font-size:1.1rem;font-weight:700;color:#111827;margin:0;">재활용 판정</h3>
          </div>
          <button @click="closeModals" class="bg-[#1a1814] border border-[rgba(250,250,245,0.06)] text-[rgba(250,250,245,0.7)] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1f1d17]" style="padding:6px;">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div style="padding:20px 24px;">
          <div style="padding:12px;background:#ffffff;border:1px solid #f1f5f9;border-radius:8px;margin-bottom:20px;">
            <p style="font-size:0.65rem;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 2px;">대상 여권</p>
            <p class="font-mono" style="font-size:0.85rem;font-weight:600;color:#111827;margin:0;">{{ selectedPassport?.passportId }}</p>
          </div>
          <div style="display:flex;align-items:center;justify-content:center;padding:24px 0;">
            <label style="display:flex;align-items:center;cursor:pointer;">
              <div style="position:relative;">
                <input type="checkbox" v-model="recycleToggleValue" style="position:absolute;opacity:0;width:0;height:0;" />
                <div :style="{ width:'56px',height:'28px',borderRadius:'14px',background: recycleToggleValue ? '#059669' : '#e2e8f0',transition:'background 0.2s' }"></div>
                <div :style="{ position:'absolute',top:'2px',left: recycleToggleValue ? '30px' : '2px',width:'24px',height:'24px',borderRadius:'50%',background:'#ffffff',boxShadow:'0 1px 3px rgba(0,0,0,0.2)',transition:'left 0.2s' }"></div>
              </div>
              <span style="margin-left:16px;font-size:1rem;font-weight:600;" :style="{ color: recycleToggleValue ? '#059669' : '#6b7280' }">
                {{ recycleToggleValue ? '재활용 가능' : '재활용 불가' }}
              </span>
            </label>
          </div>
        </div>
        <div style="padding:14px 24px;border-top:1px solid #f1f5f9;background:#ffffff;display:flex;justify-content:flex-end;gap:10px;">
          <button @click="closeModals" class="bg-[#1a1814] border border-[rgba(250,250,245,0.06)] text-[rgba(250,250,245,0.7)] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1f1d17]">취소</button>
          <button @click="submitRecycleToggle" :disabled="submitting"
            class="bg-[#c8ff00] text-[#1a1814] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#d4ff33]" style="display:inline-flex;align-items:center;gap:6px;"
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
    <div v-if="showExtractModal" style="position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:16px;">
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(6px);" @click="closeModals"></div>
      <div class="bg-[#1a1814]  border border-[rgba(250,250,245,0.06)] shadow-none bg-[#1a1814]  border border-[rgba(250,250,245,0.06)] shadow-none " style="position:relative;z-index:1;max-width:460px;width:100%;overflow:hidden;">
        <div style="padding:18px 24px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:34px;height:34px;border-radius:10px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;">
              <svg width="16" height="16" fill="none" stroke="#d97706" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
              </svg>
            </div>
            <h3 style="font-family:'Pretendard Variable', sans-serif;font-size:1.1rem;font-weight:700;color:#111827;margin:0;">원자재 추출 기록</h3>
          </div>
          <button @click="closeModals" class="bg-[#1a1814] border border-[rgba(250,250,245,0.06)] text-[rgba(250,250,245,0.7)] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1f1d17]" style="padding:6px;">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div style="padding:20px 24px;display:flex;flex-direction:column;gap:14px;">
          <div style="padding:12px;background:#ffffff;border:1px solid #f1f5f9;border-radius:8px;">
            <p style="font-size:0.65rem;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 2px;">대상 여권</p>
            <p class="font-mono" style="font-size:0.85rem;font-weight:600;color:#111827;margin:0;">{{ selectedPassport?.passportId }}</p>
          </div>
          <label style="font-size:0.82rem;font-weight:600;color:#374151;">회수율 (원자재별 %)</label>
          <div v-for="(entry, idx) in extractEntries" :key="idx" style="display:flex;align-items:center;gap:8px;">
            <input v-model="entry.key" type="text" placeholder="원자재명" class="w-full px-4 py-2.5 bg-[#1f1d17] border border-[rgba(250,250,245,0.06)]  text-[#fafaf5] outline-none focus:border-[#c8ff00]" style="flex:1;" />
            <div style="position:relative;width:80px;">
              <input v-model="entry.value" type="number" min="0" max="100" step="0.1" placeholder="0" class="w-full px-4 py-2.5 bg-[#1f1d17] border border-[rgba(250,250,245,0.06)]  text-[#fafaf5] outline-none focus:border-[#c8ff00]" style="width:100%;padding-right:24px;font-variant-numeric:tabular-nums;" />
              <span style="position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:0.72rem;color:#6b7280;">%</span>
            </div>
            <button v-if="extractEntries.length > 1" @click="removeExtractEntry(idx)" class="bg-[#1a1814] border border-[rgba(250,250,245,0.06)] text-[rgba(250,250,245,0.7)] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1f1d17]" style="padding:6px;color:#dc2626;">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
          <button @click="addExtractEntry" class="bg-[#1a1814] border border-[rgba(250,250,245,0.06)] text-[rgba(250,250,245,0.7)] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1f1d17]" style="display:inline-flex;align-items:center;gap:4px;color:#059669;font-size:0.82rem;align-self:flex-start;">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
            원자재 추가
          </button>
        </div>
        <div style="padding:14px 24px;border-top:1px solid #f1f5f9;background:#ffffff;display:flex;justify-content:flex-end;gap:10px;">
          <button @click="closeModals" class="bg-[#1a1814] border border-[rgba(250,250,245,0.06)] text-[rgba(250,250,245,0.7)] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1f1d17]">취소</button>
          <button @click="submitExtract" :disabled="submitting"
            class="bg-[#c8ff00] text-[#1a1814] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#d4ff33]" style="display:inline-flex;align-items:center;gap:6px;"
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
    <div v-if="showDisposeConfirm" style="position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:16px;">
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(6px);" @click="closeModals"></div>
      <div class="bg-[#1a1814]  border border-[rgba(250,250,245,0.06)] shadow-none bg-[#1a1814]  border border-[rgba(250,250,245,0.06)] shadow-none " style="position:relative;z-index:1;max-width:400px;width:100%;overflow:hidden;">
        <div style="padding:18px 24px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:34px;height:34px;border-radius:10px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;">
              <svg width="16" height="16" fill="none" stroke="#dc2626" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <h3 style="font-family:'Pretendard Variable', sans-serif;font-size:1.1rem;font-weight:700;color:#111827;margin:0;">폐기 처리 확인</h3>
          </div>
          <button @click="closeModals" class="bg-[#1a1814] border border-[rgba(250,250,245,0.06)] text-[rgba(250,250,245,0.7)] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1f1d17]" style="padding:6px;">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div style="padding:20px 24px;">
          <div style="padding:16px;background:#ffffff;border:1px solid #dc2626;border-radius:10px;display:flex;align-items:flex-start;gap:12px;">
            <svg width="20" height="20" fill="none" stroke="#dc2626" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0;margin-top:2px;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <div>
              <p style="font-size:0.85rem;font-weight:600;color:#dc2626;margin:0 0 4px;">이 작업은 되돌릴 수 없습니다</p>
              <p style="font-size:0.78rem;color:#374151;margin:0;">
                여권 <span class="font-mono" style="font-weight:700;">{{ selectedPassport?.passportId }}</span>을(를) 영구적으로 폐기 처리합니다.
              </p>
            </div>
          </div>
        </div>
        <div style="padding:14px 24px;border-top:1px solid #f1f5f9;background:#ffffff;display:flex;justify-content:flex-end;gap:10px;">
          <button @click="closeModals" class="bg-[#1a1814] border border-[rgba(250,250,245,0.06)] text-[rgba(250,250,245,0.7)] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1f1d17]">취소</button>
          <button @click="submitDispose" :disabled="submitting"
            class="bg-[rgba(239,68,68,0.1)] text-[#ff6b6b] border border-red-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100" style="display:inline-flex;align-items:center;gap:6px;"
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
