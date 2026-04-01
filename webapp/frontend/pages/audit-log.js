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
      LOGIN: 'bg-[--bp-info-dim] text-[#60a5fa] border-[--bp-border]',
      REGISTER: 'bg-[--bp-info-dim] text-[#60a5fa] border-[--bp-border]',
      CREATE_PASSPORT: 'bg-[--bp-signal-dim] text-[--bp-signal] border-[--bp-border-active]',
      BIND_VEHICLE: 'bg-[--bp-purple-dim] text-purple-700 border-purple-200',
      RECORD_BMU: 'bg-[--bp-signal-dim] text-teal-700 border-teal-200',
      REGISTER_MATERIAL: 'bg-[--bp-signal-dim] text-[--bp-signal] border-[--bp-border-active]',
      REQUEST_MAINTENANCE: 'bg-[--bp-warn-dim] text-amber-700 border-amber-200',
      LOG_MAINTENANCE: 'bg-[--bp-warn-dim] text-amber-700 border-amber-200',
      LOG_ACCIDENT: 'bg-[--bp-danger-dim] text-[--bp-danger] border-[--bp-border]',
      REQUEST_ANALYSIS: 'bg-[--bp-purple-dim] text-purple-700 border-purple-200',
      SUBMIT_ANALYSIS: 'bg-[--bp-purple-dim] text-purple-700 border-purple-200',
      SET_RECYCLE: 'bg-[--bp-signal-dim] text-teal-700 border-teal-200',
      EXTRACT_MATERIALS: 'bg-[--bp-signal-dim] text-teal-700 border-teal-200',
      DISPOSE_BATTERY: 'bg-[--bp-danger-dim] text-[--bp-danger] border-[--bp-border]',
      ISSUE_VC: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      REVOKE_VC: 'bg-[--bp-danger-dim] text-[--bp-danger] border-[--bp-border]',
      QUERY: 'bg-[--bp-surface-1] text-[--bp-text-2] border-[--bp-border]',
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

    function relativeTime(ts) {
      if (!ts) return '';
      const now = Date.now();
      const diff = now - new Date(ts).getTime();
      if (diff < 0) return '방금';
      const seconds = Math.floor(diff / 1000);
      if (seconds < 60) return seconds + '초 전';
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return minutes + '분 전';
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return hours + '시간 전';
      const days = Math.floor(hours / 24);
      if (days < 30) return days + '일 전';
      return '';
    }

    function getStatusStyle(code) {
      if (!code) return { color: 'var(--bp-text-3)', bg: 'transparent' };
      if (code < 300) return { color: '#34d399', bg: 'rgba(52,211,153,0.1)' };
      if (code < 400) return { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' };
      if (code < 500) return { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' };
      return { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
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
      fetchLogs, formatTime, relativeTime, getStatusStyle, prevPage, nextPage, toggleDetail,
    };
  },
  template: `
  <div style="display:flex;flex-direction:column;gap:24px;">

    <!-- ====== PAGE HEADER ====== -->
    <div class="bp-animate-in" style="display:flex;align-items:center;justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:14px;">
        <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#64748b,#475569);display:flex;align-items:center;justify-content:center;">
          <svg width="22" height="22" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
        </div>
        <div>
          <h1 class="bp-heading" style="font-family:var(--font-display);font-size:1.35rem;color:var(--bp-text-1);margin:0;">감사 로그</h1>
          <p style="font-family:var(--font-body);font-size:0.72rem;color:var(--bp-text-3);margin-top:2px;">플랫폼 내 모든 활동을 추적하고 모니터링합니다</p>
        </div>
      </div>
      <!-- Auto-refresh + Refresh button -->
      <div style="display:flex;align-items:center;gap:12px;">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none;">
          <div style="position:relative;">
            <input type="checkbox" v-model="autoRefresh" style="position:absolute;opacity:0;width:0;height:0;" />
            <div :style="{ width:'36px',height:'20px',borderRadius:'10px',background: autoRefresh ? 'var(--bp-signal)' : 'var(--bp-surface-4)',transition:'background 0.2s' }"></div>
            <div :style="{ position:'absolute',top:'2px',left: autoRefresh ? '18px' : '2px',width:'16px',height:'16px',borderRadius:'50%',background:'var(--bp-surface-2)',boxShadow:'0 1px 3px rgba(0,0,0,0.2)',transition:'left 0.2s' }"></div>
          </div>
          <span style="font-size:0.75rem;font-weight:500;color:var(--bp-text-2);">실시간</span>
        </label>
        <button @click="fetchLogs" class="bp-btn bp-btn-ghost" style="display:inline-flex;align-items:center;gap:6px;font-size:0.78rem;">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          새로고침
        </button>
      </div>
    </div>

    <!-- ====== FILTERS ====== -->
    <div class="bp-card bp-animate-in bp-delay-1" style="padding:12px 16px;display:flex;flex-wrap:wrap;align-items:center;gap:12px;">
      <select v-model="filterAction" class="bp-input" style="padding:8px 12px;font-size:0.82rem;background:var(--bp-surface-2);min-width:140px;">
        <option v-for="opt in actionOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none;">
        <input type="checkbox" v-model="filterWriteOnly" style="width:16px;height:16px;accent-color:var(--bp-signal);border-radius:4px;" />
        <span style="font-size:0.82rem;color:var(--bp-text-2);">쓰기 작업만</span>
      </label>
      <span style="margin-left:auto;font-family:var(--font-mono);font-size:0.72rem;color:var(--bp-text-3);">총 {{ total }}건</span>
    </div>

    <!-- ====== LOADING STATE ====== -->
    <div v-if="loading && logs.length === 0" class="bp-card bp-animate-in bp-delay-2" style="padding:48px;display:flex;flex-direction:column;align-items:center;justify-content:center;">
      <div style="width:40px;height:40px;border:3px solid var(--bp-surface-3);border-top-color:#64748b;border-radius:50%;animation:spin 0.8s linear infinite;margin-bottom:12px;"></div>
      <p style="font-size:0.85rem;color:var(--bp-text-3);">감사 로그를 불러오고 있습니다...</p>
    </div>

    <!-- ====== EMPTY STATE ====== -->
    <div v-else-if="logs.length === 0" class="bp-card bp-animate-in bp-delay-2" style="padding:48px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">
      <div style="width:64px;height:64px;border-radius:16px;background:var(--bp-surface-3);display:flex;align-items:center;justify-content:center;margin-bottom:16px;">
        <svg width="32" height="32" fill="none" stroke="var(--bp-text-3)" stroke-width="1.5" viewBox="0 0 24 24" style="opacity:0.5;">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
      </div>
      <p style="font-size:0.85rem;color:var(--bp-text-3);">기록된 감사 로그가 없습니다</p>
    </div>

    <!-- ====== LOG TABLE ====== -->
    <div v-else class="bp-card bp-card-glow bp-animate-in bp-delay-2" style="overflow:hidden;">
      <div style="overflow-x:auto;">
        <table class="bp-table" style="width:100%;">
          <thead>
            <tr>
              <th>시간</th>
              <th>액션</th>
              <th>사용자</th>
              <th>경로</th>
              <th style="text-align:center;">상태코드</th>
              <th style="text-align:right;">응답시간</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="(log, idx) in logs" :key="log.id">
              <tr @click="toggleDetail(log.id)" style="cursor:pointer;"
                :style="expandedId === log.id ? 'background:var(--bp-surface-2);' : ''">
                <!-- Timestamp with relative time -->
                <td>
                  <span style="display:flex;flex-direction:column;gap:2px;">
                    <span style="display:flex;align-items:center;gap:6px;">
                      <svg :style="{ width:'12px',height:'12px',color:'var(--bp-text-3)',transition:'transform 0.2s',transform: expandedId === log.id ? 'rotate(90deg)' : 'rotate(0deg)' }" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                      <span class="bp-mono" style="font-size:0.75rem;color:var(--bp-text-3);white-space:nowrap;">{{ formatTime(log.timestamp) }}</span>
                    </span>
                    <span v-if="relativeTime(log.timestamp)" class="bp-mono" style="font-size:0.65rem;color:var(--bp-text-3);opacity:0.7;padding-left:18px;white-space:nowrap;">{{ relativeTime(log.timestamp) }}</span>
                  </span>
                </td>
                <!-- Action badge -->
                <td>
                  <span :class="['inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border',
                    actionColors[log.action] || 'bg-[--bp-surface-1] text-[--bp-text-2] border-[--bp-border]']"
                    style="white-space:nowrap;">
                    {{ actionLabels[log.action] || log.action }}
                  </span>
                </td>
                <!-- User -->
                <td style="font-size:0.82rem;font-weight:500;color:var(--bp-text-2);white-space:nowrap;">
                  {{ log.userId || (log.action === 'RECORD_BMU' ? '시스템(BMU)' : '-') }}
                </td>
                <!-- Path -->
                <td>
                  <span v-if="log.path" class="bp-mono" style="font-size:0.72rem;color:var(--bp-text-3);background:var(--bp-surface-3);padding:2px 8px;border-radius:4px;white-space:nowrap;display:inline-block;max-width:200px;overflow:hidden;text-overflow:ellipsis;">{{ log.method }} {{ log.path }}</span>
                  <span v-else style="font-size:0.75rem;color:var(--bp-text-3);">-</span>
                </td>
                <!-- Status Code with enhanced color pill -->
                <td style="text-align:center;">
                  <span class="bp-mono"
                    :style="{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 10px',
                      borderRadius: '20px',
                      color: getStatusStyle(log.statusCode).color,
                      background: getStatusStyle(log.statusCode).bg,
                    }">
                    <span :style="{
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      background: getStatusStyle(log.statusCode).color,
                      flexShrink: 0,
                    }"></span>
                    {{ log.statusCode }}
                  </span>
                </td>
                <!-- Duration -->
                <td style="text-align:right;">
                  <span class="bp-mono" style="font-size:0.75rem;color:var(--bp-text-3);font-variant-numeric:tabular-nums;white-space:nowrap;">{{ log.duration }}ms</span>
                </td>
              </tr>
              <!-- Expanded detail row -->
              <tr v-if="expandedId === log.id">
                <td colspan="6" style="padding:0 16px;">
                  <div class="bp-animate-in" style="background:var(--bp-surface-2);border:1px solid var(--bp-surface-3);border-radius:10px;padding:16px;margin:8px 0;display:flex;flex-direction:column;gap:14px;">
                    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
                      <div>
                        <p style="font-size:0.6rem;font-weight:600;color:var(--bp-text-3);text-transform:uppercase;margin:0 0 2px;">로그 ID</p>
                        <p class="bp-mono" style="font-size:0.72rem;color:var(--bp-text-2);word-break:break-all;margin:0;">{{ log.id }}</p>
                      </div>
                      <div>
                        <p style="font-size:0.6rem;font-weight:600;color:var(--bp-text-3);text-transform:uppercase;margin:0 0 2px;">HTTP 메서드</p>
                        <p class="bp-mono" style="font-size:0.72rem;color:var(--bp-text-2);margin:0;">{{ log.method }}</p>
                      </div>
                      <div>
                        <p style="font-size:0.6rem;font-weight:600;color:var(--bp-text-3);text-transform:uppercase;margin:0 0 2px;">경로</p>
                        <p class="bp-mono" style="font-size:0.72rem;color:var(--bp-text-2);word-break:break-all;margin:0;">{{ log.path }}</p>
                      </div>
                      <div>
                        <p style="font-size:0.6rem;font-weight:600;color:var(--bp-text-3);text-transform:uppercase;margin:0 0 2px;">상태 코드</p>
                        <p class="bp-mono" style="font-size:0.72rem;margin:0;"
                          :style="{ color: getStatusStyle(log.statusCode).color }">{{ log.statusCode }}</p>
                      </div>
                      <div>
                        <p style="font-size:0.6rem;font-weight:600;color:var(--bp-text-3);text-transform:uppercase;margin:0 0 2px;">IP</p>
                        <p class="bp-mono" style="font-size:0.72rem;color:var(--bp-text-2);margin:0;">{{ log.ip || '-' }}</p>
                      </div>
                      <div>
                        <p style="font-size:0.6rem;font-weight:600;color:var(--bp-text-3);text-transform:uppercase;margin:0 0 2px;">응답 시간</p>
                        <p class="bp-mono" style="font-size:0.72rem;color:var(--bp-text-2);margin:0;">{{ log.duration }}ms</p>
                      </div>
                      <div>
                        <p style="font-size:0.6rem;font-weight:600;color:var(--bp-text-3);text-transform:uppercase;margin:0 0 2px;">사용자</p>
                        <p style="font-size:0.72rem;color:var(--bp-text-2);margin:0;">{{ log.userId || '(미인증)' }}</p>
                      </div>
                      <div>
                        <p style="font-size:0.6rem;font-weight:600;color:var(--bp-text-3);text-transform:uppercase;margin:0 0 2px;">조직</p>
                        <p style="font-size:0.72rem;color:var(--bp-text-2);margin:0;">{{ log.orgMsp || '(없음)' }}</p>
                      </div>
                    </div>
                    <div v-if="log.requestBody">
                      <p style="font-size:0.6rem;font-weight:600;color:var(--bp-text-3);text-transform:uppercase;margin:0 0 6px;">요청 데이터</p>
                      <pre class="bp-mono" style="font-size:0.72rem;color:var(--bp-text-2);background:var(--bp-surface-1);border:1px solid var(--bp-surface-3);border-radius:8px;padding:12px;overflow-x:auto;max-height:160px;margin:0;">{{ JSON.stringify(log.requestBody, null, 2) }}</pre>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div style="padding:12px 20px;border-top:1px solid var(--bp-surface-3);background:var(--bp-surface-1);display:flex;align-items:center;justify-content:space-between;">
        <span class="bp-mono" style="font-size:0.72rem;color:var(--bp-text-3);">{{ total }}건 중 {{ (page - 1) * 50 + 1 }}~{{ Math.min(page * 50, total) }}</span>
        <div style="display:flex;align-items:center;gap:8px;">
          <button @click="prevPage" :disabled="page <= 1"
            class="bp-btn bp-btn-ghost" style="font-size:0.75rem;padding:6px 12px;"
            :style="page <= 1 ? 'opacity:0.3;cursor:not-allowed;' : ''">
            이전
          </button>
          <span class="bp-mono" style="font-size:0.72rem;color:var(--bp-text-3);font-variant-numeric:tabular-nums;">{{ page }} / {{ totalPages }}</span>
          <button @click="nextPage" :disabled="page >= totalPages"
            class="bp-btn bp-btn-ghost" style="font-size:0.75rem;padding:6px 12px;"
            :style="page >= totalPages ? 'opacity:0.3;cursor:not-allowed;' : ''">
            다음
          </button>
        </div>
      </div>
    </div>
  </div>
  `,
});
