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
  <div style="display:flex;flex-direction:column;gap:24px;">

    <!-- ====== PAGE HEADER ====== -->
    <div class="" style="display:flex;align-items:center;gap:14px;">
      <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#059669,#059669);display:flex;align-items:center;justify-content:center;">
        <svg width="22" height="22" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          <line x1="14" y1="14" x2="14" y2="14.01"/><line x1="21" y1="14" x2="21" y2="14.01"/><line x1="14" y1="21" x2="14" y2="21.01"/><line x1="21" y1="21" x2="21" y2="21.01"/><line x1="17.5" y1="17.5" x2="17.5" y2="17.51"/>
        </svg>
      </div>
      <div>
        <h1 class="text-gray-900 font-bold" style="font-family:'Pretendard Variable', sans-serif;font-size:1.35rem;color:#111827;margin:0;">QR / NFC 스캔</h1>
        <p style="font-family:'Pretendard Variable', sans-serif;font-size:0.72rem;color:#6b7280;margin-top:2px;">배터리 여권 QR 코드 또는 NFC 태그를 스캔하여 정보를 조회합니다</p>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">

      <!-- ====== LEFT: SCANNER AREA ====== -->
      <div style="display:flex;flex-direction:column;gap:16px;">

        <!-- Camera Scanner -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm bg-white rounded-xl border border-gray-200 shadow-sm  " style="overflow:hidden;">
          <div style="padding:14px 20px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;">
            <span style="font-family:'Pretendard Variable', sans-serif;font-size:0.85rem;font-weight:600;color:#111827;">카메라 스캔</span>
            <button v-if="!scanning" @click="startScan" class="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700" style="font-size:0.75rem;padding:6px 12px;display:inline-flex;align-items:center;gap:6px;">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
              </svg>
              카메라 열기
            </button>
            <button v-else @click="stopScan" class="bg-red-50 text-red-700 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100" style="font-size:0.75rem;padding:6px 12px;">
              카메라 닫기
            </button>
          </div>
          <div style="padding:16px;">
            <!-- Active scanner -->
            <div v-if="scanning" id="qr-reader" style="border-radius:10px;overflow:hidden;"></div>
            <!-- Idle state: viewfinder graphic -->
            <div v-else style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 0;text-align:center;">
              <div style="width:120px;height:120px;position:relative;margin-bottom:20px;">
                <!-- Viewfinder corners -->
                <div style="position:absolute;top:0;left:0;width:24px;height:24px;border-top:3px solid #059669;border-left:3px solid #059669;border-radius:4px 0 0 0;"></div>
                <div style="position:absolute;top:0;right:0;width:24px;height:24px;border-top:3px solid #059669;border-right:3px solid #059669;border-radius:0 4px 0 0;"></div>
                <div style="position:absolute;bottom:0;left:0;width:24px;height:24px;border-bottom:3px solid #059669;border-left:3px solid #059669;border-radius:0 0 0 4px;"></div>
                <div style="position:absolute;bottom:0;right:0;width:24px;height:24px;border-bottom:3px solid #059669;border-right:3px solid #059669;border-radius:0 0 4px 0;"></div>
                <!-- Center QR icon -->
                <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
                  <svg width="40" height="40" fill="none" stroke="#6b7280" stroke-width="1.5" viewBox="0 0 24 24" style="opacity:0.5;">
                    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                    <line x1="14" y1="14" x2="14" y2="14.01"/><line x1="21" y1="14" x2="21" y2="14.01"/>
                  </svg>
                </div>
              </div>
              <p style="font-size:0.85rem;color:#6b7280;margin:0 0 4px;font-family:'Pretendard Variable', sans-serif;">카메라를 열어 QR 코드를 스캔하세요</p>
              <p style="font-size:0.72rem;color:#6b7280;font-family:'Pretendard Variable', sans-serif;">배터리 여권 QR 코드를 인식하면 자동으로 조회됩니다</p>
            </div>
          </div>
        </div>

        <!-- NFC Scanner -->
        <div v-if="nfcSupported" class="bg-white rounded-xl border border-gray-200 shadow-sm  " style="overflow:hidden;">
          <div style="padding:14px 20px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-family:'Pretendard Variable', sans-serif;font-size:0.85rem;font-weight:600;color:#111827;">NFC 스캔</span>
              <span class="bg-blue-50 text-blue-700" style="font-size:0.6rem;padding:1px 6px;border-radius:4px;">Web NFC</span>
            </div>
            <button v-if="!nfcScanning" @click="startNfc" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium" style="font-size:0.75rem;padding:6px 12px;display:inline-flex;align-items:center;gap:6px;background:#2563eb;color:#fff;border:none;">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0"/>
              </svg>
              NFC 활성화
            </button>
            <button v-else @click="stopNfc" class="bg-red-50 text-red-700 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100" style="font-size:0.75rem;padding:6px 12px;">NFC 중지</button>
          </div>
          <div style="padding:24px 16px;display:flex;flex-direction:column;align-items:center;text-align:center;">
            <div v-if="nfcScanning" style="display:flex;flex-direction:column;align-items:center;">
              <div style="width:56px;height:56px;border-radius:16px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;margin-bottom:12px;animation:pulse 2s ease-in-out infinite;">
                <svg width="28" height="28" fill="none" stroke="#2563eb" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0"/>
                </svg>
              </div>
              <p style="font-size:0.85rem;font-weight:500;color:#2563eb;margin:0 0 4px;">NFC 대기 중...</p>
              <p style="font-size:0.72rem;color:#6b7280;">배터리에 부착된 NFC 태그를 디바이스에 가까이 대세요</p>
            </div>
            <div v-else style="display:flex;flex-direction:column;align-items:center;">
              <div style="width:56px;height:56px;border-radius:16px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;margin-bottom:12px;">
                <svg width="28" height="28" fill="none" stroke="#6b7280" stroke-width="1.5" viewBox="0 0 24 24" style="opacity:0.5;">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0"/>
                </svg>
              </div>
              <p style="font-size:0.75rem;color:#6b7280;">NFC를 활성화하여 태그를 읽으세요</p>
            </div>
          </div>
        </div>

        <!-- Manual Input -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm  " style="padding:20px;">
          <h2 style="font-family:'Pretendard Variable', sans-serif;font-size:0.85rem;font-weight:600;color:#111827;margin:0 0 12px;">수동 입력</h2>
          <div style="display:flex;gap:8px;">
            <input v-model="manualId" type="text" placeholder="여권 ID를 입력하세요 (예: BP-SDI-001)"
              @keyup.enter="handleManualSearch"
              class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" style="flex:1;" />
            <button @click="handleManualSearch" :disabled="!manualId.trim()"
              class="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700" style="padding:8px 18px;"
              :style="!manualId.trim() ? 'opacity:0.4;cursor:not-allowed;' : ''">
              조회
            </button>
          </div>
        </div>
      </div>

      <!-- ====== RIGHT: RESULT AREA ====== -->
      <div>
        <!-- Loading -->
        <div v-if="loadingPassport" class="bg-white rounded-xl border border-gray-200 shadow-sm " style="padding:48px;display:flex;flex-direction:column;align-items:center;justify-content:center;">
          <div style="width:40px;height:40px;border:3px solid #f1f5f9;border-top-color:#059669;border-radius:50%;animation:spin 0.8s linear infinite;margin-bottom:12px;"></div>
          <p style="font-size:0.85rem;color:#6b7280;">여권 정보 조회 중...</p>
        </div>

        <!-- Result Card -->
        <div v-else-if="passportData" class="bg-white rounded-xl border border-gray-200 shadow-sm bg-white rounded-xl border border-gray-200 shadow-sm " style="overflow:hidden;">
          <!-- Success header strip -->
          <div style="padding:14px 20px;border-bottom:1px solid #f1f5f9;background:#ffffff;display:flex;align-items:center;gap:8px;">
            <span class="bp-dot-signal" style="width:8px;height:8px;"></span>
            <span style="font-size:0.82rem;font-weight:600;color:#059669;">여권 정보 확인됨</span>
          </div>
          <div style="padding:20px;display:flex;flex-direction:column;gap:16px;">
            <!-- Model + Status -->
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <h3 style="font-family:'Pretendard Variable', sans-serif;font-size:1.15rem;font-weight:700;color:#111827;margin:0;">{{ passportData.model || '-' }}</h3>
              <span :class="['inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border',
                statusColors[passportData.status] || 'bg-white text-gray-700 border-gray-300']">
                {{ statusLabels[passportData.status] || passportData.status }}
              </span>
            </div>

            <!-- Info grid -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <div style="background:#ffffff;border:1px solid #f1f5f9;border-radius:8px;padding:10px 12px;">
                <p style="font-size:0.6rem;color:#6b7280;text-transform:uppercase;font-weight:500;margin:0;">여권 ID</p>
                <p class="font-mono" style="font-size:0.75rem;color:#374151;margin:4px 0 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ passportData.passportId }}</p>
              </div>
              <div style="background:#ffffff;border:1px solid #f1f5f9;border-radius:8px;padding:10px 12px;">
                <p style="font-size:0.6rem;color:#6b7280;text-transform:uppercase;font-weight:500;margin:0;">시리얼번호</p>
                <p class="font-mono" style="font-size:0.75rem;color:#374151;margin:4px 0 0;">{{ passportData.serialNumber || '-' }}</p>
              </div>
              <div style="background:#ffffff;border:1px solid #f1f5f9;border-radius:8px;padding:10px 12px;">
                <p style="font-size:0.6rem;color:#6b7280;text-transform:uppercase;font-weight:500;margin:0;">제조사</p>
                <p style="font-size:0.85rem;font-weight:500;color:#374151;margin:4px 0 0;">{{ passportData.manufacturerName || '-' }}</p>
              </div>
              <div style="background:#ffffff;border:1px solid #f1f5f9;border-radius:8px;padding:10px 12px;">
                <p style="font-size:0.6rem;color:#6b7280;text-transform:uppercase;font-weight:500;margin:0;">화학물질</p>
                <p style="font-size:0.85rem;font-weight:500;color:#374151;margin:4px 0 0;">{{ passportData.chemistry || '-' }}</p>
              </div>
              <div style="background:#ffffff;border:1px solid #f1f5f9;border-radius:8px;padding:10px 12px;">
                <p style="font-size:0.6rem;color:#6b7280;text-transform:uppercase;font-weight:500;margin:0;">총 에너지</p>
                <p style="font-size:0.85rem;font-weight:500;color:#374151;margin:4px 0 0;">{{ passportData.totalEnergy ? passportData.totalEnergy + ' kWh' : '-' }}</p>
              </div>
              <div style="background:#ffffff;border:1px solid #f1f5f9;border-radius:8px;padding:10px 12px;">
                <p style="font-size:0.6rem;color:#6b7280;text-transform:uppercase;font-weight:500;margin:0;">VIN</p>
                <p class="font-mono" style="font-size:0.75rem;color:#374151;margin:4px 0 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ passportData.vin || '미바인딩' }}</p>
              </div>
            </div>

            <!-- DID -->
            <div v-if="passportData.did" style="background:#ffffff;border:1px solid #059669;border-radius:8px;padding:10px 12px;">
              <p style="font-size:0.6rem;color:#059669;text-transform:uppercase;font-weight:500;margin:0;">DID</p>
              <p class="font-mono" style="font-size:0.72rem;color:#059669;margin:4px 0 0;word-break:break-all;">{{ passportData.did }}</p>
            </div>

            <!-- Action -->
            <button @click="goToDetail" class="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700" style="width:100%;padding:12px;font-size:0.85rem;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;border-radius:10px;">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
              </svg>
              여권 상세 보기
            </button>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else class="bg-white rounded-xl border border-gray-200 shadow-sm  " style="padding:48px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">
          <div style="width:64px;height:64px;border-radius:16px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;margin-bottom:16px;">
            <svg width="32" height="32" fill="none" stroke="#6b7280" stroke-width="1.5" viewBox="0 0 24 24" style="opacity:0.5;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
          <p style="font-size:0.85rem;font-weight:500;color:#6b7280;margin:0 0 4px;">QR 코드를 스캔하거나 여권 ID를 입력하세요</p>
          <p style="font-size:0.72rem;color:#6b7280;">스캔 결과가 여기에 표시됩니다</p>
        </div>
      </div>
    </div>
  </div>
  `,
});
