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

        <!-- CONTROL ROOM HEADER — distinct from other pages -->
        <div style="display: flex; align-items: flex-end; justify-content: space-between; padding-bottom: 1.5rem; margin-bottom: 1.5rem; border-bottom: 1px solid var(--color-border);">
          <div>
            <h1 class="sn-display" style="font-size: 1.5rem; margin-bottom: 0.25rem;">대시보드</h1>
            <span class="sn-caption">{{ totalCount }}건 등록 · {{ activeCount }}건 운행 중</span>
          </div>
          <button @click="nav('passports')" class="sn-btn sn-btn-primary">+ 여권 발급</button>
        </div>

        <!-- INLINE METRICS — NOT cards, just numbers in a row with dividers -->
        <div style="display: flex; align-items: baseline; gap: 2rem; flex-wrap: wrap; margin-bottom: 2rem;">
          <div v-for="(kpi, i) in [
            { num: totalCount,       label: '전체',     color: 'var(--color-text-1)', page: 'passports' },
            { num: activeCount,      label: '운행',     color: '#16a34a',              page: 'passports' },
            { num: maintenanceCount, label: '정비',     color: '#d97706',              page: 'passports' },
            { num: materialCount,    label: '원자재',   color: '#2563eb',              page: 'materials' }
          ]" :key="i" @click="nav(kpi.page)"
            style="cursor: pointer; display: flex; align-items: baseline; gap: 0.5rem;">
            <span class="sn-mono" style="font-size: 1.75rem; font-weight: 700; font-variant-numeric: tabular-nums;"
              :style="{ color: kpi.color }">{{ kpi.num }}</span>
            <span class="sn-caption">{{ kpi.label }}</span>
          </div>
        </div>

        <!-- STATUS BAR — full width, no card wrapper -->
        <div style="margin-bottom: 2rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <span class="sn-eyebrow">상태 분포</span>
          </div>
          <div v-if="statusDistribution.length" style="display: flex; height: 6px; border-radius: 3px; overflow: hidden; background: rgba(0,0,0,0.03); gap: 1px; margin-bottom: 0.75rem;">
            <div v-for="item in statusDistribution" :key="item.status"
              style="height: 100%; min-width: 3px;"
              :style="{ width: (item.count / statTotal * 100) + '%', background: item.color }"></div>
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 1rem;">
            <span v-for="item in statusDistribution" :key="item.status" class="flex items-center gap-1.5">
              <span style="width: 6px; height: 6px; border-radius: 2px;" :style="{ background: item.color }"></span>
              <span class="sn-caption" style="color: var(--color-text-2);">{{ item.label }}</span>
              <span class="sn-mono" style="color: var(--color-text-1);">{{ item.count }}</span>
            </span>
          </div>
        </div>

        <!-- CHEMISTRY — inline, no card -->
        <div v-if="chemistryDistribution.length" style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 2rem;">
          <span v-for="item in chemistryDistribution" :key="item.name"
            style="display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.25rem 0.625rem; border-radius: 3px; background: rgba(0,0,0,0.03);">
            <span style="width: 6px; height: 6px; border-radius: 2px;" :style="{ background: item.color }"></span>
            <span style="font-size: 0.8125rem; color: var(--color-text-1);">{{ item.name }}</span>
            <span class="sn-mono" style="color: var(--color-text-3);">{{ item.count }}</span>
          </span>
        </div>

        <!-- RECENT PASSPORTS — compact list, NOT in a card -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <span class="sn-eyebrow">최근 등록</span>
            <button @click="nav('passports')" class="sn-btn sn-btn-ghost" style="padding: 0.375rem 0.75rem; font-size: 0.75rem;">전체 보기 →</button>
          </div>

          <div v-if="recentPassports.length">
            <table class="sn-table">
              <thead>
                <tr>
                  <th>모델</th>
                  <th>제조사</th>
                  <th>상태</th>
                  <th style="text-align: right;">무게</th>
                  <th style="text-align: right;">등록</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(p, idx) in recentPassports.slice(0, 8)" :key="idx"
                  @click="$emit('navigate', 'passport-detail', { passportId: p.passportId || p.id })" style="cursor: pointer;">
                  <td style="font-weight: 500; color: var(--color-text-1);">{{ p.model || '—' }}</td>
                  <td>{{ p.manufacturerName || '—' }}</td>
                  <td>
                    <span class="flex items-center gap-1.5">
                      <span style="width: 6px; height: 6px; border-radius: 2px;"
                        :style="{ background: p.status==='ACTIVE'?'#16a34a':p.status==='MANUFACTURED'?'#2563eb':p.status==='MAINTENANCE'?'#d97706':p.status==='ANALYSIS'?'#7c3aed':p.status==='RECYCLING'?'#ea580c':'#a3a3a3' }"></span>
                      <span class="sn-caption" style="color: var(--color-text-2);">{{ statusLabels[p.status] || '—' }}</span>
                    </span>
                  </td>
                  <td class="sn-mono" style="text-align: right;">{{ p.weight ? p.weight + 'kg' : '—' }}</td>
                  <td class="sn-caption" style="text-align: right;">{{ formatDate(p.createdAt || p.manufactureDate) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="flex flex-col items-center py-12 gap-3 text-center">
            <p class="sn-body">등록된 배터리 여권이 없습니다.</p>
            <button @click="nav('passports')" class="sn-btn sn-btn-accent mt-2">+ 여권 발급하기</button>
          </div>
        </div>

      </div>
    </div>
  `
});
