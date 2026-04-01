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

    <!-- ===== 헤더 ===== -->
    <div class="bp-animate-in flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 rounded-xl flex items-center justify-center"
             style="background: linear-gradient(135deg, var(--bp-signal), #059669);">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        </div>
        <div>
          <h1 class="bp-heading text-xl" style="font-family: var(--font-display); color: var(--bp-text-1);">
            배터리 데이터
          </h1>
          <p style="font-family: var(--font-body); color: var(--bp-text-3); font-size: 0.75rem; margin-top: 2px;">
            BMU 실시간 센서 데이터 계기판
          </p>
        </div>
      </div>

      <!-- 자동 새로고침 토글 -->
      <div class="flex items-center gap-3 px-4 py-2 rounded-lg"
           style="background: var(--bp-surface-1); border: 1px solid var(--bp-surface-3);">
        <label class="flex items-center cursor-pointer select-none gap-2">
          <div class="relative">
            <input type="checkbox" v-model="autoRefresh" class="sr-only peer"/>
            <div class="w-10 h-[22px] rounded-full transition-colors"
                 style="background: var(--bp-surface-4);"
                 :style="autoRefresh ? 'background: var(--bp-signal);' : ''"></div>
            <div class="absolute top-[3px] left-[3px] w-4 h-4 rounded-full transition-transform"
                 style="background: var(--bp-surface-2);"
                 :class="autoRefresh ? 'translate-x-[18px]' : ''"></div>
          </div>
          <span style="font-family: var(--font-body); font-size: 0.8rem; font-weight: 500; color: var(--bp-text-2);">
            자동 새로고침
          </span>
        </label>
        <transition name="fade">
          <span v-if="autoRefresh"
                class="inline-flex items-center px-2 py-0.5 rounded-full"
                style="font-family: var(--font-mono); font-size: 0.7rem; font-weight: 600;
                       color: var(--bp-signal); background: rgba(52,211,153,0.1);">
            <span class="w-1.5 h-1.5 rounded-full animate-pulse mr-1.5"
                  style="background: var(--bp-signal);"></span>
            10s 주기
          </span>
        </transition>
      </div>
    </div>

    <!-- ===== 검색바 ===== -->
    <div class="bp-animate-in bp-card p-5" style="animation-delay: 60ms;">
      <div class="flex items-end gap-3">
        <div class="flex-1">
          <label class="block mb-2"
                 style="font-family: var(--font-body); font-size: 0.75rem; font-weight: 600;
                        color: var(--bp-text-2); letter-spacing: 0.02em;">
            <svg class="inline-block w-3.5 h-3.5 mr-1 -mt-0.5" style="color: var(--bp-text-3);"
                 fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            여권 ID
          </label>
          <input v-model="passportId" type="text"
                 placeholder="조회할 배터리 여권 ID를 입력하세요"
                 @keyup.enter="handleSearch"
                 class="bp-input w-full"
                 style="font-family: var(--font-mono); font-size: 0.875rem;
                        padding: 0.65rem 0.85rem;"/>
        </div>
        <button @click="handleSearch"
                :disabled="!passportId.trim() || loading"
                :class="[
                  'bp-btn flex items-center gap-2 px-5',
                  (!passportId.trim() || loading)
                    ? 'bp-btn-ghost cursor-not-allowed opacity-50'
                    : 'bp-btn-primary'
                ]"
                style="padding-top: 0.65rem; padding-bottom: 0.65rem; font-family: var(--font-body);">
          <svg v-if="!loading" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <span style="font-size: 0.875rem; font-weight: 600;">조회</span>
        </button>
      </div>
    </div>

    <!-- ===== 로딩 스피너 (초기 조회) ===== -->
    <div v-if="loading && !autoRefresh"
         class="bp-animate-in bp-card overflow-hidden" style="animation-delay: 120ms;">
      <div class="flex flex-col items-center justify-center py-20">
        <div class="relative w-12 h-12">
          <div class="absolute inset-0 rounded-full"
               style="border: 3px solid var(--bp-surface-3);"></div>
          <div class="absolute inset-0 rounded-full animate-spin"
               style="border: 3px solid transparent; border-top-color: var(--bp-signal);"></div>
        </div>
        <p style="margin-top: 1rem; font-family: var(--font-body); font-size: 0.875rem; color: var(--bp-text-3);">
          데이터를 조회하고 있습니다...
        </p>
      </div>
    </div>

    <!-- ===== 빈 상태: 아직 검색 안함 ===== -->
    <div v-else-if="!hasSearched && !loading"
         class="bp-animate-in bp-card overflow-hidden" style="animation-delay: 120ms;">
      <div class="flex flex-col items-center justify-center py-20 px-6">
        <div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
             style="background: rgba(52,211,153,0.08); border: 1px solid rgba(52,211,153,0.15);">
          <svg class="w-8 h-8" style="color: var(--bp-signal);" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        </div>
        <h3 class="bp-heading" style="font-family: var(--font-display); font-size: 1rem; color: var(--bp-text-1); margin-bottom: 0.35rem;">
          여권 ID를 입력하여 데이터를 조회하세요
        </h3>
        <p style="font-family: var(--font-body); font-size: 0.85rem; color: var(--bp-text-3); text-align: center; max-width: 28rem;">
          배터리 여권 ID를 입력하면 SOC, 전압, 전류, 온도 등 센서 데이터를 확인할 수 있습니다.
        </p>
      </div>
    </div>

    <!-- ===== 빈 상태: 검색했지만 결과 없음 ===== -->
    <div v-else-if="hasSearched && records.length === 0 && !loading"
         class="bp-animate-in bp-card overflow-hidden" style="animation-delay: 120ms;">
      <div class="flex flex-col items-center justify-center py-20 px-6">
        <div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
             style="background: var(--bp-surface-3); border: 1px solid var(--bp-surface-4);">
          <svg class="w-8 h-8" style="color: var(--bp-text-3);" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
          </svg>
        </div>
        <h3 class="bp-heading" style="font-family: var(--font-display); font-size: 1rem; color: var(--bp-text-1); margin-bottom: 0.35rem;">
          데이터가 없습니다
        </h3>
        <p style="font-family: var(--font-body); font-size: 0.85rem; color: var(--bp-text-3);">
          해당 여권에 대한 BMU 기록이 존재하지 않습니다.
        </p>
      </div>
    </div>

    <!-- ===== 데이터 테이블 ===== -->
    <div v-else-if="records.length > 0"
         class="bp-animate-in bp-card overflow-hidden" style="animation-delay: 120ms;">

      <!-- 테이블 상단 바 -->
      <div class="flex items-center justify-between px-5 py-3"
           style="border-bottom: 1px solid var(--bp-surface-3); background: var(--bp-surface-1);">
        <div class="flex items-center gap-2.5">
          <svg class="w-4 h-4" style="color: var(--bp-signal);" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
          </svg>
          <span style="font-family: var(--font-display); font-size: 0.875rem; font-weight: 600; color: var(--bp-text-2);">
            조회 결과
          </span>
          <span class="inline-flex items-center px-2 py-0.5 rounded-full"
                style="font-family: var(--font-mono); font-size: 0.7rem; font-weight: 600;
                       color: var(--bp-signal); background: rgba(52,211,153,0.1);">
            {{ records.length }}건
          </span>
        </div>
        <div class="flex items-center gap-3">
          <!-- 자동 갱신 중 인디케이터 -->
          <transition name="fade">
            <span v-if="refreshing" class="inline-flex items-center gap-1.5"
                  style="font-family: var(--font-body); font-size: 0.75rem; color: var(--bp-signal);">
              <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              갱신 중...
            </span>
          </transition>
          <span class="px-2 py-0.5 rounded"
                style="font-family: var(--font-mono); font-size: 0.7rem;
                       color: var(--bp-text-3); background: var(--bp-surface-3);">
            {{ passportId }}
          </span>
        </div>
      </div>

      <!-- 테이블 본체 -->
      <div class="overflow-x-auto">
        <table class="bp-table w-full" style="font-family: var(--font-body);">
          <thead>
            <tr style="background: var(--bp-surface-1);">
              <th style="padding: 0.7rem 1rem; text-align: left; font-family: var(--font-display);
                         font-size: 0.7rem; font-weight: 700; letter-spacing: 0.06em;
                         text-transform: uppercase; color: var(--bp-text-3);
                         border-bottom: 1px solid var(--bp-surface-3);">
                시간
              </th>
              <th style="padding: 0.7rem 1rem; text-align: right; font-family: var(--font-display);
                         font-size: 0.7rem; font-weight: 700; letter-spacing: 0.06em;
                         text-transform: uppercase; color: var(--bp-text-3);
                         border-bottom: 1px solid var(--bp-surface-3);">
                SOC (%)
              </th>
              <th style="padding: 0.7rem 1rem; text-align: right; font-family: var(--font-display);
                         font-size: 0.7rem; font-weight: 700; letter-spacing: 0.06em;
                         text-transform: uppercase; color: var(--bp-text-3);
                         border-bottom: 1px solid var(--bp-surface-3);">
                전압 (V)
              </th>
              <th style="padding: 0.7rem 1rem; text-align: right; font-family: var(--font-display);
                         font-size: 0.7rem; font-weight: 700; letter-spacing: 0.06em;
                         text-transform: uppercase; color: var(--bp-text-3);
                         border-bottom: 1px solid var(--bp-surface-3);">
                전류 (A)
              </th>
              <th style="padding: 0.7rem 1rem; text-align: right; font-family: var(--font-display);
                         font-size: 0.7rem; font-weight: 700; letter-spacing: 0.06em;
                         text-transform: uppercase; color: var(--bp-text-3);
                         border-bottom: 1px solid var(--bp-surface-3);">
                온도 (&deg;C)
              </th>
              <th style="padding: 0.7rem 1rem; text-align: right; font-family: var(--font-display);
                         font-size: 0.7rem; font-weight: 700; letter-spacing: 0.06em;
                         text-transform: uppercase; color: var(--bp-text-3);
                         border-bottom: 1px solid var(--bp-surface-3);">
                사이클
              </th>
              <th style="padding: 0.7rem 1rem; text-align: left; font-family: var(--font-display);
                         font-size: 0.7rem; font-weight: 700; letter-spacing: 0.06em;
                         text-transform: uppercase; color: var(--bp-text-3);
                         border-bottom: 1px solid var(--bp-surface-3);">
                상태
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, idx) in sortedRecords" :key="r.recordId || idx"
                class="bp-animate-in"
                :style="'animation-delay: ' + (idx * 30) + 'ms;'"
                :class="idx % 2 === 0
                  ? 'hover:brightness-110'
                  : 'hover:brightness-110'"
                style="transition: background 0.15s;"
                @mouseenter="$event.currentTarget.style.background='rgba(52,211,153,0.04)'"
                @mouseleave="$event.currentTarget.style.background=''">

              <!-- 시간 -->
              <td style="padding: 0.6rem 1rem; white-space: nowrap; font-size: 0.85rem; color: var(--bp-text-2);
                         border-bottom: 1px solid var(--bp-surface-2);">
                {{ formatTimestamp(r.timestamp) }}
              </td>

              <!-- SOC -->
              <td style="padding: 0.6rem 1rem; white-space: nowrap; text-align: right;
                         border-bottom: 1px solid var(--bp-surface-2);">
                <div class="flex items-center justify-end gap-2">
                  <div class="w-16 h-1.5 rounded-full overflow-hidden"
                       style="background: var(--bp-surface-3);">
                    <div class="h-full rounded-full transition-all"
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

              <!-- 전압 -->
              <td style="padding: 0.6rem 1rem; white-space: nowrap; text-align: right;
                         font-family: var(--font-mono); font-size: 0.875rem; color: var(--bp-text-2);
                         border-bottom: 1px solid var(--bp-surface-2);">
                {{ formatNumber(r.voltage, 2) }}
              </td>

              <!-- 전류 -->
              <td style="padding: 0.6rem 1rem; white-space: nowrap; text-align: right;
                         font-family: var(--font-mono); font-size: 0.875rem; color: var(--bp-text-2);
                         border-bottom: 1px solid var(--bp-surface-2);">
                {{ formatNumber(r.current, 2) }}
              </td>

              <!-- 온도 -->
              <td style="padding: 0.6rem 1rem; white-space: nowrap; text-align: right;
                         font-family: var(--font-mono); font-size: 0.875rem; color: var(--bp-text-2);
                         border-bottom: 1px solid var(--bp-surface-2);">
                {{ scaleTemp(r.temperature) }}
              </td>

              <!-- 사이클 -->
              <td style="padding: 0.6rem 1rem; white-space: nowrap; text-align: right;
                         font-family: var(--font-mono); font-size: 0.875rem; color: var(--bp-text-2);
                         border-bottom: 1px solid var(--bp-surface-2);">
                {{ r.dischargeCycles != null ? r.dischargeCycles : '-' }}
              </td>

              <!-- 상태 -->
              <td style="padding: 0.6rem 1rem; white-space: nowrap;
                         border-bottom: 1px solid var(--bp-surface-2);">
                <div class="flex flex-wrap gap-1.5">
                  <span v-for="badge in decodeStatusFlags(r.statusFlags)" :key="badge.label"
                        :class="['inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
                                 getBadgeClasses(badge.color)]"
                        style="font-family: var(--font-body);">
                    <span :class="['w-1.5 h-1.5 rounded-full mr-1.5', getDotClasses(badge.color)]"></span>
                    {{ badge.label }}
                  </span>
                  <span v-if="decodeStatusFlags(r.statusFlags).length === 0"
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style="font-family: var(--font-body); background: var(--bp-surface-1);
                               color: var(--bp-text-3); border: 1px solid var(--bp-surface-3);">
                    <span class="w-1.5 h-1.5 rounded-full mr-1.5"
                          style="background: var(--bp-surface-4);"></span>
                    정상
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 테이블 푸터 -->
      <div class="flex items-center justify-between px-5 py-3"
           style="border-top: 1px solid var(--bp-surface-3); background: var(--bp-surface-1);">
        <span style="font-family: var(--font-body); font-size: 0.75rem; color: var(--bp-text-3);">
          총 {{ records.length }}개 레코드
        </span>
        <span v-if="autoRefresh" class="inline-flex items-center gap-1"
              style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--bp-text-3);">
          <span class="w-1.5 h-1.5 rounded-full animate-pulse"
                style="background: var(--bp-signal);"></span>
          실시간 모니터링 활성
        </span>
      </div>
    </div>

  </div>
  `,
});
