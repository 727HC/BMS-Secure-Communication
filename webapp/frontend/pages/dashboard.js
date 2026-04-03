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
    <div style="background: #fafafa; min-height: 100%; padding: 2rem 1.5rem; font-family: 'Pretendard Variable', Pretendard, sans-serif;">

      <style>
        @keyframes sn-reveal {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sn-panel {
          background: rgba(0,0,0,0.02);
          padding: 6px;
          border-radius: 1.25rem;
        }
        .sn-panel-inner {
          background: #ffffff;
          border-radius: calc(1.25rem - 6px);
          padding: 1.5rem;
        }
        .sn-eyebrow {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: #a3a3a3;
          word-break: keep-all;
        }
        .sn-table { width: 100%; border-collapse: collapse; }
        .sn-table thead tr { border-bottom: 1.5px solid #f5f5f5; }
        .sn-table thead th {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #a3a3a3;
          font-weight: 500;
          padding: 0 0.75rem 0.75rem 0;
          text-align: left;
          white-space: nowrap;
        }
        .sn-table tbody tr {
          border-bottom: 1px solid #f5f5f5;
          transition: all 0.5s cubic-bezier(0.16,1,0.3,1);
          cursor: pointer;
        }
        .sn-table tbody tr:last-child { border-bottom: none; }
        .sn-table tbody tr:hover { background: #fafafa; }
        .sn-table tbody td {
          font-size: 0.875rem;
          color: #525252;
          padding: 0.75rem 0.75rem 0.75rem 0;
          vertical-align: middle;
        }
        .sn-btn-accent {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.625rem 1.25rem;
          border-radius: 9999px;
          background: #16a34a;
          color: #ffffff;
          font-size: 0.875rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.5s cubic-bezier(0.16,1,0.3,1);
          font-family: 'Pretendard Variable', Pretendard, sans-serif;
        }
        .sn-btn-accent:hover { transform: scale(1.02); background: #15803d; }
        .sn-btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 1rem;
          border-radius: 9999px;
          background: transparent;
          color: #525252;
          font-size: 0.8125rem;
          font-weight: 500;
          border: 1.5px solid #e5e5e5;
          cursor: pointer;
          transition: all 0.5s cubic-bezier(0.16,1,0.3,1);
          font-family: 'Pretendard Variable', Pretendard, sans-serif;
        }
        .sn-btn-ghost:hover { border-color: #a3a3a3; color: #171717; }
      </style>

      <!-- LOADING -->
      <div v-if="loading" style="min-height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem;">
        <div style="width: 32px; height: 32px; border: 2.5px solid #e5e5e5; border-top-color: #16a34a; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
        <p class="sn-eyebrow">데이터를 불러오는 중입니다</p>
        <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
      </div>

      <div v-else>

        <!-- HEADER — stagger 0ms -->
        <div class="flex items-center justify-between mb-8"
          style="animation: sn-reveal 0.6s cubic-bezier(0.16,1,0.3,1) forwards; animation-delay: 0ms; opacity: 1;">
          <div>
            <p class="sn-eyebrow mb-1">Overview</p>
            <h1 style="font-family: 'Outfit', 'Pretendard Variable', sans-serif; font-size: 2rem; font-weight: 600; color: #171717; letter-spacing: -0.04em; line-height: 1.1;">대시보드</h1>
          </div>
          <button @click="nav('passports')" class="sn-btn-accent">
            <span style="font-size: 1rem; line-height: 1;">+</span>
            여권 발급
          </button>
        </div>

        <!-- KPI STRIP — stagger 80ms -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6"
          style="animation: sn-reveal 0.6s cubic-bezier(0.16,1,0.3,1) forwards; animation-delay: 80ms; opacity: 1;">
          <div v-for="(kpi, i) in [
            { num: totalCount,       label: '전체 여권',    sub: 'TOTAL',       page: 'passports'  },
            { num: activeCount,      label: '운행 중',      sub: 'ACTIVE',      page: 'passports'  },
            { num: maintenanceCount, label: '정비 대기',    sub: 'MAINTENANCE', page: 'passports'  },
            { num: materialCount,    label: '등록 원자재',  sub: 'MATERIALS',   page: 'materials'  }
          ]" :key="i"
            class="sn-panel"
            style="cursor: pointer; transition: all 0.5s cubic-bezier(0.16,1,0.3,1);"
            :style="{ animationDelay: (80 + i * 40) + 'ms' }"
            @click="nav(kpi.page)"
            @mouseenter="$event.currentTarget.style.transform='translateY(-2px)'"
            @mouseleave="$event.currentTarget.style.transform='translateY(0)'">
            <div class="sn-panel-inner">
              <p class="sn-eyebrow mb-2">{{ kpi.sub }}</p>
              <p style="font-size: clamp(1.75rem, 4vw, 2.5rem); font-weight: 700; color: #171717; letter-spacing: -0.04em; line-height: 1; font-variant-numeric: tabular-nums; font-family: 'Outfit', monospace;">{{ kpi.num }}</p>
              <p style="font-size: 0.8125rem; color: #525252; margin-top: 0.375rem; word-break: keep-all;">{{ kpi.label }}</p>
            </div>
          </div>
        </div>

        <!-- STATUS + CHEMISTRY ROW — stagger 240ms -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6"
          style="animation: sn-reveal 0.6s cubic-bezier(0.16,1,0.3,1) forwards; animation-delay: 240ms; opacity: 1;">

          <!-- STATUS: Segmented bar -->
          <div class="sn-panel">
            <div class="sn-panel-inner">
              <div class="flex items-center justify-between mb-4">
                <p class="sn-eyebrow">상태 분포</p>
                <span style="font-size: 11px; letter-spacing: 0.08em; color: #a3a3a3; font-variant-numeric: tabular-nums;">합계 {{ statTotal }}</span>
              </div>

              <!-- Horizontal segmented bar -->
              <div v-if="statusDistribution.length" style="display: flex; height: 8px; border-radius: 9999px; overflow: hidden; background: #f5f5f5; gap: 2px; margin-bottom: 1rem;">
                <div v-for="item in statusDistribution" :key="item.status"
                  style="height: 100%; border-radius: 9999px; min-width: 4px; transition: all 0.5s cubic-bezier(0.16,1,0.3,1);"
                  :style="{ width: (item.count / statTotal * 100) + '%', background: item.color }">
                </div>
              </div>
              <div v-else style="height: 8px; border-radius: 9999px; background: #f5f5f5; margin-bottom: 1rem;"></div>

              <!-- Legend dots -->
              <div style="display: flex; flex-wrap: wrap; gap: 0.625rem 1rem;">
                <div v-for="item in statusDistribution" :key="item.status"
                  class="flex items-center gap-1.5">
                  <span style="width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;"
                    :style="{ background: item.color }"></span>
                  <span style="font-size: 0.8125rem; color: #525252; word-break: keep-all;">{{ item.label }}</span>
                  <span style="font-size: 0.8125rem; color: #a3a3a3; font-variant-numeric: tabular-nums;">{{ item.count }}</span>
                </div>
                <div v-if="!statusDistribution.length" class="sn-eyebrow">데이터 없음</div>
              </div>
            </div>
          </div>

          <!-- CHEMISTRY: Inline pill tags -->
          <div class="sn-panel">
            <div class="sn-panel-inner">
              <div class="flex items-center justify-between mb-4">
                <p class="sn-eyebrow">화학 구성</p>
                <span style="font-size: 11px; letter-spacing: 0.08em; color: #a3a3a3; font-variant-numeric: tabular-nums;">합계 {{ chemTotal }}</span>
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                <div v-for="item in chemistryDistribution" :key="item.name"
                  style="display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.3125rem 0.75rem; border-radius: 9999px; border: 1.5px solid #e5e5e5; background: #ffffff;">
                  <span style="width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;"
                    :style="{ background: item.color }"></span>
                  <span style="font-size: 0.8125rem; font-weight: 500; color: #171717;">{{ item.name }}</span>
                  <span style="font-size: 11px; color: #a3a3a3; font-variant-numeric: tabular-nums;">{{ item.count }}</span>
                </div>
                <div v-if="!chemistryDistribution.length" class="sn-eyebrow">데이터 없음</div>
              </div>
            </div>
          </div>
        </div>

        <!-- RECENT PASSPORTS TABLE — stagger 360ms -->
        <div class="sn-panel"
          style="animation: sn-reveal 0.6s cubic-bezier(0.16,1,0.3,1) forwards; animation-delay: 360ms; opacity: 1;">
          <div class="sn-panel-inner">
            <div class="flex items-center justify-between mb-5">
              <p class="sn-eyebrow">최근 등록 여권</p>
              <button @click="nav('passports')" class="sn-btn-ghost">전체 보기 →</button>
            </div>

            <!-- Table with data -->
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
                    <td style="color: #171717; font-weight: 500; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ p.manufacturerName || '—' }}</td>
                    <td style="max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ p.model || '—' }}</td>
                    <td>
                      <span style="display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.2rem 0.5rem; border-radius: 9999px; background: #f5f5f5; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #525252; font-weight: 500;">
                        {{ p.chemistry || '—' }}
                      </span>
                    </td>
                    <td style="white-space: nowrap; color: #a3a3a3; font-size: 0.8125rem;">{{ formatDate(p.createdAt || p.manufactureDate) }}</td>
                    <td>
                      <span style="display: inline-flex; align-items: center; gap: 0.375rem;">
                        <span style="width: 6px; height: 6px; border-radius: 50; flex-shrink: 0;"
                          :style="{
                            borderRadius: '50%',
                            background: p.status==='ACTIVE'?'#16a34a'
                              :p.status==='MANUFACTURED'?'#2563eb'
                              :p.status==='MAINTENANCE'?'#d97706'
                              :p.status==='ANALYSIS'?'#7c3aed'
                              :p.status==='RECYCLING'?'#ea580c'
                              :'#a3a3a3'
                          }"></span>
                        <span style="font-size: 0.8125rem; color: #525252; word-break: keep-all;">{{ statusLabels[p.status] || '—' }}</span>
                      </span>
                    </td>
                    <td style="text-align: right; color: #a3a3a3; font-variant-numeric: tabular-nums; white-space: nowrap;">{{ p.weight ? p.weight + ' kg' : '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Empty state -->
            <div v-else style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem 1rem; gap: 1rem; text-align: center;">
              <p style="font-size: 0.9375rem; color: #a3a3a3; word-break: keep-all;">등록된 배터리 여권이 없습니다.</p>
              <p style="font-size: 0.8125rem; color: #d4d4d4; word-break: keep-all;">첫 번째 여권을 발급하여 추적을 시작하세요.</p>
              <button @click="nav('passports')" class="sn-btn-accent" style="margin-top: 0.5rem;">+ 여권 발급하기</button>
            </div>

          </div>
        </div>

      </div>
    </div>
  `
});
