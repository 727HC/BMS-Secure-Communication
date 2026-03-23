app.component('dashboard-page', {
  props: ['auth', 'api'],
  emits: ['navigate'],
  setup(props, { emit }) {
    const { ref, computed, onMounted } = Vue;

    const passports = ref([]);
    const loading = ref(true);
    const fabricStatus = ref('disconnected');
    const materials = ref([]);
    const currentTime = ref('');

    /* ---------- data fetching ---------- */
    onMounted(async () => {
      updateTime();
      setInterval(updateTime, 60000);
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

    function updateTime() {
      currentTime.value = new Date().toLocaleString('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric',
        weekday: 'long', hour: '2-digit', minute: '2-digit'
      });
    }

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
        return dt.toLocaleString('ko-KR');
      } catch { return d; }
    }

    /* ---------- status config ---------- */
    const statusList = ['MANUFACTURED', 'ACTIVE', 'MAINTENANCE', 'ANALYSIS', 'RECYCLING', 'DISPOSED'];

    const statusLabels = {
      MANUFACTURED: '제조완료', ACTIVE: '운행중', MAINTENANCE: '정비중',
      ANALYSIS: '분석중', RECYCLING: '재활용', DISPOSED: '폐기',
    };

    const statusHexColors = {
      MANUFACTURED: '#3b82f6', ACTIVE: '#10b981', MAINTENANCE: '#f59e0b',
      ANALYSIS: '#8b5cf6', RECYCLING: '#f97316', DISPOSED: '#6b7280',
    };

    const statusBgClasses = {
      MANUFACTURED: 'bg-blue-500', ACTIVE: 'bg-green-500', MAINTENANCE: 'bg-amber-500',
      ANALYSIS: 'bg-purple-500', RECYCLING: 'bg-orange-500', DISPOSED: 'bg-gray-500',
    };

    const statusBadgeClasses = {
      MANUFACTURED: 'bg-blue-100 text-blue-800',
      ACTIVE: 'bg-green-100 text-green-800',
      MAINTENANCE: 'bg-amber-100 text-amber-800',
      ANALYSIS: 'bg-purple-100 text-purple-800',
      RECYCLING: 'bg-orange-100 text-orange-800',
      DISPOSED: 'bg-gray-100 text-gray-700',
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
    const maintenanceCount = computed(() => countByStatus.value['MAINTENANCE'] || 0);
    const recyclingDisposedCount = computed(() =>
      (countByStatus.value['RECYCLING'] || 0) + (countByStatus.value['DISPOSED'] || 0)
    );

    const avgSoc = computed(() => {
      const items = passports.value.filter(p => p.currentSoc != null);
      if (items.length === 0) return 0;
      return Math.round(items.reduce((s, p) => s + scaleSOC(p.currentSoc), 0) / items.length);
    });

    const avgSoh = computed(() => {
      const items = passports.value.filter(p => p.currentSoh != null);
      if (items.length === 0) return 0;
      return Math.round(items.reduce((s, p) => s + Number(p.currentSoh), 0) / items.length);
    });

    const orgDisplayName = computed(() => {
      const map = {
        ManufacturerMSP: '배터리 제조사', EVManufacturerMSP: 'EV 제조사',
        ServiceMSP: '정비/서비스', RegulatorMSP: '규제기관',
      };
      return map[props.auth.orgMsp] || props.auth.orgMsp;
    });

    /* ---------- GBA 21 compliance ---------- */
    const gba21Fields = [
      // Group 1: 식별정보 (1-3)
      { idx: 1, key: 'passportId', label: '여권 ID', group: '식별정보' },
      { idx: 2, key: 'batteryId', label: '배터리 ID', group: '식별정보' },
      { idx: 3, key: 'serialNumber', label: '시리얼번호', group: '식별정보' },
      // Group 2: 제조정보 (4-11)
      { idx: 4, key: 'model', label: '모델명', group: '제조정보' },
      { idx: 5, key: 'manufacturerName', label: '제조사', group: '제조정보' },
      { idx: 6, key: 'manufactureCountry', label: '제조국가', group: '제조정보' },
      { idx: 7, key: 'cellManufacturer', label: '셀 제조사', group: '제조정보' },
      { idx: 8, key: 'cellManufactureCountry', label: '셀 제조국가', group: '제조정보' },
      { idx: 9, key: 'manufactureDate', label: '제조일자', group: '제조정보' },
      { idx: 10, key: 'cellType', label: '셀 유형', group: '제조정보' },
      { idx: 11, key: 'chemistry', label: '화학물질', group: '제조정보' },
      // Group 3: 기술사양 (12-21)
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
      // Average across all passports
      let totalFilled = 0;
      passports.value.forEach(p => {
        gba21Fields.forEach(f => {
          if (fieldFilled(p, f.key)) totalFilled++;
        });
      });
      const avgFilled = Math.round(totalFilled / passports.value.length);
      const pct = Math.round((avgFilled / 21) * 100);

      // For field-level, use first passport as representative
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

    /* ---------- status distribution for bar chart ---------- */
    const statusDistribution = computed(() => {
      const maxCount = Math.max(...statusList.map(s => countByStatus.value[s] || 0), 1);
      return statusList.map(s => ({
        status: s,
        label: statusLabels[s],
        count: countByStatus.value[s] || 0,
        pct: Math.round(((countByStatus.value[s] || 0) / maxCount) * 100),
        color: statusHexColors[s],
        bgClass: statusBgClasses[s],
      }));
    });

    /* ---------- recent activity timeline ---------- */
    const recentActivity = computed(() => {
      const activities = [];
      const sorted = [...passports.value].sort((a, b) => {
        const da = a.updatedAt || a.createdAt || '';
        const db = b.updatedAt || b.createdAt || '';
        return db.localeCompare(da);
      });
      sorted.slice(0, 10).forEach(p => {
        const ts = p.updatedAt || p.createdAt || '';
        if (p.vin && p.status === 'ACTIVE') {
          activities.push({ type: 'vin', desc: (p.model || 'Battery') + ' VIN 바인딩 완료', time: ts, icon: 'link' });
        }
        if ((p.maintenanceLogs || []).length > 0) {
          activities.push({ type: 'maintenance', desc: (p.model || 'Battery') + ' 정비 기록 추가', time: ts, icon: 'wrench' });
        }
        if (p.status === 'MANUFACTURED') {
          activities.push({ type: 'create', desc: (p.model || 'Battery') + ' 여권 생성', time: p.createdAt || ts, icon: 'plus' });
        }
        if (p.status === 'RECYCLING' || p.status === 'DISPOSED') {
          activities.push({ type: 'recycle', desc: (p.model || 'Battery') + ' ' + statusLabels[p.status], time: ts, icon: 'recycle' });
        }
      });
      activities.sort((a, b) => (b.time || '').localeCompare(a.time || ''));
      return activities.slice(0, 5);
    });

    function timeAgo(ts) {
      if (!ts) return '';
      const now = new Date();
      const then = new Date(ts);
      const diff = Math.floor((now - then) / 1000);
      if (diff < 60) return '방금 전';
      if (diff < 3600) return Math.floor(diff / 60) + '분 전';
      if (diff < 86400) return Math.floor(diff / 3600) + '시간 전';
      if (diff < 604800) return Math.floor(diff / 86400) + '일 전';
      return formatDate(ts);
    }

    /* ---------- recent passports ---------- */
    const recentPassports = computed(() => {
      const sorted = [...passports.value].sort((a, b) => {
        const da = a.createdAt || a.timestamp || '';
        const db = b.createdAt || b.timestamp || '';
        return db.localeCompare(da);
      });
      return sorted.slice(0, 5);
    });

    /* ---------- gauge helpers ---------- */
    const gaugeCircumference = 2 * Math.PI * 36;
    const gaugeReady = ref(false);
    onMounted(() => {
      setTimeout(() => { gaugeReady.value = true; }, 150);
    });

    function nav(page) { emit('navigate', page); }

    return {
      loading, fabricStatus, passports, currentTime,
      totalCount, activeCount, maintenanceCount, recyclingDisposedCount,
      avgSoc, avgSoh, orgDisplayName,
      statusList, statusLabels, statusHexColors, statusBgClasses, statusBadgeClasses,
      countByStatus, statusDistribution,
      gba21Fields, gbaComplianceOverview,
      recentActivity, timeAgo,
      recentPassports,
      gaugeCircumference, gaugeReady,
      scaleSOC, truncate, formatDate, nav,
    };
  },
  template: `
    <div class="space-y-6">

      <!-- ===== LOADING ===== -->
      <div v-if="loading" class="flex flex-col justify-center items-center py-32">
        <svg class="animate-spin h-10 w-10 text-blue-600 mb-4" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        <p class="text-sm text-slate-500">데이터를 불러오는 중...</p>
      </div>

      <div v-else>

        <!-- ===== SECTION 1: WELCOME + SYSTEM STATUS ===== -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-5">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div class="flex items-center gap-4">
              <div>
                <div class="flex items-center gap-3 mb-1">
                  <h1 class="text-xl font-bold text-slate-900">
                    안녕하세요, {{ auth.userId }}님
                  </h1>
                  <span class="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                    {{ orgDisplayName }}
                  </span>
                </div>
                <p class="text-sm text-slate-500">{{ currentTime }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2 bg-slate-50 rounded-lg px-4 py-2 border border-slate-200">
              <span :class="['inline-block w-2 h-2 rounded-full',
                fabricStatus === 'connected' ? 'bg-green-500' : 'bg-red-400']"
                :style="fabricStatus === 'connected' ? 'box-shadow: 0 0 6px rgba(34,197,94,0.5)' : ''"></span>
              <span class="text-sm font-medium text-slate-700">Blockchain {{ fabricStatus === 'connected' ? 'Connected' : 'Disconnected' }}</span>
            </div>
          </div>
        </div>

        <!-- ===== SECTION 2: KEY METRICS (3x2 grid) ===== -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          <!-- Card 1: 전체 여권 -->
          <div @click="nav('passports')"
               class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-sm font-medium text-slate-500">전체 여권</p>
                <p class="mt-2 text-3xl font-bold text-slate-900 tabular-nums">{{ totalCount }}</p>
              </div>
              <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <svg class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="6" width="18" height="12" rx="2"/><path d="M22 10v4"/>
                  <rect x="5" y="9" width="8" height="6" rx="1" fill="currentColor" opacity="0.3"/>
                </svg>
              </div>
            </div>
          </div>

          <!-- Card 2: 운행중 -->
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-sm font-medium text-slate-500">운행중</p>
                <p class="mt-2 text-3xl font-bold text-slate-900 tabular-nums">{{ activeCount }}</p>
              </div>
              <div class="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                <svg class="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <polyline points="9 12 11 14 15 10"/>
                </svg>
              </div>
            </div>
          </div>

          <!-- Card 3: 평균 SOC (mini gauge) -->
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-sm font-medium text-slate-500">평균 SOC</p>
                <p class="mt-2 text-3xl font-bold text-slate-900 tabular-nums">{{ avgSoc }}<span class="text-lg text-slate-400">%</span></p>
              </div>
              <svg viewBox="0 0 80 80" class="w-14 h-14 flex-shrink-0">
                <circle cx="40" cy="40" r="36" fill="none" stroke="#e2e8f0" stroke-width="5"/>
                <circle cx="40" cy="40" r="36" fill="none"
                        stroke="#10b981" stroke-width="5" stroke-linecap="round"
                        :stroke-dasharray="gaugeCircumference"
                        :stroke-dashoffset="gaugeReady ? gaugeCircumference * (1 - avgSoc / 100) : gaugeCircumference"
                        transform="rotate(-90 40 40)"
                        style="transition: stroke-dashoffset 1s ease;"/>
                <text x="40" y="44" text-anchor="middle" dominant-baseline="middle"
                      fill="#10b981" font-size="14" font-weight="700">{{ avgSoc }}</text>
              </svg>
            </div>
          </div>

          <!-- Card 4: 평균 SOH (mini gauge) -->
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-sm font-medium text-slate-500">평균 SOH</p>
                <p class="mt-2 text-3xl font-bold text-slate-900 tabular-nums">{{ avgSoh }}<span class="text-lg text-slate-400">%</span></p>
              </div>
              <svg viewBox="0 0 80 80" class="w-14 h-14 flex-shrink-0">
                <circle cx="40" cy="40" r="36" fill="none" stroke="#e2e8f0" stroke-width="5"/>
                <circle cx="40" cy="40" r="36" fill="none"
                        stroke="#3b82f6" stroke-width="5" stroke-linecap="round"
                        :stroke-dasharray="gaugeCircumference"
                        :stroke-dashoffset="gaugeReady ? gaugeCircumference * (1 - avgSoh / 100) : gaugeCircumference"
                        transform="rotate(-90 40 40)"
                        style="transition: stroke-dashoffset 1s ease;"/>
                <text x="40" y="44" text-anchor="middle" dominant-baseline="middle"
                      fill="#3b82f6" font-size="14" font-weight="700">{{ avgSoh }}</text>
              </svg>
            </div>
          </div>

          <!-- Card 5: 정비 대기 -->
          <div @click="nav('maintenance')"
               class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md hover:border-amber-300 transition-all cursor-pointer">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-sm font-medium text-slate-500">정비 대기</p>
                <p class="mt-2 text-3xl font-bold text-slate-900 tabular-nums">{{ maintenanceCount }}</p>
              </div>
              <div class="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg class="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                </svg>
              </div>
            </div>
          </div>

          <!-- Card 6: 재활용/폐기 -->
          <div @click="nav('recycling')"
               class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md hover:border-orange-300 transition-all cursor-pointer">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-sm font-medium text-slate-500">재활용/폐기</p>
                <p class="mt-2 text-3xl font-bold text-slate-900 tabular-nums">{{ recyclingDisposedCount }}</p>
              </div>
              <div class="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                <svg class="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== SECTION 3: GBA 21 COMPLIANCE OVERVIEW ===== -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="px-6 py-5 border-b border-slate-100">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <polyline points="9 12 11 14 15 10"/>
                  </svg>
                </div>
                <div>
                  <h2 class="text-base font-semibold text-slate-900">GBA 21 규제 준수 현황</h2>
                  <p class="text-xs text-slate-400 mt-0.5">Global Battery Alliance 21가지 데이터 항목 평균 준수율</p>
                </div>
              </div>
              <span class="text-2xl font-bold text-slate-900 tabular-nums">{{ gbaComplianceOverview.filled }}<span class="text-sm text-slate-400 font-normal">/21</span></span>
            </div>
          </div>
          <div class="px-6 py-5">
            <!-- Progress bar -->
            <div class="mb-6">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-slate-600">전체 준수율</span>
                <span class="text-sm font-bold tabular-nums" :class="gbaComplianceOverview.pct >= 80 ? 'text-green-600' : gbaComplianceOverview.pct >= 50 ? 'text-amber-600' : 'text-red-600'">{{ gbaComplianceOverview.pct }}%</span>
              </div>
              <div class="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all duration-700"
                     :class="gbaComplianceOverview.pct >= 80 ? 'bg-green-500' : gbaComplianceOverview.pct >= 50 ? 'bg-amber-500' : 'bg-red-500'"
                     :style="{ width: gbaComplianceOverview.pct + '%' }"></div>
              </div>
            </div>

            <!-- Grouped field checklist -->
            <div class="space-y-5">
              <div v-for="group in gbaComplianceOverview.groups" :key="group.name">
                <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">{{ group.name }}</h4>
                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2">
                  <div v-for="f in group.fields" :key="f.idx" class="flex items-center gap-2">
                    <svg v-if="f.filled" class="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                    <svg v-else class="w-4 h-4 text-slate-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                    <span class="text-xs" :class="f.filled ? 'text-slate-700' : 'text-slate-400'">{{ f.label }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== SECTION 4: TWO COLUMNS ===== -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <!-- Left: Battery Lifecycle Status (Horizontal Bars) -->
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div class="flex items-center gap-2 mb-5">
              <svg class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M3 9h18M9 21V9"/>
              </svg>
              <h2 class="text-base font-semibold text-slate-900">배터리 수명주기 현황</h2>
            </div>
            <div class="space-y-3.5">
              <div v-for="item in statusDistribution" :key="item.status">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-medium text-slate-600">{{ item.label }}</span>
                  <span class="text-xs font-bold text-slate-800 tabular-nums">{{ item.count }}</span>
                </div>
                <div class="w-full h-4 bg-slate-100 rounded overflow-hidden">
                  <div class="h-full rounded transition-all duration-700"
                       :style="{ width: (totalCount > 0 ? (item.count / totalCount * 100) : 0) + '%', backgroundColor: item.color, minWidth: item.count > 0 ? '8px' : '0' }"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Recent Activity Timeline -->
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div class="flex items-center gap-2 mb-5">
              <svg class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <h2 class="text-base font-semibold text-slate-900">최근 활동</h2>
            </div>
            <div v-if="recentActivity.length === 0" class="py-10 text-center">
              <p class="text-sm text-slate-400">최근 활동이 없습니다</p>
            </div>
            <div v-else class="relative pl-7">
              <div class="absolute left-[11px] top-1 bottom-1 w-0.5 bg-slate-200"></div>
              <div class="space-y-5">
                <div v-for="(act, i) in recentActivity" :key="i" class="relative">
                  <!-- Timeline dot -->
                  <div class="absolute -left-7 top-0.5 w-[22px] h-[22px] rounded-full border-2 border-white shadow-sm flex items-center justify-center"
                       :class="act.icon === 'plus' ? 'bg-blue-500' : act.icon === 'link' ? 'bg-green-500' : act.icon === 'wrench' ? 'bg-amber-500' : 'bg-orange-500'">
                    <!-- Plus -->
                    <svg v-if="act.icon === 'plus'" class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    <!-- Link -->
                    <svg v-else-if="act.icon === 'link'" class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                    </svg>
                    <!-- Wrench -->
                    <svg v-else-if="act.icon === 'wrench'" class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
                    </svg>
                    <!-- Recycle -->
                    <svg v-else class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                      <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9"/>
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm text-slate-800">{{ act.desc }}</p>
                    <p class="text-xs text-slate-400 mt-0.5">{{ timeAgo(act.time) }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== SECTION 5: RECENT PASSPORTS TABLE ===== -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                <rect x="9" y="3" width="6" height="4" rx="1"/>
              </svg>
              <h2 class="text-base font-semibold text-slate-900">최근 등록 여권</h2>
            </div>
            <button @click="nav('passports')"
                    class="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors flex items-center gap-1">
              전체 보기
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
          <div v-if="recentPassports.length > 0" class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="bg-slate-50/80">
                  <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">여권 ID</th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">모델</th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">상태</th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">SOC</th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">VIN</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="(p, idx) in recentPassports" :key="idx"
                    @click="$emit('navigate', 'passport-detail', { passportId: p.passportId || p.id })"
                    class="hover:bg-blue-50/50 transition-colors cursor-pointer">
                  <td class="px-6 py-3.5">
                    <span class="text-sm font-mono text-blue-600 font-medium">{{ truncate(p.passportId || p.id, 16) }}</span>
                  </td>
                  <td class="px-6 py-3.5 text-sm text-slate-700">{{ p.model || '-' }}</td>
                  <td class="px-6 py-3.5">
                    <span :class="['inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', statusBadgeClasses[p.status] || 'bg-slate-100 text-slate-600']">
                      {{ statusLabels[p.status] || p.status || 'UNKNOWN' }}
                    </span>
                  </td>
                  <td class="px-6 py-3.5">
                    <div class="flex items-center gap-2">
                      <div class="w-16 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div class="h-full rounded-full transition-all"
                             :class="scaleSOC(p.currentSoc) >= 50 ? 'bg-green-500' : scaleSOC(p.currentSoc) >= 20 ? 'bg-amber-500' : 'bg-red-500'"
                             :style="{ width: Math.min(scaleSOC(p.currentSoc), 100) + '%' }"></div>
                      </div>
                      <span class="text-xs text-slate-600 font-medium tabular-nums w-10">{{ scaleSOC(p.currentSoc) }}%</span>
                    </div>
                  </td>
                  <td class="px-6 py-3.5 text-sm text-slate-500 font-mono">{{ p.vin ? truncate(p.vin, 14) : '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="py-14 text-center">
            <svg class="mx-auto w-14 h-14 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
            </svg>
            <p class="text-sm font-medium text-slate-500">등록된 여권이 없습니다</p>
            <p class="text-xs text-slate-400 mt-1">새로운 배터리 여권을 등록해 주세요</p>
          </div>
        </div>

      </div>
    </div>
  `
});
