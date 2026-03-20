app.component('passport-detail-page', {
  props: ['auth', 'api'],
  emits: ['navigate'],
  setup(props, { emit }) {
    const { ref, computed, onMounted } = Vue;

    const passport = ref(null);
    const loading = ref(true);
    const activeTab = ref('overview');
    const passportId = ref('');

    // BMU data
    const bmuRecords = ref([]);
    const bmuLoading = ref(false);

    // History
    const history = ref([]);
    const historyLoading = ref(false);

    // Modal toggles
    const showBindModal = ref(false);
    const showMaintenanceLogModal = ref(false);
    const showAccidentLogModal = ref(false);
    const showMaintenanceRequestModal = ref(false);
    const showAnalysisRequestModal = ref(false);
    const showAnalysisResultModal = ref(false);
    const showRecycleModal = ref(false);
    const showExtractModal = ref(false);
    const submitting = ref(false);

    // SOC/Temperature raw value scaler (legacy data stored as uint16 raw)
    function scaleSOC(val) {
      if (val == null) return null;
      return val > 100 ? +(val / 655.35).toFixed(1) : +val.toFixed(1);
    }
    function scaleTemp(val) {
      if (val == null) return null;
      return val > 100 ? +(val / 1310.7).toFixed(1) : val;
    }

    // VIN Bind form
    const bindForm = ref({ vin: '', installDate: '', evManufacturer: '', evAssemblyCountry: '' });

    // Maintenance log form
    const maintenanceForm = ref({ date: '', type: '', description: '', technician: '' });

    // Accident log form
    const accidentForm = ref({ date: '', type: '', description: '', reporter: '' });

    // Analysis result form
    const analysisForm = ref({ soh: '', soce: '', remainingLifeCycle: '', recycleAvailable: false });

    // Extract materials form
    const extractForm = ref({ recyclingRatesJson: '{\n  "cobalt": 95,\n  "nickel": 90,\n  "lithium": 80,\n  "manganese": 85\n}' });

    const msp = computed(() => props.auth.orgMsp);
    const isEV = computed(() => msp.value === 'EVManufacturerMSP');
    const isService = computed(() => msp.value === 'ServiceMSP');
    const isRegulator = computed(() => msp.value === 'RegulatorMSP');
    const isManufacturer = computed(() => msp.value === 'ManufacturerMSP');

    const statusColors = {
      MANUFACTURED: 'bg-blue-100 text-blue-800',
      ACTIVE: 'bg-green-100 text-green-800',
      MAINTENANCE: 'bg-yellow-100 text-yellow-800',
      ANALYSIS: 'bg-purple-100 text-purple-800',
      RECYCLING: 'bg-orange-100 text-orange-800',
      DISPOSED: 'bg-gray-100 text-gray-800',
    };

    function getStatusColor(status) {
      return statusColors[status] || 'bg-gray-100 text-gray-800';
    }

    onMounted(() => {
      // Get passportId from parent pageProps
      const urlParams = new URLSearchParams(window.location.search);
      passportId.value = urlParams.get('passportId') || '';

      // Try to get from parent component's data attribute or a global
      if (!passportId.value) {
        // The navigate function passes props; we look at the component element's dataset or a global store
        // In this architecture, pageProps are not directly passed; we use a workaround
        const el = document.querySelector('[data-passport-id]');
        if (el) passportId.value = el.dataset.passportId;
      }

      // Fallback: check if window has passportId set (from navigate)
      if (!passportId.value && window.__pageProps && window.__pageProps.passportId) {
        passportId.value = window.__pageProps.passportId;
      }

      fetchPassport();
    });

    async function fetchPassport() {
      if (!passportId.value) {
        // If no passportId, try to get it from a prompt or go back
        loading.value = false;
        return;
      }
      loading.value = true;
      try {
        passport.value = await props.api.get('/passports/' + passportId.value);
      } catch (e) {
        window.$toast('error', '여권 정보를 불러오지 못했습니다: ' + e.message);
      } finally {
        loading.value = false;
      }
    }

    async function fetchBmuData() {
      if (bmuRecords.value.length > 0) return;
      bmuLoading.value = true;
      try {
        const data = await props.api.get('/bmu/records/' + passportId.value);
        bmuRecords.value = (data.records || data || []).slice(0, 20);
      } catch (e) {
        bmuRecords.value = [];
      } finally {
        bmuLoading.value = false;
      }
    }

    async function fetchHistory() {
      if (history.value.length > 0) return;
      historyLoading.value = true;
      try {
        const data = await props.api.get('/passports/' + passportId.value + '/history');
        history.value = data.records || data || [];
      } catch (e) {
        history.value = [];
      } finally {
        historyLoading.value = false;
      }
    }

    function switchTab(tab) {
      activeTab.value = tab;
      if (tab === 'bmu') fetchBmuData();
      if (tab === 'history') fetchHistory();
    }

    // Actions
    async function submitBind() {
      submitting.value = true;
      try {
        await props.api.put('/passports/' + passportId.value + '/bind', bindForm.value);
        window.$toast('success', 'VIN 바인딩이 완료되었습니다.');
        showBindModal.value = false;
        await fetchPassport();
      } catch (e) {
        window.$toast('error', 'VIN 바인딩 실패: ' + e.message);
      } finally {
        submitting.value = false;
      }
    }

    async function submitMaintenanceRequest() {
      submitting.value = true;
      try {
        await props.api.put('/passports/' + passportId.value + '/request-maintenance', {});
        window.$toast('success', '정비 요청이 접수되었습니다.');
        showMaintenanceRequestModal.value = false;
        await fetchPassport();
      } catch (e) {
        window.$toast('error', '정비 요청 실패: ' + e.message);
      } finally {
        submitting.value = false;
      }
    }

    async function submitMaintenanceLog() {
      submitting.value = true;
      try {
        await props.api.put('/passports/' + passportId.value + '/maintenance-log', maintenanceForm.value);
        window.$toast('success', '정비 기록이 추가되었습니다.');
        showMaintenanceLogModal.value = false;
        maintenanceForm.value = { date: '', type: '', description: '', technician: '' };
        await fetchPassport();
      } catch (e) {
        window.$toast('error', '정비 기록 추가 실패: ' + e.message);
      } finally {
        submitting.value = false;
      }
    }

    async function submitAccidentLog() {
      submitting.value = true;
      try {
        await props.api.put('/passports/' + passportId.value + '/accident-log', accidentForm.value);
        window.$toast('success', '사고 기록이 추가되었습니다.');
        showAccidentLogModal.value = false;
        accidentForm.value = { date: '', type: '', description: '', reporter: '' };
        await fetchPassport();
      } catch (e) {
        window.$toast('error', '사고 기록 추가 실패: ' + e.message);
      } finally {
        submitting.value = false;
      }
    }

    async function submitAnalysisRequest() {
      submitting.value = true;
      try {
        await props.api.put('/passports/' + passportId.value + '/request-analysis', {});
        window.$toast('success', '분석 요청이 접수되었습니다.');
        showAnalysisRequestModal.value = false;
        await fetchPassport();
      } catch (e) {
        window.$toast('error', '분석 요청 실패: ' + e.message);
      } finally {
        submitting.value = false;
      }
    }

    async function submitAnalysisResult() {
      submitting.value = true;
      try {
        const body = {
          soh: Number(analysisForm.value.soh),
          soce: Number(analysisForm.value.soce),
          remainingLifeCycle: Number(analysisForm.value.remainingLifeCycle),
          recycleAvailable: analysisForm.value.recycleAvailable,
        };
        await props.api.put('/passports/' + passportId.value + '/analysis-result', body);
        window.$toast('success', '분석 결과가 제출되었습니다.');
        showAnalysisResultModal.value = false;
        analysisForm.value = { soh: '', soce: '', remainingLifeCycle: '', recycleAvailable: false };
        await fetchPassport();
      } catch (e) {
        window.$toast('error', '분석 결과 제출 실패: ' + e.message);
      } finally {
        submitting.value = false;
      }
    }

    async function submitRecycleAvailability(available) {
      submitting.value = true;
      try {
        await props.api.put('/passports/' + passportId.value + '/recycle-availability', { recycleAvailable: available });
        window.$toast('success', '재활용 판정이 완료되었습니다.');
        showRecycleModal.value = false;
        await fetchPassport();
      } catch (e) {
        window.$toast('error', '재활용 판정 실패: ' + e.message);
      } finally {
        submitting.value = false;
      }
    }

    async function submitExtractMaterials() {
      submitting.value = true;
      try {
        const rates = JSON.parse(extractForm.value.recyclingRatesJson);
        await props.api.put('/passports/' + passportId.value + '/extract-materials', { recyclingRates: rates });
        window.$toast('success', '원자재 추출 정보가 등록되었습니다.');
        showExtractModal.value = false;
        await fetchPassport();
      } catch (e) {
        window.$toast('error', (e instanceof SyntaxError ? 'JSON 형식이 올바르지 않습니다.' : '원자재 추출 실패: ' + e.message));
      } finally {
        submitting.value = false;
      }
    }

    async function disposeBattery() {
      if (!confirm('정말로 이 배터리를 폐기 처리하시겠습니까?')) return;
      submitting.value = true;
      try {
        await props.api.put('/passports/' + passportId.value + '/dispose', {});
        window.$toast('success', '배터리가 폐기 처리되었습니다.');
        await fetchPassport();
      } catch (e) {
        window.$toast('error', '폐기 처리 실패: ' + e.message);
      } finally {
        submitting.value = false;
      }
    }

    function goBack() {
      emit('navigate', 'passports');
    }

    // Expose passportId setter for parent to inject
    function setPassportId(id) {
      passportId.value = id;
      fetchPassport();
    }

    const tabs = [
      { key: 'overview', label: '개요' },
      { key: 'bmu', label: 'BMU데이터' },
      { key: 'maintenance', label: '정비이력' },
      { key: 'recycling', label: '재활용' },
      { key: 'history', label: '변경이력' },
    ];

    const overviewSections = computed(() => {
      const p = passport.value;
      if (!p) return [];
      return [
        {
          title: '배터리 식별정보',
          fields: [
            { label: '여권 ID', value: p.passportId },
            { label: '배터리 ID', value: p.batteryId },
            { label: 'DID', value: p.did },
            { label: '시리얼번호', value: p.serialNumber },
            { label: '모델', value: p.model },
          ]
        },
        {
          title: '제조정보',
          fields: [
            { label: '제조사', value: p.manufacturerName },
            { label: '제조국가', value: p.manufactureCountry },
            { label: '셀 제조사', value: p.cellManufacturer },
            { label: '셀 제조국가', value: p.cellManufactureCountry },
            { label: '제조일자', value: p.manufactureDate },
            { label: '셀 유형', value: p.cellType },
            { label: '화학물질', value: p.chemistry },
          ]
        },
        {
          title: '기술 스펙',
          fields: [
            { label: '셀 수', value: p.cellCount },
            { label: '무게 (kg)', value: p.weight },
            { label: '총 에너지 (kWh)', value: p.totalEnergy },
            { label: '에너지 밀도 (Wh/kg)', value: p.energyDensity },
            { label: '정격 용량 (Ah)', value: p.ratedCapacity },
            { label: '예상 수명 (년)', value: p.expectedLifespan },
            { label: '전압 범위', value: p.voltageRange },
            { label: '온도 범위', value: p.temperatureRange },
          ]
        },
        {
          title: 'EV 바인딩',
          fields: [
            { label: 'VIN', value: p.vin },
            { label: '장착일자', value: p.installDate },
            { label: 'EV 제조사', value: p.evManufacturer },
            { label: 'EV 조립국가', value: p.evAssemblyCountry },
          ]
        },
        {
          title: '실시간 상태',
          fields: [
            { label: '상태', value: p.status, badge: true },
            { label: '현재 SOC', value: p.currentSoc != null ? scaleSOC(p.currentSoc) + '%' : '-', progress: true, pval: scaleSOC(p.currentSoc) },
            { label: '현재 SOH', value: p.currentSoh != null ? p.currentSoh + '%' : '-', progress: true, pval: p.currentSoh },
            { label: '재활용 가능', value: p.recycleAvailable ? '예' : '아니오' },
          ]
        },
      ];
    });

    const maintenanceLogs = computed(() => {
      if (!passport.value) return [];
      return passport.value.maintenanceLogs || [];
    });

    const accidentLogs = computed(() => {
      if (!passport.value) return [];
      return passport.value.accidentLogs || [];
    });

    return {
      passport, loading, activeTab, passportId, tabs,
      bmuRecords, bmuLoading, history, historyLoading,
      showBindModal, showMaintenanceLogModal, showAccidentLogModal,
      showMaintenanceRequestModal, showAnalysisRequestModal,
      showAnalysisResultModal, showRecycleModal, showExtractModal,
      submitting, bindForm, maintenanceForm, accidentForm, analysisForm, extractForm,
      msp, isEV, isService, isRegulator, isManufacturer,
      overviewSections, maintenanceLogs, accidentLogs,
      getStatusColor, switchTab, goBack, setPassportId,
      submitBind, submitMaintenanceRequest, submitMaintenanceLog, submitAccidentLog,
      submitAnalysisRequest, submitAnalysisResult, submitRecycleAvailability,
      submitExtractMaterials, disposeBattery,
    };
  },
  template: `
    <div>
      <!-- Header -->
      <div class="flex items-center gap-4 mb-6">
        <button @click="goBack"
          class="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          ← 목록으로
        </button>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">배터리 여권 상세</h1>
          <p v-if="passport" class="text-gray-500 text-sm mt-0.5 font-mono">{{ passport.passportId }}</p>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-20">
        <svg class="animate-spin h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
      </div>

      <!-- No passport ID -->
      <div v-else-if="!passport" class="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <p class="text-gray-400 text-lg">여권 정보를 찾을 수 없습니다.</p>
        <button @click="goBack" class="mt-4 text-primary-600 hover:text-primary-700 font-medium">목록으로 돌아가기</button>
      </div>

      <div v-else>
        <!-- Tab Navigation -->
        <div class="border-b border-gray-200 mb-6">
          <div class="flex space-x-0 overflow-x-auto">
            <button v-for="tab in tabs" :key="tab.key"
              @click="switchTab(tab.key)"
              :class="['px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300']">
              {{ tab.label }}
            </button>
          </div>
        </div>

        <!-- ========== Overview Tab ========== -->
        <div v-if="activeTab === 'overview'">
          <!-- Status + SOC/SOH Banner -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div class="flex flex-col sm:flex-row sm:items-center gap-6">
              <div>
                <span class="text-sm text-gray-500">상태</span>
                <div class="mt-1">
                  <span :class="['inline-block px-3 py-1 rounded-full text-sm font-semibold', getStatusColor(passport.status)]">
                    {{ passport.status }}
                  </span>
                </div>
              </div>
              <div class="flex-1 space-y-3">
                <div>
                  <div class="flex justify-between text-sm mb-1">
                    <span class="text-gray-500">SOC</span>
                    <span class="font-semibold text-gray-700">{{ passport.currentSoc != null ? scaleSOC(passport.currentSoc) + '%' : '-' }}</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2.5">
                    <div class="bg-green-500 h-2.5 rounded-full transition-all"
                      :style="{ width: Math.min(scaleSOC(passport.currentSoc) || 0, 100) + '%' }"></div>
                  </div>
                </div>
                <div>
                  <div class="flex justify-between text-sm mb-1">
                    <span class="text-gray-500">SOH</span>
                    <span class="font-semibold text-gray-700">{{ passport.currentSoh != null ? passport.currentSoh + '%' : '-' }}</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2.5">
                    <div class="bg-blue-500 h-2.5 rounded-full transition-all"
                      :style="{ width: (passport.currentSoh || 0) + '%' }"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Section cards -->
          <div class="space-y-6">
            <div v-for="section in overviewSections" :key="section.title"
              class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div class="bg-gray-50 border-b border-gray-200 px-6 py-3">
                <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wider">{{ section.title }}</h3>
              </div>
              <div class="p-6">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  <div v-for="field in section.fields" :key="field.label">
                    <dt class="text-xs font-medium text-gray-500 uppercase">{{ field.label }}</dt>
                    <dd class="mt-1">
                      <span v-if="field.badge" :class="['inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold', getStatusColor(field.value)]">
                        {{ field.value || '-' }}
                      </span>
                      <span v-else class="text-sm text-gray-900">{{ field.value || '-' }}</span>
                    </dd>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- VIN Bind Button -->
          <div v-if="isEV && !passport.vin" class="mt-6">
            <button @click="showBindModal = true"
              class="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm rounded-lg transition-colors">
              VIN 바인딩
            </button>
          </div>
        </div>

        <!-- ========== BMU Tab ========== -->
        <div v-if="activeTab === 'bmu'">
          <div v-if="bmuLoading" class="flex justify-center py-12">
            <svg class="animate-spin h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          </div>
          <div v-else-if="bmuRecords.length === 0" class="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <p class="text-gray-400">BMU 데이터가 없습니다.</p>
          </div>
          <div v-else class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th class="text-left px-4 py-3 font-semibold text-gray-600">Record ID</th>
                    <th class="text-left px-4 py-3 font-semibold text-gray-600">Timestamp</th>
                    <th class="text-left px-4 py-3 font-semibold text-gray-600">SOC</th>
                    <th class="text-left px-4 py-3 font-semibold text-gray-600">Voltage</th>
                    <th class="text-left px-4 py-3 font-semibold text-gray-600">Current</th>
                    <th class="text-left px-4 py-3 font-semibold text-gray-600">Temp</th>
                    <th class="text-left px-4 py-3 font-semibold text-gray-600">Cycles</th>
                    <th class="text-left px-4 py-3 font-semibold text-gray-600">Flags</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="r in bmuRecords" :key="r.recordId" class="hover:bg-gray-50">
                    <td class="px-4 py-3 font-mono text-xs text-gray-600">{{ r.recordId }}</td>
                    <td class="px-4 py-3 text-gray-700 text-xs">{{ r.timestamp }}</td>
                    <td class="px-4 py-3 text-gray-900 font-medium">{{ r.soc != null ? r.soc + '%' : '-' }}</td>
                    <td class="px-4 py-3 text-gray-700">{{ r.voltage != null ? r.voltage + 'V' : '-' }}</td>
                    <td class="px-4 py-3 text-gray-700">{{ r.current != null ? r.current + 'A' : '-' }}</td>
                    <td class="px-4 py-3 text-gray-700">{{ r.temperature != null ? r.temperature + 'C' : '-' }}</td>
                    <td class="px-4 py-3 text-gray-700">{{ r.dischargeCycles != null ? r.dischargeCycles : '-' }}</td>
                    <td class="px-4 py-3 text-gray-500 text-xs">{{ r.statusFlags || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="border-t border-gray-200 px-4 py-3 text-sm text-gray-500">
              최근 {{ bmuRecords.length }}건 표시
            </div>
          </div>
        </div>

        <!-- ========== Maintenance Tab ========== -->
        <div v-if="activeTab === 'maintenance'">
          <!-- Action Buttons -->
          <div class="flex flex-wrap gap-3 mb-6">
            <button v-if="isEV && passport.status === 'ACTIVE'"
              @click="showMaintenanceRequestModal = true"
              class="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-medium text-sm rounded-lg transition-colors">
              정비 요청
            </button>
            <button v-if="isService"
              @click="showMaintenanceLogModal = true"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg transition-colors">
              정비 기록 추가
            </button>
            <button v-if="isEV || isService"
              @click="showAccidentLogModal = true"
              class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium text-sm rounded-lg transition-colors">
              사고 기록 추가
            </button>
          </div>

          <!-- Maintenance Logs -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div class="bg-gray-50 border-b border-gray-200 px-6 py-3">
              <h3 class="text-sm font-semibold text-gray-700">정비 이력</h3>
            </div>
            <div v-if="maintenanceLogs.length === 0" class="p-8 text-center text-gray-400">정비 이력이 없습니다.</div>
            <div v-else class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th class="text-left px-4 py-3 font-semibold text-gray-600">날짜</th>
                    <th class="text-left px-4 py-3 font-semibold text-gray-600">유형</th>
                    <th class="text-left px-4 py-3 font-semibold text-gray-600">내용</th>
                    <th class="text-left px-4 py-3 font-semibold text-gray-600">기술자</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="(log, i) in maintenanceLogs" :key="i" class="hover:bg-gray-50">
                    <td class="px-4 py-3 text-gray-700">{{ log.date || '-' }}</td>
                    <td class="px-4 py-3 text-gray-700">{{ log.type || '-' }}</td>
                    <td class="px-4 py-3 text-gray-700">{{ log.description || '-' }}</td>
                    <td class="px-4 py-3 text-gray-700">{{ log.technician || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Accident Logs -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div class="bg-gray-50 border-b border-gray-200 px-6 py-3">
              <h3 class="text-sm font-semibold text-gray-700">사고 이력</h3>
            </div>
            <div v-if="accidentLogs.length === 0" class="p-8 text-center text-gray-400">사고 이력이 없습니다.</div>
            <div v-else class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th class="text-left px-4 py-3 font-semibold text-gray-600">날짜</th>
                    <th class="text-left px-4 py-3 font-semibold text-gray-600">유형</th>
                    <th class="text-left px-4 py-3 font-semibold text-gray-600">내용</th>
                    <th class="text-left px-4 py-3 font-semibold text-gray-600">보고자</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="(log, i) in accidentLogs" :key="i" class="hover:bg-gray-50">
                    <td class="px-4 py-3 text-gray-700">{{ log.date || '-' }}</td>
                    <td class="px-4 py-3 text-gray-700">{{ log.type || '-' }}</td>
                    <td class="px-4 py-3 text-gray-700">{{ log.description || '-' }}</td>
                    <td class="px-4 py-3 text-gray-700">{{ log.reporter || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ========== Recycling Tab ========== -->
        <div v-if="activeTab === 'recycling'">
          <!-- Current Info -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 class="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">재활용 정보</h3>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <dt class="text-xs font-medium text-gray-500">재활용 가능 여부</dt>
                <dd class="mt-1">
                  <span :class="['inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold',
                    passport.recycleAvailable ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600']">
                    {{ passport.recycleAvailable ? '가능' : '불가 / 미판정' }}
                  </span>
                </dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-gray-500">상태</dt>
                <dd class="mt-1">
                  <span :class="['inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold', getStatusColor(passport.status)]">
                    {{ passport.status }}
                  </span>
                </dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-gray-500">재활용 비율</dt>
                <dd class="mt-1 text-sm text-gray-900">
                  <span v-if="passport.recyclingRates && Object.keys(passport.recyclingRates).length > 0">
                    <span v-for="(val, key) in passport.recyclingRates" :key="key" class="inline-block mr-3">
                      <span class="font-medium">{{ key }}:</span> {{ val }}%
                    </span>
                  </span>
                  <span v-else class="text-gray-400">-</span>
                </dd>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-wrap gap-3">
            <button v-if="isEV"
              @click="showAnalysisRequestModal = true"
              class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm rounded-lg transition-colors">
              분석 요청
            </button>
            <button v-if="isService"
              @click="showAnalysisResultModal = true"
              class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg transition-colors">
              분석 결과 제출
            </button>
            <button v-if="isService || isRegulator"
              @click="showRecycleModal = true"
              class="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium text-sm rounded-lg transition-colors">
              재활용 판정
            </button>
            <button v-if="isRegulator"
              @click="showExtractModal = true"
              class="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm rounded-lg transition-colors">
              원자재 추출
            </button>
            <button v-if="isRegulator"
              @click="disposeBattery"
              :disabled="submitting"
              class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium text-sm rounded-lg transition-colors disabled:opacity-50">
              폐기 처리
            </button>
          </div>
        </div>

        <!-- ========== History Tab ========== -->
        <div v-if="activeTab === 'history'">
          <div v-if="historyLoading" class="flex justify-center py-12">
            <svg class="animate-spin h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          </div>
          <div v-else-if="history.length === 0" class="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <p class="text-gray-400">변경 이력이 없습니다.</p>
          </div>
          <div v-else class="relative">
            <!-- Timeline -->
            <div class="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
            <div class="space-y-4">
              <div v-for="(entry, i) in history" :key="i" class="relative pl-12">
                <div class="absolute left-2.5 top-4 w-3 h-3 rounded-full bg-primary-500 border-2 border-white shadow"></div>
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div class="flex items-start justify-between">
                    <div>
                      <p class="text-sm font-medium text-gray-900">{{ entry.txId ? 'TX: ' + entry.txId.substring(0, 16) + '...' : 'Change #' + (i + 1) }}</p>
                      <p class="text-xs text-gray-500 mt-0.5">{{ entry.timestamp || '-' }}</p>
                    </div>
                    <span v-if="entry.value && entry.value.status"
                      :class="['inline-block px-2 py-0.5 rounded-full text-xs font-semibold', getStatusColor(entry.value.status)]">
                      {{ entry.value.status }}
                    </span>
                  </div>
                  <div v-if="entry.value" class="mt-2 text-xs text-gray-600">
                    <span v-if="entry.value.manufacturerName" class="mr-3">제조사: {{ entry.value.manufacturerName }}</span>
                    <span v-if="entry.value.vin" class="mr-3">VIN: {{ entry.value.vin }}</span>
                    <span v-if="entry.value.currentSoh != null" class="mr-3">SOH: {{ entry.value.currentSoh }}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ========== MODALS ========== -->

      <!-- VIN Bind Modal -->
      <div v-if="showBindModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="showBindModal = false"></div>
        <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
          <h2 class="text-lg font-bold text-gray-900 mb-4">VIN 바인딩</h2>
          <form @submit.prevent="submitBind" class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">VIN</label>
              <input v-model="bindForm.vin" type="text" placeholder="차량 식별번호"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">장착일자</label>
              <input v-model="bindForm.installDate" type="date"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">EV 제조사</label>
              <input v-model="bindForm.evManufacturer" type="text" placeholder="EV 제조사명"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">EV 조립국가</label>
              <input v-model="bindForm.evAssemblyCountry" type="text" placeholder="KR"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
            </div>
            <div class="flex justify-end gap-3 pt-2">
              <button type="button" @click="showBindModal = false"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">취소</button>
              <button type="submit" :disabled="submitting"
                class="px-5 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50">
                {{ submitting ? '처리중...' : '바인딩' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Maintenance Request Modal -->
      <div v-if="showMaintenanceRequestModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="showMaintenanceRequestModal = false"></div>
        <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
          <h2 class="text-lg font-bold text-gray-900 mb-4">정비 요청</h2>
          <p class="text-sm text-gray-600 mb-4">이 배터리에 대한 정비를 요청하시겠습니까? 상태가 MAINTENANCE로 변경됩니다.</p>
          <div class="flex justify-end gap-3">
            <button @click="showMaintenanceRequestModal = false"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">취소</button>
            <button @click="submitMaintenanceRequest" :disabled="submitting"
              class="px-5 py-2 text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600 rounded-lg disabled:opacity-50">
              {{ submitting ? '처리중...' : '정비 요청' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Maintenance Log Modal -->
      <div v-if="showMaintenanceLogModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="showMaintenanceLogModal = false"></div>
        <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
          <h2 class="text-lg font-bold text-gray-900 mb-4">정비 기록 추가</h2>
          <form @submit.prevent="submitMaintenanceLog" class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">날짜</label>
              <input v-model="maintenanceForm.date" type="date"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">유형</label>
              <input v-model="maintenanceForm.type" type="text" placeholder="정기점검 / 부품교체 / 긴급수리"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">내용</label>
              <textarea v-model="maintenanceForm.description" rows="3" placeholder="정비 내용을 상세히 기입하세요"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"></textarea>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">기술자</label>
              <input v-model="maintenanceForm.technician" type="text" placeholder="기술자명"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
            </div>
            <div class="flex justify-end gap-3 pt-2">
              <button type="button" @click="showMaintenanceLogModal = false"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">취소</button>
              <button type="submit" :disabled="submitting"
                class="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50">
                {{ submitting ? '처리중...' : '추가' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Accident Log Modal -->
      <div v-if="showAccidentLogModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="showAccidentLogModal = false"></div>
        <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
          <h2 class="text-lg font-bold text-gray-900 mb-4">사고 기록 추가</h2>
          <form @submit.prevent="submitAccidentLog" class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">날짜</label>
              <input v-model="accidentForm.date" type="date"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">유형</label>
              <input v-model="accidentForm.type" type="text" placeholder="충돌 / 화재 / 침수"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">내용</label>
              <textarea v-model="accidentForm.description" rows="3" placeholder="사고 상세 내용"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"></textarea>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">보고자</label>
              <input v-model="accidentForm.reporter" type="text" placeholder="보고자명"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
            </div>
            <div class="flex justify-end gap-3 pt-2">
              <button type="button" @click="showAccidentLogModal = false"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">취소</button>
              <button type="submit" :disabled="submitting"
                class="px-5 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg disabled:opacity-50">
                {{ submitting ? '처리중...' : '추가' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Analysis Request Modal -->
      <div v-if="showAnalysisRequestModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="showAnalysisRequestModal = false"></div>
        <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
          <h2 class="text-lg font-bold text-gray-900 mb-4">분석 요청</h2>
          <p class="text-sm text-gray-600 mb-4">이 배터리에 대한 분석을 요청하시겠습니까? 상태가 ANALYSIS로 변경됩니다.</p>
          <div class="flex justify-end gap-3">
            <button @click="showAnalysisRequestModal = false"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">취소</button>
            <button @click="submitAnalysisRequest" :disabled="submitting"
              class="px-5 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50">
              {{ submitting ? '처리중...' : '분석 요청' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Analysis Result Modal -->
      <div v-if="showAnalysisResultModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="showAnalysisResultModal = false"></div>
        <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
          <h2 class="text-lg font-bold text-gray-900 mb-4">분석 결과 제출</h2>
          <form @submit.prevent="submitAnalysisResult" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">SOH (%)</label>
                <input v-model="analysisForm.soh" type="number" step="0.1" placeholder="85"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">SOCE (%)</label>
                <input v-model="analysisForm.soce" type="number" step="0.1" placeholder="90"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">잔여 수명 주기</label>
              <input v-model="analysisForm.remainingLifeCycle" type="number" placeholder="1500"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
            </div>
            <div class="flex items-center gap-2">
              <input v-model="analysisForm.recycleAvailable" type="checkbox" id="recycleCheck"
                class="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
              <label for="recycleCheck" class="text-sm text-gray-700">재활용 가능</label>
            </div>
            <div class="flex justify-end gap-3 pt-2">
              <button type="button" @click="showAnalysisResultModal = false"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">취소</button>
              <button type="submit" :disabled="submitting"
                class="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50">
                {{ submitting ? '처리중...' : '제출' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Recycle Availability Modal -->
      <div v-if="showRecycleModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="showRecycleModal = false"></div>
        <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
          <h2 class="text-lg font-bold text-gray-900 mb-4">재활용 판정</h2>
          <p class="text-sm text-gray-600 mb-4">이 배터리의 재활용 가능 여부를 판정합니다.</p>
          <div class="flex justify-end gap-3">
            <button @click="showRecycleModal = false"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">취소</button>
            <button @click="submitRecycleAvailability(false)" :disabled="submitting"
              class="px-5 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg disabled:opacity-50">
              재활용 불가
            </button>
            <button @click="submitRecycleAvailability(true)" :disabled="submitting"
              class="px-5 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50">
              재활용 가능
            </button>
          </div>
        </div>
      </div>

      <!-- Extract Materials Modal -->
      <div v-if="showExtractModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="showExtractModal = false"></div>
        <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
          <h2 class="text-lg font-bold text-gray-900 mb-4">원자재 추출</h2>
          <form @submit.prevent="submitExtractMaterials" class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">재활용 비율 (JSON)</label>
              <textarea v-model="extractForm.recyclingRatesJson" rows="6"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm font-mono"></textarea>
              <p class="text-xs text-gray-400 mt-1">예: { "cobalt": 95, "nickel": 90, "lithium": 80 }</p>
            </div>
            <div class="flex justify-end gap-3 pt-2">
              <button type="button" @click="showExtractModal = false"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">취소</button>
              <button type="submit" :disabled="submitting"
                class="px-5 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50">
                {{ submitting ? '처리중...' : '등록' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
});
