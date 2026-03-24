app.component('maintenance-page', {
  props: ['auth', 'api'],
  emits: ['navigate'],
  setup(props, { emit }) {
    const { ref, computed, onMounted } = Vue;

    const passports = ref([]);
    const loading = ref(false);
    const activeTab = ref('all');
    const submitting = ref(false);

    // Modal state
    const showMaintenanceRequestModal = ref(false);
    const showMaintenanceLogModal = ref(false);
    const showAccidentModal = ref(false);
    const selectedPassport = ref(null);

    const isEVManufacturer = computed(() => props.auth.orgMsp === MSP.EV_MANUFACTURER);
    const isService = computed(() => props.auth.orgMsp === MSP.SERVICE);
    const canRequestMaintenance = computed(() => isEVManufacturer.value);
    const canLogMaintenance = computed(() => isService.value);
    const canLogAccident = computed(() => isEVManufacturer.value || isService.value);

    const maintenanceTypes = [
      { value: 'routine', label: '정기점검', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
      { value: 'repair', label: '수리', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
      { value: 'recall', label: '리콜', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
      { value: 'emergency', label: '긴급', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    ];

    const severityOptions = [
      { value: 'minor', label: '경미', bgClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotClass: 'bg-emerald-500' },
      { value: 'moderate', label: '보통', bgClass: 'bg-amber-50 text-amber-700 border-amber-200', dotClass: 'bg-amber-500' },
      { value: 'severe', label: '심각', bgClass: 'bg-red-50 text-red-700 border-red-200', dotClass: 'bg-red-500' },
    ];

    // Forms
    const requestForm = ref({ maintenanceType: 'routine', description: '' });
    const logForm = ref({ maintenanceType: 'routine', description: '', technician: '' });
    const accidentForm = ref({ severity: 'minor', description: '', reporter: '' });

    // Use global STATUS_CONFIG from app.js
    const statusConfig = STATUS_CONFIG;

    const filteredPassports = computed(() => {
      if (activeTab.value === 'maintenance') {
        return passports.value.filter(p => p.status === 'MAINTENANCE');
      }
      if (activeTab.value === 'accident') {
        return passports.value.filter(p => (p.accidentLogs && p.accidentLogs.length > 0));
      }
      // 전체: 정비이력 또는 사고기록이 있거나, 정비중 상태인 배터리만
      return passports.value.filter(p =>
        p.status === 'MAINTENANCE' ||
        (p.maintenanceLogs && p.maintenanceLogs.length > 0) ||
        (p.accidentLogs && p.accidentLogs.length > 0)
      );
    });

    const tabs = [
      { key: 'all', label: '전체', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
      { key: 'maintenance', label: '정비중', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
      { key: 'accident', label: '사고기록', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    ];

    const tabCounts = computed(() => ({
      all: passports.value.filter(p =>
        p.status === 'MAINTENANCE' ||
        (p.maintenanceLogs && p.maintenanceLogs.length > 0) ||
        (p.accidentLogs && p.accidentLogs.length > 0)
      ).length,
      maintenance: passports.value.filter(p => p.status === 'MAINTENANCE').length,
      accident: passports.value.filter(p => (p.accidentLogs && p.accidentLogs.length > 0)).length,
    }));

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

    // Use global getStatusBadge from app.js

    function openMaintenanceRequest(passport) {
      selectedPassport.value = passport;
      requestForm.value = { maintenanceType: 'routine', description: '' };
      showMaintenanceRequestModal.value = true;
    }

    function openMaintenanceLog(passport) {
      selectedPassport.value = passport;
      logForm.value = { maintenanceType: 'routine', description: '', technician: '' };
      showMaintenanceLogModal.value = true;
    }

    function openAccident(passport) {
      selectedPassport.value = passport;
      accidentForm.value = { severity: 'minor', description: '', reporter: props.auth.userId || '' };
      showAccidentModal.value = true;
    }

    function closeModals() {
      showMaintenanceRequestModal.value = false;
      showMaintenanceLogModal.value = false;
      showAccidentModal.value = false;
      selectedPassport.value = null;
    }

    async function submitMaintenanceRequest() {
      submitting.value = true;
      try {
        await props.api.post('/maintenance/' + selectedPassport.value.passportId + '/request', {
          maintenanceType: requestForm.value.maintenanceType,
          description: requestForm.value.description,
        });
        window.$toast('success', '정비 요청이 등록되었습니다.');
        closeModals();
        await fetchPassports();
      } catch (e) {
        window.$toast('error', '정비 요청 실패: ' + e.message);
      } finally {
        submitting.value = false;
      }
    }

    async function submitMaintenanceLog() {
      submitting.value = true;
      try {
        await props.api.post('/maintenance/' + selectedPassport.value.passportId + '/log', {
          maintenanceType: logForm.value.maintenanceType,
          description: logForm.value.description,
          technician: logForm.value.technician,
        });
        window.$toast('success', '정비 완료가 기록되었습니다.');
        closeModals();
        await fetchPassports();
      } catch (e) {
        window.$toast('error', '정비 기록 실패: ' + e.message);
      } finally {
        submitting.value = false;
      }
    }

    async function submitAccident() {
      submitting.value = true;
      try {
        await props.api.post('/maintenance/' + selectedPassport.value.passportId + '/accident', {
          severity: accidentForm.value.severity,
          description: accidentForm.value.description,
          reporter: accidentForm.value.reporter,
        });
        window.$toast('success', '사고가 기록되었습니다.');
        closeModals();
        await fetchPassports();
      } catch (e) {
        window.$toast('error', '사고 기록 실패: ' + e.message);
      } finally {
        submitting.value = false;
      }
    }

    function navigateToDetail(passport) {
      emit('navigate', 'passport-detail', { passportId: passport.passportId });
    }

    function getMaintenanceTypeLabel(val) {
      const found = maintenanceTypes.find(t => t.value === val);
      return found ? found.label : val;
    }

    onMounted(fetchPassports);

    return {
      passports, loading, activeTab, filteredPassports, tabs, tabCounts, submitting,
      showMaintenanceRequestModal, showMaintenanceLogModal, showAccidentModal,
      selectedPassport, requestForm, logForm, accidentForm,
      isEVManufacturer, isService, canRequestMaintenance, canLogMaintenance, canLogAccident,
      maintenanceTypes, severityOptions, statusConfig,
      fetchPassports, getStatusBadge,
      openMaintenanceRequest, openMaintenanceLog, openAccident, closeModals,
      submitMaintenanceRequest, submitMaintenanceLog, submitAccident,
      navigateToDetail, getMaintenanceTypeLabel,
    };
  },
  template: `
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
        </div>
        <div>
          <h1 class="text-xl font-bold text-gray-900">정비 / 서비스</h1>
          <p class="text-gray-500 text-xs mt-0.5">배터리 정비 요청, 완료 기록 및 사고 이력 관리</p>
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
          activeTab === tab.key ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-500']">
          {{ tabCounts[tab.key] }}
        </span>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20">
      <div class="relative">
        <div class="w-10 h-10 rounded-full border-[3px] border-gray-200"></div>
        <div class="absolute inset-0 w-10 h-10 rounded-full border-[3px] border-amber-500 border-t-transparent animate-spin"></div>
      </div>
      <p class="mt-3 text-sm text-gray-500">여권 목록을 불러오고 있습니다...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredPassports.length === 0" class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="flex flex-col items-center justify-center py-16 px-6">
        <div class="w-16 h-16 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
        </div>
        <h3 class="text-base font-semibold text-gray-800 mb-1">현재 정비 이력이 없습니다</h3>
        <p class="text-sm text-gray-500 text-center max-w-md">배터리 여권이 등록되면 정비 이력을 관리할 수 있습니다.</p>
      </div>
    </div>

    <!-- Passport Cards Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div v-for="p in filteredPassports" :key="p.passportId"
        class="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md hover:border-gray-300 transition-all group">
        <!-- Card Header -->
        <div class="px-4 py-3.5 cursor-pointer" @click="navigateToDetail(p)">
          <div class="flex items-start justify-between mb-2">
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-bold text-gray-900 truncate group-hover:text-emerald-600 transition-colors" :title="p.passportId">
                {{ p.passportId }}
              </h3>
              <p class="mt-0.5 text-xs text-gray-400 font-mono">{{ p.serialNumber || '-' }}</p>
            </div>
            <span :class="['inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ml-2 shrink-0', getStatusBadge(p.status).bg]">
              <span :class="['w-1.5 h-1.5 rounded-full mr-1.5', getStatusBadge(p.status).dot]"></span>
              {{ getStatusBadge(p.status).label }}
            </span>
          </div>
          <!-- Stats -->
          <div class="flex items-center gap-5 mt-3 pt-2.5 border-t border-gray-100">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center">
                <svg class="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
              <div>
                <span class="block text-base font-bold text-blue-600 tabular-nums leading-tight">{{ p.maintenanceLogs ? p.maintenanceLogs.length : 0 }}</span>
                <span class="text-[10px] font-medium text-gray-400 uppercase tracking-wider">정비이력</span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <div :class="['w-7 h-7 rounded-md flex items-center justify-center',
                (p.accidentLogs && p.accidentLogs.length > 0) ? 'bg-red-50' : 'bg-gray-50']">
                <svg :class="['w-3.5 h-3.5', (p.accidentLogs && p.accidentLogs.length > 0) ? 'text-red-500' : 'text-gray-400']"
                  fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>
              <div>
                <span :class="['block text-base font-bold tabular-nums leading-tight',
                  (p.accidentLogs && p.accidentLogs.length > 0) ? 'text-red-600' : 'text-gray-300']">
                  {{ p.accidentLogs ? p.accidentLogs.length : 0 }}
                </span>
                <span class="text-[10px] font-medium text-gray-400 uppercase tracking-wider">사고기록</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Card Actions -->
        <div class="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-1.5">
          <button v-if="canRequestMaintenance && p.status === 'ACTIVE'"
            @click.stop="openMaintenanceRequest(p)"
            class="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 transition-colors">
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
            </svg>
            정비 요청
          </button>
          <button v-if="canLogMaintenance && p.status === 'MAINTENANCE'"
            @click.stop="openMaintenanceLog(p)"
            class="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors">
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            정비 완료
          </button>
          <button v-if="canLogAccident"
            @click.stop="openAccident(p)"
            class="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors">
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            사고 기록
          </button>
          <div v-if="!canRequestMaintenance && !canLogMaintenance && !canLogAccident"
            class="text-xs text-gray-400 py-1">작업 권한 없음</div>
        </div>
      </div>
    </div>

    <!-- ==================== MODALS ==================== -->

    <!-- Maintenance Request Modal -->
    <div v-if="showMaintenanceRequestModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen px-4 py-8">
        <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" @click="closeModals"></div>
        <div class="relative bg-white rounded-xl shadow-2xl max-w-md w-full z-10 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <svg class="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                </svg>
              </div>
              <h3 class="text-lg font-bold text-gray-900">정비 요청</h3>
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
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">정비 유형 <span class="text-red-500">*</span></label>
                <div class="grid grid-cols-3 gap-2">
                  <button v-for="t in maintenanceTypes.slice(0,3)" :key="t.value"
                    @click="requestForm.maintenanceType = t.value" type="button"
                    :class="['flex flex-col items-center p-2.5 rounded-lg border-2 transition-all cursor-pointer',
                      requestForm.maintenanceType === t.value
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-gray-200 hover:border-gray-300']">
                    <svg class="w-4 h-4 mb-1" :class="requestForm.maintenanceType === t.value ? 'text-amber-600' : 'text-gray-400'"
                      fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" :d="t.icon"/>
                    </svg>
                    <span :class="['text-xs font-semibold', requestForm.maintenanceType === t.value ? 'text-amber-700' : 'text-gray-600']">{{ t.label }}</span>
                  </button>
                </div>
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">설명 <span class="text-red-500">*</span></label>
                <textarea v-model="requestForm.description" rows="3" placeholder="정비 요청 사유를 입력하세요"
                  class="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none placeholder-gray-400 resize-none"></textarea>
              </div>
            </div>
          </div>
          <div class="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
            <button @click="closeModals"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              취소
            </button>
            <button @click="submitMaintenanceRequest"
              :disabled="!requestForm.description || submitting"
              :class="['px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center',
                (!requestForm.description || submitting) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-amber-600 text-white hover:bg-amber-700']">
              <svg v-if="submitting" class="w-4 h-4 mr-1.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              {{ submitting ? '등록 중...' : '요청 등록' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Maintenance Log Modal -->
    <div v-if="showMaintenanceLogModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen px-4 py-8">
        <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" @click="closeModals"></div>
        <div class="relative bg-white rounded-xl shadow-2xl max-w-md w-full z-10 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <h3 class="text-lg font-bold text-gray-900">정비 완료 기록</h3>
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
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">정비 유형 <span class="text-red-500">*</span></label>
                <div class="grid grid-cols-3 gap-2">
                  <button v-for="t in maintenanceTypes.slice(0,3)" :key="t.value"
                    @click="logForm.maintenanceType = t.value" type="button"
                    :class="['flex flex-col items-center p-2.5 rounded-lg border-2 transition-all cursor-pointer',
                      logForm.maintenanceType === t.value
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300']">
                    <svg class="w-4 h-4 mb-1" :class="logForm.maintenanceType === t.value ? 'text-emerald-600' : 'text-gray-400'"
                      fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" :d="t.icon"/>
                    </svg>
                    <span :class="['text-xs font-semibold', logForm.maintenanceType === t.value ? 'text-emerald-700' : 'text-gray-600']">{{ t.label }}</span>
                  </button>
                </div>
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">설명 <span class="text-red-500">*</span></label>
                <textarea v-model="logForm.description" rows="3" placeholder="수행한 정비 내용을 입력하세요"
                  class="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none placeholder-gray-400 resize-none"></textarea>
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">담당 기술자 <span class="text-red-500">*</span></label>
                <input v-model="logForm.technician" type="text" placeholder="기술자 이름"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none placeholder-gray-400"/>
              </div>
            </div>
          </div>
          <div class="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
            <button @click="closeModals"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              취소
            </button>
            <button @click="submitMaintenanceLog"
              :disabled="!logForm.description || !logForm.technician || submitting"
              :class="['px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center',
                (!logForm.description || !logForm.technician || submitting) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700']">
              <svg v-if="submitting" class="w-4 h-4 mr-1.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              {{ submitting ? '기록 중...' : '완료 기록' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Accident Modal -->
    <div v-if="showAccidentModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen px-4 py-8">
        <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" @click="closeModals"></div>
        <div class="relative bg-white rounded-xl shadow-2xl max-w-md w-full z-10 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                <svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>
              <h3 class="text-lg font-bold text-gray-900">사고 기록</h3>
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
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">심각도 <span class="text-red-500">*</span></label>
                <div class="grid grid-cols-3 gap-2">
                  <button v-for="s in severityOptions" :key="s.value"
                    @click="accidentForm.severity = s.value" type="button"
                    :class="['flex flex-col items-center p-2.5 rounded-lg border-2 transition-all cursor-pointer',
                      accidentForm.severity === s.value
                        ? s.bgClass + ' border-current'
                        : 'border-gray-200 hover:border-gray-300']">
                    <span :class="['w-3 h-3 rounded-full mb-1.5', s.dotClass]"></span>
                    <span class="text-xs font-semibold">{{ s.label }}</span>
                  </button>
                </div>
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">사고 설명 <span class="text-red-500">*</span></label>
                <textarea v-model="accidentForm.description" rows="3" placeholder="사고 상황을 상세히 기술하세요"
                  class="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none placeholder-gray-400 resize-none"></textarea>
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">보고자 <span class="text-red-500">*</span></label>
                <input v-model="accidentForm.reporter" type="text" placeholder="보고자 이름"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none placeholder-gray-400"/>
              </div>
            </div>
          </div>
          <div class="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
            <button @click="closeModals"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              취소
            </button>
            <button @click="submitAccident"
              :disabled="!accidentForm.description || !accidentForm.reporter || submitting"
              :class="['px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center',
                (!accidentForm.description || !accidentForm.reporter || submitting) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700']">
              <svg v-if="submitting" class="w-4 h-4 mr-1.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              {{ submitting ? '기록 중...' : '사고 기록' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  `,
});
