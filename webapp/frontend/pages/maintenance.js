app.component('maintenance-page', {
  props: ['auth', 'api'],
  emits: ['navigate'],
  setup(props, { emit }) {
    const { ref, computed, onMounted } = Vue;

    const passports = ref([]);
    const loading = ref(false);
    const activeTab = ref('all');
    const submitting = ref(false);

    // Modal state
    const showMaintenanceRequestModal = ref(false);
    const showMaintenanceLogModal = ref(false);
    const showAccidentModal = ref(false);
    const selectedPassport = ref(null);

    const isEVManufacturer = computed(() => props.auth.orgMsp === MSP.EV_MANUFACTURER);
    const isService = computed(() => props.auth.orgMsp === MSP.SERVICE);
    const canRequestMaintenance = computed(() => isEVManufacturer.value);
    const canLogMaintenance = computed(() => isService.value);
    const canLogAccident = computed(() => isEVManufacturer.value || isService.value);

    const maintenanceTypes = [
      { value: 'routine', label: '정기점검', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
      { value: 'repair', label: '수리', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
      { value: 'recall', label: '리콜', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
      { value: 'emergency', label: '긴급', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    ];

    const severityOptions = [
      { value: 'minor', label: '경미', bgClass: 'bg-[--bp-signal-dim] text-[--bp-signal] border-[--bp-border-active]', dotClass: 'bg-[#34d399]' },
      { value: 'moderate', label: '보통', bgClass: 'bg-[--bp-warn-dim] text-amber-700 border-amber-200', dotClass: 'bg-[#fbbf24]' },
      { value: 'severe', label: '심각', bgClass: 'bg-[--bp-danger-dim] text-[--bp-danger] border-[--bp-border]', dotClass: 'bg-red-500' },
    ];

    // Forms
    const requestForm = ref({ maintenanceType: 'routine', description: '' });
    const logForm = ref({ maintenanceType: 'routine', description: '', technician: '' });
    const accidentForm = ref({ severity: 'minor', description: '', reporter: '' });

    // Use global STATUS_CONFIG from app.js
    const statusConfig = STATUS_CONFIG;

    const filteredPassports = computed(() => {
      if (activeTab.value === 'maintenance') {
        return passports.value.filter(p => p.status === 'MAINTENANCE');
      }
      if (activeTab.value === 'accident') {
        return passports.value.filter(p => (p.accidentLogs && p.accidentLogs.length > 0));
      }
      // 전체: 정비이력 또는 사고기록이 있거나, 정비중 상태인 배터리만
      return passports.value.filter(p =>
        p.status === 'MAINTENANCE' ||
        (p.maintenanceLogs && p.maintenanceLogs.length > 0) ||
        (p.accidentLogs && p.accidentLogs.length > 0)
      );
    });

    const tabs = [
      { key: 'all', label: '전체', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
      { key: 'maintenance', label: '정비중', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
      { key: 'accident', label: '사고기록', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    ];

    const tabCounts = computed(() => ({
      all: passports.value.filter(p =>
        p.status === 'MAINTENANCE' ||
        (p.maintenanceLogs && p.maintenanceLogs.length > 0) ||
        (p.accidentLogs && p.accidentLogs.length > 0)
      ).length,
      maintenance: passports.value.filter(p => p.status === 'MAINTENANCE').length,
      accident: passports.value.filter(p => (p.accidentLogs && p.accidentLogs.length > 0)).length,
    }));

    async function fetchPassports() {
      loading.value = true;
      try {
        const data = await props.api.get('/passports');
        passports.value = Array.isArray(data) ? data : (data.records || []);
      } catch (e) {
        window.$toast('error', '여권 목록 조회 실패: ' + e.message);
      } finally {
        loading.value = false;
      }
    }

    // Use global getStatusBadge from app.js

    function openMaintenanceRequest(passport) {
      selectedPassport.value = passport;
      requestForm.value = { maintenanceType: 'routine', description: '' };
      showMaintenanceRequestModal.value = true;
    }

    function openMaintenanceLog(passport) {
      selectedPassport.value = passport;
      logForm.value = { maintenanceType: 'routine', description: '', technician: '' };
      showMaintenanceLogModal.value = true;
    }

    function openAccident(passport) {
      selectedPassport.value = passport;
      accidentForm.value = { severity: 'minor', description: '', reporter: props.auth.userId || '' };
      showAccidentModal.value = true;
    }

    function closeModals() {
      showMaintenanceRequestModal.value = false;
      showMaintenanceLogModal.value = false;
      showAccidentModal.value = false;
      selectedPassport.value = null;
    }

    async function submitMaintenanceRequest() {
      submitting.value = true;
      try {
        await props.api.post('/maintenance/' + selectedPassport.value.passportId + '/request', {
          maintenanceType: requestForm.value.maintenanceType,
          description: requestForm.value.description,
        });
        window.$toast('success', '정비 요청이 등록되었습니다.');
        closeModals();
        await fetchPassports();
      } catch (e) {
        window.$toast('error', '정비 요청 실패: ' + e.message);
      } finally {
        submitting.value = false;
      }
    }

    async function submitMaintenanceLog() {
      submitting.value = true;
      try {
        await props.api.post('/maintenance/' + selectedPassport.value.passportId + '/log', {
          maintenanceType: logForm.value.maintenanceType,
          description: logForm.value.description,
          technician: logForm.value.technician,
        });
        window.$toast('success', '정비 완료가 기록되었습니다.');
        closeModals();
        await fetchPassports();
      } catch (e) {
        window.$toast('error', '정비 기록 실패: ' + e.message);
      } finally {
        submitting.value = false;
      }
    }

    async function submitAccident() {
      submitting.value = true;
      try {
        await props.api.post('/maintenance/' + selectedPassport.value.passportId + '/accident', {
          severity: accidentForm.value.severity,
          description: accidentForm.value.description,
          reporter: accidentForm.value.reporter,
        });
        window.$toast('success', '사고가 기록되었습니다.');
        closeModals();
        await fetchPassports();
      } catch (e) {
        window.$toast('error', '사고 기록 실패: ' + e.message);
      } finally {
        submitting.value = false;
      }
    }

    function navigateToDetail(passport) {
      emit('navigate', 'passport-detail', { passportId: passport.passportId });
    }

    function getMaintenanceTypeLabel(val) {
      const found = maintenanceTypes.find(t => t.value === val);
      return found ? found.label : val;
    }

    onMounted(fetchPassports);

    return {
      passports, loading, activeTab, filteredPassports, tabs, tabCounts, submitting,
      showMaintenanceRequestModal, showMaintenanceLogModal, showAccidentModal,
      selectedPassport, requestForm, logForm, accidentForm,
      isEVManufacturer, isService, canRequestMaintenance, canLogMaintenance, canLogAccident,
      maintenanceTypes, severityOptions, statusConfig,
      fetchPassports, getStatusBadge,
      openMaintenanceRequest, openMaintenanceLog, openAccident, closeModals,
      submitMaintenanceRequest, submitMaintenanceLog, submitAccident,
      navigateToDetail, getMaintenanceTypeLabel,
    };
  },
  template: `
  <div>

    <!-- ═══ LOADING ═══ -->
    <div v-if="loading" class="flex flex-col justify-center items-center py-32">
      <div class="relative w-14 h-14 mb-4">
        <div class="absolute inset-0 rounded-full border-2 border-transparent" style="border-top-color: var(--bp-warn); animation: spin 0.8s linear infinite;"></div>
        <div class="absolute inset-2 rounded-full border-2 border-transparent" style="border-bottom-color: var(--bp-warn); opacity: 0.3; animation: spin 1.2s linear infinite reverse;"></div>
      </div>
      <p class="text-sm" style="color: var(--bp-text-3); font-family: var(--font-mono);">LOADING SERVICE DATA...</p>
    </div>

    <div v-else class="space-y-5">

      <!-- ═══ HEADER ═══ -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bp-animate-in">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background: var(--bp-warn-dim);">
            <svg class="w-5 h-5" style="color: var(--bp-warn);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-xl bp-heading" style="font-family: var(--font-display);" style="font-family: var(--font-display);">정비 / 서비스</h1>
              <span class="bp-badge bp-badge-warn" style="font-family: var(--font-mono);">{{ filteredPassports.length }}</span>
            </div>
            <p class="text-xs" style="color: var(--bp-text-3);">배터리 정비 요청, 완료 기록 및 사고 이력 관리</p>
          </div>
        </div>
        <button @click="fetchPassports" class="bp-btn bp-btn-ghost">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          새로고침
        </button>
      </div>

      <!-- ═══ FILTER TABS ═══ -->
      <div class="bp-tabs bp-animate-in bp-delay-1">
        <button v-for="tab in tabs" :key="tab.key" @click="activeTab = tab.key"
          :class="['bp-tab', activeTab === tab.key ? 'bp-tab-active' : '']">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" :d="tab.icon"/>
          </svg>
          {{ tab.label }}
          <span :class="['ml-1 text-xs font-semibold px-1.5 py-0.5 rounded-full',
            activeTab === tab.key
              ? 'bp-badge-warn'
              : 'bp-badge']"
            style="font-family: var(--font-mono);">
            {{ tabCounts[tab.key] }}
          </span>
        </button>
      </div>

      <!-- ═══ EMPTY STATE ═══ -->
      <div v-if="filteredPassports.length === 0" class="bp-card bp-animate-in bp-delay-2">
        <div class="flex flex-col items-center justify-center py-20 px-6">
          <div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style="background: var(--bp-surface-2);">
            <svg class="w-8 h-8" style="color: var(--bp-text-3);" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
          </div>
          <h3 class="text-base bp-heading mb-1" style="font-family: var(--font-display);">현재 정비 이력이 없습니다</h3>
          <p class="text-sm text-center max-w-sm" style="color: var(--bp-text-3);">배터리 여권이 등록되면 정비 이력을 관리할 수 있습니다.</p>
        </div>
      </div>

      <!-- ═══ PASSPORT TABLE ═══ -->
      <div v-else class="bp-card overflow-hidden bp-animate-in bp-delay-2">
        <div class="overflow-x-auto">
          <table class="bp-table w-full">
            <thead>
              <tr>
                <th class="text-left" style="font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.08em;">여권 ID</th>
                <th class="text-left" style="font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.08em;">시리얼</th>
                <th class="text-center" style="font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.08em;">상태</th>
                <th class="text-center" style="font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.08em;">정비이력</th>
                <th class="text-center" style="font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.08em;">사고기록</th>
                <th class="text-right" style="font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.08em;">작업</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(p, idx) in filteredPassports" :key="p.passportId"
                class="bp-animate-in cursor-pointer group"
                :style="'animation-delay:' + (idx * 40) + 'ms'"
                @click="navigateToDetail(p)">

                <!-- 여권 ID -->
                <td>
                  <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style="background: var(--bp-surface-2);">
                      <svg class="w-4 h-4" style="color: var(--bp-warn);" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      </svg>
                    </div>
                    <span class="text-sm font-semibold truncate max-w-[180px] transition-colors" style="color: var(--bp-text-1); font-family: var(--font-mono);"
                      :title="p.passportId">
                      {{ p.passportId }}
                    </span>
                  </div>
                </td>

                <!-- 시리얼 -->
                <td>
                  <span class="text-xs" style="color: var(--bp-text-3); font-family: var(--font-mono);">{{ p.serialNumber || '-' }}</span>
                </td>

                <!-- 상태 -->
                <td class="text-center">
                  <span :class="['inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', getStatusBadge(p.status).bg]">
                    <span :class="['w-1.5 h-1.5 rounded-full', getStatusBadge(p.status).dot]"></span>
                    {{ getStatusBadge(p.status).label }}
                  </span>
                </td>

                <!-- 정비이력 수 -->
                <td class="text-center">
                  <span class="inline-flex items-center gap-1 text-sm font-bold tabular-nums" style="font-family: var(--font-mono);"
                    :style="(p.maintenanceLogs && p.maintenanceLogs.length > 0) ? 'color: var(--bp-signal)' : 'color: var(--bp-text-3)'">
                    {{ p.maintenanceLogs ? p.maintenanceLogs.length : 0 }}
                  </span>
                </td>

                <!-- 사고기록 수 -->
                <td class="text-center">
                  <span v-if="p.accidentLogs && p.accidentLogs.length > 0"
                    class="bp-badge-danger inline-flex items-center gap-1 text-xs font-bold tabular-nums"
                    style="font-family: var(--font-mono);">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                    {{ p.accidentLogs.length }}
                  </span>
                  <span v-else class="text-sm tabular-nums" style="color: var(--bp-text-3); font-family: var(--font-mono);">0</span>
                </td>

                <!-- 작업 버튼 -->
                <td class="text-right">
                  <div class="flex items-center justify-end gap-1.5" @click.stop>
                    <button v-if="canRequestMaintenance && p.status === 'ACTIVE'"
                      @click="openMaintenanceRequest(p)"
                      class="bp-btn bp-btn-ghost text-xs px-2 py-1" style="color: var(--bp-warn);">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                      </svg>
                      정비요청
                    </button>
                    <button v-if="canLogMaintenance && p.status === 'MAINTENANCE'"
                      @click="openMaintenanceLog(p)"
                      class="bp-btn bp-btn-primary text-xs px-2 py-1">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      정비완료
                    </button>
                    <button v-if="canLogAccident"
                      @click="openAccident(p)"
                      class="bp-btn bp-btn-danger text-xs px-2 py-1">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                      </svg>
                      사고기록
                    </button>
                    <span v-if="!canRequestMaintenance && !canLogMaintenance && !canLogAccident"
                      class="text-xs" style="color: var(--bp-text-3);">-</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div><!-- /v-else (not loading) -->

    <!-- ═══════════════════════════════════════════ -->
    <!-- MODAL: 정비 요청                             -->
    <!-- ═══════════════════════════════════════════ -->
    <div v-if="showMaintenanceRequestModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen px-4 py-8">
        <div class="fixed inset-0 backdrop-blur-sm" style="background: rgba(0,0,0,0.6);" @click="closeModals"></div>
        <div class="relative bp-card max-w-md w-full z-10 overflow-hidden bp-animate-in" style="border-color: var(--bp-warn);">

          <!-- Modal Header -->
          <div class="px-6 py-4 flex items-center justify-between" style="border-bottom: 1px solid var(--bp-surface-3);">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg flex items-center justify-center" style="background: var(--bp-warn-dim);">
                <svg class="w-4.5 h-4.5" style="color: var(--bp-warn);" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                </svg>
              </div>
              <h3 class="text-lg bp-heading" style="font-family: var(--font-display);">정비 요청</h3>
            </div>
            <button @click="closeModals" class="bp-btn bp-btn-ghost p-2" style="color: var(--bp-text-3);">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Modal Body -->
          <div class="px-6 py-5 space-y-5">
            <!-- 대상 여권 -->
            <div class="p-3 rounded-lg" style="background: var(--bp-surface-2); border: 1px solid var(--bp-surface-3);">
              <p class="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style="color: var(--bp-text-3); font-family: var(--font-mono);">TARGET PASSPORT</p>
              <p class="text-sm font-semibold" style="color: var(--bp-text-1); font-family: var(--font-mono);">{{ selectedPassport?.passportId }}</p>
            </div>

            <!-- 정비 유형 선택 -->
            <div>
              <label class="block text-sm font-semibold mb-2" style="color: var(--bp-text-2);">정비 유형 <span style="color: #ef4444;">*</span></label>
              <div class="grid grid-cols-3 gap-2">
                <button v-for="t in maintenanceTypes.slice(0,3)" :key="t.value"
                  @click="requestForm.maintenanceType = t.value" type="button"
                  class="flex flex-col items-center p-3 rounded-lg border-2 transition-all cursor-pointer"
                  :style="requestForm.maintenanceType === t.value
                    ? 'border-color: var(--bp-warn); background: var(--bp-warn-dim);'
                    : 'border-color: var(--bp-surface-3); background: transparent;'">
                  <svg class="w-5 h-5 mb-1.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
                    :style="requestForm.maintenanceType === t.value ? 'color: var(--bp-warn);' : 'color: var(--bp-text-3);'">
                    <path stroke-linecap="round" stroke-linejoin="round" :d="t.icon"/>
                  </svg>
                  <span class="text-xs font-semibold"
                    :style="requestForm.maintenanceType === t.value ? 'color: var(--bp-warn);' : 'color: var(--bp-text-2);'">{{ t.label }}</span>
                </button>
              </div>
            </div>

            <!-- 설명 -->
            <div>
              <label class="block text-sm font-semibold mb-1" style="color: var(--bp-text-2);">설명 <span style="color: #ef4444;">*</span></label>
              <textarea v-model="requestForm.description" rows="3" placeholder="정비 요청 사유를 입력하세요"
                class="bp-input w-full resize-none" style="font-family: var(--font-body);"></textarea>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="px-6 py-3 flex justify-end gap-3" style="border-top: 1px solid var(--bp-surface-3); background: var(--bp-surface-1);">
            <button @click="closeModals" class="bp-btn bp-btn-ghost">취소</button>
            <button @click="submitMaintenanceRequest"
              :disabled="!requestForm.description || submitting"
              :class="['bp-btn', (!requestForm.description || submitting) ? '' : 'bp-btn-primary']"
              :style="(!requestForm.description || submitting)
                ? 'background: var(--bp-surface-3); color: var(--bp-text-3); cursor: not-allowed;'
                : 'background: var(--bp-warn); color: var(--bp-void);'">
              <svg v-if="submitting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              {{ submitting ? '등록 중...' : '요청 등록' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════ -->
    <!-- MODAL: 정비 완료 기록                        -->
    <!-- ═══════════════════════════════════════════ -->
    <div v-if="showMaintenanceLogModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen px-4 py-8">
        <div class="fixed inset-0 backdrop-blur-sm" style="background: rgba(0,0,0,0.6);" @click="closeModals"></div>
        <div class="relative bp-card max-w-md w-full z-10 overflow-hidden bp-animate-in" style="border-color: var(--bp-signal);">

          <!-- Modal Header -->
          <div class="px-6 py-4 flex items-center justify-between" style="border-bottom: 1px solid var(--bp-surface-3);">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg flex items-center justify-center" style="background: var(--bp-signal-dim);">
                <svg class="w-4.5 h-4.5" style="color: var(--bp-signal);" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <h3 class="text-lg bp-heading" style="font-family: var(--font-display);">정비 완료 기록</h3>
            </div>
            <button @click="closeModals" class="bp-btn bp-btn-ghost p-2" style="color: var(--bp-text-3);">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Modal Body -->
          <div class="px-6 py-5 space-y-5">
            <!-- 대상 여권 -->
            <div class="p-3 rounded-lg" style="background: var(--bp-surface-2); border: 1px solid var(--bp-surface-3);">
              <p class="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style="color: var(--bp-text-3); font-family: var(--font-mono);">TARGET PASSPORT</p>
              <p class="text-sm font-semibold" style="color: var(--bp-text-1); font-family: var(--font-mono);">{{ selectedPassport?.passportId }}</p>
            </div>

            <!-- 정비 유형 -->
            <div>
              <label class="block text-sm font-semibold mb-2" style="color: var(--bp-text-2);">정비 유형 <span style="color: #ef4444;">*</span></label>
              <div class="grid grid-cols-3 gap-2">
                <button v-for="t in maintenanceTypes.slice(0,3)" :key="t.value"
                  @click="logForm.maintenanceType = t.value" type="button"
                  class="flex flex-col items-center p-3 rounded-lg border-2 transition-all cursor-pointer"
                  :style="logForm.maintenanceType === t.value
                    ? 'border-color: var(--bp-signal); background: var(--bp-signal-dim);'
                    : 'border-color: var(--bp-surface-3); background: transparent;'">
                  <svg class="w-5 h-5 mb-1.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
                    :style="logForm.maintenanceType === t.value ? 'color: var(--bp-signal);' : 'color: var(--bp-text-3);'">
                    <path stroke-linecap="round" stroke-linejoin="round" :d="t.icon"/>
                  </svg>
                  <span class="text-xs font-semibold"
                    :style="logForm.maintenanceType === t.value ? 'color: var(--bp-signal);' : 'color: var(--bp-text-2);'">{{ t.label }}</span>
                </button>
              </div>
            </div>

            <!-- 설명 -->
            <div>
              <label class="block text-sm font-semibold mb-1" style="color: var(--bp-text-2);">설명 <span style="color: #ef4444;">*</span></label>
              <textarea v-model="logForm.description" rows="3" placeholder="수행한 정비 내용을 입력하세요"
                class="bp-input w-full resize-none" style="font-family: var(--font-body);"></textarea>
            </div>

            <!-- 담당 기술자 -->
            <div>
              <label class="block text-sm font-semibold mb-1" style="color: var(--bp-text-2);">담당 기술자 <span style="color: #ef4444;">*</span></label>
              <input v-model="logForm.technician" type="text" placeholder="기술자 이름"
                class="bp-input w-full" style="font-family: var(--font-body);"/>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="px-6 py-3 flex justify-end gap-3" style="border-top: 1px solid var(--bp-surface-3); background: var(--bp-surface-1);">
            <button @click="closeModals" class="bp-btn bp-btn-ghost">취소</button>
            <button @click="submitMaintenanceLog"
              :disabled="!logForm.description || !logForm.technician || submitting"
              :class="['bp-btn', (!logForm.description || !logForm.technician || submitting) ? '' : 'bp-btn-primary']"
              :style="(!logForm.description || !logForm.technician || submitting)
                ? 'background: var(--bp-surface-3); color: var(--bp-text-3); cursor: not-allowed;'
                : ''">
              <svg v-if="submitting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              {{ submitting ? '기록 중...' : '완료 기록' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════ -->
    <!-- MODAL: 사고 기록                             -->
    <!-- ═══════════════════════════════════════════ -->
    <div v-if="showAccidentModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen px-4 py-8">
        <div class="fixed inset-0 backdrop-blur-sm" style="background: rgba(0,0,0,0.6);" @click="closeModals"></div>
        <div class="relative bp-card max-w-md w-full z-10 overflow-hidden bp-animate-in" style="border-color: #ef4444;">

          <!-- Modal Header -->
          <div class="px-6 py-4 flex items-center justify-between" style="border-bottom: 1px solid var(--bp-surface-3);">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg flex items-center justify-center" style="background: var(--bp-danger-dim);">
                <svg class="w-4.5 h-4.5 text-red-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>
              <h3 class="text-lg bp-heading" style="font-family: var(--font-display);">사고 기록</h3>
            </div>
            <button @click="closeModals" class="bp-btn bp-btn-ghost p-2" style="color: var(--bp-text-3);">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Modal Body -->
          <div class="px-6 py-5 space-y-5">
            <!-- 대상 여권 -->
            <div class="p-3 rounded-lg" style="background: var(--bp-surface-2); border: 1px solid var(--bp-surface-3);">
              <p class="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style="color: var(--bp-text-3); font-family: var(--font-mono);">TARGET PASSPORT</p>
              <p class="text-sm font-semibold" style="color: var(--bp-text-1); font-family: var(--font-mono);">{{ selectedPassport?.passportId }}</p>
            </div>

            <!-- 심각도 -->
            <div>
              <label class="block text-sm font-semibold mb-2" style="color: var(--bp-text-2);">심각도 <span style="color: #ef4444;">*</span></label>
              <div class="grid grid-cols-3 gap-2">
                <button v-for="s in severityOptions" :key="s.value"
                  @click="accidentForm.severity = s.value" type="button"
                  :class="['flex flex-col items-center p-3 rounded-lg border-2 transition-all cursor-pointer',
                    accidentForm.severity === s.value ? s.bgClass + ' border-current' : 'border-[--bp-surface-3]']">
                  <span :class="['w-3.5 h-3.5 rounded-full mb-1.5', s.dotClass]"></span>
                  <span class="text-xs font-semibold">{{ s.label }}</span>
                </button>
              </div>
            </div>

            <!-- 사고 설명 -->
            <div>
              <label class="block text-sm font-semibold mb-1" style="color: var(--bp-text-2);">사고 설명 <span style="color: #ef4444;">*</span></label>
              <textarea v-model="accidentForm.description" rows="3" placeholder="사고 상황을 상세히 기술하세요"
                class="bp-input w-full resize-none" style="font-family: var(--font-body);"></textarea>
            </div>

            <!-- 보고자 -->
            <div>
              <label class="block text-sm font-semibold mb-1" style="color: var(--bp-text-2);">보고자 <span style="color: #ef4444;">*</span></label>
              <input v-model="accidentForm.reporter" type="text" placeholder="보고자 이름"
                class="bp-input w-full" style="font-family: var(--font-body);"/>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="px-6 py-3 flex justify-end gap-3" style="border-top: 1px solid var(--bp-surface-3); background: var(--bp-surface-1);">
            <button @click="closeModals" class="bp-btn bp-btn-ghost">취소</button>
            <button @click="submitAccident"
              :disabled="!accidentForm.description || !accidentForm.reporter || submitting"
              :class="['bp-btn', (!accidentForm.description || !accidentForm.reporter || submitting) ? '' : 'bp-btn-danger']"
              :style="(!accidentForm.description || !accidentForm.reporter || submitting)
                ? 'background: var(--bp-surface-3); color: var(--bp-text-3); cursor: not-allowed;'
                : ''">
              <svg v-if="submitting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              {{ submitting ? '기록 중...' : '사고 기록' }}
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
  `,
});
