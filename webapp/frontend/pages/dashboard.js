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
      <div v-if="loading" style="display: flex; align-items: center; justify-content: center; min-height: 60vh;">
        <div style="width: 28px; height: 28px; border: 2px solid rgba(0,0,0,0.06); border-top-color: var(--color-accent); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
      </div>

      <div v-else>

        <!-- HEADER -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
          <div style="display: flex; align-items: baseline; gap: 1rem;">
            <h1 class="sn-display" style="font-size: 1.375rem;">여권 현황판</h1>
            <span style="font-family: var(--font-mono); font-size: 1.25rem; font-weight: 700; color: var(--color-text-1);">{{ totalCount }}</span>
            <span class="sn-caption">건 등록</span>
          </div>
          <button @click="nav('passports')" class="sn-btn sn-btn-accent" style="font-size: 0.8125rem; padding: 0.5rem 1rem;">+ 여권 발급</button>
        </div>

        <!-- ═══ KANBAN BOARD — status columns ═══ -->
        <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; min-height: 60vh; align-items: start;">

          <!-- One column per status -->
          <div v-for="status in statusList" :key="status"
            style="background: rgba(0,0,0,0.02); border-radius: 8px; padding: 0; min-height: 200px; display: flex; flex-direction: column;">

            <!-- Column header -->
            <div style="padding: 0.625rem 0.75rem; display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid;"
              :style="{ borderColor: status==='ACTIVE'?'#16a34a':status==='MANUFACTURED'?'#2563eb':status==='MAINTENANCE'?'#d97706':status==='ANALYSIS'?'#7c3aed':status==='RECYCLING'?'#ea580c':'#a3a3a3' }">
              <span style="font-size: 0.6875rem; font-weight: 600; color: var(--color-text-1);">{{ statusLabels[status] }}</span>
              <span style="font-family: var(--font-mono); font-size: 0.75rem; font-weight: 700; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; border-radius: 50%;"
                :style="{ background: countByStatus[status] > 0 ? (status==='ACTIVE'?'#f0fdf4':status==='MANUFACTURED'?'#eff6ff':status==='MAINTENANCE'?'#fffbeb':status==='ANALYSIS'?'#faf5ff':status==='RECYCLING'?'#fff7ed':'#f5f5f5') : 'transparent', color: countByStatus[status] > 0 ? (status==='ACTIVE'?'#16a34a':status==='MANUFACTURED'?'#2563eb':status==='MAINTENANCE'?'#d97706':status==='ANALYSIS'?'#7c3aed':status==='RECYCLING'?'#ea580c':'#a3a3a3') : 'var(--color-text-3)' }">
                {{ countByStatus[status] || 0 }}
              </span>
            </div>

            <!-- Cards in this column -->
            <div style="padding: 0.5rem; flex: 1; display: flex; flex-direction: column; gap: 6px; overflow-y: auto; max-height: 65vh;">
              <div v-for="p in passports.filter(pp => pp.status === status)" :key="p.passportId || p.id"
                @click="$emit('navigate', 'passport-detail', { passportId: p.passportId || p.id })"
                style="background: #fff; border: 1px solid rgba(0,0,0,0.06); border-radius: 6px; padding: 0.5rem 0.625rem; cursor: pointer; transition: all 0.2s;"
                @mouseenter="$event.currentTarget.style.borderColor='rgba(0,0,0,0.15)';$event.currentTarget.style.transform='translateY(-1px)'"
                @mouseleave="$event.currentTarget.style.borderColor='rgba(0,0,0,0.06)';$event.currentTarget.style.transform='none'">

                <!-- Model -->
                <div style="font-size: 0.75rem; font-weight: 600; color: var(--color-text-1); margin-bottom: 0.25rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ p.model || '미등록' }}</div>

                <!-- Manufacturer + Chemistry -->
                <div style="font-size: 0.625rem; color: var(--color-text-3); margin-bottom: 0.375rem; display: flex; gap: 0.375rem;">
                  <span>{{ truncate(p.manufacturerName, 10) }}</span>
                  <span v-if="p.chemistry" style="background: rgba(0,0,0,0.04); padding: 0 0.25rem; border-radius: 2px;">{{ p.chemistry }}</span>
                </div>

                <!-- SOC bar -->
                <div v-if="p.currentSoc != null" style="display: flex; align-items: center; gap: 0.375rem;">
                  <div style="flex: 1; height: 3px; background: rgba(0,0,0,0.06); border-radius: 2px; overflow: hidden;">
                    <div style="height: 100%; border-radius: 2px;"
                      :style="{ width: Math.min(scaleSOC(p.currentSoc), 100) + '%', background: scaleSOC(p.currentSoc) >= 60 ? '#16a34a' : scaleSOC(p.currentSoc) >= 30 ? '#d97706' : '#dc2626' }"></div>
                  </div>
                  <span style="font-family: var(--font-mono); font-size: 0.5625rem; font-weight: 600; color: var(--color-text-2);">{{ scaleSOC(p.currentSoc) }}%</span>
                </div>
              </div>

              <!-- Empty column -->
              <div v-if="!passports.filter(pp => pp.status === status).length"
                style="flex: 1; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 0.625rem; color: var(--color-text-3);">없음</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `
});
