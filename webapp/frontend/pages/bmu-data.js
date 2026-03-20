app.component('bmu-data-page', {
  props: ['auth', 'api'],
  emits: ['navigate'],
  setup(props, { emit }) {
    const { ref, computed, onMounted, watch } = Vue;

    const passportId = ref('');
    const records = ref([]);
    const loading = ref(false);
    const autoRefresh = ref(false);
    const refreshing = ref(false);
    let intervalId = null;

    const sortedRecords = computed(() => {
      return [...records.value].sort((a, b) => {
        const tA = new Date(a.timestamp).getTime();
        const tB = new Date(b.timestamp).getTime();
        return tB - tA;
      });
    });

    const hasSearched = ref(false);

    function decodeStatusFlags(flags) {
      const num = typeof flags === 'number' ? flags : parseInt(flags, 10);
      if (isNaN(num)) return [];
      const badges = [];
      if (num & 0x01) badges.push({ label: '충전', color: 'blue' });
      if (num & 0x02) badges.push({ label: '밸런싱', color: 'green' });
      if (num & 0x04) badges.push({ label: '결함', color: 'red' });
      return badges;
    }

    function getBadgeClasses(color) {
      const map = {
        blue: 'bg-blue-50 text-blue-700 border border-blue-200',
        green: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        red: 'bg-red-50 text-red-700 border border-red-200',
      };
      return map[color] || 'bg-gray-50 text-gray-600 border border-gray-200';
    }

    function getDotClasses(color) {
      const map = {
        blue: 'bg-blue-500',
        green: 'bg-emerald-500',
        red: 'bg-red-500',
      };
      return map[color] || 'bg-gray-400';
    }

    async function fetchRecords() {
      if (!passportId.value.trim()) return;
      if (autoRefresh.value && !loading.value) {
        refreshing.value = true;
      } else {
        loading.value = true;
      }
      try {
        const data = await props.api.get('/bmu/records/' + encodeURIComponent(passportId.value.trim()));
        records.value = Array.isArray(data) ? data : (data.records || []);
        hasSearched.value = true;
      } catch (e) {
        window.$toast('error', 'BMU 데이터 조회 실패: ' + e.message);
        records.value = [];
      } finally {
        loading.value = false;
        refreshing.value = false;
      }
    }

    function handleSearch() {
      if (passportId.value.trim()) {
        hasSearched.value = false;
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

    Vue.onUnmounted(() => {
      stopAutoRefresh();
    });

    return {
      passportId, records, loading, autoRefresh, refreshing, hasSearched,
      sortedRecords, decodeStatusFlags, getBadgeClasses, getDotClasses,
      fetchRecords, handleSearch, formatTimestamp, formatNumber,
    };
  },
  template: `
  <div class="min-h-screen">
    <!-- Page Header -->
    <div class="mb-8">
      <div class="flex items-start justify-between">
        <div class="flex items-center space-x-4">
          <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/20">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <div>
            <h1 class="text-2xl font-bold text-gray-900 tracking-tight">BMU 실시간 데이터</h1>
            <p class="mt-1 text-sm text-gray-500">배터리 관리 유닛의 실시간 센서 데이터를 모니터링합니다</p>
          </div>
        </div>
        <!-- Auto Refresh Toggle -->
        <div class="flex items-center space-x-3">
          <div class="flex items-center px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm">
            <label class="flex items-center cursor-pointer select-none">
              <div class="relative">
                <input type="checkbox" v-model="autoRefresh" class="sr-only peer"/>
                <div class="w-10 h-5 bg-gray-200 rounded-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 peer-checked:bg-blue-600 transition-colors duration-200"></div>
                <div class="absolute top-[2px] left-[2px] w-4 h-4 bg-white rounded-full border border-gray-300 shadow-sm transition-transform duration-200 peer-checked:translate-x-5 peer-checked:border-white"></div>
              </div>
              <span class="ml-3 text-sm font-medium text-gray-700">자동 새로고침</span>
            </label>
            <span v-if="autoRefresh" class="ml-3 flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse mr-1.5"></span>
              10초 간격
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Search Card -->
    <div class="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 mb-6 hover:shadow-md transition-shadow duration-300">
      <div class="flex items-end space-x-4">
        <div class="flex-1">
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            <svg class="inline-block w-4 h-4 mr-1 text-gray-400 -mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            여권 ID
          </label>
          <input v-model="passportId" type="text"
            placeholder="조회할 배터리 여권 ID를 입력하세요"
            @keyup.enter="handleSearch"
            class="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-gray-400"/>
        </div>
        <button @click="handleSearch"
          :disabled="!passportId.trim() || loading"
          :class="['px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center space-x-2 shadow-sm',
            !passportId.trim() || loading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
              : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md active:scale-[0.98]']">
          <svg v-if="!loading" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <span>조회</span>
        </button>
      </div>
    </div>

    <!-- Empty State - No search yet -->
    <div v-if="!hasSearched && !loading" class="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden">
      <div class="flex flex-col items-center justify-center py-20 px-6">
        <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center mb-6">
          <svg class="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-800 mb-2">여권 ID를 입력하여 BMU 데이터를 조회하세요</h3>
        <p class="text-sm text-gray-500 text-center max-w-md">배터리 여권 ID를 입력하면 해당 BMU의 SOC, 전압, 전류, 온도 등 실시간 센서 데이터를 확인할 수 있습니다.</p>
      </div>
    </div>

    <!-- Loading State (initial search) -->
    <div v-else-if="loading && !autoRefresh" class="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden">
      <div class="flex flex-col items-center justify-center py-20">
        <div class="relative">
          <div class="w-12 h-12 rounded-full border-[3px] border-gray-200"></div>
          <div class="absolute inset-0 w-12 h-12 rounded-full border-[3px] border-blue-600 border-t-transparent animate-spin"></div>
        </div>
        <p class="mt-4 text-sm font-medium text-gray-500">데이터를 조회하고 있습니다...</p>
      </div>
    </div>

    <!-- No records found -->
    <div v-else-if="hasSearched && records.length === 0 && !loading" class="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden">
      <div class="flex flex-col items-center justify-center py-20 px-6">
        <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center mb-6">
          <svg class="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-800 mb-2">데이터가 없습니다</h3>
        <p class="text-sm text-gray-500">해당 여권에 대한 BMU 기록이 존재하지 않습니다.</p>
      </div>
    </div>

    <!-- Records Table -->
    <div v-else-if="records.length > 0" class="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden hover:shadow-md transition-shadow duration-300">
      <!-- Table Header Bar -->
      <div class="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="flex items-center space-x-2">
              <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
              </svg>
              <span class="text-sm font-semibold text-gray-700">조회 결과</span>
            </div>
            <span class="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">{{ records.length }}건</span>
          </div>
          <div class="flex items-center space-x-3">
            <span v-if="refreshing" class="flex items-center text-xs text-blue-600">
              <svg class="w-3.5 h-3.5 animate-spin mr-1.5" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              갱신 중
            </span>
            <span class="text-xs text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded">{{ passportId }}</span>
          </div>
        </div>
      </div>
      <!-- Table Body -->
      <div class="overflow-x-auto">
        <table class="min-w-full">
          <thead>
            <tr class="bg-gray-50/80 border-b border-gray-100">
              <th class="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">기록ID</th>
              <th class="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">시각</th>
              <th class="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">SOC (%)</th>
              <th class="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">전압 (V)</th>
              <th class="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">전류 (A)</th>
              <th class="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">온도 (°C)</th>
              <th class="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">방전주기</th>
              <th class="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">상태</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="(r, idx) in sortedRecords" :key="r.recordId"
              :class="['transition-colors duration-150 hover:bg-blue-50/40', idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40']">
              <td class="px-5 py-3.5 whitespace-nowrap text-xs font-mono text-gray-500">{{ r.recordId }}</td>
              <td class="px-5 py-3.5 whitespace-nowrap text-sm text-gray-700">{{ formatTimestamp(r.timestamp) }}</td>
              <td class="px-5 py-3.5 whitespace-nowrap text-right">
                <span :class="['text-sm font-bold tabular-nums',
                  r.soc > 50 ? 'text-emerald-600' : r.soc > 20 ? 'text-amber-600' : 'text-red-600']">
                  {{ formatNumber(r.soc, 1) }}
                </span>
              </td>
              <td class="px-5 py-3.5 whitespace-nowrap text-sm text-right text-gray-700 tabular-nums">{{ formatNumber(r.voltage, 2) }}</td>
              <td class="px-5 py-3.5 whitespace-nowrap text-sm text-right text-gray-700 tabular-nums">{{ formatNumber(r.current, 2) }}</td>
              <td class="px-5 py-3.5 whitespace-nowrap text-sm text-right text-gray-700 tabular-nums">{{ formatNumber(r.temperature, 1) }}</td>
              <td class="px-5 py-3.5 whitespace-nowrap text-sm text-right text-gray-700 tabular-nums">{{ r.dischargeCycles != null ? r.dischargeCycles : '-' }}</td>
              <td class="px-5 py-3.5 whitespace-nowrap">
                <div class="flex flex-wrap gap-1.5">
                  <span v-for="badge in decodeStatusFlags(r.statusFlags)" :key="badge.label"
                    :class="['inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', getBadgeClasses(badge.color)]">
                    <span :class="['w-1.5 h-1.5 rounded-full mr-1.5', getDotClasses(badge.color)]"></span>
                    {{ badge.label }}
                  </span>
                  <span v-if="decodeStatusFlags(r.statusFlags).length === 0"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-400 border border-gray-200">
                    <span class="w-1.5 h-1.5 rounded-full mr-1.5 bg-gray-300"></span>
                    정상
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
  `,
});
