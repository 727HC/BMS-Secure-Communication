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
        blue: 'bg-[--bp-info-dim] text-[#60a5fa] border border-[--bp-border]',
        green: 'bg-[--bp-signal-dim] text-[--bp-signal] border border-[--bp-border-active]',
        red: 'bg-[--bp-danger-dim] text-[--bp-danger] border border-[--bp-border]',
      };
      return map[color] || 'bg-[--bp-surface-1] text-[--bp-text-2] border border-[--bp-border]';
    }

    function getDotClasses(color) {
      const map = {
        blue: 'bg-[#60a5fa]',
        green: 'bg-[#34d399]',
        red: 'bg-red-500',
      };
      return map[color] || 'bg-[--bp-text-3]';
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
      countdown,
    };
  },
  template: `
  <div style="display:flex;flex-direction:column;gap:24px;">

    <!-- ===== HEADER ===== -->
    <div class="bp-animate-in" style="display:flex;align-items:center;justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:14px;">
        <div style="width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--bp-signal),#059669);">
          <svg width="22" height="22" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        </div>
        <div>
          <h1 class="bp-heading" style="font-family:var(--font-display);font-size:1.35rem;color:var(--bp-text-1);margin:0;">
            배터리 데이터
          </h1>
          <p style="font-family:var(--font-body);color:var(--bp-text-3);font-size:0.72rem;margin-top:2px;">
            BMU 실시간 센서 데이터 계기판
          </p>
        </div>
      </div>

      <!-- Auto-refresh toggle with countdown -->
      <div style="display:flex;align-items:center;gap:12px;padding:8px 16px;border-radius:10px;background:var(--bp-surface-1);border:1px solid var(--bp-surface-3);">
        <label style="display:flex;align-items:center;cursor:pointer;user-select:none;gap:10px;">
          <div style="position:relative;">
            <input type="checkbox" v-model="autoRefresh" style="position:absolute;opacity:0;width:0;height:0;"/>
            <div :style="{ width:'40px',height:'22px',borderRadius:'11px',transition:'background 0.2s',background: autoRefresh ? 'var(--bp-signal)' : 'var(--bp-surface-4)' }"></div>
            <div :style="{ position:'absolute',top:'3px',left: autoRefresh ? '21px' : '3px',width:'16px',height:'16px',borderRadius:'50%',background:'var(--bp-surface-2)',boxShadow:'0 1px 3px rgba(0,0,0,0.2)',transition:'left 0.2s' }"></div>
          </div>
          <span style="font-family:var(--font-body);font-size:0.8rem;font-weight:500;color:var(--bp-text-2);">
            자동 새로고침
          </span>
        </label>
        <transition name="fade">
          <span v-if="autoRefresh"
                style="display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:20px;font-family:var(--font-mono);font-size:0.72rem;font-weight:600;color:var(--bp-signal);background:rgba(52,211,153,0.1);">
            <span style="width:6px;height:6px;border-radius:50%;background:var(--bp-signal);animation:pulse 1.5s infinite;"></span>
            {{ countdown }}s
          </span>
        </transition>
      </div>
    </div>

    <!-- ===== SEARCH BAR ===== -->
    <div class="bp-animate-in bp-card" style="padding:20px;animation-delay:60ms;">
      <div style="display:flex;align-items:flex-end;gap:12px;">
        <div style="flex:1;">
          <label style="display:block;margin-bottom:8px;font-family:var(--font-body);font-size:0.75rem;font-weight:600;color:var(--bp-text-2);letter-spacing:0.02em;">
            <svg style="display:inline-block;width:14px;height:14px;margin-right:4px;vertical-align:-2px;color:var(--bp-text-3);"
                 fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            여권 ID
          </label>
          <input v-model="passportId" type="text"
                 placeholder="조회할 배터리 여권 ID를 입력하세요"
                 @keyup.enter="handleSearch"
                 class="bp-input"
                 style="width:100%;font-family:var(--font-mono);font-size:0.875rem;padding:0.65rem 0.85rem;"/>
        </div>
        <button @click="handleSearch"
                :disabled="!passportId.trim() || loading"
                :class="['bp-btn', (!passportId.trim() || loading) ? 'bp-btn-ghost' : 'bp-btn-primary']"
                :style="(!passportId.trim() || loading) ? 'cursor:not-allowed;opacity:0.5;' : ''"
                style="display:inline-flex;align-items:center;gap:8px;padding:0.65rem 1.25rem;font-family:var(--font-body);">
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
    <div v-if="loading && !autoRefresh"
         class="bp-animate-in bp-card" style="overflow:hidden;animation-delay:120ms;">
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 0;">
        <div style="position:relative;width:48px;height:48px;">
          <div style="position:absolute;inset:0;border-radius:50%;border:3px solid var(--bp-surface-3);"></div>
          <div style="position:absolute;inset:0;border-radius:50%;border:3px solid transparent;border-top-color:var(--bp-signal);animation:spin 0.8s linear infinite;"></div>
        </div>
        <p style="margin-top:16px;font-family:var(--font-body);font-size:0.875rem;color:var(--bp-text-3);">
          데이터를 조회하고 있습니다...
        </p>
      </div>
    </div>

    <!-- ===== EMPTY: no search yet ===== -->
    <div v-else-if="!hasSearched && !loading"
         class="bp-animate-in bp-card" style="overflow:hidden;animation-delay:120ms;">
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 24px;">
        <div style="width:64px;height:64px;border-radius:16px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;background:rgba(52,211,153,0.08);border:1px solid rgba(52,211,153,0.15);">
          <svg style="width:32px;height:32px;color:var(--bp-signal);" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        </div>
        <h3 class="bp-heading" style="font-family:var(--font-display);font-size:1rem;color:var(--bp-text-1);margin:0 0 6px;">
          여권 ID를 입력하여 데이터를 조회하세요
        </h3>
        <p style="font-family:var(--font-body);font-size:0.85rem;color:var(--bp-text-3);text-align:center;max-width:28rem;">
          배터리 여권 ID를 입력하면 SOC, 전압, 전류, 온도 등 센서 데이터를 확인할 수 있습니다.
        </p>
      </div>
    </div>

    <!-- ===== EMPTY: searched but no results ===== -->
    <div v-else-if="hasSearched && records.length === 0 && !loading"
         class="bp-animate-in bp-card" style="overflow:hidden;animation-delay:120ms;">
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 24px;">
        <div style="width:64px;height:64px;border-radius:16px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;background:var(--bp-surface-3);border:1px solid var(--bp-surface-4);">
          <svg style="width:32px;height:32px;color:var(--bp-text-3);" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
          </svg>
        </div>
        <h3 class="bp-heading" style="font-family:var(--font-display);font-size:1rem;color:var(--bp-text-1);margin:0 0 6px;">
          데이터가 없습니다
        </h3>
        <p style="font-family:var(--font-body);font-size:0.85rem;color:var(--bp-text-3);">
          해당 여권에 대한 BMU 기록이 존재하지 않습니다.
        </p>
      </div>
    </div>

    <!-- ===== DATA TABLE ===== -->
    <div v-else-if="records.length > 0"
         class="bp-animate-in bp-card" style="overflow:hidden;animation-delay:120ms;">

      <!-- Table top bar -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:1px solid var(--bp-surface-3);background:var(--bp-surface-1);">
        <div style="display:flex;align-items:center;gap:10px;">
          <svg style="width:16px;height:16px;color:var(--bp-signal);" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
          </svg>
          <span style="font-family:var(--font-display);font-size:0.875rem;font-weight:600;color:var(--bp-text-2);">
            조회 결과
          </span>
          <span style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:20px;font-family:var(--font-mono);font-size:0.7rem;font-weight:600;color:var(--bp-signal);background:rgba(52,211,153,0.1);">
            {{ records.length }}건
          </span>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <!-- Refreshing indicator -->
          <transition name="fade">
            <span v-if="refreshing" style="display:inline-flex;align-items:center;gap:6px;font-family:var(--font-body);font-size:0.75rem;color:var(--bp-signal);">
              <svg style="width:14px;height:14px;animation:spin 0.8s linear infinite;" fill="none" viewBox="0 0 24 24">
                <circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              갱신 중...
            </span>
          </transition>
          <span style="padding:2px 8px;border-radius:6px;font-family:var(--font-mono);font-size:0.7rem;color:var(--bp-text-3);background:var(--bp-surface-3);">
            {{ passportId }}
          </span>
        </div>
      </div>

      <!-- Table body -->
      <div style="overflow-x:auto;">
        <table class="bp-table" style="width:100%;font-family:var(--font-body);">
          <thead>
            <tr style="background:var(--bp-surface-1);">
              <th style="padding:0.7rem 1rem;text-align:left;font-family:var(--font-display);font-size:0.7rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--bp-text-3);border-bottom:1px solid var(--bp-surface-3);width:16px;"></th>
              <th style="padding:0.7rem 1rem;text-align:left;font-family:var(--font-display);font-size:0.7rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--bp-text-3);border-bottom:1px solid var(--bp-surface-3);">
                시간
              </th>
              <th style="padding:0.7rem 1rem;text-align:right;font-family:var(--font-display);font-size:0.7rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--bp-text-3);border-bottom:1px solid var(--bp-surface-3);">
                SOC (%)
              </th>
              <th style="padding:0.7rem 1rem;text-align:right;font-family:var(--font-display);font-size:0.7rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--bp-text-3);border-bottom:1px solid var(--bp-surface-3);">
                전압 (V)
              </th>
              <th style="padding:0.7rem 1rem;text-align:right;font-family:var(--font-display);font-size:0.7rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--bp-text-3);border-bottom:1px solid var(--bp-surface-3);">
                전류 (A)
              </th>
              <th style="padding:0.7rem 1rem;text-align:right;font-family:var(--font-display);font-size:0.7rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--bp-text-3);border-bottom:1px solid var(--bp-surface-3);">
                온도 (&deg;C)
              </th>
              <th style="padding:0.7rem 1rem;text-align:right;font-family:var(--font-display);font-size:0.7rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--bp-text-3);border-bottom:1px solid var(--bp-surface-3);">
                사이클
              </th>
              <th style="padding:0.7rem 1rem;text-align:left;font-family:var(--font-display);font-size:0.7rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--bp-text-3);border-bottom:1px solid var(--bp-surface-3);">
                상태
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, idx) in sortedRecords" :key="r.recordId || idx"
                class="bp-animate-in"
                :style="'animation-delay:' + (idx * 30) + 'ms;transition:background 0.15s;' + (idx === 0 ? 'background:rgba(52,211,153,0.04);' : '')"
                @mouseenter="$event.currentTarget.style.background='rgba(52,211,153,0.06)'"
                @mouseleave="$event.currentTarget.style.background = idx === 0 ? 'rgba(52,211,153,0.04)' : ''">

              <!-- Signal bar (first row highlight) -->
              <td style="padding:0;width:4px;border-bottom:1px solid var(--bp-surface-2);position:relative;">
                <div v-if="idx === 0"
                     style="position:absolute;left:0;top:4px;bottom:4px;width:3px;border-radius:0 3px 3px 0;background:var(--bp-signal);animation:pulse 2s infinite;"></div>
              </td>

              <!-- Time -->
              <td style="padding:0.6rem 1rem;white-space:nowrap;font-size:0.85rem;color:var(--bp-text-2);border-bottom:1px solid var(--bp-surface-2);">
                {{ formatTimestamp(r.timestamp) }}
              </td>

              <!-- SOC -->
              <td style="padding:0.6rem 1rem;white-space:nowrap;text-align:right;border-bottom:1px solid var(--bp-surface-2);">
                <div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;">
                  <div style="width:64px;height:6px;border-radius:999px;overflow:hidden;background:var(--bp-surface-3);">
                    <div style="height:100%;border-radius:999px;transition:all 0.3s;"
                         :style="{
                           width: Math.min(scaleSOC(r.soc), 100) + '%',
                           background: scaleSOC(r.soc) > 50
                             ? 'var(--bp-signal)'
                             : scaleSOC(r.soc) > 20
                               ? '#f59e0b'
                               : '#ef4444'
                         }"></div>
                  </div>
                  <span :style="{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          color: scaleSOC(r.soc) > 50
                            ? 'var(--bp-signal)'
                            : scaleSOC(r.soc) > 20
                              ? '#f59e0b'
                              : '#ef4444'
                        }">
                    {{ scaleSOC(r.soc) }}
                  </span>
                </div>
              </td>

              <!-- Voltage -->
              <td style="padding:0.6rem 1rem;white-space:nowrap;text-align:right;font-family:var(--font-mono);font-size:0.875rem;color:var(--bp-text-2);border-bottom:1px solid var(--bp-surface-2);">
                {{ formatNumber(r.voltage, 2) }}
              </td>

              <!-- Current -->
              <td style="padding:0.6rem 1rem;white-space:nowrap;text-align:right;font-family:var(--font-mono);font-size:0.875rem;color:var(--bp-text-2);border-bottom:1px solid var(--bp-surface-2);">
                {{ formatNumber(r.current, 2) }}
              </td>

              <!-- Temperature -->
              <td style="padding:0.6rem 1rem;white-space:nowrap;text-align:right;font-family:var(--font-mono);font-size:0.875rem;color:var(--bp-text-2);border-bottom:1px solid var(--bp-surface-2);">
                {{ scaleTemp(r.temperature) }}
              </td>

              <!-- Cycle -->
              <td style="padding:0.6rem 1rem;white-space:nowrap;text-align:right;font-family:var(--font-mono);font-size:0.875rem;color:var(--bp-text-2);border-bottom:1px solid var(--bp-surface-2);">
                {{ r.dischargeCycles != null ? r.dischargeCycles : '-' }}
              </td>

              <!-- Status -->
              <td style="padding:0.6rem 1rem;white-space:nowrap;border-bottom:1px solid var(--bp-surface-2);">
                <div style="display:flex;flex-wrap:wrap;gap:6px;">
                  <span v-for="badge in decodeStatusFlags(r.statusFlags)" :key="badge.label"
                        :class="['inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
                                 getBadgeClasses(badge.color)]"
                        style="font-family:var(--font-body);">
                    <span :class="['w-1.5 h-1.5 rounded-full mr-1.5', getDotClasses(badge.color)]"></span>
                    {{ badge.label }}
                  </span>
                  <span v-if="decodeStatusFlags(r.statusFlags).length === 0"
                        style="display:inline-flex;align-items:center;padding:2px 10px;border-radius:20px;font-size:0.75rem;font-weight:500;font-family:var(--font-body);background:var(--bp-surface-1);color:var(--bp-text-3);border:1px solid var(--bp-surface-3);">
                    <span style="width:6px;height:6px;border-radius:50%;margin-right:6px;background:var(--bp-surface-4);"></span>
                    정상
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Table footer -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-top:1px solid var(--bp-surface-3);background:var(--bp-surface-1);">
        <span style="font-family:var(--font-body);font-size:0.75rem;color:var(--bp-text-3);">
          총 {{ records.length }}개 레코드
        </span>
        <span v-if="autoRefresh" style="display:inline-flex;align-items:center;gap:6px;font-family:var(--font-mono);font-size:0.7rem;color:var(--bp-text-3);">
          <span style="width:6px;height:6px;border-radius:50%;background:var(--bp-signal);animation:pulse 1.5s infinite;"></span>
          실시간 모니터링 활성 &middot; {{ countdown }}s 후 갱신
        </span>
      </div>
    </div>

  </div>
  `,
});
