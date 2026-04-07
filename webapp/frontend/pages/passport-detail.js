app.component('passport-detail-page', {
  props: ['auth', 'api'],
  emits: ['navigate'],
  setup(props, { emit }) {
    const { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } = Vue;

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
    const railMinimized = ref(false);
    const railPosition = ref({ x: 24, y: 88 });
    const railDragging = ref(false);

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
      if (soc == null) return 'bg-gray-100';
      if (soc >= 60) return 'bg-[#34d399]';
      if (soc >= 30) return 'bg-[#fbbf24]';
      return 'bg-[#ef4444]';
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
      if (num & 0x01) badges.push({ label: '충전중', color: 'bg-[rgba(200,255,0,0.08)] text-emerald-600 border-emerald-500' });
      if (num & 0x02) badges.push({ label: '밸런싱', color: 'bg-[rgba(200,255,0,0.08)] text-emerald-600 border-emerald-500' });
      if (num & 0x04) badges.push({ label: '결함', color: 'bg-[rgba(239,68,68,0.1)] text-[#ff6b6b] border-gray-200' });
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
      { key: 'identity', label: '개요', icon: 'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0' },
      { key: 'compliance', label: '규제·소재', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
      { key: 'traceability', label: '운영 이력', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
      { key: 'data', label: '진단 데이터', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
      { key: 'trust', label: '증빙', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
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
      try {
        const savedRail = JSON.parse(localStorage.getItem('bp_detail_rail') || 'null');
        if (savedRail && savedRail.version === 2) {
          railMinimized.value = !!savedRail.minimized;
          if (typeof savedRail.x === 'number' && typeof savedRail.y === 'number') {
            railPosition.value = clampRailPosition(savedRail.x, savedRail.y);
          }
        } else {
          railPosition.value = clampRailPosition(window.innerWidth - 308, 96);
        }
      } catch {}
      fetchPassport();
      setTimeout(() => { gaugeReady.value = true; }, 200);
    });

    onBeforeUnmount(() => {
      persistRailState();
    });

    async function fetchPassport() {
      if (!passportId.value) { loading.value = false; return; }
      loading.value = true;
      try {
        passport.value = await props.api.get('/passports/' + passportId.value);
        checkVehicleImage();
        fetchLinkedMaterials();
        // All sections always visible — fetch all data on load
        fetchBmuData();
        fetchHistory();
        fetchVcList();
        fetchCorrectionHistory();
        setTimeout(generateQr, 300);
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
      { value: 'BATTERY_HEALTH', label: '배터리 상태', org: MSP.SERVICE },
      { value: 'MAINTENANCE', label: '정비 인증', org: MSP.SERVICE },
      { value: 'COMPLIANCE', label: '규제 준수', org: MSP.REGULATOR },
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
      if (perKwh <= 50) return { grade: 'A', color: 'text-emerald-600', bg: 'bg-[rgba(200,255,0,0.08)]', label: '매우 우수' };
      if (perKwh <= 75) return { grade: 'B', color: 'text-blue-600', bg: 'bg-[rgba(107,163,255,0.1)]', label: '우수' };
      if (perKwh <= 100) return { grade: 'C', color: 'text-amber-600', bg: 'bg-[rgba(255,184,0,0.1)]', label: '보통' };
      return { grade: 'D', color: 'text-[#ff6b6b]', bg: 'bg-[rgba(239,68,68,0.1)]', label: '개선 필요' };
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

    function switchTab(tab, options = {}) {
      activeTab.value = tab;
      const { scroll = false } = options;
      // persist tab in URL hash
      const hashStr = window.location.hash.replace('#', '');
      const [page] = hashStr.split('?');
      const params = new URLSearchParams(hashStr.split('?')[1] || '');
      params.set('tab', tab);
      window.location.hash = page + '?' + params.toString();
      if (tab === 'data') fetchBmuData();
      if (tab === 'trust') { fetchHistory(); fetchVcList(); fetchCorrectionHistory(); setTimeout(generateQr, 300); }
      if (scroll) {
        requestAnimationFrame(() => {
          document.getElementById('section-' + tab)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    }

    function persistRailState() {
      try {
        localStorage.setItem('bp_detail_rail', JSON.stringify({
          version: 2,
          minimized: railMinimized.value,
          x: railPosition.value.x,
          y: railPosition.value.y,
        }));
      } catch {}
    }

    function toggleRailMinimized() {
      railMinimized.value = !railMinimized.value;
      persistRailState();
    }

    function clampRailPosition(x, y) {
      const width = railMinimized.value ? 104 : 276;
      const maxX = Math.max(window.innerWidth - width - 16, 16);
      const maxY = Math.max(window.innerHeight - 84, 88);
      return {
        x: Math.min(Math.max(x, 16), maxX),
        y: Math.min(Math.max(y, 88), maxY),
      };
    }

    function startRailDrag(event) {
      if (event.target.closest('button')) return;
      railDragging.value = true;
      const startX = event.clientX;
      const startY = event.clientY;
      const origin = { ...railPosition.value };

      function onMove(moveEvent) {
        railPosition.value = clampRailPosition(
          origin.x - (startX - moveEvent.clientX),
          origin.y + (moveEvent.clientY - startY),
        );
      }

      function onUp() {
        railDragging.value = false;
        persistRailState();
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      }

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }

    const railStyle = computed(() => {
      if (railMinimized.value) {
        return `position:fixed;right:auto;left:${railPosition.value.x}px;top:${railPosition.value.y}px;z-index:40;width:88px;background:#fff;border:1px solid rgba(0,0,0,0.06);border-radius:18px;padding:12px;box-shadow:0 10px 24px rgba(15,23,42,0.08);`;
      }
      return `position:fixed;right:auto;left:${railPosition.value.x}px;top:${railPosition.value.y}px;z-index:40;width:260px;background:#fff;border:1px solid rgba(0,0,0,0.06);border-radius:18px;padding:18px 18px 16px;box-shadow:0 10px 24px rgba(15,23,42,0.08);`;
    });

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

    const hasLinkedMaterials = computed(() => (passport.value?.rawMaterials || []).length > 0);

    const dossierStateTitle = computed(() => {
      if (!passport.value) return '';
      if (passport.value.status === 'MAINTENANCE') return '정비 작업 진행';
      if (passport.value.status === 'RECYCLING') return '회수 판정 진행';
      return '문서 인계 상태';
    });

    const dossierStateNote = computed(() => {
      if (!passport.value) return '';
      if (passport.value.status === 'MAINTENANCE') {
        return '정비 요청, 처리 상태, 작업 완료 기록을 한 화면에서 확인합니다.';
      }
      if (passport.value.status === 'RECYCLING') {
        return '회수 판정, 추출 진행, 폐기 결정을 단계별로 검토합니다.';
      }
      return '식별, 규제, 이력 자료를 한 화면에서 확인합니다.';
    });

    const dossierActionLabel = computed(() => {
      if (!passport.value) return '';
      if (passport.value.status === 'MAINTENANCE') return '정비 완료 등록';
      if (passport.value.status === 'RECYCLING') return '추출 검토 또는 종료 판정';
      if (isManufacturer.value && !hasLinkedMaterials.value) return '원자재 연결';
      if (isEV.value && !passport.value.vin) return '차량 바인딩 진행';
      return '기술 문서 검토';
    });

    const headerSummaryItems = computed(() => {
      if (!passport.value) return [];
      return [
        { label: 'Passport ID', value: passport.value.passportId || '-' },
        { label: '배터리 ID', value: passport.value.batteryId || '-' },
        { label: '제조사', value: passport.value.manufacturerName || '-' },
        { label: '화학계열', value: passport.value.chemistry || '-' },
      ];
    });

    const operationSnapshotItems = computed(() => {
      if (!passport.value) return [];
      return [
        { label: '현재 상태', value: getStatusBadge(passport.value.status).label },
        { label: 'VIN 바인딩', value: passport.value.vin ? '완료' : '미완료' },
        { label: '회수 검토', value: passport.value.recycleAvailable ? '검토 대상' : '일반 운영' },
        { label: '최근 문서 갱신', value: formatDate(passport.value.updatedAt) },
      ];
    });

    const actionDeck = computed(() => {
      if (!passport.value) return [];
      const items = [];
      if (isManufacturer.value) {
        items.push({ key: 'link-materials', label: '원자재 연결', tone: 'blue' });
        items.push({ key: 'correct', label: '데이터 정정', tone: 'neutral' });
      }
      if (isEV.value) {
        if (!passport.value.vin) items.push({ key: 'bind', label: 'VIN 바인딩', tone: 'blue' });
        items.push({ key: 'maintenance-request', label: '정비 요청', tone: 'neutral' });
        items.push({ key: 'analysis-request', label: '분석 요청', tone: 'neutral' });
      }
      if (isService.value) {
        items.push({ key: 'maintenance-log', label: '정비 기록 추가', tone: 'blue' });
        items.push({ key: 'analysis-result', label: '분석 결과 등록', tone: 'neutral' });
      }
      if (isRegulator.value) {
        items.push({ key: 'recycle', label: '회수 판정', tone: 'blue' });
        items.push({ key: 'extract', label: '원자재 추출', tone: 'neutral' });
        items.push({ key: 'dispose', label: '폐기 처리', tone: 'danger' });
      }
      return items.slice(0, 4);
    });

    const timelineEvents = computed(() => {
      if (!passport.value) return [];
      const events = [];
      if (passport.value.createdAt) {
        events.push({ date: passport.value.createdAt, title: '여권 생성', note: passport.value.creatorMsp || '제조사 발급', tone: 'blue' });
      }
      if (passport.value.vin) {
        events.push({ date: passport.value.installDate || passport.value.updatedAt, title: '차량 바인딩 완료', note: passport.value.vin, tone: 'emerald' });
      }
      for (const log of maintenanceLogs.value || []) {
        events.push({ date: log.date, title: '정비 기록 추가', note: log.description || log.type || '-', tone: 'amber' });
      }
      for (const log of accidentLogs.value || []) {
        events.push({ date: log.date, title: '사고 기록 등록', note: log.description || log.severity || '-', tone: 'red' });
      }
      for (const item of correctionHistory.value || []) {
        events.push({ date: item.date, title: '문서 정정 반영', note: `${item.fieldName} → ${item.newValue}`, tone: 'slate' });
      }
      if (passport.value.recycleAvailable) {
        events.push({ date: passport.value.updatedAt, title: '회수 검토 대상 등록', note: '재활용 가능 상태', tone: 'teal' });
      }
      return events
        .filter((item) => item.date)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 6);
    });

    const latestBmuRecord = computed(() => {
      const sorted = [...(bmuRecords.value || [])].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
      return sorted[0] || null;
    });

    const invalidatedBmuCount = computed(() => (bmuRecords.value || []).filter((item) => item.status === 'INVALIDATED').length);

    const bmuOverviewCards = computed(() => {
      const latest = latestBmuRecord.value;
      if (!latest) return [];
      return [
        { label: 'SOC', value: latest.soc != null ? `${scaleSOC(latest.soc)}%` : '-' },
        { label: '전압', value: latest.voltage != null ? `${latest.voltage}V` : '-' },
        { label: '온도', value: latest.temperature != null ? `${scaleTemp(latest.temperature)}°C` : '-' },
        { label: '방전주기', value: latest.dischargeCycles != null ? `${latest.dischargeCycles}` : '-' },
        { label: '최근 수집', value: formatDate(latest.timestamp) },
        { label: '무효화', value: `${invalidatedBmuCount.value}건` },
      ];
    });

    const missingGbaFields = computed(() => {
      const groups = gbaCompliance.value.groups || [];
      return groups.flatMap((group) => group.fields.filter((field) => !field.filled)).slice(0, 6);
    });

    const trustSummaryCards = computed(() => {
      const activeVcCount = (vcList.value || []).filter((item) => item.status === 'ACTIVE').length;
      return [
        { label: '활성 VC', value: `${activeVcCount}건` },
        { label: '정정 이력', value: `${correctionHistory.value.length}건` },
        { label: '변경 이력', value: `${history.value.length}건` },
        { label: 'DID', value: passport.value?.did ? '연결됨' : '미연결' },
      ];
    });

    async function runPrimaryDossierAction() {
      if (!passport.value) return;
      if (passport.value.status === 'MAINTENANCE' && isService.value) {
        showMaintenanceLogModal.value = true;
        return;
      }
      if (passport.value.status === 'RECYCLING' && isRegulator.value) {
        if (passport.value.recycleAvailable) showExtractModal.value = true;
        else showRecycleModal.value = true;
        return;
      }
      if (isManufacturer.value && !hasLinkedMaterials.value) {
        await openLinkMaterialsModal();
        return;
      }
      if (isEV.value && !passport.value.vin) {
        showBindModal.value = true;
        return;
      }
      document.getElementById('section-traceability')?.scrollIntoView({ behavior: 'smooth' });
    }

    async function runActionDeckAction(actionKey) {
      if (actionKey === 'link-materials') return openLinkMaterialsModal();
      if (actionKey === 'correct') return showCorrectModal.value = true;
      if (actionKey === 'bind') return showBindModal.value = true;
      if (actionKey === 'maintenance-request') return showMaintenanceRequestModal.value = true;
      if (actionKey === 'analysis-request') return showAnalysisRequestModal.value = true;
      if (actionKey === 'maintenance-log') return showMaintenanceLogModal.value = true;
      if (actionKey === 'analysis-result') return showAnalysisResultModal.value = true;
      if (actionKey === 'recycle') return showRecycleModal.value = true;
      if (actionKey === 'extract') return showExtractModal.value = true;
      if (actionKey === 'dispose') return showDisposeConfirm.value = true;
    }

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
        window.$toast('success', newIds.length + '개의 원자재가 연결되었습니다.');
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
      hasLinkedMaterials, dossierStateTitle, dossierStateNote, dossierActionLabel, runPrimaryDossierAction,
      headerSummaryItems, operationSnapshotItems, actionDeck, runActionDeckAction,
      timelineEvents, latestBmuRecord, bmuOverviewCards, missingGbaFields, trustSummaryCards,
      railMinimized, railStyle, railDragging, toggleRailMinimized, startRailDrag,
    };
  },
  template: `
    <div class="min-h-full">

      <!-- ===== CERTIFICATE HEADER ===== -->
      <div class="mb-6">
        <button @click="goBack" class="sn-btn sn-btn-ghost mb-4" style="padding: 0.45rem 0.9rem; font-size: 0.75rem;">
          ← 목록으로
        </button>

        <div v-if="passport" style="display:flex;flex-direction:column;gap:18px;">
          <section style="background:#fff;border:1px solid rgba(0,0,0,0.06);border-radius:24px;padding:20px 24px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:20px;flex-wrap:wrap;">
              <div style="display:flex;flex-direction:column;gap:10px;max-width:54rem;">
                <p class="sn-eyebrow" style="margin:0;color:#1769e0;">기술 문서</p>
                <h1 class="sn-display" style="font-size:2rem;margin:0;">{{ passport.model || '배터리 여권 문서' }}</h1>
                <p class="sn-body" style="margin:0;">{{ dossierStateNote }}</p>
                <div style="display:flex;flex-wrap:wrap;gap:8px 18px;">
                  <div v-for="item in headerSummaryItems" :key="item.label" style="display:flex;align-items:center;gap:8px;min-width:180px;">
                    <span class="sn-eyebrow" style="margin:0;min-width:72px;">{{ item.label }}</span>
                    <span style="font-size:14px;font-weight:700;color:#0f172a;word-break:break-all;">{{ item.value }}</span>
                  </div>
                </div>
              </div>
              <div style="display:flex;flex-direction:column;align-items:flex-end;gap:10px;min-width:220px;flex:1;">
                <span :class="['sn-badge', getStatusBadge(passport.status).bg, getStatusBadge(passport.status).text, 'border', getStatusBadge(passport.status).border]" style="font-size:12px;padding:6px 12px;">{{ getStatusBadge(passport.status).label }}</span>
                <div style="text-align:right;">
                  <p class="sn-caption" style="margin:0 0 4px;">최근 문서 갱신</p>
                  <p style="margin:0;font-size:14px;font-weight:700;color:#0f172a;">{{ formatDate(passport.updatedAt) }}</p>
                </div>
                <div style="display:flex;flex-wrap:wrap;justify-content:flex-end;gap:10px;">
                  <button @click="runPrimaryDossierAction" style="display:inline-flex;align-items:center;gap:8px;padding:11px 16px;border:none;border-radius:12px;background:#1769e0;color:#fff;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 12px 24px rgba(23,105,224,0.18);">
                    {{ dossierActionLabel }}
                  </button>
                  <button @click="copyToClipboard(qrUrl)" style="display:inline-flex;align-items:center;gap:8px;padding:11px 16px;border:1px solid rgba(0,0,0,0.08);border-radius:12px;background:#fff;color:#334155;font-size:13px;font-weight:700;cursor:pointer;">
                    문서 링크 복사
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section style="display:grid;grid-template-columns:0.96fr 1.04fr;gap:14px;align-items:stretch;">
            <article style="background:#fff;border:1px solid rgba(0,0,0,0.06);border-radius:20px;padding:16px 18px;box-shadow:0 1px 3px rgba(0,0,0,0.05);display:flex;flex-direction:column;min-height:248px;">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;">
                <div>
                  <p class="sn-eyebrow" style="margin:0 0 6px;">식별 정보</p>
                  <h2 class="sn-heading" style="font-size:1rem;margin:0;">핵심 식별</h2>
                </div>
                <span style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:12px;background:#eef5ff;color:#1769e0;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="3" width="14" height="18" rx="2"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                </span>
              </div>
              <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;flex:1;">
                <div v-for="item in [
                  { label: '시리얼', value: passport.serialNumber || '-' },
                  { label: '제조일', value: formatDate(passport.manufactureDate) },
                  { label: '제조국', value: passport.manufactureCountry || '-' },
                  { label: '셀 유형', value: passport.cellType || '-' },
                  { label: '총 에너지', value: passport.totalEnergy ? passport.totalEnergy + ' kWh' : '-' },
                  { label: '무게', value: passport.weight ? passport.weight + ' kg' : '-' },
                ]" :key="item.label" style="display:flex;flex-direction:column;justify-content:center;min-height:68px;padding:12px 14px;border-radius:14px;background:#f8fafc;border:1px solid rgba(15,23,42,0.04);">
                  <p class="sn-caption" style="margin:0 0 6px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">{{ item.label }}</p>
                  <p style="margin:0;font-size:20px;font-weight:800;color:#0f172a;word-break:break-word;line-height:1.1;">{{ item.value }}</p>
                </div>
              </div>
            </article>

            <article style="background:#fff;border:1px solid rgba(0,0,0,0.06);border-radius:20px;padding:16px 18px;box-shadow:0 1px 3px rgba(0,0,0,0.05);display:flex;flex-direction:column;min-height:248px;">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;">
                <div>
                  <p class="sn-eyebrow" style="margin:0 0 6px;">운영 상태</p>
                  <h2 class="sn-heading" style="font-size:1rem;margin:0;">운영 상태</h2>
                </div>
                <span style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:12px;background:#eefaf3;color:#10b981;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                </span>
              </div>
              <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;flex:1;">
                <div v-for="item in operationSnapshotItems" :key="item.label" style="display:flex;flex-direction:column;justify-content:center;min-height:68px;padding:12px 14px;border-radius:14px;background:#f8fafc;border:1px solid rgba(15,23,42,0.04);">
                  <span class="sn-caption" style="color:#64748b;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px;">{{ item.label }}</span>
                  <span style="font-size:20px;font-weight:800;color:#0f172a;line-height:1.1;">{{ item.value }}</span>
                </div>
                <div style="grid-column:1 / -1;padding:12px 14px;border-radius:14px;background:linear-gradient(135deg,#eef5ff 0%,#f8fbff 100%);border:1px solid rgba(23,105,224,0.08);min-height:68px;display:flex;flex-direction:column;justify-content:center;">
                  <p class="sn-caption" style="margin:0 0 6px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">문서 상태</p>
                  <p style="margin:0;font-size:20px;font-weight:800;color:#0f172a;line-height:1.1;">{{ dossierStateTitle }}</p>
                </div>
              </div>
            </article>

          </section>
        </div>
      </div>

      <!-- ===== LOADING ===== -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-24">
        <div class="relative">
          <div class="w-12 h-12 border-4 border-emerald-100 rounded-full"></div>
          <div class="absolute top-0 left-0 w-12 h-12 border-4 border-emerald-600 rounded-full animate-spin border-t-transparent"></div>
        </div>
        <p class="mt-4 text-sm text-gray-400">데이터를 불러오는 중...</p>
      </div>

      <!-- ===== NO PASSPORT ===== -->
      <div v-else-if="!passport" class="bg-white  border border-gray-200 shadow-none py-20 px-8 text-center">
        <div class="mx-auto w-16 h-16 bg-gray-100  flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-600 mb-1">여권 정보를 찾을 수 없습니다</h3>
        <p class="text-sm text-gray-400 mb-6">요청한 여권 ID에 해당하는 데이터가 없습니다.</p>
        <button @click="goBack" class="inline-flex items-center gap-2 px-5 py-2.5 bg-[#16a34a] hover:bg-[#15803d] text-white font-medium text-sm  transition-colors">
          목록으로 돌아가기
        </button>
      </div>

      <!-- ===== MAIN CONTENT ===== -->
      <div v-else>

        <!-- Tab Navigation (scroll-to-section) -->
        <div class="bg-white  border border-gray-200 shadow-none mb-6 overflow-hidden" style="position: sticky; top: 0; z-index: 10; background: #fff; border-bottom: 1px solid rgba(0,0,0,0.06); box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
          <div class="relative">
            <!-- Bottom border line (full width) -->
            <div class="absolute bottom-0 left-0 right-0 h-[2px]" style="background: #e5e7eb;"></div>
            <div class="flex overflow-x-auto">
              <button v-for="tab in tabs" :key="tab.key"
                @click="switchTab(tab.key, { scroll: true })"
                class="sn-tab relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all whitespace-nowrap min-w-0"
                :style="activeTab === tab.key ? 'color:#1769e0;background:#eef5ff;border-bottom:2px solid #1769e0;' : 'color:#9ca3af;background:transparent;'">
                <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" :d="tab.icon"/>
                </svg>
                {{ tab.label }}
              </button>
            </div>
          </div>
        </div>

        <aside class="hidden xl:block" :style="railStyle + 'pointer-events:auto;'" @mousedown.stop>
            <div
              @mousedown="startRailDrag"
              :style="railDragging ? 'display:flex;align-items:center;justify-content:space-between;gap:8px;margin:-6px -6px 10px;padding:8px 10px;border-radius:12px;background:#eef5ff;cursor:grabbing;' : 'display:flex;align-items:center;justify-content:space-between;gap:8px;margin:-6px -6px 10px;padding:8px 10px;border-radius:12px;background:#f8fafc;cursor:grab;'"
            >
              <div style="min-width:0;">
                <p class="sn-eyebrow" style="margin:0 0 4px;">작업 패널</p>
                <h3 class="sn-heading" style="font-size:0.98rem;margin:0;">문서 조치</h3>
              </div>
              <button @click.stop="toggleRailMinimized" style="width:30px;height:30px;border:none;border-radius:10px;background:#fff;color:#64748b;font-size:16px;font-weight:700;cursor:pointer;">
                {{ railMinimized ? '＋' : '－' }}
              </button>
            </div>
            <div v-if="railMinimized" style="display:flex;align-items:center;justify-content:center;padding:6px 0 2px;">
              <button @click="toggleRailMinimized" style="display:flex;align-items:center;justify-content:center;width:44px;height:44px;border:none;border-radius:14px;background:#1769e0;color:#fff;font-size:20px;font-weight:700;cursor:pointer;">⚡</button>
            </div>
            <div v-else style="display:flex;flex-direction:column;gap:10px;">
              <div style="padding:12px 14px;border-radius:14px;background:#f8fafc;">
                <p class="sn-caption" style="margin:0 0 6px;">현재 상태</p>
                <p style="margin:0;font-size:14px;font-weight:800;color:#0f172a;">{{ dossierStateTitle }}</p>
              </div>
              <div style="padding:12px 14px;border-radius:14px;background:#eef5ff;border:1px solid rgba(23,105,224,0.08);">
                <p class="sn-caption" style="margin:0 0 6px;">다음 조치</p>
                <p style="margin:0;font-size:14px;font-weight:800;color:#0f172a;">{{ dossierActionLabel }}</p>
              </div>
              <button @click="runPrimaryDossierAction" style="display:flex;align-items:center;justify-content:center;padding:11px 14px;border:none;border-radius:12px;background:#1769e0;color:#fff;font-size:13px;font-weight:700;cursor:pointer;">
                {{ dossierActionLabel }}
              </button>
              <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;">
                <button
                  v-for="item in actionDeck.slice(0, 2)"
                  :key="item.key"
                  @click="runActionDeckAction(item.key)"
                  style="display:flex;align-items:center;justify-content:center;padding:10px 8px;border:1px solid rgba(0,0,0,0.08);border-radius:12px;background:#fff;color:#334155;font-size:12px;font-weight:700;cursor:pointer;"
                >
                  {{ item.label }}
                </button>
              </div>
              <button @click="switchTab('data', { scroll: true })" style="display:flex;align-items:center;justify-content:center;padding:11px 14px;border:1px solid rgba(0,0,0,0.08);border-radius:12px;background:#fff;color:#334155;font-size:13px;font-weight:700;cursor:pointer;">
                진단 데이터 보기
              </button>
              <button @click="switchTab('trust', { scroll: true })" style="display:flex;align-items:center;justify-content:center;padding:11px 14px;border:1px solid rgba(0,0,0,0.08);border-radius:12px;background:#fff;color:#334155;font-size:13px;font-weight:700;cursor:pointer;">
                증빙 확인
              </button>
            </div>
        </aside>

        <div class="xl:pr-[0px]">
        <!-- ==================== TAB 1: IDENTITY ==================== -->
        <div v-show="activeTab === 'identity'" id="section-identity" class="space-y-5">

          <!-- Section Header -->
          <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.6rem; padding-top: 0.35rem;">
            <div style="width: 4px; height: 24px; border-radius: 2px; background: #2563eb;"></div>
            <h2 style="font-size: 1rem; font-weight: 600; color: var(--color-text-1); margin: 0;">개요</h2>
          </div>

          <!-- Identity Spec Grid — OpenBattery style: large label + big value, 3-column -->
          <div class="bg-white  border border-gray-200 shadow-none overflow-hidden" style="background: #ffffff;">
            <div class="px-6 py-4 border-b border-gray-200 flex items-center gap-2.5">
              <div class="w-8 h-8 bg-[rgba(200,255,0,0.08)] rounded flex items-center justify-center">
                <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0"/>
                </svg>
              </div>
              <h3 class="sn-heading text-sm font-bold text-gray-900 uppercase tracking-wider">배터리 식별정보</h3>
            </div>
            <div class="p-6">
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                <div>
                  <p class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">여권 ID</p>
                  <p class="text-lg font-bold text-gray-900 font-mono break-all">{{ passport.passportId || '-' }}</p>
                </div>
                <div>
                  <p class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">배터리 ID</p>
                  <p class="text-lg font-bold text-gray-900 font-mono break-all">{{ passport.batteryId || '-' }}</p>
                </div>
                <div>
                  <p class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">시리얼번호</p>
                  <p class="text-lg font-bold text-gray-900">{{ passport.serialNumber || '-' }}</p>
                </div>
                <div>
                  <p class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">모델</p>
                  <p class="text-lg font-bold text-gray-900">{{ passport.model || '-' }}</p>
                </div>
                <div>
                  <p class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">제조사</p>
                  <p class="text-lg font-bold text-gray-900">{{ passport.manufacturerName || '-' }}</p>
                </div>
                <div>
                  <p class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">제조국가</p>
                  <p class="text-lg font-bold text-gray-900">{{ passport.manufactureCountry || '-' }}</p>
                </div>
                <div>
                  <p class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">셀 제조사</p>
                  <p class="text-lg font-bold text-gray-900">{{ passport.cellManufacturer || '-' }}</p>
                </div>
                <div>
                  <p class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">셀 제조국가</p>
                  <p class="text-lg font-bold text-gray-900">{{ passport.cellManufactureCountry || '-' }}</p>
                </div>
                <div>
                  <p class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">제조일자</p>
                  <p class="text-lg font-bold text-gray-900">{{ formatDate(passport.manufactureDate) }}</p>
                </div>
                <div>
                  <p class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">셀 유형</p>
                  <p class="text-lg font-bold text-gray-900">{{ passport.cellType || '-' }}</p>
                </div>
                <div>
                  <p class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">화학물질</p>
                  <p class="text-lg font-bold text-gray-900">
                    <span v-if="passport.chemistry" class="inline-flex items-center px-2.5 py-0.5 bg-[rgba(200,255,0,0.08)] text-emerald-600 rounded text-sm font-bold border border-emerald-100">{{ passport.chemistry }}</span>
                    <span v-else>-</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Performance & Durability — OpenBattery hero spec grid -->
          <div class="bg-white  border border-gray-200 shadow-none overflow-hidden" style="background: #ffffff;">
            <div class="px-6 py-4 border-b border-gray-200 flex items-center gap-2.5">
              <div class="w-8 h-8 bg-[rgba(200,255,0,0.08)] rounded flex items-center justify-center">
                <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/>
                </svg>
              </div>
              <h3 class="sn-heading text-sm font-bold text-gray-900 uppercase tracking-wider">성능 및 내구성</h3>
            </div>
            <div class="p-6 space-y-6">
              <!-- 정격용량 (단독, 크게) -->
              <div>
                <p class="text-xs text-gray-400 mb-1">정격용량</p>
                <p class="text-3xl font-bold text-gray-900">{{ passport.ratedCapacity || '--' }} Ah</p>
              </div>
              <div class="border-t border-gray-200"></div>
              <!-- 전압 3열 -->
              <div class="grid grid-cols-3 gap-x-8">
                <div>
                  <p class="text-xs text-gray-400 mb-1">공칭 전압</p>
                  <p class="text-2xl font-bold text-gray-900">{{ parseVoltageRange(passport.voltageRange).nom }} V</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 mb-1">최소 전압</p>
                  <p class="text-2xl font-bold text-gray-900">{{ parseVoltageRange(passport.voltageRange).min }} V</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 mb-1">최대 전압</p>
                  <p class="text-2xl font-bold text-gray-900">{{ parseVoltageRange(passport.voltageRange).max }} V</p>
                </div>
              </div>
              <div class="border-t border-gray-200"></div>
              <!-- 에너지/무게 3열 -->
              <div class="grid grid-cols-3 gap-x-8">
                <div>
                  <p class="text-xs text-gray-400 mb-1">총 에너지</p>
                  <p class="text-2xl font-bold text-gray-900">{{ passport.totalEnergy || '--' }} kWh</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 mb-1">에너지밀도</p>
                  <p class="text-2xl font-bold text-gray-900">{{ passport.energyDensity || '--' }} Wh/kg</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 mb-1">무게</p>
                  <p class="text-2xl font-bold text-gray-900">{{ passport.weight || '--' }} kg</p>
                </div>
              </div>
              <div class="border-t border-gray-200"></div>
              <!-- 수명/셀 3열 -->
              <div class="grid grid-cols-3 gap-x-8">
                <div>
                  <p class="text-xs text-gray-400 mb-1">예상수명</p>
                  <p class="text-2xl font-bold text-gray-900">{{ passport.expectedLifespan || '--' }} <span class="text-base font-medium text-gray-400">cycles</span></p>
                  <p v-if="passport.expectedLifespan" class="text-xs text-gray-400 mt-0.5">약 {{ Math.round(passport.expectedLifespan / 365) }}년</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 mb-1">셀 수</p>
                  <p class="text-2xl font-bold text-gray-900">{{ passport.cellCount || '--' }} 개</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 mb-1">화학물질</p>
                  <p class="text-2xl font-bold text-gray-900">{{ passport.chemistry || '--' }}</p>
                </div>
              </div>
              <div class="border-t border-gray-200"></div>
              <!-- 온도/셀유형 2열 -->
              <div class="grid grid-cols-2 gap-x-8">
                <div>
                  <p class="text-xs text-gray-400 mb-1">사용 온도 범위</p>
                  <p class="text-2xl font-bold text-gray-900">{{ parseTempRange(passport.temperatureRange).min }}&deg;C ~ {{ parseTempRange(passport.temperatureRange).max }}&deg;C</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 mb-1">셀 유형</p>
                  <p class="text-2xl font-bold text-gray-900">{{ passport.cellType || '--' }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- EV Binding -->
          <div class="bg-white  border border-gray-200 shadow-none overflow-hidden" style="background: #ffffff;">
            <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 bg-[rgba(200,255,0,0.08)] rounded flex items-center justify-center">
                  <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101"/>
                  </svg>
                </div>
                <h3 class="sn-heading text-sm font-bold text-gray-900 uppercase tracking-wider">EV 바인딩</h3>
              </div>
              <button v-if="isEV && !passport.vin" @click="showBindModal = true"
                class="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#16a34a] hover:bg-[#15803d] text-white font-medium text-xs rounded transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                </svg>
                VIN 바인딩
              </button>
            </div>
            <div class="p-5">
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-4">
                <div>
                  <p class="sn-eyebrow" style="margin:0 0 4px;font-size:11px;">vin</p>
                  <p style="margin:0;font-size:18px;font-weight:800;color:#0f172a;font-family:var(--font-mono);">
                    <span v-if="passport.vin" class="text-gray-900">{{ passport.vin }}</span>
                    <span v-else class="text-gray-300">미등록</span>
                  </p>
                </div>
                <div>
                  <p class="sn-eyebrow" style="margin:0 0 4px;font-size:11px;">ev 제조사</p>
                  <p style="margin:0;font-size:18px;font-weight:800;color:#0f172a;">{{ passport.evManufacturer || '-' }}</p>
                </div>
                <div>
                  <p class="sn-eyebrow" style="margin:0 0 4px;font-size:11px;">장착일자</p>
                  <p style="margin:0;font-size:18px;font-weight:800;color:#0f172a;">{{ formatDate(passport.installDate) }}</p>
                </div>
                <div>
                  <p class="sn-eyebrow" style="margin:0 0 4px;font-size:11px;">ev 조립국가</p>
                  <p style="margin:0;font-size:18px;font-weight:800;color:#0f172a;">{{ passport.evAssemblyCountry || '-' }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- SOC / SOH / SOCE Gauges -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <!-- SOC Gauge -->
            <div class="bg-white  border border-gray-200 shadow-none p-4 flex flex-col items-center" style="background: #ffffff;">
              <p class="sn-eyebrow" style="margin-bottom:4px;">diagnostics</p>
              <h4 class="sn-heading" style="font-size:0.95rem;margin:0 0 10px;">SOC</h4>
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
            <div class="bg-white  border border-gray-200 shadow-none p-4 flex flex-col items-center" style="background: #ffffff;">
              <p class="sn-eyebrow" style="margin-bottom:4px;">diagnostics</p>
              <h4 class="sn-heading" style="font-size:0.95rem;margin:0 0 10px;">SOH</h4>
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
            <div class="bg-white  border border-gray-200 shadow-none p-4 flex flex-col items-center" style="background: #ffffff;">
              <p class="sn-eyebrow" style="margin-bottom:4px;">diagnostics</p>
              <h4 class="sn-heading" style="font-size:0.95rem;margin:0 0 10px;">SOCE</h4>
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
        <div v-show="activeTab === 'compliance'" id="section-compliance" class="space-y-5" style="margin-top: 2rem;">

          <!-- Section Header -->
          <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.6rem; padding-top: 0.35rem;">
            <div style="width: 4px; height: 24px; border-radius: 2px; background: #16a34a;"></div>
            <h2 style="font-size: 1rem; font-weight: 600; color: var(--color-text-1); margin: 0;">규제·소재</h2>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
            <div style="background:#fff;border:1px solid rgba(0,0,0,0.06);border-radius:16px;padding:14px 16px;">
              <p class="sn-eyebrow" style="margin:0 0 6px;font-size:11px;">규제 요약</p>
              <p class="sn-caption" style="margin:0 0 6px;">GBA 준수율</p>
              <p style="margin:0;font-size:22px;font-weight:800;color:#0f172a;">{{ gbaCompliance.pct }}%</p>
              <p class="sn-caption" style="margin-top:4px;">{{ gbaCompliance.filled }}/21 항목 완료</p>
            </div>
            <div style="background:#fff;border:1px solid rgba(0,0,0,0.06);border-radius:16px;padding:14px 16px;">
              <p class="sn-eyebrow" style="margin:0 0 6px;font-size:11px;">규제 요약</p>
              <p class="sn-caption" style="margin:0 0 6px;">미완료 항목</p>
              <p style="margin:0;font-size:22px;font-weight:800;color:#0f172a;">{{ 21 - gbaCompliance.filled }}개</p>
              <p class="sn-caption" style="margin-top:4px;">우선 보완 대상 중심</p>
            </div>
            <div style="background:#fff;border:1px solid rgba(0,0,0,0.06);border-radius:16px;padding:14px 16px;">
              <p class="sn-eyebrow" style="margin:0 0 6px;font-size:11px;">소재 요약</p>
              <p class="sn-caption" style="margin:0 0 6px;">원자재 연결</p>
              <p style="margin:0;font-size:22px;font-weight:800;color:#0f172a;">{{ linkedMaterialDetails.length }}종</p>
              <p class="sn-caption" style="margin-top:4px;">소재 출처 및 인증 추적</p>
            </div>
            <div style="background:#fff;border:1px solid rgba(0,0,0,0.06);border-radius:16px;padding:14px 16px;">
              <p class="sn-eyebrow" style="margin:0 0 6px;font-size:11px;">소재 요약</p>
              <p class="sn-caption" style="margin:0 0 6px;">탄소 발자국</p>
              <p style="margin:0;font-size:22px;font-weight:800;color:#0f172a;">{{ estimatedCarbonFootprint != null ? estimatedCarbonFootprint + ' kg' : 'N/A' }}</p>
              <p class="sn-caption" style="margin-top:4px;">{{ carbonGrade ? carbonGrade.label : '계산 대기' }}</p>
            </div>
          </div>

          <div style="background:#fff;border:1px solid rgba(0,0,0,0.06);border-radius:18px;padding:18px 20px;">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;">
              <div>
                <p class="sn-eyebrow" style="margin:0 0 6px;">우선 보완</p>
                <h3 class="sn-heading" style="font-size:0.98rem;margin:0;">우선 보완이 필요한 항목</h3>
              </div>
              <span class="sn-caption">상위 6개만 노출</span>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;">
              <span v-for="field in missingGbaFields" :key="field.idx" style="display:inline-flex;align-items:center;gap:6px;padding:8px 10px;border-radius:999px;background:#fff7ed;color:#b45309;font-size:12px;font-weight:700;border:1px solid rgba(245,158,11,0.14);">
                <span style="width:6px;height:6px;border-radius:50%;background:#f59e0b;"></span>
                {{ field.label }}
              </span>
              <span v-if="!missingGbaFields.length" style="display:inline-flex;align-items:center;gap:6px;padding:8px 10px;border-radius:999px;background:#eefaf3;color:#059669;font-size:12px;font-weight:700;border:1px solid rgba(16,185,129,0.12);">
                모든 핵심 항목이 채워졌습니다
              </span>
            </div>
          </div>

          <!-- Large Circular Gauge — OpenBattery style -->
          <details class="bg-white border border-gray-200 shadow-none overflow-hidden" style="background:#ffffff;">
            <summary style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;cursor:pointer;list-style:none;">
              <div>
                <p class="sn-eyebrow" style="margin:0 0 4px;">상세 체크리스트</p>
                <h3 class="sn-heading" style="font-size:0.98rem;margin:0;">GBA 상세 체크리스트</h3>
              </div>
              <span class="sn-caption">열어서 전체 항목 확인</span>
            </summary>
            <div class="px-6 py-5 border-b border-gray-200">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded flex items-center justify-center"
                     :class="gbaCompliance.allFilled ? 'bg-[rgba(200,255,0,0.08)]' : 'bg-[rgba(255,184,0,0.1)]'">
                  <svg class="w-5 h-5" :class="gbaCompliance.allFilled ? 'text-emerald-600' : 'text-amber-600'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <polyline points="9 12 11 14 15 10"/>
                  </svg>
                </div>
                <div>
                  <h2 class="text-base font-semibold text-gray-900">GBA 21 규제 준수</h2>
                  <p class="text-xs text-gray-400 mt-0.5">Global Battery Alliance 21가지 데이터 항목</p>
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

              <!-- Key metrics row -->
              <div class="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-8">
                <div class="bg-[#fafafa]  p-4 text-center border border-gray-200">
                  <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">GBA 준수</p>
                  <p class="text-xl font-bold text-emerald-600">{{ gbaCompliance.pct }}%</p>
                </div>
                <div class="bg-[#fafafa]  p-4 text-center border border-gray-200">
                  <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">무게</p>
                  <p class="text-xl font-bold text-gray-900">{{ passport.weight || 'N/A' }}<span v-if="passport.weight" class="text-xs font-normal text-gray-400 ml-0.5">kg</span></p>
                </div>
                <div class="bg-[#fafafa]  p-4 text-center border border-gray-200">
                  <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">용량</p>
                  <p class="text-xl font-bold text-gray-900">{{ passport.totalEnergy || 'N/A' }}<span v-if="passport.totalEnergy" class="text-xs font-normal text-gray-400 ml-0.5">kWh</span></p>
                </div>
                <div class="bg-[#fafafa]  p-4 text-center border border-gray-200">
                  <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">재활용</p>
                  <p class="text-xl font-bold text-gray-900">{{ passport.recycleAvailable != null ? (passport.recycleAvailable ? '가능' : '불가') : 'N/A' }}</p>
                </div>
                <div class="bg-[#fafafa]  p-4 text-center border border-gray-200">
                  <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">유해물질</p>
                  <p class="text-xl font-bold text-gray-900">{{ passport.containsHazardous ? '포함' : '미포함' }}</p>
                </div>
                <div class="bg-[#fafafa]  p-4 text-center border border-gray-200">
                  <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">탄소발자국</p>
                  <p class="text-xl font-bold text-gray-900">{{ estimatedCarbonFootprint != null ? estimatedCarbonFootprint : 'N/A' }}<span v-if="estimatedCarbonFootprint" class="text-xs font-normal text-gray-400 ml-0.5">kg</span></p>
                </div>
              </div>

              <!-- Progress bar -->
              <div class="mb-8">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium text-gray-600">전체 준수율</span>
                  <span class="text-sm font-bold tabular-nums" :class="gbaCompliance.pct >= 80 ? 'text-emerald-600' : gbaCompliance.pct >= 50 ? 'text-amber-600' : 'text-[#ff6b6b]'">{{ gbaCompliance.filled }}/21 ({{ gbaCompliance.pct }}%)</span>
                </div>
                <div class="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-700"
                       :class="gbaCompliance.pct >= 80 ? 'bg-[#34d399]' : gbaCompliance.pct >= 50 ? 'bg-[#fbbf24]' : 'bg-[#ef4444]'"
                       :style="{ width: gbaCompliance.pct + '%' }"></div>
                </div>
              </div>

              <!-- Grouped checklist -->
              <div class="space-y-5">
                <div v-for="group in gbaCompliance.groups" :key="group.name">
                  <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">{{ group.name }}</h4>
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                    <div v-for="f in group.fields" :key="f.idx" class="flex items-center gap-2 py-1">
                      <svg v-if="f.filled" class="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                      </svg>
                      <svg v-else class="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                      <span class="text-xs" :class="f.filled ? 'text-gray-600' : 'text-red-500 font-medium'">{{ f.label }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Certified badge -->
              <div v-if="gbaCompliance.allFilled" class="mt-6 px-4 py-3 bg-[rgba(200,255,0,0.08)]/60 rounded border border-emerald-100 flex items-center gap-2.5">
                <svg class="w-5 h-5 text-emerald-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <polyline points="9 12 11 14 15 10" stroke-width="2.5"/>
                </svg>
                <p class="text-xs font-semibold text-emerald-600">GBA 21 Battery Passport Certified - 모든 필수 데이터 항목 완료</p>
              </div>
            </div>
          </details>

          <!-- Carbon Footprint Card (GBA 21 #20) -->
          <div class="bg-white  border border-gray-200 shadow-none overflow-hidden" style="background: #ffffff;">
            <div class="px-6 py-4 border-b border-gray-200 flex items-center gap-2.5">
              <div class="w-8 h-8 bg-teal-100 rounded flex items-center justify-center">
                <svg class="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div>
                <h3 class="sn-heading text-sm font-bold text-gray-900 uppercase tracking-wider">탄소 발자국</h3>
                <p class="text-[10px] text-gray-400">GBA 21 #20 — Carbon Footprint (kg CO₂e)</p>
              </div>
            </div>
            <div class="p-6">
              <div v-if="estimatedCarbonFootprint != null" class="flex items-center gap-6">
                <!-- Value -->
                <div class="text-center">
                  <p class="text-3xl font-bold text-gray-900 tabular-nums">{{ estimatedCarbonFootprint }}</p>
                  <p class="text-xs text-gray-400 mt-1">kg CO₂e</p>
                </div>
                <!-- Grade badge -->
                <div v-if="carbonGrade" :class="['flex items-center gap-3 px-4 py-3  border', carbonGrade.bg]">
                  <span :class="['text-2xl font-black', carbonGrade.color]">{{ carbonGrade.grade }}</span>
                  <div>
                    <p :class="['text-sm font-semibold', carbonGrade.color]">{{ carbonGrade.label }}</p>
                    <p class="text-[10px] text-gray-400">{{ passport.totalEnergy > 0 ? (estimatedCarbonFootprint / passport.totalEnergy * 1000).toFixed(1) + ' kg CO₂e/kWh' : '' }}</p>
                  </div>
                </div>
                <!-- Info -->
                <div class="flex-1 text-xs text-gray-400 leading-relaxed">
                  <p v-if="passport.carbonFootprint > 0">제조사 신고값</p>
                  <p v-else>배터리 무게/에너지 기반 추정값입니다. 정확한 값은 제조사의 LCA 결과를 참조하세요.</p>
                </div>
              </div>
              <div v-else class="text-center py-4">
                <p class="text-sm text-gray-400">탄소 발자국 데이터가 없습니다</p>
                <p class="text-xs text-gray-300 mt-1">무게(kg)와 총 에너지(kWh) 정보가 있으면 자동 추정됩니다.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- ==================== TAB 3: TRACEABILITY ==================== -->
        <div v-show="activeTab === 'traceability'" id="section-traceability" class="space-y-5" style="margin-top: 2rem;">

          <!-- Section Header -->
          <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.6rem; padding-top: 0.35rem;">
            <div style="width: 4px; height: 24px; border-radius: 2px; background: #d97706;"></div>
            <h2 style="font-size: 1rem; font-weight: 600; color: var(--color-text-1); margin: 0;">운영 이력</h2>
          </div>

          <!-- Pending Request Alert Banner -->
          <div v-if="passport.status === 'MAINTENANCE'"
            class="flex items-center gap-3 px-5 py-4 bg-[rgba(255,184,0,0.1)] border border-amber-200 ">
            <div class="w-10 h-10 rounded-full bg-[rgba(255,184,0,0.1)] flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <div class="flex-1">
              <p class="text-sm font-semibold text-amber-800">정비 요청 접수됨</p>
              <p class="text-xs text-amber-600 mt-0.5">EV 제조사로부터 정비 요청이 접수되었습니다. 정비를 수행하고 기록을 추가해주세요.</p>
            </div>
            <button v-if="isService" @click="showMaintenanceLogModal = true"
              class="flex-shrink-0 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded transition-colors">
              정비 기록 추가
            </button>
          </div>

          <div v-if="passport.status === 'ANALYSIS'"
            class="flex items-center gap-3 px-5 py-4 bg-[rgba(192,132,252,0.1)] border border-purple-200 ">
            <div class="w-10 h-10 rounded-full bg-[rgba(192,132,252,0.1)] flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
            </div>
            <div class="flex-1">
              <p class="text-sm font-semibold text-purple-800">분석 요청 접수됨</p>
              <p class="text-xs text-purple-600 mt-0.5">EV 제조사로부터 배터리 분석 요청이 접수되었습니다. SOH/SOCE 분석 후 결과를 제출해주세요.</p>
            </div>
            <button v-if="isService" @click="showAnalysisResultModal = true"
              class="flex-shrink-0 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded transition-colors">
              분석 결과 제출
            </button>
          </div>

          <div v-if="passport.status === 'RECYCLING'"
            class="flex items-center gap-3 px-5 py-4 bg-[rgba(200,255,0,0.08)] border border-teal-200 ">
            <div class="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </div>
            <div class="flex-1">
              <p class="text-sm font-semibold text-teal-800">재활용 대기 중</p>
              <p class="text-xs text-teal-600 mt-0.5">재활용 가능 판정이 완료되었습니다. 원자재 추출 또는 폐기를 진행해주세요.</p>
            </div>
            <button v-if="isRegulator" @click="showExtractModal = true"
              class="flex-shrink-0 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded transition-colors">
              원자재 추출
            </button>
          </div>

          <div class="bg-white border border-gray-200 shadow-none overflow-hidden" style="background:#ffffff;">
            <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <p class="sn-eyebrow" style="margin:0 0 6px;">recent events</p>
                <h3 class="sn-heading text-sm font-bold text-gray-900 uppercase tracking-wider">최근 운영 이벤트</h3>
              </div>
              <span class="sn-caption">판단이 필요한 최근 6건</span>
            </div>
            <div v-if="timelineEvents.length" class="px-6 py-5" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
              <div
                v-for="(event, idx) in timelineEvents"
                :key="event.title + idx"
                :style="event.tone === 'blue'
                  ? 'padding:14px;border-radius:16px;background:#eef5ff;border:1px solid rgba(23,105,224,0.08);'
                  : event.tone === 'emerald'
                    ? 'padding:14px;border-radius:16px;background:#eefaf3;border:1px solid rgba(16,185,129,0.10);'
                    : event.tone === 'amber'
                      ? 'padding:14px;border-radius:16px;background:#fff7ed;border:1px solid rgba(245,158,11,0.12);'
                      : event.tone === 'red'
                        ? 'padding:14px;border-radius:16px;background:#fef2f2;border:1px solid rgba(239,68,68,0.10);'
                        : event.tone === 'teal'
                          ? 'padding:14px;border-radius:16px;background:#f0fdfa;border:1px solid rgba(13,148,136,0.10);'
                          : 'padding:14px;border-radius:16px;background:#f8fafc;border:1px solid rgba(148,163,184,0.12);'"
              >
                <p class="sn-caption" style="margin:0 0 6px;">{{ formatDate(event.date) }}</p>
                <p style="margin:0 0 6px;font-size:14px;font-weight:800;color:#0f172a;">{{ event.title }}</p>
                <p style="margin:0;font-size:13px;color:#64748b;">{{ event.note }}</p>
              </div>
            </div>
            <div v-else class="px-6 py-10 text-center">
              <p class="text-gray-400 text-sm">운영 이력이 아직 없습니다</p>
            </div>
          </div>

          <!-- Lifecycle Timeline -->
          <div class="bg-white  border border-gray-200 shadow-none overflow-hidden" style="background: #ffffff;">
            <div class="px-6 py-4 border-b border-gray-200 flex items-center gap-2.5">
              <div class="w-8 h-8 bg-[rgba(200,255,0,0.08)] rounded flex items-center justify-center">
                <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <h3 class="sn-heading text-sm font-bold text-gray-900 uppercase tracking-wider">정비 이력</h3>
            </div>
            <div class="px-6 py-6">
              <!-- Lifecycle Rail -->
              <div style="display: flex; align-items: center; gap: 0; margin: 1.5rem 0; padding: 1rem; background: rgba(0,0,0,0.02); border-radius: 8px;">
                <div v-for="(step, i) in lifecycleSteps" :key="step.key" style="display: flex; align-items: center; flex: 1;">
                  <div style="display: flex; flex-direction: column; align-items: center; gap: 0.375rem; flex: 1;">
                    <div style="width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.625rem; font-weight: 700;"
                      :style="getLifecycleState(step.key, passport.status) === 'current'
                        ? 'background: var(--color-accent); color: #fff;'
                        : getLifecycleState(step.key, passport.status) === 'completed'
                          ? 'background: #dcfce7; color: #16a34a;'
                          : 'background: rgba(0,0,0,0.04); color: var(--color-text-3);'">
                      <svg v-if="getLifecycleState(step.key, passport.status) === 'completed'" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                      <span v-else>{{ i + 1 }}</span>
                    </div>
                    <span style="font-size: 0.625rem; font-weight: 500; text-align: center; white-space: nowrap;"
                      :style="getLifecycleState(step.key, passport.status) === 'current' ? 'color: var(--color-accent); font-weight: 700;' : getLifecycleState(step.key, passport.status) === 'completed' ? 'color: #16a34a;' : 'color: var(--color-text-3);'">
                      {{ step.label }}
                    </span>
                  </div>
                  <div v-if="i < lifecycleSteps.length - 1" style="height: 2px; flex: 0.5; margin-top: -1rem;"
                    :style="getLifecycleState(step.key, passport.status) === 'completed' ? 'background: #16a34a;' : 'background: rgba(0,0,0,0.06);'"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Raw Materials -->
          <div v-if="linkedMaterialDetails.length > 0"
               class="bg-white  border border-gray-200 shadow-none overflow-hidden" style="background: #ffffff;">
            <div class="px-6 py-4 border-b border-gray-200 flex items-center gap-2.5">
              <div class="w-8 h-8 bg-[rgba(192,132,252,0.1)] rounded flex items-center justify-center">
                <svg class="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                </svg>
              </div>
              <h3 class="sn-heading text-sm font-bold text-gray-900 uppercase tracking-wider">원자재 정보</h3>
              <span class="ml-auto text-xs font-medium text-purple-600 bg-[rgba(192,132,252,0.1)] px-2 py-0.5 rounded-full">{{ linkedMaterialDetails.length }}종</span>
            </div>
            <div class="p-4">
              <div class="grid gap-3 sm:grid-cols-2">
                <div v-for="m in linkedMaterialDetails" :key="m.materialId"
                  class="flex items-start gap-3 p-3 rounded border border-gray-200 bg-[#fafafa]">
                  <div class="w-8 h-8 bg-[rgba(192,132,252,0.1)] rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg class="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-gray-900">{{ m.name }}</p>
                    <p class="text-xs text-gray-400 mt-0.5">{{ m.materialId }}</p>
                    <div class="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[11px] text-gray-400">
                      <span v-if="m.origin">원산지: <b class="text-gray-600">{{ m.origin }}</b></span>
                      <span v-if="m.supplier">공급자: <b class="text-gray-600">{{ m.supplier }}</b></span>
                      <span v-if="m.quantity">수량: <b class="text-gray-600">{{ m.quantity }}{{ m.unit || '' }}</b></span>
                      <span v-if="m.certificationId">인증: <b class="text-gray-600">{{ m.certificationId }}</b></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Maintenance Logs -->
          <div class="bg-white  border border-gray-200 shadow-none overflow-hidden" style="background: #ffffff;">
            <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 bg-[rgba(255,184,0,0.1)] rounded flex items-center justify-center">
                  <svg class="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
                  </svg>
                </div>
                <h3 class="sn-heading text-sm font-bold text-gray-900 uppercase tracking-wider">정비 이력</h3>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">{{ maintenanceLogs.length }}</span>
              </div>
              <div class="flex gap-2">
                <button v-if="isEV && passport.status === 'ACTIVE'" @click="showMaintenanceRequestModal = true"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#fbbf24] hover:bg-amber-600 text-white font-medium text-xs rounded transition-colors">
                  정비 요청
                </button>
                <button v-if="isService" @click="showMaintenanceLogModal = true"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#16a34a] hover:bg-[#15803d] text-white font-medium text-xs rounded transition-colors">
                  기록 추가
                </button>
              </div>
            </div>
            <div v-if="maintenanceLogs.length === 0" class="p-10 text-center">
              <p class="text-gray-400 text-sm">정비 이력이 없습니다</p>
            </div>
            <div v-else class="overflow-x-auto">
              <table class="sn-table w-full text-sm">
                <thead><tr class="bg-[#fafafa]/60 border-b border-gray-200">
                  <th class="text-left px-5 py-3 font-semibold text-gray-400 text-xs uppercase tracking-wider">날짜</th>
                  <th class="text-left px-5 py-3 font-semibold text-gray-400 text-xs uppercase tracking-wider">유형</th>
                  <th class="text-left px-5 py-3 font-semibold text-gray-400 text-xs uppercase tracking-wider">내용</th>
                  <th class="text-left px-5 py-3 font-semibold text-gray-400 text-xs uppercase tracking-wider">기술자</th>
                </tr></thead>
                <tbody>
                  <tr v-for="(log, i) in maintenanceLogs" :key="i"
                    :class="['transition-colors', i % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]/40', 'hover:bg-[rgba(200,255,0,0.08)]/40']">
                    <td class="px-5 py-3 text-gray-600 whitespace-nowrap">{{ formatDate(log.date) }}</td>
                    <td class="px-5 py-3"><span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[rgba(200,255,0,0.08)] text-emerald-600 border border-emerald-100">{{ {routine:'정기점검',repair:'수리',recall:'리콜',emergency:'긴급'}[log.type] || log.type || '-' }}</span></td>
                    <td class="px-5 py-3 text-gray-600 max-w-xs truncate">{{ log.description || '-' }}</td>
                    <td class="px-5 py-3 text-gray-600">{{ log.technician || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Accident Logs -->
          <div class="bg-white  border border-gray-200 shadow-none overflow-hidden" style="background: #ffffff;">
            <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 bg-[rgba(239,68,68,0.1)] rounded flex items-center justify-center">
                  <svg class="w-4 h-4 text-[#ff6b6b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <h3 class="sn-heading text-sm font-bold text-gray-900 uppercase tracking-wider">사고 기록</h3>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">{{ accidentLogs.length }}</span>
              </div>
              <button v-if="isEV || isService" @click="showAccidentLogModal = true"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(239,68,68,0.1)]0 hover:bg-red-600 text-white font-medium text-xs rounded transition-colors">
                기록 추가
              </button>
            </div>
            <div v-if="accidentLogs.length === 0" class="p-10 text-center">
              <p class="text-gray-400 text-sm">사고 기록이 없습니다</p>
            </div>
            <div v-else class="overflow-x-auto">
              <table class="sn-table w-full text-sm">
                <thead><tr class="bg-[#fafafa]/60 border-b border-gray-200">
                  <th class="text-left px-5 py-3 font-semibold text-gray-400 text-xs uppercase tracking-wider">날짜</th>
                  <th class="text-left px-5 py-3 font-semibold text-gray-400 text-xs uppercase tracking-wider">심각도</th>
                  <th class="text-left px-5 py-3 font-semibold text-gray-400 text-xs uppercase tracking-wider">내용</th>
                  <th class="text-left px-5 py-3 font-semibold text-gray-400 text-xs uppercase tracking-wider">보고자</th>
                </tr></thead>
                <tbody>
                  <tr v-for="(log, i) in accidentLogs" :key="i"
                    :class="['transition-colors', i % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]/40', 'hover:bg-[rgba(239,68,68,0.1)]/30']">
                    <td class="px-5 py-3 text-gray-600 whitespace-nowrap">{{ formatDate(log.date) }}</td>
                    <td class="px-5 py-3"><span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[rgba(239,68,68,0.1)] text-[#ff6b6b] border border-red-100">{{ {minor:'경미',moderate:'보통',severe:'심각',critical:'위험'}[log.severity] || log.severity || '-' }}</span></td>
                    <td class="px-5 py-3 text-gray-600 max-w-xs truncate">{{ log.description || '-' }}</td>
                    <td class="px-5 py-3 text-gray-600">{{ log.reporter || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Action buttons for recycling/analysis -->
          <div class="bg-white  border border-gray-200 shadow-none p-6" style="background: #ffffff;">
            <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">가용 작업</h4>
            <div class="flex flex-wrap gap-3">
              <button v-if="isEV" @click="showAnalysisRequestModal = true"
                class="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm rounded transition-colors ">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                분석 요청
              </button>
              <button v-if="isService" @click="showAnalysisResultModal = true"
                class="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded transition-colors ">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                분석 결과 제출
              </button>
              <button v-if="isService || isRegulator" @click="showRecycleModal = true"
                class="inline-flex items-center gap-2 px-4 py-2.5 bg-[#f97316] hover:bg-orange-600 text-white font-medium text-sm rounded transition-colors ">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                재활용 판정
              </button>
              <button v-if="isRegulator" @click="showExtractModal = true"
                class="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm rounded transition-colors ">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>
                원자재 추출
              </button>
              <button v-if="isRegulator" @click="showDisposeConfirm = true" :disabled="submitting"
                class="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium text-sm rounded transition-colors  disabled:opacity-50">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                폐기 처리
              </button>
              <p v-if="!isEV && !isService && !isRegulator" class="text-sm text-gray-400 py-2">현재 가능한 작업이 없습니다.</p>
            </div>
          </div>
        </div>

        <!-- ==================== TAB 4: DATA ==================== -->
        <div v-show="activeTab === 'data'" id="section-data" style="margin-top: 2rem;">

          <!-- Section Header -->
          <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.6rem; padding-top: 0.35rem;">
            <div style="width: 4px; height: 24px; border-radius: 2px; background: #7c3aed;"></div>
            <h2 style="font-size: 1rem; font-weight: 600; color: var(--color-text-1); margin: 0;">진단 데이터</h2>
          </div>

          <div v-if="bmuLoading" class="flex flex-col items-center justify-center py-20">
            <div class="relative">
              <div class="w-10 h-10 border-4 border-emerald-100 rounded-full"></div>
              <div class="absolute top-0 left-0 w-10 h-10 border-4 border-emerald-600 rounded-full animate-spin border-t-transparent"></div>
            </div>
            <p class="mt-3 text-sm text-gray-400">BMU 데이터 로딩중...</p>
          </div>
          <div v-else-if="bmuRecords.length === 0" class="bg-white  border border-gray-200 shadow-none py-16 text-center">
            <div class="mx-auto w-16 h-16 bg-gray-100  flex items-center justify-center mb-4">
              <svg class="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <p class="text-gray-400 font-medium">BMU 데이터가 없습니다</p>
            <p class="text-xs text-gray-400 mt-1">아직 수집된 BMU 데이터가 없습니다.</p>
          </div>
          <div v-else class="space-y-4">
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;">
              <div v-for="card in bmuOverviewCards" :key="card.label" style="background:#fff;border:1px solid rgba(0,0,0,0.06);border-radius:16px;padding:16px 18px;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
                <p class="sn-caption" style="margin:0 0 8px;">{{ card.label }}</p>
                <p style="margin:0;font-size:18px;font-weight:800;color:#0f172a;word-break:break-word;">{{ card.value }}</p>
              </div>
            </div>
            <div class="bg-white  border border-gray-200 shadow-none overflow-hidden" style="background: #ffffff;">
              <div class="overflow-x-auto">
                <table class="sn-table w-full text-sm">
                  <thead>
                    <tr class="bg-[#fafafa]/80 border-b border-gray-200">
                      <th class="text-left px-5 py-3.5 font-semibold text-gray-400 text-xs uppercase tracking-wider">기록 ID</th>
                      <th class="text-left px-5 py-3.5 font-semibold text-gray-400 text-xs uppercase tracking-wider">시각</th>
                      <th class="text-left px-5 py-3.5 font-semibold text-gray-400 text-xs uppercase tracking-wider">SOC(%)</th>
                      <th class="text-left px-5 py-3.5 font-semibold text-gray-400 text-xs uppercase tracking-wider">전압(V)</th>
                      <th class="text-left px-5 py-3.5 font-semibold text-gray-400 text-xs uppercase tracking-wider">전류(A)</th>
                      <th class="text-left px-5 py-3.5 font-semibold text-gray-400 text-xs uppercase tracking-wider">온도 (&deg;C)</th>
                      <th class="text-left px-5 py-3.5 font-semibold text-gray-400 text-xs uppercase tracking-wider">방전주기</th>
                      <th class="text-left px-5 py-3.5 font-semibold text-gray-400 text-xs uppercase tracking-wider">상태</th>
                      <th v-if="isManufacturer || isRegulator" class="text-center px-5 py-3.5 font-semibold text-gray-400 text-xs uppercase tracking-wider">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(r, idx) in bmuRecords" :key="r.recordId"
                      :class="['transition-colors', idx % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]/40', 'hover:bg-[rgba(200,255,0,0.08)]/40']">
                      <td class="px-5 py-3 font-mono text-xs text-gray-400">{{ r.recordId }}</td>
                      <td class="px-5 py-3 text-gray-600 text-xs">{{ formatDate(r.timestamp) }}</td>
                      <td class="px-5 py-3">
                        <span class="font-semibold text-gray-900 tabular-nums">{{ r.soc != null ? scaleSOC(r.soc) + '%' : '-' }}</span>
                      </td>
                      <td class="px-5 py-3 text-gray-600 tabular-nums">{{ r.voltage != null ? r.voltage + 'V' : '-' }}</td>
                      <td class="px-5 py-3 text-gray-600 tabular-nums">{{ r.current != null ? r.current + 'A' : '-' }}</td>
                      <td class="px-5 py-3 text-gray-600 tabular-nums">{{ r.temperature != null ? scaleTemp(r.temperature) + '°C' : '-' }}</td>
                      <td class="px-5 py-3 text-gray-600 tabular-nums">{{ r.dischargeCycles != null ? r.dischargeCycles : '-' }}</td>
                      <td class="px-5 py-3">
                        <div class="flex flex-wrap gap-1">
                          <span v-for="badge in decodeStatusFlags(r.statusFlags)" :key="badge.label"
                            :class="['inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border', badge.color]">
                            {{ badge.label }}
                          </span>
                          <span v-if="decodeStatusFlags(r.statusFlags).length === 0" class="text-xs text-gray-300">--</span>
                          <span v-if="r.status === 'INVALIDATED'" class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[rgba(239,68,68,0.1)] text-[#ff6b6b] border border-gray-200">무효</span>
                        </div>
                      </td>
                      <td v-if="isManufacturer || isRegulator" class="px-5 py-3 text-center">
                        <button v-if="r.status !== 'INVALIDATED'" @click="openInvalidateModal(r.recordId)"
                          class="text-[10px] font-medium text-red-500 hover:text-[#ff6b6b] hover:bg-[rgba(239,68,68,0.1)] px-2 py-1 rounded transition-colors">
                          무효화
                        </button>
                        <span v-else class="text-[10px] text-gray-400">처리됨</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="border-t border-gray-200 bg-[#fafafa] px-5 py-3 flex items-center justify-between">
                <span class="text-xs text-gray-400">최근 <strong class="text-gray-600">{{ bmuRecords.length }}</strong>건 표시</span>
                <button @click="$emit('navigate', 'bmu-data')"
                  class="text-xs text-emerald-600 hover:text-emerald-600 font-medium transition-colors flex items-center gap-1">
                  전체 BMU 데이터
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ==================== TAB 5: TRUST ==================== -->
        <div v-show="activeTab === 'trust'" id="section-trust" class="space-y-5" style="margin-top: 2rem;">

          <!-- Section Header -->
          <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.6rem; padding-top: 0.35rem;">
            <div style="width: 4px; height: 24px; border-radius: 2px; background: #0ea5e9;"></div>
            <h2 style="font-size: 1rem; font-weight: 600; color: var(--color-text-1); margin: 0;">증빙</h2>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
            <div v-for="item in trustSummaryCards" :key="item.label" style="background:#fff;border:1px solid rgba(0,0,0,0.06);border-radius:16px;padding:14px 16px;">
              <p class="sn-eyebrow" style="margin:0 0 6px;font-size:11px;">증빙 요약</p>
              <p class="sn-caption" style="margin:0 0 6px;">{{ item.label }}</p>
              <p style="margin:0;font-size:22px;font-weight:800;color:#0f172a;">{{ item.value }}</p>
            </div>
          </div>

          <!-- Blockchain Verification Card -->
          <div class="bg-white  border border-gray-200 shadow-none overflow-hidden" style="background: #ffffff;">
            <div class="px-6 py-4 border-b border-gray-200 flex items-center gap-2.5">
              <div class="w-8 h-8 bg-[rgba(200,255,0,0.08)] rounded flex items-center justify-center">
                <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
              </div>
              <h3 class="sn-heading text-sm font-bold text-gray-900 uppercase tracking-wider">블록체인 검증</h3>
            </div>
            <div class="p-6 space-y-5">
              <!-- DID -->
              <div>
                <dt class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">DID (Decentralized Identifier)</dt>
                <dd class="flex items-center gap-2">
                  <span class="text-sm text-gray-900 font-mono bg-[#fafafa] px-3 py-1.5 rounded border border-gray-200 break-all flex-1">{{ passport.did || '-' }}</span>
                  <button v-if="passport.did" @click="copyToClipboard(passport.did)"
                    class="flex-shrink-0 w-8 h-8 rounded hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-400 hover:text-gray-600"
                    title="복사">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                    </svg>
                  </button>
                </dd>
              </div>

              <!-- Verification badge -->
              <div class="flex items-center gap-3">
                <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(200,255,0,0.08)] border border-emerald-500">
                  <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                  <span class="text-xs font-semibold text-emerald-600">Ed25519 서명 검증</span>
                </div>
              </div>

              <!-- Meta fields -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <dt class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">발급 기관</dt>
                  <dd class="text-sm text-gray-900 font-medium">{{ passport.creatorMsp || passport.creatorOrg || '-' }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">생성일시</dt>
                  <dd class="text-sm text-gray-900">{{ formatDate(passport.createdAt) }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">최종 수정일시</dt>
                  <dd class="text-sm text-gray-900">{{ formatDate(passport.updatedAt) }}</dd>
                </div>
              </div>
            </div>
          </div>

          <!-- ===== QR Code ===== -->
          <div class="bg-white  border border-gray-200 shadow-none overflow-hidden" style="background: #ffffff;">
            <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                  <svg class="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                    <line x1="14" y1="14" x2="14" y2="14.01"/><line x1="21" y1="14" x2="21" y2="14.01"/>
                  </svg>
                </div>
                <div>
                  <h3 class="sn-heading text-sm font-bold text-gray-900 uppercase tracking-wider">QR 코드</h3>
                  <p class="text-[10px] text-gray-400 mt-0.5">이 여권의 QR 코드를 스캔하여 정보를 조회할 수 있습니다</p>
                </div>
              </div>
              <button @click="downloadQr"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-100 transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
                다운로드
              </button>
            </div>
            <div class="p-6 flex items-center gap-6">
              <div class="flex-shrink-0">
                <canvas ref="qrCanvas" id="qr-canvas" class="rounded border border-gray-200"></canvas>
              </div>
              <div class="flex-1 space-y-2">
                <div>
                  <p class="text-[10px] text-gray-400 uppercase font-medium">여권 ID</p>
                  <p class="text-sm font-mono text-gray-600">{{ passport.passportId }}</p>
                </div>
                <div>
                  <p class="text-[10px] text-gray-400 uppercase font-medium">QR 내용</p>
                  <p class="text-xs font-mono text-gray-400 break-all">{{ qrUrl }}</p>
                </div>
                <p class="text-[10px] text-gray-400 leading-relaxed">이 QR 코드를 스캔하면 배터리 여권 상세 페이지로 이동합니다. 인쇄하여 배터리 팩에 부착할 수 있습니다.</p>
              </div>
            </div>
          </div>

          <!-- ===== VC (Verifiable Credentials) ===== -->
          <div class="bg-white  border border-gray-200 shadow-none overflow-hidden" style="background: #ffffff;">
            <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 bg-indigo-100 rounded flex items-center justify-center">
                  <svg class="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                  </svg>
                </div>
                <div>
                  <h3 class="sn-heading text-sm font-bold text-gray-900 uppercase tracking-wider">검증 가능 인증서 (VC)</h3>
                  <p class="text-[10px] text-gray-400 mt-0.5">DID 기반 Verifiable Credentials</p>
                </div>
              </div>
              <button v-if="canIssueVc" @click="showVcIssueModal = true"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded hover:bg-indigo-700 transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                인증서 발급
              </button>
            </div>
            <div v-if="vcLoading" class="flex items-center justify-center py-12">
              <div class="w-8 h-8 border-[3px] border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
            <div v-else-if="vcList.length === 0" class="py-10 text-center">
              <svg class="mx-auto w-10 h-10 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
              <p class="text-sm text-gray-400">발급된 인증서가 없습니다</p>
            </div>
            <div v-else class="divide-y divide-slate-100">
              <div v-for="vc in vcList" :key="vc.credentialId"
                class="px-6 py-4 hover:bg-[#fafafa] transition-colors">
                <div class="flex items-start justify-between gap-4">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 flex-wrap mb-1.5">
                      <span class="text-sm font-semibold text-gray-900">
                        {{ {BATTERY_PASSPORT:'배터리 여권',BATTERY_HEALTH:'배터리 상태',MAINTENANCE:'정비 인증',COMPLIANCE:'규제 준수',RECYCLING:'재활용 인증'}[vc.credType] || vc.credType }}
                      </span>
                      <span :class="['inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border',
                        vc.status === 'ACTIVE' ? 'bg-[rgba(200,255,0,0.08)] text-emerald-600 border-emerald-500' :
                        vc.status === 'REVOKED' ? 'bg-[rgba(239,68,68,0.1)] text-[#ff6b6b] border-gray-200' :
                        'bg-[#fafafa] text-gray-400 border-gray-200']">
                        <span :class="['w-1.5 h-1.5 rounded-full',
                          vc.status === 'ACTIVE' ? 'bg-[#34d399]' : vc.status === 'REVOKED' ? 'bg-[#ef4444]' : 'bg-gray-400']"></span>
                        {{ vc.status === 'ACTIVE' ? '유효' : vc.status === 'REVOKED' ? '폐기' : vc.status }}
                      </span>
                    </div>
                    <div class="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                      <span class="font-mono">{{ vc.credentialId }}</span>
                      <span>발급: {{ vc.issuerMsp || '-' }}</span>
                      <span>{{ formatDate(vc.issuedAt) }}</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-1.5 flex-shrink-0">
                    <button @click="verifyVc(vc.credentialId)"
                      class="px-2.5 py-1.5 text-[11px] font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 border border-indigo-100 transition-colors">
                      검증
                    </button>
                    <button v-if="vc.status === 'ACTIVE' && vc.issuerMsp === auth.orgMsp"
                      @click="revokeVc(vc.credentialId)"
                      class="px-2.5 py-1.5 text-[11px] font-medium text-[#ff6b6b] bg-[rgba(239,68,68,0.1)] rounded hover:bg-[rgba(239,68,68,0.1)] border border-red-100 transition-colors">
                      폐기
                    </button>
                  </div>
                </div>
                <!-- Verification result inline -->
                <div v-if="vc._verified" class="mt-2 px-3 py-2 rounded text-xs"
                  :class="vc._verified.valid ? 'bg-[rgba(200,255,0,0.08)] text-emerald-600 border border-emerald-500' : 'bg-[rgba(239,68,68,0.1)] text-[#ff6b6b] border border-gray-200'">
                  {{ vc._verified.valid ? '검증 성공: 유효한 인증서입니다.' : '검증 실패: ' + (vc._verified.reason || '인증서가 유효하지 않습니다.') }}
                </div>
              </div>
            </div>
          </div>

          <!-- VC Issue Modal (Presentational) -->
          <ModalVcIssue
            :visible="showVcIssueModal"
            :form="vcForm"
            :available-cred-types="availableCredTypes"
            :passport="passport"
            :submitting="submitting"
            @close="showVcIssueModal = false"
            @submit="issueVc"
          />

          <!-- Correction History -->
          <details v-if="correctionHistory.length > 0" class="bg-white border border-gray-200 shadow-none overflow-hidden" style="background:#ffffff;">
            <summary style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;cursor:pointer;list-style:none;">
              <div>
                <p class="sn-eyebrow" style="margin:0 0 4px;">correction log</p>
                <h3 class="sn-heading" style="font-size:0.98rem;margin:0;">데이터 정정 이력</h3>
              </div>
              <span class="sn-caption">{{ correctionHistory.length }}건</span>
            </summary>
            <div class="px-6 py-4 border-b border-gray-200 flex items-center gap-2.5">
              <div class="w-8 h-8 bg-[rgba(255,184,0,0.1)] rounded flex items-center justify-center">
                <svg class="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </div>
              <div>
                <h3 class="sn-heading text-sm font-bold text-gray-900 uppercase tracking-wider">데이터 정정 이력</h3>
                <p class="text-[10px] text-gray-400 mt-0.5">블록체인에 기록된 여권 데이터 수정 내역</p>
              </div>
            </div>
            <div class="divide-y divide-slate-100">
              <div v-for="(c, i) in correctionHistory" :key="i" class="px-6 py-3.5">
                <div class="flex items-start justify-between gap-4">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 flex-wrap mb-1">
                      <span class="text-sm font-semibold text-gray-900">{{ (correctableFields.find(f => f.value === c.fieldName) || {}).label || c.fieldName }}</span>
                      <span class="text-xs text-gray-400">→</span>
                      <span class="text-sm font-mono text-[#ffb800] bg-[rgba(255,184,0,0.1)] px-1.5 py-0.5 rounded">{{ c.newValue }}</span>
                    </div>
                    <div class="flex items-center gap-3 text-xs text-gray-400">
                      <span>이전: {{ c.originalValue && !isNaN(c.originalValue) ? parseFloat(c.originalValue) : (c.originalValue || '-') }}</span>
                      <span>사유: {{ c.reason }}</span>
                    </div>
                  </div>
                  <div class="text-right flex-shrink-0">
                    <p class="text-[10px] text-gray-400">{{ formatDate(c.date) }}</p>
                    <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">{{ c.correctedBy }}</span>
                  </div>
                </div>
              </div>
            </div>
          </details>

          <!-- Change History -->
          <details class="bg-white border border-gray-200 shadow-none overflow-hidden" style="background:#ffffff;">
            <summary style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;cursor:pointer;list-style:none;">
              <div>
                <p class="sn-eyebrow" style="margin:0 0 4px;">변경 기록</p>
                <h3 class="sn-heading" style="font-size:0.98rem;margin:0;">변경 이력</h3>
              </div>
              <span class="sn-caption">{{ history.length }}건</span>
            </summary>
            <div class="px-6 py-4 border-b border-gray-200 flex items-center gap-2.5">
              <div class="w-8 h-8 bg-[rgba(192,132,252,0.1)] rounded flex items-center justify-center">
                <svg class="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <h3 class="sn-heading text-sm font-bold text-gray-900 uppercase tracking-wider">변경 이력</h3>
            </div>
            <div v-if="historyLoading" class="flex flex-col items-center justify-center py-16">
              <div class="relative">
                <div class="w-10 h-10 border-4 border-emerald-100 rounded-full"></div>
                <div class="absolute top-0 left-0 w-10 h-10 border-4 border-emerald-600 rounded-full animate-spin border-t-transparent"></div>
              </div>
              <p class="mt-3 text-sm text-gray-400">변경 이력 로딩중...</p>
            </div>
            <div v-else-if="history.length === 0" class="p-10 text-center">
              <p class="text-gray-400 text-sm">변경 이력이 없습니다</p>
            </div>
            <div v-else class="px-6 py-5">
              <p class="text-xs text-gray-400 mb-4">총 <strong class="text-gray-600">{{ history.length }}</strong>건의 주요 변경 이력 (상태 전환/VIN/정비 기준)</p>
              <div class="max-h-[500px] overflow-y-auto pr-2">
                <div class="relative pl-7">
                <div class="absolute left-[11px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-300 via-emerald-200 to-slate-200"></div>
                <div class="space-y-4">
                  <div v-for="(entry, i) in history.slice(-20)" :key="i" class="relative">
                    <div class="absolute -left-7 top-4 w-[22px] h-[22px] rounded-full border-[3px] border-white  flex items-center justify-center"
                      :class="entry.changeDesc && entry.changeDesc.includes('사고') ? 'bg-[rgba(239,68,68,0.1)]' : (entry.value && entry.value.status ? getStatusBadge(entry.value.status).bg : 'bg-[rgba(200,255,0,0.08)]')">
                      <div class="w-2 h-2 rounded-full"
                        :class="entry.changeDesc && entry.changeDesc.includes('사고') ? 'bg-[#ef4444]' : (entry.value && entry.value.status ? getStatusBadge(entry.value.status).dot : 'bg-[#34d399]')"></div>
                    </div>
                    <div class="bg-[#fafafa] rounded border border-gray-200 p-4 ml-3 hover:bg-white transition-colors">
                      <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0 flex-1">
                          <div class="flex items-center gap-2 flex-wrap">
                            <p class="text-sm font-semibold text-gray-900">{{ entry.changeDesc || ('변경 #' + entry.index) }}</p>
                            <span v-if="entry.value && entry.value.status"
                              :class="['inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border',
                                getStatusBadge(entry.value.status).bg, getStatusBadge(entry.value.status).text, getStatusBadge(entry.value.status).border]">
                              <span :class="['w-1 h-1 rounded-full', getStatusBadge(entry.value.status).dot]"></span>
                              {{ getStatusBadge(entry.value.status).label }}
                            </span>
                          </div>
                          <div class="flex items-center gap-3 mt-1.5 flex-wrap">
                            <span class="text-xs text-gray-400 flex items-center gap-1">
                              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                              </svg>
                              {{ formatDate(entry.timestamp) }}
                            </span>
                            <span class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[rgba(200,255,0,0.08)] text-emerald-600 rounded text-[10px] font-medium border border-emerald-100">
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
          </details>
        </div>

      </div>

      <!-- ==================== MODALS ==================== -->

      <ModalBind
        :visible="showBindModal"
        :form="bindForm"
        :vehicle-image-file="vehicleImageFile"
        :submitting="submitting"
        @close="showBindModal = false"
        @submit="submitBind"
        @update:vehicleImageFile="vehicleImageFile = $event"
      ></ModalBind>

      <ModalDataCorrection
        :visible="showCorrectModal"
        :form="correctForm"
        :correctable-fields="correctableFields"
        :passport="passport"
        :submitting="submitting"
        @close="showCorrectModal = false"
        @submit="submitCorrection"
      ></ModalDataCorrection>

      <bmu-invalidate-modal
        :show="showInvalidateModal"
        :form="invalidateForm"
        :submitting="submitting"
        @close="showInvalidateModal = false"
        @submit="submitInvalidate"
      ></bmu-invalidate-modal>

      <link-materials-modal
        :show="showLinkMaterialsModal"
        :available-materials="availableMaterials"
        :selected-material-ids="selectedMaterialIds"
        :passport="passport"
        :submitting="submitting"
        @close="showLinkMaterialsModal = false"
        @submit="submitLinkMaterials"
        @toggle="toggleMaterial"
      ></link-materials-modal>

      <maintenance-request-modal
        :show="showMaintenanceRequestModal"
        :submitting="submitting"
        @close="showMaintenanceRequestModal = false"
        @submit="submitMaintenanceRequest"
      ></maintenance-request-modal>

      <maintenance-log-modal
        :show="showMaintenanceLogModal"
        :form="maintenanceForm"
        :submitting="submitting"
        @close="showMaintenanceLogModal = false"
        @submit="submitMaintenanceLog"
      ></maintenance-log-modal>

      <accident-log-modal
        :show="showAccidentLogModal"
        :form="accidentForm"
        :submitting="submitting"
        @close="showAccidentLogModal = false"
        @submit="submitAccidentLog"
      ></accident-log-modal>

      <analysis-request-modal
        :show="showAnalysisRequestModal"
        :submitting="submitting"
        @close="showAnalysisRequestModal = false"
        @submit="submitAnalysisRequest"
      ></analysis-request-modal>

      <analysis-result-modal
        :show="showAnalysisResultModal"
        :form="analysisForm"
        :submitting="submitting"
        @close="showAnalysisResultModal = false"
        @submit="submitAnalysisResult"
      ></analysis-result-modal>

      <recycle-modal
        :show="showRecycleModal"
        :submitting="submitting"
        @close="showRecycleModal = false"
        @submit="submitRecycleAvailability"
      ></recycle-modal>

      <extract-modal
        :show="showExtractModal"
        :form="extractForm"
        :submitting="submitting"
        @close="showExtractModal = false"
        @submit="submitExtractMaterials"
      ></extract-modal>

      <dispose-modal
        :show="showDisposeConfirm"
        :submitting="submitting"
        @close="showDisposeConfirm = false"
        @submit="disposeBattery"
      ></dispose-modal>
    </div>
  `
});
import ModalBind from '../components/passport-detail/ModalBind.js'
import ModalDataCorrection from '../components/passport-detail/ModalDataCorrection.js'

// Register globally for CDN-based runtime (align with VC Issue Modal usage)
if (typeof app !== 'undefined' && app.component) {
  app.component('ModalBind', ModalBind)
  app.component('ModalDataCorrection', ModalDataCorrection)
}
