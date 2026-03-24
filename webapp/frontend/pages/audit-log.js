app.component('audit-log-page', {
  props: ['auth', 'api'],
  emits: ['navigate'],
  setup(props, { emit }) {
    const { ref, computed, onMounted } = Vue;

    const logs = ref([]);
    const total = ref(0);
    const loading = ref(false);
    const page = ref(1);
    const filterAction = ref('');
    const filterWriteOnly = ref(true);
    const autoRefresh = ref(false);
    let intervalId = null;

    const actionLabels = {
      LOGIN: '로그인', REGISTER: '회원가입',
      CREATE_PASSPORT: '여권 생성', BIND_VEHICLE: 'VIN 바인딩',
      UPLOAD_IMAGE: '이미지 업로드', RECORD_BMU: 'BMU 데이터',
      REGISTER_MATERIAL: '원자재 등록',
      REQUEST_MAINTENANCE: '정비 요청', LOG_MAINTENANCE: '정비 기록',
      LOG_ACCIDENT: '사고 기록',
      REQUEST_ANALYSIS: '분석 요청', SUBMIT_ANALYSIS: '분석 결과',
      SET_RECYCLE: '재활용 판정', EXTRACT_MATERIALS: '원자재 추출',
      DISPOSE_BATTERY: '배터리 폐기',
      ISSUE_VC: 'VC 발급', REVOKE_VC: 'VC 폐기', VERIFY_VC: 'VC 검증',
      QUERY: '조회', OTHER: '기타',
    };

    const actionColors = {
      LOGIN: 'bg-blue-50 text-blue-700 border-blue-200',
      REGISTER: 'bg-blue-50 text-blue-700 border-blue-200',
      CREATE_PASSPORT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      BIND_VEHICLE: 'bg-purple-50 text-purple-700 border-purple-200',
      RECORD_BMU: 'bg-teal-50 text-teal-700 border-teal-200',
      REGISTER_MATERIAL: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      REQUEST_MAINTENANCE: 'bg-amber-50 text-amber-700 border-amber-200',
      LOG_MAINTENANCE: 'bg-amber-50 text-amber-700 border-amber-200',
      LOG_ACCIDENT: 'bg-red-50 text-red-700 border-red-200',
      REQUEST_ANALYSIS: 'bg-purple-50 text-purple-700 border-purple-200',
      SUBMIT_ANALYSIS: 'bg-purple-50 text-purple-700 border-purple-200',
      SET_RECYCLE: 'bg-teal-50 text-teal-700 border-teal-200',
      EXTRACT_MATERIALS: 'bg-teal-50 text-teal-700 border-teal-200',
      DISPOSE_BATTERY: 'bg-red-50 text-red-700 border-red-200',
      ISSUE_VC: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      REVOKE_VC: 'bg-red-50 text-red-700 border-red-200',
      QUERY: 'bg-gray-50 text-gray-600 border-gray-200',
    };

    const actionOptions = [
      { value: '', label: '전체' },
      { value: 'CREATE_PASSPORT', label: '여권 생성' },
      { value: 'BIND_VEHICLE', label: 'VIN 바인딩' },
      { value: 'RECORD_BMU', label: 'BMU 데이터' },
      { value: 'REGISTER_MATERIAL', label: '원자재 등록' },
      { value: 'REQUEST_MAINTENANCE', label: '정비 요청' },
      { value: 'LOG_MAINTENANCE', label: '정비 기록' },
      { value: 'LOG_ACCIDENT', label: '사고 기록' },
      { value: 'REQUEST_ANALYSIS', label: '분석 요청' },
      { value: 'SUBMIT_ANALYSIS', label: '분석 결과' },
      { value: 'DISPOSE_BATTERY', label: '배터리 폐기' },
      { value: 'ISSUE_VC', label: 'VC 발급' },
      { value: 'LOGIN', label: '로그인' },
    ];

    async function fetchLogs() {
      loading.value = true;
      try {
        const params = new URLSearchParams({
          page: page.value,
          limit: 50,
        });
        if (filterAction.value) params.set('action', filterAction.value);
        if (filterWriteOnly.value) params.set('writeOnly', 'true');
        const data = await props.api.get('/audit?' + params.toString());
        logs.value = data.records || [];
        total.value = data.total || 0;
        // Auto return to page 1 if current page has no results
        if (logs.value.length === 0 && page.value > 1) {
          page.value = 1;
          await fetchLogs();
        }
      } catch (e) {
        logs.value = [];
      } finally {
        loading.value = false;
      }
    }

    function formatTime(ts) {
      if (!ts) return '-';
      return new Date(ts).toLocaleString('ko-KR');
    }

    function prevPage() { if (page.value > 1) { page.value--; fetchLogs(); } }
    function nextPage() { if (page.value * 50 < total.value) { page.value++; fetchLogs(); } }

    const totalPages = computed(() => Math.max(1, Math.ceil(total.value / 50)));

    Vue.watch([filterAction, filterWriteOnly], () => { page.value = 1; fetchLogs(); });
    Vue.watch(autoRefresh, (val) => {
      if (intervalId) { clearInterval(intervalId); intervalId = null; }
      if (val) intervalId = setInterval(fetchLogs, 5000);
    });
    Vue.onUnmounted(() => { if (intervalId) clearInterval(intervalId); });

    const expandedId = ref(null);
    function toggleDetail(id) {
      expandedId.value = expandedId.value === id ? null : id;
    }

    onMounted(fetchLogs);

    return {
      logs, total, loading, page, filterAction, filterWriteOnly, autoRefresh,
      actionLabels, actionColors, actionOptions, totalPages, expandedId,
      fetchLogs, formatTime, prevPage, nextPage, toggleDetail,
    };
  },
  template: `
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
        </div>
        <div>
          <h1 class="text-xl font-bold text-gray-900">감사 로그</h1>
          <p class="text-gray-500 text-xs mt-0.5">플랫폼 내 모든 활동을 추적하고 모니터링합니다</p>
        </div>
      </div>
      <!-- Auto refresh -->
      <div class="flex items-center gap-3">
        <label class="flex items-center gap-2 cursor-pointer select-none">
          <div class="relative">
            <input type="checkbox" v-model="autoRefresh" class="sr-only peer"/>
            <div class="w-9 h-5 bg-gray-200 rounded-full peer-checked:bg-emerald-600 transition-colors"></div>
            <div class="absolute top-[2px] left-[2px] w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4"></div>
          </div>
          <span class="text-xs font-medium text-gray-600">실시간</span>
        </label>
        <button @click="fetchLogs"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          새로고침
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg border border-gray-200 p-3 flex flex-wrap items-center gap-3">
      <select v-model="filterAction"
        class="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white">
        <option v-for="opt in actionOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
      <label class="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" v-model="filterWriteOnly" class="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"/>
        <span class="text-sm text-gray-600">쓰기 작업만</span>
      </label>
      <span class="text-xs text-gray-400 ml-auto">총 {{ total }}건</span>
    </div>

    <!-- Loading -->
    <div v-if="loading && logs.length === 0" class="bg-white rounded-lg border border-gray-200 p-12 flex flex-col items-center justify-center">
      <div class="w-10 h-10 border-[3px] border-slate-100 border-t-slate-600 rounded-full animate-spin mb-3"></div>
      <p class="text-sm text-gray-500">감사 로그를 불러오고 있습니다...</p>
    </div>

    <!-- Empty -->
    <div v-else-if="logs.length === 0" class="bg-white rounded-lg border border-gray-200 p-12 text-center">
      <div class="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
      </div>
      <p class="text-sm text-gray-500">기록된 감사 로그가 없습니다</p>
    </div>

    <!-- Log Table -->
    <div v-else class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-100">
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">시각</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">작업</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">사용자</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">조직</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">대상</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">결과</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">응답시간</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <template v-for="(log, idx) in logs" :key="log.id">
              <tr @click="toggleDetail(log.id)"
                :class="['transition-colors cursor-pointer', expandedId === log.id ? 'bg-slate-100' : idx % 2 === 0 ? 'bg-white hover:bg-gray-50/50' : 'bg-gray-50/30 hover:bg-gray-100/50']">
                <td class="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                  <span class="flex items-center gap-1.5">
                    <svg :class="['w-3 h-3 text-gray-400 transition-transform', expandedId === log.id ? 'rotate-90' : '']" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                    {{ formatTime(log.timestamp) }}
                  </span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <span :class="['inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border',
                    actionColors[log.action] || 'bg-gray-50 text-gray-600 border-gray-200']">
                    {{ actionLabels[log.action] || log.action }}
                  </span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium">{{ log.userId || '-' }}</td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <span v-if="log.orgMsp" class="text-xs font-medium px-1.5 py-0.5 rounded"
                    :class="log.orgMsp === MSP.MANUFACTURER ? 'bg-emerald-50 text-emerald-700' :
                      log.orgMsp === MSP.EV_MANUFACTURER ? 'bg-purple-50 text-purple-700' :
                      log.orgMsp === MSP.SERVICE ? 'bg-amber-50 text-amber-700' :
                      log.orgMsp === MSP.REGULATOR ? 'bg-teal-50 text-teal-700' : 'bg-gray-50 text-gray-600'">
                    {{ MSP_LABELS[log.orgMsp] || log.orgMsp }}
                  </span>
                  <span v-else class="text-xs text-gray-400">-</span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <span v-if="log.targetId" class="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded truncate max-w-[150px] inline-block">{{ log.targetId }}</span>
                  <span v-else class="text-xs text-gray-300">-</span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-center">
                  <span v-if="log.success" class="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> 성공
                  </span>
                  <span v-else class="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
                    <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span> 실패
                  </span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-right text-xs text-gray-400 tabular-nums">{{ log.duration }}ms</td>
              </tr>
              <!-- Expanded Detail Row -->
              <tr v-if="expandedId === log.id">
                <td colspan="7" class="px-4 py-0">
                  <div class="bg-slate-50 rounded-lg border border-slate-200 p-4 my-2 space-y-3">
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <p class="text-[10px] font-semibold text-slate-400 uppercase mb-0.5">로그 ID</p>
                        <p class="text-xs font-mono text-slate-600 break-all">{{ log.id }}</p>
                      </div>
                      <div>
                        <p class="text-[10px] font-semibold text-slate-400 uppercase mb-0.5">HTTP 메서드</p>
                        <p class="text-xs font-mono text-slate-600">{{ log.method }}</p>
                      </div>
                      <div>
                        <p class="text-[10px] font-semibold text-slate-400 uppercase mb-0.5">경로</p>
                        <p class="text-xs font-mono text-slate-600 break-all">{{ log.path }}</p>
                      </div>
                      <div>
                        <p class="text-[10px] font-semibold text-slate-400 uppercase mb-0.5">상태 코드</p>
                        <p class="text-xs font-mono" :class="log.statusCode < 400 ? 'text-emerald-600' : 'text-red-600'">{{ log.statusCode }}</p>
                      </div>
                      <div>
                        <p class="text-[10px] font-semibold text-slate-400 uppercase mb-0.5">IP</p>
                        <p class="text-xs font-mono text-slate-600">{{ log.ip || '-' }}</p>
                      </div>
                      <div>
                        <p class="text-[10px] font-semibold text-slate-400 uppercase mb-0.5">응답 시간</p>
                        <p class="text-xs font-mono text-slate-600">{{ log.duration }}ms</p>
                      </div>
                      <div>
                        <p class="text-[10px] font-semibold text-slate-400 uppercase mb-0.5">사용자</p>
                        <p class="text-xs text-slate-600">{{ log.userId || '(미인증)' }}</p>
                      </div>
                      <div>
                        <p class="text-[10px] font-semibold text-slate-400 uppercase mb-0.5">조직</p>
                        <p class="text-xs text-slate-600">{{ log.orgMsp || '(없음)' }}</p>
                      </div>
                    </div>
                    <div v-if="log.requestBody">
                      <p class="text-[10px] font-semibold text-slate-400 uppercase mb-1">요청 데이터</p>
                      <pre class="text-xs font-mono text-slate-600 bg-white border border-slate-200 rounded-lg p-3 overflow-x-auto max-h-40">{{ JSON.stringify(log.requestBody, null, 2) }}</pre>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      <!-- Pagination -->
      <div class="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
        <span class="text-xs text-gray-500">{{ total }}건 중 {{ (page - 1) * 50 + 1 }}~{{ Math.min(page * 50, total) }}</span>
        <div class="flex items-center gap-2">
          <button @click="prevPage" :disabled="page <= 1"
            :class="['px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
              page <= 1 ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50']">
            이전
          </button>
          <span class="text-xs text-gray-500 tabular-nums">{{ page }} / {{ totalPages }}</span>
          <button @click="nextPage" :disabled="page >= totalPages"
            :class="['px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
              page >= totalPages ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50']">
            다음
          </button>
        </div>
      </div>
    </div>
  </div>
  `,
});
