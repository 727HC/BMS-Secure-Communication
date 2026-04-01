app.component('qr-scan-page', {
  props: ['auth', 'api'],
  emits: ['navigate'],
  setup(props, { emit }) {
    const { ref, onMounted, onUnmounted } = Vue;

    const scanning = ref(false);
    const scanner = ref(null);
    const scanResult = ref(null);
    const passportData = ref(null);
    const loadingPassport = ref(false);
    const manualId = ref('');

    // NFC
    const nfcSupported = ref('NDEFReader' in window);
    const nfcScanning = ref(false);
    const nfcReader = ref(null);

    function startScan() {
      scanning.value = true;
      scanResult.value = null;
      passportData.value = null;

      Vue.nextTick(() => {
        const html5QrCode = new Html5Qrcode('qr-reader');
        scanner.value = html5QrCode;

        html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            handleScanResult(decodedText);
            stopScan();
          },
          () => {}
        ).catch(err => {
          window.$toast('error', '카메라 접근 실패: ' + err);
          scanning.value = false;
        });
      });
    }

    function stopScan() {
      if (scanner.value && scanner.value.isScanning) {
        scanner.value.stop().catch(() => {});
      }
      scanning.value = false;
    }

    async function handleScanResult(text) {
      scanResult.value = text;

      // Extract passportId from URL or direct ID
      let passportId = text;
      const match = text.match(/passportId=([^&]+)/);
      if (match) passportId = decodeURIComponent(match[1]);

      await lookupPassport(passportId);
    }

    async function lookupPassport(passportId) {
      if (!passportId.trim()) return;
      loadingPassport.value = true;
      passportData.value = null;
      try {
        const data = await props.api.get('/passports/' + encodeURIComponent(passportId.trim()));
        passportData.value = data;
      } catch (e) {
        window.$toast('error', '여권을 찾을 수 없습니다: ' + e.message);
      } finally {
        loadingPassport.value = false;
      }
    }

    function goToDetail() {
      if (passportData.value) {
        emit('navigate', 'passport-detail', { passportId: passportData.value.passportId });
      }
    }

    function handleManualSearch() {
      if (manualId.value.trim()) {
        scanResult.value = manualId.value.trim();
        lookupPassport(manualId.value.trim());
      }
    }

    // NFC scan
    async function startNfc() {
      if (!nfcSupported.value) return;
      try {
        const reader = new NDEFReader();
        nfcReader.value = reader;
        await reader.scan();
        nfcScanning.value = true;
        window.$toast('success', 'NFC 리더 활성화됨 — 태그를 가까이 대세요');
        reader.addEventListener('reading', ({ serialNumber, message }) => {
          let passportId = '';
          for (const record of message.records) {
            if (record.recordType === 'text') {
              const decoder = new TextDecoder(record.encoding || 'utf-8');
              passportId = decoder.decode(record.data);
              break;
            }
            if (record.recordType === 'url') {
              const decoder = new TextDecoder();
              const url = decoder.decode(record.data);
              const match = url.match(/passportId=([^&]+)/);
              if (match) { passportId = decodeURIComponent(match[1]); break; }
            }
          }
          if (!passportId && serialNumber) passportId = serialNumber;
          if (passportId) {
            scanResult.value = 'NFC: ' + passportId;
            lookupPassport(passportId);
          }
        });
        reader.addEventListener('readingerror', () => {
          window.$toast('error', 'NFC 태그 읽기 실패');
        });
      } catch (e) {
        window.$toast('error', 'NFC 시작 실패: ' + e.message);
        nfcScanning.value = false;
      }
    }

    function stopNfc() {
      nfcScanning.value = false;
      nfcReader.value = null;
    }

    // Use global STATUS_LABELS, STATUS_CONFIG from app.js
    const statusLabels = STATUS_LABELS;
    const statusColors = Object.fromEntries(
      Object.entries(STATUS_CONFIG).map(([k, v]) => [k, `${v.bg} ${v.text} ${v.border}`])
    );

    onUnmounted(() => { stopScan(); stopNfc(); });

    return {
      scanning, scanResult, passportData, loadingPassport, manualId,
      startScan, stopScan, goToDetail, handleManualSearch,
      nfcSupported, nfcScanning, startNfc, stopNfc,
      statusLabels, statusColors,
    };
  },
  template: `
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
        <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          <line x1="14" y1="14" x2="14" y2="14.01"/><line x1="21" y1="14" x2="21" y2="14.01"/><line x1="14" y1="21" x2="14" y2="21.01"/><line x1="21" y1="21" x2="21" y2="21.01"/><line x1="17.5" y1="17.5" x2="17.5" y2="17.51"/>
        </svg>
      </div>
      <div>
        <h1 class="text-xl font-bold text-[--bp-text-1]">QR / NFC 스캔</h1>
        <p class="text-[--bp-text-3] text-xs mt-0.5">배터리 여권 QR 코드 또는 NFC 태그를 스캔하여 정보를 조회합니다</p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

      <!-- Left: Scanner -->
      <div class="space-y-4">
        <!-- Camera Scanner -->
        <div class="bp-card overflow-hidden">
          <div class="px-5 py-3.5 border-b border-[--bp-border] flex items-center justify-between">
            <h2 class="text-sm font-semibold text-[--bp-text-1]">카메라 스캔</h2>
            <button v-if="!scanning" @click="startScan"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 bp-btn-primary text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
              </svg>
              카메라 열기
            </button>
            <button v-else @click="stopScan"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 bp-badge-danger text-xs font-semibold rounded-lg hover:bg-red-600 transition-colors">
              카메라 닫기
            </button>
          </div>
          <div class="p-4">
            <div v-if="scanning" id="qr-reader" class="rounded-lg overflow-hidden"></div>
            <div v-else class="flex flex-col items-center justify-center py-12 text-center">
              <div class="w-20 h-20 rounded-2xl bg-[--bp-surface-3] flex items-center justify-center mb-4">
                <svg class="w-10 h-10 text-[--bp-text-muted]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                  <line x1="14" y1="14" x2="14" y2="14.01"/><line x1="21" y1="14" x2="21" y2="14.01"/>
                </svg>
              </div>
              <p class="text-sm text-[--bp-text-3] mb-1">카메라를 열어 QR 코드를 스캔하세요</p>
              <p class="text-xs text-[--bp-text-3]">배터리 여권 QR 코드를 인식하면 자동으로 조회됩니다</p>
            </div>
          </div>
        </div>

        <!-- NFC Scanner -->
        <div v-if="nfcSupported" class="bp-card overflow-hidden">
          <div class="px-5 py-3.5 border-b border-[--bp-border] flex items-center justify-between">
            <div class="flex items-center gap-2">
              <h2 class="text-sm font-semibold text-[--bp-text-1]">NFC 스캔</h2>
              <span class="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[--bp-info-dim] text-blue-600 border border-blue-100">Web NFC</span>
            </div>
            <button v-if="!nfcScanning" @click="startNfc"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0"/>
              </svg>
              NFC 활성화
            </button>
            <button v-else @click="stopNfc"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 bp-badge-danger text-xs font-semibold rounded-lg hover:bg-red-600 transition-colors">
              NFC 중지
            </button>
          </div>
          <div class="p-4">
            <div v-if="nfcScanning" class="flex flex-col items-center py-6 text-center">
              <div class="w-16 h-16 rounded-2xl bg-[--bp-info-dim] flex items-center justify-center mb-3 animate-pulse">
                <svg class="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0"/>
                </svg>
              </div>
              <p class="text-sm font-medium text-blue-600">NFC 대기 중...</p>
              <p class="text-xs text-[--bp-text-3] mt-1">배터리에 부착된 NFC 태그를 디바이스에 가까이 대세요</p>
            </div>
            <div v-else class="flex flex-col items-center py-6 text-center">
              <div class="w-16 h-16 rounded-2xl bg-[--bp-surface-3] flex items-center justify-center mb-3">
                <svg class="w-8 h-8 text-[--bp-text-muted]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0"/>
                </svg>
              </div>
              <p class="text-xs text-[--bp-text-3]">NFC를 활성화하여 태그를 읽으세요</p>
            </div>
          </div>
        </div>

        <!-- Manual Input -->
        <div class="bp-card p-5 transition-all duration-200">
          <h2 class="text-sm font-semibold text-[--bp-text-1] mb-3">수동 입력</h2>
          <div class="flex gap-2">
            <input v-model="manualId" type="text" placeholder="여권 ID를 입력하세요 (예: BP-SDI-001)"
              @keyup.enter="handleManualSearch"
              class="flex-1 px-3 py-2.5 border border-[--bp-border-hover] rounded-lg text-sm focus:ring-2 focus:ring-[--bp-signal]/20 focus:border-[--bp-signal] outline-none" />
            <button @click="handleManualSearch"
              :disabled="!manualId.trim()"
              :class="['px-4 py-2.5 text-sm font-semibold rounded-lg transition-all',
                !manualId.trim() ? 'bg-[--bp-surface-3] text-[--bp-text-3] cursor-not-allowed' : 'bp-btn-primary text-white hover:bg-emerald-700']">
              조회
            </button>
          </div>
        </div>
      </div>

      <!-- Right: Result -->
      <div>
        <!-- Loading -->
        <div v-if="loadingPassport" class="bp-card p-12 flex flex-col items-center justify-center">
          <div class="w-10 h-10 border-[3px] border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-3"></div>
          <p class="text-sm text-[--bp-text-3]">여권 정보 조회 중...</p>
        </div>

        <!-- Result Card -->
        <div v-else-if="passportData" class="bp-card overflow-hidden">
          <div class="px-5 py-3.5 border-b border-[--bp-border] bg-[--bp-signal-dim]/50 flex items-center gap-2">
            <svg class="w-4 h-4 text-[--bp-signal]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
            <span class="text-sm font-semibold text-[--bp-signal]">여권 정보 확인됨</span>
          </div>
          <div class="p-5 space-y-4">
            <!-- Model + Status -->
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-bold text-[--bp-text-1]">{{ passportData.model || '-' }}</h3>
              <span :class="['inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border',
                statusColors[passportData.status] || 'bg-[--bp-surface-1] text-[--bp-text-2] border-[--bp-border-hover]']">
                {{ statusLabels[passportData.status] || passportData.status }}
              </span>
            </div>

            <!-- Key info grid -->
            <div class="grid grid-cols-2 gap-3">
              <div class="bg-[--bp-surface-1] rounded-lg px-3 py-2 border border-[--bp-border]">
                <p class="text-[10px] text-[--bp-text-3] uppercase font-medium">여권 ID</p>
                <p class="text-xs font-mono text-[--bp-text-2] mt-0.5 truncate">{{ passportData.passportId }}</p>
              </div>
              <div class="bg-[--bp-surface-1] rounded-lg px-3 py-2 border border-[--bp-border]">
                <p class="text-[10px] text-[--bp-text-3] uppercase font-medium">시리얼번호</p>
                <p class="text-xs font-mono text-[--bp-text-2] mt-0.5">{{ passportData.serialNumber || '-' }}</p>
              </div>
              <div class="bg-[--bp-surface-1] rounded-lg px-3 py-2 border border-[--bp-border]">
                <p class="text-[10px] text-[--bp-text-3] uppercase font-medium">제조사</p>
                <p class="text-sm font-medium text-[--bp-text-2] mt-0.5">{{ passportData.manufacturerName || '-' }}</p>
              </div>
              <div class="bg-[--bp-surface-1] rounded-lg px-3 py-2 border border-[--bp-border]">
                <p class="text-[10px] text-[--bp-text-3] uppercase font-medium">화학물질</p>
                <p class="text-sm font-medium text-[--bp-text-2] mt-0.5">{{ passportData.chemistry || '-' }}</p>
              </div>
              <div class="bg-[--bp-surface-1] rounded-lg px-3 py-2 border border-[--bp-border]">
                <p class="text-[10px] text-[--bp-text-3] uppercase font-medium">총 에너지</p>
                <p class="text-sm font-medium text-[--bp-text-2] mt-0.5">{{ passportData.totalEnergy ? passportData.totalEnergy + ' kWh' : '-' }}</p>
              </div>
              <div class="bg-[--bp-surface-1] rounded-lg px-3 py-2 border border-[--bp-border]">
                <p class="text-[10px] text-[--bp-text-3] uppercase font-medium">VIN</p>
                <p class="text-xs font-mono text-[--bp-text-2] mt-0.5 truncate">{{ passportData.vin || '미바인딩' }}</p>
              </div>
            </div>

            <!-- DID -->
            <div v-if="passportData.did" class="bg-[--bp-signal-dim] rounded-lg px-3 py-2 border border-emerald-100">
              <p class="text-[10px] text-[--bp-signal] uppercase font-medium">DID</p>
              <p class="text-xs font-mono text-[--bp-signal] mt-0.5 break-all">{{ passportData.did }}</p>
            </div>

            <!-- Action -->
            <button @click="goToDetail"
              class="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
              </svg>
              여권 상세 보기
            </button>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else class="bp-card p-12 flex flex-col items-center justify-center text-center">
          <div class="w-16 h-16 rounded-2xl bg-[--bp-surface-3] flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-[--bp-text-muted]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
          <p class="text-sm font-medium text-[--bp-text-3] mb-1">QR 코드를 스캔하거나 여권 ID를 입력하세요</p>
          <p class="text-xs text-[--bp-text-3]">스캔 결과가 여기에 표시됩니다</p>
        </div>
      </div>
    </div>
  </div>
  `,
});
