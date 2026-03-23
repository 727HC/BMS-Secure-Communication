app.component('passports-page', {
  props: ['auth', 'api'],
  emits: ['navigate'],
  setup(props, { emit }) {
    const { ref, computed, onMounted } = Vue;

    const passports = ref([]);
    const loading = ref(true);
    const searchQuery = ref('');
    const filterStatus = ref('');
    const showCreateModal = ref(false);
    const creating = ref(false);
    const createStep = ref(1);

    const form = ref(getEmptyForm());

    function getEmptyForm() {
      const ts = Date.now();
      return {
        passportId: 'PASSPORT-' + ts,
        batteryId: 'BATTERY-' + ts,
        did: '',
        model: '',
        serialNumber: '',
        manufacturerName: '',
        manufactureCountry: '',
        cellManufacturer: '',
        cellManufactureCountry: '',
        manufactureDate: '',
        cellType: '',
        chemistry: '',
        cellCount: '',
        weight: '',
        totalEnergy: '',
        energyDensity: '',
        ratedCapacity: '',
        expectedLifespan: '',
        voltageRange: '',
        temperatureRange: '',
      };
    }

    function scaleSOC(val) {
      if (val == null) return null;
      const n = Number(val);
      return n > 100 ? +(n / 655.35).toFixed(1) : +n.toFixed(1);
    }

    const statusOptions = [
      { value: '', label: '전체 상태' },
      { value: 'MANUFACTURED', label: '제조완료' },
      { value: 'ACTIVE', label: '운행중' },
      { value: 'MAINTENANCE', label: '정비중' },
      { value: 'ANALYSIS', label: '분석중' },
      { value: 'RECYCLING', label: '재활용' },
      { value: 'DISPOSED', label: '폐기' },
    ];

    const statusConfig = {
      MANUFACTURED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', label: '제조완료' },
      ACTIVE:       { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', label: '운행중' },
      MAINTENANCE:  { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', label: '정비중' },
      ANALYSIS:     { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500', label: '분석중' },
      RECYCLING:    { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500', label: '재활용' },
      DISPOSED:     { bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200', dot: 'bg-gray-400', label: '폐기' },
    };

    const isManufacturer = computed(() => props.auth.orgMsp === 'ManufacturerMSP');

    const filteredPassports = computed(() => {
      let list = passports.value;
      if (filterStatus.value) {
        list = list.filter(p => p.status === filterStatus.value);
      }
      if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase();
        list = list.filter(p =>
          (p.serialNumber || '').toLowerCase().includes(q) ||
          (p.passportId || '').toLowerCase().includes(q) ||
          (p.model || '').toLowerCase().includes(q) ||
          (p.manufacturerName || '').toLowerCase().includes(q) ||
          (p.vin || '').toLowerCase().includes(q)
        );
      }
      return list;
    });

    /* Wizard step fields count for completion gauge */
    const step1Fields = ['passportId','batteryId','did','model','serialNumber','manufacturerName','manufactureCountry','cellManufacturer','cellManufactureCountry','manufactureDate','cellType','chemistry'];
    const step2Fields = ['cellCount','weight','totalEnergy','energyDensity','ratedCapacity','expectedLifespan','voltageRange','temperatureRange'];
    const allFields = [...step1Fields, ...step2Fields];

    const completionPct = computed(() => {
      let filled = 0;
      allFields.forEach(k => {
        const v = form.value[k];
        if (v != null && v !== '' && v !== 0) filled++;
      });
      return Math.round((filled / allFields.length) * 100);
    });

    function nextStep() {
      if (createStep.value === 1) {
        if (!form.value.model || !form.value.serialNumber || !form.value.manufacturerName) {
          window.$toast('error', '모델, 시리얼번호, 제조사명은 필수입니다.');
          return;
        }
      }
      if (createStep.value < 3) createStep.value++;
    }
    function prevStep() {
      if (createStep.value > 1) createStep.value--;
    }

    async function fetchPassports() {
      loading.value = true;
      try {
        const data = await props.api.get('/passports');
        passports.value = data.records || data || [];
      } catch (e) {
        window.$toast('error', '여권 목록을 불러오지 못했습니다: ' + e.message);
        passports.value = [];
      } finally {
        loading.value = false;
      }
    }

    onMounted(fetchPassports);

    function openCreateModal() {
      form.value = getEmptyForm();
      createStep.value = 1;
      showCreateModal.value = true;
    }

    function closeCreateModal() {
      showCreateModal.value = false;
    }

    async function submitCreate() {
      if (!form.value.serialNumber || !form.value.manufacturerName || !form.value.model) {
        window.$toast('error', '시리얼번호, 제조사명, 모델은 필수입니다.');
        return;
      }
      creating.value = true;
      try {
        const body = { ...form.value };
        ['cellCount', 'weight', 'totalEnergy', 'energyDensity', 'ratedCapacity', 'expectedLifespan'].forEach(k => {
          if (body[k]) body[k] = Number(body[k]);
        });
        await props.api.post('/passports', body);
        window.$toast('success', '배터리 여권이 생성되었습니다.');
        closeCreateModal();
        await fetchPassports();
      } catch (e) {
        window.$toast('error', '여권 생성 실패: ' + e.message);
      } finally {
        creating.value = false;
      }
    }

    function viewDetail(passportId) {
      emit('navigate', 'passport-detail', { passportId });
    }

    function getStatusBadge(status) {
      return statusConfig[status] || statusConfig.DISPOSED;
    }

    function getSocColor(soc) {
      if (soc == null) return 'bg-gray-300';
      if (soc >= 60) return 'bg-emerald-500';
      if (soc >= 30) return 'bg-amber-500';
      return 'bg-red-500';
    }

    return {
      passports, loading, searchQuery, filterStatus, showCreateModal, creating, createStep,
      form, statusOptions, isManufacturer, filteredPassports, scaleSOC, completionPct,
      openCreateModal, closeCreateModal, submitCreate, viewDetail, getStatusBadge, getSocColor,
      nextStep, prevStep,
    };
  },
  template: `
    <div class="space-y-6">
      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-xl font-bold text-gray-900">배터리 여권</h1>
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                {{ filteredPassports.length }}
              </span>
            </div>
            <p class="text-gray-500 text-xs mt-0.5">등록된 배터리 여권을 조회하고 관리합니다</p>
          </div>
        </div>
        <button v-if="isManufacturer" @click="openCreateModal"
          class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg transition-colors shadow-sm">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          여권 발급
        </button>
      </div>

      <!-- Search / Filter Bar -->
      <div class="bg-white rounded-lg border border-gray-200 p-3">
        <div class="flex flex-col sm:flex-row gap-3">
          <div class="relative flex-1">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
            <input v-model="searchQuery" type="text" placeholder="여권ID, 시리얼번호, 모델, 제조사, VIN 검색..."
              class="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm" />
          </div>
          <div class="relative">
            <select v-model="filterStatus"
              class="pl-3 pr-8 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm appearance-none cursor-pointer min-w-[130px]">
              <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
            <div class="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
              <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-20">
        <div class="relative">
          <div class="w-10 h-10 border-4 border-emerald-100 rounded-full"></div>
          <div class="absolute top-0 left-0 w-10 h-10 border-4 border-emerald-600 rounded-full animate-spin border-t-transparent"></div>
        </div>
        <p class="mt-3 text-sm text-gray-500">데이터를 불러오는 중...</p>
      </div>

      <!-- Table -->
      <div v-else-if="filteredPassports.length > 0" class="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-200">
                <th class="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">여권 ID</th>
                <th class="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">시리얼번호</th>
                <th class="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">모델</th>
                <th class="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">제조사</th>
                <th class="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">상태</th>
                <th class="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">SOC</th>
                <th class="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">SOH</th>
                <th class="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">VIN</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(p, idx) in filteredPassports" :key="p.passportId"
                @click="viewDetail(p.passportId)"
                :class="[
                  'cursor-pointer transition-colors duration-100 group',
                  idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50',
                  'hover:bg-emerald-50/60'
                ]">
                <td class="px-4 py-3">
                  <span class="font-mono text-xs text-emerald-600 group-hover:text-emerald-700 font-medium">{{ p.passportId }}</span>
                </td>
                <td class="px-4 py-3">
                  <span class="font-medium text-gray-900">{{ p.serialNumber || '-' }}</span>
                </td>
                <td class="px-4 py-3 text-gray-600">{{ p.model || '-' }}</td>
                <td class="px-4 py-3 text-gray-600">{{ p.manufacturerName || '-' }}</td>
                <td class="px-4 py-3">
                  <span :class="[
                    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border',
                    getStatusBadge(p.status).bg,
                    getStatusBadge(p.status).text,
                    getStatusBadge(p.status).border
                  ]">
                    <span :class="['w-1.5 h-1.5 rounded-full', getStatusBadge(p.status).dot]"></span>
                    {{ getStatusBadge(p.status).label }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <div v-if="p.currentSoc != null" class="flex items-center gap-2 min-w-[100px]">
                    <div class="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div :class="['h-full rounded-full transition-all', getSocColor(scaleSOC(p.currentSoc))]"
                        :style="{ width: Math.min(scaleSOC(p.currentSoc), 100) + '%' }"></div>
                    </div>
                    <span class="text-xs font-semibold text-gray-700 w-10 text-right tabular-nums">{{ scaleSOC(p.currentSoc) }}%</span>
                  </div>
                  <span v-else class="text-gray-300">--</span>
                </td>
                <td class="px-4 py-3">
                  <span v-if="p.currentSoh != null" class="text-sm font-medium text-gray-700 tabular-nums">{{ p.currentSoh }}%</span>
                  <span v-else class="text-gray-300">--</span>
                </td>
                <td class="px-4 py-3">
                  <span v-if="p.vin" class="font-mono text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{{ p.vin }}</span>
                  <span v-else class="text-gray-300">--</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="border-t border-gray-100 bg-gray-50/50 px-4 py-2.5 flex items-center justify-between">
          <span class="text-xs text-gray-500">
            총 <strong class="text-gray-700">{{ filteredPassports.length }}</strong>건
          </span>
          <span class="text-xs text-gray-400">행 클릭 시 상세 보기</span>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="bg-white rounded-lg border border-gray-200 py-16 px-8 text-center">
        <div class="mx-auto w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        </div>
        <h3 class="text-base font-semibold text-gray-700 mb-1">등록된 배터리 여권이 없습니다</h3>
        <p class="text-sm text-gray-400 mb-5">검색 조건을 변경하거나 새 배터리 여권을 발급하세요.</p>
        <button v-if="isManufacturer" @click="openCreateModal"
          class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg transition-colors">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          첫 여권 발급하기
        </button>
      </div>

      <!-- ========== Create Modal — 3-Step Wizard ========== -->
      <teleport to="body">
        <transition name="fade">
          <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-start justify-center pt-8 sm:pt-12 overflow-y-auto">
            <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" @click="closeCreateModal"></div>
            <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 mb-8 border border-gray-200 overflow-hidden">
              <!-- Modal Header -->
              <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
                    </svg>
                  </div>
                  <h2 class="text-lg font-bold text-gray-900">배터리 여권 발급</h2>
                </div>
                <button @click="closeCreateModal" class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-400 hover:text-gray-600">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <!-- Step Indicator -->
              <div class="px-6 py-5 bg-gray-50 border-b border-gray-100">
                <div class="flex items-center justify-center">
                  <!-- Step 1 -->
                  <div class="flex items-center">
                    <div class="flex flex-col items-center">
                      <div :class="[
                        'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all',
                        createStep > 1 ? 'bg-emerald-600 border-emerald-600 text-white' :
                        createStep === 1 ? 'bg-white border-emerald-600 text-emerald-600' :
                        'bg-white border-gray-300 text-gray-400'
                      ]">
                        <svg v-if="createStep > 1" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <span v-else>1</span>
                      </div>
                      <span class="text-xs font-medium mt-1.5" :class="createStep >= 1 ? 'text-emerald-700' : 'text-gray-400'">기본 정보</span>
                    </div>
                  </div>
                  <!-- Line 1-2 -->
                  <div class="w-20 sm:w-28 h-0.5 mx-2 mt-[-18px]" :class="createStep > 1 ? 'bg-emerald-500' : 'bg-gray-300'"></div>
                  <!-- Step 2 -->
                  <div class="flex items-center">
                    <div class="flex flex-col items-center">
                      <div :class="[
                        'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all',
                        createStep > 2 ? 'bg-emerald-600 border-emerald-600 text-white' :
                        createStep === 2 ? 'bg-white border-emerald-600 text-emerald-600' :
                        'bg-white border-gray-300 text-gray-400'
                      ]">
                        <svg v-if="createStep > 2" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <span v-else>2</span>
                      </div>
                      <span class="text-xs font-medium mt-1.5" :class="createStep >= 2 ? 'text-emerald-700' : 'text-gray-400'">기술 사양</span>
                    </div>
                  </div>
                  <!-- Line 2-3 -->
                  <div class="w-20 sm:w-28 h-0.5 mx-2 mt-[-18px]" :class="createStep > 2 ? 'bg-emerald-500' : 'bg-gray-300'"></div>
                  <!-- Step 3 -->
                  <div class="flex items-center">
                    <div class="flex flex-col items-center">
                      <div :class="[
                        'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all',
                        createStep === 3 ? 'bg-white border-emerald-600 text-emerald-600' :
                        'bg-white border-gray-300 text-gray-400'
                      ]">
                        <span>3</span>
                      </div>
                      <span class="text-xs font-medium mt-1.5" :class="createStep >= 3 ? 'text-emerald-700' : 'text-gray-400'">확인 및 생성</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Step 1: 기본 정보 -->
              <div v-if="createStep === 1" class="p-6 space-y-5">
                <div class="flex items-center gap-2 mb-1">
                  <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <h3 class="text-sm font-bold text-gray-800 uppercase tracking-wider">Public Information</h3>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">여권 ID (자동생성)</label>
                    <input v-model="form.passportId" type="text" readonly
                      class="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-400 font-mono" />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">배터리 ID (자동생성)</label>
                    <input v-model="form.batteryId" type="text" readonly
                      class="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-400 font-mono" />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">DID</label>
                    <input v-model="form.did" type="text" placeholder="did:example:..."
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm" />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">모델 <span class="text-red-500">*</span></label>
                    <input v-model="form.model" type="text" placeholder="배터리 모델명"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm" />
                  </div>
                  <div class="sm:col-span-2">
                    <label class="block text-xs font-medium text-gray-500 mb-1">시리얼번호 <span class="text-red-500">*</span></label>
                    <input v-model="form.serialNumber" type="text" placeholder="SN-XXXXX"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm" />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">제조사명 <span class="text-red-500">*</span></label>
                    <input v-model="form.manufacturerName" type="text" placeholder="제조사명"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm" />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">제조국가</label>
                    <input v-model="form.manufactureCountry" type="text" placeholder="KR"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm" />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">셀 제조사</label>
                    <input v-model="form.cellManufacturer" type="text" placeholder="Samsung SDI"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm" />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">셀 제조국가</label>
                    <input v-model="form.cellManufactureCountry" type="text" placeholder="KR"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm" />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">제조일자</label>
                    <input v-model="form.manufactureDate" type="date"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm" />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">셀 유형</label>
                    <select v-model="form.cellType"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm bg-white appearance-none cursor-pointer">
                      <option value="">선택하세요</option>
                      <option value="Prismatic">Prismatic (각형)</option>
                      <option value="Pouch">Pouch (파우치)</option>
                      <option value="Cylindrical">Cylindrical (원통형)</option>
                    </select>
                  </div>
                  <div class="sm:col-span-2">
                    <label class="block text-xs font-medium text-gray-500 mb-1">화학물질</label>
                    <input v-model="form.chemistry" type="text" placeholder="NMC811 / LFP / NCA"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm" />
                  </div>
                </div>
                <!-- Actions -->
                <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button type="button" @click="closeCreateModal"
                    class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors">
                    취소
                  </button>
                  <button type="button" @click="nextStep"
                    class="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm">
                    다음
                    <svg class="w-4 h-4 inline ml-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Step 2: 기술 사양 -->
              <div v-if="createStep === 2" class="p-6 space-y-5">
                <div class="flex items-center gap-2 mb-1">
                  <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/>
                  </svg>
                  <h3 class="text-sm font-bold text-gray-800 uppercase tracking-wider">Technical Specs</h3>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">셀 수</label>
                    <input v-model="form.cellCount" type="number" placeholder="96"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm" />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">무게 (kg)</label>
                    <input v-model="form.weight" type="number" step="0.1" placeholder="450"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm" />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">총 에너지 (kWh)</label>
                    <input v-model="form.totalEnergy" type="number" step="0.1" placeholder="77.4"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm" />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">에너지 밀도 (Wh/kg)</label>
                    <input v-model="form.energyDensity" type="number" step="0.1" placeholder="172"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm" />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">정격 용량 (Ah)</label>
                    <input v-model="form.ratedCapacity" type="number" step="0.1" placeholder="200"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm" />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">예상 수명 (년)</label>
                    <input v-model="form.expectedLifespan" type="number" placeholder="10"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm" />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">전압 범위</label>
                    <div class="flex items-center gap-2">
                      <input v-model="form.voltageRange" type="text" placeholder="300~400"
                        class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm" />
                      <span class="text-sm font-medium text-gray-500 shrink-0">V</span>
                    </div>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">온도 범위</label>
                    <div class="flex items-center gap-2">
                      <input v-model="form.temperatureRange" type="text" placeholder="-20~60"
                        class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm" />
                      <span class="text-sm font-medium text-gray-500 shrink-0">&deg;C</span>
                    </div>
                  </div>
                </div>
                <!-- Actions -->
                <div class="flex justify-between pt-4 border-t border-gray-200">
                  <button type="button" @click="prevStep"
                    class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors">
                    <svg class="w-4 h-4 inline mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
                    </svg>
                    이전
                  </button>
                  <button type="button" @click="nextStep"
                    class="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm">
                    다음
                    <svg class="w-4 h-4 inline ml-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Step 3: 확인 및 생성 -->
              <div v-if="createStep === 3" class="p-6 space-y-6">
                <div class="flex items-center gap-2 mb-1">
                  <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <h3 class="text-sm font-bold text-gray-800 uppercase tracking-wider">Verify &amp; Create</h3>
                </div>

                <!-- Completion Gauge -->
                <div class="flex flex-col items-center py-4">
                  <svg viewBox="0 0 200 200" class="w-40 h-40">
                    <circle cx="100" cy="100" r="80" fill="none" stroke="#e5e7eb" stroke-width="10"/>
                    <circle cx="100" cy="100" r="80" fill="none"
                      stroke="#059669" stroke-width="10" stroke-linecap="round"
                      :stroke-dasharray="2 * Math.PI * 80"
                      :stroke-dashoffset="2 * Math.PI * 80 * (1 - completionPct / 100)"
                      transform="rotate(-90 100 100)"
                      style="transition: stroke-dashoffset 0.6s ease;"/>
                    <text x="100" y="90" text-anchor="middle" dominant-baseline="middle" fill="#6b7280" font-size="14" font-weight="500">Completion</text>
                    <text x="100" y="118" text-anchor="middle" dominant-baseline="middle" fill="#111827" font-size="32" font-weight="700">{{ completionPct }}%</text>
                  </svg>
                </div>

                <!-- Key Specs Summary -->
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50 rounded-xl p-5">
                  <div class="text-center">
                    <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Weight</p>
                    <p class="text-xl font-bold text-gray-900">{{ form.weight || '--' }}<span class="text-sm font-normal text-gray-400 ml-0.5">kg</span></p>
                  </div>
                  <div class="text-center">
                    <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Capacity</p>
                    <p class="text-xl font-bold text-gray-900">{{ form.ratedCapacity || '--' }}<span class="text-sm font-normal text-gray-400 ml-0.5">Ah</span></p>
                  </div>
                  <div class="text-center">
                    <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Energy</p>
                    <p class="text-xl font-bold text-gray-900">{{ form.totalEnergy || '--' }}<span class="text-sm font-normal text-gray-400 ml-0.5">kWh</span></p>
                  </div>
                  <div class="text-center">
                    <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Cells</p>
                    <p class="text-xl font-bold text-gray-900">{{ form.cellCount || '--' }}</p>
                  </div>
                </div>

                <!-- Review Grid -->
                <div class="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div class="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider">입력 데이터 확인</h4>
                  </div>
                  <div class="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    <div class="flex justify-between py-1 border-b border-gray-50">
                      <span class="text-gray-400">모델</span>
                      <span class="text-gray-900 font-medium">{{ form.model || '-' }}</span>
                    </div>
                    <div class="flex justify-between py-1 border-b border-gray-50">
                      <span class="text-gray-400">시리얼번호</span>
                      <span class="text-gray-900 font-medium">{{ form.serialNumber || '-' }}</span>
                    </div>
                    <div class="flex justify-between py-1 border-b border-gray-50">
                      <span class="text-gray-400">제조사</span>
                      <span class="text-gray-900 font-medium">{{ form.manufacturerName || '-' }}</span>
                    </div>
                    <div class="flex justify-between py-1 border-b border-gray-50">
                      <span class="text-gray-400">제조국가</span>
                      <span class="text-gray-900 font-medium">{{ form.manufactureCountry || '-' }}</span>
                    </div>
                    <div class="flex justify-between py-1 border-b border-gray-50">
                      <span class="text-gray-400">셀 제조사</span>
                      <span class="text-gray-900 font-medium">{{ form.cellManufacturer || '-' }}</span>
                    </div>
                    <div class="flex justify-between py-1 border-b border-gray-50">
                      <span class="text-gray-400">셀 유형</span>
                      <span class="text-gray-900 font-medium">{{ form.cellType || '-' }}</span>
                    </div>
                    <div class="flex justify-between py-1 border-b border-gray-50">
                      <span class="text-gray-400">화학물질</span>
                      <span class="text-gray-900 font-medium">{{ form.chemistry || '-' }}</span>
                    </div>
                    <div class="flex justify-between py-1 border-b border-gray-50">
                      <span class="text-gray-400">에너지 밀도</span>
                      <span class="text-gray-900 font-medium">{{ form.energyDensity ? form.energyDensity + ' Wh/kg' : '-' }}</span>
                    </div>
                    <div class="flex justify-between py-1 border-b border-gray-50">
                      <span class="text-gray-400">전압 범위</span>
                      <span class="text-gray-900 font-medium">{{ form.voltageRange ? form.voltageRange + ' V' : '-' }}</span>
                    </div>
                    <div class="flex justify-between py-1 border-b border-gray-50">
                      <span class="text-gray-400">온도 범위</span>
                      <span class="text-gray-900 font-medium">{{ form.temperatureRange ? form.temperatureRange + ' C' : '-' }}</span>
                    </div>
                    <div class="flex justify-between py-1 border-b border-gray-50">
                      <span class="text-gray-400">예상 수명</span>
                      <span class="text-gray-900 font-medium">{{ form.expectedLifespan ? form.expectedLifespan + ' 년' : '-' }}</span>
                    </div>
                    <div class="flex justify-between py-1 border-b border-gray-50">
                      <span class="text-gray-400">DID</span>
                      <span class="text-gray-900 font-medium font-mono text-xs">{{ form.did || '-' }}</span>
                    </div>
                  </div>
                </div>

                <!-- Actions -->
                <div class="flex justify-between pt-4 border-t border-gray-200">
                  <button type="button" @click="prevStep"
                    class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors">
                    <svg class="w-4 h-4 inline mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
                    </svg>
                    이전
                  </button>
                  <div class="flex gap-3">
                    <button type="button" @click="closeCreateModal"
                      class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors">
                      취소
                    </button>
                    <button type="button" @click="submitCreate" :disabled="creating"
                      :class="['px-5 py-2 text-sm font-semibold text-white rounded-lg transition-all',
                        creating ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 shadow-sm']">
                      <span v-if="creating" class="flex items-center gap-2">
                        <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        생성 중...
                      </span>
                      <span v-else>여권 생성</span>
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </transition>
      </teleport>
    </div>
  `
});
