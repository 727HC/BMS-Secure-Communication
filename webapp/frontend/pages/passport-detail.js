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
    const showDisposeConfirm = ref(false);
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

    const statusConfig = {
      MANUFACTURED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500', label: '제조완료', ring: 'ring-blue-500/20' },
      ACTIVE:       { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', label: '운행중', ring: 'ring-emerald-500/20' },
      MAINTENANCE:  { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', label: '정비중', ring: 'ring-amber-500/20' },
      ANALYSIS:     { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500', label: '분석중', ring: 'ring-purple-500/20' },
      RECYCLING:    { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500', label: '재활용', ring: 'ring-orange-500/20' },
      DISPOSED:     { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-300', dot: 'bg-gray-400', label: '폐기', ring: 'ring-gray-400/20' },
    };

    function getStatusBadge(status) {
      return statusConfig[status] || statusConfig.DISPOSED;
    }

    function getSocColor(soc) {
      if (soc == null) return 'bg-gray-300';
      if (soc >= 60) return 'bg-emerald-500';
      if (soc >= 30) return 'bg-amber-500';
      return 'bg-red-500';
    }

    function getSohColor(soh) {
      if (soh == null) return 'bg-gray-300';
      if (soh >= 80) return 'bg-blue-500';
      if (soh >= 50) return 'bg-amber-500';
      return 'bg-red-500';
    }

    function decodeStatusFlags(flags) {
      const num = typeof flags === 'number' ? flags : parseInt(flags, 10);
      if (isNaN(num)) return [];
      const badges = [];
      if (num & 0x01) badges.push({ label: '충전중', color: 'bg-blue-100 text-blue-700 border-blue-200' });
      if (num & 0x02) badges.push({ label: '밸런싱', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' });
      if (num & 0x04) badges.push({ label: '결함', color: 'bg-red-100 text-red-700 border-red-200' });
      return badges;
    }

    onMounted(() => {
      // Inject keyframe animation styles for visual enhancements
      if (!document.getElementById('passport-detail-animations')) {
        const style = document.createElement('style');
        style.id = 'passport-detail-animations';
        style.textContent = `
          @keyframes sohBadgeFadeIn {
            0% { opacity: 0; transform: scale(0.7); }
            60% { transform: scale(1.1); }
            100% { opacity: 1; transform: scale(1); }
          }
        `;
        document.head.appendChild(style);
      }

      const urlParams = new URLSearchParams(window.location.search);
      passportId.value = urlParams.get('passportId') || '';

      if (!passportId.value) {
        const el = document.querySelector('[data-passport-id]');
        if (el) passportId.value = el.dataset.passportId;
      }

      if (!passportId.value && window.__pageProps && window.__pageProps.passportId) {
        passportId.value = window.__pageProps.passportId;
      }

      fetchPassport();
    });

    async function fetchPassport() {
      if (!passportId.value) {
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
        const raw = data.records || data || [];
        // Parse JSON strings + detect meaningful changes
        const all = raw.map((entry, i) => {
          let parsed = entry;
          if (typeof entry === 'string') {
            try { parsed = JSON.parse(entry); } catch (e) { parsed = {}; }
          }
          return { value: parsed, index: i + 1 };
        });
        // Filter: keep only entries with status change, VIN change, maintenance, or first/last
        const filtered = [];
        let prevStatus = null, prevVin = null, prevMaintCount = 0;
        all.forEach((entry, i) => {
          const v = entry.value;
          const status = v.status || '';
          const vin = v.vin || '';
          const maintCount = (v.maintenanceLogs || []).length;
          const accidentCount = (v.accidentLogs || []).length;
          const isFirst = i === 0;
          const isLast = i === all.length - 1;
          const statusChanged = status !== prevStatus;
          const vinChanged = vin && vin !== prevVin;
          const maintChanged = maintCount > prevMaintCount;
          if (isFirst || isLast || statusChanged || vinChanged || maintChanged) {
            let changeDesc = '';
            if (isFirst) changeDesc = '여권 생성';
            else if (statusChanged && prevStatus) changeDesc = prevStatus + ' → ' + status;
            else if (vinChanged) changeDesc = 'VIN 바인딩: ' + vin;
            else if (maintChanged) changeDesc = '정비 기록 추가 (#' + maintCount + ')';
            else if (isLast) changeDesc = '최신 상태';
            filtered.push({
              value: v,
              timestamp: v.updatedAt || v.createdAt || '-',
              changeDesc,
              index: entry.index,
              blockNumber: entry.index,
            });
          }
          prevStatus = status;
          prevVin = vin;
          prevMaintCount = maintCount;
        });
        history.value = filtered;
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
      submitting.value = true;
      try {
        await props.api.put('/passports/' + passportId.value + '/dispose', {});
        window.$toast('success', '배터리가 폐기 처리되었습니다.');
        showDisposeConfirm.value = false;
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

    function setPassportId(id) {
      passportId.value = id;
      fetchPassport();
    }

    const tabs = [
      { key: 'overview', label: '개요', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
      { key: 'bmu', label: 'BMU 데이터', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
      { key: 'maintenance', label: '정비이력', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
      { key: 'recycling', label: '재활용', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
      { key: 'history', label: '변경이력', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    ];

    const maintenanceLogs = computed(() => {
      if (!passport.value) return [];
      return passport.value.maintenanceLogs || [];
    });

    const accidentLogs = computed(() => {
      if (!passport.value) return [];
      return passport.value.accidentLogs || [];
    });

    // Battery icon fill animation
    const batteryFillAnimated = ref(0);
    const { watch, nextTick } = Vue;
    watch(() => passport.value, (p) => {
      if (p) {
        batteryFillAnimated.value = 0;
        nextTick(() => {
          setTimeout(() => {
            batteryFillAnimated.value = Math.min(scaleSOC(p.currentSoc) || 0, 100);
          }, 100);
        });
      }
    }, { immediate: true });

    function getBatteryFillColor(soc) {
      if (soc == null) return '#d1d5db';
      if (soc >= 60) return '#22c55e';
      if (soc >= 30) return '#f59e0b';
      return '#ef4444';
    }

    // Lifecycle step mapping
    const lifecycleSteps = [
      { key: 'MANUFACTURED', label: '제조', idx: 1 },
      { key: 'ACTIVE', label: '운행', idx: 2 },
      { key: 'MAINTENANCE', label: '정비', idx: 3 },
      { key: 'ANALYSIS', label: '분석', idx: 4 },
      { key: 'RECYCLING', label: '재활용', idx: 5 },
      { key: 'DISPOSED', label: '폐기', idx: 6 },
    ];

    function getLifecycleIdx(status) {
      const found = lifecycleSteps.find(s => s.key === status);
      return found ? found.idx : 0;
    }

    // SOH health label
    function formatDate(ts) {
      if (!ts) return '-';
      try { return new Date(ts).toLocaleString('ko-KR'); } catch { return ts; }
    }

    function getSohHealthLabel(soh) {
      if (soh == null) return { label: '--', color: 'bg-gray-100 text-gray-500 border-gray-200', icon: 'none' };
      if (soh > 80) return { label: '양호', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: 'heart' };
      if (soh >= 50) return { label: '주의', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: 'warning' };
      return { label: '위험', color: 'bg-red-100 text-red-700 border-red-200', icon: 'alert' };
    }

    return {
      passport, loading, activeTab, passportId, tabs,
      bmuRecords, bmuLoading, history, historyLoading,
      showBindModal, showMaintenanceLogModal, showAccidentLogModal,
      showMaintenanceRequestModal, showAnalysisRequestModal,
      showAnalysisResultModal, showRecycleModal, showExtractModal,
      showDisposeConfirm,
      submitting, bindForm, maintenanceForm, accidentForm, analysisForm, extractForm,
      msp, isEV, isService, isRegulator, isManufacturer,
      maintenanceLogs, accidentLogs,
      batteryFillAnimated, lifecycleSteps,
      getStatusBadge, getSocColor, getSohColor, scaleSOC, scaleTemp, decodeStatusFlags,
      getBatteryFillColor, getLifecycleIdx, getSohHealthLabel, formatDate,
      switchTab, goBack, setPassportId,
      submitBind, submitMaintenanceRequest, submitMaintenanceLog, submitAccidentLog,
      submitAnalysisRequest, submitAnalysisResult, submitRecycleAvailability,
      submitExtractMaterials, disposeBattery,
    };
  },
  template: `
    <div class="min-h-full">
      <!-- Back + Header -->
      <div class="mb-8">
        <button @click="goBack"
          class="group inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-primary-600 transition-colors mb-4">
          <svg class="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
          목록으로
        </button>
        <div v-if="passport" class="flex flex-col sm:flex-row sm:items-center gap-4">
          <div class="flex-1">
            <div class="flex items-center gap-3 flex-wrap">
              <h1 class="text-2xl font-bold text-gray-900">{{ passport.model || '배터리 여권 상세' }}</h1>
              <span :class="[
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ring-2',
                getStatusBadge(passport.status).bg,
                getStatusBadge(passport.status).text,
                getStatusBadge(passport.status).border,
                getStatusBadge(passport.status).ring
              ]">
                <span :class="['w-2 h-2 rounded-full', getStatusBadge(passport.status).dot]"></span>
                {{ getStatusBadge(passport.status).label }}
              </span>
            </div>
            <p class="text-gray-400 text-sm mt-1 font-mono">{{ passport.passportId }}</p>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-24">
        <div class="relative">
          <div class="w-12 h-12 border-4 border-primary-100 rounded-full"></div>
          <div class="absolute top-0 left-0 w-12 h-12 border-4 border-primary-600 rounded-full animate-spin border-t-transparent"></div>
        </div>
        <p class="mt-4 text-sm text-gray-500">데이터를 불러오는 중...</p>
      </div>

      <!-- No passport -->
      <div v-else-if="!passport" class="bg-white rounded-2xl shadow-sm border border-gray-200 py-20 px-8 text-center">
        <div class="mx-auto w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-5">
          <svg class="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-700 mb-1">여권 정보를 찾을 수 없습니다</h3>
        <p class="text-sm text-gray-400 mb-6">요청한 여권 ID에 해당하는 데이터가 없습니다.</p>
        <button @click="goBack"
          class="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm rounded-xl transition-colors">
          목록으로 돌아가기
        </button>
      </div>

      <div v-else>
        <!-- Tab Navigation -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200/80 mb-6 overflow-hidden">
          <div class="flex overflow-x-auto">
            <button v-for="tab in tabs" :key="tab.key"
              @click="switchTab(tab.key)"
              :class="[
                'relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all duration-200 whitespace-nowrap border-b-2 min-w-0',
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600 bg-primary-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              ]">
              <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" :d="tab.icon"/>
              </svg>
              {{ tab.label }}
            </button>
          </div>
        </div>

        <!-- ==================== OVERVIEW TAB ==================== -->
        <div v-if="activeTab === 'overview'" class="space-y-6">
          <!-- Status Banner -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
            <div class="bg-gradient-to-r from-gray-50 to-white p-6">
              <div class="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">

                <!-- Battery Icon Visualization -->
                <div class="flex flex-col items-center justify-center">
                  <svg width="120" height="60" viewBox="0 0 120 60" xmlns="http://www.w3.org/2000/svg">
                    <!-- Battery outline -->
                    <rect x="2" y="8" width="100" height="44" rx="6" ry="6" fill="none" stroke="#9ca3af" stroke-width="3"/>
                    <!-- Terminal nub -->
                    <rect x="102" y="20" width="14" height="20" rx="3" ry="3" fill="none" stroke="#9ca3af" stroke-width="3"/>
                    <!-- Fill level (animated via style) -->
                    <rect x="6" y="12" :width="Math.max((batteryFillAnimated / 100) * 92, 0)" height="36" rx="3" ry="3"
                      :fill="getBatteryFillColor(scaleSOC(passport.currentSoc))"
                      style="transition: width 1.2s cubic-bezier(0.4,0,0.2,1), fill 0.6s ease;"/>
                    <!-- SOC text overlay -->
                    <text x="52" y="35" text-anchor="middle" font-size="16" font-weight="bold"
                      :fill="batteryFillAnimated > 50 ? '#ffffff' : '#374151'" font-family="system-ui, sans-serif">
                      {{ passport.currentSoc != null ? scaleSOC(passport.currentSoc) + '%' : '--' }}
                    </text>
                  </svg>
                  <span class="text-xs font-medium text-gray-400 uppercase tracking-wider mt-1.5">충전 잔량</span>
                </div>

                <!-- Status -->
                <div class="flex items-center gap-4">
                  <div :class="['w-14 h-14 rounded-xl flex items-center justify-center',
                    getStatusBadge(passport.status).bg, 'border', getStatusBadge(passport.status).border]">
                    <svg class="w-7 h-7" :class="getStatusBadge(passport.status).text" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                    </svg>
                  </div>
                  <div>
                    <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">현재 상태</p>
                    <p :class="['text-lg font-bold', getStatusBadge(passport.status).text]">{{ getStatusBadge(passport.status).label }}</p>
                  </div>
                </div>

                <!-- SOC Progress -->
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-medium text-gray-400 uppercase tracking-wider">충전 상태 (SOC)</span>
                    <span class="text-lg font-bold text-gray-800 tabular-nums">
                      {{ passport.currentSoc != null ? scaleSOC(passport.currentSoc) + '%' : '--' }}
                    </span>
                  </div>
                  <div class="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div :class="['h-full rounded-full transition-all duration-700', getSocColor(scaleSOC(passport.currentSoc))]"
                      :style="{ width: Math.min(scaleSOC(passport.currentSoc) || 0, 100) + '%' }"></div>
                  </div>
                  <div class="flex justify-between mt-1">
                    <span class="text-[10px] text-gray-300">0%</span>
                    <span class="text-[10px] text-gray-300">100%</span>
                  </div>
                </div>

                <!-- SOH Progress + Health Badge -->
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-medium text-gray-400 uppercase tracking-wider">건강 상태 (SOH)</span>
                    <div class="flex items-center gap-2">
                      <!-- SOH Health Indicator Badge -->
                      <span v-if="passport.currentSoh != null"
                        :class="['inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border transition-all duration-500',
                          getSohHealthLabel(passport.currentSoh).color]"
                        style="animation: sohBadgeFadeIn 0.6s ease-out;">
                        <!-- Heart icon (양호) -->
                        <svg v-if="getSohHealthLabel(passport.currentSoh).icon === 'heart'" class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                        <!-- Warning icon (주의) -->
                        <svg v-if="getSohHealthLabel(passport.currentSoh).icon === 'warning'" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                        <!-- Alert icon (위험) -->
                        <svg v-if="getSohHealthLabel(passport.currentSoh).icon === 'alert'" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        {{ getSohHealthLabel(passport.currentSoh).label }}
                      </span>
                      <span class="text-lg font-bold text-gray-800 tabular-nums">
                        {{ passport.currentSoh != null ? passport.currentSoh + '%' : '--' }}
                      </span>
                    </div>
                  </div>
                  <div class="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div :class="['h-full rounded-full transition-all duration-700', getSohColor(passport.currentSoh)]"
                      :style="{ width: (passport.currentSoh || 0) + '%' }"></div>
                  </div>
                  <div class="flex justify-between mt-1">
                    <span class="text-[10px] text-gray-300">0%</span>
                    <span class="text-[10px] text-gray-300">100%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Lifecycle Progress Indicator -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
            <div class="px-6 py-5">
              <h3 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-5">배터리 수명 주기</h3>
              <div class="flex items-center justify-between relative">
                <template v-for="(step, si) in lifecycleSteps" :key="step.key">
                  <!-- Connecting line (before each step except first) -->
                  <div v-if="si > 0" class="flex-1 h-0.5 mx-1"
                    :class="getLifecycleIdx(passport.status) > step.idx ? 'bg-blue-400' : (getLifecycleIdx(passport.status) >= step.idx ? 'bg-blue-400' : 'bg-gray-200')">
                  </div>
                  <!-- Step circle + label -->
                  <div class="flex flex-col items-center relative" style="min-width: 56px;">
                    <!-- Completed step -->
                    <div v-if="getLifecycleIdx(passport.status) > step.idx"
                      class="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center shadow-sm">
                      <svg class="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                      </svg>
                    </div>
                    <!-- Current step (pulsing) -->
                    <div v-else-if="getLifecycleIdx(passport.status) === step.idx"
                      class="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center shadow-md relative">
                      <div class="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-30"></div>
                      <div class="w-3 h-3 rounded-full bg-white"></div>
                    </div>
                    <!-- Future step -->
                    <div v-else
                      class="w-9 h-9 rounded-full border-2 border-gray-300 bg-white flex items-center justify-center">
                      <div class="w-2.5 h-2.5 rounded-full bg-gray-300"></div>
                    </div>
                    <span class="text-xs font-medium mt-2 whitespace-nowrap"
                      :class="getLifecycleIdx(passport.status) >= step.idx ? 'text-blue-600' : 'text-gray-400'">
                      {{ step.label }}
                    </span>
                  </div>
                </template>
              </div>
            </div>
          </div>

          <!-- GBA 21 Compliance Badge -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200/80 border-l-4 border-l-green-500 overflow-hidden">
            <div class="px-6 py-5">
              <div class="flex items-start gap-4">
                <!-- Shield icon with checkmark -->
                <div class="flex-shrink-0">
                  <svg class="w-10 h-10 text-green-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" fill="currentColor" opacity="0.15"/>
                    <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                    <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="text-sm font-bold text-gray-900 mb-1">GBA 21 Battery Passport</h3>
                  <p class="text-xs text-gray-500 mb-3">Global Battery Alliance 21가지 데이터 항목 준수</p>
                  <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-1.5">
                    <div class="flex items-center gap-1.5">
                      <svg class="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                      </svg>
                      <span class="text-xs text-gray-700">배터리 식별</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <svg class="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                      </svg>
                      <span class="text-xs text-gray-700">제조 정보</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <svg class="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                      </svg>
                      <span class="text-xs text-gray-700">기술 사양</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <svg class="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                      </svg>
                      <span class="text-xs text-gray-700">지속가능성</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <svg class="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                      </svg>
                      <span class="text-xs text-gray-700">수명 주기 추적</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Section: 배터리 식별정보 -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-2.5">
              <div class="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/>
                </svg>
              </div>
              <h3 class="text-sm font-bold text-gray-800 uppercase tracking-wider">배터리 식별정보</h3>
            </div>
            <div class="p-6">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                <div>
                  <dt class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">여권 ID</dt>
                  <dd class="text-sm text-gray-900 font-mono bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 break-all">{{ passport.passportId || '-' }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">배터리 ID</dt>
                  <dd class="text-sm text-gray-900 font-mono bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 break-all">{{ passport.batteryId || '-' }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">DID</dt>
                  <dd class="text-sm text-gray-900 font-mono bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 break-all">{{ passport.did || '-' }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">시리얼번호</dt>
                  <dd class="text-sm text-gray-900 font-semibold">{{ passport.serialNumber || '-' }}</dd>
                </div>
              </div>
            </div>
          </div>

          <!-- Section: 제조정보 -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-2.5">
              <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
                </svg>
              </div>
              <h3 class="text-sm font-bold text-gray-800 uppercase tracking-wider">제조정보</h3>
            </div>
            <div class="p-6">
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
                <div>
                  <dt class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">제조사</dt>
                  <dd class="text-sm text-gray-900 font-semibold">{{ passport.manufacturerName || '-' }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">제조국가</dt>
                  <dd class="text-sm text-gray-900">{{ passport.manufactureCountry || '-' }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">셀 제조사</dt>
                  <dd class="text-sm text-gray-900">{{ passport.cellManufacturer || '-' }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">셀 제조국가</dt>
                  <dd class="text-sm text-gray-900">{{ passport.cellManufactureCountry || '-' }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">제조일자</dt>
                  <dd class="text-sm text-gray-900">{{ passport.manufactureDate || '-' }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">셀 유형</dt>
                  <dd class="text-sm text-gray-900">{{ passport.cellType || '-' }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">화학물질</dt>
                  <dd class="text-sm text-gray-900">
                    <span v-if="passport.chemistry" class="inline-flex items-center px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-semibold border border-indigo-100">{{ passport.chemistry }}</span>
                    <span v-else>-</span>
                  </dd>
                </div>
              </div>
            </div>
          </div>

          <!-- Section: 기술 스펙 -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-2.5">
              <div class="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/>
                </svg>
              </div>
              <h3 class="text-sm font-bold text-gray-800 uppercase tracking-wider">기술 스펙</h3>
            </div>
            <div class="p-6">
              <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-5">
                <div>
                  <dt class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">셀 수</dt>
                  <dd class="text-sm text-gray-900 font-semibold tabular-nums">{{ passport.cellCount || '-' }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">무게</dt>
                  <dd class="text-sm text-gray-900 tabular-nums">{{ passport.weight ? passport.weight + ' kg' : '-' }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">총 에너지</dt>
                  <dd class="text-sm text-gray-900 tabular-nums">{{ passport.totalEnergy ? passport.totalEnergy + ' kWh' : '-' }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">에너지 밀도</dt>
                  <dd class="text-sm text-gray-900 tabular-nums">{{ passport.energyDensity ? passport.energyDensity + ' Wh/kg' : '-' }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">정격 용량</dt>
                  <dd class="text-sm text-gray-900 tabular-nums">{{ passport.ratedCapacity ? passport.ratedCapacity + ' Ah' : '-' }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">예상 수명</dt>
                  <dd class="text-sm text-gray-900 tabular-nums">{{ passport.expectedLifespan ? passport.expectedLifespan + '년' : '-' }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">전압 범위</dt>
                  <dd class="text-sm text-gray-900">{{ passport.voltageRange ? passport.voltageRange + ' V' : '-' }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">온도 범위</dt>
                  <dd class="text-sm text-gray-900">{{ passport.temperatureRange ? passport.temperatureRange + ' °C' : '-' }}</dd>
                </div>
              </div>
            </div>
          </div>

          <!-- Section: EV 바인딩 -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                </div>
                <h3 class="text-sm font-bold text-gray-800 uppercase tracking-wider">EV 바인딩</h3>
              </div>
              <button v-if="isEV && !passport.vin" @click="showBindModal = true"
                class="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                </svg>
                VIN 바인딩
              </button>
            </div>
            <div class="p-6">
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-5">
                <div>
                  <dt class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">VIN</dt>
                  <dd class="text-sm font-mono">
                    <span v-if="passport.vin" class="text-gray-900 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100 inline-block">{{ passport.vin }}</span>
                    <span v-else class="text-gray-300">미등록</span>
                  </dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">장착일자</dt>
                  <dd class="text-sm text-gray-900">{{ passport.installDate || '-' }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">EV 제조사</dt>
                  <dd class="text-sm text-gray-900">{{ passport.evManufacturer || '-' }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">EV 조립국가</dt>
                  <dd class="text-sm text-gray-900">{{ passport.evAssemblyCountry || '-' }}</dd>
                </div>
              </div>
            </div>
          </div>

          <!-- Section: 실시간 상태 -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-2.5">
              <div class="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
              </div>
              <h3 class="text-sm font-bold text-gray-800 uppercase tracking-wider">실시간 상태</h3>
            </div>
            <div class="p-6">
              <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                <div class="bg-gray-50 rounded-xl p-4 border border-gray-100 text-center">
                  <dt class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">SOC</dt>
                  <dd class="text-xl font-bold text-gray-900 tabular-nums">{{ passport.currentSoc != null ? scaleSOC(passport.currentSoc) + '%' : '--' }}</dd>
                </div>
                <div class="bg-gray-50 rounded-xl p-4 border border-gray-100 text-center">
                  <dt class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">SOH</dt>
                  <dd class="text-xl font-bold text-gray-900 tabular-nums">{{ passport.currentSoh != null ? passport.currentSoh + '%' : '--' }}</dd>
                </div>
                <div class="bg-gray-50 rounded-xl p-4 border border-gray-100 text-center">
                  <dt class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2" title="에너지 충전상태">SOCE (에너지 충전상태)</dt>
                  <dd class="text-xl font-bold text-gray-900 tabular-nums">{{ passport.soce != null ? passport.soce + '%' : '--' }}</dd>
                </div>
                <div class="bg-gray-50 rounded-xl p-4 border border-gray-100 text-center">
                  <dt class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">방전 사이클</dt>
                  <dd class="text-xl font-bold text-gray-900 tabular-nums">{{ passport.dischargeCycles != null ? passport.dischargeCycles : '--' }}</dd>
                </div>
                <div class="bg-gray-50 rounded-xl p-4 border border-gray-100 text-center">
                  <dt class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">잔여 수명</dt>
                  <dd class="text-xl font-bold text-gray-900 tabular-nums">{{ passport.remainingLifeCycle != null ? passport.remainingLifeCycle : '--' }}</dd>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ==================== BMU DATA TAB ==================== -->
        <div v-if="activeTab === 'bmu'">
          <div v-if="bmuLoading" class="flex flex-col items-center justify-center py-20">
            <div class="relative">
              <div class="w-10 h-10 border-4 border-primary-100 rounded-full"></div>
              <div class="absolute top-0 left-0 w-10 h-10 border-4 border-primary-600 rounded-full animate-spin border-t-transparent"></div>
            </div>
            <p class="mt-3 text-sm text-gray-500">BMU 데이터 로딩중...</p>
          </div>
          <div v-else-if="bmuRecords.length === 0" class="bg-white rounded-xl shadow-sm border border-gray-200/80 py-16 text-center">
            <div class="mx-auto w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <svg class="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <p class="text-gray-500 font-medium">BMU 데이터가 없습니다</p>
            <p class="text-xs text-gray-400 mt-1">아직 수집된 BMU 데이터가 없습니다.</p>
          </div>
          <div v-else class="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="bg-gray-50/80 border-b border-gray-200">
                    <th class="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">기록 ID</th>
                    <th class="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">시각</th>
                    <th class="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">SOC(%)</th>
                    <th class="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">전압(V)</th>
                    <th class="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">전류(A)</th>
                    <th class="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">온도(°C)</th>
                    <th class="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">방전주기</th>
                    <th class="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">상태 플래그</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(r, idx) in bmuRecords" :key="r.recordId"
                    :class="['transition-colors', idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40', 'hover:bg-primary-50/40']">
                    <td class="px-5 py-3 font-mono text-xs text-gray-500">{{ r.recordId }}</td>
                    <td class="px-5 py-3 text-gray-600 text-xs">{{ formatDate(r.timestamp) }}</td>
                    <td class="px-5 py-3">
                      <span class="font-semibold text-gray-900 tabular-nums">{{ r.soc != null ? scaleSOC(r.soc) + '%' : '-' }}</span>
                    </td>
                    <td class="px-5 py-3 text-gray-700 tabular-nums">{{ r.voltage != null ? r.voltage + 'V' : '-' }}</td>
                    <td class="px-5 py-3 text-gray-700 tabular-nums">{{ r.current != null ? r.current + 'A' : '-' }}</td>
                    <td class="px-5 py-3 text-gray-700 tabular-nums">{{ r.temperature != null ? scaleTemp(r.temperature) + '°C' : '-' }}</td>
                    <td class="px-5 py-3 text-gray-700 tabular-nums">{{ r.dischargeCycles != null ? r.dischargeCycles : '-' }}</td>
                    <td class="px-5 py-3">
                      <div class="flex flex-wrap gap-1">
                        <span v-for="badge in decodeStatusFlags(r.statusFlags)" :key="badge.label"
                          :class="['inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border', badge.color]">
                          {{ badge.label }}
                        </span>
                        <span v-if="decodeStatusFlags(r.statusFlags).length === 0" class="text-xs text-gray-300">--</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="border-t border-gray-100 bg-gray-50/50 px-5 py-3">
              <span class="text-xs text-gray-500">최근 <strong class="text-gray-700">{{ bmuRecords.length }}</strong>건 표시</span>
            </div>
          </div>
        </div>

        <!-- ==================== MAINTENANCE TAB ==================== -->
        <div v-if="activeTab === 'maintenance'" class="space-y-6">
          <!-- Action Buttons -->
          <div class="flex flex-wrap gap-3">
            <button v-if="isEV && passport.status === 'ACTIVE'"
              @click="showMaintenanceRequestModal = true"
              class="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm rounded-lg transition-colors shadow-sm">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              정비 요청
            </button>
            <button v-if="isService"
              @click="showMaintenanceLogModal = true"
              class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg transition-colors shadow-sm">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
              정비 기록 추가
            </button>
            <button v-if="isEV || isService"
              @click="showAccidentLogModal = true"
              class="inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium text-sm rounded-lg transition-colors shadow-sm">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              사고 기록 추가
            </button>
          </div>

          <!-- Maintenance Logs -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-2.5">
              <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
              <h3 class="text-sm font-bold text-gray-800 uppercase tracking-wider">정비 이력</h3>
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">{{ maintenanceLogs.length }}</span>
            </div>
            <div v-if="maintenanceLogs.length === 0" class="p-10 text-center">
              <p class="text-gray-400 text-sm">정비 이력이 없습니다</p>
            </div>
            <div v-else class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="bg-gray-50/60 border-b border-gray-100">
                    <th class="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">날짜</th>
                    <th class="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">유형</th>
                    <th class="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">내용</th>
                    <th class="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">기술자</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(log, i) in maintenanceLogs" :key="i"
                    :class="['transition-colors', i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40', 'hover:bg-blue-50/40']">
                    <td class="px-5 py-3 text-gray-700 whitespace-nowrap">{{ log.date || '-' }}</td>
                    <td class="px-5 py-3">
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">{{ log.type || '-' }}</span>
                    </td>
                    <td class="px-5 py-3 text-gray-700 max-w-xs truncate">{{ log.description || '-' }}</td>
                    <td class="px-5 py-3 text-gray-600">{{ log.technician || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Accident Logs -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-2.5">
              <div class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <h3 class="text-sm font-bold text-gray-800 uppercase tracking-wider">사고 기록</h3>
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">{{ accidentLogs.length }}</span>
            </div>
            <div v-if="accidentLogs.length === 0" class="p-10 text-center">
              <p class="text-gray-400 text-sm">사고 기록이 없습니다</p>
            </div>
            <div v-else class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="bg-gray-50/60 border-b border-gray-100">
                    <th class="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">날짜</th>
                    <th class="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">유형</th>
                    <th class="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">내용</th>
                    <th class="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">보고자</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(log, i) in accidentLogs" :key="i"
                    :class="['transition-colors', i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40', 'hover:bg-red-50/30']">
                    <td class="px-5 py-3 text-gray-700 whitespace-nowrap">{{ log.date || '-' }}</td>
                    <td class="px-5 py-3">
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-50 text-red-700 border border-red-100">{{ log.type || '-' }}</span>
                    </td>
                    <td class="px-5 py-3 text-gray-700 max-w-xs truncate">{{ log.description || '-' }}</td>
                    <td class="px-5 py-3 text-gray-600">{{ log.reporter || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ==================== RECYCLING TAB ==================== -->
        <div v-if="activeTab === 'recycling'" class="space-y-6">
          <!-- Recycling Info -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-2.5">
              <div class="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
              </div>
              <h3 class="text-sm font-bold text-gray-800 uppercase tracking-wider">재활용 정보</h3>
            </div>
            <div class="p-6">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                <!-- Recycle Available -->
                <div class="bg-gray-50 rounded-xl p-5 border border-gray-100 text-center">
                  <dt class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">재활용 가능 여부</dt>
                  <dd>
                    <span v-if="passport.recycleAvailable"
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                      </svg>
                      가능
                    </span>
                    <span v-else
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold bg-gray-100 text-gray-500 border border-gray-200">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4"/>
                      </svg>
                      불가 / 미판정
                    </span>
                  </dd>
                </div>
                <!-- Current Status -->
                <div class="bg-gray-50 rounded-xl p-5 border border-gray-100 text-center">
                  <dt class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">현재 상태</dt>
                  <dd>
                    <span :class="[
                      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border',
                      getStatusBadge(passport.status).bg,
                      getStatusBadge(passport.status).text,
                      getStatusBadge(passport.status).border
                    ]">
                      <span :class="['w-1.5 h-1.5 rounded-full', getStatusBadge(passport.status).dot]"></span>
                      {{ getStatusBadge(passport.status).label }}
                    </span>
                  </dd>
                </div>
                <!-- SOH -->
                <div class="bg-gray-50 rounded-xl p-5 border border-gray-100 text-center">
                  <dt class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">건강 상태 (SOH)</dt>
                  <dd class="text-2xl font-bold text-gray-800 tabular-nums">{{ passport.currentSoh != null ? passport.currentSoh + '%' : '--' }}</dd>
                </div>
              </div>

              <!-- Recycling Rates -->
              <div v-if="passport.recyclingRates && Object.keys(passport.recyclingRates).length > 0">
                <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">원자재 재활용 비율</h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div v-for="(val, key) in passport.recyclingRates" :key="key" class="flex items-center gap-3">
                    <span class="text-sm font-medium text-gray-700 w-20 capitalize">{{ key }}</span>
                    <div class="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div class="h-full rounded-full bg-emerald-500 transition-all duration-700" :style="{ width: val + '%' }"></div>
                    </div>
                    <span class="text-sm font-bold text-gray-800 tabular-nums w-12 text-right">{{ val }}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200/80 p-6">
            <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">가용 작업</h4>
            <p v-if="!isEV && !isService && !isRegulator" class="text-sm text-gray-400 py-4">현재 가능한 작업이 없습니다.</p>
            <div class="flex flex-wrap gap-3">
              <button v-if="isEV"
                @click="showAnalysisRequestModal = true"
                class="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm rounded-lg transition-colors shadow-sm">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                </svg>
                분석 요청
              </button>
              <button v-if="isService"
                @click="showAnalysisResultModal = true"
                class="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg transition-colors shadow-sm">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                분석 결과 제출
              </button>
              <button v-if="isService || isRegulator"
                @click="showRecycleModal = true"
                class="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium text-sm rounded-lg transition-colors shadow-sm">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                재활용 판정
              </button>
              <button v-if="isRegulator"
                @click="showExtractModal = true"
                class="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm rounded-lg transition-colors shadow-sm">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
                </svg>
                원자재 추출
              </button>
              <button v-if="isRegulator"
                @click="showDisposeConfirm = true"
                :disabled="submitting"
                class="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium text-sm rounded-lg transition-colors shadow-sm disabled:opacity-50">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
                폐기 처리
              </button>
            </div>
          </div>
        </div>

        <!-- ==================== HISTORY TAB ==================== -->
        <div v-if="activeTab === 'history'">
          <div v-if="historyLoading" class="flex flex-col items-center justify-center py-20">
            <div class="relative">
              <div class="w-10 h-10 border-4 border-primary-100 rounded-full"></div>
              <div class="absolute top-0 left-0 w-10 h-10 border-4 border-primary-600 rounded-full animate-spin border-t-transparent"></div>
            </div>
            <p class="mt-3 text-sm text-gray-500">변경 이력 로딩중...</p>
          </div>
          <div v-else-if="history.length === 0" class="bg-white rounded-xl shadow-sm border border-gray-200/80 py-16 text-center">
            <div class="mx-auto w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <svg class="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <p class="text-gray-500 font-medium">변경 이력이 없습니다</p>
          </div>
          <div v-else>
            <div class="flex items-center justify-between mb-4">
              <p class="text-sm text-gray-500 flex items-center gap-2">
                <svg class="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                총 <strong class="text-gray-700">{{ history.length }}</strong>건의 주요 변경 이력 (상태 전환/VIN/정비 기준)
              </p>
            </div>
            <div class="relative pl-6 max-h-[600px] overflow-y-auto pr-2">
            <!-- Timeline line -->
            <div class="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary-300 via-primary-200 to-gray-200"></div>
            <div class="space-y-4">
              <div v-for="(entry, i) in history.slice(-20)" :key="i" class="relative">
                <!-- Timeline dot -->
                <div class="absolute -left-6 top-5 w-[22px] h-[22px] rounded-full border-[3px] border-white shadow-sm flex items-center justify-center"
                  :class="entry.value && entry.value.status ? getStatusBadge(entry.value.status).bg : 'bg-primary-100'">
                  <div class="w-2 h-2 rounded-full"
                    :class="entry.value && entry.value.status ? getStatusBadge(entry.value.status).dot : 'bg-primary-500'"></div>
                </div>
                <!-- Card -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-200/80 p-5 ml-4 hover:shadow-md transition-shadow">
                  <div class="flex items-start justify-between gap-4">
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2 flex-wrap">
                        <p class="text-sm font-semibold text-gray-900">
                          {{ entry.changeDesc || ('변경 #' + entry.index) }}
                        </p>
                        <span v-if="entry.value && entry.value.status"
                          :class="[
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border',
                            getStatusBadge(entry.value.status).bg,
                            getStatusBadge(entry.value.status).text,
                            getStatusBadge(entry.value.status).border
                          ]">
                          <span :class="['w-1 h-1 rounded-full', getStatusBadge(entry.value.status).dot]"></span>
                          {{ getStatusBadge(entry.value.status).label }}
                        </span>
                      </div>
                      <p class="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        {{ formatDate(entry.timestamp) }}
                        <span class="inline-flex items-center gap-1 ml-2 px-1.5 py-0.5 bg-primary-50 text-primary-600 rounded text-[10px] font-medium border border-primary-100">
                          <svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                          On-Chain TX #{{ entry.index }}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div v-if="entry.value" class="mt-3 flex flex-wrap gap-3 text-xs">
                    <span v-if="entry.value.manufacturerName" class="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 rounded-lg text-gray-600 border border-gray-100">
                      <span class="font-medium text-gray-500">제조사:</span> {{ entry.value.manufacturerName }}
                    </span>
                    <span v-if="entry.value.vin" class="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 rounded-lg text-gray-600 border border-gray-100">
                      <span class="font-medium text-gray-500">VIN:</span> {{ entry.value.vin }}
                    </span>
                    <span v-if="entry.value.currentSoh != null" class="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 rounded-lg text-gray-600 border border-gray-100">
                      <span class="font-medium text-gray-500">SOH:</span> {{ entry.value.currentSoh }}%
                    </span>
                    <span v-if="entry.value.currentSoc != null" class="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 rounded-lg text-gray-600 border border-gray-100">
                      <span class="font-medium text-gray-500">SOC:</span> {{ scaleSOC(entry.value.currentSoc) }}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ==================== MODALS ==================== -->

      <!-- VIN Bind Modal -->
      <teleport to="body">
        <transition name="fade">
          <div v-if="showBindModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" @click="showBindModal = false"></div>
            <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200/50 overflow-hidden">
              <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <svg class="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                    </svg>
                  </div>
                  <h2 class="text-lg font-bold text-gray-900">VIN 바인딩</h2>
                </div>
                <button @click="showBindModal = false" class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-400 hover:text-gray-600">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <form @submit.prevent="submitBind" class="p-6 space-y-4">
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1.5">VIN</label>
                  <input v-model="bindForm.vin" type="text" placeholder="차량 식별번호"
                    class="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm hover:border-gray-400 transition-colors" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1.5">장착일자</label>
                  <input v-model="bindForm.installDate" type="date"
                    class="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm hover:border-gray-400 transition-colors" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1.5">EV 제조사</label>
                  <input v-model="bindForm.evManufacturer" type="text" placeholder="EV 제조사명"
                    class="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm hover:border-gray-400 transition-colors" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1.5">EV 조립국가</label>
                  <input v-model="bindForm.evAssemblyCountry" type="text" placeholder="KR"
                    class="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm hover:border-gray-400 transition-colors" />
                </div>
                <div class="flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <button type="button" @click="showBindModal = false"
                    class="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl transition-colors">취소</button>
                  <button type="submit" :disabled="submitting"
                    class="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50">
                    {{ submitting ? '처리중...' : '바인딩' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </transition>
      </teleport>

      <!-- Maintenance Request Modal -->
      <teleport to="body">
        <transition name="fade">
          <div v-if="showMaintenanceRequestModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" @click="showMaintenanceRequestModal = false"></div>
            <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-200/50 overflow-hidden">
              <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                <div class="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                </div>
                <h2 class="text-lg font-bold text-gray-900">정비 요청</h2>
              </div>
              <div class="p-6">
                <p class="text-sm text-gray-600 mb-5">이 배터리에 대한 정비를 요청하시겠습니까?<br><span class="text-xs text-gray-400 mt-1 block">상태가 MAINTENANCE로 변경됩니다.</span></p>
                <div class="flex justify-end gap-3">
                  <button @click="showMaintenanceRequestModal = false"
                    class="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl transition-colors">취소</button>
                  <button @click="submitMaintenanceRequest" :disabled="submitting"
                    class="px-5 py-2.5 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors disabled:opacity-50">
                    {{ submitting ? '처리중...' : '정비 요청' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </transition>
      </teleport>

      <!-- Maintenance Log Modal -->
      <teleport to="body">
        <transition name="fade">
          <div v-if="showMaintenanceLogModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" @click="showMaintenanceLogModal = false"></div>
            <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200/50 overflow-hidden">
              <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </div>
                  <h2 class="text-lg font-bold text-gray-900">정비 기록 추가</h2>
                </div>
                <button @click="showMaintenanceLogModal = false" class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-400 hover:text-gray-600">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <form @submit.prevent="submitMaintenanceLog" class="p-6 space-y-4">
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1.5">날짜</label>
                  <input v-model="maintenanceForm.date" type="date"
                    class="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm hover:border-gray-400 transition-colors" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1.5">유형</label>
                  <input v-model="maintenanceForm.type" type="text" placeholder="정기점검 / 부품교체 / 긴급수리"
                    class="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm hover:border-gray-400 transition-colors" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1.5">내용</label>
                  <textarea v-model="maintenanceForm.description" rows="3" placeholder="정비 내용을 상세히 기입하세요"
                    class="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm hover:border-gray-400 transition-colors resize-none"></textarea>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1.5">기술자</label>
                  <input v-model="maintenanceForm.technician" type="text" placeholder="기술자명"
                    class="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm hover:border-gray-400 transition-colors" />
                </div>
                <div class="flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <button type="button" @click="showMaintenanceLogModal = false"
                    class="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl transition-colors">취소</button>
                  <button type="submit" :disabled="submitting"
                    class="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50">
                    {{ submitting ? '처리중...' : '추가' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </transition>
      </teleport>

      <!-- Accident Log Modal -->
      <teleport to="body">
        <transition name="fade">
          <div v-if="showAccidentLogModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" @click="showAccidentLogModal = false"></div>
            <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200/50 overflow-hidden">
              <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center">
                    <svg class="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <h2 class="text-lg font-bold text-gray-900">사고 기록 추가</h2>
                </div>
                <button @click="showAccidentLogModal = false" class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-400 hover:text-gray-600">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <form @submit.prevent="submitAccidentLog" class="p-6 space-y-4">
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1.5">날짜</label>
                  <input v-model="accidentForm.date" type="date"
                    class="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm hover:border-gray-400 transition-colors" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1.5">유형</label>
                  <input v-model="accidentForm.type" type="text" placeholder="충돌 / 화재 / 침수"
                    class="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm hover:border-gray-400 transition-colors" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1.5">내용</label>
                  <textarea v-model="accidentForm.description" rows="3" placeholder="사고 상세 내용"
                    class="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm hover:border-gray-400 transition-colors resize-none"></textarea>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1.5">보고자</label>
                  <input v-model="accidentForm.reporter" type="text" placeholder="보고자명"
                    class="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm hover:border-gray-400 transition-colors" />
                </div>
                <div class="flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <button type="button" @click="showAccidentLogModal = false"
                    class="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl transition-colors">취소</button>
                  <button type="submit" :disabled="submitting"
                    class="px-5 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50">
                    {{ submitting ? '처리중...' : '추가' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </transition>
      </teleport>

      <!-- Analysis Request Modal -->
      <teleport to="body">
        <transition name="fade">
          <div v-if="showAnalysisRequestModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" @click="showAnalysisRequestModal = false"></div>
            <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-200/50 overflow-hidden">
              <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                <div class="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                  </svg>
                </div>
                <h2 class="text-lg font-bold text-gray-900">분석 요청</h2>
              </div>
              <div class="p-6">
                <p class="text-sm text-gray-600 mb-5">이 배터리에 대한 분석을 요청하시겠습니까?<br><span class="text-xs text-gray-400 mt-1 block">상태가 ANALYSIS로 변경됩니다.</span></p>
                <div class="flex justify-end gap-3">
                  <button @click="showAnalysisRequestModal = false"
                    class="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl transition-colors">취소</button>
                  <button @click="submitAnalysisRequest" :disabled="submitting"
                    class="px-5 py-2.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors disabled:opacity-50">
                    {{ submitting ? '처리중...' : '분석 요청' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </transition>
      </teleport>

      <!-- Analysis Result Modal -->
      <teleport to="body">
        <transition name="fade">
          <div v-if="showAnalysisResultModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" @click="showAnalysisResultModal = false"></div>
            <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200/50 overflow-hidden">
              <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <svg class="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                  </div>
                  <h2 class="text-lg font-bold text-gray-900">분석 결과 제출</h2>
                </div>
                <button @click="showAnalysisResultModal = false" class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-400 hover:text-gray-600">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <form @submit.prevent="submitAnalysisResult" class="p-6 space-y-4">
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1.5">SOH (%)</label>
                    <input v-model="analysisForm.soh" type="number" step="0.1" placeholder="85"
                      class="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm hover:border-gray-400 transition-colors" />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1.5">SOCE (%)</label>
                    <input v-model="analysisForm.soce" type="number" step="0.1" placeholder="90"
                      class="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm hover:border-gray-400 transition-colors" />
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1.5">잔여 수명 주기</label>
                  <input v-model="analysisForm.remainingLifeCycle" type="number" placeholder="1500"
                    class="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm hover:border-gray-400 transition-colors" />
                </div>
                <div class="flex items-center gap-3 py-2 px-3.5 bg-gray-50 rounded-lg border border-gray-100">
                  <input v-model="analysisForm.recycleAvailable" type="checkbox" id="recycleCheckDetail"
                    class="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
                  <label for="recycleCheckDetail" class="text-sm text-gray-700 font-medium">재활용 가능</label>
                </div>
                <div class="flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <button type="button" @click="showAnalysisResultModal = false"
                    class="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl transition-colors">취소</button>
                  <button type="submit" :disabled="submitting"
                    class="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50">
                    {{ submitting ? '처리중...' : '제출' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </transition>
      </teleport>

      <!-- Recycle Availability Modal -->
      <teleport to="body">
        <transition name="fade">
          <div v-if="showRecycleModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" @click="showRecycleModal = false"></div>
            <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-200/50 overflow-hidden">
              <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                <div class="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <h2 class="text-lg font-bold text-gray-900">재활용 판정</h2>
              </div>
              <div class="p-6">
                <p class="text-sm text-gray-600 mb-6">이 배터리의 재활용 가능 여부를 판정합니다.</p>
                <div class="flex justify-end gap-3">
                  <button @click="showRecycleModal = false"
                    class="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl transition-colors">취소</button>
                  <button @click="submitRecycleAvailability(false)" :disabled="submitting"
                    class="px-5 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50">
                    재활용 불가
                  </button>
                  <button @click="submitRecycleAvailability(true)" :disabled="submitting"
                    class="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50">
                    재활용 가능
                  </button>
                </div>
              </div>
            </div>
          </div>
        </transition>
      </teleport>

      <!-- Extract Materials Modal -->
      <teleport to="body">
        <transition name="fade">
          <div v-if="showExtractModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" @click="showExtractModal = false"></div>
            <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200/50 overflow-hidden">
              <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 bg-teal-100 rounded-lg flex items-center justify-center">
                    <svg class="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
                    </svg>
                  </div>
                  <h2 class="text-lg font-bold text-gray-900">원자재 추출</h2>
                </div>
                <button @click="showExtractModal = false" class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-400 hover:text-gray-600">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <form @submit.prevent="submitExtractMaterials" class="p-6 space-y-4">
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1.5">재활용 비율 (JSON)</label>
                  <textarea v-model="extractForm.recyclingRatesJson" rows="6"
                    class="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm font-mono hover:border-gray-400 transition-colors resize-none bg-gray-50"></textarea>
                  <p class="text-xs text-gray-400 mt-1.5">예: { "cobalt": 95, "nickel": 90, "lithium": 80 }</p>
                </div>
                <div class="flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <button type="button" @click="showExtractModal = false"
                    class="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl transition-colors">취소</button>
                  <button type="submit" :disabled="submitting"
                    class="px-5 py-2.5 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-colors disabled:opacity-50">
                    {{ submitting ? '처리중...' : '등록' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </transition>
      </teleport>

      <!-- Dispose Confirmation Modal -->
      <teleport to="body">
        <transition name="fade">
          <div v-if="showDisposeConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" @click="showDisposeConfirm = false"></div>
            <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200/50 overflow-hidden">
              <div class="p-6 text-center">
                <div class="mx-auto w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <svg class="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                </div>
                <h3 class="text-lg font-bold text-gray-900 mb-2">폐기 처리 확인</h3>
                <p class="text-sm text-gray-500 mb-6">정말로 이 배터리를 폐기 처리하시겠습니까?<br>이 작업은 되돌릴 수 없습니다.</p>
                <div class="flex gap-3">
                  <button @click="showDisposeConfirm = false"
                    class="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl transition-colors">취소</button>
                  <button @click="disposeBattery" :disabled="submitting"
                    class="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50">
                    {{ submitting ? '처리중...' : '폐기 확인' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </transition>
      </teleport>
    </div>
  `
});
