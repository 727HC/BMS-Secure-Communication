app.component('materials-page', {
  props: ['auth', 'api'],
  emits: ['navigate'],
  setup(props, { emit }) {
    const { ref, computed, onMounted } = Vue;

    const materials = ref([]);
    const loading = ref(false);
    const showModal = ref(false);
    const submitting = ref(false);
    const searchQuery = ref('');

    const isManufacturer = computed(() => props.auth.orgMsp === 'ManufacturerMSP');

    const form = ref({
      materialId: '',
      name: '',
      origin: '',
      supplier: '',
      quantity: '',
      unit: 'kg',
      certificationId: '',
    });

    function generateMaterialId() {
      return 'MAT-' + Date.now();
    }

    async function fetchMaterials() {
      loading.value = true;
      try {
        const data = await props.api.get('/materials');
        materials.value = Array.isArray(data) ? data : (data.materials || []);
      } catch (e) {
        window.$toast('error', '원자재 목록 조회 실패: ' + e.message);
      } finally {
        loading.value = false;
      }
    }

    const filteredMaterials = computed(() => {
      if (!searchQuery.value) return materials.value;
      const q = searchQuery.value.toLowerCase();
      return materials.value.filter(m =>
        (m.materialId || '').toLowerCase().includes(q) ||
        (m.name || '').toLowerCase().includes(q) ||
        (m.origin || '').toLowerCase().includes(q) ||
        (m.supplier || '').toLowerCase().includes(q) ||
        (m.certificationId || '').toLowerCase().includes(q)
      );
    });

    function openModal() {
      form.value = {
        materialId: generateMaterialId(),
        name: '',
        origin: '',
        supplier: '',
        quantity: '',
        unit: 'kg',
        certificationId: '',
      };
      showModal.value = true;
    }

    function closeModal() {
      showModal.value = false;
    }

    const isFormValid = computed(() => {
      return form.value.name && form.value.origin && form.value.supplier && form.value.quantity;
    });

    async function submitMaterial() {
      if (!isFormValid.value) return;
      submitting.value = true;
      try {
        const payload = {
          ...form.value,
          quantity: Number(form.value.quantity),
        };
        await props.api.post('/materials', payload);
        window.$toast('success', '원자재가 등록되었습니다.');
        closeModal();
        await fetchMaterials();
      } catch (e) {
        window.$toast('error', '원자재 등록 실패: ' + e.message);
      } finally {
        submitting.value = false;
      }
    }

    function formatDate(dateStr) {
      if (!dateStr) return '-';
      const d = new Date(dateStr);
      return d.toLocaleString('ko-KR');
    }

    onMounted(fetchMaterials);

    return {
      materials, loading, showModal, form, submitting, searchQuery,
      isManufacturer, isFormValid, filteredMaterials,
      openModal, closeModal, submitMaterial, formatDate, fetchMaterials,
    };
  },
  template: `
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
          </svg>
        </div>
        <div>
          <h1 class="text-xl font-bold text-gray-900">추적성 / 원자재 관리</h1>
          <p class="text-gray-500 text-xs mt-0.5">배터리 원자재 등록 및 공급망 이력 추적</p>
        </div>
      </div>
      <button v-if="isManufacturer" @click="openModal"
        class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
        </svg>
        원자재 등록
      </button>
    </div>

    <!-- Search Bar -->
    <div class="bg-white rounded-lg border border-gray-200 p-3">
      <div class="relative">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>
        <input v-model="searchQuery" type="text" placeholder="자재ID, 명칭, 원산지, 공급업체, 인증번호 검색..."
          class="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm" />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20">
      <div class="relative">
        <div class="w-10 h-10 rounded-full border-[3px] border-gray-200"></div>
        <div class="absolute inset-0 w-10 h-10 rounded-full border-[3px] border-emerald-600 border-t-transparent animate-spin"></div>
      </div>
      <p class="mt-3 text-sm text-gray-500">원자재 목록을 불러오고 있습니다...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredMaterials.length === 0" class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="flex flex-col items-center justify-center py-16 px-6">
        <div class="w-16 h-16 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
          </svg>
        </div>
        <h3 class="text-base font-semibold text-gray-800 mb-1">등록된 원자재가 없습니다</h3>
        <p class="text-sm text-gray-500 text-center max-w-md">원자재를 등록하여 공급망을 투명하게 추적하세요.</p>
        <button v-if="isManufacturer" @click="openModal"
          class="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          첫 원자재 등록하기
        </button>
      </div>
    </div>

    <!-- Materials Table -->
    <div v-else class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="px-4 py-3 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
          </svg>
          <span class="text-sm font-semibold text-gray-700">원자재 목록</span>
          <span class="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{{ filteredMaterials.length }}건</span>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-100">
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">자재ID</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">명칭</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">원산지</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">공급업체</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">수량</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">단위</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">인증번호</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">등록일</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="(m, idx) in filteredMaterials" :key="m.materialId"
              :class="['transition-colors hover:bg-gray-50', idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40']">
              <td class="px-4 py-3 whitespace-nowrap">
                <span class="font-mono text-xs text-gray-500">{{ m.materialId }}</span>
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">{{ m.name }}</td>
              <td class="px-4 py-3 whitespace-nowrap">
                <div class="flex items-center">
                  <svg class="w-3.5 h-3.5 text-gray-400 mr-1.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  <span class="text-sm text-gray-600">{{ m.origin }}</span>
                </div>
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{{ m.supplier }}</td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900 tabular-nums">{{ m.quantity }}</td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{{ m.unit }}</td>
              <td class="px-4 py-3 whitespace-nowrap">
                <span v-if="m.certificationId" class="inline-flex items-center text-xs font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                  </svg>
                  {{ m.certificationId }}
                </span>
                <span v-else class="text-xs text-gray-400">-</span>
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{{ formatDate(m.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Registration Modal -->
    <div v-if="showModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen px-4 py-8">
        <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" @click="closeModal"></div>
        <div class="relative bg-white rounded-xl shadow-2xl max-w-lg w-full z-10 overflow-hidden">
          <!-- Modal Header -->
          <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
                </svg>
              </div>
              <h3 class="text-lg font-bold text-gray-900">원자재 등록</h3>
            </div>
            <button @click="closeModal" class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <!-- Modal Body -->
          <div class="px-6 py-5 space-y-4">
            <div>
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">자재 ID (자동생성)</label>
              <input v-model="form.materialId" type="text" readonly
                class="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-500 font-mono"/>
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1">명칭 <span class="text-red-500">*</span></label>
              <input v-model="form.name" type="text" placeholder="예: 리튬, 코발트, 니켈"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none placeholder-gray-400"/>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">원산지 <span class="text-red-500">*</span></label>
                <input v-model="form.origin" type="text" placeholder="예: 호주"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none placeholder-gray-400"/>
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">공급업체 <span class="text-red-500">*</span></label>
                <input v-model="form.supplier" type="text" placeholder="예: ABC Mining"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none placeholder-gray-400"/>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">수량 <span class="text-red-500">*</span></label>
                <input v-model="form.quantity" type="number" min="0" step="0.01" placeholder="0"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none placeholder-gray-400 tabular-nums"/>
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">단위</label>
                <select v-model="form.unit"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white">
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="ton">ton</option>
                  <option value="lb">lb</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1">인증번호 <span class="text-gray-400 text-xs font-normal">(선택)</span></label>
              <input v-model="form.certificationId" type="text" placeholder="인증서 번호"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none placeholder-gray-400"/>
            </div>
          </div>
          <!-- Modal Footer -->
          <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
            <button @click="closeModal"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              취소
            </button>
            <button @click="submitMaterial"
              :disabled="!isFormValid || submitting"
              :class="['px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center',
                (!isFormValid || submitting)
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm']">
              <svg v-if="submitting" class="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              {{ submitting ? '등록 중...' : '등록' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  `,
});
