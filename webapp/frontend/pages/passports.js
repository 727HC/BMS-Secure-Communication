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

    // Create form fields
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
      MANUFACTURED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500', label: '제조완료' },
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
      passports, loading, searchQuery, filterStatus, showCreateModal, creating,
      form, statusOptions, isManufacturer, filteredPassports, scaleSOC,
      openCreateModal, closeCreateModal, submitCreate, viewDetail, getStatusBadge, getSocColor,
    };
  },
  template: `
    <div class="min-h-full">
      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
            <svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <div>
            <div class="flex items-center gap-3">
              <h1 class="text-2xl font-bold text-gray-900">배터리 여권 관리</h1>
              <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-primary-100 text-primary-700 border border-primary-200">
                {{ filteredPassports.length }}건
              </span>
            </div>
            <p class="text-gray-500 mt-0.5 text-sm">등록된 배터리 여권을 조회하고 관리합니다</p>
          </div>
        </div>
        <button v-if="isManufacturer" @click="openCreateModal"
          class="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-semibold text-sm rounded-xl transition-all duration-200 shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:-translate-y-0.5">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          여권 생성
        </button>
      </div>

      <!-- Search / Filter Bar -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200/80 p-4 mb-6">
        <div class="flex flex-col sm:flex-row gap-3">
          <div class="relative flex-1">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
            <input v-model="searchQuery" type="text" placeholder="여권ID, 시리얼번호, 모델, 제조사, VIN 검색..."
              class="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm bg-gray-50/50 hover:bg-white transition-colors" />
          </div>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
              </svg>
            </div>
            <select v-model="filterStatus"
              class="pl-9 pr-8 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm bg-gray-50/50 hover:bg-white appearance-none cursor-pointer transition-colors min-w-[140px]">
              <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
            <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
              </svg>
            </div>
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

      <!-- Table -->
      <div v-else-if="filteredPassports.length > 0" class="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50/80 border-b border-gray-200">
                <th class="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">여권 ID</th>
                <th class="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">일련번호</th>
                <th class="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">모델</th>
                <th class="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">제조사</th>
                <th class="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">상태</th>
                <th class="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">SOC</th>
                <th class="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">SOH</th>
                <th class="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">VIN</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(p, idx) in filteredPassports" :key="p.passportId"
                @click="viewDetail(p.passportId)"
                :class="[
                  'cursor-pointer transition-all duration-150 group',
                  idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40',
                  'hover:bg-primary-50/60'
                ]">
                <td class="px-5 py-3.5">
                  <span class="font-mono text-xs text-primary-600 group-hover:text-primary-700 font-medium">{{ p.passportId }}</span>
                </td>
                <td class="px-5 py-3.5">
                  <span class="font-medium text-gray-900">{{ p.serialNumber || '-' }}</span>
                </td>
                <td class="px-5 py-3.5 text-gray-600">{{ p.model || '-' }}</td>
                <td class="px-5 py-3.5 text-gray-600">{{ p.manufacturerName || '-' }}</td>
                <td class="px-5 py-3.5">
                  <span :class="[
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border',
                    getStatusBadge(p.status).bg,
                    getStatusBadge(p.status).text,
                    getStatusBadge(p.status).border
                  ]">
                    <span :class="['w-1.5 h-1.5 rounded-full', getStatusBadge(p.status).dot]"></span>
                    {{ getStatusBadge(p.status).label }}
                  </span>
                </td>
                <td class="px-5 py-3.5">
                  <div v-if="p.currentSoc != null" class="flex items-center gap-2.5 min-w-[100px]">
                    <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div :class="['h-full rounded-full transition-all duration-500', getSocColor(scaleSOC(p.currentSoc))]"
                        :style="{ width: Math.min(scaleSOC(p.currentSoc), 100) + '%' }"></div>
                    </div>
                    <span class="text-xs font-semibold text-gray-700 w-10 text-right tabular-nums">{{ scaleSOC(p.currentSoc) }}%</span>
                  </div>
                  <span v-else class="text-gray-300">--</span>
                </td>
                <td class="px-5 py-3.5">
                  <span v-if="p.currentSoh != null" class="text-sm font-medium text-gray-700 tabular-nums">{{ p.currentSoh }}%</span>
                  <span v-else class="text-gray-300">--</span>
                </td>
                <td class="px-5 py-3.5">
                  <span v-if="p.vin" class="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{{ p.vin }}</span>
                  <span v-else class="text-gray-300">--</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="border-t border-gray-100 bg-gray-50/50 px-5 py-3 flex items-center justify-between">
          <span class="text-xs text-gray-500">
            총 <strong class="text-gray-700">{{ filteredPassports.length }}</strong>건 조회됨
          </span>
          <span class="text-xs text-gray-400">행을 클릭하여 상세 보기</span>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="bg-white rounded-xl shadow-sm border border-gray-200/80 py-20 px-8 text-center">
        <div class="mx-auto w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-5">
          <svg class="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9.75m10.5-6H18m-4.5 0h-1.5m-3 0H7.5m10.5 6H15m-1.5 0h-1.5m-3 0H7.5m6.75-9v6m-3-3h6"/>
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-700 mb-1">등록된 여권이 없습니다</h3>
        <p class="text-sm text-gray-400 mb-6">검색 조건을 변경하거나, 새 배터리 여권을 생성하세요.</p>
        <button v-if="isManufacturer" @click="openCreateModal"
          class="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm rounded-xl transition-colors">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          첫 여권 생성하기
        </button>
      </div>

      <!-- ========== Create Modal ========== -->
      <teleport to="body">
        <transition name="fade">
          <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-start justify-center pt-8 sm:pt-16 overflow-y-auto">
            <!-- Backdrop -->
            <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" @click="closeCreateModal"></div>
            <!-- Modal Content -->
            <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 mb-8 border border-gray-200/50 overflow-hidden">
              <!-- Modal Header -->
              <div class="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center">
                    <svg class="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
                    </svg>
                  </div>
                  <h2 class="text-lg font-bold text-gray-900">배터리 여권 생성</h2>
                </div>
                <button @click="closeCreateModal" class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-400 hover:text-gray-600">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <form @submit.prevent="submitCreate" class="p-6 space-y-8">
                <!-- Section: 기본정보 -->
                <div>
                  <div class="flex items-center gap-2 mb-4">
                    <svg class="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <h3 class="text-sm font-bold text-gray-800 uppercase tracking-wider">기본정보</h3>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-xs font-medium text-gray-500 mb-1.5">여권 ID (자동생성)</label>
                      <input v-model="form.passportId" type="text" readonly
                        class="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-400 font-mono" />
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-500 mb-1.5">배터리 ID (자동생성)</label>
                      <input v-model="form.batteryId" type="text" readonly
                        class="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-400 font-mono" />
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-500 mb-1.5">DID</label>
                      <input v-model="form.did" type="text" placeholder="did:example:..."
                        class="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm hover:border-gray-400 transition-colors" />
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-500 mb-1.5">모델 <span class="text-red-500">*</span></label>
                      <input v-model="form.model" type="text" placeholder="배터리 모델명"
                        class="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm hover:border-gray-400 transition-colors" />
                    </div>
                    <div class="sm:col-span-2">
                      <label class="block text-xs font-medium text-gray-500 mb-1.5">시리얼번호 <span class="text-red-500">*</span></label>
                      <input v-model="form.serialNumber" type="text" placeholder="SN-XXXXX"
                        class="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm hover:border-gray-400 transition-colors" />
                    </div>
                  </div>
                </div>

                <!-- Divider -->
                <div class="border-t border-gray-100"></div>

                <!-- Section: 제조정보 -->
                <div>
                  <div class="flex items-center gap-2 mb-4">
                    <svg class="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
                    </svg>
                    <h3 class="text-sm font-bold text-gray-800 uppercase tracking-wider">제조정보</h3>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-xs font-medium text-gray-500 mb-1.5">제조사명 <span class="text-red-500">*</span></label>
                      <input v-model="form.manufacturerName" type="text" placeholder="제조사명"
                        class="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm hover:border-gray-400 transition-colors" />
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-500 mb-1.5">제조국가</label>
                      <input v-model="form.manufactureCountry" type="text" placeholder="KR"
                        class="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm hover:border-gray-400 transition-colors" />
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-500 mb-1.5">셀 제조사</label>
                      <input v-model="form.cellManufacturer" type="text" placeholder="셀 제조사명 (예: Samsung SDI)"
                        class="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm hover:border-gray-400 transition-colors" />
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-500 mb-1.5">셀 제조국가</label>
                      <input v-model="form.cellManufactureCountry" type="text" placeholder="셀 제조 국가코드 (예: KR)"
                        class="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm hover:border-gray-400 transition-colors" />
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-500 mb-1.5">제조일자</label>
                      <input v-model="form.manufactureDate" type="date"
                        class="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm hover:border-gray-400 transition-colors" />
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-500 mb-1.5">셀 유형</label>
                      <input v-model="form.cellType" type="text" placeholder="Pouch / Prismatic / Cylindrical"
                        class="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm hover:border-gray-400 transition-colors" />
                    </div>
                    <div class="sm:col-span-2">
                      <label class="block text-xs font-medium text-gray-500 mb-1.5">화학물질</label>
                      <input v-model="form.chemistry" type="text" placeholder="NMC811 / LFP / NCA"
                        class="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm hover:border-gray-400 transition-colors" />
                    </div>
                  </div>
                </div>

                <!-- Divider -->
                <div class="border-t border-gray-100"></div>

                <!-- Section: 기술스펙 -->
                <div>
                  <div class="flex items-center gap-2 mb-4">
                    <svg class="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/>
                    </svg>
                    <h3 class="text-sm font-bold text-gray-800 uppercase tracking-wider">기술 스펙</h3>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label class="block text-xs font-medium text-gray-500 mb-1.5">셀 수</label>
                      <input v-model="form.cellCount" type="number" placeholder="96"
                        class="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm hover:border-gray-400 transition-colors" />
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-500 mb-1.5">무게 (kg)</label>
                      <input v-model="form.weight" type="number" step="0.1" placeholder="450"
                        class="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm hover:border-gray-400 transition-colors" />
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-500 mb-1.5">총 에너지 (kWh)</label>
                      <input v-model="form.totalEnergy" type="number" step="0.1" placeholder="77.4"
                        class="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm hover:border-gray-400 transition-colors" />
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-500 mb-1.5">에너지 밀도 (Wh/kg)</label>
                      <input v-model="form.energyDensity" type="number" step="0.1" placeholder="172"
                        class="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm hover:border-gray-400 transition-colors" />
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-500 mb-1.5">정격 용량 (Ah)</label>
                      <input v-model="form.ratedCapacity" type="number" step="0.1" placeholder="200"
                        class="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm hover:border-gray-400 transition-colors" />
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-500 mb-1.5">예상 수명 (년)</label>
                      <input v-model="form.expectedLifespan" type="number" placeholder="10"
                        class="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm hover:border-gray-400 transition-colors" />
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-500 mb-1.5">전압 범위</label>
                      <div class="flex items-center gap-2">
                        <input v-model="form.voltageRange" type="text" placeholder="300~400"
                          class="flex-1 px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm hover:border-gray-400 transition-colors" />
                        <span class="text-sm font-medium text-gray-500">V</span>
                      </div>
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-500 mb-1.5">온도 범위</label>
                      <div class="flex items-center gap-2">
                        <input v-model="form.temperatureRange" type="text" placeholder="-20~60"
                          class="flex-1 px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm hover:border-gray-400 transition-colors" />
                        <span class="text-sm font-medium text-gray-500">&deg;C</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Actions -->
                <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button type="button" @click="closeCreateModal"
                    class="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl transition-colors">
                    취소
                  </button>
                  <button type="submit" :disabled="creating"
                    :class="['px-6 py-2.5 text-sm font-semibold text-white rounded-xl transition-all duration-200',
                      creating ? 'bg-primary-400 cursor-not-allowed' : 'bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-lg shadow-primary-500/25']">
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
              </form>
            </div>
          </div>
        </transition>
      </teleport>
    </div>
  `
});
