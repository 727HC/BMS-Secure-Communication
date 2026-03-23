app.component('dashboard-page', {
  props: ['auth', 'api'],
  emits: ['navigate'],
  setup(props, { emit }) {
    const { ref, computed, onMounted } = Vue;

    const passports = ref([]);
    const loading = ref(true);
    const fabricStatus = ref('disconnected');
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
        if (statusData.status === 'fulfilled') {
          fabricStatus.value = statusData.value.fabric || 'disconnected';
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
    function scaleSOC(val) {
      if (val == null) return 0;
      const n = Number(val);
      return n > 100 ? +(n / 655.35).toFixed(1) : +n.toFixed(1);
    }

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
    const statusList = ['MANUFACTURED', 'ACTIVE', 'MAINTENANCE', 'ANALYSIS', 'RECYCLING', 'DISPOSED'];

    const statusLabels = {
      MANUFACTURED: '제조완료', ACTIVE: '운행중', MAINTENANCE: '정비중',
      ANALYSIS: '분석중', RECYCLING: '재활용', DISPOSED: '폐기',
    };

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

    /* ---------- GBA 21 compliance ---------- */
    const gba21Fields = [
      { idx: 1, key: 'passportId', label: '여권 ID', group: '식별정보' },
      { idx: 2, key: 'batteryId', label: '배터리 ID', group: '식별정보' },
      { idx: 3, key: 'serialNumber', label: '시리얼번호', group: '식별정보' },
      { idx: 4, key: 'model', label: '모델명', group: '제조정보' },
      { idx: 5, key: 'manufacturerName', label: '제조사', group: '제조정보' },
      { idx: 6, key: 'manufactureCountry', label: '제조국가', group: '제조정보' },
      { idx: 7, key: 'cellManufacturer', label: '셀 제조사', group: '제조정보' },
      { idx: 8, key: 'cellManufactureCountry', label: '셀 제조국가', group: '제조정보' },
      { idx: 9, key: 'manufactureDate', label: '제조일자', group: '제조정보' },
      { idx: 10, key: 'cellType', label: '셀 유형', group: '제조정보' },
      { idx: 11, key: 'chemistry', label: '화학물질', group: '제조정보' },
      { idx: 12, key: 'cellCount', label: '셀 수', group: '기술사양' },
      { idx: 13, key: 'weight', label: '무게', group: '기술사양' },
      { idx: 14, key: 'totalEnergy', label: '총 에너지', group: '기술사양' },
      { idx: 15, key: 'energyDensity', label: '에너지밀도', group: '기술사양' },
      { idx: 16, key: 'ratedCapacity', label: '정격용량', group: '기술사양' },
      { idx: 17, key: 'expectedLifespan', label: '예상수명', group: '기술사양' },
      { idx: 18, key: 'voltageRange', label: '전압범위', group: '기술사양' },
      { idx: 19, key: 'temperatureRange', label: '온도범위', group: '기술사양' },
      { idx: 20, key: 'carbonFootprint', label: '탄소발자국', group: '기술사양' },
      { idx: 21, key: 'rawMaterials', label: '원자재', group: '기술사양' },
    ];

    function fieldFilled(p, key) {
      const v = p[key];
      if (v == null || v === '' || v === 0) return false;
      if (typeof v === 'object' && Object.keys(v).length === 0) return false;
      if (Array.isArray(v) && v.length === 0) return false;
      return true;
    }

    const gbaComplianceOverview = computed(() => {
      if (passports.value.length === 0) return { pct: 0, filled: 0, groups: [] };
      let totalFilled = 0;
      passports.value.forEach(p => {
        gba21Fields.forEach(f => {
          if (fieldFilled(p, f.key)) totalFilled++;
        });
      });
      const avgFilled = Math.round(totalFilled / passports.value.length);
      const pct = Math.round((avgFilled / 21) * 100);

      const rep = passports.value[0];
      const fields = gba21Fields.map(f => ({
        ...f,
        filled: rep ? fieldFilled(rep, f.key) : false,
      }));

      const groups = ['식별정보', '제조정보', '기술사양'].map(g => ({
        name: g,
        fields: fields.filter(f => f.group === g),
      }));

      return { pct, filled: avgFilled, groups };
    });

    /* ---------- 화학 구성 distribution ---------- */
    const chemistryDistribution = computed(() => {
      const map = {};
      passports.value.forEach(p => {
        const c = p.chemistry || 'Unknown';
        map[c] = (map[c] || 0) + 1;
      });
      const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
      const colors = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'];
      return entries.map(([name, count], i) => ({
        name, count, color: colors[i % colors.length],
      }));
    });

    /* ---------- Status distribution ---------- */
    const statusDistribution = computed(() => {
      const colors = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'];
      const items = [];
      statusList.forEach((s, i) => {
        const count = countByStatus.value[s] || 0;
        if (count > 0) {
          items.push({ status: s, label: statusLabels[s], count, color: colors[i % colors.length] });
        }
      });
      return items;
    });

    /* ---------- Donut chart SVG helpers ---------- */
    function donutSegments(items) {
      const total = items.reduce((s, it) => s + it.count, 0);
      if (total === 0) return [];
      const circumference = 2 * Math.PI * 40; // radius=40
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
      loading, fabricStatus, passports, materials,
      totalCount, activeCount,
      statusList, statusLabels,
      countByStatus, statusDistribution,
      gba21Fields, gbaComplianceOverview,
      chemistryDistribution, chemistrySegments, chemTotal,
      statusDistribution, statTotal,
      recentPassports,
      scaleSOC, truncate, formatDate, nav,
    };
  },
  template: `
    <div class="space-y-6">

      <!-- ===== LOADING ===== -->
      <div v-if="loading" class="flex flex-col justify-center items-center py-32">
        <svg class="animate-spin h-10 w-10 text-emerald-600 mb-4" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        <p class="text-sm text-slate-500">데이터를 불러오는 중...</p>
      </div>

      <div v-else>

        <!-- ===== SECTION 1: HEADER ===== -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-slate-900">대시보드</h1>
            <p class="text-sm text-slate-500 mt-1">배터리 여권 현황을 한눈에 확인하세요.</p>
          </div>
          <div class="flex items-center gap-2">
            <button @click="nav('passports')"
              class="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              여권 발급
            </button>
          </div>
        </div>

        <!-- ===== SECTION 2: KPI CARDS ===== -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <!-- Card 1: 전체 여권 -->
          <div @click="nav('passports')"
               class="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer">
            <p class="text-sm font-medium text-slate-500 mb-1">전체 여권</p>
            <div class="flex items-end gap-3">
              <p class="text-4xl font-bold text-slate-900 tabular-nums leading-none">{{ totalCount }}</p>
              <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 mb-0.5">
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>
                2%
              </span>
            </div>
          </div>

          <!-- Card 2: 운행중 -->
          <div class="bg-white rounded-xl border border-gray-200 p-6">
            <p class="text-sm font-medium text-slate-500 mb-1">운행중</p>
            <div class="flex items-end gap-3">
              <p class="text-4xl font-bold text-slate-900 tabular-nums leading-none">{{ activeCount }}</p>
            </div>
          </div>

          <!-- Card 3: GBA 21 준수율 -->
          <div class="bg-white rounded-xl border border-gray-200 p-6">
            <p class="text-sm font-medium text-slate-500 mb-1">GBA 21 준수율</p>
            <div class="flex items-end gap-3">
              <p class="text-4xl font-bold text-slate-900 tabular-nums leading-none">{{ gbaComplianceOverview.pct }}<span class="text-xl text-slate-400">%</span></p>
              <span v-if="gbaComplianceOverview.pct >= 50"
                class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 mb-0.5">
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>
                {{ gbaComplianceOverview.filled }}/21
              </span>
              <span v-else
                class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-red-50 text-red-600 mb-0.5">
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                {{ gbaComplianceOverview.filled }}/21
              </span>
            </div>
          </div>
        </div>

        <!-- ===== SECTION 3: DONUT CHARTS ===== -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <!-- Left: 화학 구성 Distribution -->
          <div class="bg-white rounded-xl border border-gray-200 p-6">
            <h2 class="text-base font-semibold text-slate-900 mb-6">화학 구성</h2>
            <div class="flex items-center gap-8">
              <!-- Donut SVG -->
              <div class="relative flex-shrink-0" style="width:140px;height:140px;">
                <svg viewBox="0 0 100 100" class="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" stroke-width="12"/>
                  <circle v-for="(seg, i) in chemistrySegments" :key="i"
                    cx="50" cy="50" r="40" fill="none"
                    :stroke="seg.color" stroke-width="12"
                    :stroke-dasharray="seg.dashArray"
                    :stroke-dashoffset="seg.dashOffset"
                    stroke-linecap="round"
                    class="transition-all duration-700"/>
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center">
                  <span class="text-2xl font-bold text-slate-900">{{ chemTotal }}</span>
                  <span class="text-[10px] text-slate-400 uppercase tracking-wide">합계</span>
                </div>
              </div>
              <!-- Legend -->
              <div class="flex-1 space-y-2.5">
                <div v-for="item in chemistryDistribution" :key="item.name" class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ backgroundColor: item.color }"></span>
                    <span class="text-sm text-slate-600">{{ item.name }}</span>
                  </div>
                  <span class="text-sm font-semibold text-slate-800 tabular-nums">{{ item.count }}</span>
                </div>
                <div v-if="chemistryDistribution.length === 0" class="text-sm text-slate-400 py-4">데이터 없음</div>
              </div>
            </div>
          </div>

          <!-- Right: 상태 분포 (수평 바 차트) -->
          <div class="bg-white rounded-xl border border-gray-200 p-6">
            <h2 class="text-base font-semibold text-slate-900 mb-6">상태 분포</h2>
            <div class="space-y-3">
              <div v-for="item in statusDistribution" :key="item.status" class="flex items-center gap-3">
                <span class="text-xs font-medium text-slate-500 w-16 text-right flex-shrink-0">{{ item.label }}</span>
                <div class="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-700"
                    :style="{ width: (statTotal > 0 ? item.count / statTotal * 100 : 0) + '%', backgroundColor: item.color }"></div>
                </div>
                <span class="text-sm font-bold text-slate-800 tabular-nums w-8 flex-shrink-0">{{ item.count }}</span>
              </div>
              <div v-if="statusDistribution.length === 0" class="text-sm text-slate-400 py-8 text-center">데이터 없음</div>
              <div v-else class="pt-2 text-right">
                <span class="text-xs text-slate-400">합계 {{ statTotal }}건</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== SECTION 4: ADD CUSTOM REPORT ===== -->
        <div class="text-center py-2">
          <button class="text-sm text-slate-400 hover:text-emerald-600 transition-colors font-medium">
            + 맞춤 보고서 추가
          </button>
        </div>

        <!-- ===== SECTION 5: RECENT PASSPORTS TABLE ===== -->
        <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 class="text-base font-semibold text-slate-900">최근 등록 여권</h2>
            <button @click="nav('passports')"
                    class="text-sm text-emerald-600 hover:text-emerald-800 font-medium transition-colors flex items-center gap-1">
              전체 보기
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
          <div v-if="recentPassports.length > 0" class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b border-gray-100">
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">제조사</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">모델</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">무게</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">화학</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">등록일</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">상태</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">작업</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50">
                <tr v-for="(p, idx) in recentPassports" :key="idx"
                    @click="$emit('navigate', 'passport-detail', { passportId: p.passportId || p.id })"
                    class="hover:bg-emerald-50/30 transition-colors cursor-pointer">
                  <td class="px-6 py-3.5 text-sm text-slate-700">{{ p.manufacturerName || '-' }}</td>
                  <td class="px-6 py-3.5 text-sm text-slate-700 font-medium">{{ p.model || '-' }}</td>
                  <td class="px-6 py-3.5 text-sm text-slate-500 tabular-nums">{{ p.weight ? p.weight + ' kg' : '-' }}</td>
                  <td class="px-6 py-3.5 text-sm text-slate-500">{{ p.chemistry || '-' }}</td>
                  <td class="px-6 py-3.5 text-sm text-slate-400">{{ formatDate(p.createdAt || p.manufactureDate) }}</td>
                  <td class="px-6 py-3.5">
                    <span class="inline-flex items-center gap-1.5 text-sm">
                      <span :class="['w-1.5 h-1.5 rounded-full',
                        p.status === 'MANUFACTURED' ? 'bg-blue-500' :
                        p.status === 'ACTIVE' ? 'bg-emerald-500' :
                        p.status === 'MAINTENANCE' ? 'bg-amber-500' :
                        p.status === 'ANALYSIS' ? 'bg-purple-500' :
                        p.status === 'RECYCLING' ? 'bg-orange-500' :
                        p.status === 'DISPOSED' ? 'bg-gray-500' : 'bg-slate-400']"></span>
                      <span class="text-slate-600">{{ statusLabels[p.status] || p.status || 'Unknown' }}</span>
                    </span>
                  </td>
                  <td class="px-6 py-3.5">
                    <button @click.stop="$emit('navigate', 'passport-detail', { passportId: p.passportId || p.id })"
                      class="text-sm text-emerald-600 hover:text-emerald-800 font-medium">
                      상세
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="py-16 text-center">
            <svg class="mx-auto w-12 h-12 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
            </svg>
            <p class="text-sm font-medium text-slate-500">등록된 여권이 없습니다</p>
            <p class="text-xs text-slate-400 mt-1">새 배터리 여권을 발급하여 시작하세요.</p>
          </div>
        </div>

      </div>
    </div>
  `
});
