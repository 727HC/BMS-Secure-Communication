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
    const isEVManufacturer = computed(() => props.auth.orgMsp === 'EVManufacturerMSP');
    const isService = computed(() => props.auth.orgMsp === 'ServiceMSP');
    const isRegulator = computed(() => props.auth.orgMsp === 'RegulatorMSP');
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
      if (soh === null || soh === undefined) return 'text-gray-400';
      if (soh > 80) return 'text-emerald-600';
      if (soh >= 50) return 'text-amber-600';
      return 'text-red-600';
    }

    function getSohBg(soh) {
      if (soh === null || soh === undefined) return 'bg-gray-200';
      if (soh > 80) return 'bg-emerald-500';
      if (soh >= 50) return 'bg-amber-500';
      return 'bg-red-500';
    }

    function getSohTrackBg(soh) {
      if (soh === null || soh === undefined) return 'bg-gray-100';
      if (soh > 80) return 'bg-emerald-100';
      if (soh >= 50) return 'bg-amber-100';
      return 'bg-red-100';
    }

    const statusConfig = {
      MANUFACTURED: { bg: 'bg-blue-50 text-blue-700 border border-blue-200', dot: 'bg-blue-500', label: '제조완료' },
      ACTIVE:       { bg: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500', label: '운행중' },
      MAINTENANCE:  { bg: 'bg-amber-50 text-amber-700 border border-amber-200', dot: 'bg-amber-500', label: '정비중' },
      ANALYSIS:     { bg: 'bg-purple-50 text-purple-700 border border-purple-200', dot: 'bg-purple-500', label: '분석중' },
      RECYCLING:    { bg: 'bg-orange-50 text-orange-700 border border-orange-200', dot: 'bg-orange-500', label: '재활용' },
      DISPOSED:     { bg: 'bg-gray-100 text-gray-600 border border-gray-200', dot: 'bg-gray-400', label: '폐기' },
    };

    function getStatusBadge(status) {
      return statusConfig[status] || statusConfig.DISPOSED;
    }

    function getRecyclingRateEntries(rates) {
      if (!rates || typeof rates !== 'object') return [];
      return Object.entries(rates).map(([key, value]) => ({ key, value }));
    }

    function getRateBarColor(value) {
      if (value >= 80) return 'bg-emerald-500';
      if (value >= 50) return 'bg-blue-500';
      return 'bg-amber-500';
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
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </div>
        <div>
          <h1 class="text-xl font-bold text-gray-900">재활용 관리</h1>
          <p class="text-gray-500 text-xs mt-0.5">배터리 분석, 재활용 판정 및 폐기 처리 관리</p>
        </div>
      </div>
      <button @click="fetchPassports"
        class="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
        <svg class="w-4 h-4 mr-1.5 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
        새로고침
      </button>
    </div>

    <!-- Filter Tabs -->
    <div class="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
      <button v-for="tab in tabs" :key="tab.key" @click="activeTab = tab.key"
        :class="['flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all',
          activeTab === tab.key
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700']">
        <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" :d="tab.icon"/>
        </svg>
        {{ tab.label }}
        <span :class="['ml-1.5 text-xs font-semibold px-1.5 py-0.5 rounded-full',
          activeTab === tab.key ? 'bg-teal-100 text-teal-700' : 'bg-gray-200 text-gray-500']">
          {{ tabCounts[tab.key] }}
        </span>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20">
      <div class="relative">
        <div class="w-10 h-10 rounded-full border-[3px] border-gray-200"></div>
        <div class="absolute inset-0 w-10 h-10 rounded-full border-[3px] border-teal-500 border-t-transparent animate-spin"></div>
      </div>
      <p class="mt-3 text-sm text-gray-500">여권 목록을 불러오고 있습니다...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredPassports.length === 0" class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="flex flex-col items-center justify-center py-16 px-6">
        <div class="w-16 h-16 rounded-xl bg-teal-50 flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-teal-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </div>
        <h3 class="text-base font-semibold text-gray-800 mb-1">재활용 관리 대상 배터리가 없습니다</h3>
        <p class="text-sm text-gray-500 text-center max-w-md">배터리 여권이 등록되면 재활용 관리를 시작할 수 있습니다.</p>
      </div>
    </div>

    <!-- Main Table -->
    <div v-else class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="px-4 py-3 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          <span class="text-sm font-semibold text-gray-700">재활용 현황</span>
          <span class="text-xs font-medium text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">{{ filteredPassports.length }}건</span>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-100">
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">여권ID</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">시리얼</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">상태</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">SOH</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">재활용가능</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">재활용률</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">액션</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="(p, idx) in filteredPassports" :key="p.passportId"
              :class="['transition-colors hover:bg-gray-50', idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40']">
              <td class="px-4 py-3 whitespace-nowrap">
                <span class="text-sm font-mono text-gray-700">{{ p.passportId }}</span>
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-mono">{{ p.serialNumber || '-' }}</td>
              <td class="px-4 py-3 whitespace-nowrap">
                <span :class="['inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', getStatusBadge(p.status).bg]">
                  <span :class="['w-1.5 h-1.5 rounded-full mr-1.5', getStatusBadge(p.status).dot]"></span>
                  {{ getStatusBadge(p.status).label }}
                </span>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <div v-if="p.currentSoh != null" class="flex items-center gap-2.5 min-w-[110px]">
                  <div class="flex-1">
                    <div :class="['w-full rounded-full h-1.5', getSohTrackBg(p.currentSoh)]">
                      <div :class="['h-1.5 rounded-full transition-all', getSohBg(p.currentSoh)]"
                        :style="{ width: Math.min(p.currentSoh, 100) + '%' }"></div>
                    </div>
                  </div>
                  <span :class="['text-sm font-bold tabular-nums whitespace-nowrap', getSohColor(p.currentSoh)]">
                    {{ p.currentSoh }}%
                  </span>
                </div>
                <span v-else class="text-xs text-gray-400">미측정</span>
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-center">
                <span v-if="p.recycleAvailable === true"
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                  가능
                </span>
                <span v-else-if="p.recycleAvailable === false"
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                  <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                  불가
                </span>
                <span v-else class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-400 border border-gray-200">
                  미판정
                </span>
              </td>
              <td class="px-4 py-3">
                <div v-if="getRecyclingRateEntries(p.recyclingRates).length > 0" class="space-y-1.5 min-w-[140px]">
                  <div v-for="entry in getRecyclingRateEntries(p.recyclingRates)" :key="entry.key"
                    class="flex items-center gap-2">
                    <span class="text-[11px] font-medium text-gray-600 w-10 text-right shrink-0">{{ entry.key }}</span>
                    <div class="flex-1 bg-gray-100 rounded-full h-1.5 min-w-[50px]">
                      <div :class="['h-1.5 rounded-full transition-all', getRateBarColor(entry.value)]"
                        :style="{ width: Math.min(entry.value, 100) + '%' }"></div>
                    </div>
                    <span class="text-[11px] font-bold text-gray-700 w-9 shrink-0 tabular-nums">{{ entry.value }}%</span>
                  </div>
                </div>
                <span v-else class="text-xs text-gray-400">-</span>
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-right">
                <div v-if="hasAnyAction(p)" class="flex flex-col items-end gap-1">
                  <button v-if="canRequestAnalysis && p.status !== 'DISPOSED'"
                    @click="requestAnalysis(p)"
                    class="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors w-full justify-center">
                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                    분석 요청
                  </button>
                  <button v-if="canSubmitAnalysis && p.status !== 'DISPOSED'"
                    @click="openAnalysisResult(p)"
                    class="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 transition-colors w-full justify-center">
                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    분석 결과
                  </button>
                  <button v-if="canToggleRecycle && p.status !== 'DISPOSED'"
                    @click="openRecycleToggle(p)"
                    class="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-md hover:bg-teal-100 transition-colors w-full justify-center">
                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    재활용 판정
                  </button>
                  <button v-if="canExtract && p.status !== 'DISPOSED'"
                    @click="openExtract(p)"
                    class="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 transition-colors w-full justify-center">
                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                    </svg>
                    원자재 추출
                  </button>
                  <button v-if="canDispose && p.status !== 'DISPOSED'"
                    @click="openDispose(p)"
                    class="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors w-full justify-center">
                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                    폐기 처리
                  </button>
                </div>
                <span v-else-if="p.status === 'DISPOSED'" class="text-xs text-gray-400">폐기 완료</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ==================== MODALS ==================== -->

    <!-- Analysis Result Modal -->
    <div v-if="showAnalysisResultModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen px-4 py-8">
        <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" @click="closeModals"></div>
        <div class="relative bg-white rounded-xl shadow-2xl max-w-md w-full z-10 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <h3 class="text-lg font-bold text-gray-900">분석 결과 제출</h3>
            </div>
            <button @click="closeModals" class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="px-6 py-5">
            <div class="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">대상 여권</p>
              <p class="text-sm font-mono font-semibold text-gray-900">{{ selectedPassport?.passportId }}</p>
            </div>
            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-1">SOH (%) <span class="text-red-500">*</span></label>
                  <input v-model="analysisForm.soh" type="number" min="0" max="100" step="0.1" placeholder="0.0"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none tabular-nums"/>
                </div>
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-1">SOCE (%) <span class="text-red-500">*</span></label>
                  <input v-model="analysisForm.soce" type="number" min="0" max="100" step="0.1" placeholder="0.0"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none tabular-nums"/>
                </div>
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">잔여 수명 사이클 <span class="text-red-500">*</span></label>
                <input v-model="analysisForm.remainingLifeCycle" type="number" min="0" step="1" placeholder="0"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none tabular-nums"/>
              </div>
              <div class="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                <label class="flex items-center cursor-pointer select-none flex-1">
                  <div class="relative">
                    <input type="checkbox" v-model="analysisForm.recycleAvailable" class="sr-only peer"/>
                    <div class="w-9 h-5 bg-gray-200 rounded-full peer-checked:bg-emerald-600 transition-colors"></div>
                    <div class="absolute top-[2px] left-[2px] w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4"></div>
                  </div>
                  <span class="ml-3 text-sm font-semibold" :class="analysisForm.recycleAvailable ? 'text-emerald-700' : 'text-gray-500'">
                    {{ analysisForm.recycleAvailable ? '재활용 가능' : '재활용 불가' }}
                  </span>
                </label>
              </div>
            </div>
          </div>
          <div class="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
            <button @click="closeModals"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              취소
            </button>
            <button @click="submitAnalysisResult"
              :disabled="!analysisForm.soh || !analysisForm.soce || !analysisForm.remainingLifeCycle || submitting"
              :class="['px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center',
                (!analysisForm.soh || !analysisForm.soce || !analysisForm.remainingLifeCycle || submitting) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700']">
              <svg v-if="submitting" class="w-4 h-4 mr-1.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              {{ submitting ? '제출 중...' : '제출' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Recycle Toggle Modal -->
    <div v-if="showRecycleToggleModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen px-4 py-8">
        <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" @click="closeModals"></div>
        <div class="relative bg-white rounded-xl shadow-2xl max-w-sm w-full z-10 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                <svg class="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <h3 class="text-lg font-bold text-gray-900">재활용 판정</h3>
            </div>
            <button @click="closeModals" class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="px-6 py-5">
            <div class="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">대상 여권</p>
              <p class="text-sm font-mono font-semibold text-gray-900">{{ selectedPassport?.passportId }}</p>
            </div>
            <div class="flex items-center justify-center py-6">
              <label class="flex items-center cursor-pointer select-none">
                <div class="relative">
                  <input type="checkbox" v-model="recycleToggleValue" class="sr-only peer"/>
                  <div class="w-14 h-7 bg-gray-200 rounded-full peer-checked:bg-emerald-600 transition-colors"></div>
                  <div class="absolute top-0.5 left-[4px] w-6 h-6 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-7"></div>
                </div>
                <span class="ml-4 text-base font-semibold" :class="recycleToggleValue ? 'text-emerald-700' : 'text-gray-500'">
                  {{ recycleToggleValue ? '재활용 가능' : '재활용 불가' }}
                </span>
              </label>
            </div>
          </div>
          <div class="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
            <button @click="closeModals"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              취소
            </button>
            <button @click="submitRecycleToggle"
              :disabled="submitting"
              :class="['px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center',
                submitting ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-teal-600 text-white hover:bg-teal-700']">
              <svg v-if="submitting" class="w-4 h-4 mr-1.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              {{ submitting ? '저장 중...' : '판정 저장' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Extract Modal -->
    <div v-if="showExtractModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen px-4 py-8">
        <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" @click="closeModals"></div>
        <div class="relative bg-white rounded-xl shadow-2xl max-w-md w-full z-10 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <svg class="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                </svg>
              </div>
              <h3 class="text-lg font-bold text-gray-900">원자재 추출 기록</h3>
            </div>
            <button @click="closeModals" class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="px-6 py-5">
            <div class="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">대상 여권</p>
              <p class="text-sm font-mono font-semibold text-gray-900">{{ selectedPassport?.passportId }}</p>
            </div>
            <div class="space-y-3">
              <label class="block text-sm font-semibold text-gray-700">회수율 (원자재별 %)</label>
              <div v-for="(entry, idx) in extractEntries" :key="idx" class="flex items-center gap-2">
                <input v-model="entry.key" type="text" placeholder="원자재명"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none placeholder-gray-400"/>
                <div class="relative w-20">
                  <input v-model="entry.value" type="number" min="0" max="100" step="0.1" placeholder="0"
                    class="w-full px-3 py-2 pr-7 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none tabular-nums"/>
                  <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                </div>
                <button @click="removeExtractEntry(idx)" v-if="extractEntries.length > 1"
                  class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
              <button @click="addExtractEntry"
                class="inline-flex items-center text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
                </svg>
                원자재 추가
              </button>
            </div>
          </div>
          <div class="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
            <button @click="closeModals"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              취소
            </button>
            <button @click="submitExtract"
              :disabled="submitting"
              :class="['px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center',
                submitting ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-amber-600 text-white hover:bg-amber-700']">
              <svg v-if="submitting" class="w-4 h-4 mr-1.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              {{ submitting ? '기록 중...' : '추출 기록' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Dispose Confirmation Modal -->
    <div v-if="showDisposeConfirm" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen px-4 py-8">
        <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" @click="closeModals"></div>
        <div class="relative bg-white rounded-xl shadow-2xl max-w-sm w-full z-10 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                <svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>
              <h3 class="text-lg font-bold text-gray-900">폐기 처리 확인</h3>
            </div>
            <button @click="closeModals" class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="px-6 py-5">
            <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div class="flex items-start gap-3">
                <svg class="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                <div>
                  <p class="text-sm font-semibold text-red-800">이 작업은 되돌릴 수 없습니다</p>
                  <p class="text-xs text-red-600 mt-1">
                    여권 <span class="font-mono font-bold">{{ selectedPassport?.passportId }}</span>을(를) 영구적으로 폐기 처리합니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div class="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
            <button @click="closeModals"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              취소
            </button>
            <button @click="submitDispose"
              :disabled="submitting"
              :class="['px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center',
                submitting ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700']">
              <svg v-if="submitting" class="w-4 h-4 mr-1.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              {{ submitting ? '처리 중...' : '폐기 확인' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  `,
});
