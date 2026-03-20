app.component('maintenance-page', {
  props: ['auth', 'api'],
  emits: ['navigate'],
  setup(props, { emit }) {
    const { ref, computed, onMounted } = Vue;

    const passports = ref([]);
    const loading = ref(false);
    const activeTab = ref('all');

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
      { value: 'routine', label: '정기 점검' },
      { value: 'repair', label: '수리' },
      { value: 'recall', label: '리콜' },
    ];

    const severityOptions = [
      { value: 'minor', label: '경미', color: 'text-yellow-600' },
      { value: 'moderate', label: '보통', color: 'text-orange-600' },
      { value: 'severe', label: '심각', color: 'text-red-600' },
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
      { key: 'all', label: '전체' },
      { key: 'maintenance', label: '정비중' },
      { key: 'accident', label: '사고기록' },
    ];

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
      }
    }

    async function submitMaintenanceLog() {
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
      }
    }

    async function submitAccident() {
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
      }
    }

    function navigateToDetail(passport) {
      emit('navigate', 'passport-detail', { passportId: passport.passportId });
    }

    onMounted(fetchPassports);

    return {
      passports, loading, activeTab, filteredPassports, tabs,
      showMaintenanceRequestModal, showMaintenanceLogModal, showAccidentModal,
      selectedPassport, requestForm, logForm, accidentForm,
      isEVManufacturer, isService, canRequestMaintenance, canLogMaintenance, canLogAccident,
      maintenanceTypes, severityOptions,
      fetchPassports, getStatusBadge, getStatusLabel,
      openMaintenanceRequest, openMaintenanceLog, openAccident, closeModals,
      submitMaintenanceRequest, submitMaintenanceLog, submitAccident,
      navigateToDetail,
    };
  },
  template: `
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">정비 관리</h1>
        <p class="mt-1 text-sm text-gray-500">배터리 정비 요청, 이력 관리 및 사고 기록</p>
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

    <!-- Passport Cards Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="p in filteredPassports" :key="p.passportId"
        class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
        <!-- Card Header -->
        <div class="px-5 py-4 border-b border-gray-100 cursor-pointer" @click="navigateToDetail(p)">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-gray-900 truncate" :title="p.passportId">
              {{ p.passportId }}
            </h3>
            <span :class="['inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', getStatusBadge(p.status)]">
              {{ getStatusLabel(p.status) }}
            </span>
          </div>
          <p class="mt-1 text-xs text-gray-500 font-mono">{{ p.serialNumber || '-' }}</p>
        </div>

        <!-- Card Body -->
        <div class="px-5 py-3">
          <div class="flex items-center justify-between text-sm">
            <div class="flex items-center space-x-4">
              <div class="text-center">
                <span class="block text-lg font-bold text-primary-600">{{ p.maintenanceLogs ? p.maintenanceLogs.length : 0 }}</span>
                <span class="text-xs text-gray-500">정비이력</span>
              </div>
              <div class="text-center">
                <span class="block text-lg font-bold" :class="(p.accidentLogs && p.accidentLogs.length > 0) ? 'text-red-600' : 'text-gray-400'">
                  {{ p.accidentLogs ? p.accidentLogs.length : 0 }}
                </span>
                <span class="text-xs text-gray-500">사고기록</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Card Actions -->
        <div class="px-5 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-2">
          <button v-if="canRequestMaintenance && p.status === 'ACTIVE'"
            @click.stop="openMaintenanceRequest(p)"
            class="px-3 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors">
            정비 요청
          </button>
          <button v-if="canLogMaintenance && p.status === 'MAINTENANCE'"
            @click.stop="openMaintenanceLog(p)"
            class="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
            정비 완료 기록
          </button>
          <button v-if="canLogAccident"
            @click.stop="openAccident(p)"
            class="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
            사고 기록
          </button>
        </div>
      </div>
    </div>

    <!-- Maintenance Request Modal -->
    <div v-if="showMaintenanceRequestModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen px-4">
        <div class="fixed inset-0 bg-black bg-opacity-50" @click="closeModals"></div>
        <div class="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-6 z-10">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-bold text-gray-900">정비 요청</h3>
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
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">정비 유형 *</label>
              <select v-model="requestForm.maintenanceType"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                <option v-for="t in maintenanceTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">설명 *</label>
              <textarea v-model="requestForm.description" rows="3" placeholder="정비 요청 사유를 입력하세요"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"></textarea>
            </div>
          </div>
          <div class="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <button @click="closeModals"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              취소
            </button>
            <button @click="submitMaintenanceRequest"
              :disabled="!requestForm.description"
              :class="['px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors',
                !requestForm.description ? 'bg-gray-300 cursor-not-allowed' : 'bg-yellow-600 hover:bg-yellow-700']">
              요청 등록
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Maintenance Log Modal -->
    <div v-if="showMaintenanceLogModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen px-4">
        <div class="fixed inset-0 bg-black bg-opacity-50" @click="closeModals"></div>
        <div class="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-6 z-10">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-bold text-gray-900">정비 완료 기록</h3>
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
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">정비 유형 *</label>
              <select v-model="logForm.maintenanceType"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                <option v-for="t in maintenanceTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">설명 *</label>
              <textarea v-model="logForm.description" rows="3" placeholder="수행한 정비 내용을 입력하세요"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"></textarea>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">담당 기술자 *</label>
              <input v-model="logForm.technician" type="text" placeholder="기술자 이름"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"/>
            </div>
          </div>
          <div class="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <button @click="closeModals"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              취소
            </button>
            <button @click="submitMaintenanceLog"
              :disabled="!logForm.description || !logForm.technician"
              :class="['px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors',
                (!logForm.description || !logForm.technician) ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700']">
              완료 기록
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Accident Modal -->
    <div v-if="showAccidentModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen px-4">
        <div class="fixed inset-0 bg-black bg-opacity-50" @click="closeModals"></div>
        <div class="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-6 z-10">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-bold text-gray-900">사고 기록</h3>
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
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">심각도 *</label>
              <select v-model="accidentForm.severity"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                <option v-for="s in severityOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">사고 설명 *</label>
              <textarea v-model="accidentForm.description" rows="3" placeholder="사고 상황을 상세히 기술하세요"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"></textarea>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">보고자 *</label>
              <input v-model="accidentForm.reporter" type="text" placeholder="보고자 이름"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"/>
            </div>
          </div>
          <div class="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <button @click="closeModals"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              취소
            </button>
            <button @click="submitAccident"
              :disabled="!accidentForm.description || !accidentForm.reporter"
              :class="['px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors',
                (!accidentForm.description || !accidentForm.reporter) ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700']">
              사고 기록
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  `,
});
