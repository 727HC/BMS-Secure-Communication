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
      { value: 'minor', label: '경미', bgClass: 'bg-[rgba(200,255,0,0.08)] text-[#c8ff00] border-emerald-500', dotClass: 'bg-[#34d399]' },
      { value: 'moderate', label: '보통', bgClass: 'bg-[rgba(255,184,0,0.1)] text-[#ffb800] border-amber-200', dotClass: 'bg-[#fbbf24]' },
      { value: 'severe', label: '심각', bgClass: 'bg-[rgba(239,68,68,0.1)] text-[#ff6b6b] border-[rgba(250,250,245,0.06)]', dotClass: 'bg-[rgba(239,68,68,0.1)]0' },
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
  <div style="display:flex;flex-direction:column;gap:16px;">

    <!-- LOADING -->
    <div v-if="loading" style="display: flex; align-items: center; justify-content: center; min-height: 40vh;">
      <div style="width: 28px; height: 28px; border: 2px solid rgba(0,0,0,0.06); border-top-color: var(--color-accent); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
    </div>

    <template v-else>

      <!-- HEADER -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--color-border);">
        <div>
          <h1 class="sn-display" style="font-size: 1.5rem;">정비 / 서비스</h1>
          <p class="sn-caption" style="margin-top: 0.125rem;">배터리 정비 요청, 완료 기록 및 사고 이력 관리</p>
        </div>
        <button @click="fetchPassports" class="sn-btn sn-btn-ghost" style="display:inline-flex;align-items:center;gap:6px;">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          새로고침
        </button>
      </div>

      <!-- FILTER TABS -->
      <div style="display:flex;gap:4px;border-bottom:1px solid rgba(0,0,0,0.06);padding-bottom:0;">
        <button v-for="tab in tabs" :key="tab.key" @click="activeTab = tab.key"
          style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;font-size:0.85rem;font-weight:500;cursor:pointer;border:none;background:none;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all 0.2s;"
          :style="activeTab === tab.key ? 'color:#171717;border-bottom-color:#171717;' : 'color:#a3a3a3;'">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" :d="tab.icon"/>
          </svg>
          {{ tab.label }}
          <span style="font-size:0.68rem;font-family:'JetBrains Mono',monospace;padding:1px 7px;border-radius:12px;"
            :style="activeTab === tab.key ? 'background:#f5f5f5;color:#171717;' : 'background:#f5f5f5;color:#a3a3a3;'">
            {{ tabCounts[tab.key] }}
          </span>
        </button>
      </div>

      <!-- SUMMARY STAT -->
      <div v-if="filteredPassports.length > 0" style="display: flex; gap: 1.5rem; margin-bottom: 1rem;">
        <div style="display: flex; align-items: baseline; gap: 0.375rem;">
          <span style="font-family: var(--font-mono); font-size: 1.25rem; font-weight: 700; color: var(--color-text-1);">{{ filteredPassports.length }}</span>
          <span style="font-size: 0.75rem; color: var(--color-text-3);">대상 여권</span>
        </div>
      </div>

      <!-- EMPTY STATE -->
      <div v-if="filteredPassports.length === 0" style="position: relative; padding-left: 2rem; min-height: 200px;">
        <div style="position: absolute; left: 0.75rem; top: 0; bottom: 0; width: 2px; background: rgba(0,0,0,0.06);"></div>
        <div style="position: absolute; left: 0.5rem; top: 50%; transform: translateY(-50%); width: 12px; height: 12px; border-radius: 50%; background: rgba(0,0,0,0.06);"></div>
        <div style="display: flex; align-items: center; justify-content: center; min-height: 200px;">
          <p style="font-size: 0.875rem; color: var(--color-text-3);">현재 정비 이력이 없습니다</p>
        </div>
      </div>

      <!-- TIMELINE VIEW (structural change from flat list) -->
      <div v-else style="position: relative; padding-left: 2rem;">
        <!-- Timeline line -->
        <div style="position: absolute; left: 0.75rem; top: 0; bottom: 0; width: 2px; background: rgba(0,0,0,0.06);"></div>

        <div v-for="(p, idx) in filteredPassports" :key="p.passportId"
          @click="navigateToDetail(p)"
          style="position: relative; margin-bottom: 1rem; cursor: pointer;">
          <!-- Timeline dot -->
          <div style="position: absolute; left: -1.625rem; top: 0.75rem; width: 10px; height: 10px; border-radius: 50%; border: 2px solid #fff;"
            :style="{ background: p.status==='MAINTENANCE'?'#d97706':p.status==='ANALYSIS'?'#7c3aed':'#16a34a' }"></div>

          <!-- Entry card -->
          <div style="background: #fff; border: 1px solid rgba(0,0,0,0.06); border-radius: 8px; padding: 0.875rem 1rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
              <span style="font-size: 0.875rem; font-weight: 600; color: var(--color-text-1);">{{ p.model || p.passportId }}</span>
              <span style="font-size: 0.625rem; font-weight: 600; padding: 0.125rem 0.5rem; border-radius: 3px;"
                :style="{ background: p.status==='MAINTENANCE'?'#fffbeb':'#f0fdf4', color: p.status==='MAINTENANCE'?'#d97706':'#16a34a' }">
                {{ getStatusBadge(p.status).label }}
              </span>
            </div>
            <div style="font-size: 0.75rem; color: var(--color-text-3); font-family: var(--font-mono);">{{ p.passportId }}</div>
            <div v-if="p.maintenanceLogs && p.maintenanceLogs.length" style="margin-top: 0.5rem; font-size: 0.75rem; color: var(--color-text-2);">
              정비 {{ p.maintenanceLogs.length }}건 기록
            </div>
            <!-- Actions row -->
            <div v-if="canRequestMaintenance || canLogMaintenance || canLogAccident"
              style="display:flex;align-items:center;gap:8px;margin-top:0.625rem;" @click.stop>
              <button v-if="canRequestMaintenance && p.status === 'ACTIVE'"
                @click="openMaintenanceRequest(p)"
                class="sn-btn sn-btn-ghost" style="font-size:0.75rem;padding:4px 10px;display:inline-flex;align-items:center;gap:4px;">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                </svg>
                정비요청
              </button>
              <button v-if="canLogMaintenance && p.status === 'MAINTENANCE'"
                @click="openMaintenanceLog(p)"
                class="sn-btn sn-btn-accent" style="font-size:0.75rem;padding:4px 10px;display:inline-flex;align-items:center;gap:4px;">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                정비완료
              </button>
              <button v-if="canLogAccident"
                @click="openAccident(p)"
                style="font-size:0.75rem;padding:4px 10px;display:inline-flex;align-items:center;gap:4px;background:#fef2f2;color:#dc2626;border:none;border-radius:6px;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(220,38,38,0.2);">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                사고기록
              </button>
            </div>
          </div>
        </div>
      </div>

    </template>

    <!-- MODAL: Maintenance Request -->
    <div v-if="showMaintenanceRequestModal" class="sn-overlay" @click.self="closeModals">
      <div class="sn-modal" style="max-width:28rem;">
        <div style="padding:16px 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(0,0,0,0.06);">
          <h3 style="font-size:1.05rem;font-weight:700;color:#171717;margin:0;">정비 요청</h3>
          <button @click="closeModals" class="sn-btn sn-btn-ghost" style="padding:6px 10px;">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div style="padding:20px 24px;display:flex;flex-direction:column;gap:20px;">
          <div style="padding:12px;border-radius:8px;background:#fafafa;box-shadow:inset 0 0 0 1px rgba(0,0,0,0.06);">
            <p class="sn-eyebrow" style="margin:0 0 2px;">TARGET PASSPORT</p>
            <p style="font-size:0.85rem;font-weight:600;color:#171717;font-family:'JetBrains Mono',monospace;margin:0;">{{ selectedPassport?.passportId }}</p>
          </div>
          <div>
            <label style="display:block;font-size:0.85rem;font-weight:600;color:#171717;margin-bottom:8px;">정비 유형 <span style="color:#dc2626;">*</span></label>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
              <button v-for="t in maintenanceTypes.slice(0,3)" :key="t.value"
                @click="requestForm.maintenanceType = t.value" type="button"
                style="display:flex;flex-direction:column;align-items:center;padding:12px;border-radius:8px;cursor:pointer;transition:all 0.2s;"
                :style="requestForm.maintenanceType===t.value ? 'box-shadow:inset 0 0 0 2px #171717;background:#f5f5f5;' : 'box-shadow:inset 0 0 0 1px rgba(0,0,0,0.08);background:#fff;'">
                <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-bottom:6px;"
                  :style="requestForm.maintenanceType===t.value ? 'color:#171717;' : 'color:#a3a3a3;'">
                  <path stroke-linecap="round" stroke-linejoin="round" :d="t.icon"/>
                </svg>
                <span style="font-size:0.75rem;font-weight:600;"
                  :style="requestForm.maintenanceType===t.value ? 'color:#171717;' : 'color:#525252;'">{{ t.label }}</span>
              </button>
            </div>
          </div>
          <div>
            <label style="display:block;font-size:0.85rem;font-weight:600;color:#171717;margin-bottom:4px;">설명 <span style="color:#dc2626;">*</span></label>
            <textarea v-model="requestForm.description" rows="3" placeholder="정비 요청 사유를 입력하세요" class="sn-input" style="width:100%;resize:none;"></textarea>
          </div>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none;padding:10px 12px;border-radius:8px;background:#fafafa;box-shadow:inset 0 0 0 1px rgba(0,0,0,0.06);">
            <input type="checkbox" v-model="requestConfirmed" style="width:16px;height:16px;accent-color:#171717;border-radius:4px;flex-shrink:0;" />
            <span style="font-size:0.78rem;color:#525252;">입력한 정비 요청 내용이 정확함을 확인합니다</span>
          </label>
        </div>
        <div style="padding:12px 24px;display:flex;justify-content:flex-end;gap:10px;border-top:1px solid rgba(0,0,0,0.06);">
          <button @click="closeModals" class="sn-btn sn-btn-ghost">취소</button>
          <button @click="submitMaintenanceRequest" :disabled="!requestForm.description||!requestConfirmed||submitting" class="sn-btn sn-btn-accent"
            :style="(!requestForm.description||!requestConfirmed||submitting)?'opacity:0.4;cursor:not-allowed;':''"
            style="display:inline-flex;align-items:center;gap:6px;">
            <svg v-if="submitting" style="width:14px;height:14px;animation:spin 0.8s linear infinite;" fill="none" viewBox="0 0 24 24"><circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            {{ submitting ? '등록 중...' : '요청 등록' }}
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: Maintenance Log -->
    <div v-if="showMaintenanceLogModal" class="sn-overlay" @click.self="closeModals">
      <div class="sn-modal" style="max-width:28rem;">
        <div style="padding:16px 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(0,0,0,0.06);">
          <h3 style="font-size:1.05rem;font-weight:700;color:#171717;margin:0;">정비 완료 기록</h3>
          <button @click="closeModals" class="sn-btn sn-btn-ghost" style="padding:6px 10px;">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div style="padding:20px 24px;display:flex;flex-direction:column;gap:20px;">
          <div style="padding:12px;border-radius:8px;background:#fafafa;box-shadow:inset 0 0 0 1px rgba(0,0,0,0.06);">
            <p class="sn-eyebrow" style="margin:0 0 2px;">TARGET PASSPORT</p>
            <p style="font-size:0.85rem;font-weight:600;color:#171717;font-family:'JetBrains Mono',monospace;margin:0;">{{ selectedPassport?.passportId }}</p>
          </div>
          <div>
            <label style="display:block;font-size:0.85rem;font-weight:600;color:#171717;margin-bottom:8px;">정비 유형 <span style="color:#dc2626;">*</span></label>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
              <button v-for="t in maintenanceTypes.slice(0,3)" :key="t.value"
                @click="logForm.maintenanceType = t.value" type="button"
                style="display:flex;flex-direction:column;align-items:center;padding:12px;border-radius:8px;cursor:pointer;transition:all 0.2s;"
                :style="logForm.maintenanceType===t.value ? 'box-shadow:inset 0 0 0 2px #171717;background:#f5f5f5;' : 'box-shadow:inset 0 0 0 1px rgba(0,0,0,0.08);background:#fff;'">
                <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-bottom:6px;"
                  :style="logForm.maintenanceType===t.value ? 'color:#171717;' : 'color:#a3a3a3;'">
                  <path stroke-linecap="round" stroke-linejoin="round" :d="t.icon"/>
                </svg>
                <span style="font-size:0.75rem;font-weight:600;" :style="logForm.maintenanceType===t.value ? 'color:#171717;' : 'color:#525252;'">{{ t.label }}</span>
              </button>
            </div>
          </div>
          <div>
            <label style="display:block;font-size:0.85rem;font-weight:600;color:#171717;margin-bottom:4px;">설명 <span style="color:#dc2626;">*</span></label>
            <textarea v-model="logForm.description" rows="3" placeholder="수행한 정비 내용을 입력하세요" class="sn-input" style="width:100%;resize:none;"></textarea>
          </div>
          <div>
            <label style="display:block;font-size:0.85rem;font-weight:600;color:#171717;margin-bottom:4px;">담당 기술자 <span style="color:#dc2626;">*</span></label>
            <input v-model="logForm.technician" type="text" placeholder="기술자 이름" class="sn-input" style="width:100%;" />
          </div>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none;padding:10px 12px;border-radius:8px;background:#fafafa;box-shadow:inset 0 0 0 1px rgba(0,0,0,0.06);">
            <input type="checkbox" v-model="logConfirmed" style="width:16px;height:16px;accent-color:#171717;border-radius:4px;flex-shrink:0;" />
            <span style="font-size:0.78rem;color:#525252;">정비 완료 내용이 정확함을 확인합니다</span>
          </label>
        </div>
        <div style="padding:12px 24px;display:flex;justify-content:flex-end;gap:10px;border-top:1px solid rgba(0,0,0,0.06);">
          <button @click="closeModals" class="sn-btn sn-btn-ghost">취소</button>
          <button @click="submitMaintenanceLog" :disabled="!logForm.description||!logForm.technician||!logConfirmed||submitting" class="sn-btn sn-btn-accent"
            :style="(!logForm.description||!logForm.technician||!logConfirmed||submitting)?'opacity:0.4;cursor:not-allowed;':''"
            style="display:inline-flex;align-items:center;gap:6px;">
            <svg v-if="submitting" style="width:14px;height:14px;animation:spin 0.8s linear infinite;" fill="none" viewBox="0 0 24 24"><circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            {{ submitting ? '기록 중...' : '완료 기록' }}
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: Accident Log -->
    <div v-if="showAccidentModal" class="sn-overlay" @click.self="closeModals">
      <div class="sn-modal" style="max-width:28rem;">
        <div style="padding:16px 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(0,0,0,0.06);">
          <h3 style="font-size:1.05rem;font-weight:700;color:#171717;margin:0;">사고 기록</h3>
          <button @click="closeModals" class="sn-btn sn-btn-ghost" style="padding:6px 10px;">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div style="padding:20px 24px;display:flex;flex-direction:column;gap:20px;">
          <div style="padding:12px;border-radius:8px;background:#fafafa;box-shadow:inset 0 0 0 1px rgba(0,0,0,0.06);">
            <p class="sn-eyebrow" style="margin:0 0 2px;">TARGET PASSPORT</p>
            <p style="font-size:0.85rem;font-weight:600;color:#171717;font-family:'JetBrains Mono',monospace;margin:0;">{{ selectedPassport?.passportId }}</p>
          </div>
          <div>
            <label style="display:block;font-size:0.85rem;font-weight:600;color:#171717;margin-bottom:8px;">심각도 <span style="color:#dc2626;">*</span></label>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
              <button v-for="s in severityOptions" :key="s.value"
                @click="accidentForm.severity = s.value" type="button"
                style="display:flex;flex-direction:column;align-items:center;padding:12px;border-radius:8px;cursor:pointer;transition:all 0.2s;"
                :style="accidentForm.severity===s.value ? 'box-shadow:inset 0 0 0 2px #171717;background:#f5f5f5;' : 'box-shadow:inset 0 0 0 1px rgba(0,0,0,0.08);background:#fff;'">
                <span style="width:14px;height:14px;border-radius:50%;margin-bottom:6px;"
                  :class="s.dotClass"></span>
                <span style="font-size:0.75rem;font-weight:600;color:#525252;">{{ s.label }}</span>
              </button>
            </div>
          </div>
          <div>
            <label style="display:block;font-size:0.85rem;font-weight:600;color:#171717;margin-bottom:4px;">사고 설명 <span style="color:#dc2626;">*</span></label>
            <textarea v-model="accidentForm.description" rows="3" placeholder="사고 상황을 상세히 기술하세요" class="sn-input" style="width:100%;resize:none;"></textarea>
          </div>
          <div>
            <label style="display:block;font-size:0.85rem;font-weight:600;color:#171717;margin-bottom:4px;">보고자 <span style="color:#dc2626;">*</span></label>
            <input v-model="accidentForm.reporter" type="text" placeholder="보고자 이름" class="sn-input" style="width:100%;" />
          </div>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none;padding:10px 12px;border-radius:8px;background:#fff5f5;box-shadow:inset 0 0 0 1px rgba(220,38,38,0.15);">
            <input type="checkbox" v-model="accidentConfirmed" style="width:16px;height:16px;accent-color:#dc2626;border-radius:4px;flex-shrink:0;" />
            <span style="font-size:0.78rem;color:#525252;">사고 기록 내용이 정확함을 확인합니다</span>
          </label>
        </div>
        <div style="padding:12px 24px;display:flex;justify-content:flex-end;gap:10px;border-top:1px solid rgba(0,0,0,0.06);">
          <button @click="closeModals" class="sn-btn sn-btn-ghost">취소</button>
          <button @click="submitAccident" :disabled="!accidentForm.description||!accidentForm.reporter||!accidentConfirmed||submitting"
            class="sn-btn sn-btn-danger" style="display:inline-flex;align-items:center;gap:6px;"
            :style="(!accidentForm.description||!accidentForm.reporter||!accidentConfirmed||submitting)?'opacity:0.4;cursor:not-allowed;':''">
            <svg v-if="submitting" style="width:14px;height:14px;animation:spin 0.8s linear infinite;" fill="none" viewBox="0 0 24 24"><circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            {{ submitting ? '기록 중...' : '사고 기록' }}
          </button>
        </div>
      </div>
    </div>

  </div>
  `,
});
