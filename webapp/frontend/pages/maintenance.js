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
      { value: 'minor', label: '경미', bgClass: 'bg-emerald-50 text-emerald-700 border-emerald-500', dotClass: 'bg-[#34d399]' },
      { value: 'moderate', label: '보통', bgClass: 'bg-amber-50 text-amber-700 border-amber-200', dotClass: 'bg-[#fbbf24]' },
      { value: 'severe', label: '심각', bgClass: 'bg-red-50 text-red-700 border-gray-200', dotClass: 'bg-red-500' },
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

    // Modal confirmation checkboxes
    const requestConfirmed = ref(false);
    const logConfirmed = ref(false);
    const accidentConfirmed = ref(false);

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
      requestConfirmed, logConfirmed, accidentConfirmed,
    };
  },
  template: `
  <div style="display:flex;flex-direction:column;gap:24px;">

    <!-- LOADING -->
    <div v-if="loading" style="display:flex;flex-direction:column;justify-content:center;align-items:center;padding:128px 0;">
      <div style="position:relative;width:56px;height:56px;margin-bottom:16px;">
        <div style="position:absolute;inset:0;border-radius:50%;border:2px solid transparent;border-top-color:#d97706;animation:spin 0.8s linear infinite;"></div>
        <div style="position:absolute;inset:8px;border-radius:50%;border:2px solid transparent;border-bottom-color:#d97706;opacity:0.3;animation:spin 1.2s linear infinite reverse;"></div>
      </div>
      <p style="font-size:0.82rem;color:#6b7280;font-family:'JetBrains Mono', monospace;">LOADING SERVICE DATA...</p>
    </div>

    <template v-else>

      <!-- HEADER -->
      <div class="" style="display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:14px;">
          <div style="width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:rgba(217,119,6,0.08);">
            <svg width="22" height="22" style="color:#d97706;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </div>
          <div>
            <div style="display:flex;align-items:center;gap:8px;">
              <h1 class="text-gray-900 font-bold" style="font-family:'Pretendard Variable', sans-serif;font-size:1.35rem;color:#111827;margin:0;">정비 / 서비스</h1>
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700" style="font-family:'JetBrains Mono', monospace;">{{ filteredPassports.length }}</span>
            </div>
            <p style="font-size:0.72rem;color:#6b7280;margin-top:2px;">배터리 정비 요청, 완료 기록 및 사고 이력 관리</p>
          </div>
        </div>
        <button @click="fetchPassports" class="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50" style="display:inline-flex;align-items:center;gap:6px;">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          새로고침
        </button>
      </div>

      <!-- FILTER TABS -->
      <div class="flex bg-gray-100 rounded-xl p-1  ">
        <button v-for="tab in tabs" :key="tab.key" @click="activeTab = tab.key"
          :class="['flex-1 py-2 text-sm font-medium text-gray-500 rounded-lg text-center cursor-pointer hover:text-gray-700', activeTab === tab.key ? 'bg-white text-emerald-700 shadow-sm' : '']">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" :d="tab.icon"/>
          </svg>
          {{ tab.label }}
          <span :class="['inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', activeTab === tab.key ? 'bg-amber-50 text-amber-700' : '']"
            style="margin-left:4px;font-size:0.68rem;font-family:'JetBrains Mono', monospace;padding:1px 7px;">
            {{ tabCounts[tab.key] }}
          </span>
        </button>
      </div>

      <!-- EMPTY STATE -->
      <div v-if="filteredPassports.length === 0" class="bg-white rounded-xl border border-gray-200 shadow-sm  ">
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 24px;">
          <div style="width:64px;height:64px;border-radius:16px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;background:#ffffff;">
            <svg width="32" height="32" style="color:#6b7280;" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
          </div>
          <h3 class="text-gray-900 font-bold" style="font-family:'Pretendard Variable', sans-serif;font-size:1rem;color:#111827;margin:0 0 6px;">현재 정비 이력이 없습니다</h3>
          <p style="font-size:0.82rem;color:#6b7280;text-align:center;max-width:24rem;">배터리 여권이 등록되면 정비 이력을 관리할 수 있습니다.</p>
        </div>
      </div>

      <!-- PASSPORT CARDS (card layout with timeline dots) -->
      <div v-else style="display:flex;flex-direction:column;gap:16px;" class=" ">
        <div v-for="(p, idx) in filteredPassports" :key="p.passportId"
             class="bg-white rounded-xl border border-gray-200 shadow-sm " :style="'animation-delay:' + (idx * 50) + 'ms'"
             style="overflow:hidden;cursor:pointer;transition:border-color 0.2s;"
             @click="navigateToDetail(p)"
             @mouseenter="$event.currentTarget.style.borderColor='#d97706'"
             @mouseleave="$event.currentTarget.style.borderColor=''">
          <div style="display:flex;gap:16px;padding:16px 20px;">

            <!-- Timeline dot column -->
            <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;padding-top:4px;">
              <div :style="{
                width: '12px', height: '12px', borderRadius: '50%', flexShrink: 0,
                background: p.status === 'MAINTENANCE' ? '#d97706' : (p.accidentLogs && p.accidentLogs.length > 0) ? '#dc2626' : '#059669',
                boxShadow: p.status === 'MAINTENANCE' ? '0 0 0 4px rgba(217,119,6,0.08)' : (p.accidentLogs && p.accidentLogs.length > 0) ? '0 0 0 4px rgba(220,38,38,0.08)' : '0 0 0 4px rgba(16,185,129,0.08)'
              }"></div>
              <div style="width:2px;flex:1;margin-top:6px;border-radius:1px;background:#f1f5f9;min-height:20px;"></div>
            </div>

            <!-- Content -->
            <div style="flex:1;min-width:0;">
              <!-- Top row: ID + status + counts -->
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                  <span style="font-family:'JetBrains Mono', monospace;font-size:0.82rem;font-weight:600;color:#111827;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:220px;" :title="p.passportId">
                    {{ p.passportId }}
                  </span>
                  <span :class="['inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', getStatusBadge(p.status).bg]">
                    <span :class="['w-1.5 h-1.5 rounded-full', getStatusBadge(p.status).dot]"></span>
                    {{ getStatusBadge(p.status).label }}
                  </span>
                </div>
                <div style="display:flex;align-items:center;gap:12px;flex-shrink:0;">
                  <span style="display:inline-flex;align-items:center;gap:4px;font-family:'JetBrains Mono', monospace;font-size:0.75rem;font-weight:600;"
                    :style="(p.maintenanceLogs && p.maintenanceLogs.length > 0) ? 'color:#059669' : 'color:#6b7280'">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    {{ p.maintenanceLogs ? p.maintenanceLogs.length : 0 }}건
                  </span>
                  <span v-if="p.accidentLogs && p.accidentLogs.length > 0"
                    class="bg-red-50 text-red-700" style="display:inline-flex;align-items:center;gap:4px;font-size:0.7rem;font-family:'JetBrains Mono', monospace;font-weight:700;">
                    <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                    사고 {{ p.accidentLogs.length }}
                  </span>
                </div>
              </div>

              <!-- Serial number -->
              <div style="font-family:'JetBrains Mono', monospace;font-size:0.72rem;color:#6b7280;margin-bottom:12px;">
                S/N: {{ p.serialNumber || '-' }}
              </div>

              <!-- Actions row -->
              <div style="display:flex;align-items:center;gap:8px;" @click.stop>
                <button v-if="canRequestMaintenance && p.status === 'ACTIVE'"
                  @click="openMaintenanceRequest(p)"
                  class="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50" style="font-size:0.75rem;padding:4px 10px;color:#d97706;display:inline-flex;align-items:center;gap:4px;">
                  <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                  </svg>
                  정비요청
                </button>
                <button v-if="canLogMaintenance && p.status === 'MAINTENANCE'"
                  @click="openMaintenanceLog(p)"
                  class="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700" style="font-size:0.75rem;padding:4px 10px;display:inline-flex;align-items:center;gap:4px;">
                  <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  정비완료
                </button>
                <button v-if="canLogAccident"
                  @click="openAccident(p)"
                  class="bg-red-50 text-red-700 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100" style="font-size:0.75rem;padding:4px 10px;display:inline-flex;align-items:center;gap:4px;">
                  <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                  사고기록
                </button>
                <span v-if="!canRequestMaintenance && !canLogMaintenance && !canLogAccident"
                  style="font-size:0.72rem;color:#6b7280;">-</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </template>

    <!-- =============================================
         MODAL: Maintenance Request
         ============================================= -->
    <div v-if="showMaintenanceRequestModal" style="position:fixed;inset:0;z-index:50;overflow-y:auto;">
      <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:16px 16px 32px;">
        <div style="position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(6px);" @click="closeModals"></div>
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm " style="position:relative;z-index:1;max-width:28rem;width:100%;overflow:hidden;border-color:#d97706;">

          <!-- Modal Header -->
          <div style="padding:16px 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #f1f5f9;">
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:rgba(217,119,6,0.08);">
                <svg width="18" height="18" style="color:#d97706;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                </svg>
              </div>
              <h3 style="font-family:'Pretendard Variable', sans-serif;font-size:1.1rem;font-weight:700;color:#111827;margin:0;">정비 요청</h3>
            </div>
            <button @click="closeModals" class="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50" style="padding:6px;color:#6b7280;">
              <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Modal Body -->
          <div style="padding:20px 24px;display:flex;flex-direction:column;gap:20px;">
            <!-- Target passport -->
            <div style="padding:12px;border-radius:8px;background:#ffffff;border:1px solid #f1f5f9;">
              <p style="font-size:0.6rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;font-family:'JetBrains Mono', monospace;margin:0 0 2px;">TARGET PASSPORT</p>
              <p style="font-size:0.85rem;font-weight:600;color:#111827;font-family:'JetBrains Mono', monospace;margin:0;">{{ selectedPassport?.passportId }}</p>
            </div>

            <!-- Maintenance type -->
            <div>
              <label style="display:block;font-size:0.85rem;font-weight:600;color:#374151;margin-bottom:8px;">정비 유형 <span style="color:#ef4444;">*</span></label>
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
                <button v-for="t in maintenanceTypes.slice(0,3)" :key="t.value"
                  @click="requestForm.maintenanceType = t.value" type="button"
                  style="display:flex;flex-direction:column;align-items:center;padding:12px;border-radius:8px;border:2px solid;cursor:pointer;transition:all 0.2s;"
                  :style="requestForm.maintenanceType === t.value
                    ? 'border-color:#d97706;background:rgba(217,119,6,0.08);'
                    : 'border-color:#f1f5f9;background:transparent;'">
                  <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-bottom:6px;"
                    :style="requestForm.maintenanceType === t.value ? 'color:#d97706;' : 'color:#6b7280;'">
                    <path stroke-linecap="round" stroke-linejoin="round" :d="t.icon"/>
                  </svg>
                  <span style="font-size:0.75rem;font-weight:600;"
                    :style="requestForm.maintenanceType === t.value ? 'color:#d97706;' : 'color:#374151;'">{{ t.label }}</span>
                </button>
              </div>
            </div>

            <!-- Description -->
            <div>
              <label style="display:block;font-size:0.85rem;font-weight:600;color:#374151;margin-bottom:4px;">설명 <span style="color:#ef4444;">*</span></label>
              <textarea v-model="requestForm.description" rows="3" placeholder="정비 요청 사유를 입력하세요"
                class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" style="width:100%;resize:none;font-family:'Pretendard Variable', sans-serif;"></textarea>
            </div>

            <!-- Confirmation checkbox -->
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none;padding:10px 12px;border-radius:8px;background:#ffffff;border:1px solid #f1f5f9;">
              <input type="checkbox" v-model="requestConfirmed" style="width:16px;height:16px;accent-color:#d97706;border-radius:4px;flex-shrink:0;" />
              <span style="font-size:0.78rem;color:#374151;">입력한 정비 요청 내용이 정확함을 확인합니다</span>
            </label>
          </div>

          <!-- Modal Footer -->
          <div style="padding:12px 24px;display:flex;justify-content:flex-end;gap:10px;border-top:1px solid #f1f5f9;background:#ffffff;">
            <button @click="closeModals" class="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">취소</button>
            <button @click="submitMaintenanceRequest"
              :disabled="!requestForm.description || !requestConfirmed || submitting"
              class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
              :style="(!requestForm.description || !requestConfirmed || submitting)
                ? 'background:#f1f5f9;color:#6b7280;cursor:not-allowed;'
                : 'background:#d97706;color:#f8fafc;'"
              style="display:inline-flex;align-items:center;gap:6px;">
              <svg v-if="submitting" style="width:16px;height:16px;animation:spin 0.8s linear infinite;" fill="none" viewBox="0 0 24 24">
                <circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              {{ submitting ? '등록 중...' : '요청 등록' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- =============================================
         MODAL: Maintenance Log
         ============================================= -->
    <div v-if="showMaintenanceLogModal" style="position:fixed;inset:0;z-index:50;overflow-y:auto;">
      <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:16px 16px 32px;">
        <div style="position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(6px);" @click="closeModals"></div>
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm " style="position:relative;z-index:1;max-width:28rem;width:100%;overflow:hidden;border-color:#059669;">

          <!-- Modal Header -->
          <div style="padding:16px 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #f1f5f9;">
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:rgba(16,185,129,0.08);">
                <svg width="18" height="18" style="color:#059669;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <h3 style="font-family:'Pretendard Variable', sans-serif;font-size:1.1rem;font-weight:700;color:#111827;margin:0;">정비 완료 기록</h3>
            </div>
            <button @click="closeModals" class="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50" style="padding:6px;color:#6b7280;">
              <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Modal Body -->
          <div style="padding:20px 24px;display:flex;flex-direction:column;gap:20px;">
            <!-- Target passport -->
            <div style="padding:12px;border-radius:8px;background:#ffffff;border:1px solid #f1f5f9;">
              <p style="font-size:0.6rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;font-family:'JetBrains Mono', monospace;margin:0 0 2px;">TARGET PASSPORT</p>
              <p style="font-size:0.85rem;font-weight:600;color:#111827;font-family:'JetBrains Mono', monospace;margin:0;">{{ selectedPassport?.passportId }}</p>
            </div>

            <!-- Maintenance type -->
            <div>
              <label style="display:block;font-size:0.85rem;font-weight:600;color:#374151;margin-bottom:8px;">정비 유형 <span style="color:#ef4444;">*</span></label>
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
                <button v-for="t in maintenanceTypes.slice(0,3)" :key="t.value"
                  @click="logForm.maintenanceType = t.value" type="button"
                  style="display:flex;flex-direction:column;align-items:center;padding:12px;border-radius:8px;border:2px solid;cursor:pointer;transition:all 0.2s;"
                  :style="logForm.maintenanceType === t.value
                    ? 'border-color:#059669;background:rgba(16,185,129,0.08);'
                    : 'border-color:#f1f5f9;background:transparent;'">
                  <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-bottom:6px;"
                    :style="logForm.maintenanceType === t.value ? 'color:#059669;' : 'color:#6b7280;'">
                    <path stroke-linecap="round" stroke-linejoin="round" :d="t.icon"/>
                  </svg>
                  <span style="font-size:0.75rem;font-weight:600;"
                    :style="logForm.maintenanceType === t.value ? 'color:#059669;' : 'color:#374151;'">{{ t.label }}</span>
                </button>
              </div>
            </div>

            <!-- Description -->
            <div>
              <label style="display:block;font-size:0.85rem;font-weight:600;color:#374151;margin-bottom:4px;">설명 <span style="color:#ef4444;">*</span></label>
              <textarea v-model="logForm.description" rows="3" placeholder="수행한 정비 내용을 입력하세요"
                class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" style="width:100%;resize:none;font-family:'Pretendard Variable', sans-serif;"></textarea>
            </div>

            <!-- Technician -->
            <div>
              <label style="display:block;font-size:0.85rem;font-weight:600;color:#374151;margin-bottom:4px;">담당 기술자 <span style="color:#ef4444;">*</span></label>
              <input v-model="logForm.technician" type="text" placeholder="기술자 이름"
                class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" style="width:100%;font-family:'Pretendard Variable', sans-serif;"/>
            </div>

            <!-- Confirmation checkbox -->
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none;padding:10px 12px;border-radius:8px;background:#ffffff;border:1px solid #f1f5f9;">
              <input type="checkbox" v-model="logConfirmed" style="width:16px;height:16px;accent-color:#059669;border-radius:4px;flex-shrink:0;" />
              <span style="font-size:0.78rem;color:#374151;">정비 완료 내용이 정확함을 확인합니다</span>
            </label>
          </div>

          <!-- Modal Footer -->
          <div style="padding:12px 24px;display:flex;justify-content:flex-end;gap:10px;border-top:1px solid #f1f5f9;background:#ffffff;">
            <button @click="closeModals" class="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">취소</button>
            <button @click="submitMaintenanceLog"
              :disabled="!logForm.description || !logForm.technician || !logConfirmed || submitting"
              class="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700"
              :style="(!logForm.description || !logForm.technician || !logConfirmed || submitting)
                ? 'opacity:0.4;cursor:not-allowed;'
                : ''"
              style="display:inline-flex;align-items:center;gap:6px;">
              <svg v-if="submitting" style="width:16px;height:16px;animation:spin 0.8s linear infinite;" fill="none" viewBox="0 0 24 24">
                <circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              {{ submitting ? '기록 중...' : '완료 기록' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- =============================================
         MODAL: Accident Log
         ============================================= -->
    <div v-if="showAccidentModal" style="position:fixed;inset:0;z-index:50;overflow-y:auto;">
      <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:16px 16px 32px;">
        <div style="position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(6px);" @click="closeModals"></div>
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm " style="position:relative;z-index:1;max-width:28rem;width:100%;overflow:hidden;border-color:#ef4444;">

          <!-- Modal Header -->
          <div style="padding:16px 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #f1f5f9;">
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:rgba(220,38,38,0.08);">
                <svg width="18" height="18" style="color:#ef4444;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>
              <h3 style="font-family:'Pretendard Variable', sans-serif;font-size:1.1rem;font-weight:700;color:#111827;margin:0;">사고 기록</h3>
            </div>
            <button @click="closeModals" class="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50" style="padding:6px;color:#6b7280;">
              <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Modal Body -->
          <div style="padding:20px 24px;display:flex;flex-direction:column;gap:20px;">
            <!-- Target passport -->
            <div style="padding:12px;border-radius:8px;background:#ffffff;border:1px solid #f1f5f9;">
              <p style="font-size:0.6rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;font-family:'JetBrains Mono', monospace;margin:0 0 2px;">TARGET PASSPORT</p>
              <p style="font-size:0.85rem;font-weight:600;color:#111827;font-family:'JetBrains Mono', monospace;margin:0;">{{ selectedPassport?.passportId }}</p>
            </div>

            <!-- Severity -->
            <div>
              <label style="display:block;font-size:0.85rem;font-weight:600;color:#374151;margin-bottom:8px;">심각도 <span style="color:#ef4444;">*</span></label>
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
                <button v-for="s in severityOptions" :key="s.value"
                  @click="accidentForm.severity = s.value" type="button"
                  :class="['flex flex-col items-center p-3 rounded-lg border-2 transition-all cursor-pointer',
                    accidentForm.severity === s.value ? s.bgClass + ' border-current' : 'border-gray-100']">
                  <span :class="['w-3.5 h-3.5 rounded-full mb-1.5', s.dotClass]"></span>
                  <span style="font-size:0.75rem;font-weight:600;">{{ s.label }}</span>
                </button>
              </div>
            </div>

            <!-- Description -->
            <div>
              <label style="display:block;font-size:0.85rem;font-weight:600;color:#374151;margin-bottom:4px;">사고 설명 <span style="color:#ef4444;">*</span></label>
              <textarea v-model="accidentForm.description" rows="3" placeholder="사고 상황을 상세히 기술하세요"
                class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" style="width:100%;resize:none;font-family:'Pretendard Variable', sans-serif;"></textarea>
            </div>

            <!-- Reporter -->
            <div>
              <label style="display:block;font-size:0.85rem;font-weight:600;color:#374151;margin-bottom:4px;">보고자 <span style="color:#ef4444;">*</span></label>
              <input v-model="accidentForm.reporter" type="text" placeholder="보고자 이름"
                class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" style="width:100%;font-family:'Pretendard Variable', sans-serif;"/>
            </div>

            <!-- Confirmation checkbox -->
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none;padding:10px 12px;border-radius:8px;background:rgba(220,38,38,0.08);border:1px solid #f1f5f9;">
              <input type="checkbox" v-model="accidentConfirmed" style="width:16px;height:16px;accent-color:#ef4444;border-radius:4px;flex-shrink:0;" />
              <span style="font-size:0.78rem;color:#374151;">사고 기록 내용이 정확함을 확인합니다</span>
            </label>
          </div>

          <!-- Modal Footer -->
          <div style="padding:12px 24px;display:flex;justify-content:flex-end;gap:10px;border-top:1px solid #f1f5f9;background:#ffffff;">
            <button @click="closeModals" class="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">취소</button>
            <button @click="submitAccident"
              :disabled="!accidentForm.description || !accidentForm.reporter || !accidentConfirmed || submitting"
              class="bg-red-50 text-red-700 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100"
              :style="(!accidentForm.description || !accidentForm.reporter || !accidentConfirmed || submitting)
                ? 'opacity:0.4;cursor:not-allowed;'
                : ''"
              style="display:inline-flex;align-items:center;gap:6px;">
              <svg v-if="submitting" style="width:16px;height:16px;animation:spin 0.8s linear infinite;" fill="none" viewBox="0 0 24 24">
                <circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
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
