app.component('dashboard-page', {
  props: ['auth', 'api'],
  emits: ['navigate'],
  setup(props, { emit }) {
    const { ref, computed, onMounted } = Vue;

    const passports = ref([]);
    const loading = ref(true);
    const materials = ref([]);

    /* ---------- data fetching ---------- */
    onMounted(async () => {
      try {
        const [passportData, statusData, materialData] = await Promise.allSettled([
          props.api.get('/passports'),
          props.api.get('/status'),
          props.api.get('/materials'),
        ]);
        if (passportData.status === 'fulfilled') {
          const d = passportData.value;
          passports.value = d.records || d || [];
        }
        if (materialData.status === 'fulfilled') {
          const m = materialData.value;
          materials.value = Array.isArray(m) ? m : (m.records || []);
        }
      } catch (e) {
        passports.value = [];
      } finally {
        loading.value = false;
      }
    });

    /* ---------- helpers ---------- */
    function truncate(str, len) {
      if (!str) return '-';
      return str.length > len ? str.slice(0, len) + '...' : str;
    }

    function formatDate(d) {
      if (!d) return '-';
      try {
        const dt = new Date(d);
        if (isNaN(dt)) return d;
        return dt.toLocaleDateString('ko-KR');
      } catch { return d; }
    }

    /* ---------- status config ---------- */
    const statusList = STATUS_LIST;
    const statusLabels = STATUS_LABELS;

    /* ---------- computed ---------- */
    const totalCount = computed(() => passports.value.length);

    const countByStatus = computed(() => {
      const map = {};
      statusList.forEach(s => map[s] = 0);
      passports.value.forEach(p => {
        const s = p.status || 'UNKNOWN';
        if (map[s] !== undefined) map[s]++;
      });
      return map;
    });

    const activeCount = computed(() => countByStatus.value['ACTIVE'] || 0);
    const maintenanceCount = computed(() => countByStatus.value['MAINTENANCE'] || 0);
    const materialCount = computed(() => materials.value.length);

    /* ---------- 화학 구성 distribution ---------- */
    const chemistryDistribution = computed(() => {
      const map = {};
      passports.value.forEach(p => {
        const c = p.chemistry || 'Unknown';
        map[c] = (map[c] || 0) + 1;
      });
      const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
      const colors = ['#34d399', '#60a5fa', '#a78bfa', '#fbbf24', '#f87171'];
      return entries.map(([name, count], i) => ({
        name, count, color: colors[i % colors.length],
      }));
    });

    /* ---------- Status distribution ---------- */
    const statusDistribution = computed(() => {
      const statusColors = {
        MANUFACTURED: '#60a5fa',
        ACTIVE: '#34d399',
        MAINTENANCE: '#fbbf24',
        ANALYSIS: '#a78bfa',
        RECYCLING: '#f97316',
        DISPOSED: '#64748b',
      };
      const items = [];
      statusList.forEach(s => {
        const count = countByStatus.value[s] || 0;
        if (count > 0) {
          items.push({ status: s, label: statusLabels[s], count, color: statusColors[s] || '#64748b' });
        }
      });
      return items;
    });

    /* ---------- Donut chart SVG helpers ---------- */
    function donutSegments(items) {
      const total = items.reduce((s, it) => s + it.count, 0);
      if (total === 0) return [];
      const circumference = 2 * Math.PI * 40;
      let offset = 0;
      return items.map(it => {
        const pct = it.count / total;
        const dash = pct * circumference;
        const seg = { ...it, dashArray: dash + ' ' + (circumference - dash), dashOffset: -offset };
        offset += dash;
        return seg;
      });
    }

    const chemistrySegments = computed(() => donutSegments(chemistryDistribution.value));
    const statusSegments = computed(() => donutSegments(statusDistribution.value));
    const chemTotal = computed(() => chemistryDistribution.value.reduce((s, it) => s + it.count, 0));
    const statTotal = computed(() => statusDistribution.value.reduce((s, it) => s + it.count, 0));

    /* ---------- recent passports ---------- */
    const recentPassports = computed(() => {
      const sorted = [...passports.value].sort((a, b) => {
        const da = a.createdAt || a.timestamp || '';
        const db = b.createdAt || b.timestamp || '';
        return db.localeCompare(da);
      });
      return sorted.slice(0, 8);
    });

    function nav(page) { emit('navigate', page); }

    return {
      loading, passports, materials,
      totalCount, activeCount, maintenanceCount, materialCount,
      statusList, statusLabels,
      countByStatus, statusDistribution,
      chemistryDistribution, chemistrySegments, chemTotal,
      statusSegments, statTotal,
      recentPassports,
      scaleSOC, truncate, formatDate, nav,
    };
  },
  template: `
    <div>

      <!-- ═══ LOADING ═══ -->
      <div v-if="loading" class="flex flex-col justify-center items-center py-32">
        <div class="relative w-16 h-16 mb-4">
          <div class="absolute inset-0 rounded-full border-2 border-transparent" style="border-top-color: var(--bp-signal); animation: spin 0.8s linear infinite;"></div>
          <div class="absolute inset-2 rounded-full border-2 border-transparent" style="border-bottom-color: var(--bp-signal); opacity: 0.4; animation: spin 1.2s linear infinite reverse;"></div>
        </div>
        <p class="text-sm" style="color: var(--bp-text-3); font-family: var(--font-mono);">LOADING SYSTEM DATA...</p>
      </div>

      <div v-else class="space-y-6">

        <!-- ═══ HEADER ═══ -->
        <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 bp-animate-in">
          <div>
            <div class="flex items-center gap-3 mb-1">
              <h1 class="text-2xl bp-heading" style="font-family: var(--font-display);">대시보드</h1>
              <span class="px-2 py-0.5 rounded text-[10px] font-medium" style="background: var(--bp-signal-dim); color: var(--bp-signal); font-family: var(--font-mono);">LIVE</span>
            </div>
            <p class="text-sm" style="color: var(--bp-text-3);">배터리 여권 시스템 현황을 실시간으로 모니터링합니다.</p>
          </div>
          <button @click="nav('passports')" class="bp-btn bp-btn-primary">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            여권 발급
          </button>
        </div>

        <!-- ═══ KPI GAUGE CARDS — 4-column grid ═══ -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 bp-animate-in bp-delay-1">

          <!-- Gauge 1: 전체 여권 -->
          <div @click="nav('passports')" class="bp-card-glow bp-stat p-5 cursor-pointer group transition-all duration-200 hover:translate-y-[-2px] hover:shadow-xl">
            <div class="flex items-center justify-between mb-3">
              <div class="w-9 h-9 rounded-lg flex items-center justify-center" style="background: var(--bp-signal-dim);">
                <svg class="w-4.5 h-4.5" style="color: var(--bp-signal);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <svg class="w-4 h-4 transition-transform group-hover:translate-x-1" style="color: var(--bp-text-muted);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
            <div class="bp-stat-value" style="font-size: 2rem;">{{ totalCount }}</div>
            <div class="bp-stat-label mt-1">전체 여권</div>
          </div>

          <!-- Gauge 2: 운행중 -->
          <div @click="nav('passports')" class="bp-card-glow bp-stat p-5 cursor-pointer group transition-all duration-200 hover:translate-y-[-2px] hover:shadow-xl">
            <div class="flex items-center justify-between mb-3">
              <div class="w-9 h-9 rounded-lg flex items-center justify-center" style="background: rgba(96,165,250,0.15);">
                <svg class="w-4.5 h-4.5" style="color: #60a5fa;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </div>
              <div class="bp-dot bp-dot-signal"></div>
            </div>
            <div class="bp-stat-value" style="font-size: 2rem; color: #60a5fa;">{{ activeCount }}</div>
            <div class="bp-stat-label mt-1">운행중</div>
          </div>

          <!-- Gauge 3: 정비 대기 -->
          <div @click="nav('maintenance')" class="bp-card-glow bp-stat p-5 cursor-pointer group transition-all duration-200 hover:translate-y-[-2px] hover:shadow-xl">
            <div class="flex items-center justify-between mb-3">
              <div class="w-9 h-9 rounded-lg flex items-center justify-center" style="background: var(--bp-warn-dim);">
                <svg class="w-4.5 h-4.5" style="color: var(--bp-warn);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
                </svg>
              </div>
              <div v-if="maintenanceCount > 0" class="bp-dot bp-dot-warn"></div>
            </div>
            <div class="bp-stat-value" style="font-size: 2rem; color: var(--bp-warn);">{{ maintenanceCount }}</div>
            <div class="bp-stat-label mt-1">정비 대기</div>
          </div>

          <!-- Gauge 4: 원자재 -->
          <div @click="nav('materials')" class="bp-card-glow bp-stat p-5 cursor-pointer group transition-all duration-200 hover:translate-y-[-2px] hover:shadow-xl">
            <div class="flex items-center justify-between mb-3">
              <div class="w-9 h-9 rounded-lg flex items-center justify-center" style="background: var(--bp-purple-dim);">
                <svg class="w-4.5 h-4.5" style="color: var(--bp-purple);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                </svg>
              </div>
            </div>
            <div class="bp-stat-value" style="font-size: 2rem; color: var(--bp-purple);">{{ materialCount }}</div>
            <div class="bp-stat-label mt-1">등록 원자재</div>
          </div>
        </div>

        <!-- ═══ CHARTS ROW ═══ -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 bp-animate-in bp-delay-2">

          <!-- Chemistry donut -->
          <div class="bp-card p-6 transition-all duration-200">
            <div class="flex items-center justify-between mb-5">
              <h2 class="text-sm font-semibold bp-heading" style="font-family: var(--font-display);">화학 구성</h2>
              <span class="text-[10px] font-medium" style="color: var(--bp-text-muted); font-family: var(--font-mono);">COMPOSITION</span>
            </div>
            <div class="flex items-center gap-6">
              <!-- Donut -->
              <div class="relative flex-shrink-0" style="width: 130px; height: 130px;">
                <svg viewBox="0 0 100 100" class="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="var(--bp-surface-4)" stroke-width="10"/>
                  <circle v-for="(seg, i) in chemistrySegments" :key="i"
                    cx="50" cy="50" r="40" fill="none"
                    :stroke="seg.color" stroke-width="10"
                    :stroke-dasharray="seg.dashArray"
                    :stroke-dashoffset="seg.dashOffset"
                    stroke-linecap="round"
                    style="transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);"/>
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center">
                  <span class="text-xl font-bold" style="font-family: var(--font-display); color: var(--bp-text-1);">{{ chemTotal }}</span>
                  <span class="text-[9px] uppercase tracking-widest" style="color: var(--bp-text-muted); font-family: var(--font-mono);">TOTAL</span>
                </div>
              </div>
              <!-- Legend -->
              <div class="flex-1 space-y-2">
                <div v-for="item in chemistryDistribution" :key="item.name" class="flex items-center justify-between group">
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-sm flex-shrink-0" :style="{ backgroundColor: item.color }"></span>
                    <span class="text-xs" style="color: var(--bp-text-2);">{{ item.name }}</span>
                  </div>
                  <span class="text-xs font-bold tabular-nums" style="color: var(--bp-text-1); font-family: var(--font-mono);">{{ item.count }}</span>
                </div>
                <div v-if="chemistryDistribution.length === 0" class="text-xs py-4" style="color: var(--bp-text-muted);">데이터 없음</div>
              </div>
            </div>
          </div>

          <!-- Status bar chart -->
          <div class="bp-card p-6 transition-all duration-200">
            <div class="flex items-center justify-between mb-5">
              <h2 class="text-sm font-semibold bp-heading" style="font-family: var(--font-display);">상태 분포</h2>
              <span class="text-[10px] font-medium" style="color: var(--bp-text-muted); font-family: var(--font-mono);">STATUS</span>
            </div>
            <div class="space-y-3">
              <div v-for="item in statusDistribution" :key="item.status" class="flex items-center gap-3">
                <span class="text-[11px] font-medium w-14 text-right flex-shrink-0 tabular-nums" :style="{ color: item.color }">{{ item.label }}</span>
                <div class="flex-1 h-5 rounded overflow-hidden" style="background: var(--bp-surface-3);">
                  <div class="h-full rounded transition-all duration-700" style="min-width: 2px;"
                    :style="{ width: (statTotal > 0 ? item.count / statTotal * 100 : 0) + '%', backgroundColor: item.color, opacity: 0.85 }"></div>
                </div>
                <span class="text-xs font-bold tabular-nums w-6 text-right flex-shrink-0" style="color: var(--bp-text-1); font-family: var(--font-mono);">{{ item.count }}</span>
              </div>
              <div v-if="statusDistribution.length === 0" class="text-xs py-6 text-center" style="color: var(--bp-text-muted);">데이터 없음</div>
            </div>
            <div v-if="statusDistribution.length > 0" class="mt-4 pt-3 flex items-center justify-between" style="border-top: 1px solid var(--bp-border);">
              <span class="text-[10px]" style="color: var(--bp-text-muted); font-family: var(--font-mono);">합계</span>
              <span class="text-xs font-bold tabular-nums" style="color: var(--bp-text-2); font-family: var(--font-mono);">{{ statTotal }}건</span>
            </div>
          </div>
        </div>

        <!-- ═══ RECENT TABLE ═══ -->
        <div class="bp-card overflow-hidden bp-animate-in bp-delay-3">
          <div class="px-5 py-4 flex items-center justify-between" style="border-bottom: 1px solid var(--bp-border);">
            <div class="flex items-center gap-2">
              <div class="w-1.5 h-4 rounded-full" style="background: var(--bp-signal);"></div>
              <h2 class="text-sm font-semibold" style="font-family: var(--font-display); color: var(--bp-text-1);">최근 등록</h2>
            </div>
            <button @click="nav('passports')" class="text-xs font-medium flex items-center gap-1 transition-colors" style="color: var(--bp-text-3);"
              onmouseenter="this.style.color='var(--bp-signal)'" onmouseleave="this.style.color='var(--bp-text-3)'">
              전체 보기
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>

          <div v-if="recentPassports.length > 0" class="overflow-x-auto">
            <table class="bp-table">
              <thead>
                <tr>
                  <th>제조사</th>
                  <th>모델</th>
                  <th>무게</th>
                  <th>화학</th>
                  <th>등록일</th>
                  <th>상태</th>
                  <th class="text-right">작업</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(p, idx) in recentPassports" :key="idx"
                    @click="$emit('navigate', 'passport-detail', { passportId: p.passportId || p.id })"
                    class="cursor-pointer bp-animate-in"
                    :style="'animation-delay: ' + (idx * 0.03) + 's;'"
                  <td style="color: var(--bp-text-2);">{{ p.manufacturerName || '-' }}</td>
                  <td class="font-medium" style="color: var(--bp-text-1);">{{ p.model || '-' }}</td>
                  <td class="tabular-nums" style="font-family: var(--font-mono);">{{ p.weight ? p.weight + ' kg' : '-' }}</td>
                  <td>
                    <span class="bp-badge bp-badge-muted">{{ p.chemistry || '-' }}</span>
                  </td>
                  <td style="color: var(--bp-text-3); font-family: var(--font-mono); font-size: 0.75rem;">{{ formatDate(p.createdAt || p.manufactureDate) }}</td>
                  <td>
                    <span class="inline-flex items-center gap-1.5">
                      <span class="w-1.5 h-1.5 rounded-full" :style="{
                        backgroundColor: p.status === 'MANUFACTURED' ? '#60a5fa' :
                          p.status === 'ACTIVE' ? '#34d399' :
                          p.status === 'MAINTENANCE' ? '#fbbf24' :
                          p.status === 'ANALYSIS' ? '#a78bfa' :
                          p.status === 'RECYCLING' ? '#f97316' : '#64748b'
                      }"></span>
                      <span class="text-xs" style="color: var(--bp-text-2);">{{ statusLabels[p.status] || p.status || '-' }}</span>
                    </span>
                  </td>
                  <td class="text-right">
                    <button @click.stop="$emit('navigate', 'passport-detail', { passportId: p.passportId || p.id })"
                      class="text-xs font-medium transition-colors" style="color: var(--bp-signal);"
                      onmouseenter="this.style.opacity='0.7'" onmouseleave="this.style.opacity='1'">
                      상세 →
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="py-16 text-center">
            <div class="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center" style="background: var(--bp-surface-3);">
              <svg class="w-6 h-6" style="color: var(--bp-text-muted);" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                <rect x="9" y="3" width="6" height="4" rx="1"/>
              </svg>
            </div>
            <p class="text-sm font-medium" style="color: var(--bp-text-2);">등록된 여권이 없습니다</p>
            <p class="text-xs mt-1" style="color: var(--bp-text-muted);">새 배터리 여권을 발급하여 시작하세요.</p>
          </div>
        </div>

      </div>

      <style>
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
    </div>
  `
});
