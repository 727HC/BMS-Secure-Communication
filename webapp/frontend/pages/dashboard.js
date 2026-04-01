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
      const colors = ['#c8ff00', '#8bff57', '#00e5a0', '#00c4d4', '#6ba3ff'];
      return entries.map(([name, count], i) => ({
        name, count, color: colors[i % colors.length],
      }));
    });

    const statusDistribution = computed(() => {
      const statusColors = {
        MANUFACTURED: '#6ba3ff', ACTIVE: '#c8ff00', MAINTENANCE: '#ffb800',
        ANALYSIS: '#c084fc', RECYCLING: '#fb923c', DISPOSED: '#6b7280',
      };
      const items = [];
      statusList.forEach(s => {
        const count = countByStatus.value[s] || 0;
        if (count > 0) {
          items.push({ status: s, label: statusLabels[s], count, color: statusColors[s] || '#6b7280' });
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
    <div style="background: #1a1814; margin: -1.5rem; padding: 2.5rem 2rem; min-height: calc(100vh - 3.5rem);">

      <!-- Loading -->
      <div v-if="loading" class="flex flex-col items-center justify-center" style="min-height: 60vh;">
        <div class="w-px h-16 mb-6" style="background: #c8ff00; animation: dashPulse 1s ease-in-out infinite;"></div>
        <p class="text-xs tracking-[0.3em] uppercase" style="color: rgba(250,250,245,0.2); font-family: 'JetBrains Mono', monospace;">LOADING</p>
      </div>

      <div v-else>

        <!-- ═══ HEADER ═══ -->
        <div class="flex items-end justify-between mb-16 dash-reveal" style="animation-delay: 0s;">
          <div>
            <span class="block text-xs tracking-[0.2em] uppercase mb-2" style="color: #c8ff00; font-family: 'JetBrains Mono', monospace;">Overview</span>
            <h1 style="font-family: 'Pretendard Variable', sans-serif; font-weight: 800; font-size: 2.5rem; color: #fafaf5; letter-spacing: -0.03em;">대시보드</h1>
          </div>
          <button @click="nav('passports')"
            class="px-6 py-3 text-sm font-bold tracking-[0.05em] uppercase transition-all"
            style="background: #c8ff00; color: #1a1814;"
            onmouseenter="this.style.background='#d4ff33'"
            onmouseleave="this.style.background='#c8ff00'">
            + 여권 발급
          </button>
        </div>

        <!-- ═══ MONUMENTAL KPIs ═══ -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-0 mb-20 dash-reveal" style="animation-delay: 0.1s; border-top: 1px solid rgba(250,250,245,0.06);">
          <div v-for="(kpi, i) in [
            { num: totalCount, label: '전체 여권', sub: 'TOTAL PASSPORTS' },
            { num: activeCount, label: '운행중', sub: 'ACTIVE' },
            { num: maintenanceCount, label: '정비 대기', sub: 'MAINTENANCE' },
            { num: materialCount, label: '등록 원자재', sub: 'MATERIALS' }
          ]" :key="i"
            class="py-8 cursor-pointer transition-all"
            :style="'border-right: 1px solid rgba(250,250,245,0.06); border-bottom: 1px solid rgba(250,250,245,0.06);' + (i === 0 ? 'padding-left:0;' : 'padding-left:2rem;')"
            @click="nav(i < 3 ? 'passports' : 'materials')"
            @mouseenter="$event.currentTarget.style.background='rgba(200,255,0,0.03)'"
            @mouseleave="$event.currentTarget.style.background='transparent'">
            <span class="block text-xs tracking-[0.15em] mb-3" style="color: rgba(250,250,245,0.2); font-family: 'JetBrains Mono', monospace;">0{{ i + 1 }}</span>
            <span class="block leading-none" style="font-family: 'JetBrains Mono', monospace; font-size: clamp(2.5rem, 5vw, 4.5rem); font-weight: 600; color: #fafaf5; letter-spacing: -0.04em;">
              {{ kpi.num }}
            </span>
            <span class="block mt-3 text-sm" style="color: rgba(250,250,245,0.4);">{{ kpi.label }}</span>
            <span class="block text-xs mt-1 tracking-[0.1em] uppercase" style="color: rgba(250,250,245,0.12); font-family: 'JetBrains Mono', monospace;">{{ kpi.sub }}</span>
          </div>
        </div>

        <!-- ═══ MIDDLE: CHART + STATUS — asymmetric split ═══ -->
        <div class="flex flex-col lg:flex-row gap-16 mb-20">

          <!-- LEFT: Donut chart — large -->
          <div class="lg:w-2/5 dash-reveal" style="animation-delay: 0.2s;">
            <span class="block text-xs tracking-[0.2em] uppercase mb-6" style="color: #c8ff00; font-family: 'JetBrains Mono', monospace;">화학 구성</span>

            <div class="flex items-center gap-8">
              <div class="relative flex-shrink-0" style="width: 160px; height: 160px;">
                <svg viewBox="0 0 100 100" class="w-full h-full" style="transform: rotate(-90deg);">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(250,250,245,0.04)" stroke-width="8"/>
                  <circle v-for="(seg, i) in chemistrySegments" :key="i"
                    cx="50" cy="50" r="40" fill="none"
                    :stroke="seg.color" stroke-width="8"
                    :stroke-dasharray="seg.dashArray"
                    :stroke-dashoffset="seg.dashOffset"
                    stroke-linecap="round"
                    style="transition: all 1s cubic-bezier(0.16, 1, 0.3, 1);"/>
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center">
                  <span style="font-family: 'JetBrains Mono', monospace; font-size: 2rem; font-weight: 600; color: #fafaf5;">{{ chemTotal }}</span>
                </div>
              </div>

              <div class="space-y-3 flex-1">
                <div v-for="item in chemistryDistribution" :key="item.name" class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <span class="w-2 h-2" :style="'background: ' + item.color + ';'"></span>
                    <span class="text-sm" style="color: rgba(250,250,245,0.5);">{{ item.name }}</span>
                  </div>
                  <span class="text-sm tabular-nums" style="color: #fafaf5; font-family: 'JetBrains Mono', monospace;">{{ item.count }}</span>
                </div>
                <div v-if="!chemistryDistribution.length" class="text-sm" style="color: rgba(250,250,245,0.2);">데이터 없음</div>
              </div>
            </div>
          </div>

          <!-- RIGHT: Status distribution — typographic -->
          <div class="lg:w-3/5 dash-reveal" style="animation-delay: 0.3s;">
            <div class="flex items-center justify-between mb-6">
              <span class="text-xs tracking-[0.2em] uppercase" style="color: #c8ff00; font-family: 'JetBrains Mono', monospace;">상태 분포</span>
              <span class="text-xs tabular-nums" style="color: rgba(250,250,245,0.2); font-family: 'JetBrains Mono', monospace;">TOTAL {{ statTotal }}</span>
            </div>

            <!-- Stacked bar -->
            <div v-if="statusDistribution.length" class="flex h-2 mb-8" style="background: rgba(250,250,245,0.04);">
              <div v-for="item in statusDistribution" :key="item.status"
                class="h-full transition-all duration-1000"
                :style="'width: ' + (item.count / statTotal * 100) + '%; background: ' + item.color + '; min-width: 3px;'">
              </div>
            </div>

            <!-- Legend as typographic list -->
            <div class="space-y-0">
              <div v-for="(item, i) in statusDistribution" :key="item.status"
                class="flex items-center justify-between py-3"
                :style="i < statusDistribution.length - 1 ? 'border-bottom: 1px solid rgba(250,250,245,0.04);' : ''">
                <div class="flex items-center gap-3">
                  <span class="w-2 h-2" :style="'background: ' + item.color + ';'"></span>
                  <span class="text-sm" style="color: rgba(250,250,245,0.6);">{{ item.label }}</span>
                </div>
                <div class="flex items-center gap-4">
                  <span class="text-xs tabular-nums" style="color: rgba(250,250,245,0.25); font-family: 'JetBrains Mono', monospace;">{{ statTotal > 0 ? Math.round(item.count / statTotal * 100) : 0 }}%</span>
                  <span class="text-lg tabular-nums font-semibold" style="color: #fafaf5; font-family: 'JetBrains Mono', monospace; min-width: 2rem; text-align: right;">{{ item.count }}</span>
                </div>
              </div>
              <div v-if="!statusDistribution.length" class="py-6 text-sm" style="color: rgba(250,250,245,0.15);">데이터 없음</div>
            </div>
          </div>
        </div>

        <!-- ═══ RECENT — minimal typographic table ═══ -->
        <div class="dash-reveal" style="animation-delay: 0.4s;">
          <div class="flex items-center justify-between mb-6">
            <span class="text-xs tracking-[0.2em] uppercase" style="color: #c8ff00; font-family: 'JetBrains Mono', monospace;">최근 등록</span>
            <button @click="nav('passports')" class="text-xs transition-colors" style="color: rgba(250,250,245,0.25); font-family: 'JetBrains Mono', monospace;"
              onmouseenter="this.style.color='#c8ff00'" onmouseleave="this.style.color='rgba(250,250,245,0.25)'">
              전체 보기 →
            </button>
          </div>

          <div v-if="recentPassports.length" style="border-top: 1px solid rgba(250,250,245,0.06);">
            <!-- Header -->
            <div class="hidden lg:grid grid-cols-12 gap-4 py-3 text-xs tracking-[0.1em] uppercase"
              style="color: rgba(250,250,245,0.15); font-family: 'JetBrains Mono', monospace; border-bottom: 1px solid rgba(250,250,245,0.04);">
              <span class="col-span-3">제조사</span>
              <span class="col-span-2">모델</span>
              <span class="col-span-2">화학</span>
              <span class="col-span-2">등록일</span>
              <span class="col-span-2">상태</span>
              <span class="col-span-1 text-right">무게</span>
            </div>

            <!-- Rows -->
            <div v-for="(p, idx) in recentPassports" :key="idx"
              class="grid grid-cols-12 gap-4 py-4 cursor-pointer transition-all items-center"
              :style="idx < recentPassports.length - 1 ? 'border-bottom: 1px solid rgba(250,250,245,0.03);' : ''"
              @click="$emit('navigate', 'passport-detail', { passportId: p.passportId || p.id })"
              @mouseenter="$event.currentTarget.style.background='rgba(200,255,0,0.02)'"
              @mouseleave="$event.currentTarget.style.background='transparent'">
              <span class="col-span-3 text-sm font-medium truncate" style="color: rgba(250,250,245,0.7);">{{ p.manufacturerName || '—' }}</span>
              <span class="col-span-2 text-sm truncate" style="color: #fafaf5;">{{ p.model || '—' }}</span>
              <span class="col-span-2 text-xs tracking-wider uppercase" style="color: rgba(250,250,245,0.3); font-family: 'JetBrains Mono', monospace;">{{ p.chemistry || '—' }}</span>
              <span class="col-span-2 text-xs tabular-nums" style="color: rgba(250,250,245,0.2); font-family: 'JetBrains Mono', monospace;">{{ formatDate(p.createdAt || p.manufactureDate) }}</span>
              <span class="col-span-2">
                <span class="inline-flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full" :style="{
                    background: p.status==='ACTIVE'?'#c8ff00':p.status==='MANUFACTURED'?'#6ba3ff':p.status==='MAINTENANCE'?'#ffb800':p.status==='ANALYSIS'?'#c084fc':'#6b7280'
                  }"></span>
                  <span class="text-xs" style="color: rgba(250,250,245,0.4);">{{ statusLabels[p.status] || '—' }}</span>
                </span>
              </span>
              <span class="col-span-1 text-xs tabular-nums text-right" style="color: rgba(250,250,245,0.2); font-family: 'JetBrains Mono', monospace;">{{ p.weight ? p.weight + 'kg' : '—' }}</span>
            </div>
          </div>

          <div v-else class="py-16 text-center">
            <p class="text-sm" style="color: rgba(250,250,245,0.15);">등록된 여권이 없습니다</p>
          </div>
        </div>

      </div>

      <style>
        @keyframes dashPulse { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }
        .dash-reveal { opacity: 0; animation: dashReveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes dashReveal { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      </style>
    </div>
  `
});
