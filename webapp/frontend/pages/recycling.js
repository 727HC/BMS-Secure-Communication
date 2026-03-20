app.component('recycling-page', {
  props: ['auth', 'api'],
  emits: ['navigate'],
  setup(props, { emit }) {
    const { ref, computed, onMounted } = Vue;

    const passports = ref([]);
    const loading = ref(false);
    const activeTab = ref('all');

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
    const extractForm = ref({ recyclingRates: {} });
    const extractEntries = ref([{ key: '', value: '' }]);

    const tabs = [
      { key: 'all', label: '전체' },
      { key: 'recyclable', label: '재활용가능' },
      { key: 'recycling', label: '재활용중' },
      { key: 'disposed', label: '폐기완료' },
    ];

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
      return passports.value;
    });

    async function fetchPassports() {
      loading.value = true;
      try {
        const data = await props.api.get('/passports');
        passports.value = Array.isArray(data) ? data : (data.passports || []);
      } catch (e) {
        window.$toast('error', '여권 목록 조회 실패: ' + e.message);
      } finally {
        loading.value = false;
      }
    }

    function getSohColor(soh) {
      if (soh === null || soh === undefined) return 'text-gray-400';
      if (soh > 80) return 'text-green-600';
      if (soh >= 50) return 'text-yellow-600';
      return 'text-red-600';
    }

    function getSohBg(soh) {
      if (soh === null || soh === undefined) return 'bg-gray-200';
      if (soh > 80) return 'bg-green-500';
      if (soh >= 50) return 'bg-yellow-500';
      return 'bg-red-500';
    }

    function getStatusBadge(status) {
      const map = {
        ACTIVE: 'bg-green-100 text-green-700',
        MAINTENANCE: 'bg-yellow-100 text-yellow-700',
        RECALLED: 'bg-red-100 text-red-700',
        DISPOSED: 'bg-gray-100 text-gray-700',
        RECYCLING: 'bg-blue-100 text-blue-700',
      };
      return map[status] || 'bg-gray-100 text-gray-600';
    }

    function getStatusLabel(status) {
      const map = {
        ACTIVE: '활성',
        MAINTENANCE: '정비중',
        RECALLED: '리콜',
        DISPOSED: '폐기',
        RECYCLING: '재활용',
      };
      return map[status] || status;
    }

    function getRecyclingRateEntries(rates) {
      if (!rates || typeof rates !== 'object') return [];
      return Object.entries(rates).map(([key, value]) => ({ key, value }));
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
      }
    }

    // Recycle toggle
    function openRecycleToggle(passport) {
      selectedPassport.value = passport;
      recycleToggleValue.value = passport.recycleAvailable || false;
      showRecycleToggleModal.value = true;
    }

    async function submitRecycleToggle() {
      try {
        await props.api.put('/recycling/' + selectedPassport.value.passportId + '/availability', {
          available: recycleToggleValue.value,
        });
        window.$toast('success', '재활용 판정이 업데이트되었습니다.');
        closeModals();
        await fetchPassports();
      } catch (e) {
        window.$toast('error', '재활용 판정 실패: ' + e.message);
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
      }
    }

    // Dispose
    function openDispose(passport) {
      selectedPassport.value = passport;
      showDisposeConfirm.value = true;
    }

    async function submitDispose() {
      try {
        await props.api.post('/recycling/' + selectedPassport.value.passportId + '/dispose', {});
        window.$toast('success', '폐기 처리가 완료되었습니다.');
        closeModals();
        await fetchPassports();
      } catch (e) {
        window.$toast('error', '폐기 처리 실패: ' + e.message);
      }
    }

    function closeModals() {
      showAnalysisResultModal.value = false;
      showRecycleToggleModal.value = false;
      showExtractModal.value = false;
      showDisposeConfirm.value = false;
      selectedPassport.value = null;
    }

    onMounted(fetchPassports);

    return {
      passports, loading, activeTab, filteredPassports, tabs,
      showAnalysisResultModal, showRecycleToggleModal, showExtractModal, showDisposeConfirm,
      selectedPassport, analysisForm, recycleToggleValue, extractEntries,
      isEVManufacturer, isService, isRegulator,
      canRequestAnalysis, canSubmitAnalysis, canToggleRecycle, canExtract, canDispose,
      fetchPassports, getSohColor, getSohBg, getStatusBadge, getStatusLabel, getRecyclingRateEntries,
      requestAnalysis, openAnalysisResult, submitAnalysisResult,
      openRecycleToggle, submitRecycleToggle,
      openExtract, addExtractEntry, removeExtractEntry, submitExtract,
      openDispose, submitDispose,
      closeModals,
    };
  },
  template: `
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">재활용 관리</h1>
        <p class="mt-1 text-sm text-gray-500">배터리 분석, 재활용 판정 및 폐기 관리</p>
      </div>
      <button @click="fetchPassports"
        class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
        새로고침
      </button>
    </div>

    <!-- Filter Tabs -->
    <div class="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
      <button v-for="tab in tabs" :key="tab.key" @click="activeTab = tab.key"
        :class="['px-4 py-2 text-sm font-medium rounded-md transition-colors',
          activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700']">
        {{ tab.label }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredPassports.length === 0" class="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
      <h3 class="text-lg font-medium text-gray-900">해당하는 여권이 없습니다</h3>
      <p class="mt-2 text-sm text-gray-500">현재 필터 조건에 맞는 배터리 여권이 존재하지 않습니다.</p>
    </div>

    <!-- Table -->
    <div v-else class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-200">
        <span class="text-sm text-gray-500">총 {{ filteredPassports.length }}건</span>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Passport ID</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Serial No.</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">상태</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">SOH</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">재활용가능</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">회수율</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">액션</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="p in filteredPassports" :key="p.passportId" class="hover:bg-gray-50 transition-colors">
              <td class="px-4 py-4 whitespace-nowrap text-sm font-mono text-primary-600">{{ p.passportId }}</td>
              <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">{{ p.serialNumber || '-' }}</td>
              <td class="px-4 py-4 whitespace-nowrap">
                <span :class="['inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', getStatusBadge(p.status)]">
                  {{ getStatusLabel(p.status) }}
                </span>
              </td>
              <td class="px-4 py-4 whitespace-nowrap text-right">
                <span :class="['text-sm font-bold', getSohColor(p.currentSoh)]">
                  {{ p.currentSoh != null ? p.currentSoh + '%' : '-' }}
                </span>
                <div v-if="p.currentSoh != null" class="mt-1 w-16 bg-gray-200 rounded-full h-1.5 ml-auto">
                  <div :class="['h-1.5 rounded-full', getSohBg(p.currentSoh)]"
                    :style="{ width: Math.min(p.currentSoh, 100) + '%' }"></div>
                </div>
              </td>
              <td class="px-4 py-4 whitespace-nowrap text-center">
                <span v-if="p.recycleAvailable === true"
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  가능
                </span>
                <span v-else-if="p.recycleAvailable === false"
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                  불가
                </span>
                <span v-else class="text-xs text-gray-400">미판정</span>
              </td>
              <td class="px-4 py-4">
                <div v-if="getRecyclingRateEntries(p.recyclingRates).length > 0" class="space-y-1.5 min-w-[140px]">
                  <div v-for="entry in getRecyclingRateEntries(p.recyclingRates)" :key="entry.key"
                    class="flex items-center space-x-2">
                    <span class="text-xs text-gray-600 w-12 text-right shrink-0">{{ entry.key }}</span>
                    <div class="flex-1 bg-gray-200 rounded-full h-2">
                      <div class="bg-primary-500 h-2 rounded-full transition-all"
                        :style="{ width: Math.min(entry.value, 100) + '%' }"></div>
                    </div>
                    <span class="text-xs font-medium text-gray-700 w-10 shrink-0">{{ entry.value }}%</span>
                  </div>
                </div>
                <span v-else class="text-xs text-gray-400">-</span>
              </td>
              <td class="px-4 py-4 whitespace-nowrap text-right">
                <div class="flex flex-col items-end gap-1">
                  <button v-if="canRequestAnalysis && p.status !== 'DISPOSED'"
                    @click="requestAnalysis(p)"
                    class="px-3 py-1 text-xs font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors">
                    분석 요청
                  </button>
                  <button v-if="canSubmitAnalysis && p.status !== 'DISPOSED'"
                    @click="openAnalysisResult(p)"
                    class="px-3 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors">
                    분석 결과 제출
                  </button>
                  <button v-if="canToggleRecycle && p.status !== 'DISPOSED'"
                    @click="openRecycleToggle(p)"
                    class="px-3 py-1 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors">
                    재활용 판정
                  </button>
                  <button v-if="canExtract && p.status !== 'DISPOSED'"
                    @click="openExtract(p)"
                    class="px-3 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors">
                    원자재 추출
                  </button>
                  <button v-if="canDispose && p.status !== 'DISPOSED'"
                    @click="openDispose(p)"
                    class="px-3 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
                    폐기 처리
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Analysis Result Modal -->
    <div v-if="showAnalysisResultModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen px-4">
        <div class="fixed inset-0 bg-black bg-opacity-50" @click="closeModals"></div>
        <div class="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-6 z-10">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-bold text-gray-900">분석 결과 제출</h3>
            <button @click="closeModals" class="text-gray-400 hover:text-gray-600">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="mb-4 p-3 bg-gray-50 rounded-lg">
            <p class="text-xs text-gray-500">대상 여권</p>
            <p class="text-sm font-mono font-medium text-gray-900">{{ selectedPassport?.passportId }}</p>
          </div>
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">SOH (%) *</label>
                <input v-model="analysisForm.soh" type="number" min="0" max="100" step="0.1" placeholder="0.0"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"/>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">SOCE (%) *</label>
                <input v-model="analysisForm.soce" type="number" min="0" max="100" step="0.1" placeholder="0.0"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"/>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">잔여 수명 사이클 *</label>
              <input v-model="analysisForm.remainingLifeCycle" type="number" min="0" step="1" placeholder="0"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"/>
            </div>
            <div>
              <label class="flex items-center cursor-pointer">
                <input type="checkbox" v-model="analysisForm.recycleAvailable" class="sr-only peer"/>
                <div class="relative w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                <span class="ml-2 text-sm font-medium text-gray-700">재활용 가능 판정</span>
              </label>
            </div>
          </div>
          <div class="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <button @click="closeModals"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              취소
            </button>
            <button @click="submitAnalysisResult"
              :disabled="!analysisForm.soh || !analysisForm.soce || !analysisForm.remainingLifeCycle"
              :class="['px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors',
                (!analysisForm.soh || !analysisForm.soce || !analysisForm.remainingLifeCycle) ? 'bg-gray-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700']">
              제출
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Recycle Toggle Modal -->
    <div v-if="showRecycleToggleModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen px-4">
        <div class="fixed inset-0 bg-black bg-opacity-50" @click="closeModals"></div>
        <div class="relative bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 z-10">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-bold text-gray-900">재활용 판정</h3>
            <button @click="closeModals" class="text-gray-400 hover:text-gray-600">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="mb-4 p-3 bg-gray-50 rounded-lg">
            <p class="text-xs text-gray-500">대상 여권</p>
            <p class="text-sm font-mono font-medium text-gray-900">{{ selectedPassport?.passportId }}</p>
          </div>
          <div class="flex items-center justify-center py-6">
            <label class="flex items-center cursor-pointer">
              <input type="checkbox" v-model="recycleToggleValue" class="sr-only peer"/>
              <div class="relative w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-600"></div>
              <span class="ml-3 text-base font-medium" :class="recycleToggleValue ? 'text-green-700' : 'text-gray-500'">
                {{ recycleToggleValue ? '재활용 가능' : '재활용 불가' }}
              </span>
            </label>
          </div>
          <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button @click="closeModals"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              취소
            </button>
            <button @click="submitRecycleToggle"
              class="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors">
              판정 저장
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Extract Modal -->
    <div v-if="showExtractModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen px-4">
        <div class="fixed inset-0 bg-black bg-opacity-50" @click="closeModals"></div>
        <div class="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-6 z-10">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-bold text-gray-900">원자재 추출 기록</h3>
            <button @click="closeModals" class="text-gray-400 hover:text-gray-600">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="mb-4 p-3 bg-gray-50 rounded-lg">
            <p class="text-xs text-gray-500">대상 여권</p>
            <p class="text-sm font-mono font-medium text-gray-900">{{ selectedPassport?.passportId }}</p>
          </div>
          <div class="space-y-3">
            <label class="block text-sm font-medium text-gray-700">회수율 (원자재별 %)</label>
            <div v-for="(entry, idx) in extractEntries" :key="idx" class="flex items-center space-x-2">
              <input v-model="entry.key" type="text" placeholder="원자재명"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"/>
              <input v-model="entry.value" type="number" min="0" max="100" step="0.1" placeholder="%"
                class="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"/>
              <button @click="removeExtractEntry(idx)" v-if="extractEntries.length > 1"
                class="text-red-400 hover:text-red-600 p-1">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <button @click="addExtractEntry"
              class="text-sm text-primary-600 hover:text-primary-700 font-medium">
              + 원자재 추가
            </button>
          </div>
          <div class="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <button @click="closeModals"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              취소
            </button>
            <button @click="submitExtract"
              class="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors">
              추출 기록
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Dispose Confirmation Modal -->
    <div v-if="showDisposeConfirm" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen px-4">
        <div class="fixed inset-0 bg-black bg-opacity-50" @click="closeModals"></div>
        <div class="relative bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 z-10">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold text-gray-900">폐기 처리 확인</h3>
            <button @click="closeModals" class="text-gray-400 hover:text-gray-600">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-700 font-medium">이 작업은 되돌릴 수 없습니다.</p>
            <p class="text-xs text-red-600 mt-1">
              여권 <span class="font-mono font-bold">{{ selectedPassport?.passportId }}</span>을(를) 폐기 처리하시겠습니까?
            </p>
          </div>
          <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button @click="closeModals"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              취소
            </button>
            <button @click="submitDispose"
              class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
              폐기 확인
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  `,
});
