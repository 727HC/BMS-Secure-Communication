app.component('dashboard-page', {
  props: ['auth', 'api'],
  emits: ['navigate'],
  setup(props, { emit }) {
    const { ref, computed, onMounted } = Vue;

    const passports = ref([]);
    const loading = ref(true);

    onMounted(async () => {
      try {
        const data = await props.api.get('/passports');
        passports.value = data.records || data || [];
      } catch (e) {
        passports.value = [];
      } finally {
        loading.value = false;
      }
    });

    const totalCount = computed(() => passports.value.length);

    function scaleSOC(val) {
      if (val == null) return 0;
      return val > 100 ? +(val / 655.35).toFixed(1) : +val;
    }

    const avgSoc = computed(() => {
      const items = passports.value.filter(p => p.currentSoc != null);
      if (items.length === 0) return 0;
      return Math.round(items.reduce((s, p) => s + scaleSOC(Number(p.currentSoc)), 0) / items.length);
    });

    const avgSoh = computed(() => {
      const items = passports.value.filter(p => p.currentSoh != null);
      if (items.length === 0) return 0;
      return Math.round(items.reduce((s, p) => s + Number(p.currentSoh), 0) / items.length);
    });

    const countByStatus = computed(() => {
      const map = {};
      passports.value.forEach(p => {
        const s = p.status || 'UNKNOWN';
        map[s] = (map[s] || 0) + 1;
      });
      return map;
    });

    const vinBoundCount = computed(() => passports.value.filter(p => p.vin).length);

    const maintenanceNeeded = computed(() =>
      passports.value.filter(p => p.status === 'MAINTENANCE').length
    );

    const analysisNeeded = computed(() =>
      passports.value.filter(p => p.status === 'ANALYSIS').length
    );

    const recyclingCount = computed(() =>
      passports.value.filter(p => p.status === 'RECYCLING').length
    );

    const disposedCount = computed(() =>
      passports.value.filter(p => p.status === 'DISPOSED').length
    );

    const recycleAvailableCount = computed(() =>
      passports.value.filter(p => p.recycleAvailable === true || p.recycleAvailable === 'true').length
    );

    const materialCount = computed(() => {
      let count = 0;
      passports.value.forEach(p => {
        if (p.recyclingRates && typeof p.recyclingRates === 'object') {
          count += Object.keys(p.recyclingRates).length;
        }
      });
      return count;
    });

    const latestBmuText = computed(() => {
      const withBmu = passports.value.filter(p => p.lastBmuTimestamp);
      if (withBmu.length === 0) return '-';
      withBmu.sort((a, b) => (b.lastBmuTimestamp || '').localeCompare(a.lastBmuTimestamp || ''));
      return withBmu[0].lastBmuTimestamp || '-';
    });

    const statsCards = computed(() => {
      const msp = props.auth.orgMsp;
      if (msp === 'ManufacturerMSP') {
        return [
          { icon: '🔋', label: '총 배터리 수', value: totalCount.value, bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
          { icon: '⚡', label: '평균 SOC', value: avgSoc.value + '%', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
          { icon: '🧪', label: '원자재 데이터', value: materialCount.value, bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
          { icon: '📡', label: '최근 BMU 데이터', value: latestBmuText.value, bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', small: true },
        ];
      }
      if (msp === 'EVManufacturerMSP') {
        return [
          { icon: '🚗', label: '차량 배터리 수 (VIN)', value: vinBoundCount.value, bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
          { icon: '🔧', label: '정비 필요', value: maintenanceNeeded.value, bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
          { icon: '💚', label: '평균 SOH', value: avgSoh.value + '%', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
          { icon: '📊', label: '총 여권 수', value: totalCount.value, bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
        ];
      }
      if (msp === 'ServiceMSP') {
        return [
          { icon: '🔧', label: '정비 대기중', value: maintenanceNeeded.value, bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
          { icon: '🔬', label: '분석 대기중', value: analysisNeeded.value, bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
          { icon: '♻️', label: '재활용 판정 대기', value: recyclingCount.value, bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
          { icon: '📊', label: '총 여권 수', value: totalCount.value, bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
        ];
      }
      if (msp === 'RegulatorMSP') {
        return [
          { icon: '📋', label: '전체 여권 수', value: totalCount.value, bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
          { icon: '🗑️', label: '폐기 배터리', value: disposedCount.value, bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
          { icon: '♻️', label: '재활용 가능', value: recycleAvailableCount.value, bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
          { icon: '🔬', label: '분석 대기', value: analysisNeeded.value, bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
        ];
      }
      return [];
    });

    const quickActions = computed(() => {
      const msp = props.auth.orgMsp;
      if (msp === 'ManufacturerMSP') {
        return [
          { label: '여권 생성', page: 'passports', color: 'bg-primary-600 hover:bg-primary-700' },
          { label: 'BMU 데이터 조회', page: 'bmu-data', color: 'bg-indigo-600 hover:bg-indigo-700' },
          { label: '원자재 관리', page: 'materials', color: 'bg-purple-600 hover:bg-purple-700' },
        ];
      }
      if (msp === 'EVManufacturerMSP') {
        return [
          { label: '여권 조회', page: 'passports', color: 'bg-primary-600 hover:bg-primary-700' },
          { label: '정비 요청', page: 'maintenance', color: 'bg-yellow-600 hover:bg-yellow-700' },
          { label: 'BMU 데이터', page: 'bmu-data', color: 'bg-indigo-600 hover:bg-indigo-700' },
        ];
      }
      if (msp === 'ServiceMSP') {
        return [
          { label: '정비 수행', page: 'maintenance', color: 'bg-yellow-600 hover:bg-yellow-700' },
          { label: '재활용 판정', page: 'recycling', color: 'bg-orange-600 hover:bg-orange-700' },
          { label: '여권 조회', page: 'passports', color: 'bg-primary-600 hover:bg-primary-700' },
        ];
      }
      if (msp === 'RegulatorMSP') {
        return [
          { label: '여권 검증', page: 'passports', color: 'bg-primary-600 hover:bg-primary-700' },
          { label: '폐기 관리', page: 'recycling', color: 'bg-red-600 hover:bg-red-700' },
          { label: '정비 이력', page: 'maintenance', color: 'bg-gray-600 hover:bg-gray-700' },
        ];
      }
      return [];
    });

    function nav(page) {
      emit('navigate', page);
    }

    return { loading, statsCards, quickActions, nav };
  },
  template: `
    <div>
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">대시보드</h1>
        <p class="text-gray-500 mt-1">배터리 여권 현황을 한눈에 확인하세요.</p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center items-center py-20">
        <svg class="animate-spin h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
      </div>

      <div v-else>
        <!-- Stat Cards Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div v-for="(card, i) in statsCards" :key="i"
            :class="['rounded-xl border p-5 transition-shadow hover:shadow-md', card.bg, card.border]">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-sm font-medium text-gray-500">{{ card.label }}</p>
                <p :class="['mt-1 font-bold', card.text, card.small ? 'text-sm' : 'text-2xl']">{{ card.value }}</p>
              </div>
              <span class="text-2xl">{{ card.icon }}</span>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">빠른 작업</h2>
          <div class="flex flex-wrap gap-3">
            <button v-for="(action, i) in quickActions" :key="i"
              @click="nav(action.page)"
              :class="['px-5 py-2.5 rounded-lg text-white font-medium text-sm transition-colors', action.color]">
              {{ action.label }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
});
