app.component('dashboard-page', {
  props: ['auth', 'api'],
  emits: ['navigate'],
  setup(props, { emit }) {
    const { ref, computed, onMounted } = Vue;

    const passports = ref([]);
    const loading = ref(true);
    const materials = ref([]);

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

    const statusList = STATUS_LIST;
    const statusLabels = STATUS_LABELS;

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

    const statusDistribution = computed(() => {
      const statusColors = {
        MANUFACTURED: '#60a5fa', ACTIVE: '#34d399', MAINTENANCE: '#fbbf24',
        ANALYSIS: '#a78bfa', RECYCLING: '#f97316', DISPOSED: '#64748b',
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

    function donutSegments(items) {
      const total = items.reduce((s, it) => s + it.count, 0);
      if (total === 0) return [];
      const circumference = 2 * Math.PI * 40;
      let offset = 0;
      return items.map(it => {
        const pct = it.count / total;
        const dash = pct * circumference;
        const seg = { ...it, dashArray: dash + ' ' + (circumference - dash), dashOffset: -offset, pct: Math.round(pct * 100) };
        offset += dash;
        return seg;
      });
    }

    const chemistrySegments = computed(() => donutSegments(chemistryDistribution.value));
    const statusSegments = computed(() => donutSegments(statusDistribution.value));
    const chemTotal = computed(() => chemistryDistribution.value.reduce((s, it) => s + it.count, 0));
    const statTotal = computed(() => statusDistribution.value.reduce((s, it) => s + it.count, 0));

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
          <div class="absolute inset-0 rounded-full" style="border: 2px solid transparent; border-top-color: var(--bp-signal); animation: dash-spin 0.8s linear infinite;"></div>
          <div class="absolute inset-2 rounded-full" style="border: 2px solid transparent; border-bottom-color: var(--bp-signal); opacity: 0.3; animation: dash-spin 1.2s linear infinite reverse;"></div>
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="w-2 h-2 rounded-full" style="background: var(--bp-signal); animation: bp-pulse 1.5s ease-in-out infinite;"></div>
          </div>
        </div>
        <p class="text-xs tracking-widest" style="color: var(--bp-text-muted); font-family: var(--font-mono);">INITIALIZING DASHBOARD...</p>
      </div>

      <div v-else class="space-y-4">

        <!-- ═══ SYSTEM STATUS RIBBON ═══ -->
        <div class="bp-card px-4 py-2.5 flex items-center justify-between bp-animate-in" style="border-left: 3px solid var(--bp-signal);">
          <div class="flex items-center gap-5">
            <div class="flex items-center gap-2">
              <div class="bp-dot bp-dot-signal"></div>
              <span class="text-[10px] font-medium" style="color: var(--bp-signal); font-family: var(--font-mono);">FABRIC CONNECTED</span>
            </div>
            <div class="hidden sm:flex items-center gap-1.5" style="color: var(--bp-text-3);">
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/></svg>
              <span class="text-[10px]" style="font-family: var(--font-mono);">{{ totalCount }} PASSPORTS</span>
            </div>
            <div class="hidden md:flex items-center gap-1.5" style="color: var(--bp-text-3);">
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              <span class="text-[10px]" style="font-family: var(--font-mono);">{{ materialCount }} MATERIALS</span>
            </div>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="text-[10px]" style="color: var(--bp-text-muted); font-family: var(--font-mono);">LAST SYNC</span>
            <span class="text-[10px] font-medium" style="color: var(--bp-text-2); font-family: var(--font-mono);">{{ new Date().toLocaleTimeString('ko-KR', {hour:'2-digit',minute:'2-digit'}) }}</span>
          </div>
        </div>

        <!-- ═══ HEADER ═══ -->
        <div class="flex items-end justify-between bp-animate-in bp-delay-1">
          <div>
            <div class="flex items-center gap-2.5">
              <h1 class="text-xl" style="font-family: var(--font-display); font-weight: 700; color: var(--bp-text-1);">대시보드</h1>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider" style="background: var(--bp-signal-dim); color: var(--bp-signal); font-family: var(--font-mono); border: 1px solid rgba(52,211,153,0.2);">LIVE</span>
            </div>
            <p class="text-xs mt-0.5" style="color: var(--bp-text-3);">배터리 여권 시스템 현황 모니터링</p>
          </div>
          <button @click="nav('passports')" class="bp-btn bp-btn-primary text-xs">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            여권 발급
          </button>
        </div>

        <!-- ═══ KPI GAUGES ═══ -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 bp-animate-in bp-delay-1">
          <div v-for="(kpi, ki) in [
            { label: '전체 여권', value: totalCount, max: Math.max(totalCount, 1), color: '#34d399', icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z', page: 'passports' },
            { label: '운행중', value: activeCount, max: Math.max(totalCount, 1), color: '#60a5fa', icon: 'M22 12 18 12 15 21 9 3 6 12 2 12', page: 'passports' },
            { label: '정비 대기', value: maintenanceCount, max: Math.max(totalCount, 1), color: '#fbbf24', icon: 'M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z', page: 'maintenance' },
            { label: '등록 원자재', value: materialCount, max: Math.max(materialCount, 1), color: '#a78bfa', icon: 'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71', page: 'materials' }
          ]" :key="ki"
            @click="nav(kpi.page)"
            class="bp-card-glow bp-stat p-4 cursor-pointer group transition-all duration-200 hover:translate-y-[-2px] hover:shadow-xl">
            <div class="flex items-start justify-between">
              <div>
                <div class="bp-stat-label mb-2">{{ kpi.label }}</div>
                <div class="bp-stat-value" style="font-size: 1.75rem;">{{ kpi.value }}</div>
              </div>
              <!-- Mini circular gauge -->
              <div class="relative w-11 h-11 flex-shrink-0">
                <svg viewBox="0 0 36 36" class="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="var(--bp-surface-4)" stroke-width="3"/>
                  <circle cx="18" cy="18" r="15" fill="none"
                    :stroke="kpi.color" stroke-width="3" stroke-linecap="round"
                    :stroke-dasharray="(kpi.value / kpi.max * 94.25) + ' 94.25'"
                    style="transition: stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1);"/>
                </svg>
                <div class="absolute inset-0 flex items-center justify-center">
                  <svg class="w-3.5 h-3.5" :style="'color: ' + kpi.color" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path :d="kpi.icon"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══ CHARTS + STACKED BAR ═══ -->
        <div class="grid grid-cols-1 lg:grid-cols-5 gap-4 bp-animate-in bp-delay-2">

          <!-- Chemistry donut — spans 3 cols -->
          <div class="lg:col-span-3 bp-card p-5">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-sm font-semibold" style="font-family: var(--font-display); color: var(--bp-text-1);">화학 구성</h2>
              <span class="text-[9px] tracking-wider" style="color: var(--bp-text-muted); font-family: var(--font-mono);">COMPOSITION</span>
            </div>
            <div class="flex items-center gap-6">
              <div class="relative flex-shrink-0" style="width: 120px; height: 120px;">
                <svg viewBox="0 0 100 100" class="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="var(--bp-surface-4)" stroke-width="9"/>
                  <circle v-for="(seg, i) in chemistrySegments" :key="i"
                    cx="50" cy="50" r="40" fill="none"
                    :stroke="seg.color" stroke-width="9"
                    :stroke-dasharray="seg.dashArray"
                    :stroke-dashoffset="seg.dashOffset"
                    stroke-linecap="round"
                    class="dash-donut-seg"
                    style="transition: all 0.8s cubic-bezier(0.4,0,0.2,1); cursor: pointer;"
                    @mouseenter="$event.target.setAttribute('stroke-width','12')"
                    @mouseleave="$event.target.setAttribute('stroke-width','9')"/>
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center">
                  <span class="text-lg font-bold" style="font-family: var(--font-display); color: var(--bp-text-1);">{{ chemTotal }}</span>
                  <span class="text-[8px] uppercase tracking-widest" style="color: var(--bp-text-muted); font-family: var(--font-mono);">TOTAL</span>
                </div>
              </div>
              <div class="flex-1 space-y-1.5">
                <div v-for="item in chemistryDistribution" :key="item.name" class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-sm" :style="{ backgroundColor: item.color }"></span>
                    <span class="text-xs" style="color: var(--bp-text-2);">{{ item.name }}</span>
                  </div>
                  <span class="text-xs font-bold tabular-nums" style="color: var(--bp-text-1); font-family: var(--font-mono);">{{ item.count }}</span>
                </div>
                <div v-if="chemistryDistribution.length === 0" class="text-xs py-3" style="color: var(--bp-text-muted);">데이터 없음</div>
              </div>
            </div>
          </div>

          <!-- Status — stacked bar + legend, spans 2 cols -->
          <div class="lg:col-span-2 bp-card p-5">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-sm font-semibold" style="font-family: var(--font-display); color: var(--bp-text-1);">상태 분포</h2>
              <span class="text-xs font-bold tabular-nums" style="color: var(--bp-text-2); font-family: var(--font-mono);">{{ statTotal }}</span>
            </div>
            <!-- Stacked horizontal bar -->
            <div v-if="statusDistribution.length > 0" class="mb-4">
              <div class="flex h-7 rounded-lg overflow-hidden" style="background: var(--bp-surface-4);">
                <div v-for="item in statusDistribution" :key="item.status"
                  class="h-full transition-all duration-700 relative group"
                  :style="{ width: (item.count / statTotal * 100) + '%', backgroundColor: item.color, minWidth: '4px' }">
                  <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span class="text-[9px] font-bold text-white drop-shadow-md">{{ item.count }}</span>
                  </div>
                </div>
              </div>
            </div>
            <!-- Legend -->
            <div class="space-y-1.5">
              <div v-for="item in statusDistribution" :key="item.status" class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-sm" :style="{ backgroundColor: item.color }"></span>
                  <span class="text-[11px]" :style="{ color: item.color }">{{ item.label }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-[10px] tabular-nums" style="color: var(--bp-text-3); font-family: var(--font-mono);">{{ statTotal > 0 ? Math.round(item.count / statTotal * 100) : 0 }}%</span>
                  <span class="text-xs font-bold tabular-nums w-5 text-right" style="color: var(--bp-text-1); font-family: var(--font-mono);">{{ item.count }}</span>
                </div>
              </div>
              <div v-if="statusDistribution.length === 0" class="text-xs py-3 text-center" style="color: var(--bp-text-muted);">데이터 없음</div>
            </div>
          </div>
        </div>

        <!-- ═══ RECENT TABLE ═══ -->
        <div class="bp-card overflow-hidden bp-animate-in bp-delay-3">
          <div class="px-5 py-3 flex items-center justify-between" style="border-bottom: 1px solid var(--bp-border); background: linear-gradient(90deg, var(--bp-surface-3), var(--bp-surface-2));">
            <div class="flex items-center gap-2">
              <div class="w-1 h-4 rounded-full" style="background: var(--bp-signal);"></div>
              <h2 class="text-xs font-semibold" style="font-family: var(--font-display); color: var(--bp-text-1);">최근 등록</h2>
              <span class="text-[9px] tabular-nums px-1.5 py-0.5 rounded" style="background: var(--bp-surface-4); color: var(--bp-text-3); font-family: var(--font-mono);">{{ recentPassports.length }}</span>
            </div>
            <button @click="nav('passports')" class="text-[10px] font-medium flex items-center gap-1 transition-colors" style="color: var(--bp-text-3);"
              onmouseenter="this.style.color='var(--bp-signal)'" onmouseleave="this.style.color='var(--bp-text-3)'">
              전체 보기 <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>

          <div v-if="recentPassports.length > 0" class="overflow-x-auto">
            <table class="bp-table">
              <thead>
                <tr><th>제조사</th><th>모델</th><th>무게</th><th>화학</th><th>등록일</th><th>상태</th><th class="text-right">작업</th></tr>
              </thead>
              <tbody>
                <tr v-for="(p, idx) in recentPassports" :key="idx"
                    @click="$emit('navigate', 'passport-detail', { passportId: p.passportId || p.id })"
                    class="cursor-pointer bp-animate-in" :style="'animation-delay: ' + (idx * 0.03) + 's;'">
                  <td style="color: var(--bp-text-2);">{{ p.manufacturerName || '-' }}</td>
                  <td class="font-medium" style="color: var(--bp-text-1);">{{ p.model || '-' }}</td>
                  <td class="tabular-nums" style="font-family: var(--font-mono);">{{ p.weight ? p.weight + ' kg' : '-' }}</td>
                  <td><span class="bp-badge bp-badge-muted">{{ p.chemistry || '-' }}</span></td>
                  <td style="color: var(--bp-text-3); font-family: var(--font-mono); font-size: 0.7rem;">{{ formatDate(p.createdAt || p.manufactureDate) }}</td>
                  <td>
                    <span class="inline-flex items-center gap-1.5">
                      <span class="w-1.5 h-1.5 rounded-full" :style="{
                        backgroundColor: p.status==='MANUFACTURED'?'#60a5fa':p.status==='ACTIVE'?'#34d399':p.status==='MAINTENANCE'?'#fbbf24':p.status==='ANALYSIS'?'#a78bfa':p.status==='RECYCLING'?'#f97316':'#64748b'
                      }"></span>
                      <span class="text-xs" style="color: var(--bp-text-2);">{{ statusLabels[p.status] || p.status || '-' }}</span>
                    </span>
                  </td>
                  <td class="text-right">
                    <button @click.stop="$emit('navigate', 'passport-detail', { passportId: p.passportId || p.id })"
                      class="text-[10px] font-medium" style="color: var(--bp-signal);">상세 →</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="py-14 text-center">
            <div class="w-11 h-11 mx-auto mb-3 rounded-xl flex items-center justify-center" style="background: var(--bp-surface-3);">
              <svg class="w-5 h-5" style="color: var(--bp-text-muted);" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/>
              </svg>
            </div>
            <p class="text-xs font-medium" style="color: var(--bp-text-2);">등록된 여권이 없습니다</p>
          </div>
        </div>
      </div>

      <style>
        @keyframes dash-spin { to { transform: rotate(360deg); } }
      </style>
    </div>
  `
});
