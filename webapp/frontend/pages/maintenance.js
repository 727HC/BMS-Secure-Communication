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

    const isEVManufacturer = computed(() => props.auth.orgMsp === 'EVManufacturerMSP');
    const isService = computed(() => props.auth.orgMsp === 'ServiceMSP');
    const canRequestMaintenance = computed(() => isEVManufacturer.value);
    const canLogMaintenance = computed(() => isService.value);
    const canLogAccident = computed(() => isEVManufacturer.value || isService.value);

    const maintenanceTypes = [
      { value: 'routine', label: '정기점검', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', color: 'blue' },
      { value: 'repair', label: '수리', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', color: 'amber' },
      { value: 'recall', label: '리콜', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', color: 'red' },
    ];

    const severityOptions = [
      { value: 'minor', label: '경미', color: 'emerald', bgClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotClass: 'bg-emerald-500' },
      { value: 'moderate', label: '보통', color: 'amber', bgClass: 'bg-amber-50 text-amber-700 border-amber-200', dotClass: 'bg-amber-500' },
      { value: 'severe', label: '심각', color: 'red', bgClass: 'bg-red-50 text-red-700 border-red-200', dotClass: 'bg-red-500' },
    ];

    // Forms
    const requestForm = ref({ maintenanceType: 'routine', description: '' });
    const logForm = ref({ maintenanceType: 'routine', description: '', technician: '' });
    const accidentForm = ref({ severity: 'minor', description: '', reporter: '' });

    const filteredPassports = computed(() => {
      if (activeTab.value === 'maintenance') {
        return passports.value.filter(p => p.status === 'MAINTENANCE');
      }
      if (activeTab.value === 'accident') {
        return passports.value.filter(p => (p.accidentLogs && p.accidentLogs.length > 0));
      }
      return passports.value;
    });

    const tabs = [
      { key: 'all', label: '전체', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
      { key: 'maintenance', label: '정비중', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
      { key: 'accident', label: '사고기록', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    ];

    const tabCounts = computed(() => ({
      all: passports.value.length,
      maintenance: passports.value.filter(p => p.status === 'MAINTENANCE').length,
      accident: passports.value.filter(p => (p.accidentLogs && p.accidentLogs.length > 0)).length,
    }));

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

    function getStatusBadge(status) {
      const map = {
        ACTIVE: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        MAINTENANCE: 'bg-amber-50 text-amber-700 border border-amber-200',
        RECALLED: 'bg-red-50 text-red-700 border border-red-200',
        DISPOSED: 'bg-gray-100 text-gray-600 border border-gray-200',
        RECYCLING: 'bg-blue-50 text-blue-700 border border-blue-200',
      };
      return map[status] || 'bg-gray-100 text-gray-600 border border-gray-200';
    }

    function getStatusDot(status) {
      const map = {
        ACTIVE: 'bg-emerald-500',
        MAINTENANCE: 'bg-amber-500',
        RECALLED: 'bg-red-500',
        DISPOSED: 'bg-gray-400',
        RECYCLING: 'bg-blue-500',
      };
      return map[status] || 'bg-gray-400';
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

    function getSeverityBadge(val) {
      const found = severityOptions.find(s => s.value === val);
      return found || severityOptions[0];
    }

    onMounted(fetchPassports);

    return {
      passports, loading, activeTab, filteredPassports, tabs, tabCounts, submitting,
      showMaintenanceRequestModal, showMaintenanceLogModal, showAccidentModal,
      selectedPassport, requestForm, logForm, accidentForm,
      isEVManufacturer, isService, canRequestMaintenance, canLogMaintenance, canLogAccident,
      maintenanceTypes, severityOptions,
      fetchPassports, getStatusBadge, getStatusDot, getStatusLabel,
      openMaintenanceRequest, openMaintenanceLog, openAccident, closeModals,
      submitMaintenanceRequest, submitMaintenanceLog, submitAccident,
      navigateToDetail, getMaintenanceTypeLabel, getSeverityBadge,
    };
  },
  template: `
  <div class="min-h-screen">
    <!-- Page Header -->
    <div class="mb-8">
      <div class="flex items-start justify-between">
        <div class="flex items-center space-x-4">
          <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <div>
            <h1 class="text-2xl font-bold text-gray-900 tracking-tight">정비 관리</h1>
            <p class="mt-1 text-sm text-gray-500">배터리 정비 요청, 완료 기록 및 사고 이력 관리</p>
          </div>
        </div>
        <button @click="fetchPassports"
          class="inline-flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm">
          <svg class="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          새로고침
        </button>
      </div>
    </div>

    <!-- Filter Tabs -->
    <div class="flex items-center space-x-1 mb-6 bg-gray-100/80 rounded-xl p-1.5 w-fit border border-gray-200/50">
      <button v-for="tab in tabs" :key="tab.key" @click="activeTab = tab.key"
        :class="['flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
          activeTab === tab.key
            ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50'
            : 'text-gray-500 hover:text-gray-700 hover:bg-white/50']">
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" :d="tab.icon"/>
        </svg>
        {{ tab.label }}
        <span :class="['ml-2 text-xs font-semibold px-1.5 py-0.5 rounded-full',
          activeTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500']">
          {{ tabCounts[tab.key] }}
        </span>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden">
      <div class="flex flex-col items-center justify-center py-20">
        <div class="relative">
          <div class="w-12 h-12 rounded-full border-[3px] border-gray-200"></div>
          <div class="absolute inset-0 w-12 h-12 rounded-full border-[3px] border-amber-500 border-t-transparent animate-spin"></div>
        </div>
        <p class="mt-4 text-sm font-medium text-gray-500">여권 목록을 불러오고 있습니다...</p>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredPassports.length === 0" class="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden">
      <div class="flex flex-col items-center justify-center py-20 px-6">
        <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center mb-6">
          <svg class="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-800 mb-2">{{ activeTab === 'all' ? '등록된 정비 이력이 없습니다.' : '해당 조건의 정비 이력이 없습니다.' }}</h3>
        <p class="text-sm text-gray-500 text-center max-w-md">{{ activeTab === 'all' ? '배터리 여권이 등록되면 정비 이력을 관리할 수 있습니다.' : '현재 필터 조건에 맞는 배터리 여권이 존재하지 않습니다.' }}</p>
      </div>
    </div>

    <!-- Passport Cards Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <div v-for="p in filteredPassports" :key="p.passportId"
        class="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden hover:shadow-lg hover:border-gray-300/80 transition-all duration-300 group">
        <!-- Card Header -->
        <div class="px-5 py-4 cursor-pointer" @click="navigateToDetail(p)">
          <div class="flex items-start justify-between mb-3">
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors duration-200" :title="p.passportId">
                {{ p.passportId }}
              </h3>
              <p class="mt-1 text-xs text-gray-400 font-mono">{{ p.serialNumber || '-' }}</p>
            </div>
            <span :class="['inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ml-3 shrink-0', getStatusBadge(p.status)]">
              <span :class="['w-1.5 h-1.5 rounded-full mr-1.5', getStatusDot(p.status)]"></span>
              {{ getStatusLabel(p.status) }}
            </span>
          </div>
          <!-- Stats -->
          <div class="flex items-center space-x-6 mt-4 pt-3 border-t border-gray-100">
            <div class="flex items-center space-x-2">
              <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
              <div>
                <span class="block text-lg font-bold text-blue-600 tabular-nums leading-tight">{{ p.maintenanceLogs ? p.maintenanceLogs.length : 0 }}</span>
                <span class="text-[10px] font-medium text-gray-400 uppercase tracking-wider">정비이력</span>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <div :class="['w-8 h-8 rounded-lg flex items-center justify-center',
                (p.accidentLogs && p.accidentLogs.length > 0) ? 'bg-red-50' : 'bg-gray-50']">
                <svg :class="['w-4 h-4', (p.accidentLogs && p.accidentLogs.length > 0) ? 'text-red-500' : 'text-gray-400']"
                  fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>
              <div>
                <span :class="['block text-lg font-bold tabular-nums leading-tight',
                  (p.accidentLogs && p.accidentLogs.length > 0) ? 'text-red-600' : 'text-gray-300']">
                  {{ p.accidentLogs ? p.accidentLogs.length : 0 }}
                </span>
                <span class="text-[10px] font-medium text-gray-400 uppercase tracking-wider">사고기록</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Card Actions -->
        <div class="px-5 py-3.5 bg-gradient-to-r from-gray-50 to-gray-50/50 border-t border-gray-100 flex flex-wrap gap-2">
          <button v-if="canRequestMaintenance && p.status === 'ACTIVE'"
            @click.stop="openMaintenanceRequest(p)"
            class="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 hover:border-amber-300 transition-all duration-200">
            <svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
            </svg>
            정비 요청
          </button>
          <button v-if="canLogMaintenance && p.status === 'MAINTENANCE'"
            @click.stop="openMaintenanceLog(p)"
            class="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 hover:border-emerald-300 transition-all duration-200">
            <svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            정비 완료
          </button>
          <button v-if="canLogAccident"
            @click.stop="openAccident(p)"
            class="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-all duration-200">
            <svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
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
        <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" @click="closeModals"></div>
        <div class="relative bg-white rounded-2xl shadow-2xl max-w-md w-full z-10 overflow-hidden">
          <!-- Header -->
          <div class="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-white">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div class="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                  <svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
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
          </div>
          <!-- Body -->
          <div class="px-6 py-5">
            <div class="mb-5 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">대상 여권</p>
              <p class="text-sm font-mono font-semibold text-gray-900">{{ selectedPassport?.passportId }}</p>
            </div>
            <div class="space-y-5">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">정비 유형 <span class="text-red-500">*</span></label>
                <div class="grid grid-cols-3 gap-2">
                  <button v-for="t in maintenanceTypes" :key="t.value"
                    @click="requestForm.maintenanceType = t.value"
                    :class="['flex flex-col items-center p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer',
                      requestForm.maintenanceType === t.value
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50']">
                    <svg class="w-5 h-5 mb-1.5" :class="requestForm.maintenanceType === t.value ? 'text-blue-600' : 'text-gray-400'"
                      fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" :d="t.icon"/>
                    </svg>
                    <span :class="['text-xs font-semibold', requestForm.maintenanceType === t.value ? 'text-blue-700' : 'text-gray-600']">{{ t.label }}</span>
                  </button>
                </div>
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1.5">설명 <span class="text-red-500">*</span></label>
                <textarea v-model="requestForm.description" rows="3" placeholder="정비 요청 사유를 입력하세요"
                  class="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-gray-400 resize-none"></textarea>
              </div>
            </div>
          </div>
          <!-- Footer -->
          <div class="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end space-x-3">
            <button @click="closeModals"
              class="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200">
              취소
            </button>
            <button @click="submitMaintenanceRequest"
              :disabled="!requestForm.description || submitting"
              :class="['px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center',
                (!requestForm.description || submitting) ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' : 'bg-amber-600 text-white hover:bg-amber-700 shadow-sm hover:shadow-md']">
              <svg v-if="submitting" class="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
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
        <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" @click="closeModals"></div>
        <div class="relative bg-white rounded-2xl shadow-2xl max-w-md w-full z-10 overflow-hidden">
          <!-- Header -->
          <div class="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-white">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div class="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
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
          </div>
          <!-- Body -->
          <div class="px-6 py-5">
            <div class="mb-5 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">대상 여권</p>
              <p class="text-sm font-mono font-semibold text-gray-900">{{ selectedPassport?.passportId }}</p>
            </div>
            <div class="space-y-5">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">정비 유형 <span class="text-red-500">*</span></label>
                <div class="grid grid-cols-3 gap-2">
                  <button v-for="t in maintenanceTypes" :key="t.value"
                    @click="logForm.maintenanceType = t.value"
                    :class="['flex flex-col items-center p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer',
                      logForm.maintenanceType === t.value
                        ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50']">
                    <svg class="w-5 h-5 mb-1.5" :class="logForm.maintenanceType === t.value ? 'text-emerald-600' : 'text-gray-400'"
                      fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" :d="t.icon"/>
                    </svg>
                    <span :class="['text-xs font-semibold', logForm.maintenanceType === t.value ? 'text-emerald-700' : 'text-gray-600']">{{ t.label }}</span>
                  </button>
                </div>
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1.5">설명 <span class="text-red-500">*</span></label>
                <textarea v-model="logForm.description" rows="3" placeholder="수행한 정비 내용을 입력하세요"
                  class="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 placeholder-gray-400 resize-none"></textarea>
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1.5">담당 기술자 <span class="text-red-500">*</span></label>
                <input v-model="logForm.technician" type="text" placeholder="기술자 이름"
                  class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 placeholder-gray-400"/>
              </div>
            </div>
          </div>
          <!-- Footer -->
          <div class="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end space-x-3">
            <button @click="closeModals"
              class="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200">
              취소
            </button>
            <button @click="submitMaintenanceLog"
              :disabled="!logForm.description || !logForm.technician || submitting"
              :class="['px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center',
                (!logForm.description || !logForm.technician || submitting) ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm hover:shadow-md']">
              <svg v-if="submitting" class="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
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
        <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" @click="closeModals"></div>
        <div class="relative bg-white rounded-2xl shadow-2xl max-w-md w-full z-10 overflow-hidden">
          <!-- Header -->
          <div class="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-red-50 to-white">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div class="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
                  <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
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
          </div>
          <!-- Body -->
          <div class="px-6 py-5">
            <div class="mb-5 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">대상 여권</p>
              <p class="text-sm font-mono font-semibold text-gray-900">{{ selectedPassport?.passportId }}</p>
            </div>
            <div class="space-y-5">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">심각도 <span class="text-red-500">*</span></label>
                <div class="grid grid-cols-3 gap-2">
                  <button v-for="s in severityOptions" :key="s.value"
                    @click="accidentForm.severity = s.value"
                    :class="['flex flex-col items-center p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer',
                      accidentForm.severity === s.value
                        ? 'border-' + s.color + '-500 shadow-sm ' + s.bgClass
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50']">
                    <span :class="['w-3 h-3 rounded-full mb-2', s.dotClass]"></span>
                    <span :class="['text-xs font-semibold', accidentForm.severity === s.value ? 'text-' + s.color + '-700' : 'text-gray-600']">{{ s.label }}</span>
                  </button>
                </div>
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1.5">사고 설명 <span class="text-red-500">*</span></label>
                <textarea v-model="accidentForm.description" rows="3" placeholder="사고 상황을 상세히 기술하세요"
                  class="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 placeholder-gray-400 resize-none"></textarea>
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1.5">보고자 <span class="text-red-500">*</span></label>
                <input v-model="accidentForm.reporter" type="text" placeholder="보고자 이름"
                  class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 placeholder-gray-400"/>
              </div>
            </div>
          </div>
          <!-- Footer -->
          <div class="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end space-x-3">
            <button @click="closeModals"
              class="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200">
              취소
            </button>
            <button @click="submitAccident"
              :disabled="!accidentForm.description || !accidentForm.reporter || submitting"
              :class="['px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center',
                (!accidentForm.description || !accidentForm.reporter || submitting) ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' : 'bg-red-600 text-white hover:bg-red-700 shadow-sm hover:shadow-md']">
              <svg v-if="submitting" class="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
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
