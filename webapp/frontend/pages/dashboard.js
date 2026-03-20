app.component('dashboard-page', {
  props: ['auth', 'api'],
  emits: ['navigate'],
  setup(props, { emit }) {
    const { ref, computed, onMounted } = Vue;

    const passports = ref([]);
    const loading = ref(true);
    const fabricStatus = ref('disconnected');

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
        return dt.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
      } catch { return d; }
    }

    /* ---------- computed ---------- */
    const totalCount = computed(() => passports.value.length);

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

    const statusList = ['MANUFACTURED', 'ACTIVE', 'MAINTENANCE', 'ANALYSIS', 'RECYCLING', 'DISPOSED'];

    const statusColors = {
      MANUFACTURED: { bg: 'bg-blue-500', text: 'text-blue-700', light: 'bg-blue-100', badge: 'bg-blue-100 text-blue-800' },
      ACTIVE:       { bg: 'bg-green-500', text: 'text-green-700', light: 'bg-green-100', badge: 'bg-green-100 text-green-800' },
      MAINTENANCE:  { bg: 'bg-yellow-500', text: 'text-yellow-700', light: 'bg-yellow-100', badge: 'bg-yellow-100 text-yellow-800' },
      ANALYSIS:     { bg: 'bg-purple-500', text: 'text-purple-700', light: 'bg-purple-100', badge: 'bg-purple-100 text-purple-800' },
      RECYCLING:    { bg: 'bg-orange-500', text: 'text-orange-700', light: 'bg-orange-100', badge: 'bg-orange-100 text-orange-800' },
      DISPOSED:     { bg: 'bg-gray-500', text: 'text-gray-700', light: 'bg-gray-100', badge: 'bg-gray-100 text-gray-700' },
    };

    const statusLabels = {
      MANUFACTURED: '제조완료',
      ACTIVE: '운행중',
      MAINTENANCE: '정비',
      ANALYSIS: '분석',
      RECYCLING: '재활용',
      DISPOSED: '폐기',
    };

    const countByStatus = computed(() => {
      const map = {};
      statusList.forEach(s => map[s] = 0);
      passports.value.forEach(p => {
        const s = p.status || 'UNKNOWN';
        if (map[s] !== undefined) map[s]++;
      });
      return map;
    });

    const statusDistribution = computed(() => {
      const total = totalCount.value || 1;
      return statusList.map(s => ({
        status: s,
        label: statusLabels[s],
        count: countByStatus.value[s] || 0,
        pct: Math.round(((countByStatus.value[s] || 0) / total) * 100),
        colors: statusColors[s],
      }));
    });

    const vinBoundCount = computed(() => passports.value.filter(p => p.vin).length);
    const activeCount = computed(() => countByStatus.value['ACTIVE'] || 0);
    const manufacturedCount = computed(() => countByStatus.value['MANUFACTURED'] || 0);
    const maintenanceCount = computed(() => countByStatus.value['MAINTENANCE'] || 0);
    const analysisCount = computed(() => countByStatus.value['ANALYSIS'] || 0);
    const recyclingCount = computed(() => countByStatus.value['RECYCLING'] || 0);
    const disposedCount = computed(() => countByStatus.value['DISPOSED'] || 0);
    const recycleAvailableCount = computed(() =>
      passports.value.filter(p => p.recycleAvailable === true || p.recycleAvailable === 'true').length
    );
    const materialCount = computed(() => materials.value.length);

    /* ---------- KPI cards per org ---------- */
    const statsCards = computed(() => {
      const msp = props.auth.orgMsp;
      if (msp === 'ManufacturerMSP') {
        return [
          { icon: 'battery', label: '총 배터리', value: totalCount.value, sub: '등록된 전체 배터리', color: 'blue', page: 'passports' },
          { icon: 'chart', label: '평균 SOC', value: avgSoc.value + '%', sub: '충전 상태 평균', color: 'green', page: 'bmu-data' },
          { icon: 'shield', label: '제조완료', value: manufacturedCount.value, sub: '제조 완료 상태', color: 'indigo', page: 'passports' },
          { icon: 'cube', label: '원자재 수', value: materialCount.value, sub: '등록된 원자재 데이터', color: 'purple', page: 'materials' },
        ];
      }
      if (msp === 'EVManufacturerMSP') {
        return [
          { icon: 'battery', label: 'VIN 바인딩', value: vinBoundCount.value, sub: '차량 연결 배터리', color: 'blue', page: 'passports' },
          { icon: 'shield', label: '운행중', value: activeCount.value, sub: '운행중 배터리', color: 'green', page: 'passports' },
          { icon: 'wrench', label: '정비 필요', value: maintenanceCount.value, sub: 'MAINTENANCE 상태', color: 'yellow', page: 'maintenance' },
          { icon: 'chart', label: '평균 SOH', value: avgSoh.value + '%', sub: '건강 상태 평균', color: 'emerald', page: 'passports' },
        ];
      }
      if (msp === 'ServiceMSP') {
        return [
          { icon: 'wrench', label: '정비 대기', value: maintenanceCount.value, sub: 'MAINTENANCE 상태', color: 'yellow', page: 'maintenance' },
          { icon: 'chart', label: '분석 대기', value: analysisCount.value, sub: 'ANALYSIS 상태', color: 'purple', page: 'maintenance' },
          { icon: 'shield', label: '평균 SOH', value: avgSoh.value + '%', sub: '건강 상태 평균', color: 'green', page: 'passports' },
          { icon: 'recycle', label: '재활용 가능', value: recycleAvailableCount.value, sub: 'recycleAvailable', color: 'emerald', page: 'recycling' },
        ];
      }
      if (msp === 'RegulatorMSP') {
        return [
          { icon: 'battery', label: '전체 여권', value: totalCount.value, sub: '등록된 전체 배터리', color: 'blue', page: 'passports' },
          { icon: 'recycle', label: '재활용 가능', value: recycleAvailableCount.value, sub: 'recycleAvailable', color: 'green', page: 'recycling' },
          { icon: 'chart', label: '재활용', value: recyclingCount.value, sub: '재활용 진행중', color: 'orange', page: 'recycling' },
          { icon: 'shield', label: '폐기완료', value: disposedCount.value, sub: '폐기 완료', color: 'gray', page: 'recycling' },
        ];
      }
      return [];
    });

    /* ---------- quick actions per org ---------- */
    const quickActions = computed(() => {
      const msp = props.auth.orgMsp;
      if (msp === 'ManufacturerMSP') {
        return [
          { icon: 'plus', label: '여권 생성', desc: '새 배터리 여권을 생성합니다', page: 'passports' },
          { icon: 'chart', label: 'BMU 데이터', desc: 'BMU 수집 데이터를 조회합니다', page: 'bmu-data' },
          { icon: 'cube', label: '원자재 관리', desc: '원자재 정보를 관리합니다', page: 'materials' },
        ];
      }
      if (msp === 'EVManufacturerMSP') {
        return [
          { icon: 'search', label: '여권 조회', desc: '배터리 여권을 조회합니다', page: 'passports' },
          { icon: 'wrench', label: '정비 요청', desc: '배터리 정비를 요청합니다', page: 'maintenance' },
          { icon: 'chart', label: 'BMU 데이터', desc: 'BMU 수집 데이터를 조회합니다', page: 'bmu-data' },
        ];
      }
      if (msp === 'ServiceMSP') {
        return [
          { icon: 'wrench', label: '정비 수행', desc: '정비 대기 배터리를 처리합니다', page: 'maintenance' },
          { icon: 'recycle', label: '재활용 판정', desc: '재활용 여부를 판정합니다', page: 'recycling' },
          { icon: 'search', label: '여권 조회', desc: '배터리 여권을 조회합니다', page: 'passports' },
        ];
      }
      if (msp === 'RegulatorMSP') {
        return [
          { icon: 'shield', label: '여권 검증', desc: '배터리 여권을 검증합니다', page: 'passports' },
          { icon: 'recycle', label: '폐기 관리', desc: '폐기 배터리를 관리합니다', page: 'recycling' },
          { icon: 'wrench', label: '정비 이력', desc: '정비 이력을 조회합니다', page: 'maintenance' },
        ];
      }
      return [];
    });

    /* ---------- recent passports ---------- */
    const recentPassports = computed(() => {
      const sorted = [...passports.value].sort((a, b) => {
        const da = a.createdAt || a.timestamp || '';
        const db = b.createdAt || b.timestamp || '';
        return db.localeCompare(da);
      });
      return sorted.slice(0, 5);
    });

    /* ---------- org display name ---------- */
    const orgDisplayName = computed(() => {
      const map = {
        ManufacturerMSP: '배터리 제조사',
        EVManufacturerMSP: 'EV 제조사',
        ServiceMSP: '정비/서비스',
        RegulatorMSP: '규제기관',
      };
      return map[props.auth.orgMsp] || props.auth.orgMsp;
    });

    function nav(page) { emit('navigate', page); }

    /* ---------- donut chart data ---------- */
    const donutHexColors = {
      MANUFACTURED: '#3b82f6',
      ACTIVE: '#10b981',
      MAINTENANCE: '#f59e0b',
      ANALYSIS: '#8b5cf6',
      RECYCLING: '#f97316',
      DISPOSED: '#6b7280',
    };
    const donutCircumference = 2 * Math.PI * 70; // radius=70
    const donutSegments = computed(() => {
      const total = totalCount.value || 0;
      if (total === 0) return [];
      let accumulated = 0;
      return statusList.map(s => {
        const count = countByStatus.value[s] || 0;
        const pct = count / total * 100;
        const dashLen = (pct / 100) * donutCircumference;
        const offset = accumulated;
        accumulated += pct;
        return {
          status: s,
          label: statusLabels[s],
          count,
          pct,
          color: donutHexColors[s],
          dasharray: dashLen + ' ' + (donutCircumference - dashLen),
          dashoffset: -(offset / 100) * donutCircumference,
        };
      }).filter(seg => seg.count > 0);
    });

    /* ---------- gauge helpers ---------- */
    const gaugeCircumference = 2 * Math.PI * 70; // radius=70
    const gaugeReady = ref(false);
    onMounted(() => {
      setTimeout(() => { gaugeReady.value = true; }, 100);
    });

    /* ---------- lifecycle steps ---------- */
    const lifecycleSteps = [
      { label: '원자재 등록', key: 'materials' },
      { label: '여권 발급', key: 'manufactured' },
      { label: 'VIN 바인딩', key: 'vinBound' },
      { label: '정비', key: 'maintenance' },
      { label: 'SOH 분석', key: 'analysis' },
      { label: '재활용', key: 'recycling' },
      { label: '폐기', key: 'disposed' },
    ];
    const lifecycleProgress = computed(() => {
      // Determine which steps are completed based on passport data
      const has = {
        materials: materialCount.value > 0,
        manufactured: (countByStatus.value['MANUFACTURED'] || 0) > 0 || (countByStatus.value['ACTIVE'] || 0) > 0,
        vinBound: vinBoundCount.value > 0,
        maintenance: (countByStatus.value['MAINTENANCE'] || 0) > 0 || (countByStatus.value['ACTIVE'] || 0) > 0,
        analysis: (countByStatus.value['ANALYSIS'] || 0) > 0,
        recycling: (countByStatus.value['RECYCLING'] || 0) > 0,
        disposed: (countByStatus.value['DISPOSED'] || 0) > 0,
      };
      // Find last completed index
      let lastCompleted = -1;
      lifecycleSteps.forEach((step, i) => {
        if (has[step.key]) lastCompleted = i;
      });
      return lifecycleSteps.map((step, i) => ({
        ...step,
        index: i,
        completed: i <= lastCompleted && has[step.key],
        current: i === lastCompleted + 1,
        upcoming: i > lastCompleted + 1,
      }));
    });

    /* ---------- ESG metrics ---------- */
    const avgRecyclingRate = computed(() => {
      let totalRate = 0, count = 0;
      passports.value.forEach(p => {
        if (p.recyclingRates && typeof p.recyclingRates === 'object') {
          const vals = Object.values(p.recyclingRates).map(Number).filter(v => !isNaN(v));
          if (vals.length > 0) {
            totalRate += vals.reduce((a, b) => a + b, 0) / vals.length;
            count++;
          }
        }
      });
      return count > 0 ? Math.round(totalRate / count) : 0;
    });

    const avgCarbonFootprint = computed(() => {
      const items = passports.value.filter(p => p.carbonFootprint != null && Number(p.carbonFootprint) > 0);
      if (items.length === 0) return 0;
      return Math.round(items.reduce((s, p) => s + Number(p.carbonFootprint), 0) / items.length);
    });

    const ecoRate = computed(() => {
      const total = totalCount.value || 0;
      if (total === 0) return 0;
      return Math.round((recycleAvailableCount.value / total) * 100);
    });

    return {
      loading, fabricStatus, passports, totalCount,
      statsCards, statusDistribution, statusColors, statusLabels,
      quickActions, recentPassports,
      orgDisplayName, scaleSOC, truncate, formatDate,
      nav,
      avgSoc, avgSoh,
      donutSegments, donutCircumference, donutHexColors,
      gaugeCircumference, gaugeReady,
      lifecycleProgress,
      avgRecyclingRate, avgCarbonFootprint, ecoRate, recycleAvailableCount,
    };
  },
  template: `
    <div class="space-y-6">

      <!-- ===== 1. WELCOME HERO BANNER ===== -->
      <div class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-blue-800 p-6 sm:p-8">
        <div class="absolute inset-0 opacity-10">
          <svg class="h-full w-full" viewBox="0 0 800 400" fill="none">
            <circle cx="700" cy="50" r="180" fill="white"/>
            <circle cx="100" cy="350" r="120" fill="white"/>
            <circle cx="400" cy="200" r="80" fill="white"/>
          </svg>
        </div>
        <div class="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div class="flex items-center gap-3 mb-2">
              <h1 class="text-2xl sm:text-3xl font-bold text-white">
                환영합니다, {{ auth.userId }}님
              </h1>
              <span class="inline-flex items-center rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white border border-white/30">
                {{ orgDisplayName }}
              </span>
            </div>
            <p class="text-blue-100 text-sm sm:text-base">
              GBA 21 규격 배터리 여권 플랫폼 &mdash; xEV BMS 보안 기반 배터리 전주기 관리
            </p>
          </div>
          <div class="flex items-center gap-3 self-start flex-wrap">
            <!-- GBA 21 Compliance Badge -->
            <div class="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/25">
              <svg class="w-4 h-4 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span class="text-xs font-semibold text-white">GBA 21</span>
              <svg class="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <!-- Fabric Status -->
            <div class="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2.5 border border-white/20">
              <span :class="['inline-block w-2.5 h-2.5 rounded-full', fabricStatus === 'connected' ? 'bg-green-400 shadow-green-glow' : 'bg-red-400']"
                    :style="fabricStatus === 'connected' ? 'box-shadow: 0 0 6px rgba(74,222,128,0.6)' : ''"></span>
              <span class="text-sm font-medium text-white">
                Fabric {{ fabricStatus === 'connected' ? '연결됨' : '연결 끊김' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== LOADING STATE ===== -->
      <div v-if="loading" class="flex flex-col justify-center items-center py-24">
        <svg class="animate-spin h-10 w-10 text-blue-600 mb-4" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        <p class="text-sm text-gray-500">데이터를 불러오는 중...</p>
      </div>

      <div v-else>

        <!-- ===== 2. KPI STAT CARDS ===== -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div v-for="(card, i) in statsCards" :key="i"
               @click="card.page && nav(card.page)"
               class="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-primary-300 transition-all duration-200 cursor-pointer">
            <div class="flex items-start justify-between">
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-gray-500 truncate">{{ card.label }}</p>
                <p class="mt-2 text-3xl font-bold text-gray-900">{{ card.value }}</p>
                <p class="mt-1 text-xs text-gray-400">{{ card.sub }}</p>
              </div>
              <div :class="[
                'flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-xl',
                card.color === 'blue' ? 'bg-blue-100' : '',
                card.color === 'green' ? 'bg-green-100' : '',
                card.color === 'emerald' ? 'bg-emerald-100' : '',
                card.color === 'indigo' ? 'bg-indigo-100' : '',
                card.color === 'purple' ? 'bg-purple-100' : '',
                card.color === 'yellow' ? 'bg-yellow-100' : '',
                card.color === 'orange' ? 'bg-orange-100' : '',
                card.color === 'gray' ? 'bg-gray-100' : '',
              ]">
                <!-- Battery icon -->
                <svg v-if="card.icon === 'battery'" class="w-5 h-5" :class="[
                  card.color === 'blue' ? 'text-blue-600' : '',
                  card.color === 'green' ? 'text-green-600' : '',
                  card.color === 'emerald' ? 'text-emerald-600' : '',
                  card.color === 'indigo' ? 'text-indigo-600' : '',
                  card.color === 'purple' ? 'text-purple-600' : '',
                  card.color === 'yellow' ? 'text-yellow-600' : '',
                  card.color === 'orange' ? 'text-orange-600' : '',
                  card.color === 'gray' ? 'text-gray-600' : '',
                ]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="6" width="18" height="12" rx="2"/>
                  <path d="M22 10v4"/>
                  <rect x="5" y="9" width="8" height="6" rx="1" fill="currentColor" opacity="0.3"/>
                </svg>
                <!-- Chart / trending icon -->
                <svg v-else-if="card.icon === 'chart'" class="w-5 h-5" :class="[
                  card.color === 'blue' ? 'text-blue-600' : '',
                  card.color === 'green' ? 'text-green-600' : '',
                  card.color === 'emerald' ? 'text-emerald-600' : '',
                  card.color === 'indigo' ? 'text-indigo-600' : '',
                  card.color === 'purple' ? 'text-purple-600' : '',
                  card.color === 'yellow' ? 'text-yellow-600' : '',
                  card.color === 'orange' ? 'text-orange-600' : '',
                  card.color === 'gray' ? 'text-gray-600' : '',
                ]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
                <!-- Shield / check icon -->
                <svg v-else-if="card.icon === 'shield'" class="w-5 h-5" :class="[
                  card.color === 'blue' ? 'text-blue-600' : '',
                  card.color === 'green' ? 'text-green-600' : '',
                  card.color === 'emerald' ? 'text-emerald-600' : '',
                  card.color === 'indigo' ? 'text-indigo-600' : '',
                  card.color === 'purple' ? 'text-purple-600' : '',
                  card.color === 'yellow' ? 'text-yellow-600' : '',
                  card.color === 'orange' ? 'text-orange-600' : '',
                  card.color === 'gray' ? 'text-gray-600' : '',
                ]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <polyline points="9 12 11 14 15 10"/>
                </svg>
                <!-- Wrench icon -->
                <svg v-else-if="card.icon === 'wrench'" class="w-5 h-5" :class="[
                  card.color === 'blue' ? 'text-blue-600' : '',
                  card.color === 'green' ? 'text-green-600' : '',
                  card.color === 'emerald' ? 'text-emerald-600' : '',
                  card.color === 'indigo' ? 'text-indigo-600' : '',
                  card.color === 'purple' ? 'text-purple-600' : '',
                  card.color === 'yellow' ? 'text-yellow-600' : '',
                  card.color === 'orange' ? 'text-orange-600' : '',
                  card.color === 'gray' ? 'text-gray-600' : '',
                ]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                </svg>
                <!-- Recycle icon -->
                <svg v-else-if="card.icon === 'recycle'" class="w-5 h-5" :class="[
                  card.color === 'blue' ? 'text-blue-600' : '',
                  card.color === 'green' ? 'text-green-600' : '',
                  card.color === 'emerald' ? 'text-emerald-600' : '',
                  card.color === 'indigo' ? 'text-indigo-600' : '',
                  card.color === 'purple' ? 'text-purple-600' : '',
                  card.color === 'yellow' ? 'text-yellow-600' : '',
                  card.color === 'orange' ? 'text-orange-600' : '',
                  card.color === 'gray' ? 'text-gray-600' : '',
                ]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path d="M7.5 7.5l-2.7 4.7a2 2 0 0 0 1.7 3h3.5"/>
                  <path d="M16.5 7.5l2.7 4.7a2 2 0 0 1-1.7 3H14"/>
                  <path d="M12 2l3 5H9l3-5z"/>
                  <path d="M9 19.5l-1.5 2.5"/>
                  <path d="M15 19.5l1.5 2.5"/>
                  <path d="M12 14v8"/>
                </svg>
                <!-- Cube / box icon -->
                <svg v-else-if="card.icon === 'cube'" class="w-5 h-5" :class="[
                  card.color === 'blue' ? 'text-blue-600' : '',
                  card.color === 'green' ? 'text-green-600' : '',
                  card.color === 'emerald' ? 'text-emerald-600' : '',
                  card.color === 'indigo' ? 'text-indigo-600' : '',
                  card.color === 'purple' ? 'text-purple-600' : '',
                  card.color === 'yellow' ? 'text-yellow-600' : '',
                  card.color === 'orange' ? 'text-orange-600' : '',
                  card.color === 'gray' ? 'text-gray-600' : '',
                ]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== 2.5 CIRCULAR SOC / SOH GAUGES ===== -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
          <!-- SOC Gauge -->
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col items-center">
            <h3 class="text-sm font-semibold text-gray-500 mb-4">평균 충전 상태 (SOC)</h3>
            <svg viewBox="0 0 200 200" class="w-40 h-40">
              <circle cx="100" cy="100" r="70" fill="none" stroke="#e5e7eb" stroke-width="12"/>
              <circle cx="100" cy="100" r="70" fill="none"
                      stroke="#10b981" stroke-width="12"
                      stroke-linecap="round"
                      :stroke-dasharray="gaugeCircumference"
                      :stroke-dashoffset="gaugeReady ? gaugeCircumference * (1 - avgSoc / 100) : gaugeCircumference"
                      transform="rotate(-90 100 100)"
                      style="transition: stroke-dashoffset 1s ease;"/>
              <text x="100" y="95" text-anchor="middle" dominant-baseline="middle"
                    class="text-3xl font-bold" fill="#111827" font-size="36" font-weight="700">
                {{ avgSoc }}
              </text>
              <text x="100" y="125" text-anchor="middle" fill="#6b7280" font-size="14" font-weight="500">%</text>
            </svg>
            <p class="mt-3 text-xs text-gray-400">전체 배터리 평균 충전율</p>
          </div>
          <!-- SOH Gauge -->
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col items-center">
            <h3 class="text-sm font-semibold text-gray-500 mb-4">평균 건강 상태 (SOH)</h3>
            <svg viewBox="0 0 200 200" class="w-40 h-40">
              <circle cx="100" cy="100" r="70" fill="none" stroke="#e5e7eb" stroke-width="12"/>
              <circle cx="100" cy="100" r="70" fill="none"
                      stroke="#3b82f6" stroke-width="12"
                      stroke-linecap="round"
                      :stroke-dasharray="gaugeCircumference"
                      :stroke-dashoffset="gaugeReady ? gaugeCircumference * (1 - avgSoh / 100) : gaugeCircumference"
                      transform="rotate(-90 100 100)"
                      style="transition: stroke-dashoffset 1s ease;"/>
              <text x="100" y="95" text-anchor="middle" dominant-baseline="middle"
                    fill="#111827" font-size="36" font-weight="700">
                {{ avgSoh }}
              </text>
              <text x="100" y="125" text-anchor="middle" fill="#6b7280" font-size="14" font-weight="500">%</text>
            </svg>
            <p class="mt-3 text-xs text-gray-400">전체 배터리 평균 건강도</p>
          </div>
        </div>

        <!-- ===== 3. STATUS DISTRIBUTION + QUICK ACTIONS (2 col) ===== -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">

          <!-- Left: Battery Status Overview with Donut Chart -->
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div class="flex items-center gap-2 mb-5">
              <svg class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M16 8v8m-8-8v8m-4-4h16"/>
                <rect x="3" y="4" width="18" height="16" rx="2"/>
              </svg>
              <h2 class="text-lg font-semibold text-gray-900">배터리 상태 현황</h2>
            </div>

            <!-- SVG Donut Chart -->
            <div class="flex flex-col items-center mb-5">
              <svg viewBox="0 0 200 200" class="w-44 h-44 donut-chart">
                <!-- No data state -->
                <template v-if="donutSegments.length === 0">
                  <circle cx="100" cy="100" r="70" fill="none" stroke="#e5e7eb" stroke-width="14"/>
                  <text x="100" y="105" text-anchor="middle" dominant-baseline="middle"
                        fill="#9ca3af" font-size="16" font-weight="500">No Data</text>
                </template>
                <!-- Donut segments -->
                <template v-else>
                  <circle v-for="(seg, idx) in donutSegments" :key="seg.status"
                          cx="100" cy="100" r="70" fill="none"
                          :stroke="seg.color" stroke-width="14"
                          stroke-linecap="butt"
                          :stroke-dasharray="seg.dasharray"
                          :stroke-dashoffset="seg.dashoffset"
                          transform="rotate(-90 100 100)"
                          class="donut-segment"/>
                  <!-- Center total -->
                  <text x="100" y="92" text-anchor="middle" dominant-baseline="middle"
                        fill="#111827" font-size="32" font-weight="700">{{ totalCount }}</text>
                  <text x="100" y="116" text-anchor="middle" fill="#6b7280" font-size="12" font-weight="500">TOTAL</text>
                </template>
              </svg>
              <!-- Donut legend -->
              <div class="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-3">
                <div v-for="item in statusDistribution" :key="item.status"
                     class="flex items-center gap-1.5" v-show="item.count > 0">
                  <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ backgroundColor: donutHexColors[item.status] }"></span>
                  <span class="text-xs text-gray-600">{{ item.label }} ({{ item.count }})</span>
                </div>
              </div>
            </div>

            <!-- Status total bar -->
            <div class="mb-5 h-3 rounded-full bg-gray-100 overflow-hidden flex" v-if="totalCount > 0">
              <div v-for="item in statusDistribution" :key="item.status"
                   :class="[item.colors.bg]"
                   :style="{ width: item.pct + '%', minWidth: item.count > 0 ? '4px' : '0' }"
                   class="transition-all duration-300"></div>
            </div>
            <div v-else class="mb-5 h-3 rounded-full bg-gray-100"></div>

            <!-- Individual status bars -->
            <div class="space-y-3">
              <div v-for="item in statusDistribution" :key="item.status"
                   class="flex items-center gap-3">
                <div class="flex items-center gap-2 w-20 flex-shrink-0">
                  <span :class="['w-2.5 h-2.5 rounded-full flex-shrink-0', item.colors.bg]"></span>
                  <span class="text-xs font-medium text-gray-600 truncate">{{ item.label }}</span>
                </div>
                <div class="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div :class="[item.colors.bg, 'h-full rounded-full transition-all duration-500']"
                       :style="{ width: (totalCount > 0 ? (item.count / totalCount * 100) : 0) + '%', minWidth: item.count > 0 ? '4px' : '0' }"></div>
                </div>
                <div class="flex items-center gap-1.5 w-16 flex-shrink-0 justify-end">
                  <span class="text-sm font-semibold text-gray-800">{{ item.count }}</span>
                  <span class="text-xs text-gray-400">({{ item.pct }}%)</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Quick Actions -->
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div class="flex items-center gap-2 mb-5">
              <svg class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
              <h2 class="text-lg font-semibold text-gray-900">빠른 작업</h2>
            </div>
            <div class="space-y-3">
              <button v-for="(action, i) in quickActions" :key="i"
                      @click="nav(action.page)"
                      class="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 bg-gray-50/50
                             hover:bg-blue-50 hover:border-blue-200 hover:shadow-sm
                             transition-all duration-200 text-left group">
                <div class="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors duration-200">
                  <!-- Plus icon -->
                  <svg v-if="action.icon === 'plus'" class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  <!-- Search icon -->
                  <svg v-else-if="action.icon === 'search'" class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <!-- Chart icon -->
                  <svg v-else-if="action.icon === 'chart'" class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                  <!-- Wrench icon -->
                  <svg v-else-if="action.icon === 'wrench'" class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                  </svg>
                  <!-- Recycle icon -->
                  <svg v-else-if="action.icon === 'recycle'" class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path d="M7.5 7.5l-2.7 4.7a2 2 0 0 0 1.7 3h3.5"/>
                    <path d="M16.5 7.5l2.7 4.7a2 2 0 0 1-1.7 3H14"/>
                    <path d="M12 2l3 5H9l3-5z"/>
                    <path d="M12 14v8"/>
                  </svg>
                  <!-- Cube icon -->
                  <svg v-else-if="action.icon === 'cube'" class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                    <line x1="12" y1="22.08" x2="12" y2="12"/>
                  </svg>
                  <!-- Shield icon -->
                  <svg v-else-if="action.icon === 'shield'" class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <polyline points="9 12 11 14 15 10"/>
                  </svg>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold text-gray-800 group-hover:text-blue-700 transition-colors duration-200">{{ action.label }}</p>
                  <p class="text-xs text-gray-400 mt-0.5">{{ action.desc }}</p>
                </div>
                <svg class="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors duration-200 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- ===== 3.5 BATTERY LIFECYCLE TIMELINE ===== -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mt-6">
          <div class="flex items-center gap-2 mb-6">
            <svg class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <h2 class="text-lg font-semibold text-gray-900">배터리 전주기</h2>
          </div>

          <!-- Desktop: Horizontal timeline -->
          <div class="hidden sm:block">
            <div class="flex items-start justify-between relative">
              <div v-for="(step, i) in lifecycleProgress" :key="i"
                   class="flex flex-col items-center relative" style="flex: 1;">
                <!-- Connector line -->
                <div v-if="i < lifecycleProgress.length - 1"
                     class="absolute top-5 h-0.5 transition-all duration-500"
                     :class="step.completed && lifecycleProgress[i+1] && (lifecycleProgress[i+1].completed || lifecycleProgress[i+1].current) ? 'bg-blue-400' : 'bg-gray-200'"
                     :style="{ left: '50%', right: '-50%' }"></div>
                <!-- Step circle -->
                <div class="relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-500"
                     :class="[
                       step.completed ? 'bg-blue-500 border-blue-500 text-white' : '',
                       step.current ? 'bg-white border-blue-500 lifecycle-pulse' : '',
                       !step.completed && !step.current ? 'bg-white border-gray-300 text-gray-400' : '',
                     ]">
                  <svg v-if="step.completed" class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span v-else class="text-xs font-bold" :class="step.current ? 'text-blue-500' : 'text-gray-400'">{{ i + 1 }}</span>
                </div>
                <!-- Step label -->
                <p class="mt-2 text-xs font-medium text-center leading-tight"
                   :class="step.completed ? 'text-blue-600' : step.current ? 'text-blue-500' : 'text-gray-400'">
                  {{ step.label }}
                </p>
              </div>
            </div>
          </div>

          <!-- Mobile: Vertical timeline -->
          <div class="sm:hidden space-y-0">
            <div v-for="(step, i) in lifecycleProgress" :key="i" class="flex items-start gap-3">
              <div class="flex flex-col items-center">
                <div class="flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-500"
                     :class="[
                       step.completed ? 'bg-blue-500 border-blue-500 text-white' : '',
                       step.current ? 'bg-white border-blue-500 lifecycle-pulse' : '',
                       !step.completed && !step.current ? 'bg-white border-gray-300 text-gray-400' : '',
                     ]">
                  <svg v-if="step.completed" class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span v-else class="text-xs font-bold" :class="step.current ? 'text-blue-500' : 'text-gray-400'">{{ i + 1 }}</span>
                </div>
                <div v-if="i < lifecycleProgress.length - 1"
                     class="w-0.5 h-6 transition-all duration-500"
                     :class="step.completed ? 'bg-blue-400' : 'bg-gray-200'"></div>
              </div>
              <p class="text-sm font-medium pt-1.5"
                 :class="step.completed ? 'text-blue-600' : step.current ? 'text-blue-500' : 'text-gray-400'">
                {{ step.label }}
              </p>
            </div>
          </div>
        </div>

        <!-- ===== 3.6 ESG / CARBON METRICS CARDS ===== -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <!-- Recycling Rate -->
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div class="flex items-center gap-3 mb-4">
              <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100">
                <svg class="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path d="M7.5 7.5l-2.7 4.7a2 2 0 0 0 1.7 3h3.5"/>
                  <path d="M16.5 7.5l2.7 4.7a2 2 0 0 1-1.7 3H14"/>
                  <path d="M12 2l3 5H9l3-5z"/>
                  <path d="M12 14v8"/>
                </svg>
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-800">재활용률</p>
                <p class="text-xs text-gray-400">Average recycling rate</p>
              </div>
            </div>
            <div v-if="avgRecyclingRate > 0" class="flex items-center gap-4">
              <svg viewBox="0 0 60 60" class="w-14 h-14 flex-shrink-0">
                <circle cx="30" cy="30" r="24" fill="none" stroke="#e5e7eb" stroke-width="6"/>
                <circle cx="30" cy="30" r="24" fill="none" stroke="#10b981" stroke-width="6"
                        stroke-linecap="round"
                        :stroke-dasharray="2 * Math.PI * 24"
                        :stroke-dashoffset="2 * Math.PI * 24 * (1 - avgRecyclingRate / 100)"
                        transform="rotate(-90 30 30)"
                        style="transition: stroke-dashoffset 1s ease;"/>
                <text x="30" y="33" text-anchor="middle" dominant-baseline="middle"
                      fill="#111827" font-size="12" font-weight="700">{{ avgRecyclingRate }}</text>
              </svg>
              <span class="text-2xl font-bold text-gray-900">{{ avgRecyclingRate }}%</span>
            </div>
            <div v-else class="esg-pulse-text">
              <p class="text-sm text-gray-400">서비스 준비 중</p>
            </div>
          </div>

          <!-- Carbon Footprint -->
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div class="flex items-center gap-3 mb-4">
              <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100">
                <svg class="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.68c.08-.21.2-.4.36-.57l3.19-3.42C11.56 13.85 15 11 17 8z"/>
                  <path d="M12.5 3.5C12.5 3.5 15 6 15 9c0 3-2.5 5-2.5 5"/>
                </svg>
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-800">탄소발자국</p>
                <p class="text-xs text-gray-400">Carbon footprint</p>
              </div>
            </div>
            <div v-if="avgCarbonFootprint > 0" class="flex items-center gap-2">
              <span class="text-2xl font-bold text-gray-900">{{ avgCarbonFootprint }}</span>
              <span class="text-sm text-gray-500">kg CO2e</span>
            </div>
            <div v-else class="esg-pulse-text">
              <p class="text-sm text-gray-400">서비스 준비 중</p>
            </div>
          </div>

          <!-- Eco Index -->
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div class="flex items-center gap-3 mb-4">
              <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100">
                <svg class="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                  <path d="M8 12l3 3 5-5"/>
                </svg>
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-800">친환경 지표</p>
                <p class="text-xs text-gray-400">Eco-friendly index</p>
              </div>
            </div>
            <div v-if="totalCount > 0">
              <div class="flex items-center justify-between mb-2">
                <span class="text-2xl font-bold text-gray-900">{{ ecoRate }}%</span>
                <span class="text-xs text-gray-400">{{ recycleAvailableCount }} / {{ totalCount }}</span>
              </div>
              <div class="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden">
                <div class="h-full rounded-full bg-green-500 transition-all duration-700"
                     :style="{ width: ecoRate + '%' }"></div>
              </div>
            </div>
            <div v-else class="esg-pulse-text">
              <p class="text-sm text-gray-400">서비스 준비 중</p>
            </div>
          </div>
        </div>

        <!-- ===== 4. RECENT PASSPORTS TABLE ===== -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm mt-6">
          <div class="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                <rect x="9" y="3" width="6" height="4" rx="1"/>
              </svg>
              <h2 class="text-lg font-semibold text-gray-900">최근 등록 여권</h2>
            </div>
            <button @click="nav('passports')"
                    class="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200 flex items-center gap-1">
              전체 보기
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>

          <!-- Table content -->
          <div v-if="recentPassports.length > 0" class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="bg-gray-50/80">
                  <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Passport ID</th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">모델</th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">시리얼</th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">상태</th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">SOC</th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">등록일</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="(p, idx) in recentPassports" :key="idx"
                    @click="$emit('navigate', 'passport-detail', { passportId: p.passportId || p.id })"
                    class="hover:bg-primary-50/50 transition-colors duration-150 cursor-pointer">
                  <td class="px-6 py-4">
                    <span class="text-sm font-mono text-blue-600 font-medium">{{ truncate(p.passportId || p.id, 16) }}</span>
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-700">{{ p.model || '-' }}</td>
                  <td class="px-6 py-4 text-sm text-gray-500 font-mono">{{ truncate(p.serialNumber, 14) }}</td>
                  <td class="px-6 py-4">
                    <span :class="[
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                      (p.status === 'MANUFACTURED') ? 'bg-blue-100 text-blue-800' : '',
                      (p.status === 'ACTIVE') ? 'bg-green-100 text-green-800' : '',
                      (p.status === 'MAINTENANCE') ? 'bg-yellow-100 text-yellow-800' : '',
                      (p.status === 'ANALYSIS') ? 'bg-purple-100 text-purple-800' : '',
                      (p.status === 'RECYCLING') ? 'bg-orange-100 text-orange-800' : '',
                      (p.status === 'DISPOSED') ? 'bg-gray-100 text-gray-700' : '',
                    ]">{{ p.status || 'UNKNOWN' }}</span>
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-2">
                      <div class="w-16 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                        <div class="h-full rounded-full transition-all duration-300"
                             :class="scaleSOC(p.currentSoc) >= 50 ? 'bg-green-500' : scaleSOC(p.currentSoc) >= 20 ? 'bg-yellow-500' : 'bg-red-500'"
                             :style="{ width: Math.min(scaleSOC(p.currentSoc), 100) + '%' }"></div>
                      </div>
                      <span class="text-xs text-gray-600 font-medium w-10">{{ scaleSOC(p.currentSoc) }}%</span>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-500">{{ formatDate(p.createdAt || p.timestamp) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Empty state -->
          <div v-else class="py-16 flex flex-col items-center justify-center">
            <svg class="w-16 h-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <line x1="9" y1="12" x2="15" y2="12"/>
              <line x1="9" y1="16" x2="13" y2="16"/>
            </svg>
            <p class="text-sm font-medium text-gray-500">등록된 여권이 없습니다</p>
            <p class="text-xs text-gray-400 mt-1">새로운 배터리 여권을 등록해 주세요</p>
          </div>
        </div>

      </div>

      <!-- Inline styles for animations -->
      <component is="style">
        .donut-segment {
          transition: stroke-dashoffset 1s ease, stroke-dasharray 1s ease;
        }
        .donut-chart:hover .donut-segment {
          filter: brightness(1.1);
        }
        @keyframes lifecycle-pulse-anim {
          0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0); }
        }
        .lifecycle-pulse {
          animation: lifecycle-pulse-anim 2s ease-in-out infinite;
        }
        @keyframes esg-pulse-anim {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .esg-pulse-text {
          animation: esg-pulse-anim 2s ease-in-out infinite;
        }
      </component>
    </div>
  `
});
