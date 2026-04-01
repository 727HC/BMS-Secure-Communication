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

    // VC (Verifiable Credentials)
    const vcList = ref([]);
    const vcLoading = ref(false);
    const showVcIssueModal = ref(false);
    const showVcDetailModal = ref(false);
    const selectedVc = ref(null);
    const vcForm = ref({ credType: 'BATTERY_PASSPORT', holderDid: '', expiresAt: '' });

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
    const showCorrectModal = ref(false);
    const showInvalidateModal = ref(false);
    const correctForm = ref({ fieldName: '', newValue: '', reason: '' });
    const invalidateForm = ref({ recordId: '', reason: '' });
    const correctionHistory = ref([]);
    const showLinkMaterialsModal = ref(false);
    const availableMaterials = ref([]);
    const selectedMaterialIds = ref([]);
    const submitting = ref(false);
    const linkedMaterialDetails = ref([]);

    // Forms
    const bindForm = ref({ vin: '', installDate: '', evManufacturer: '', evAssemblyCountry: '' });
    const vehicleImageFile = ref(null);
    const vehicleImagePath = ref(null);
    const maintenanceForm = ref({ date: '', type: '', description: '', technician: '' });
    const accidentForm = ref({ severity: 'minor', description: '', reporter: '' });
    const analysisForm = ref({ soh: '', soce: '', remainingLifeCycle: '', recycleAvailable: false });
    const extractForm = ref({ recyclingRatesJson: '{\n  "cobalt": 95,\n  "nickel": 90,\n  "lithium": 80,\n  "manganese": 85\n}' });

    /* ---------- helpers ---------- */
    // Use global scaleSOC/scaleTemp from app.js
    function formatDate(ts) {
      if (!ts) return '-';
      try { return new Date(ts).toLocaleString('ko-KR'); } catch { return ts; }
    }

    // "280~403" or "280-350-403" → { min, nom, max }
    function parseVoltageRange(str) {
      if (!str) return { min: '--', nom: '--', max: '--' };
      const parts = String(str).replace(/[VvＶ]/g, '').split(/[~\-,]/);
      if (parts.length >= 3) return { min: parts[0].trim(), nom: parts[1].trim(), max: parts[2].trim() };
      if (parts.length === 2) return { min: parts[0].trim(), nom: '--', max: parts[1].trim() };
      return { min: '--', nom: str.trim(), max: '--' };
    }

    // "-20~60" or "-40~60" → { min, max }
    function parseTempRange(str) {
      if (!str) return { min: '--', max: '--' };
      const m = String(str).replace(/[°CcＣ]/g, '').match(/([\-\d.]+)[~\s]+([\d.]+)/);
      if (m) return { min: m[1], max: m[2] };
      return { min: '--', max: str.trim() };
    }

    /* ---------- status config ---------- */
    // Use global STATUS_LABELS, STATUS_CONFIG, getStatusBadge from app.js
    const statusLabels = STATUS_LABELS;
    function getSocColor(soc) {
      if (soc == null) return 'bg-gray-200';
      if (soc >= 60) return 'bg-[#34d399]';
      if (soc >= 30) return 'bg-[#fbbf24]';
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
      if (num & 0x01) badges.push({ label: '충전중', color: 'bg-emerald-50 text-emerald-600 border-emerald-500' });
      if (num & 0x02) badges.push({ label: '밸런싱', color: 'bg-emerald-50 text-emerald-600 border-emerald-500' });
      if (num & 0x04) badges.push({ label: '결함', color: 'bg-red-50 text-red-600 border-gray-200' });
      return badges;
    }

    /* ---------- MSP roles ---------- */
    const msp = computed(() => props.auth.orgMsp);
    const isEV = computed(() => msp.value === MSP.EV_MANUFACTURER);
    const isService = computed(() => msp.value === MSP.SERVICE);
    const isRegulator = computed(() => msp.value === MSP.REGULATOR);
    const isManufacturer = computed(() => msp.value === MSP.MANUFACTURER);

    /* ---------- tabs ---------- */
    const tabs = [
      { key: 'identity', label: '식별정보', icon: 'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0' },
      { key: 'compliance', label: '규제 준수', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
      { key: 'traceability', label: '정비/이력', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
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
        // carbonFootprint: count as filled if value exists OR estimation is available
        const isFilled = f.key === 'carbonFootprint'
          ? (fieldFilled(p, f.key) || estimatedCarbonFootprint.value != null)
          : fieldFilled(p, f.key);
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

      // B-6 fix: parse passportId from hash first (SPA hash routing)
      const hashStr = window.location.hash.replace('#', '');
      const [, hq] = hashStr.split('?');
      const hashParams = new URLSearchParams(hq || '');
      passportId.value = hashParams.get('passportId') || '';
      const savedTab = hashParams.get('tab');
      if (savedTab && tabs.some(t => t.key === savedTab)) {
        switchTab(savedTab);
      }
      // Fallback to window.__pageProps
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
        checkVehicleImage();
        fetchLinkedMaterials();
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
        // Parse and reverse to chronological order (oldest first)
        const parsed = raw.map(entry => {
          if (typeof entry === 'string') {
            try { return JSON.parse(entry); } catch (e) { return {}; }
          }
          return entry;
        });
        parsed.reverse();
        const all = parsed.map((value, i) => ({ value, index: i + 1 }));
        const filtered = [];
        let prevStatus = null, prevVin = null, prevMaintCount = 0, prevAccidentCount = 0;
        all.forEach((entry, i) => {
          const v = entry.value;
          const status = v.status || '';
          const vin = v.vin || '';
          const maintCount = (v.maintenanceLogs || []).length;
          const accidentCount = (v.accidentLogs || []).length;
          const isFirst = i === 0;
          const isLast = i === all.length - 1;
          const statusChanged = status !== prevStatus;
          const vinChanged = vin && vin !== prevVin;
          const maintChanged = maintCount > prevMaintCount;
          const accidentChanged = accidentCount > prevAccidentCount;
          if (isFirst || isLast || statusChanged || vinChanged || maintChanged || accidentChanged) {
            let changeDesc = '';
            if (isFirst) changeDesc = '여권 생성';
            else if (statusChanged && prevStatus) {
              changeDesc = (statusLabels[prevStatus] || prevStatus) + ' -> ' + (statusLabels[status] || status);
            }
            else if (vinChanged) changeDesc = 'VIN 바인딩: ' + vin;
            else if (accidentChanged) changeDesc = '사고 기록 추가 (#' + accidentCount + ')';
            else if (maintChanged) changeDesc = '정비 기록 추가 (#' + maintCount + ')';
            else if (isLast) changeDesc = '최신 상태';
            filtered.push({
              value: v, timestamp: v.updatedAt || v.createdAt || '-',
              changeDesc, index: entry.index, blockNumber: entry.index,
            });
          }
          prevStatus = status; prevVin = vin; prevMaintCount = maintCount; prevAccidentCount = accidentCount;
        });
        history.value = filtered;
      } catch (e) {
        history.value = [];
      } finally {
        historyLoading.value = false;
      }
    }

    async function fetchVcList() {
      if (vcList.value.length > 0) return;
      vcLoading.value = true;
      try {
        const data = await props.api.get('/vc/passport/' + passportId.value);
        vcList.value = data.records || data || [];
      } catch (e) {
        vcList.value = [];
      } finally {
        vcLoading.value = false;
      }
    }

    async function issueVc() {
      submitting.value = true;
      try {
        await props.api.post('/vc/issue', {
          passportId: passportId.value,
          credType: vcForm.value.credType,
          holderDid: vcForm.value.holderDid || passport.value.did || '',
          expiresAt: vcForm.value.expiresAt || '',
        });
        window.$toast('success', '인증서가 발급되었습니다.');
        showVcIssueModal.value = false;
        vcList.value = [];
        await fetchVcList();
      } catch (e) { window.$toast('error', '인증서 발급 실패: ' + e.message); }
      finally { submitting.value = false; }
    }

    async function verifyVc(credentialId) {
      try {
        const result = await props.api.get('/vc/verify/' + credentialId);
        const vc = vcList.value.find(v => v.credentialId === credentialId);
        if (vc) vc._verified = result;
        window.$toast('success', result.valid ? '유효한 인증서입니다.' : '유효하지 않은 인증서입니다.');
      } catch (e) { window.$toast('error', '검증 실패: ' + e.message); }
    }

    async function revokeVc(credentialId) {
      if (!confirm('이 인증서를 폐기하시겠습니까?')) return;
      submitting.value = true;
      try {
        await props.api.post('/vc/revoke', { credentialId, reason: '수동 폐기' });
        window.$toast('success', '인증서가 폐기되었습니다.');
        vcList.value = [];
        await fetchVcList();
      } catch (e) { window.$toast('error', '폐기 실패: ' + e.message); }
      finally { submitting.value = false; }
    }

    const vcCredTypes = [
      { value: 'BATTERY_PASSPORT', label: '배터리 여권', org: MSP.MANUFACTURER },
      { value: 'BATTERY_HEALTH', label: '배터리 건강', org: MSP.SERVICE },
      { value: 'MAINTENANCE', label: '정비 인증', org: MSP.SERVICE },
      { value: 'COMPLIANCE', label: '규제 적합', org: MSP.REGULATOR },
      { value: 'RECYCLING', label: '재활용 인증', org: MSP.REGULATOR },
    ];

    const canIssueVc = computed(() => {
      return vcCredTypes.some(t => t.org === props.auth.orgMsp);
    });

    const availableCredTypes = computed(() => {
      return vcCredTypes.filter(t => t.org === props.auth.orgMsp);
    });

    // Carbon footprint estimation from raw materials
    const EMISSION_FACTORS = { '리튬': 15, '코발트': 35, '니켈': 12, '망간': 8, '흑연': 5, '인산': 4, '철': 2, '구리': 4, '알루미늄': 10 };
    const estimatedCarbonFootprint = computed(() => {
      const p = passport.value;
      if (!p) return null;
      if (p.carbonFootprint && p.carbonFootprint > 0) return p.carbonFootprint;
      // Estimate from rawMaterials if available
      if (p.rawMaterials && Array.isArray(p.rawMaterials) && p.rawMaterials.length > 0) {
        // rawMaterials could be array of objects or strings
        return null; // Need material details to estimate
      }
      // Rough estimate based on weight + chemistry
      if (p.weight > 0 && p.totalEnergy > 0) {
        const factor = (p.chemistry || '').includes('LFP') ? 60 : 75;
        return +(factor * p.totalEnergy / 1000).toFixed(1);
      }
      return null;
    });

    const carbonGrade = computed(() => {
      const cf = estimatedCarbonFootprint.value;
      if (cf == null) return null;
      const perKwh = passport.value?.totalEnergy > 0 ? cf / passport.value.totalEnergy * 1000 : null;
      if (perKwh == null) return null;
      if (perKwh <= 50) return { grade: 'A', color: 'text-emerald-600', bg: 'bg-emerald-50', label: '매우 우수' };
      if (perKwh <= 75) return { grade: 'B', color: 'text-blue-600', bg: 'bg-blue-50', label: '우수' };
      if (perKwh <= 100) return { grade: 'C', color: 'text-amber-600', bg: 'bg-amber-50', label: '보통' };
      return { grade: 'D', color: 'text-red-600', bg: 'bg-red-50', label: '개선 필요' };
    });

    // QR Code
    const qrUrl = computed(() => {
      if (!passport.value) return '';
      return window.location.origin + '/#passport-detail?passportId=' + encodeURIComponent(passport.value.passportId);
    });

    function generateQr() {
      if (!passport.value || typeof QRCode === 'undefined') return;
      const tryRender = () => {
        const canvas = document.getElementById('qr-canvas');
        if (!canvas) return setTimeout(tryRender, 200);
        QRCode.toCanvas(canvas, qrUrl.value, { width: 160, margin: 2, color: { dark: '#0f172a', light: '#ffffff' } });
      };
      Vue.nextTick(tryRender);
    }

    // Auto-generate QR when passport loads and trust tab is active
    watch(() => [passport.value, activeTab.value], ([p, tab]) => {
      if (p && tab === 'trust') setTimeout(generateQr, 100);
    });

    function downloadQr() {
      const canvas = document.getElementById('qr-canvas');
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = (passport.value?.passportId || 'qr') + '-qrcode.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    }

    function switchTab(tab) {
      activeTab.value = tab;
      // persist tab in URL hash
      const hashStr = window.location.hash.replace('#', '');
      const [page] = hashStr.split('?');
      const params = new URLSearchParams(hashStr.split('?')[1] || '');
      params.set('tab', tab);
      window.location.hash = page + '?' + params.toString();
      if (tab === 'data') fetchBmuData();
      if (tab === 'trust') { fetchHistory(); fetchVcList(); fetchCorrectionHistory(); setTimeout(generateQr, 300); }
    }

    /* ---------- actions ---------- */
    async function submitBind() {
      submitting.value = true;
      try {
        await retryOnConflict(() => props.api.put('/passports/' + passportId.value + '/bind', bindForm.value));
        // Upload vehicle image if selected
        if (vehicleImageFile.value) {
          const formData = new FormData();
          formData.append('image', vehicleImageFile.value);
          const res = await fetch('/api/passports/' + passportId.value + '/vehicle-image', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + props.auth.token },
            body: formData,
          });
          if (res.ok) {
            const data = await res.json();
            vehicleImagePath.value = data.path;
          }
          vehicleImageFile.value = null;
        }
        window.$toast('success', 'VIN 바인딩이 완료되었습니다.');
        showBindModal.value = false;
        await fetchPassport();
        await checkVehicleImage();
      } catch (e) { window.$toast('error', 'VIN 바인딩 실패: ' + e.message); }
      finally { submitting.value = false; }
    }

    async function uploadVehicleImage(file) {
      if (!file) return;
      try {
        const formData = new FormData();
        formData.append('image', file);
        const res = await fetch('/api/passports/' + passportId.value + '/vehicle-image', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + props.auth.token },
          body: formData,
        });
        const data = await res.json();
        if (res.ok) {
          vehicleImagePath.value = data.path + '?t=' + Date.now();
          window.$toast('success', '차량 사진이 등록되었습니다.');
        } else {
          window.$toast('error', data.error || '업로드 실패');
        }
      } catch (e) { window.$toast('error', '업로드 실패: ' + e.message); }
    }

    async function checkVehicleImage() {
      try {
        const data = await props.api.get('/passports/' + passportId.value + '/vehicle-image');
        vehicleImagePath.value = data.exists ? data.path : null;
      } catch { vehicleImagePath.value = null; }
    }

    async function submitMaintenanceRequest() {
      submitting.value = true;
      try {
        await retryOnConflict(() => props.api.post('/maintenance/' + passportId.value + '/request', { maintenanceType: 'routine', description: '정비 요청' }));
        window.$toast('success', '정비 요청이 접수되었습니다.');
        showMaintenanceRequestModal.value = false;
        await fetchPassport();
      } catch (e) { window.$toast('error', '정비 요청 실패: ' + e.message); }
      finally { submitting.value = false; }
    }

    async function submitMaintenanceLog() {
      submitting.value = true;
      try {
        await retryOnConflict(() => props.api.post('/maintenance/' + passportId.value + '/log', {
          maintenanceType: maintenanceForm.value.type || 'routine',
          description: maintenanceForm.value.description,
          technician: maintenanceForm.value.technician,
        }));
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
        await retryOnConflict(() => props.api.post('/maintenance/' + passportId.value + '/accident', accidentForm.value));
        window.$toast('success', '사고 기록이 추가되었습니다.');
        showAccidentLogModal.value = false;
        accidentForm.value = { severity: 'minor', description: '', reporter: '' };
        await fetchPassport();
      } catch (e) { window.$toast('error', '사고 기록 추가 실패: ' + e.message); }
      finally { submitting.value = false; }
    }

    async function submitAnalysisRequest() {
      submitting.value = true;
      try {
        await retryOnConflict(() => props.api.post('/analysis/' + passportId.value + '/request', {}));
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
        await retryOnConflict(() => props.api.post('/analysis/' + passportId.value + '/result', body));
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
        await retryOnConflict(() => props.api.put('/recycling/' + passportId.value + '/availability', { available }));
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
        await retryOnConflict(() => props.api.post('/recycling/' + passportId.value + '/extract', { recyclingRates: rates }));
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
        await retryOnConflict(() => props.api.post('/recycling/' + passportId.value + '/dispose', {}));
        window.$toast('success', '배터리가 폐기 처리되었습니다.');
        showDisposeConfirm.value = false;
        await fetchPassport();
      } catch (e) { window.$toast('error', '폐기 처리 실패: ' + e.message); }
      finally { submitting.value = false; }
    }

    // Correct passport field — role-based field filtering
    const manufacturerFields = [
      { value: 'model', label: '모델' }, { value: 'serialNumber', label: '시리얼번호' },
      { value: 'manufacturerName', label: '제조사' }, { value: 'manufactureCountry', label: '제조국가' },
      { value: 'cellManufacturer', label: '셀 제조사' }, { value: 'cellManufactureCountry', label: '셀 제조국가' },
      { value: 'manufactureDate', label: '제조일자' }, { value: 'cellType', label: '셀 유형' },
      { value: 'chemistry', label: '화학물질' }, { value: 'voltageRange', label: '전압범위' },
      { value: 'temperatureRange', label: '온도범위' }, { value: 'cellCount', label: '셀 수' },
      { value: 'weight', label: '무게(kg)' }, { value: 'totalEnergy', label: '총 에너지(kWh)' },
      { value: 'energyDensity', label: '에너지밀도(Wh/kg)' }, { value: 'ratedCapacity', label: '정격용량(Ah)' },
      { value: 'expectedLifespan', label: '예상수명(cycles)' }, { value: 'carbonFootprint', label: '탄소발자국' },
    ];
    const evFields = [
      { value: 'vin', label: 'VIN (차대번호)' }, { value: 'installDate', label: '장착일자' },
      { value: 'evManufacturer', label: 'EV 제조사' }, { value: 'evAssemblyCountry', label: 'EV 조립국가' },
    ];
    const correctableFields = computed(() => {
      if (isRegulator.value) return [...manufacturerFields, ...evFields];
      if (isManufacturer.value) return manufacturerFields;
      if (isEV.value) return evFields;
      return [];
    });

    async function submitCorrection() {
      submitting.value = true;
      try {
        await retryOnConflict(() => props.api.post('/passports/' + passportId.value + '/correct', correctForm.value));
        window.$toast('success', '여권 데이터가 정정되었습니다.');
        showCorrectModal.value = false;
        correctForm.value = { fieldName: '', newValue: '', reason: '' };
        await fetchPassport();
        await fetchCorrectionHistory();
      } catch (e) { window.$toast('error', '정정 실패: ' + e.message); }
      finally { submitting.value = false; }
    }

    async function fetchCorrectionHistory() {
      try {
        const data = await props.api.get('/passports/' + passportId.value + '/corrections');
        correctionHistory.value = Array.isArray(data) ? data : (data.records || []);
      } catch { correctionHistory.value = []; }
    }

    // Invalidate BMU record
    async function submitInvalidate() {
      submitting.value = true;
      try {
        await retryOnConflict(() => props.api.post('/bmu/invalidate/' + invalidateForm.value.recordId, { reason: invalidateForm.value.reason }));
        window.$toast('success', 'BMU 레코드가 무효화되었습니다.');
        showInvalidateModal.value = false;
        invalidateForm.value = { recordId: '', reason: '' };
        bmuRecords.value = [];
        await fetchBmuData();
      } catch (e) { window.$toast('error', '무효화 실패: ' + e.message); }
      finally { submitting.value = false; }
    }

    function openInvalidateModal(recordId) {
      invalidateForm.value = { recordId, reason: '' };
      showInvalidateModal.value = true;
    }

    // Fetch linked material details
    async function fetchLinkedMaterials() {
      const ids = passport.value?.rawMaterials || [];
      if (ids.length === 0) { linkedMaterialDetails.value = []; return; }
      try {
        const data = await props.api.get('/materials');
        const all = Array.isArray(data) ? data : (data.materials || data.records || []);
        linkedMaterialDetails.value = all.filter(m => ids.includes(m.materialId));
      } catch { linkedMaterialDetails.value = []; }
    }

    // Link raw materials
    async function openLinkMaterialsModal() {
      try {
        const data = await props.api.get('/materials');
        const all = Array.isArray(data) ? data : (data.materials || data.records || []);
        const linked = passport.value?.rawMaterials || [];
        availableMaterials.value = all;
        selectedMaterialIds.value = [...linked];
        showLinkMaterialsModal.value = true;
      } catch (e) { window.$toast('error', '원자재 목록 조회 실패: ' + e.message); }
    }

    function toggleMaterial(id) {
      const idx = selectedMaterialIds.value.indexOf(id);
      if (idx >= 0) selectedMaterialIds.value.splice(idx, 1);
      else selectedMaterialIds.value.push(id);
    }

    async function submitLinkMaterials() {
      const linked = passport.value?.rawMaterials || [];
      const newIds = selectedMaterialIds.value.filter(id => !linked.includes(id));
      if (newIds.length === 0) {
        window.$toast('error', '새로 연결할 원자재가 없습니다.');
        return;
      }
      submitting.value = true;
      try {
        await retryOnConflict(() => props.api.post('/passports/' + passportId.value + '/materials', { materialIds: newIds }));
        window.$toast('success', newIds.length + '개 원자재가 연결되었습니다.');
        showLinkMaterialsModal.value = false;
        await fetchPassport();
      } catch (e) { window.$toast('error', '원자재 연결 실패: ' + e.message); }
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
      bindForm, maintenanceForm, accidentForm, analysisForm, extractForm, vehicleImageFile, vehicleImagePath, uploadVehicleImage,
      msp, isEV, isService, isRegulator, isManufacturer,
      maintenanceLogs, accidentLogs,
      batteryFillAnimated, lifecycleSteps, statusOrder,
      gba21Fields, gbaCompliance, complianceGrade,
      gaugeCircumference, complianceGaugeCircumference, gaugeReady,
      getStatusBadge, getSocColor, getSocHex, getSohColor, scaleSOC, scaleTemp,
      decodeStatusFlags, getLifecycleState, fieldFilled, formatDate, copyToClipboard, parseVoltageRange, parseTempRange,
      switchTab, goBack, setPassportId,
      submitBind, submitMaintenanceRequest, submitMaintenanceLog, submitAccidentLog,
      submitAnalysisRequest, submitAnalysisResult, submitRecycleAvailability,
      submitExtractMaterials, disposeBattery,
      statusLabels,
      vcList, vcLoading, showVcIssueModal, showVcDetailModal, selectedVc, vcForm,
      vcCredTypes, canIssueVc, availableCredTypes,
      issueVc, verifyVc, revokeVc,
      estimatedCarbonFootprint, carbonGrade,
      qrUrl, generateQr, downloadQr,
      showCorrectModal, correctForm, correctableFields, correctionHistory,
      submitCorrection, fetchCorrectionHistory,
      showInvalidateModal, invalidateForm, submitInvalidate, openInvalidateModal,
      showLinkMaterialsModal, availableMaterials, selectedMaterialIds, linkedMaterialDetails,
      openLinkMaterialsModal, toggleMaterial, submitLinkMaterials,
    };
  },
  template: `
    <div style="max-width: 900px; margin: 0 auto;">

      <!-- ═══ LOADING ═══ -->
      <div v-if="loading" class="flex items-center justify-center py-32">
        <div class="text-center">
          <div class="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full mx-auto mb-4" style="animation: spin 0.8s linear infinite;"></div>
          <p class="text-sm text-gray-500" style="font-family: 'JetBrains Mono', monospace; letter-spacing: 0.05em;">LOADING PASSPORT...</p>
        </div>
      </div>

      <div v-else-if="!passport" class="py-32 text-center">
        <p class="text-lg text-gray-400">여권 데이터를 불러올 수 없습니다.</p>
        <button @click="goBack" class="mt-4 text-sm text-emerald-700 hover:underline">목록으로 돌아가기</button>
      </div>

      <div v-else>

        <!-- ═══════════════════════════════════════════════════════
             DOCUMENT HEADER — like the cover of a technical certificate
             ═══════════════════════════════════════════════════════ -->
        <div class="mb-10">
          <!-- Back link -->
          <button @click="goBack" class="text-xs text-gray-400 hover:text-gray-700 mb-6 inline-block" style="font-family: 'JetBrains Mono', monospace;">
            ← 여권 목록
          </button>

          <!-- Document title block -->
          <div style="border-bottom: 3px solid #111827; padding-bottom: 1.5rem;">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xs text-gray-400 mb-1" style="font-family: 'JetBrains Mono', monospace; letter-spacing: 0.15em;">BATTERY PASSPORT</p>
                <h1 class="text-3xl font-extrabold text-gray-900 tracking-tight" style="font-family: 'Pretendard Variable', sans-serif;">
                  {{ passport.model || 'Battery Passport' }}
                </h1>
                <p class="mt-1 text-sm text-gray-500" style="font-family: 'JetBrains Mono', monospace;">
                  {{ passport.passportId }}
                </p>
              </div>

              <!-- Status stamp -->
              <div class="text-right flex-shrink-0">
                <div class="inline-block px-5 py-2.5 border-2 text-center"
                     :style="'border-color: ' + (passport.status === 'ACTIVE' ? '#059669' : passport.status === 'MANUFACTURED' ? '#2563eb' : passport.status === 'MAINTENANCE' ? '#d97706' : '#6b7280') + '; color: ' + (passport.status === 'ACTIVE' ? '#059669' : passport.status === 'MANUFACTURED' ? '#2563eb' : passport.status === 'MAINTENANCE' ? '#d97706' : '#6b7280') + ';'">
                  <p class="text-xs font-bold tracking-widest uppercase" style="font-family: 'JetBrains Mono', monospace;">{{ getStatusBadge(passport.status).label }}</p>
                </div>
                <p class="text-xs text-gray-400 mt-2" style="font-family: 'JetBrains Mono', monospace;">
                  발급일 {{ formatDate(passport.createdAt) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════
             §1 BATTERY IDENTITY
             ═══════════════════════════════════════════════════════ -->
        <section class="mb-10">
          <div class="flex items-baseline gap-3 mb-4" style="border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem;">
            <span class="text-xs font-bold text-gray-400" style="font-family: 'JetBrains Mono', monospace;">§1</span>
            <h2 class="text-lg font-bold text-gray-900">배터리 식별 정보</h2>
          </div>

          <div class="grid grid-cols-3 gap-x-8 gap-y-4">
            <div v-for="field in [
              { label: '여권 ID', value: passport.passportId, mono: true },
              { label: '배터리 ID', value: passport.batteryId, mono: true },
              { label: '시리얼번호', value: passport.serialNumber, mono: true },
              { label: 'DID', value: passport.did, mono: true },
              { label: '모델', value: passport.model },
              { label: '제조사', value: passport.manufacturerName },
              { label: '제조국', value: passport.manufactureCountry },
              { label: '셀 제조사', value: passport.cellManufacturer },
              { label: '셀 제조국', value: passport.cellManufactureCountry },
              { label: '제조일', value: formatDate(passport.manufactureDate) },
              { label: '셀 유형', value: passport.cellType },
              { label: '화학 구성', value: passport.chemistry }
            ]" :key="field.label">
              <div>
                <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{{ field.label }}</p>
                <p class="text-sm text-gray-900 font-medium" :class="field.mono ? 'font-mono' : ''" :style="field.mono ? 'font-family: JetBrains Mono, monospace; font-size: 0.8rem;' : ''">
                  {{ field.value || '—' }}
                </p>
              </div>
            </div>
          </div>
        </section>

        <!-- ═══════════════════════════════════════════════════════
             §2 TECHNICAL SPECIFICATIONS
             ═══════════════════════════════════════════════════════ -->
        <section class="mb-10">
          <div class="flex items-baseline gap-3 mb-4" style="border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem;">
            <span class="text-xs font-bold text-gray-400" style="font-family: 'JetBrains Mono', monospace;">§2</span>
            <h2 class="text-lg font-bold text-gray-900">기술 사양</h2>
          </div>

          <div class="grid grid-cols-4 gap-x-6 gap-y-4">
            <div v-for="spec in [
              { label: '셀 수', value: passport.cellCount, unit: '' },
              { label: '무게', value: passport.weight, unit: 'kg' },
              { label: '총 에너지', value: passport.totalEnergy, unit: 'kWh' },
              { label: '에너지 밀도', value: passport.energyDensity, unit: 'Wh/kg' },
              { label: '정격 용량', value: passport.ratedCapacity, unit: 'Ah' },
              { label: '예상 수명', value: passport.expectedLifespan, unit: 'cycles' },
              { label: '전압 범위', value: passport.voltageRange, unit: '' },
              { label: '온도 범위', value: passport.temperatureRange, unit: '' }
            ]" :key="spec.label">
              <div>
                <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{{ spec.label }}</p>
                <p class="text-sm text-gray-900 font-semibold" style="font-family: 'JetBrains Mono', monospace;">
                  {{ spec.value != null && spec.value !== '' ? spec.value + (spec.unit ? ' ' + spec.unit : '') : '—' }}
                </p>
              </div>
            </div>
          </div>
        </section>

        <!-- ═══════════════════════════════════════════════════════
             §3 REAL-TIME STATUS
             ═══════════════════════════════════════════════════════ -->
        <section class="mb-10">
          <div class="flex items-baseline gap-3 mb-4" style="border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem;">
            <span class="text-xs font-bold text-gray-400" style="font-family: 'JetBrains Mono', monospace;">§3</span>
            <h2 class="text-lg font-bold text-gray-900">실시간 상태</h2>
          </div>

          <div class="grid grid-cols-4 gap-6">
            <div v-for="gauge in [
              { label: 'SOC', value: passport.currentSoc != null ? scaleSOC(passport.currentSoc) : null, unit: '%', color: getSocHex(scaleSOC(passport.currentSoc)) },
              { label: 'SOH', value: passport.currentSoh, unit: '%', color: getSohColor(passport.currentSoh) },
              { label: '방전 사이클', value: passport.totalDischargeCycles, unit: '', color: '#111827' },
              { label: '잔여 수명', value: passport.remainingLifeCycle, unit: 'cycles', color: '#111827' }
            ]" :key="gauge.label">
              <div>
                <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{{ gauge.label }}</p>
                <p class="text-2xl font-bold" :style="'color: ' + gauge.color + '; font-family: JetBrains Mono, monospace;'">
                  {{ gauge.value != null ? gauge.value : '—' }}<span v-if="gauge.value != null && gauge.unit" class="text-xs text-gray-400 ml-0.5">{{ gauge.unit }}</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        <!-- ═══════════════════════════════════════════════════════
             §4 VEHICLE BINDING
             ═══════════════════════════════════════════════════════ -->
        <section v-if="passport.vin || isEV" class="mb-10">
          <div class="flex items-baseline gap-3 mb-4" style="border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem;">
            <span class="text-xs font-bold text-gray-400" style="font-family: 'JetBrains Mono', monospace;">§4</span>
            <h2 class="text-lg font-bold text-gray-900">차량 바인딩</h2>
          </div>

          <div v-if="passport.vin" class="grid grid-cols-3 gap-x-8 gap-y-4">
            <div>
              <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">VIN</p>
              <p class="text-sm text-gray-900 font-semibold" style="font-family: 'JetBrains Mono', monospace;">{{ passport.vin }}</p>
            </div>
            <div>
              <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">장착일</p>
              <p class="text-sm text-gray-900">{{ formatDate(passport.installDate) }}</p>
            </div>
            <div>
              <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">EV 제조사</p>
              <p class="text-sm text-gray-900">{{ passport.evManufacturer || '—' }}</p>
            </div>
          </div>
          <div v-else class="py-4">
            <p class="text-sm text-gray-400">차량에 바인딩되지 않았습니다.</p>
            <button v-if="isEV && (passport.status === 'MANUFACTURED' || passport.status === 'ACTIVE')" @click="showBindModal = true"
              class="mt-3 text-sm font-medium text-emerald-700 hover:underline">
              차량 바인딩 →
            </button>
          </div>
        </section>

        <!-- ═══════════════════════════════════════════════════════
             §5 GBA 21 COMPLIANCE
             ═══════════════════════════════════════════════════════ -->
        <section class="mb-10">
          <div class="flex items-baseline justify-between mb-4" style="border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem;">
            <div class="flex items-baseline gap-3">
              <span class="text-xs font-bold text-gray-400" style="font-family: 'JetBrains Mono', monospace;">§5</span>
              <h2 class="text-lg font-bold text-gray-900">GBA 21 규제 준수</h2>
            </div>
            <div class="text-right">
              <span class="text-2xl font-bold" :style="'color: ' + (gbaCompliance.pct >= 80 ? '#059669' : gbaCompliance.pct >= 50 ? '#d97706' : '#dc2626') + '; font-family: JetBrains Mono, monospace;'">
                {{ gbaCompliance.filled }}/21
              </span>
              <span class="text-xs text-gray-400 ml-1">항목 충족 ({{ gbaCompliance.pct }}%)</span>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-x-6 gap-y-1">
            <div v-for="field in gba21Fields" :key="field.key"
              class="flex items-center gap-2 py-1.5"
              style="border-bottom: 1px solid #f3f4f6;">
              <span class="w-4 h-4 flex items-center justify-center flex-shrink-0">
                <span v-if="fieldFilled(passport, field.key)" class="text-emerald-600">✓</span>
                <span v-else class="text-gray-300">○</span>
              </span>
              <span class="text-xs" :class="fieldFilled(passport, field.key) ? 'text-gray-700' : 'text-gray-400'">{{ field.label }}</span>
            </div>
          </div>
        </section>

        <!-- ═══════════════════════════════════════════════════════
             §6 LIFECYCLE & PROVENANCE
             ═══════════════════════════════════════════════════════ -->
        <section class="mb-10">
          <div class="flex items-baseline gap-3 mb-4" style="border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem;">
            <span class="text-xs font-bold text-gray-400" style="font-family: 'JetBrains Mono', monospace;">§6</span>
            <h2 class="text-lg font-bold text-gray-900">전주기 이력</h2>
          </div>

          <!-- Lifecycle stages as horizontal timeline -->
          <div class="flex items-center gap-0 mb-6 py-4">
            <div v-for="(step, i) in lifecycleSteps" :key="step.key" class="flex items-center">
              <div class="flex flex-col items-center">
                <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2"
                  :class="getLifecycleState(step.key, passport.status) === 'completed' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' :
                    getLifecycleState(step.key, passport.status) === 'current' ? 'border-blue-600 bg-blue-50 text-blue-700' :
                    'border-gray-200 bg-white text-gray-300'">
                  {{ i + 1 }}
                </div>
                <span class="text-[10px] mt-1.5 text-center" :class="getLifecycleState(step.key, passport.status) !== 'future' ? 'text-gray-700 font-medium' : 'text-gray-300'">{{ step.label }}</span>
              </div>
              <div v-if="i < lifecycleSteps.length - 1" class="w-12 h-0.5 mx-1 mb-5"
                :class="getLifecycleState(step.key, passport.status) === 'completed' ? 'bg-emerald-400' : 'bg-gray-200'"></div>
            </div>
          </div>

          <!-- Maintenance logs -->
          <div v-if="maintenanceLogs.length > 0" class="mb-6">
            <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3" style="font-family: 'JetBrains Mono', monospace;">정비 기록</h3>
            <div v-for="(log, i) in maintenanceLogs" :key="i" class="flex gap-4 py-3" style="border-bottom: 1px solid #f3f4f6;">
              <span class="text-xs text-gray-400 w-24 flex-shrink-0" style="font-family: 'JetBrains Mono', monospace;">{{ formatDate(log.date) }}</span>
              <div class="flex-1">
                <p class="text-sm text-gray-900 font-medium">{{ log.type || '정비' }}</p>
                <p class="text-xs text-gray-500 mt-0.5">{{ log.description || '—' }}</p>
              </div>
              <span class="text-xs text-gray-400">{{ log.technician || '' }}</span>
            </div>
          </div>

          <!-- Accident logs -->
          <div v-if="accidentLogs.length > 0">
            <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3" style="font-family: 'JetBrains Mono', monospace;">사고 기록</h3>
            <div v-for="(log, i) in accidentLogs" :key="i" class="flex gap-4 py-3" style="border-bottom: 1px solid #f3f4f6;">
              <span class="text-xs text-gray-400 w-24 flex-shrink-0" style="font-family: 'JetBrains Mono', monospace;">{{ formatDate(log.date) }}</span>
              <div class="flex-1">
                <span class="text-xs font-semibold px-1.5 py-0.5 border mr-2"
                  :class="log.severity === 'critical' || log.severity === 'severe' ? 'border-red-300 text-red-700 bg-red-50' : 'border-amber-300 text-amber-700 bg-amber-50'">
                  {{ {minor:'경미',moderate:'보통',severe:'심각',critical:'위험'}[log.severity] || log.severity }}
                </span>
                <span class="text-sm text-gray-700">{{ log.description || '—' }}</span>
              </div>
            </div>
          </div>

          <!-- Action buttons for current user's role -->
          <div class="flex flex-wrap gap-2 mt-4">
            <button v-if="isEV && passport.status === 'ACTIVE'" @click="showMaintenanceRequestModal = true"
              class="text-xs font-medium text-amber-700 border border-amber-300 px-3 py-1.5 hover:bg-amber-50 transition">정비 요청</button>
            <button v-if="isService && passport.status === 'MAINTENANCE'" @click="showMaintenanceLogModal = true"
              class="text-xs font-medium text-emerald-700 border border-emerald-300 px-3 py-1.5 hover:bg-emerald-50 transition">정비 완료</button>
            <button v-if="(isService || isEV) && (passport.status === 'ACTIVE' || passport.status === 'MAINTENANCE')" @click="showAccidentLogModal = true"
              class="text-xs font-medium text-red-700 border border-red-300 px-3 py-1.5 hover:bg-red-50 transition">사고 기록</button>
            <button v-if="isRegulator && passport.status === 'ACTIVE'" @click="showAnalysisRequestModal = true"
              class="text-xs font-medium text-purple-700 border border-purple-300 px-3 py-1.5 hover:bg-purple-50 transition">분석 요청</button>
          </div>
        </section>

        <!-- ═══════════════════════════════════════════════════════
             §7 BMU SENSOR DATA
             ═══════════════════════════════════════════════════════ -->
        <section class="mb-10">
          <div class="flex items-baseline justify-between mb-4" style="border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem;">
            <div class="flex items-baseline gap-3">
              <span class="text-xs font-bold text-gray-400" style="font-family: 'JetBrains Mono', monospace;">§7</span>
              <h2 class="text-lg font-bold text-gray-900">센서 데이터 기록</h2>
            </div>
            <button @click="fetchBmuData" class="text-xs text-gray-400 hover:text-gray-700" style="font-family: 'JetBrains Mono', monospace;">새로고침</button>
          </div>

          <div v-if="bmuLoading" class="py-8 text-center text-sm text-gray-400">로딩 중...</div>
          <div v-else-if="bmuRecords.length === 0" class="py-8 text-center text-sm text-gray-400">기록된 센서 데이터가 없습니다.</div>
          <div v-else>
            <table class="w-full text-xs" style="font-family: 'JetBrains Mono', monospace;">
              <thead>
                <tr style="border-bottom: 2px solid #111827;">
                  <th class="text-left py-2 font-semibold text-gray-900 uppercase tracking-wider">시간</th>
                  <th class="text-right py-2 font-semibold text-gray-900 uppercase tracking-wider">SOC %</th>
                  <th class="text-right py-2 font-semibold text-gray-900 uppercase tracking-wider">전압 V</th>
                  <th class="text-right py-2 font-semibold text-gray-900 uppercase tracking-wider">전류 A</th>
                  <th class="text-right py-2 font-semibold text-gray-900 uppercase tracking-wider">온도 °C</th>
                  <th class="text-right py-2 font-semibold text-gray-900 uppercase tracking-wider">사이클</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in bmuRecords.slice(0, 10)" :key="r.recordId" style="border-bottom: 1px solid #f3f4f6;" class="hover:bg-gray-50">
                  <td class="py-2 text-gray-500">{{ formatDate(r.timestamp) }}</td>
                  <td class="py-2 text-right font-semibold" :style="'color: ' + getSocHex(scaleSOC(r.soc))">{{ r.soc != null ? scaleSOC(r.soc) : '—' }}</td>
                  <td class="py-2 text-right text-gray-700">{{ r.voltage != null ? r.voltage : '—' }}</td>
                  <td class="py-2 text-right text-gray-700">{{ r.current != null ? r.current : '—' }}</td>
                  <td class="py-2 text-right text-gray-700">{{ r.temperature != null ? scaleTemp(r.temperature) : '—' }}</td>
                  <td class="py-2 text-right text-gray-500">{{ r.dischargeCycles != null ? r.dischargeCycles : '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- ═══════════════════════════════════════════════════════
             §8 SUSTAINABILITY
             ═══════════════════════════════════════════════════════ -->
        <section class="mb-10">
          <div class="flex items-baseline gap-3 mb-4" style="border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem;">
            <span class="text-xs font-bold text-gray-400" style="font-family: 'JetBrains Mono', monospace;">§8</span>
            <h2 class="text-lg font-bold text-gray-900">지속가능성</h2>
          </div>

          <div class="grid grid-cols-3 gap-x-8 gap-y-4">
            <div>
              <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">탄소 발자국</p>
              <p class="text-sm text-gray-900 font-semibold" style="font-family: 'JetBrains Mono', monospace;">
                {{ estimatedCarbonFootprint ? estimatedCarbonFootprint + ' kg CO₂' : '—' }}
              </p>
            </div>
            <div>
              <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">유해물질 포함</p>
              <p class="text-sm text-gray-900">{{ passport.containsHazardous ? '예' : '아니오' }}</p>
            </div>
            <div>
              <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">재활용 가능</p>
              <p class="text-sm" :class="passport.recycleAvailable ? 'text-emerald-700 font-semibold' : 'text-gray-500'">
                {{ passport.recycleAvailable ? '가능' : '판정 전' }}
              </p>
            </div>
          </div>

          <!-- Recycling rates if available -->
          <div v-if="passport.recyclingRates && Object.keys(passport.recyclingRates).length > 0" class="mt-4">
            <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">원자재 재활용률</p>
            <div class="flex gap-6">
              <div v-for="(rate, material) in passport.recyclingRates" :key="material">
                <span class="text-xs text-gray-500">{{ material }}</span>
                <span class="text-sm font-bold text-gray-900 ml-1" style="font-family: 'JetBrains Mono', monospace;">{{ rate }}%</span>
              </div>
            </div>
          </div>
        </section>

        <!-- ═══════════════════════════════════════════════════════
             DOCUMENT FOOTER
             ═══════════════════════════════════════════════════════ -->
        <div class="mt-16 pt-4" style="border-top: 3px solid #111827;">
          <div class="flex items-center justify-between text-xs text-gray-400" style="font-family: 'JetBrains Mono', monospace;">
            <span>PASSPORT {{ passport.passportId }}</span>
            <span>CREATED BY {{ passport.creatorMsp || 'ManufacturerMSP' }}</span>
            <span>LAST UPDATED {{ formatDate(passport.updatedAt) }}</span>
          </div>
        </div>

      </div>

      <!-- ═══ MODALS (preserved from existing code, minimal styling) ═══ -->

      <!-- Bind to Vehicle Modal -->
      <div v-if="showBindModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(0,0,0,0.3);" @click.self="showBindModal = false">
        <div class="bg-white w-full max-w-md p-6 shadow-lg border border-gray-200">
          <h3 class="text-lg font-bold text-gray-900 mb-4">차량 바인딩</h3>
          <div class="space-y-3">
            <div><label class="text-xs font-semibold text-gray-500 uppercase">VIN *</label><input v-model="bindForm.vin" class="w-full mt-1 px-3 py-2 border border-gray-200 text-sm" placeholder="Vehicle ID" /></div>
            <div><label class="text-xs font-semibold text-gray-500 uppercase">장착일</label><input v-model="bindForm.installDate" type="date" class="w-full mt-1 px-3 py-2 border border-gray-200 text-sm" /></div>
            <div><label class="text-xs font-semibold text-gray-500 uppercase">EV 제조사</label><input v-model="bindForm.evManufacturer" class="w-full mt-1 px-3 py-2 border border-gray-200 text-sm" /></div>
            <div><label class="text-xs font-semibold text-gray-500 uppercase">조립국</label><input v-model="bindForm.evAssemblyCountry" class="w-full mt-1 px-3 py-2 border border-gray-200 text-sm" /></div>
          </div>
          <div class="flex justify-end gap-2 mt-5">
            <button @click="showBindModal = false" class="px-4 py-2 text-sm text-gray-500 border border-gray-200 hover:bg-gray-50">취소</button>
            <button @click="submitBind" :disabled="submitting" class="px-4 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800">바인딩</button>
          </div>
        </div>
      </div>

      <!-- Maintenance Request Modal -->
      <div v-if="showMaintenanceRequestModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(0,0,0,0.3);" @click.self="showMaintenanceRequestModal = false">
        <div class="bg-white w-full max-w-md p-6 shadow-lg border border-gray-200">
          <h3 class="text-lg font-bold text-gray-900 mb-4">정비 요청</h3>
          <div class="space-y-3">
            <div><label class="text-xs font-semibold text-gray-500 uppercase">사유</label><textarea v-model="maintenanceForm.description" rows="3" class="w-full mt-1 px-3 py-2 border border-gray-200 text-sm" placeholder="정비 요청 사유"></textarea></div>
          </div>
          <div class="flex justify-end gap-2 mt-5">
            <button @click="showMaintenanceRequestModal = false" class="px-4 py-2 text-sm text-gray-500 border border-gray-200">취소</button>
            <button @click="submitMaintenanceRequest" :disabled="submitting" class="px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700">요청</button>
          </div>
        </div>
      </div>

      <!-- Maintenance Log Modal -->
      <div v-if="showMaintenanceLogModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(0,0,0,0.3);" @click.self="showMaintenanceLogModal = false">
        <div class="bg-white w-full max-w-md p-6 shadow-lg border border-gray-200">
          <h3 class="text-lg font-bold text-gray-900 mb-4">정비 완료 기록</h3>
          <div class="space-y-3">
            <div><label class="text-xs font-semibold text-gray-500 uppercase">일자</label><input v-model="maintenanceForm.date" type="date" class="w-full mt-1 px-3 py-2 border border-gray-200 text-sm" /></div>
            <div><label class="text-xs font-semibold text-gray-500 uppercase">유형</label><input v-model="maintenanceForm.type" class="w-full mt-1 px-3 py-2 border border-gray-200 text-sm" placeholder="정기점검, 수리 등" /></div>
            <div><label class="text-xs font-semibold text-gray-500 uppercase">내용</label><textarea v-model="maintenanceForm.description" rows="3" class="w-full mt-1 px-3 py-2 border border-gray-200 text-sm" placeholder="정비 내용"></textarea></div>
            <div><label class="text-xs font-semibold text-gray-500 uppercase">정비사</label><input v-model="maintenanceForm.technician" class="w-full mt-1 px-3 py-2 border border-gray-200 text-sm" /></div>
          </div>
          <div class="flex justify-end gap-2 mt-5">
            <button @click="showMaintenanceLogModal = false" class="px-4 py-2 text-sm text-gray-500 border border-gray-200">취소</button>
            <button @click="submitMaintenanceLog" :disabled="submitting" class="px-4 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800">기록</button>
          </div>
        </div>
      </div>

      <!-- Accident Log Modal -->
      <div v-if="showAccidentLogModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(0,0,0,0.3);" @click.self="showAccidentLogModal = false">
        <div class="bg-white w-full max-w-md p-6 shadow-lg border border-gray-200">
          <h3 class="text-lg font-bold text-gray-900 mb-4">사고 기록</h3>
          <div class="space-y-3">
            <div><label class="text-xs font-semibold text-gray-500 uppercase">심각도</label>
              <select v-model="accidentForm.severity" class="w-full mt-1 px-3 py-2 border border-gray-200 text-sm">
                <option value="minor">경미</option><option value="moderate">보통</option><option value="severe">심각</option><option value="critical">위험</option>
              </select>
            </div>
            <div><label class="text-xs font-semibold text-gray-500 uppercase">설명</label><textarea v-model="accidentForm.description" rows="3" class="w-full mt-1 px-3 py-2 border border-gray-200 text-sm"></textarea></div>
            <div><label class="text-xs font-semibold text-gray-500 uppercase">보고자</label><input v-model="accidentForm.reporter" class="w-full mt-1 px-3 py-2 border border-gray-200 text-sm" /></div>
          </div>
          <div class="flex justify-end gap-2 mt-5">
            <button @click="showAccidentLogModal = false" class="px-4 py-2 text-sm text-gray-500 border border-gray-200">취소</button>
            <button @click="submitAccidentLog" :disabled="submitting" class="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700">기록</button>
          </div>
        </div>
      </div>

      <style>
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
    </div>
  `
});
