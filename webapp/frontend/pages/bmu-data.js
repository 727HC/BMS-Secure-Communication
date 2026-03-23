app.component('bmu-data-page', {
  props: ['auth', 'api'],
  emits: ['navigate'],
  setup(props, { emit }) {
    const { ref, computed, watch } = Vue;

    const passportId = ref('');
    const records = ref([]);
    const loading = ref(false);
    const autoRefresh = ref(false);
    const refreshing = ref(false);
    let intervalId = null;

    const sortedRecords = computed(() => {
      return [...records.value].sort((a, b) => {
        const tA = new Date(a.timestamp || 0).getTime() || 0;
        const tB = new Date(b.timestamp || 0).getTime() || 0;
        return tB - tA;
      });
    });

    const hasSearched = ref(false);

    function decodeStatusFlags(flags) {
      const num = typeof flags === 'number' ? flags : parseInt(flags, 10);
      if (isNaN(num)) return [];
      const badges = [];
      if (num & 0x01) badges.push({ label: '충전중', color: 'blue' });
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

    function scaleSOC(val) {
      if (val == null) return 0;
      const n = Number(val);
      return n > 100 ? +(n / 655.35).toFixed(1) : +n.toFixed(1);
    }

    function scaleTemp(val) {
      if (val == null) return 0;
      const n = Number(val);
      return n > 100 ? +(n / 1310.7).toFixed(1) : +n.toFixed(1);
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
      fetchRecords, handleSearch, formatTimestamp, formatNumber, scaleSOC, scaleTemp,
    };
  },
  template: `
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        </div>
        <div>
          <h1 class="text-xl font-bold text-gray-900">배터리 데이터</h1>
          <p class="text-gray-500 text-xs mt-0.5">BMU 실시간 센서 데이터 모니터링</p>
        </div>
      </div>
      <!-- Auto Refresh Toggle -->
      <div class="flex items-center px-3 py-2 bg-white border border-gray-200 rounded-lg">
        <label class="flex items-center cursor-pointer select-none">
          <div class="relative">
            <input type="checkbox" v-model="autoRefresh" class="sr-only peer"/>
            <div class="w-9 h-5 bg-gray-200 rounded-full peer-checked:bg-emerald-600 transition-colors"></div>
            <div class="absolute top-[2px] left-[2px] w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4"></div>
          </div>
          <span class="ml-2 text-xs font-medium text-gray-700">자동 새로고침</span>
        </label>
        <span v-if="autoRefresh" class="ml-2 flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
          <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse mr-1"></span>
          10s
        </span>
      </div>
    </div>

    <!-- Search Card -->
    <div class="bg-white rounded-lg border border-gray-200 p-4">
      <div class="flex items-end gap-3">
        <div class="flex-1">
          <label class="block text-xs font-semibold text-gray-600 mb-1.5">
            <svg class="inline-block w-3.5 h-3.5 mr-1 text-gray-400 -mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            여권 ID
          </label>
          <input v-model="passportId" type="text"
            placeholder="조회할 배터리 여권 ID를 입력하세요"
            @keyup.enter="handleSearch"
            class="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition placeholder-gray-400"/>
        </div>
        <button @click="handleSearch"
          :disabled="!passportId.trim() || loading"
          :class="['px-5 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center gap-2',
            !passportId.trim() || loading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
              : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98]']">
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
    <div v-if="!hasSearched && !loading" class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="flex flex-col items-center justify-center py-16 px-6">
        <div class="w-16 h-16 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        </div>
        <h3 class="text-base font-semibold text-gray-800 mb-1">여권 ID를 입력하여 데이터를 조회하세요</h3>
        <p class="text-sm text-gray-500 text-center max-w-md">배터리 여권 ID를 입력하면 SOC, 전압, 전류, 온도 등 센서 데이터를 확인할 수 있습니다.</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-else-if="loading && !autoRefresh" class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="flex flex-col items-center justify-center py-16">
        <div class="relative">
          <div class="w-10 h-10 rounded-full border-[3px] border-gray-200"></div>
          <div class="absolute inset-0 w-10 h-10 rounded-full border-[3px] border-emerald-600 border-t-transparent animate-spin"></div>
        </div>
        <p class="mt-3 text-sm text-gray-500">데이터를 조회하고 있습니다...</p>
      </div>
    </div>

    <!-- No records found -->
    <div v-else-if="hasSearched && records.length === 0 && !loading" class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="flex flex-col items-center justify-center py-16 px-6">
        <div class="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
          </svg>
        </div>
        <h3 class="text-base font-semibold text-gray-800 mb-1">데이터가 없습니다</h3>
        <p class="text-sm text-gray-500">해당 여권에 대한 BMU 기록이 존재하지 않습니다.</p>
      </div>
    </div>

    <!-- Records Table -->
    <div v-else-if="records.length > 0" class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <!-- Table Header Bar -->
      <div class="px-4 py-3 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
          </svg>
          <span class="text-sm font-semibold text-gray-700">조회 결과</span>
          <span class="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{{ records.length }}건</span>
        </div>
        <div class="flex items-center gap-2">
          <span v-if="refreshing" class="flex items-center text-xs text-emerald-600">
            <svg class="w-3.5 h-3.5 animate-spin mr-1" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            갱신 중
          </span>
          <span class="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded">{{ passportId }}</span>
        </div>
      </div>
      <!-- Table Body -->
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-100">
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">기록ID</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">시각</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">SOC (%)</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">전압 (V)</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">전류 (A)</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">온도 (&deg;C)</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">방전주기</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">상태</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="(r, idx) in sortedRecords" :key="r.recordId"
              :class="['transition-colors hover:bg-emerald-50/40', idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40']">
              <td class="px-4 py-3 whitespace-nowrap text-xs font-mono text-gray-500">{{ r.recordId }}</td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{{ formatTimestamp(r.timestamp) }}</td>
              <td class="px-4 py-3 whitespace-nowrap text-right">
                <span :class="['text-sm font-bold tabular-nums',
                  scaleSOC(r.soc) > 50 ? 'text-emerald-600' : scaleSOC(r.soc) > 20 ? 'text-amber-600' : 'text-red-600']">
                  {{ scaleSOC(r.soc) }}
                </span>
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700 tabular-nums">{{ formatNumber(r.voltage, 2) }}</td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700 tabular-nums">{{ formatNumber(r.current, 2) }}</td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700 tabular-nums">{{ scaleTemp(r.temperature) }}</td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700 tabular-nums">{{ r.dischargeCycles != null ? r.dischargeCycles : '-' }}</td>
              <td class="px-4 py-3 whitespace-nowrap">
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
