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
      LOGIN: 'bg-[rgba(107,163,255,0.1)] text-[#60a5fa] border-[rgba(250,250,245,0.06)]',
      REGISTER: 'bg-[rgba(107,163,255,0.1)] text-[#60a5fa] border-[rgba(250,250,245,0.06)]',
      CREATE_PASSPORT: 'bg-[rgba(200,255,0,0.08)] text-[#c8ff00] border-emerald-500',
      BIND_VEHICLE: 'bg-[rgba(192,132,252,0.1)] text-[#c084fc] border-purple-200',
      RECORD_BMU: 'bg-[rgba(200,255,0,0.08)] text-teal-700 border-teal-200',
      REGISTER_MATERIAL: 'bg-[rgba(200,255,0,0.08)] text-[#c8ff00] border-emerald-500',
      REQUEST_MAINTENANCE: 'bg-[rgba(255,184,0,0.1)] text-[#ffb800] border-amber-200',
      LOG_MAINTENANCE: 'bg-[rgba(255,184,0,0.1)] text-[#ffb800] border-amber-200',
      LOG_ACCIDENT: 'bg-[rgba(239,68,68,0.1)] text-[#ff6b6b] border-[rgba(250,250,245,0.06)]',
      REQUEST_ANALYSIS: 'bg-[rgba(192,132,252,0.1)] text-[#c084fc] border-purple-200',
      SUBMIT_ANALYSIS: 'bg-[rgba(192,132,252,0.1)] text-[#c084fc] border-purple-200',
      SET_RECYCLE: 'bg-[rgba(200,255,0,0.08)] text-teal-700 border-teal-200',
      EXTRACT_MATERIALS: 'bg-[rgba(200,255,0,0.08)] text-teal-700 border-teal-200',
      DISPOSE_BATTERY: 'bg-[rgba(239,68,68,0.1)] text-[#ff6b6b] border-[rgba(250,250,245,0.06)]',
      ISSUE_VC: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      REVOKE_VC: 'bg-[rgba(239,68,68,0.1)] text-[#ff6b6b] border-[rgba(250,250,245,0.06)]',
      QUERY: 'bg-[#1a1814] text-[rgba(250,250,245,0.7)] border-[rgba(250,250,245,0.06)]',
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
    const activeActionLabel = computed(() => {
      const found = actionOptions.find((item) => item.value === filterAction.value);
      return found ? found.label : '전체';
    });

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
      if (!code) return { color: '#6b7280', bg: 'transparent' };
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
      logs, total, loading, page, filterAction, filterWriteOnly, autoRefresh, activeActionLabel,
      actionLabels, actionColors, actionOptions, totalPages, expandedId,
      fetchLogs, formatTime, relativeTime, getStatusStyle, prevPage, nextPage, toggleDetail,
    };
  },
  template: `
  <div style="display:flex;flex-direction:column;gap:16px;">

    <!-- ====== PAGE HEADER ====== -->
    <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1.25rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--color-border); gap: 1rem;">
      <div>
        <p class="sn-eyebrow" style="margin:0 0 0.35rem;color:#4338ca;">증빙 원장</p>
        <h1 class="sn-display" style="font-size: 1.5rem;">감사 증빙 원장</h1>
        <p class="sn-caption" style="margin-top: 0.125rem;">총 {{ total }}건의 작업·검증 흔적을 증빙 순서대로 확인합니다.</p>
      </div>
      <div style="display:flex;align-items:center;gap:12px;">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none;">
          <div style="position:relative;">
            <input type="checkbox" v-model="autoRefresh" style="position:absolute;opacity:0;width:0;height:0;" />
            <div :style="{ width:'36px',height:'20px',borderRadius:'10px',background:autoRefresh?'#171717':'#e5e5e5',transition:'background 0.2s' }"></div>
            <div :style="{ position:'absolute',top:'2px',left:autoRefresh?'18px':'2px',width:'16px',height:'16px',borderRadius:'50%',background:'#fff',boxShadow:'0 1px 3px rgba(0,0,0,0.2)',transition:'left 0.2s' }"></div>
          </div>
          <span style="font-size:0.75rem;font-weight:500;color:#525252;">실시간</span>
        </label>
        <button @click="fetchLogs" class="sn-btn sn-btn-ghost" style="display:inline-flex;align-items:center;gap:6px;font-size:0.78rem;">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          새로고침
        </button>
      </div>
    </div>

    <div class="sn-panel" style="padding:14px 16px;display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:12px;">
      <div style="padding-right:8px;border-right:1px solid rgba(0,0,0,0.06);">
        <p class="sn-eyebrow" style="margin:0 0 0.35rem;">증빙 요약</p>
        <p style="font-size:0.875rem;font-weight:600;color:#171717;margin:0 0 0.25rem;">행위 → 응답 → 요청 데이터</p>
        <p style="font-size:0.75rem;color:#6b7280;line-height:1.6;margin:0;">필터는 증빙 묶음을 줄이는 도구이고, 상세 패널은 각 사건의 request context를 보존합니다.</p>
      </div>
      <div>
        <p class="sn-eyebrow" style="margin:0 0 0.35rem;">현재 페이지</p>
        <p style="font-family:var(--font-mono);font-size:1.1rem;font-weight:700;color:#171717;margin:0;">{{ logs.length }}</p>
        <p style="font-size:0.72rem;color:#6b7280;margin:0.2rem 0 0;">표시 중인 기록</p>
      </div>
      <div>
        <p class="sn-eyebrow" style="margin:0 0 0.35rem;color:#059669;">필터</p>
        <p style="font-size:0.82rem;font-weight:600;color:#171717;margin:0;">{{ filterWriteOnly ? '쓰기 중심' : '전체 행위' }}</p>
        <p style="font-size:0.72rem;color:#6b7280;margin:0.2rem 0 0;">{{ autoRefresh ? '실시간 모니터링' : '수동 새로고침' }}</p>
      </div>
    </div>

    <!-- ====== FILTERS ====== -->
    <div class="sn-panel" style="padding:8px 12px;display:flex;flex-wrap:wrap;align-items:center;gap:10px;">
      <select v-model="filterAction" class="sn-input" style="min-width:140px;font-size:0.82rem;">
        <option v-for="opt in actionOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none;">
        <input type="checkbox" v-model="filterWriteOnly" style="width:16px;height:16px;accent-color:#171717;border-radius:4px;" />
        <span style="font-size:0.82rem;color:#525252;">쓰기 작업만</span>
      </label>
      <span style="margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:0.72rem;color:#a3a3a3;">총 {{ total }}건</span>
    </div>

    <div v-if="filterAction" class="sn-panel" style="padding:10px 14px;display:flex;align-items:center;justify-content:space-between;">
      <div>
        <p class="sn-eyebrow" style="margin:0 0 4px;">활성 필터</p>
        <p style="margin:0;font-size:0.9rem;font-weight:700;color:#171717;">{{ activeActionLabel }}</p>
      </div>
      <span style="font-family:'JetBrains Mono',monospace;font-size:0.78rem;color:#6b7280;">{{ total }}건</span>
    </div>

    <!-- ====== LOADING STATE ====== -->
    <div v-if="loading && logs.length === 0" style="display: flex; align-items: center; justify-content: center; min-height: 40vh;">
      <div style="width: 28px; height: 28px; border: 2px solid rgba(0,0,0,0.06); border-top-color: var(--color-accent); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
    </div>

    <!-- ====== EMPTY STATE ====== -->
    <div v-else-if="logs.length === 0" style="padding: 3rem; text-align: center; border: 1px dashed var(--color-border); border-radius: 0.5rem;">
      <p style="font-size: 0.875rem; color: var(--color-text-3); margin-bottom: 0;">{{ filterAction ? activeActionLabel + ' 필터에 해당하는 증빙이 없습니다.' : '표시할 증빙 항목이 없습니다.' }}</p>
    </div>

    <!-- ====== ACTIVITY FEED (structural change from table) ====== -->
    <div v-else class="sn-panel" style="overflow:hidden;">
      <div style="display: flex; flex-direction: column; gap: 1px; background: rgba(0,0,0,0.03);">
        <template v-for="(log, idx) in logs" :key="log.id">
          <div @click="toggleDetail(log.id)" style="background: #fff; padding: 0.75rem 1rem; display: flex; gap: 0.75rem; align-items: flex-start; cursor: pointer;"
            :style="expandedId === log.id ? 'background:#fafafa;' : ''">
            <!-- Action icon dot -->
            <div style="width: 8px; height: 8px; border-radius: 50%; margin-top: 0.375rem; flex-shrink: 0;"
              :style="{ background: actionColors[log.action] ? '#16a34a' : '#a3a3a3' }"></div>
            <!-- Content -->
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                <span style="font-size: 0.8125rem; font-weight: 500; color: var(--color-text-1);">{{ actionLabels[log.action] || log.action }}</span>
                <span style="font-size: 0.625rem; color: var(--color-text-3);">{{ relativeTime(log.timestamp) }}</span>
                <svg :style="{ width:'10px',height:'10px',color:'#6b7280',transition:'transform 0.2s',transform: expandedId === log.id ? 'rotate(90deg)' : 'rotate(0deg)', marginLeft:'auto', flexShrink:0 }" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
              <div style="font-size: 0.75rem; color: var(--color-text-3);">
                {{ log.userId || (log.action === 'RECORD_BMU' ? '시스템(BMU)' : '-') }}
                <span v-if="log.path" style="font-family:'JetBrains Mono',monospace;"> · {{ log.method }} {{ log.path }}</span>
                <span style="font-family:'JetBrains Mono',monospace;"> · {{ formatTime(log.timestamp) }}</span>
              </div>
            </div>
            <!-- Status code -->
            <span style="font-family: var(--font-mono); font-size: 0.625rem; padding: 0.125rem 0.375rem; border-radius: 3px; flex-shrink:0;"
              :style="{ background: log.statusCode < 400 ? '#f0fdf4' : '#fef2f2', color: log.statusCode < 400 ? '#16a34a' : '#dc2626' }">
              {{ log.statusCode || '—' }}
            </span>
          </div>
          <!-- Expanded detail panel -->
          <div v-if="expandedId === log.id" style="background:#fafafa;border-top:1px solid rgba(0,0,0,0.04);padding:12px 16px 16px;">
            <div style="background:#fff;box-shadow:inset 0 0 0 1px rgba(0,0,0,0.06);border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:14px;">
              <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
                <div>
                  <p style="font-size:0.6rem;font-weight:600;color:#6b7280;text-transform:uppercase;margin:0 0 2px;">로그 ID</p>
                  <p class="font-mono" style="font-size:0.72rem;color:#374151;word-break:break-all;margin:0;">{{ log.id }}</p>
                </div>
                <div>
                  <p style="font-size:0.6rem;font-weight:600;color:#6b7280;text-transform:uppercase;margin:0 0 2px;">HTTP 메서드</p>
                  <p class="font-mono" style="font-size:0.72rem;color:#374151;margin:0;">{{ log.method }}</p>
                </div>
                <div>
                  <p style="font-size:0.6rem;font-weight:600;color:#6b7280;text-transform:uppercase;margin:0 0 2px;">경로</p>
                  <p class="font-mono" style="font-size:0.72rem;color:#374151;word-break:break-all;margin:0;">{{ log.path }}</p>
                </div>
                <div>
                  <p style="font-size:0.6rem;font-weight:600;color:#6b7280;text-transform:uppercase;margin:0 0 2px;">상태 코드</p>
                  <p class="font-mono" style="font-size:0.72rem;margin:0;"
                    :style="{ color: getStatusStyle(log.statusCode).color }">{{ log.statusCode }}</p>
                </div>
                <div>
                  <p style="font-size:0.6rem;font-weight:600;color:#6b7280;text-transform:uppercase;margin:0 0 2px;">IP</p>
                  <p class="font-mono" style="font-size:0.72rem;color:#374151;margin:0;">{{ log.ip || '-' }}</p>
                </div>
                <div>
                  <p style="font-size:0.6rem;font-weight:600;color:#6b7280;text-transform:uppercase;margin:0 0 2px;">응답 시간</p>
                  <p class="font-mono" style="font-size:0.72rem;color:#374151;margin:0;">{{ log.duration }}ms</p>
                </div>
                <div>
                  <p style="font-size:0.6rem;font-weight:600;color:#6b7280;text-transform:uppercase;margin:0 0 2px;">사용자</p>
                  <p style="font-size:0.72rem;color:#374151;margin:0;">{{ log.userId || '(미인증)' }}</p>
                </div>
                <div>
                  <p style="font-size:0.6rem;font-weight:600;color:#6b7280;text-transform:uppercase;margin:0 0 2px;">조직</p>
                  <p style="font-size:0.72rem;color:#374151;margin:0;">{{ log.orgMsp || '(없음)' }}</p>
                </div>
              </div>
              <div v-if="log.requestBody">
                <p class="sn-eyebrow" style="margin:0 0 6px;">요청 데이터</p>
                <pre style="font-family:'JetBrains Mono',monospace;font-size:0.72rem;color:#525252;background:#fafafa;box-shadow:inset 0 0 0 1px rgba(0,0,0,0.06);border-radius:8px;padding:12px;overflow-x:auto;max-height:160px;margin:0;">{{ JSON.stringify(log.requestBody, null, 2) }}</pre>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Pagination -->
      <div style="padding:12px 20px;border-top:1px solid rgba(0,0,0,0.06);display:flex;align-items:center;justify-content:space-between;">
        <span style="font-family:'JetBrains Mono',monospace;font-size:0.72rem;color:#a3a3a3;">{{ total }}건 중 {{ (page - 1) * 50 + 1 }}~{{ Math.min(page * 50, total) }}</span>
        <div style="display:flex;align-items:center;gap:8px;">
          <button @click="prevPage" :disabled="page <= 1" class="sn-btn sn-btn-ghost" style="font-size:0.75rem;padding:6px 12px;"
            :style="page <= 1 ? 'opacity:0.3;cursor:not-allowed;' : ''">이전</button>
          <span style="font-family:'JetBrains Mono',monospace;font-size:0.72rem;color:#a3a3a3;font-variant-numeric:tabular-nums;">{{ page }} / {{ totalPages }}</span>
          <button @click="nextPage" :disabled="page >= totalPages" class="sn-btn sn-btn-ghost" style="font-size:0.75rem;padding:6px 12px;"
            :style="page >= totalPages ? 'opacity:0.3;cursor:not-allowed;' : ''">다음</button>
        </div>
      </div>
    </div>
  </div>
  `,
});
