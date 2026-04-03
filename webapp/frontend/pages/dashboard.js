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
    <div>

      <!-- LOADING -->
      <div v-if="loading" class="flex flex-col items-center justify-center gap-4" style="min-height: 60vh;">
        <div style="width: 32px; height: 32px; border: 2.5px solid rgba(0,0,0,0.06); border-top-color: var(--color-accent); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
        <span class="sn-eyebrow">데이터를 불러오는 중입니다</span>
      </div>

      <div v-else>

        <!-- HEADER -->
        <div class="flex items-center justify-between mb-8">
          <div>
            <p class="sn-eyebrow mb-1">Overview</p>
            <h1 class="sn-display" style="font-size: 2rem;">대시보드</h1>
          </div>
          <button @click="nav('passports')" class="sn-btn sn-btn-accent">+ 여권 발급</button>
        </div>

        <!-- KPI STRIP -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div v-for="(kpi, i) in [
            { num: totalCount,       label: '전체 여권',    sub: 'TOTAL',       page: 'passports'  },
            { num: activeCount,      label: '운행 중',      sub: 'ACTIVE',      page: 'passports'  },
            { num: maintenanceCount, label: '정비 대기',    sub: 'MAINTENANCE', page: 'passports'  },
            { num: materialCount,    label: '등록 원자재',  sub: 'MATERIALS',   page: 'materials'  }
          ]" :key="i"
            class="sn-card sn-lift" @click="nav(kpi.page)" style="cursor: pointer;">
            <div class="sn-card-inner">
              <p class="sn-eyebrow mb-2">{{ kpi.sub }}</p>
              <p class="sn-display" style="font-size: clamp(1.75rem, 4vw, 2.5rem); font-variant-numeric: tabular-nums;">{{ kpi.num }}</p>
              <p class="sn-caption" style="margin-top: 0.375rem;">{{ kpi.label }}</p>
            </div>
          </div>
        </div>

        <!-- STATUS + CHEMISTRY ROW -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6">

          <!-- STATUS -->
          <div class="sn-card">
            <div class="sn-card-inner">
              <div class="flex items-center justify-between mb-4">
                <p class="sn-eyebrow">상태 분포</p>
                <span class="sn-caption" style="font-variant-numeric: tabular-nums;">합계 {{ statTotal }}</span>
              </div>
              <div v-if="statusDistribution.length" class="flex overflow-hidden mb-4" style="height: 8px; border-radius: 9999px; background: rgba(0,0,0,0.03); gap: 2px;">
                <div v-for="item in statusDistribution" :key="item.status"
                  style="height: 100%; border-radius: 9999px; min-width: 4px;"
                  :style="{ width: (item.count / statTotal * 100) + '%', background: item.color }"></div>
              </div>
              <div class="flex flex-wrap gap-x-4 gap-y-2">
                <div v-for="item in statusDistribution" :key="item.status" class="flex items-center gap-1.5">
                  <span style="width: 7px; height: 7px; border-radius: 50%;" :style="{ background: item.color }"></span>
                  <span class="sn-caption" style="color: var(--color-text-2);">{{ item.label }}</span>
                  <span class="sn-mono">{{ item.count }}</span>
                </div>
                <span v-if="!statusDistribution.length" class="sn-caption">데이터 없음</span>
              </div>
            </div>
          </div>

          <!-- CHEMISTRY -->
          <div class="sn-card">
            <div class="sn-card-inner">
              <div class="flex items-center justify-between mb-4">
                <p class="sn-eyebrow">화학 구성</p>
                <span class="sn-caption" style="font-variant-numeric: tabular-nums;">합계 {{ chemTotal }}</span>
              </div>
              <div class="flex flex-wrap gap-2">
                <span v-for="item in chemistryDistribution" :key="item.name" class="sn-badge" style="background: rgba(0,0,0,0.03); padding: 0.3125rem 0.75rem;">
                  <span style="width: 7px; height: 7px; border-radius: 50%;" :style="{ background: item.color }"></span>
                  <span style="font-weight: 500; color: var(--color-text-1);">{{ item.name }}</span>
                  <span class="sn-mono">{{ item.count }}</span>
                </span>
                <span v-if="!chemistryDistribution.length" class="sn-caption">데이터 없음</span>
              </div>
            </div>
          </div>
        </div>

        <!-- RECENT PASSPORTS TABLE -->
        <div class="sn-card">
          <div class="sn-card-inner">
            <div class="flex items-center justify-between mb-5">
              <p class="sn-eyebrow">최근 등록 여권</p>
              <button @click="nav('passports')" class="sn-btn sn-btn-ghost">전체 보기 →</button>
            </div>

            <div v-if="recentPassports.length" style="overflow-x: auto;">
              <table class="sn-table">
                <thead>
                  <tr>
                    <th>제조사</th>
                    <th>모델</th>
                    <th>화학</th>
                    <th>등록일</th>
                    <th>상태</th>
                    <th style="text-align: right;">무게</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(p, idx) in recentPassports.slice(0, 6)" :key="idx"
                    @click="$emit('navigate', 'passport-detail', { passportId: p.passportId || p.id })">
                    <td style="color: var(--color-text-1); font-weight: 500;">{{ p.manufacturerName || '—' }}</td>
                    <td>{{ p.model || '—' }}</td>
                    <td><span class="sn-badge" style="background: rgba(0,0,0,0.03);">{{ p.chemistry || '—' }}</span></td>
                    <td class="sn-caption">{{ formatDate(p.createdAt || p.manufactureDate) }}</td>
                    <td>
                      <span class="flex items-center gap-1.5">
                        <span style="width: 6px; height: 6px; border-radius: 50%;"
                          :style="{ background: p.status==='ACTIVE'?'#16a34a':p.status==='MANUFACTURED'?'#2563eb':p.status==='MAINTENANCE'?'#d97706':p.status==='ANALYSIS'?'#7c3aed':p.status==='RECYCLING'?'#ea580c':'#a3a3a3' }"></span>
                        <span class="sn-caption" style="color: var(--color-text-2);">{{ statusLabels[p.status] || '—' }}</span>
                      </span>
                    </td>
                    <td style="text-align: right;" class="sn-mono">{{ p.weight ? p.weight + ' kg' : '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-else class="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <p class="sn-body">등록된 배터리 여권이 없습니다.</p>
              <p class="sn-caption">첫 번째 여권을 발급하여 추적을 시작하세요.</p>
              <button @click="nav('passports')" class="sn-btn sn-btn-accent mt-2">+ 여권 발급하기</button>
            </div>

          </div>
        </div>

      </div>
    </div>
  `
});
