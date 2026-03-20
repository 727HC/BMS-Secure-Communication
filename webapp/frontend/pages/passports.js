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

    const statusOptions = [
      { value: '', label: '전체' },
      { value: 'MANUFACTURED', label: 'MANUFACTURED' },
      { value: 'ACTIVE', label: 'ACTIVE' },
      { value: 'MAINTENANCE', label: 'MAINTENANCE' },
      { value: 'ANALYSIS', label: 'ANALYSIS' },
      { value: 'RECYCLING', label: 'RECYCLING' },
      { value: 'DISPOSED', label: 'DISPOSED' },
    ];

    const statusColors = {
      MANUFACTURED: 'bg-blue-100 text-blue-800',
      ACTIVE: 'bg-green-100 text-green-800',
      MAINTENANCE: 'bg-yellow-100 text-yellow-800',
      ANALYSIS: 'bg-purple-100 text-purple-800',
      RECYCLING: 'bg-orange-100 text-orange-800',
      DISPOSED: 'bg-gray-100 text-gray-800',
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
          (p.manufacturerName || '').toLowerCase().includes(q)
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
        // Convert numeric fields
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

    function getStatusColor(status) {
      return statusColors[status] || 'bg-gray-100 text-gray-800';
    }

    return {
      passports, loading, searchQuery, filterStatus, showCreateModal, creating,
      form, statusOptions, isManufacturer, filteredPassports,
      openCreateModal, closeCreateModal, submitCreate, viewDetail, getStatusColor,
    };
  },
  template: `
    <div>
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">배터리 여권 목록</h1>
          <p class="text-gray-500 mt-1">등록된 배터리 여권을 조회하고 관리합니다.</p>
        </div>
        <button v-if="isManufacturer" @click="openCreateModal"
          class="inline-flex items-center px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm rounded-lg transition-colors">
          + 여권 생성
        </button>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div class="flex flex-col sm:flex-row gap-3">
          <input v-model="searchQuery" type="text" placeholder="시리얼번호, 여권ID, 모델, 제조사 검색..."
            class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
          <select v-model="filterStatus"
            class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm bg-white">
            <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-20">
        <svg class="animate-spin h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
      </div>

      <!-- Table -->
      <div v-else-if="filteredPassports.length > 0" class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="text-left px-4 py-3 font-semibold text-gray-600">여권 ID</th>
                <th class="text-left px-4 py-3 font-semibold text-gray-600">시리얼번호</th>
                <th class="text-left px-4 py-3 font-semibold text-gray-600">모델</th>
                <th class="text-left px-4 py-3 font-semibold text-gray-600">제조사</th>
                <th class="text-left px-4 py-3 font-semibold text-gray-600">상태</th>
                <th class="text-left px-4 py-3 font-semibold text-gray-600">SOC</th>
                <th class="text-left px-4 py-3 font-semibold text-gray-600">SOH</th>
                <th class="text-left px-4 py-3 font-semibold text-gray-600">VIN</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="p in filteredPassports" :key="p.passportId"
                @click="viewDetail(p.passportId)"
                class="hover:bg-gray-50 cursor-pointer transition-colors">
                <td class="px-4 py-3 font-mono text-xs text-primary-600">{{ p.passportId }}</td>
                <td class="px-4 py-3 font-medium text-gray-900">{{ p.serialNumber || '-' }}</td>
                <td class="px-4 py-3 text-gray-700">{{ p.model || '-' }}</td>
                <td class="px-4 py-3 text-gray-700">{{ p.manufacturerName || '-' }}</td>
                <td class="px-4 py-3">
                  <span :class="['inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold', getStatusColor(p.status)]">
                    {{ p.status || '-' }}
                  </span>
                </td>
                <td class="px-4 py-3 text-gray-700">{{ p.currentSoc != null ? (p.currentSoc > 100 ? (p.currentSoc / 655.35).toFixed(1) : p.currentSoc) + '%' : '-' }}</td>
                <td class="px-4 py-3 text-gray-700">{{ p.currentSoh != null ? p.currentSoh + '%' : '-' }}</td>
                <td class="px-4 py-3 font-mono text-xs text-gray-500">{{ p.vin || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="border-t border-gray-200 px-4 py-3 text-sm text-gray-500">
          총 {{ filteredPassports.length }}건
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <p class="text-gray-400 text-lg">조회된 여권이 없습니다.</p>
      </div>

      <!-- Create Modal -->
      <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50" @click="closeCreateModal"></div>
        <!-- Modal Content -->
        <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4">
          <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
            <h2 class="text-lg font-bold text-gray-900">배터리 여권 생성</h2>
            <button @click="closeCreateModal" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>

          <form @submit.prevent="submitCreate" class="p-6 space-y-6">
            <!-- 기본정보 -->
            <div>
              <h3 class="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">기본정보</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">여권 ID (자동생성)</label>
                  <input v-model="form.passportId" type="text" readonly
                    class="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-500" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">배터리 ID (자동생성)</label>
                  <input v-model="form.batteryId" type="text" readonly
                    class="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-500" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">DID</label>
                  <input v-model="form.did" type="text" placeholder="did:example:..."
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">모델 *</label>
                  <input v-model="form.model" type="text" placeholder="배터리 모델명"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
                </div>
                <div class="sm:col-span-2">
                  <label class="block text-xs font-medium text-gray-500 mb-1">시리얼번호 *</label>
                  <input v-model="form.serialNumber" type="text" placeholder="SN-XXXXX"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
                </div>
              </div>
            </div>

            <!-- 제조정보 -->
            <div>
              <h3 class="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">제조정보</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">제조사명 *</label>
                  <input v-model="form.manufacturerName" type="text" placeholder="제조사명"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">제조국가</label>
                  <input v-model="form.manufactureCountry" type="text" placeholder="KR"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">셀 제조사</label>
                  <input v-model="form.cellManufacturer" type="text" placeholder="셀 제조사명"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">셀 제조국가</label>
                  <input v-model="form.cellManufactureCountry" type="text" placeholder="KR"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">제조일자</label>
                  <input v-model="form.manufactureDate" type="date"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">셀 유형</label>
                  <input v-model="form.cellType" type="text" placeholder="Pouch / Prismatic / Cylindrical"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
                </div>
                <div class="sm:col-span-2">
                  <label class="block text-xs font-medium text-gray-500 mb-1">화학물질</label>
                  <input v-model="form.chemistry" type="text" placeholder="NMC811 / LFP / NCA"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
                </div>
              </div>
            </div>

            <!-- 스펙 -->
            <div>
              <h3 class="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">기술 스펙</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">셀 수</label>
                  <input v-model="form.cellCount" type="number" placeholder="96"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">무게 (kg)</label>
                  <input v-model="form.weight" type="number" step="0.1" placeholder="450"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">총 에너지 (kWh)</label>
                  <input v-model="form.totalEnergy" type="number" step="0.1" placeholder="77.4"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">에너지 밀도 (Wh/kg)</label>
                  <input v-model="form.energyDensity" type="number" step="0.1" placeholder="172"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">정격 용량 (Ah)</label>
                  <input v-model="form.ratedCapacity" type="number" step="0.1" placeholder="200"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">예상 수명 (년)</label>
                  <input v-model="form.expectedLifespan" type="number" placeholder="10"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">전압 범위</label>
                  <input v-model="form.voltageRange" type="text" placeholder="300-400V"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">온도 범위</label>
                  <input v-model="form.temperatureRange" type="text" placeholder="-20~60C"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button type="button" @click="closeCreateModal"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                취소
              </button>
              <button type="submit" :disabled="creating"
                :class="['px-6 py-2 text-sm font-medium text-white rounded-lg transition-colors',
                  creating ? 'bg-primary-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700']">
                {{ creating ? '생성 중...' : '여권 생성' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
});
