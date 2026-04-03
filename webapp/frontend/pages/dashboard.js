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
        <div style="width: 28px; height: 28px; border: 2px solid rgba(0,0,0,0.06); border-top-color: var(--color-accent); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
      </div>

      <div v-else>

        <!-- ═══ HERO SECTION — dark, dense, visually rich ═══ -->
        <div style="background: #0f172a; margin: -2rem -1.5rem 0 -1.5rem; padding: 1.75rem 2rem 1.5rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem;">
            <h1 style="font-family: var(--font-display); font-size: 1.25rem; font-weight: 600; color: #fff; letter-spacing: -0.02em;">배터리 여권 현황</h1>
            <button @click="nav('passports')" class="sn-btn sn-btn-accent" style="font-size: 0.8125rem; padding: 0.5rem 1rem;">+ 여권 발급</button>
          </div>

          <!-- KPI row on dark bg -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem;">
            <div v-for="(kpi, i) in [
              { num: totalCount,       label: '전체 등록',  color: '#fff' },
              { num: activeCount,      label: '운행 중',    color: '#4ade80' },
              { num: maintenanceCount, label: '정비 대기',  color: '#fbbf24' },
              { num: materialCount,    label: '원자재',     color: '#60a5fa' }
            ]" :key="i" style="padding: 0;">
              <div style="font-family: var(--font-mono); font-size: 2rem; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1;" :style="{ color: kpi.color }">{{ kpi.num }}</div>
              <div style="font-size: 0.6875rem; color: rgba(255,255,255,0.45); margin-top: 0.25rem;">{{ kpi.label }}</div>
            </div>
          </div>

          <!-- Status segmented bar on dark -->
          <div v-if="statusDistribution.length" style="margin-top: 1.25rem;">
            <div style="display: flex; height: 4px; border-radius: 2px; overflow: hidden; background: rgba(255,255,255,0.08); gap: 2px;">
              <div v-for="item in statusDistribution" :key="item.status"
                style="height: 100%; border-radius: 2px; min-width: 4px;"
                :style="{ width: (item.count / statTotal * 100) + '%', background: item.color }"></div>
            </div>
            <div style="display: flex; gap: 1rem; margin-top: 0.5rem; flex-wrap: wrap;">
              <span v-for="item in statusDistribution" :key="item.status" style="display: flex; align-items: center; gap: 0.375rem;">
                <span style="width: 5px; height: 5px; border-radius: 1px;" :style="{ background: item.color }"></span>
                <span style="font-size: 0.6875rem; color: rgba(255,255,255,0.5);">{{ item.label }} {{ item.count }}</span>
              </span>
            </div>
          </div>
        </div>

        <!-- ═══ BODY — two columns ═══ -->
        <div style="display: grid; grid-template-columns: 1fr 320px; gap: 1.5rem; margin-top: 1.5rem;">

          <!-- LEFT: Recent passports with SOC bars -->
          <div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
              <span class="sn-eyebrow">최근 등록 여권</span>
              <button @click="nav('passports')" style="font-size: 0.6875rem; color: var(--color-accent); background: none; border: none; cursor: pointer; font-weight: 500;">전체 보기 →</button>
            </div>

            <div v-if="recentPassports.length" style="border: 1px solid var(--color-border); border-radius: 0.5rem; overflow: hidden;">
              <div v-for="(p, idx) in recentPassports.slice(0, 8)" :key="idx"
                @click="$emit('navigate', 'passport-detail', { passportId: p.passportId || p.id })"
                style="display: grid; grid-template-columns: 3fr 2fr 1fr 80px; align-items: center; padding: 0.625rem 1rem; cursor: pointer; border-bottom: 1px solid rgba(0,0,0,0.03);"
                @mouseenter="$event.currentTarget.style.background='#fafafa'"
                @mouseleave="$event.currentTarget.style.background='transparent'">
                <div>
                  <div style="font-size: 0.8125rem; font-weight: 600; color: var(--color-text-1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ p.model || '—' }}</div>
                  <div style="font-size: 0.6875rem; color: var(--color-text-3); font-family: var(--font-mono);">{{ p.passportId ? p.passportId.substring(0, 24) : '' }}</div>
                </div>
                <div style="font-size: 0.75rem; color: var(--color-text-2);">{{ p.manufacturerName || '—' }}</div>
                <div>
                  <span style="display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.6875rem; padding: 0.125rem 0.5rem; border-radius: 3px;"
                    :style="{ background: p.status==='ACTIVE'?'#f0fdf4':p.status==='MANUFACTURED'?'#eff6ff':p.status==='MAINTENANCE'?'#fffbeb':'#f5f5f5', color: p.status==='ACTIVE'?'#16a34a':p.status==='MANUFACTURED'?'#2563eb':p.status==='MAINTENANCE'?'#d97706':'#a3a3a3' }">
                    {{ statusLabels[p.status] || '—' }}
                  </span>
                </div>
                <div style="text-align: right;">
                  <div v-if="p.currentSoc != null" style="display: flex; align-items: center; gap: 0.375rem; justify-content: flex-end;">
                    <div style="width: 32px; height: 4px; background: rgba(0,0,0,0.06); border-radius: 2px; overflow: hidden;">
                      <div style="height: 100%; border-radius: 2px;" :style="{ width: Math.min(scaleSOC(p.currentSoc), 100) + '%', background: scaleSOC(p.currentSoc) >= 60 ? '#16a34a' : scaleSOC(p.currentSoc) >= 30 ? '#d97706' : '#dc2626' }"></div>
                    </div>
                    <span style="font-family: var(--font-mono); font-size: 0.6875rem; font-weight: 600; color: var(--color-text-1);">{{ scaleSOC(p.currentSoc) }}%</span>
                  </div>
                  <span v-else style="font-size: 0.6875rem; color: var(--color-text-3);">—</span>
                </div>
              </div>
            </div>

            <div v-else style="padding: 3rem; text-align: center; border: 1px dashed var(--color-border); border-radius: 0.5rem;">
              <p style="font-size: 0.875rem; color: var(--color-text-3); margin-bottom: 0.75rem;">등록된 여권이 없습니다</p>
              <button @click="nav('passports')" class="sn-btn sn-btn-accent">+ 여권 발급</button>
            </div>
          </div>

          <!-- RIGHT: Sidebar panels -->
          <div style="display: flex; flex-direction: column; gap: 1rem;">

            <!-- Chemistry breakdown with bars -->
            <div style="border: 1px solid var(--color-border); border-radius: 0.5rem; padding: 1rem;">
              <span class="sn-eyebrow" style="display: block; margin-bottom: 0.75rem;">화학 구성</span>
              <div v-if="chemistryDistribution.length" style="display: flex; flex-direction: column; gap: 0.5rem;">
                <div v-for="item in chemistryDistribution" :key="item.name" style="display: flex; align-items: center; gap: 0.5rem;">
                  <span style="font-size: 0.75rem; color: var(--color-text-2); width: 60px; flex-shrink: 0;">{{ item.name }}</span>
                  <div style="flex: 1; height: 6px; background: rgba(0,0,0,0.04); border-radius: 3px; overflow: hidden;">
                    <div style="height: 100%; border-radius: 3px;" :style="{ width: (chemTotal > 0 ? item.count / chemTotal * 100 : 0) + '%', background: item.color }"></div>
                  </div>
                  <span style="font-family: var(--font-mono); font-size: 0.6875rem; color: var(--color-text-1); width: 24px; text-align: right;">{{ item.count }}</span>
                </div>
              </div>
              <span v-else style="font-size: 0.75rem; color: var(--color-text-3);">데이터 없음</span>
            </div>

            <!-- Status detail breakdown -->
            <div style="border: 1px solid var(--color-border); border-radius: 0.5rem; padding: 1rem;">
              <span class="sn-eyebrow" style="display: block; margin-bottom: 0.75rem;">상태별 현황</span>
              <div v-for="s in statusList" :key="s" @click="nav('passports')"
                style="display: flex; align-items: center; justify-content: space-between; padding: 0.375rem 0; cursor: pointer; border-bottom: 1px solid rgba(0,0,0,0.03);">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span style="width: 8px; height: 8px; border-radius: 2px;"
                    :style="{ background: countByStatus[s] > 0 ? (s==='ACTIVE'?'#16a34a':s==='MANUFACTURED'?'#2563eb':s==='MAINTENANCE'?'#d97706':s==='ANALYSIS'?'#7c3aed':s==='RECYCLING'?'#ea580c':'#a3a3a3') : 'rgba(0,0,0,0.06)' }"></span>
                  <span style="font-size: 0.75rem;" :style="{ color: countByStatus[s] > 0 ? 'var(--color-text-1)' : 'var(--color-text-3)' }">{{ statusLabels[s] }}</span>
                </div>
                <span style="font-family: var(--font-mono); font-size: 0.8125rem; font-weight: 600;"
                  :style="{ color: countByStatus[s] > 0 ? 'var(--color-text-1)' : 'var(--color-text-3)' }">{{ countByStatus[s] || 0 }}</span>
              </div>
            </div>

            <!-- Quick actions -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
              <button @click="nav('materials')" class="sn-btn sn-btn-ghost" style="font-size: 0.75rem; padding: 0.5rem;">원자재 관리</button>
              <button @click="nav('maintenance')" class="sn-btn sn-btn-ghost" style="font-size: 0.75rem; padding: 0.5rem;">정비 서비스</button>
              <button @click="nav('audit-log')" class="sn-btn sn-btn-ghost" style="font-size: 0.75rem; padding: 0.5rem;">감사 로그</button>
              <button @click="nav('qr-scan')" class="sn-btn sn-btn-ghost" style="font-size: 0.75rem; padding: 0.5rem;">QR 스캔</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  `
});
