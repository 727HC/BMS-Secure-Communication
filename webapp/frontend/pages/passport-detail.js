app.component('passport-detail-page', {
  props: ['auth', 'api'],
  emits: ['navigate'],
  setup(props, { emit }) {
    const { ref, computed, onMounted, watch, nextTick } = Vue;

    const passport = ref(null);
    const loading = ref(true);
    const activeTab = ref('identity');
    const passportId = ref('');

    // BMU data
    const bmuRecords = ref([]);
    const bmuLoading = ref(false);

    // History
    const history = ref([]);
    const historyLoading = ref(false);

    // Modal toggles
    const showBindModal = ref(false);
    const showMaintenanceLogModal = ref(false);
    const showAccidentLogModal = ref(false);
    const showMaintenanceRequestModal = ref(false);
    const showAnalysisRequestModal = ref(false);
    const showAnalysisResultModal = ref(false);
    const showRecycleModal = ref(false);
    const showExtractModal = ref(false);
    const showDisposeConfirm = ref(false);
    const submitting = ref(false);

    // Forms
    const bindForm = ref({ vin: '', installDate: '', evManufacturer: '', evAssemblyCountry: '' });
    const maintenanceForm = ref({ date: '', type: '', description: '', technician: '' });
    const accidentForm = ref({ date: '', type: '', description: '', reporter: '' });
    const analysisForm = ref({ soh: '', soce: '', remainingLifeCycle: '', recycleAvailable: false });
    const extractForm = ref({ recyclingRatesJson: '{\n  "cobalt": 95,\n  "nickel": 90,\n  "lithium": 80,\n  "manganese": 85\n}' });

    /* ---------- helpers ---------- */
    function scaleSOC(val) {
      if (val == null) return null;
      return val > 100 ? +(val / 655.35).toFixed(1) : +val.toFixed(1);
    }
    function scaleTemp(val) {
      if (val == null) return null;
      return val > 100 ? +(val / 1310.7).toFixed(1) : val;
    }
    function formatDate(ts) {
      if (!ts) return '-';
      try { return new Date(ts).toLocaleString('ko-KR'); } catch { return ts; }
    }

    /* ---------- status config ---------- */
    const statusLabels = {
      MANUFACTURED: '제조완료', ACTIVE: '운행중', MAINTENANCE: '정비중',
      ANALYSIS: '분석중', RECYCLING: '재활용', DISPOSED: '폐기',
    };
    const statusConfig = {
      MANUFACTURED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', label: '제조완료' },
      ACTIVE:       { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', label: '운행중' },
      MAINTENANCE:  { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', label: '정비중' },
      ANALYSIS:     { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500', label: '분석중' },
      RECYCLING:    { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500', label: '재활용' },
      DISPOSED:     { bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-300', dot: 'bg-slate-400', label: '폐기' },
    };
    function getStatusBadge(status) {
      return statusConfig[status] || statusConfig.DISPOSED;
    }
    function getSocColor(soc) {
      if (soc == null) return 'bg-slate-300';
      if (soc >= 60) return 'bg-emerald-500';
      if (soc >= 30) return 'bg-amber-500';
      return 'bg-red-500';
    }
    function getSocHex(soc) {
      if (soc == null) return '#94a3b8';
      if (soc >= 60) return '#059669';
      if (soc >= 30) return '#f59e0b';
      return '#ef4444';
    }
    function getSohColor(soh) {
      if (soh == null) return '#94a3b8';
      if (soh >= 80) return '#059669';
      if (soh >= 50) return '#f59e0b';
      return '#ef4444';
    }
    function decodeStatusFlags(flags) {
      const num = typeof flags === 'number' ? flags : parseInt(flags, 10);
      if (isNaN(num)) return [];
      const badges = [];
      if (num & 0x01) badges.push({ label: '충전중', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' });
      if (num & 0x02) badges.push({ label: '밸런싱', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' });
      if (num & 0x04) badges.push({ label: '결함', color: 'bg-red-100 text-red-700 border-red-200' });
      return badges;
    }

    /* ---------- MSP roles ---------- */
    const msp = computed(() => props.auth.orgMsp);
    const isEV = computed(() => msp.value === 'EVManufacturerMSP');
    const isService = computed(() => msp.value === 'ServiceMSP');
    const isRegulator = computed(() => msp.value === 'RegulatorMSP');
    const isManufacturer = computed(() => msp.value === 'ManufacturerMSP');

    /* ---------- tabs ---------- */
    const tabs = [
      { key: 'identity', label: '식별정보', icon: 'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0' },
      { key: 'compliance', label: '규제 준수', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
      { key: 'traceability', label: '추적성', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
      { key: 'data', label: '배터리 데이터', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
      { key: 'trust', label: '신뢰성', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
    ];

    /* ---------- GBA 21 fields ---------- */
    const gba21Fields = [
      { idx: 1, key: 'passportId', label: '여권 ID', group: '기본정보' },
      { idx: 2, key: 'batteryId', label: '배터리 ID', group: '기본정보' },
      { idx: 3, key: 'serialNumber', label: '시리얼번호', group: '기본정보' },
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
      { idx: 18, key: 'voltageRange', label: '전압범위', group: 'EV정보' },
      { idx: 19, key: 'temperatureRange', label: '온도범위', group: 'EV정보' },
      { idx: 20, key: 'carbonFootprint', label: '탄소발자국', group: '지속가능성' },
      { idx: 21, key: 'rawMaterials', label: '원자재', group: '지속가능성' },
    ];

    function fieldFilled(p, key) {
      if (!p) return false;
      const v = p[key];
      if (v == null || v === '' || v === 0) return false;
      if (typeof v === 'object' && Object.keys(v).length === 0) return false;
      if (Array.isArray(v) && v.length === 0) return false;
      return true;
    }

    const gbaCompliance = computed(() => {
      const p = passport.value;
      if (!p) return { filled: 0, total: 21, pct: 0, allFilled: false, groups: [] };
      let filled = 0;
      const fields = gba21Fields.map(f => {
        const isFilled = fieldFilled(p, f.key);
        if (isFilled) filled++;
        return { ...f, filled: isFilled };
      });
      const groups = ['기본정보', '제조정보', '기술사양', 'EV정보', '지속가능성'].map(g => ({
        name: g,
        fields: fields.filter(f => f.group === g),
      }));
      return { filled, total: 21, pct: Math.round((filled / 21) * 100), allFilled: filled === 21, groups };
    });

    /* ---------- compliance grade ---------- */
    const complianceGrade = computed(() => {
      const pct = gbaCompliance.value.pct;
      if (pct >= 90) return 'A';
      if (pct >= 75) return 'B';
      if (pct >= 50) return 'C';
      return 'D';
    });

    /* ---------- lifecycle steps ---------- */
    const lifecycleSteps = [
      { key: 'RAW', label: '원자재', status: null },
      { key: 'MANUFACTURED', label: '제조', status: 'MANUFACTURED' },
      { key: 'ACTIVE', label: '운행', status: 'ACTIVE' },
      { key: 'MAINTENANCE', label: '정비', status: 'MAINTENANCE' },
      { key: 'ANALYSIS', label: '분석', status: 'ANALYSIS' },
      { key: 'RECYCLING', label: '재활용', status: 'RECYCLING' },
      { key: 'DISPOSED', label: '폐기', status: 'DISPOSED' },
    ];
    const statusOrder = { 'RAW': 0, 'MANUFACTURED': 1, 'ACTIVE': 2, 'MAINTENANCE': 3, 'ANALYSIS': 4, 'RECYCLING': 5, 'DISPOSED': 6 };

    function getLifecycleState(stepKey, currentStatus) {
      const stepIdx = statusOrder[stepKey] || 0;
      const curIdx = statusOrder[currentStatus] || 0;
      if (stepKey === 'RAW') return curIdx >= 1 ? 'completed' : 'future';
      if (stepIdx < curIdx) return 'completed';
      if (stepIdx === curIdx) return 'current';
      return 'future';
    }

    /* ---------- computed data ---------- */
    const maintenanceLogs = computed(() => passport.value?.maintenanceLogs || []);
    const accidentLogs = computed(() => passport.value?.accidentLogs || []);

    /* ---------- SOC fill animation ---------- */
    const batteryFillAnimated = ref(0);
    watch(() => passport.value, (p) => {
      if (p) {
        batteryFillAnimated.value = 0;
        nextTick(() => {
          setTimeout(() => {
            batteryFillAnimated.value = Math.min(scaleSOC(p.currentSoc) || 0, 100);
          }, 100);
        });
      }
    }, { immediate: true });

    /* ---------- gauge helpers ---------- */
    const gaugeCircumference = 2 * Math.PI * 40;
    const complianceGaugeCircumference = 2 * Math.PI * 80;
    const gaugeReady = ref(false);

    /* ---------- copy to clipboard ---------- */
    function copyToClipboard(text) {
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        window.$toast('success', '클립보드에 복사되었습니다.');
      }).catch(() => {
        window.$toast('error', '복사에 실패했습니다.');
      });
    }

    /* ---------- data fetching ---------- */
    onMounted(() => {
      if (!document.getElementById('passport-detail-v2-animations')) {
        const style = document.createElement('style');
        style.id = 'passport-detail-v2-animations';
        style.textContent = `
          @keyframes pd-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(5,150,105,0.4)} 50%{box-shadow:0 0 0 8px rgba(5,150,105,0)} }
          .pd-pulse { animation: pd-pulse 2s ease-in-out infinite; }
        `;
        document.head.appendChild(style);
      }

      const urlParams = new URLSearchParams(window.location.search);
      passportId.value = urlParams.get('passportId') || '';
      if (!passportId.value) {
        const el = document.querySelector('[data-passport-id]');
        if (el) passportId.value = el.dataset.passportId;
      }
      if (!passportId.value && window.__pageProps && window.__pageProps.passportId) {
        passportId.value = window.__pageProps.passportId;
      }
      fetchPassport();
      setTimeout(() => { gaugeReady.value = true; }, 200);
    });

    async function fetchPassport() {
      if (!passportId.value) { loading.value = false; return; }
      loading.value = true;
      try {
        passport.value = await props.api.get('/passports/' + passportId.value);
      } catch (e) {
        window.$toast('error', '여권 정보를 불러오지 못했습니다: ' + e.message);
      } finally {
        loading.value = false;
      }
    }

    async function fetchBmuData() {
      if (bmuRecords.value.length > 0) return;
      bmuLoading.value = true;
      try {
        const data = await props.api.get('/bmu/records/' + passportId.value);
        bmuRecords.value = (data.records || data || []).slice(0, 20);
      } catch (e) {
        bmuRecords.value = [];
      } finally {
        bmuLoading.value = false;
      }
    }

    async function fetchHistory() {
      if (history.value.length > 0) return;
      historyLoading.value = true;
      try {
        const data = await props.api.get('/passports/' + passportId.value + '/history');
        const raw = data.records || data || [];
        const all = raw.map((entry, i) => {
          let parsed = entry;
          if (typeof entry === 'string') {
            try { parsed = JSON.parse(entry); } catch (e) { parsed = {}; }
          }
          return { value: parsed, index: i + 1 };
        });
        const filtered = [];
        let prevStatus = null, prevVin = null, prevMaintCount = 0;
        all.forEach((entry, i) => {
          const v = entry.value;
          const status = v.status || '';
          const vin = v.vin || '';
          const maintCount = (v.maintenanceLogs || []).length;
          const isFirst = i === 0;
          const isLast = i === all.length - 1;
          const statusChanged = status !== prevStatus;
          const vinChanged = vin && vin !== prevVin;
          const maintChanged = maintCount > prevMaintCount;
          if (isFirst || isLast || statusChanged || vinChanged || maintChanged) {
            let changeDesc = '';
            if (isFirst) changeDesc = '여권 생성';
            else if (statusChanged && prevStatus) {
              changeDesc = (statusLabels[prevStatus] || prevStatus) + ' -> ' + (statusLabels[status] || status);
            }
            else if (vinChanged) changeDesc = 'VIN 바인딩: ' + vin;
            else if (maintChanged) changeDesc = '정비 기록 추가 (#' + maintCount + ')';
            else if (isLast) changeDesc = '최신 상태';
            filtered.push({
              value: v, timestamp: v.updatedAt || v.createdAt || '-',
              changeDesc, index: entry.index, blockNumber: entry.index,
            });
          }
          prevStatus = status; prevVin = vin; prevMaintCount = maintCount;
        });
        history.value = filtered;
      } catch (e) {
        history.value = [];
      } finally {
        historyLoading.value = false;
      }
    }

    function switchTab(tab) {
      activeTab.value = tab;
      if (tab === 'data') fetchBmuData();
      if (tab === 'trust') fetchHistory();
    }

    /* ---------- actions ---------- */
    async function submitBind() {
      submitting.value = true;
      try {
        await props.api.put('/passports/' + passportId.value + '/bind', bindForm.value);
        window.$toast('success', 'VIN 바인딩이 완료되었습니다.');
        showBindModal.value = false;
        await fetchPassport();
      } catch (e) { window.$toast('error', 'VIN 바인딩 실패: ' + e.message); }
      finally { submitting.value = false; }
    }

    async function submitMaintenanceRequest() {
      submitting.value = true;
      try {
        await props.api.put('/passports/' + passportId.value + '/request-maintenance', {});
        window.$toast('success', '정비 요청이 접수되었습니다.');
        showMaintenanceRequestModal.value = false;
        await fetchPassport();
      } catch (e) { window.$toast('error', '정비 요청 실패: ' + e.message); }
      finally { submitting.value = false; }
    }

    async function submitMaintenanceLog() {
      submitting.value = true;
      try {
        await props.api.put('/passports/' + passportId.value + '/maintenance-log', maintenanceForm.value);
        window.$toast('success', '정비 기록이 추가되었습니다.');
        showMaintenanceLogModal.value = false;
        maintenanceForm.value = { date: '', type: '', description: '', technician: '' };
        await fetchPassport();
      } catch (e) { window.$toast('error', '정비 기록 추가 실패: ' + e.message); }
      finally { submitting.value = false; }
    }

    async function submitAccidentLog() {
      submitting.value = true;
      try {
        await props.api.put('/passports/' + passportId.value + '/accident-log', accidentForm.value);
        window.$toast('success', '사고 기록이 추가되었습니다.');
        showAccidentLogModal.value = false;
        accidentForm.value = { date: '', type: '', description: '', reporter: '' };
        await fetchPassport();
      } catch (e) { window.$toast('error', '사고 기록 추가 실패: ' + e.message); }
      finally { submitting.value = false; }
    }

    async function submitAnalysisRequest() {
      submitting.value = true;
      try {
        await props.api.put('/passports/' + passportId.value + '/request-analysis', {});
        window.$toast('success', '분석 요청이 접수되었습니다.');
        showAnalysisRequestModal.value = false;
        await fetchPassport();
      } catch (e) { window.$toast('error', '분석 요청 실패: ' + e.message); }
      finally { submitting.value = false; }
    }

    async function submitAnalysisResult() {
      submitting.value = true;
      try {
        const body = {
          soh: Number(analysisForm.value.soh), soce: Number(analysisForm.value.soce),
          remainingLifeCycle: Number(analysisForm.value.remainingLifeCycle),
          recycleAvailable: analysisForm.value.recycleAvailable,
        };
        await props.api.put('/passports/' + passportId.value + '/analysis-result', body);
        window.$toast('success', '분석 결과가 제출되었습니다.');
        showAnalysisResultModal.value = false;
        analysisForm.value = { soh: '', soce: '', remainingLifeCycle: '', recycleAvailable: false };
        await fetchPassport();
      } catch (e) { window.$toast('error', '분석 결과 제출 실패: ' + e.message); }
      finally { submitting.value = false; }
    }

    async function submitRecycleAvailability(available) {
      submitting.value = true;
      try {
        await props.api.put('/passports/' + passportId.value + '/recycle-availability', { recycleAvailable: available });
        window.$toast('success', '재활용 판정이 완료되었습니다.');
        showRecycleModal.value = false;
        await fetchPassport();
      } catch (e) { window.$toast('error', '재활용 판정 실패: ' + e.message); }
      finally { submitting.value = false; }
    }

    async function submitExtractMaterials() {
      submitting.value = true;
      try {
        const rates = JSON.parse(extractForm.value.recyclingRatesJson);
        await props.api.put('/passports/' + passportId.value + '/extract-materials', { recyclingRates: rates });
        window.$toast('success', '원자재 추출 정보가 등록되었습니다.');
        showExtractModal.value = false;
        await fetchPassport();
      } catch (e) {
        window.$toast('error', (e instanceof SyntaxError ? 'JSON 형식이 올바르지 않습니다.' : '원자재 추출 실패: ' + e.message));
      } finally { submitting.value = false; }
    }

    async function disposeBattery() {
      submitting.value = true;
      try {
        await props.api.put('/passports/' + passportId.value + '/dispose', {});
        window.$toast('success', '배터리가 폐기 처리되었습니다.');
        showDisposeConfirm.value = false;
        await fetchPassport();
      } catch (e) { window.$toast('error', '폐기 처리 실패: ' + e.message); }
      finally { submitting.value = false; }
    }

    function goBack() { emit('navigate', 'passports'); }
    function setPassportId(id) { passportId.value = id; fetchPassport(); }

    return {
      passport, loading, activeTab, passportId, tabs,
      bmuRecords, bmuLoading, history, historyLoading,
      showBindModal, showMaintenanceLogModal, showAccidentLogModal,
      showMaintenanceRequestModal, showAnalysisRequestModal,
      showAnalysisResultModal, showRecycleModal, showExtractModal,
      showDisposeConfirm, submitting,
      bindForm, maintenanceForm, accidentForm, analysisForm, extractForm,
      msp, isEV, isService, isRegulator, isManufacturer,
      maintenanceLogs, accidentLogs,
      batteryFillAnimated, lifecycleSteps, statusOrder,
      gba21Fields, gbaCompliance, complianceGrade,
      gaugeCircumference, complianceGaugeCircumference, gaugeReady,
      getStatusBadge, getSocColor, getSocHex, getSohColor, scaleSOC, scaleTemp,
      decodeStatusFlags, getLifecycleState, fieldFilled, formatDate, copyToClipboard,
      switchTab, goBack, setPassportId,
      submitBind, submitMaintenanceRequest, submitMaintenanceLog, submitAccidentLog,
      submitAnalysisRequest, submitAnalysisResult, submitRecycleAvailability,
      submitExtractMaterials, disposeBattery,
      statusLabels,
    };
  },
  template: `
    <div class="min-h-full">

      <!-- ===== HEADER ===== -->
      <div class="mb-6">
        <button @click="goBack"
          class="group inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-emerald-600 transition-colors mb-4">
          <svg class="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
          배터리 여권 목록
        </button>

        <div v-if="passport" class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-3 flex-wrap mb-1.5">
              <h1 class="text-2xl font-bold text-slate-900">{{ passport.model || '배터리 여권 상세' }}</h1>
              <span :class="[
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border',
                getStatusBadge(passport.status).bg,
                getStatusBadge(passport.status).text,
                getStatusBadge(passport.status).border
              ]">
                <span :class="['w-2 h-2 rounded-full', getStatusBadge(passport.status).dot]"></span>
                {{ getStatusBadge(passport.status).label }}
              </span>
            </div>
            <div class="flex items-center gap-4 flex-wrap">
              <span class="text-sm text-slate-400 font-mono">{{ passport.passportId }}</span>
              <span v-if="passport.serialNumber" class="text-sm text-slate-400">S/N: {{ passport.serialNumber }}</span>
            </div>
          </div>

          <!-- Battery SVG icon with SOC fill -->
          <div class="flex-shrink-0 hidden sm:block">
            <svg width="100" height="50" viewBox="0 0 100 50" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="6" width="82" height="38" rx="5" fill="none" stroke="#94a3b8" stroke-width="2.5"/>
              <rect x="84" y="16" width="12" height="18" rx="3" fill="none" stroke="#94a3b8" stroke-width="2.5"/>
              <rect x="5" y="9" :width="Math.max((batteryFillAnimated / 100) * 76, 0)" height="32" rx="3"
                :fill="getSocHex(scaleSOC(passport.currentSoc))"
                style="transition: width 1.2s cubic-bezier(0.4,0,0.2,1), fill 0.6s ease;"/>
              <text x="44" y="29" text-anchor="middle" font-size="13" font-weight="bold"
                :fill="batteryFillAnimated > 45 ? '#ffffff' : '#334155'" font-family="system-ui, sans-serif">
                {{ passport.currentSoc != null ? scaleSOC(passport.currentSoc) + '%' : '--' }}
              </text>
            </svg>
          </div>
        </div>
      </div>

      <!-- ===== LOADING ===== -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-24">
        <div class="relative">
          <div class="w-12 h-12 border-4 border-emerald-100 rounded-full"></div>
          <div class="absolute top-0 left-0 w-12 h-12 border-4 border-emerald-600 rounded-full animate-spin border-t-transparent"></div>
        </div>
        <p class="mt-4 text-sm text-slate-500">데이터를 불러오는 중...</p>
      </div>

      <!-- ===== NO PASSPORT ===== -->
      <div v-else-if="!passport" class="bg-white rounded-xl shadow-sm border border-slate-200 py-20 px-8 text-center">
        <div class="mx-auto w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-slate-700 mb-1">여권 정보를 찾을 수 없습니다</h3>
        <p class="text-sm text-slate-400 mb-6">요청한 여권 ID에 해당하는 데이터가 없습니다.</p>
        <button @click="goBack" class="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl transition-colors">
          목록으로 돌아가기
        </button>
      </div>

      <!-- ===== MAIN CONTENT ===== -->
      <div v-else>

        <!-- Tab Navigation -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 mb-6 overflow-hidden">
          <div class="flex overflow-x-auto">
            <button v-for="tab in tabs" :key="tab.key"
              @click="switchTab(tab.key)"
              :class="[
                'relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all whitespace-nowrap border-b-2 min-w-0',
                activeTab === tab.key
                  ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              ]">
              <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" :d="tab.icon"/>
              </svg>
              {{ tab.label }}
            </button>
          </div>
        </div>

        <!-- ==================== TAB 1: IDENTITY ==================== -->
        <div v-if="activeTab === 'identity'" class="space-y-6">

          <!-- Identity Spec Grid — OpenBattery style: large label + big value, 3-column -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
              <div class="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0"/>
                </svg>
              </div>
              <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider">배터리 식별정보</h3>
            </div>
            <div class="p-6">
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-6">
                <div>
                  <p class="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">여권 ID</p>
                  <p class="text-lg font-bold text-slate-900 font-mono break-all">{{ passport.passportId || '-' }}</p>
                </div>
                <div>
                  <p class="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">배터리 ID</p>
                  <p class="text-lg font-bold text-slate-900 font-mono break-all">{{ passport.batteryId || '-' }}</p>
                </div>
                <div>
                  <p class="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">시리얼번호</p>
                  <p class="text-lg font-bold text-slate-900">{{ passport.serialNumber || '-' }}</p>
                </div>
                <div>
                  <p class="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">모델</p>
                  <p class="text-lg font-bold text-slate-900">{{ passport.model || '-' }}</p>
                </div>
                <div>
                  <p class="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">제조사</p>
                  <p class="text-lg font-bold text-slate-900">{{ passport.manufacturerName || '-' }}</p>
                </div>
                <div>
                  <p class="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">제조국가</p>
                  <p class="text-lg font-bold text-slate-900">{{ passport.manufactureCountry || '-' }}</p>
                </div>
                <div>
                  <p class="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">셀 제조사</p>
                  <p class="text-lg font-bold text-slate-900">{{ passport.cellManufacturer || '-' }}</p>
                </div>
                <div>
                  <p class="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">셀 제조국가</p>
                  <p class="text-lg font-bold text-slate-900">{{ passport.cellManufactureCountry || '-' }}</p>
                </div>
                <div>
                  <p class="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">제조일자</p>
                  <p class="text-lg font-bold text-slate-900">{{ formatDate(passport.manufactureDate) }}</p>
                </div>
                <div>
                  <p class="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">셀 유형</p>
                  <p class="text-lg font-bold text-slate-900">{{ passport.cellType || '-' }}</p>
                </div>
                <div>
                  <p class="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">화학물질</p>
                  <p class="text-lg font-bold text-slate-900">
                    <span v-if="passport.chemistry" class="inline-flex items-center px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-sm font-bold border border-emerald-100">{{ passport.chemistry }}</span>
                    <span v-else>-</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Performance & Durability — OpenBattery hero spec grid -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
              <div class="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/>
                </svg>
              </div>
              <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider">성능 및 내구성</h3>
            </div>
            <div class="p-6">
              <div class="grid grid-cols-2 lg:grid-cols-3 gap-6">
                <div class="bg-slate-50 rounded-xl p-5 border border-slate-100 text-center">
                  <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">정격용량</p>
                  <p class="text-4xl font-extrabold text-slate-900 tabular-nums leading-tight">{{ passport.ratedCapacity || '--' }}</p>
                  <p class="text-sm font-medium text-slate-400 mt-1">Ah</p>
                </div>
                <div class="bg-slate-50 rounded-xl p-5 border border-slate-100 text-center">
                  <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">전압범위</p>
                  <p class="text-4xl font-extrabold text-slate-900 tabular-nums leading-tight">{{ passport.voltageRange || '--' }}</p>
                  <p class="text-sm font-medium text-slate-400 mt-1">V</p>
                </div>
                <div class="bg-slate-50 rounded-xl p-5 border border-slate-100 text-center">
                  <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">총 에너지</p>
                  <p class="text-4xl font-extrabold text-slate-900 tabular-nums leading-tight">{{ passport.totalEnergy || '--' }}</p>
                  <p class="text-sm font-medium text-slate-400 mt-1">kWh</p>
                </div>
                <div class="bg-slate-50 rounded-xl p-5 border border-slate-100 text-center">
                  <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">무게</p>
                  <p class="text-4xl font-extrabold text-slate-900 tabular-nums leading-tight">{{ passport.weight || '--' }}</p>
                  <p class="text-sm font-medium text-slate-400 mt-1">kg</p>
                </div>
                <div class="bg-slate-50 rounded-xl p-5 border border-slate-100 text-center">
                  <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">에너지밀도</p>
                  <p class="text-4xl font-extrabold text-slate-900 tabular-nums leading-tight">{{ passport.energyDensity || '--' }}</p>
                  <p class="text-sm font-medium text-slate-400 mt-1">Wh/kg</p>
                </div>
                <div class="bg-slate-50 rounded-xl p-5 border border-slate-100 text-center">
                  <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">셀 수</p>
                  <p class="text-4xl font-extrabold text-slate-900 tabular-nums leading-tight">{{ passport.cellCount || '--' }}</p>
                  <p class="text-sm font-medium text-slate-400 mt-1">개</p>
                </div>
                <div class="bg-slate-50 rounded-xl p-5 border border-slate-100 text-center">
                  <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">예상수명</p>
                  <p class="text-4xl font-extrabold text-slate-900 tabular-nums leading-tight">{{ passport.expectedLifespan || '--' }}</p>
                  <p class="text-sm font-medium text-slate-400 mt-1">년</p>
                </div>
                <div class="bg-slate-50 rounded-xl p-5 border border-slate-100 text-center">
                  <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">온도범위</p>
                  <p class="text-4xl font-extrabold text-slate-900 tabular-nums leading-tight">{{ passport.temperatureRange || '--' }}</p>
                  <p class="text-sm font-medium text-slate-400 mt-1">&deg;C</p>
                </div>
              </div>
            </div>
          </div>

          <!-- EV Binding -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101"/>
                  </svg>
                </div>
                <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider">EV 바인딩</h3>
              </div>
              <button v-if="isEV && !passport.vin" @click="showBindModal = true"
                class="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                </svg>
                VIN 바인딩
              </button>
            </div>
            <div class="p-6">
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-6">
                <div>
                  <p class="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">VIN</p>
                  <p class="text-lg font-bold font-mono">
                    <span v-if="passport.vin" class="text-slate-900">{{ passport.vin }}</span>
                    <span v-else class="text-slate-300">미등록</span>
                  </p>
                </div>
                <div>
                  <p class="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">EV 제조사</p>
                  <p class="text-lg font-bold text-slate-900">{{ passport.evManufacturer || '-' }}</p>
                </div>
                <div>
                  <p class="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">장착일자</p>
                  <p class="text-lg font-bold text-slate-900">{{ formatDate(passport.installDate) }}</p>
                </div>
                <div>
                  <p class="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">EV 조립국가</p>
                  <p class="text-lg font-bold text-slate-900">{{ passport.evAssemblyCountry || '-' }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- SOC / SOH / SOCE Gauges -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <!-- SOC Gauge -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col items-center">
              <h4 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">SOC (충전 상태)</h4>
              <svg viewBox="0 0 100 100" class="w-24 h-24">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" stroke-width="6"/>
                <circle cx="50" cy="50" r="40" fill="none"
                        :stroke="getSocHex(scaleSOC(passport.currentSoc))" stroke-width="6"
                        stroke-linecap="round"
                        :stroke-dasharray="gaugeCircumference"
                        :stroke-dashoffset="gaugeReady ? gaugeCircumference * (1 - Math.min(scaleSOC(passport.currentSoc) || 0, 100) / 100) : gaugeCircumference"
                        transform="rotate(-90 50 50)"
                        style="transition: stroke-dashoffset 1s ease;"/>
                <text x="50" y="48" text-anchor="middle" dominant-baseline="middle" fill="#0f172a" font-size="18" font-weight="700">
                  {{ passport.currentSoc != null ? scaleSOC(passport.currentSoc) : '--' }}
                </text>
                <text x="50" y="64" text-anchor="middle" fill="#94a3b8" font-size="10">%</text>
              </svg>
            </div>
            <!-- SOH Gauge -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col items-center">
              <h4 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">SOH (건강 상태)</h4>
              <svg viewBox="0 0 100 100" class="w-24 h-24">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" stroke-width="6"/>
                <circle cx="50" cy="50" r="40" fill="none"
                        :stroke="getSohColor(passport.currentSoh)" stroke-width="6"
                        stroke-linecap="round"
                        :stroke-dasharray="gaugeCircumference"
                        :stroke-dashoffset="gaugeReady ? gaugeCircumference * (1 - (passport.currentSoh || 0) / 100) : gaugeCircumference"
                        transform="rotate(-90 50 50)"
                        style="transition: stroke-dashoffset 1s ease;"/>
                <text x="50" y="48" text-anchor="middle" dominant-baseline="middle" fill="#0f172a" font-size="18" font-weight="700">
                  {{ passport.currentSoh != null ? passport.currentSoh : '--' }}
                </text>
                <text x="50" y="64" text-anchor="middle" fill="#94a3b8" font-size="10">%</text>
              </svg>
            </div>
            <!-- SOCE -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col items-center">
              <h4 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">SOCE (에너지 충전)</h4>
              <svg viewBox="0 0 100 100" class="w-24 h-24">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" stroke-width="6"/>
                <circle cx="50" cy="50" r="40" fill="none"
                        stroke="#8b5cf6" stroke-width="6"
                        stroke-linecap="round"
                        :stroke-dasharray="gaugeCircumference"
                        :stroke-dashoffset="gaugeReady ? gaugeCircumference * (1 - (passport.soce || 0) / 100) : gaugeCircumference"
                        transform="rotate(-90 50 50)"
                        style="transition: stroke-dashoffset 1s ease;"/>
                <text x="50" y="48" text-anchor="middle" dominant-baseline="middle" fill="#0f172a" font-size="18" font-weight="700">
                  {{ passport.soce != null ? passport.soce : '--' }}
                </text>
                <text x="50" y="64" text-anchor="middle" fill="#94a3b8" font-size="10">%</text>
              </svg>
            </div>
          </div>
        </div>

        <!-- ==================== TAB 2: COMPLIANCE ==================== -->
        <div v-if="activeTab === 'compliance'" class="space-y-6">

          <!-- Large Circular Gauge — OpenBattery style -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div class="px-6 py-5 border-b border-slate-100">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg flex items-center justify-center"
                     :class="gbaCompliance.allFilled ? 'bg-emerald-100' : 'bg-amber-100'">
                  <svg class="w-5 h-5" :class="gbaCompliance.allFilled ? 'text-emerald-600' : 'text-amber-600'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <polyline points="9 12 11 14 15 10"/>
                  </svg>
                </div>
                <div>
                  <h2 class="text-base font-semibold text-slate-900">GBA 21 규제 준수</h2>
                  <p class="text-xs text-slate-400 mt-0.5">Global Battery Alliance 21가지 데이터 항목</p>
                </div>
              </div>
            </div>
            <div class="px-6 py-8">
              <!-- Large compliance gauge + grade -->
              <div class="flex flex-col items-center mb-8">
                <svg viewBox="0 0 200 200" class="w-48 h-48">
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#e5e7eb" stroke-width="10"/>
                  <circle cx="100" cy="100" r="80" fill="none"
                    stroke="#059669" stroke-width="10" stroke-linecap="round"
                    :stroke-dasharray="complianceGaugeCircumference"
                    :stroke-dashoffset="gaugeReady ? complianceGaugeCircumference * (1 - gbaCompliance.pct / 100) : complianceGaugeCircumference"
                    transform="rotate(-90 100 100)"
                    style="transition: stroke-dashoffset 1.2s ease;"/>
                  <text x="100" y="78" text-anchor="middle" fill="#9ca3af" font-size="14" font-weight="500">등급</text>
                  <text x="100" y="120" text-anchor="middle" fill="#111827" font-size="52" font-weight="800">{{ complianceGrade }}</text>
                </svg>
              </div>

              <!-- Key metrics row — 6 boxes like OpenBattery -->
              <div class="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-8">
                <div class="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                  <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">GBA 준수</p>
                  <p class="text-xl font-bold text-emerald-600">{{ gbaCompliance.pct }}%</p>
                </div>
                <div class="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                  <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">무게</p>
                  <p class="text-xl font-bold text-slate-900">{{ passport.weight || 'N/A' }}<span v-if="passport.weight" class="text-xs font-normal text-slate-400 ml-0.5">kg</span></p>
                </div>
                <div class="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                  <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">용량</p>
                  <p class="text-xl font-bold text-slate-900">{{ passport.totalEnergy || 'N/A' }}<span v-if="passport.totalEnergy" class="text-xs font-normal text-slate-400 ml-0.5">kWh</span></p>
                </div>
                <div class="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                  <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">재활용</p>
                  <p class="text-xl font-bold text-slate-900">{{ passport.recycleAvailable != null ? (passport.recycleAvailable ? '가능' : '불가') : 'N/A' }}</p>
                </div>
                <div class="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                  <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">유해물질</p>
                  <p class="text-xl font-bold text-slate-900">N/A</p>
                </div>
                <div class="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                  <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">핵심원자재</p>
                  <p class="text-xl font-bold text-slate-900">N/A</p>
                </div>
              </div>

              <!-- Progress bar -->
              <div class="mb-8">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium text-slate-600">전체 준수율</span>
                  <span class="text-sm font-bold tabular-nums" :class="gbaCompliance.pct >= 80 ? 'text-emerald-600' : gbaCompliance.pct >= 50 ? 'text-amber-600' : 'text-red-600'">{{ gbaCompliance.filled }}/21 ({{ gbaCompliance.pct }}%)</span>
                </div>
                <div class="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-700"
                       :class="gbaCompliance.pct >= 80 ? 'bg-emerald-500' : gbaCompliance.pct >= 50 ? 'bg-amber-500' : 'bg-red-500'"
                       :style="{ width: gbaCompliance.pct + '%' }"></div>
                </div>
              </div>

              <!-- Grouped checklist -->
              <div class="space-y-5">
                <div v-for="group in gbaCompliance.groups" :key="group.name">
                  <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">{{ group.name }}</h4>
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                    <div v-for="f in group.fields" :key="f.idx" class="flex items-center gap-2 py-1">
                      <svg v-if="f.filled" class="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                      </svg>
                      <svg v-else class="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                      <span class="text-xs" :class="f.filled ? 'text-slate-700' : 'text-red-500 font-medium'">{{ f.label }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Battery Information — numbered categories like OpenBattery -->
              <div class="mt-8 space-y-4">
                <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">배터리 정보 카테고리</h3>

                <!-- 1. 배터리 식별 정보 -->
                <div class="bg-slate-50 rounded-xl border border-slate-100 p-5">
                  <h4 class="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold">1</span>
                    배터리 식별 정보
                  </h4>
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">여권 ID</p>
                      <p class="text-sm font-bold text-slate-800 font-mono truncate mt-0.5">{{ passport.passportId || 'N/A' }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">시리얼번호</p>
                      <p class="text-sm font-bold text-slate-800 mt-0.5">{{ passport.serialNumber || 'N/A' }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">모델명</p>
                      <p class="text-sm font-bold text-slate-800 mt-0.5">{{ passport.model || 'N/A' }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">DID</p>
                      <p class="text-sm font-bold text-slate-800 font-mono truncate mt-0.5">{{ passport.did || 'N/A' }}</p>
                    </div>
                  </div>
                </div>

                <!-- 2. 성능 및 내구성 -->
                <div class="bg-slate-50 rounded-xl border border-slate-100 p-5">
                  <h4 class="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold">2</span>
                    성능 및 내구성
                  </h4>
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">정격용량</p>
                      <p class="text-sm font-bold text-slate-800 mt-0.5">{{ passport.ratedCapacity ? passport.ratedCapacity + ' Ah' : 'N/A' }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">전압범위</p>
                      <p class="text-sm font-bold text-slate-800 mt-0.5">{{ passport.voltageRange ? passport.voltageRange + ' V' : 'N/A' }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">총 에너지</p>
                      <p class="text-sm font-bold text-slate-800 mt-0.5">{{ passport.totalEnergy ? passport.totalEnergy + ' kWh' : 'N/A' }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">예상수명</p>
                      <p class="text-sm font-bold text-slate-800 mt-0.5">{{ passport.expectedLifespan ? passport.expectedLifespan + '년' : 'N/A' }}</p>
                    </div>
                  </div>
                </div>

                <!-- 3. 원자재 구성 -->
                <div class="bg-slate-50 rounded-xl border border-slate-100 p-5">
                  <h4 class="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold">3</span>
                    원자재 구성
                  </h4>
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">화학물질</p>
                      <p class="text-sm font-bold text-slate-800 mt-0.5">{{ passport.chemistry || 'N/A' }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">셀 유형</p>
                      <p class="text-sm font-bold text-slate-800 mt-0.5">{{ passport.cellType || 'N/A' }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">셀 제조사</p>
                      <p class="text-sm font-bold text-slate-800 mt-0.5">{{ passport.cellManufacturer || 'N/A' }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">원자재</p>
                      <p class="text-sm font-bold text-slate-800 mt-0.5">{{ passport.rawMaterials ? (typeof passport.rawMaterials === 'object' ? Object.keys(passport.rawMaterials).join(', ') : passport.rawMaterials) : 'N/A' }}</p>
                    </div>
                  </div>
                </div>

                <!-- 4. 지속가능성 -->
                <div class="bg-slate-50 rounded-xl border border-slate-100 p-5">
                  <h4 class="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold">4</span>
                    지속가능성
                  </h4>
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">탄소발자국</p>
                      <p class="text-sm font-bold text-slate-800 mt-0.5">{{ passport.carbonFootprint || 'N/A' }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">재활용 가능</p>
                      <p class="text-sm font-bold text-slate-800 mt-0.5">{{ passport.recycleAvailable != null ? (passport.recycleAvailable ? '가능' : '불가') : 'N/A' }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">재활용 비율</p>
                      <p class="text-sm font-bold text-slate-800 mt-0.5">{{ passport.recyclingRates ? JSON.stringify(passport.recyclingRates) : 'N/A' }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">제조국가</p>
                      <p class="text-sm font-bold text-slate-800 mt-0.5">{{ passport.manufactureCountry || 'N/A' }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Certified badge — subtle -->
              <div v-if="gbaCompliance.allFilled" class="mt-6 px-4 py-3 bg-emerald-50/60 rounded-lg border border-emerald-100 flex items-center gap-2.5">
                <svg class="w-5 h-5 text-emerald-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <polyline points="9 12 11 14 15 10" stroke-width="2.5"/>
                </svg>
                <p class="text-xs font-semibold text-emerald-700">GBA 21 Battery Passport Certified - 모든 필수 데이터 항목 완료</p>
              </div>
            </div>
          </div>
        </div>

        <!-- ==================== TAB 3: TRACEABILITY ==================== -->
        <div v-if="activeTab === 'traceability'" class="space-y-6">

          <!-- Lifecycle Timeline -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
              <div class="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider">배터리 수명 주기</h3>
            </div>
            <div class="px-6 py-6">
              <!-- Desktop horizontal timeline -->
              <div class="hidden sm:block">
                <div class="flex items-start justify-between relative">
                  <div v-for="(step, i) in lifecycleSteps" :key="step.key"
                       class="flex flex-col items-center relative" style="flex:1;">
                    <!-- Connector line -->
                    <div v-if="i < lifecycleSteps.length - 1"
                         class="absolute top-5 h-0.5 transition-all duration-500"
                         :class="getLifecycleState(step.key, passport.status) === 'completed' ? 'bg-emerald-400' : 'bg-slate-200'"
                         :style="{ left: '50%', right: '-50%' }"></div>
                    <!-- Step circle -->
                    <div class="relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-500"
                         :class="[
                           getLifecycleState(step.key, passport.status) === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' : '',
                           getLifecycleState(step.key, passport.status) === 'current' ? 'bg-white border-emerald-500 pd-pulse' : '',
                           getLifecycleState(step.key, passport.status) === 'future' ? 'bg-white border-slate-300 text-slate-400' : '',
                         ]">
                      <svg v-if="getLifecycleState(step.key, passport.status) === 'completed'" class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <div v-else-if="getLifecycleState(step.key, passport.status) === 'current'" class="w-3 h-3 rounded-full bg-emerald-500"></div>
                      <span v-else class="text-xs font-bold text-slate-400">{{ i + 1 }}</span>
                    </div>
                    <p class="mt-2 text-xs font-medium text-center leading-tight"
                       :class="getLifecycleState(step.key, passport.status) === 'future' ? 'text-slate-400' : 'text-emerald-600'">
                      {{ step.label }}
                    </p>
                  </div>
                </div>
              </div>
              <!-- Mobile vertical timeline -->
              <div class="sm:hidden space-y-0">
                <div v-for="(step, i) in lifecycleSteps" :key="step.key" class="flex items-start gap-3">
                  <div class="flex flex-col items-center">
                    <div class="flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all"
                         :class="[
                           getLifecycleState(step.key, passport.status) === 'completed' ? 'bg-emerald-500 border-emerald-500' : '',
                           getLifecycleState(step.key, passport.status) === 'current' ? 'bg-white border-emerald-500 pd-pulse' : '',
                           getLifecycleState(step.key, passport.status) === 'future' ? 'bg-white border-slate-300' : '',
                         ]">
                      <svg v-if="getLifecycleState(step.key, passport.status) === 'completed'" class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <div v-else-if="getLifecycleState(step.key, passport.status) === 'current'" class="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                      <span v-else class="text-xs font-bold text-slate-400">{{ i + 1 }}</span>
                    </div>
                    <div v-if="i < lifecycleSteps.length - 1" class="w-0.5 h-6"
                         :class="getLifecycleState(step.key, passport.status) === 'completed' ? 'bg-emerald-400' : 'bg-slate-200'"></div>
                  </div>
                  <p class="text-sm font-medium pt-1.5"
                     :class="getLifecycleState(step.key, passport.status) === 'future' ? 'text-slate-400' : 'text-emerald-600'">
                    {{ step.label }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Raw Materials -->
          <div v-if="passport.rawMaterials && ((Array.isArray(passport.rawMaterials) && passport.rawMaterials.length > 0) || (typeof passport.rawMaterials === 'object' && Object.keys(passport.rawMaterials).length > 0))"
               class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
              <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                </svg>
              </div>
              <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider">원자재 정보</h3>
            </div>
            <div class="p-6">
              <div class="text-sm text-slate-700 bg-slate-50 rounded-lg p-4 border border-slate-100 font-mono whitespace-pre-wrap break-all">{{ typeof passport.rawMaterials === 'object' ? JSON.stringify(passport.rawMaterials, null, 2) : passport.rawMaterials }}</div>
            </div>
          </div>

          <!-- Maintenance Logs -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <svg class="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
                  </svg>
                </div>
                <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider">정비 이력</h3>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">{{ maintenanceLogs.length }}</span>
              </div>
              <div class="flex gap-2">
                <button v-if="isEV && passport.status === 'ACTIVE'" @click="showMaintenanceRequestModal = true"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs rounded-lg transition-colors">
                  정비 요청
                </button>
                <button v-if="isService" @click="showMaintenanceLogModal = true"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg transition-colors">
                  기록 추가
                </button>
              </div>
            </div>
            <div v-if="maintenanceLogs.length === 0" class="p-10 text-center">
              <p class="text-slate-400 text-sm">정비 이력이 없습니다</p>
            </div>
            <div v-else class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead><tr class="bg-slate-50/60 border-b border-slate-100">
                  <th class="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">날짜</th>
                  <th class="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">유형</th>
                  <th class="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">내용</th>
                  <th class="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">기술자</th>
                </tr></thead>
                <tbody>
                  <tr v-for="(log, i) in maintenanceLogs" :key="i"
                    :class="['transition-colors', i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40', 'hover:bg-emerald-50/40']">
                    <td class="px-5 py-3 text-slate-700 whitespace-nowrap">{{ formatDate(log.date) }}</td>
                    <td class="px-5 py-3"><span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">{{ {routine:'정기점검',repair:'수리',recall:'리콜',emergency:'긴급'}[log.type] || log.type || '-' }}</span></td>
                    <td class="px-5 py-3 text-slate-700 max-w-xs truncate">{{ log.description || '-' }}</td>
                    <td class="px-5 py-3 text-slate-600">{{ log.technician || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Accident Logs -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg class="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider">사고 기록</h3>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">{{ accidentLogs.length }}</span>
              </div>
              <button v-if="isEV || isService" @click="showAccidentLogModal = true"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white font-medium text-xs rounded-lg transition-colors">
                기록 추가
              </button>
            </div>
            <div v-if="accidentLogs.length === 0" class="p-10 text-center">
              <p class="text-slate-400 text-sm">사고 기록이 없습니다</p>
            </div>
            <div v-else class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead><tr class="bg-slate-50/60 border-b border-slate-100">
                  <th class="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">날짜</th>
                  <th class="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">유형</th>
                  <th class="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">내용</th>
                  <th class="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">보고자</th>
                </tr></thead>
                <tbody>
                  <tr v-for="(log, i) in accidentLogs" :key="i"
                    :class="['transition-colors', i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40', 'hover:bg-red-50/30']">
                    <td class="px-5 py-3 text-slate-700 whitespace-nowrap">{{ formatDate(log.date) }}</td>
                    <td class="px-5 py-3"><span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-50 text-red-700 border border-red-100">{{ log.type || '-' }}</span></td>
                    <td class="px-5 py-3 text-slate-700 max-w-xs truncate">{{ log.description || '-' }}</td>
                    <td class="px-5 py-3 text-slate-600">{{ log.reporter || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Action buttons for recycling/analysis -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">가용 작업</h4>
            <div class="flex flex-wrap gap-3">
              <button v-if="isEV" @click="showAnalysisRequestModal = true"
                class="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm rounded-lg transition-colors shadow-sm">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                분석 요청
              </button>
              <button v-if="isService" @click="showAnalysisResultModal = true"
                class="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg transition-colors shadow-sm">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                분석 결과 제출
              </button>
              <button v-if="isService || isRegulator" @click="showRecycleModal = true"
                class="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium text-sm rounded-lg transition-colors shadow-sm">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                재활용 판정
              </button>
              <button v-if="isRegulator" @click="showExtractModal = true"
                class="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm rounded-lg transition-colors shadow-sm">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>
                원자재 추출
              </button>
              <button v-if="isRegulator" @click="showDisposeConfirm = true" :disabled="submitting"
                class="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium text-sm rounded-lg transition-colors shadow-sm disabled:opacity-50">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                폐기 처리
              </button>
              <p v-if="!isEV && !isService && !isRegulator" class="text-sm text-slate-400 py-2">현재 가능한 작업이 없습니다.</p>
            </div>
          </div>
        </div>

        <!-- ==================== TAB 4: DATA ==================== -->
        <div v-if="activeTab === 'data'">
          <div v-if="bmuLoading" class="flex flex-col items-center justify-center py-20">
            <div class="relative">
              <div class="w-10 h-10 border-4 border-emerald-100 rounded-full"></div>
              <div class="absolute top-0 left-0 w-10 h-10 border-4 border-emerald-600 rounded-full animate-spin border-t-transparent"></div>
            </div>
            <p class="mt-3 text-sm text-slate-500">BMU 데이터 로딩중...</p>
          </div>
          <div v-else-if="bmuRecords.length === 0" class="bg-white rounded-xl shadow-sm border border-slate-200 py-16 text-center">
            <div class="mx-auto w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
              <svg class="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <p class="text-slate-500 font-medium">BMU 데이터가 없습니다</p>
            <p class="text-xs text-slate-400 mt-1">아직 수집된 BMU 데이터가 없습니다.</p>
          </div>
          <div v-else class="space-y-4">
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="bg-slate-50/80 border-b border-slate-200">
                      <th class="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider">기록 ID</th>
                      <th class="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider">시각</th>
                      <th class="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider">SOC(%)</th>
                      <th class="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider">전압(V)</th>
                      <th class="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider">전류(A)</th>
                      <th class="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider">온도(C)</th>
                      <th class="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider">방전주기</th>
                      <th class="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(r, idx) in bmuRecords" :key="r.recordId"
                      :class="['transition-colors', idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40', 'hover:bg-emerald-50/40']">
                      <td class="px-5 py-3 font-mono text-xs text-slate-500">{{ r.recordId }}</td>
                      <td class="px-5 py-3 text-slate-600 text-xs">{{ formatDate(r.timestamp) }}</td>
                      <td class="px-5 py-3">
                        <span class="font-semibold text-slate-900 tabular-nums">{{ r.soc != null ? scaleSOC(r.soc) + '%' : '-' }}</span>
                      </td>
                      <td class="px-5 py-3 text-slate-700 tabular-nums">{{ r.voltage != null ? r.voltage + 'V' : '-' }}</td>
                      <td class="px-5 py-3 text-slate-700 tabular-nums">{{ r.current != null ? r.current + 'A' : '-' }}</td>
                      <td class="px-5 py-3 text-slate-700 tabular-nums">{{ r.temperature != null ? scaleTemp(r.temperature) + 'C' : '-' }}</td>
                      <td class="px-5 py-3 text-slate-700 tabular-nums">{{ r.dischargeCycles != null ? r.dischargeCycles : '-' }}</td>
                      <td class="px-5 py-3">
                        <div class="flex flex-wrap gap-1">
                          <span v-for="badge in decodeStatusFlags(r.statusFlags)" :key="badge.label"
                            :class="['inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border', badge.color]">
                            {{ badge.label }}
                          </span>
                          <span v-if="decodeStatusFlags(r.statusFlags).length === 0" class="text-xs text-slate-300">--</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="border-t border-slate-100 bg-slate-50/50 px-5 py-3 flex items-center justify-between">
                <span class="text-xs text-slate-500">최근 <strong class="text-slate-700">{{ bmuRecords.length }}</strong>건 표시</span>
                <button @click="$emit('navigate', 'bmu-data')"
                  class="text-xs text-emerald-600 hover:text-emerald-800 font-medium transition-colors flex items-center gap-1">
                  전체 BMU 데이터
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ==================== TAB 5: TRUST ==================== -->
        <div v-if="activeTab === 'trust'" class="space-y-6">

          <!-- Blockchain Verification Card -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
              <div class="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
              </div>
              <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider">블록체인 검증</h3>
            </div>
            <div class="p-6 space-y-5">
              <!-- DID -->
              <div>
                <dt class="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">DID (Decentralized Identifier)</dt>
                <dd class="flex items-center gap-2">
                  <span class="text-sm text-slate-900 font-mono bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 break-all flex-1">{{ passport.did || '-' }}</span>
                  <button v-if="passport.did" @click="copyToClipboard(passport.did)"
                    class="flex-shrink-0 w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors text-slate-400 hover:text-slate-600"
                    title="복사">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                    </svg>
                  </button>
                </dd>
              </div>

              <!-- Verification badge -->
              <div class="flex items-center gap-3">
                <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
                  <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                  <span class="text-xs font-semibold text-emerald-700">Ed25519 서명 검증</span>
                </div>
              </div>

              <!-- Meta fields -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <dt class="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Creator MSP</dt>
                  <dd class="text-sm text-slate-900 font-medium">{{ passport.creatorMsp || passport.creatorOrg || '-' }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">생성일시</dt>
                  <dd class="text-sm text-slate-900">{{ formatDate(passport.createdAt) }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">최종 수정일시</dt>
                  <dd class="text-sm text-slate-900">{{ formatDate(passport.updatedAt) }}</dd>
                </div>
              </div>
            </div>
          </div>

          <!-- Change History -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
              <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider">변경 이력</h3>
            </div>
            <div v-if="historyLoading" class="flex flex-col items-center justify-center py-16">
              <div class="relative">
                <div class="w-10 h-10 border-4 border-emerald-100 rounded-full"></div>
                <div class="absolute top-0 left-0 w-10 h-10 border-4 border-emerald-600 rounded-full animate-spin border-t-transparent"></div>
              </div>
              <p class="mt-3 text-sm text-slate-500">변경 이력 로딩중...</p>
            </div>
            <div v-else-if="history.length === 0" class="p-10 text-center">
              <p class="text-slate-400 text-sm">변경 이력이 없습니다</p>
            </div>
            <div v-else class="px-6 py-5">
              <p class="text-xs text-slate-500 mb-4">총 <strong class="text-slate-700">{{ history.length }}</strong>건의 주요 변경 이력 (상태 전환/VIN/정비 기준)</p>
              <div class="relative pl-7 max-h-[500px] overflow-y-auto pr-2">
                <div class="absolute left-[11px] top-1 bottom-1 w-0.5 bg-gradient-to-b from-emerald-300 via-emerald-200 to-slate-200"></div>
                <div class="space-y-4">
                  <div v-for="(entry, i) in history.slice(-20)" :key="i" class="relative">
                    <div class="absolute -left-7 top-4 w-[22px] h-[22px] rounded-full border-[3px] border-white shadow-sm flex items-center justify-center"
                      :class="entry.value && entry.value.status ? getStatusBadge(entry.value.status).bg : 'bg-emerald-100'">
                      <div class="w-2 h-2 rounded-full"
                        :class="entry.value && entry.value.status ? getStatusBadge(entry.value.status).dot : 'bg-emerald-500'"></div>
                    </div>
                    <div class="bg-slate-50/50 rounded-lg border border-slate-100 p-4 ml-3 hover:bg-white transition-colors">
                      <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0 flex-1">
                          <div class="flex items-center gap-2 flex-wrap">
                            <p class="text-sm font-semibold text-slate-900">{{ entry.changeDesc || ('변경 #' + entry.index) }}</p>
                            <span v-if="entry.value && entry.value.status"
                              :class="['inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border',
                                getStatusBadge(entry.value.status).bg, getStatusBadge(entry.value.status).text, getStatusBadge(entry.value.status).border]">
                              <span :class="['w-1 h-1 rounded-full', getStatusBadge(entry.value.status).dot]"></span>
                              {{ getStatusBadge(entry.value.status).label }}
                            </span>
                          </div>
                          <div class="flex items-center gap-3 mt-1.5 flex-wrap">
                            <span class="text-xs text-slate-400 flex items-center gap-1">
                              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                              </svg>
                              {{ formatDate(entry.timestamp) }}
                            </span>
                            <span class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[10px] font-medium border border-emerald-100">
                              <svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                              On-Chain TX #{{ entry.index }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- ==================== MODALS ==================== -->

      <!-- VIN Bind Modal -->
      <teleport to="body">
        <transition name="fade">
          <div v-if="showBindModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" @click="showBindModal = false"></div>
            <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200/50 overflow-hidden">
              <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <svg class="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                    </svg>
                  </div>
                  <h2 class="text-lg font-bold text-slate-900">VIN 바인딩</h2>
                </div>
                <button @click="showBindModal = false" class="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors text-slate-400 hover:text-slate-600">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <form @submit.prevent="submitBind" class="p-6 space-y-4">
                <div>
                  <label class="block text-xs font-medium text-slate-500 mb-1.5">VIN</label>
                  <input v-model="bindForm.vin" type="text" placeholder="차량 식별번호"
                    class="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-500 mb-1.5">장착일자</label>
                  <input v-model="bindForm.installDate" type="date"
                    class="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-500 mb-1.5">EV 제조사</label>
                  <input v-model="bindForm.evManufacturer" type="text" placeholder="EV 제조사명"
                    class="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-500 mb-1.5">EV 조립국가</label>
                  <input v-model="bindForm.evAssemblyCountry" type="text" placeholder="KR"
                    class="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm" />
                </div>
                <div class="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button type="button" @click="showBindModal = false"
                    class="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors">취소</button>
                  <button type="submit" :disabled="submitting"
                    class="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50">
                    {{ submitting ? '처리중...' : '바인딩' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </transition>
      </teleport>

      <!-- Maintenance Request Modal -->
      <teleport to="body">
        <transition name="fade">
          <div v-if="showMaintenanceRequestModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" @click="showMaintenanceRequestModal = false"></div>
            <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200/50 overflow-hidden">
              <div class="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                <div class="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                </div>
                <h2 class="text-lg font-bold text-slate-900">정비 요청</h2>
              </div>
              <div class="p-6">
                <p class="text-sm text-slate-600 mb-5">이 배터리에 대한 정비를 요청하시겠습니까?<br><span class="text-xs text-slate-400 mt-1 block">상태가 MAINTENANCE로 변경됩니다.</span></p>
                <div class="flex justify-end gap-3">
                  <button @click="showMaintenanceRequestModal = false"
                    class="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors">취소</button>
                  <button @click="submitMaintenanceRequest" :disabled="submitting"
                    class="px-5 py-2.5 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors disabled:opacity-50">
                    {{ submitting ? '처리중...' : '정비 요청' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </transition>
      </teleport>

      <!-- Maintenance Log Modal -->
      <teleport to="body">
        <transition name="fade">
          <div v-if="showMaintenanceLogModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" @click="showMaintenanceLogModal = false"></div>
            <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200/50 overflow-hidden">
              <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <svg class="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </div>
                  <h2 class="text-lg font-bold text-slate-900">정비 기록 추가</h2>
                </div>
                <button @click="showMaintenanceLogModal = false" class="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors text-slate-400 hover:text-slate-600">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <form @submit.prevent="submitMaintenanceLog" class="p-6 space-y-4">
                <div>
                  <label class="block text-xs font-medium text-slate-500 mb-1.5">날짜</label>
                  <input v-model="maintenanceForm.date" type="date"
                    class="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-500 mb-1.5">유형</label>
                  <input v-model="maintenanceForm.type" type="text" placeholder="정기점검 / 부품교체 / 긴급수리"
                    class="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-500 mb-1.5">내용</label>
                  <textarea v-model="maintenanceForm.description" rows="3" placeholder="정비 내용을 상세히 기입하세요"
                    class="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm resize-none"></textarea>
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-500 mb-1.5">기술자</label>
                  <input v-model="maintenanceForm.technician" type="text" placeholder="기술자명"
                    class="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm" />
                </div>
                <div class="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button type="button" @click="showMaintenanceLogModal = false"
                    class="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors">취소</button>
                  <button type="submit" :disabled="submitting"
                    class="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50">
                    {{ submitting ? '처리중...' : '추가' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </transition>
      </teleport>

      <!-- Accident Log Modal -->
      <teleport to="body">
        <transition name="fade">
          <div v-if="showAccidentLogModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" @click="showAccidentLogModal = false"></div>
            <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200/50 overflow-hidden">
              <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center">
                    <svg class="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <h2 class="text-lg font-bold text-slate-900">사고 기록 추가</h2>
                </div>
                <button @click="showAccidentLogModal = false" class="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors text-slate-400 hover:text-slate-600">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <form @submit.prevent="submitAccidentLog" class="p-6 space-y-4">
                <div>
                  <label class="block text-xs font-medium text-slate-500 mb-1.5">날짜</label>
                  <input v-model="accidentForm.date" type="date"
                    class="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-500 mb-1.5">유형</label>
                  <input v-model="accidentForm.type" type="text" placeholder="충돌 / 화재 / 침수"
                    class="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-500 mb-1.5">내용</label>
                  <textarea v-model="accidentForm.description" rows="3" placeholder="사고 상세 내용"
                    class="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm resize-none"></textarea>
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-500 mb-1.5">보고자</label>
                  <input v-model="accidentForm.reporter" type="text" placeholder="보고자명"
                    class="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm" />
                </div>
                <div class="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button type="button" @click="showAccidentLogModal = false"
                    class="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors">취소</button>
                  <button type="submit" :disabled="submitting"
                    class="px-5 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50">
                    {{ submitting ? '처리중...' : '추가' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </transition>
      </teleport>

      <!-- Analysis Request Modal -->
      <teleport to="body">
        <transition name="fade">
          <div v-if="showAnalysisRequestModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" @click="showAnalysisRequestModal = false"></div>
            <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200/50 overflow-hidden">
              <div class="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                <div class="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  </svg>
                </div>
                <h2 class="text-lg font-bold text-slate-900">분석 요청</h2>
              </div>
              <div class="p-6">
                <p class="text-sm text-slate-600 mb-5">이 배터리에 대한 분석을 요청하시겠습니까?<br><span class="text-xs text-slate-400 mt-1 block">상태가 ANALYSIS로 변경됩니다.</span></p>
                <div class="flex justify-end gap-3">
                  <button @click="showAnalysisRequestModal = false"
                    class="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors">취소</button>
                  <button @click="submitAnalysisRequest" :disabled="submitting"
                    class="px-5 py-2.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors disabled:opacity-50">
                    {{ submitting ? '처리중...' : '분석 요청' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </transition>
      </teleport>

      <!-- Analysis Result Modal -->
      <teleport to="body">
        <transition name="fade">
          <div v-if="showAnalysisResultModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" @click="showAnalysisResultModal = false"></div>
            <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200/50 overflow-hidden">
              <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <svg class="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                  </div>
                  <h2 class="text-lg font-bold text-slate-900">분석 결과 제출</h2>
                </div>
                <button @click="showAnalysisResultModal = false" class="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors text-slate-400 hover:text-slate-600">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <form @submit.prevent="submitAnalysisResult" class="p-6 space-y-4">
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-medium text-slate-500 mb-1.5">SOH (%)</label>
                    <input v-model="analysisForm.soh" type="number" step="0.1" placeholder="85"
                      class="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm" />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-slate-500 mb-1.5">SOCE (%)</label>
                    <input v-model="analysisForm.soce" type="number" step="0.1" placeholder="90"
                      class="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm" />
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-500 mb-1.5">잔여 수명 주기</label>
                  <input v-model="analysisForm.remainingLifeCycle" type="number" placeholder="1500"
                    class="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm" />
                </div>
                <div class="flex items-center gap-3 py-2 px-3.5 bg-slate-50 rounded-lg border border-slate-100">
                  <input v-model="analysisForm.recycleAvailable" type="checkbox" id="recycleCheckDetail2"
                    class="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500" />
                  <label for="recycleCheckDetail2" class="text-sm text-slate-700 font-medium">재활용 가능</label>
                </div>
                <div class="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button type="button" @click="showAnalysisResultModal = false"
                    class="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors">취소</button>
                  <button type="submit" :disabled="submitting"
                    class="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50">
                    {{ submitting ? '처리중...' : '제출' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </transition>
      </teleport>

      <!-- Recycle Availability Modal -->
      <teleport to="body">
        <transition name="fade">
          <div v-if="showRecycleModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" @click="showRecycleModal = false"></div>
            <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200/50 overflow-hidden">
              <div class="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                <div class="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <h2 class="text-lg font-bold text-slate-900">재활용 판정</h2>
              </div>
              <div class="p-6">
                <p class="text-sm text-slate-600 mb-6">이 배터리의 재활용 가능 여부를 판정합니다.</p>
                <div class="flex justify-end gap-3">
                  <button @click="showRecycleModal = false"
                    class="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors">취소</button>
                  <button @click="submitRecycleAvailability(false)" :disabled="submitting"
                    class="px-5 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50">
                    재활용 불가
                  </button>
                  <button @click="submitRecycleAvailability(true)" :disabled="submitting"
                    class="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50">
                    재활용 가능
                  </button>
                </div>
              </div>
            </div>
          </div>
        </transition>
      </teleport>

      <!-- Extract Materials Modal -->
      <teleport to="body">
        <transition name="fade">
          <div v-if="showExtractModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" @click="showExtractModal = false"></div>
            <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200/50 overflow-hidden">
              <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 bg-teal-100 rounded-lg flex items-center justify-center">
                    <svg class="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
                    </svg>
                  </div>
                  <h2 class="text-lg font-bold text-slate-900">원자재 추출</h2>
                </div>
                <button @click="showExtractModal = false" class="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors text-slate-400 hover:text-slate-600">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <form @submit.prevent="submitExtractMaterials" class="p-6 space-y-4">
                <div>
                  <label class="block text-xs font-medium text-slate-500 mb-1.5">재활용 비율 (JSON)</label>
                  <textarea v-model="extractForm.recyclingRatesJson" rows="6"
                    class="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-mono resize-none bg-slate-50"></textarea>
                  <p class="text-xs text-slate-400 mt-1.5">예: { "cobalt": 95, "nickel": 90, "lithium": 80 }</p>
                </div>
                <div class="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button type="button" @click="showExtractModal = false"
                    class="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors">취소</button>
                  <button type="submit" :disabled="submitting"
                    class="px-5 py-2.5 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-colors disabled:opacity-50">
                    {{ submitting ? '처리중...' : '등록' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </transition>
      </teleport>

      <!-- Dispose Confirmation Modal -->
      <teleport to="body">
        <transition name="fade">
          <div v-if="showDisposeConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" @click="showDisposeConfirm = false"></div>
            <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200/50 overflow-hidden">
              <div class="p-6 text-center">
                <div class="mx-auto w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <svg class="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                </div>
                <h3 class="text-lg font-bold text-slate-900 mb-2">폐기 처리 확인</h3>
                <p class="text-sm text-slate-500 mb-6">정말로 이 배터리를 폐기 처리하시겠습니까?<br>이 작업은 되돌릴 수 없습니다.</p>
                <div class="flex gap-3">
                  <button @click="showDisposeConfirm = false"
                    class="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors">취소</button>
                  <button @click="disposeBattery" :disabled="submitting"
                    class="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50">
                    {{ submitting ? '처리중...' : '폐기 확인' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </transition>
      </teleport>
    </div>
  `
});
