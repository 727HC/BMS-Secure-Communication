app.component('materials-page', {
  props: ['auth', 'api'],
  emits: ['navigate'],
  setup(props, { emit }) {
    const { ref, computed, onMounted } = Vue;

    const materials = ref([]);
    const loading = ref(false);
    const showModal = ref(false);

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

    async function submitMaterial() {
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
      }
    }

    function formatDate(dateStr) {
      if (!dateStr) return '-';
      const d = new Date(dateStr);
      return d.toLocaleString('ko-KR');
    }

    onMounted(fetchMaterials);

    return {
      materials, loading, showModal, form,
      isManufacturer, openModal, closeModal, submitMaterial, formatDate, fetchMaterials,
    };
  },
  template: `
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">원자재 관리</h1>
        <p class="mt-1 text-sm text-gray-500">배터리 원자재 등록 및 이력 관리</p>
      </div>
      <div class="flex items-center space-x-3">
        <button @click="fetchMaterials"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          새로고침
        </button>
        <button v-if="isManufacturer" @click="openModal"
          class="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors">
          + 원자재 등록
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>

    <!-- Empty State -->
    <div v-else-if="materials.length === 0" class="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
      <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
      </svg>
      <h3 class="mt-4 text-lg font-medium text-gray-900">등록된 원자재가 없습니다</h3>
      <p class="mt-2 text-sm text-gray-500">원자재를 등록하여 공급망을 추적하세요.</p>
    </div>

    <!-- Table -->
    <div v-else class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-200">
        <span class="text-sm text-gray-500">총 {{ materials.length }}건</span>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Material ID</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">이름</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">원산지</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">공급업체</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">수량</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">단위</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">인증 ID</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">등록일</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="m in materials" :key="m.materialId" class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-primary-600">{{ m.materialId }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ m.name }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{{ m.origin }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{{ m.supplier }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ m.quantity }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{{ m.unit }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">{{ m.certificationId || '-' }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatDate(m.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Registration Modal -->
    <div v-if="showModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen px-4">
        <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity" @click="closeModal"></div>
        <div class="relative bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 z-10">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-bold text-gray-900">원자재 등록</h3>
            <button @click="closeModal" class="text-gray-400 hover:text-gray-600">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Material ID</label>
              <input v-model="form.materialId" type="text" readonly
                class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-500"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
              <input v-model="form.name" type="text" placeholder="예: 리튬, 코발트"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"/>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">원산지 *</label>
                <input v-model="form.origin" type="text" placeholder="예: 호주"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"/>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">공급업체 *</label>
                <input v-model="form.supplier" type="text" placeholder="예: ABC Mining"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"/>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">수량 *</label>
                <input v-model="form.quantity" type="number" min="0" step="0.01" placeholder="0"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"/>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">단위</label>
                <select v-model="form.unit"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="ton">ton</option>
                  <option value="lb">lb</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">인증 ID</label>
              <input v-model="form.certificationId" type="text" placeholder="인증서 번호 (선택)"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"/>
            </div>
          </div>
          <div class="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <button @click="closeModal"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              취소
            </button>
            <button @click="submitMaterial"
              :disabled="!form.name || !form.origin || !form.supplier || !form.quantity"
              :class="['px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors',
                (!form.name || !form.origin || !form.supplier || !form.quantity)
                  ? 'bg-gray-300 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700']">
              등록
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  `,
});
