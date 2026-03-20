app.component('bmu-data-page', {
  props: ['auth', 'api'],
  emits: ['navigate'],
  setup(props, { emit }) {
    const { ref, computed, onMounted, watch } = Vue;

    const mode = ref('passport');
    const passportId = ref('');
    const records = ref([]);
    const loading = ref(false);
    const autoRefresh = ref(false);
    let intervalId = null;

    const sortedRecords = computed(() => {
      return [...records.value].sort((a, b) => {
        const tA = new Date(a.timestamp).getTime();
        const tB = new Date(b.timestamp).getTime();
        return tB - tA;
      });
    });

    function decodeStatusFlags(flags) {
      const num = typeof flags === 'number' ? flags : parseInt(flags, 10);
      if (isNaN(num)) return [];
      const badges = [];
      if (num & 0x01) badges.push({ label: '충전중', color: 'bg-blue-100 text-blue-700' });
      if (num & 0x02) badges.push({ label: '밸런싱', color: 'bg-green-100 text-green-700' });
      if (num & 0x04) badges.push({ label: '결함', color: 'bg-red-100 text-red-700' });
      return badges;
    }

    async function fetchRecords() {
      if (!passportId.value.trim()) return;
      loading.value = true;
      try {
        const data = await props.api.get('/bmu/records/' + encodeURIComponent(passportId.value.trim()));
        records.value = Array.isArray(data) ? data : (data.records || []);
      } catch (e) {
        window.$toast('error', 'BMU 데이터 조회 실패: ' + e.message);
        records.value = [];
      } finally {
        loading.value = false;
      }
    }

    function handleSearch() {
      if (passportId.value.trim()) {
        fetchRecords();
      }
    }

    function formatTimestamp(ts) {
      if (!ts) return '-';
      const d = new Date(ts);
      return d.toLocaleString('ko-KR');
    }

    function formatNumber(val, decimals) {
      if (val === null || val === undefined) return '-';
      return Number(val).toFixed(decimals !== undefined ? decimals : 1);
    }

    function startAutoRefresh() {
      stopAutoRefresh();
      if (passportId.value.trim()) {
        intervalId = setInterval(fetchRecords, 10000);
      }
    }

    function stopAutoRefresh() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }

    watch(autoRefresh, (val) => {
      if (val) {
        startAutoRefresh();
      } else {
        stopAutoRefresh();
      }
    });

    // Clean up on unmount
    Vue.onUnmounted(() => {
      stopAutoRefresh();
    });

    return {
      mode, passportId, records, loading, autoRefresh,
      sortedRecords, decodeStatusFlags,
      fetchRecords, handleSearch, formatTimestamp, formatNumber,
    };
  },
  template: `
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">BMU 데이터</h1>
        <p class="mt-1 text-sm text-gray-500">배터리 관리 유닛 실시간 데이터 조회</p>
      </div>
    </div>

    <!-- Mode Tabs -->
    <div class="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
      <button @click="mode = 'passport'"
        :class="['px-4 py-2 text-sm font-medium rounded-md transition-colors',
          mode === 'passport' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700']">
        여권별 조회
      </button>
      <button @click="mode = 'overview'"
        :class="['px-4 py-2 text-sm font-medium rounded-md transition-colors',
          mode === 'overview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700']">
        전체 현황
      </button>
    </div>

    <!-- Passport Search Mode -->
    <div v-if="mode === 'passport'">
      <!-- Search Bar -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div class="flex items-center space-x-4">
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-700 mb-1">여권 ID</label>
            <input v-model="passportId" type="text" placeholder="조회할 배터리 여권 ID를 입력하세요"
              @keyup.enter="handleSearch"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"/>
          </div>
          <div class="flex items-end space-x-3">
            <button @click="handleSearch"
              :disabled="!passportId.trim()"
              :class="['px-5 py-2 text-sm font-medium text-white rounded-lg transition-colors mt-6',
                !passportId.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700']">
              조회
            </button>
          </div>
        </div>
        <!-- Auto Refresh Toggle -->
        <div class="flex items-center mt-3 pt-3 border-t border-gray-100">
          <label class="flex items-center cursor-pointer">
            <input type="checkbox" v-model="autoRefresh" class="sr-only peer"/>
            <div class="relative w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
            <span class="ml-2 text-sm text-gray-600">자동 새로고침 (10초)</span>
          </label>
          <span v-if="autoRefresh" class="ml-3 flex items-center text-xs text-green-600">
            <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></span>
            실시간 갱신 중
          </span>
        </div>
      </div>

      <!-- Instruction Text (no passport entered) -->
      <div v-if="!passportId.trim() && records.length === 0" class="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        <h3 class="mt-4 text-lg font-medium text-gray-900">여권 ID를 입력하세요</h3>
        <p class="mt-2 text-sm text-gray-500">배터리 여권 ID를 입력하면 해당 BMU의 실시간 데이터를 조회할 수 있습니다.</p>
      </div>

      <!-- Loading -->
      <div v-else-if="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>

      <!-- No Records -->
      <div v-else-if="passportId.trim() && records.length === 0" class="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <h3 class="text-lg font-medium text-gray-900">데이터가 없습니다</h3>
        <p class="mt-2 text-sm text-gray-500">해당 여권에 대한 BMU 기록이 존재하지 않습니다.</p>
      </div>

      <!-- Records Table -->
      <div v-else class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <span class="text-sm text-gray-500">총 {{ records.length }}건의 기록</span>
          <span class="text-xs text-gray-400 font-mono">{{ passportId }}</span>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Record ID</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">시간</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">SOC (%)</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">전압 (V)</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">전류 (A)</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">온도</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">방전 사이클</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">상태</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="r in sortedRecords" :key="r.recordId" class="hover:bg-gray-50 transition-colors">
                <td class="px-4 py-3 whitespace-nowrap text-xs font-mono text-gray-500">{{ r.recordId }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{{ formatTimestamp(r.timestamp) }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-right font-medium"
                  :class="r.soc > 50 ? 'text-green-600' : r.soc > 20 ? 'text-yellow-600' : 'text-red-600'">
                  {{ formatNumber(r.soc, 1) }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">{{ formatNumber(r.voltage, 2) }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">{{ formatNumber(r.current, 2) }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">{{ formatNumber(r.temperature, 1) }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">{{ r.dischargeCycles != null ? r.dischargeCycles : '-' }}</td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <div class="flex flex-wrap gap-1">
                    <span v-for="badge in decodeStatusFlags(r.statusFlags)" :key="badge.label"
                      :class="['inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', badge.color]">
                      {{ badge.label }}
                    </span>
                    <span v-if="decodeStatusFlags(r.statusFlags).length === 0"
                      class="text-xs text-gray-400">정상</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Overview Mode -->
    <div v-if="mode === 'overview'">
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
        <h3 class="mt-4 text-lg font-medium text-gray-900">전체 현황</h3>
        <p class="mt-2 text-sm text-gray-500">여권별 조회 탭에서 개별 배터리의 BMU 데이터를 확인할 수 있습니다.</p>
      </div>
    </div>
  </div>
  `,
});
