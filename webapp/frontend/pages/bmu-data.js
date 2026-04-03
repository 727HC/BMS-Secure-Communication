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
    const lastFetchedAt = ref(null);

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
        blue: 'bg-[rgba(107,163,255,0.1)] text-[#60a5fa] border border-[rgba(250,250,245,0.06)]',
        green: 'bg-[rgba(200,255,0,0.08)] text-[#c8ff00] border border-emerald-500',
        red: 'bg-[rgba(239,68,68,0.1)] text-[#ff6b6b] border border-[rgba(250,250,245,0.06)]',
      };
      return map[color] || 'bg-[#1a1814] text-[rgba(250,250,245,0.7)] border border-[rgba(250,250,245,0.06)]';
    }

    function getDotClasses(color) {
      const map = {
        blue: 'bg-[#60a5fa]',
        green: 'bg-[#34d399]',
        red: 'bg-[rgba(239,68,68,0.1)]0',
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
        lastFetchedAt.value = new Date();
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

    // Use global scaleSOC/scaleTemp from app.js

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

    // Countdown timer for auto-refresh
    const countdown = ref(10);
    let countdownId = null;

    function startCountdown() {
      stopCountdown();
      countdown.value = 10;
      countdownId = setInterval(() => {
        countdown.value--;
        if (countdown.value <= 0) countdown.value = 10;
      }, 1000);
    }

    function stopCountdown() {
      if (countdownId) {
        clearInterval(countdownId);
        countdownId = null;
      }
    }

    watch(autoRefresh, (val) => {
      if (val) {
        startAutoRefresh();
        startCountdown();
      } else {
        stopAutoRefresh();
        stopCountdown();
      }
    });

    Vue.onUnmounted(() => {
      stopAutoRefresh();
      stopCountdown();
    });

    return {
      passportId, records, loading, autoRefresh, refreshing, hasSearched,
      sortedRecords, decodeStatusFlags, getBadgeClasses, getDotClasses,
      fetchRecords, handleSearch, formatTimestamp, formatNumber, scaleSOC, scaleTemp,
      countdown, lastFetchedAt,
    };
  },
  template: `
  <div style="display:flex;flex-direction:column;gap:16px;">

    <!-- ===== HEADER ===== -->
    <div style="padding-bottom:0.75rem;border-bottom:1px solid var(--color-border,rgba(0,0,0,0.08));display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <div>
        <div style="display:flex;align-items:center;">
          <h1 class="sn-display" style="font-size:1.5rem;margin:0;">배터리 데이터</h1>
          <span v-if="autoRefresh" style="display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.25rem 0.625rem; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 9999px; font-size: 0.6875rem; font-weight: 600; color: #16a34a; margin-left: 0.75rem;">
            <span style="width: 6px; height: 6px; border-radius: 50%; background: #16a34a; animation: pulse 1.5s infinite;"></span>
            LIVE
          </span>
        </div>
        <p class="sn-caption" style="margin-top:0.2rem;font-size:0.78rem;">BMU 실시간 센서 데이터 계기판</p>
      </div>

      <!-- Auto-refresh toggle with countdown -->
      <div class="sn-panel" style="display:flex;align-items:center;gap:12px;padding:8px 16px;">
        <label style="display:flex;align-items:center;cursor:pointer;user-select:none;gap:10px;">
          <div style="position:relative;">
            <input type="checkbox" v-model="autoRefresh" style="position:absolute;opacity:0;width:0;height:0;"/>
            <div :style="{ width:'40px',height:'22px',borderRadius:'11px',transition:'background 0.2s',background: autoRefresh ? '#059669' : '#e2e8f0' }"></div>
            <div :style="{ position:'absolute',top:'3px',left: autoRefresh ? '21px' : '3px',width:'16px',height:'16px',borderRadius:'50%',background:'#ffffff',boxShadow:'0 1px 3px rgba(0,0,0,0.2)',transition:'left 0.2s' }"></div>
          </div>
          <span style="font-family:'Pretendard Variable', sans-serif;font-size:0.8rem;font-weight:500;color:#374151;">
            자동 새로고침
          </span>
        </label>
        <transition name="fade">
          <span v-if="autoRefresh"
                style="display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:20px;font-family:'JetBrains Mono', monospace;font-size:0.72rem;font-weight:600;color:#059669;background:rgba(52,211,153,0.1);">
            <span style="width:6px;height:6px;border-radius:50%;background:#059669;animation:pulse 1.5s infinite;"></span>
            {{ countdown }}s
          </span>
        </transition>
      </div>
    </div>

    <!-- ===== SEARCH BAR ===== -->
    <div class="sn-panel" style="padding:12px 16px;">
      <div style="display:flex;align-items:flex-end;gap:12px;">
        <div style="flex:1;">
          <label class="sn-eyebrow" style="display:block;margin-bottom:8px;">
            <svg style="display:inline-block;width:14px;height:14px;margin-right:4px;vertical-align:-2px;color:#a3a3a3;"
                 fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            여권 ID
          </label>
          <input v-model="passportId" type="text"
                 placeholder="조회할 배터리 여권 ID를 입력하세요"
                 @keyup.enter="handleSearch"
                 class="sn-input"
                 style="width:100%;font-family:'JetBrains Mono',monospace;font-size:0.875rem;"/>
        </div>
        <button @click="handleSearch"
                :disabled="!passportId.trim() || loading"
                class="sn-btn sn-btn-primary"
                :style="(!passportId.trim() || loading) ? 'cursor:not-allowed;opacity:0.5;' : ''"
                style="display:inline-flex;align-items:center;gap:8px;">
          <svg v-if="!loading" style="width:16px;height:16px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <svg v-else style="width:16px;height:16px;animation:spin 0.8s linear infinite;" fill="none" viewBox="0 0 24 24">
            <circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <span style="font-size:0.875rem;font-weight:600;">조회</span>
        </button>
      </div>
    </div>

    <!-- ===== LOADING (initial) ===== -->
    <div v-if="loading && !autoRefresh" class="sn-panel" style="overflow:hidden;">
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 0;">
        <div style="position:relative;width:48px;height:48px;">
          <div style="position:absolute;inset:0;border-radius:50%;border:3px solid #e5e5e5;"></div>
          <div style="position:absolute;inset:0;border-radius:50%;border:3px solid transparent;border-top-color:#171717;animation:spin 0.8s linear infinite;"></div>
        </div>
        <p style="margin-top:16px;font-size:0.875rem;color:#a3a3a3;">데이터를 조회하고 있습니다...</p>
      </div>
    </div>

    <!-- ===== EMPTY: no search yet ===== -->
    <div v-else-if="!hasSearched && !loading" class="sn-panel" style="overflow:hidden;">
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 24px;">
        <div style="width:56px;height:56px;border-radius:12px;background:#f5f5f5;display:flex;align-items:center;justify-content:center;margin-bottom:20px;">
          <svg width="28" height="28" fill="none" stroke="#a3a3a3" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        </div>
        <h3 style="font-size:1rem;font-weight:600;color:#171717;margin:0 0 6px;">여권 ID를 입력하여 데이터를 조회하세요</h3>
        <p style="font-size:0.85rem;color:#a3a3a3;text-align:center;max-width:28rem;">
          배터리 여권 ID를 입력하면 SOC, 전압, 전류, 온도 등 센서 데이터를 확인할 수 있습니다.
        </p>
      </div>
    </div>

    <!-- ===== EMPTY: searched but no results ===== -->
    <div v-else-if="hasSearched && records.length === 0 && !loading" class="sn-panel" style="overflow:hidden;">
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 24px;">
        <div style="width:56px;height:56px;border-radius:12px;background:#f5f5f5;display:flex;align-items:center;justify-content:center;margin-bottom:20px;">
          <svg width="28" height="28" fill="none" stroke="#a3a3a3" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
          </svg>
        </div>
        <h3 style="font-size:1rem;font-weight:600;color:#171717;margin:0 0 6px;">데이터가 없습니다</h3>
        <p style="font-size:0.85rem;color:#a3a3a3;">해당 여권에 대한 BMU 기록이 존재하지 않습니다.</p>
      </div>
    </div>

    <!-- ===== DATA TABLE ===== -->
    <div v-else-if="records.length > 0" class="sn-panel" style="overflow:hidden;">

      <!-- Table top bar -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:1px solid rgba(0,0,0,0.06);">
        <div style="display:flex;align-items:center;gap:10px;">
          <svg style="width:16px;height:16px;color:#059669;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
          </svg>
          <span style="font-family:'Pretendard Variable', sans-serif;font-size:0.875rem;font-weight:600;color:#374151;">
            조회 결과
          </span>
          <span style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:20px;font-family:'JetBrains Mono', monospace;font-size:0.7rem;font-weight:600;color:#059669;background:rgba(52,211,153,0.1);">
            {{ records.length }}건
          </span>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <!-- Refreshing indicator -->
          <transition name="fade">
            <span v-if="refreshing" style="display:inline-flex;align-items:center;gap:6px;font-family:'Pretendard Variable', sans-serif;font-size:0.75rem;color:#059669;">
              <svg style="width:14px;height:14px;animation:spin 0.8s linear infinite;" fill="none" viewBox="0 0 24 24">
                <circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              갱신 중...
            </span>
          </transition>
          <span style="padding:2px 8px;border-radius:6px;font-family:'JetBrains Mono', monospace;font-size:0.7rem;color:#6b7280;background:#f1f5f9;">
            {{ passportId }}
          </span>
          <span v-if="lastFetchedAt" style="font-size:0.7rem;color:#a3a3a3;">
            최근 조회: {{ lastFetchedAt.toLocaleTimeString('ko-KR') }}
          </span>
        </div>
      </div>

      <!-- Table body -->
      <div style="overflow-x:auto;font-size:0.8125rem;">
        <table class="sn-table">
          <thead>
            <tr>
              <th style="width:16px;"></th>
              <th>시간</th>
              <th style="text-align:right;">SOC (%)</th>
              <th style="text-align:right;">전압 (V)</th>
              <th style="text-align:right;">전류 (A)</th>
              <th style="text-align:right;">온도 (°C)</th>
              <th style="text-align:right;">사이클</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, idx) in sortedRecords" :key="r.recordId || idx"
                style="transition:all 0.5s cubic-bezier(0.16,1,0.3,1);">

              <!-- Signal bar (first row highlight) -->
              <td style="padding:0;width:4px;position:relative;">
                <div v-if="idx === 0"
                     style="position:absolute;left:0;top:4px;bottom:4px;width:3px;border-radius:0 3px 3px 0;background:#171717;animation:pulse 2s infinite;"></div>
              </td>

              <!-- Time -->
              <td style="white-space:nowrap;font-size:0.85rem;color:#525252;">
                {{ formatTimestamp(r.timestamp) }}
              </td>

              <!-- SOC -->
              <td style="white-space:nowrap;text-align:right;">
                <div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;">
                  <div style="width:64px;height:6px;border-radius:999px;overflow:hidden;background:#e5e5e5;">
                    <div style="height:100%;border-radius:999px;transition:all 0.3s;"
                         :style="{ width:Math.min(scaleSOC(r.soc),100)+'%', background:scaleSOC(r.soc)>50?'#171717':scaleSOC(r.soc)>20?'#f59e0b':'#ef4444' }"></div>
                  </div>
                  <span style="font-family:'JetBrains Mono',monospace;font-size:0.85rem;font-weight:700;"
                        :style="{ color:scaleSOC(r.soc)>50?'#171717':scaleSOC(r.soc)>20?'#f59e0b':'#ef4444' }">
                    {{ scaleSOC(r.soc) }}
                  </span>
                </div>
              </td>

              <!-- Voltage -->
              <td style="white-space:nowrap;text-align:right;font-family:'JetBrains Mono',monospace;font-size:0.85rem;color:#525252;">
                {{ formatNumber(r.voltage, 2) }}
              </td>

              <!-- Current -->
              <td style="white-space:nowrap;text-align:right;font-family:'JetBrains Mono',monospace;font-size:0.85rem;color:#525252;">
                {{ formatNumber(r.current, 2) }}
              </td>

              <!-- Temperature -->
              <td style="white-space:nowrap;text-align:right;font-family:'JetBrains Mono',monospace;font-size:0.85rem;color:#525252;">
                {{ scaleTemp(r.temperature) }}
              </td>

              <!-- Cycle -->
              <td style="white-space:nowrap;text-align:right;font-family:'JetBrains Mono',monospace;font-size:0.85rem;color:#525252;">
                {{ r.dischargeCycles != null ? r.dischargeCycles : '-' }}
              </td>

              <!-- Status -->
              <td style="white-space:nowrap;">
                <div style="display:flex;flex-wrap:wrap;gap:6px;">
                  <span v-for="badge in decodeStatusFlags(r.statusFlags)" :key="badge.label"
                        :class="['inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold', getBadgeClasses(badge.color)]">
                    <span :class="['w-1.5 h-1.5 rounded-full mr-1.5', getDotClasses(badge.color)]"></span>
                    {{ badge.label }}
                  </span>
                  <span v-if="decodeStatusFlags(r.statusFlags).length === 0"
                        style="display:inline-flex;align-items:center;padding:2px 10px;border-radius:20px;font-size:0.75rem;font-weight:500;background:#f5f5f5;color:#525252;box-shadow:inset 0 0 0 1px rgba(0,0,0,0.06);">
                    <span style="width:6px;height:6px;border-radius:50%;margin-right:6px;background:#d4d4d4;"></span>
                    정상
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Table footer -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-top:1px solid rgba(0,0,0,0.06);">
        <span style="font-size:0.75rem;color:#a3a3a3;">총 {{ records.length }}개 레코드</span>
        <span v-if="autoRefresh" style="display:inline-flex;align-items:center;gap:6px;font-family:'JetBrains Mono',monospace;font-size:0.7rem;color:#a3a3a3;">
          <span style="width:6px;height:6px;border-radius:50%;background:#171717;animation:pulse 1.5s infinite;"></span>
          실시간 모니터링 활성 · {{ countdown }}s 후 갱신
        </span>
      </div>
    </div>

  </div>
  `,
});
