app.component('passports-page', {
  props: ['auth', 'api'],
  emits: ['navigate'],
  setup(props, { emit }) {
    const { ref, computed, onMounted } = Vue;

    const passports = ref([]);
    const loading = ref(true);
    const searchQuery = ref('');
    const initFilter = (window.__pageProps && window.__pageProps.filterStatus) || '';
    const filterStatus = ref(initFilter);
    const sortBy = ref((window.__pageProps && window.__pageProps.sortBy) || '');
    const showCreateModal = ref(false);
    const creating = ref(false);
    const createStep = ref(1);

    const form = ref(getEmptyForm());

    function getEmptyForm() {
      const ts = Date.now();
      return {
        passportId: 'PASSPORT-' + ts,
        batteryId: 'BATTERY-' + ts,
        did: '',
        model: '',
        serialNumber: '',
        manufacturerName: '',
        manufactureCountry: '',
        cellManufacturer: '',
        cellManufactureCountry: '',
        manufactureDate: '',
        cellType: '',
        chemistry: '',
        cellCount: '',
        weight: '',
        totalEnergy: '',
        energyDensity: '',
        ratedCapacity: '',
        expectedLifespan: '',
        voltageRange: '',
        temperatureRange: '',
        carbonFootprint: '',
      };
    }

    const statusOptions = [
      { value: '', label: '전체 상태' },
      { value: 'MANUFACTURED', label: '제조완료' },
      { value: 'ACTIVE', label: '운행중' },
      { value: 'MAINTENANCE', label: '정비중' },
      { value: 'ANALYSIS', label: '분석중' },
      { value: 'RECYCLING', label: '재활용' },
      { value: 'DISPOSED', label: '폐기' },
    ];

    const isManufacturer = computed(() => props.auth.orgMsp === MSP.MANUFACTURER);

    const gbaFields = ['passportId','batteryId','serialNumber','model','manufacturerName','manufactureCountry',
      'cellManufacturer','cellManufactureCountry','manufactureDate','cellType','chemistry',
      'cellCount','weight','totalEnergy','energyDensity','ratedCapacity','expectedLifespan',
      'voltageRange','temperatureRange','carbonFootprint','rawMaterials'];

    function getGbaPct(p) {
      let filled = 0;
      gbaFields.forEach(k => {
        if (k === 'carbonFootprint') {
          if ((p[k] && p[k] !== 0) || (p.weight > 0 && p.totalEnergy > 0)) filled++;
        } else {
          const v = p[k];
          if (v != null && v !== '' && v !== 0 && !(Array.isArray(v) && v.length === 0)) filled++;
        }
      });
      return Math.round((filled / 21) * 100);
    }

    const filteredPassports = computed(() => {
      let list = passports.value;
      if (filterStatus.value) {
        list = list.filter(p => p.status === filterStatus.value);
      }
      if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase();
        list = list.filter(p =>
          (p.serialNumber || '').toLowerCase().includes(q) ||
          (p.passportId || '').toLowerCase().includes(q) ||
          (p.model || '').toLowerCase().includes(q) ||
          (p.manufacturerName || '').toLowerCase().includes(q) ||
          (p.vin || '').toLowerCase().includes(q)
        );
      }
      if (sortBy.value === 'gba') {
        list = [...list].sort((a, b) => getGbaPct(a) - getGbaPct(b));
      }
      return list;
    });

    const step1Fields = ['passportId','batteryId','did','model','serialNumber','manufacturerName','manufactureCountry','cellManufacturer','cellManufactureCountry','manufactureDate','cellType','chemistry'];
    const step2Fields = ['cellCount','weight','totalEnergy','energyDensity','ratedCapacity','expectedLifespan','voltageRange','temperatureRange','carbonFootprint'];
    const allFields = [...step1Fields, ...step2Fields];

    const completionPct = computed(() => {
      let filled = 0;
      allFields.forEach(k => {
        const v = form.value[k];
        if (v != null && v !== '' && v !== 0) filled++;
      });
      return Math.round((filled / allFields.length) * 100);
    });

    function nextStep() {
      if (createStep.value === 1) {
        if (!form.value.model || !form.value.serialNumber || !form.value.manufacturerName || !form.value.did) {
          window.$toast('error', '모델, 시리얼번호, 제조사명, DID는 필수입니다.');
          return;
        }
      }
      if (createStep.value < 3) createStep.value++;
    }
    function prevStep() {
      if (createStep.value > 1) createStep.value--;
    }

    async function fetchPassports() {
      loading.value = true;
      try {
        const data = await props.api.get('/passports');
        passports.value = data.records || data || [];
      } catch (e) {
        window.$toast('error', '여권 목록을 불러오지 못했습니다: ' + e.message);
        passports.value = [];
      } finally {
        loading.value = false;
      }
    }

    onMounted(fetchPassports);

    function openCreateModal() {
      form.value = getEmptyForm();
      createStep.value = 1;
      showCreateModal.value = true;
    }

    function closeCreateModal() {
      showCreateModal.value = false;
    }

    async function submitCreate() {
      if (!form.value.serialNumber || !form.value.manufacturerName || !form.value.model || !form.value.did) {
        window.$toast('error', '시리얼번호, 제조사명, 모델, DID는 필수입니다.');
        return;
      }
      creating.value = true;
      try {
        const body = { ...form.value };
        const numFields = ['cellCount', 'weight', 'totalEnergy', 'energyDensity', 'ratedCapacity', 'expectedLifespan', 'carbonFootprint'];
        for (const k of numFields) {
          if (body[k] !== '' && body[k] != null) {
            const n = Number(body[k]);
            if (isNaN(n) || n < 0) {
              window.$toast('error', k + ' 값이 올바르지 않습니다.');
              creating.value = false;
              return;
            }
            body[k] = n;
          } else {
            delete body[k];
          }
        }
        await props.api.post('/passports', body);
        window.$toast('success', '배터리 여권이 생성되었습니다.');
        closeCreateModal();
        await fetchPassports();
      } catch (e) {
        window.$toast('error', '여권 생성 실패: ' + e.message);
      } finally {
        creating.value = false;
      }
    }

    function viewDetail(passportId) {
      emit('navigate', 'passport-detail', { passportId });
    }

    function getSocColor(soc) {
      if (soc == null) return 'bg-[#33302a]';
      if (soc >= 60) return 'bg-[#34d399]';
      if (soc >= 30) return 'bg-[#fbbf24]';
      return 'bg-[rgba(239,68,68,0.1)]0';
    }

    return {
      passports, loading, searchQuery, filterStatus, showCreateModal, creating, createStep,
      form, statusOptions, isManufacturer, filteredPassports, scaleSOC, completionPct,
      openCreateModal, closeCreateModal, submitCreate, viewDetail, getStatusBadge, getSocColor,
      nextStep, prevStep,
    };
  },
  template: `
    <div>
      <!-- LOADING -->
      <div v-if="loading" class="flex flex-col justify-center items-center py-32">
        <div class="relative w-14 h-14 mb-4">
          <div class="absolute inset-0 rounded-full border-2 border-transparent" style="border-top-color: #c8ff00; animation: spin 0.8s linear infinite;"></div>
          <div class="absolute inset-2 rounded-full border-2 border-transparent" style="border-bottom-color: #c8ff00; opacity: 0.3; animation: spin 1.2s linear infinite reverse;"></div>
        </div>
        <p class="text-sm" style="color: rgba(250,250,245,0.35); font-family: 'JetBrains Mono', monospace;">LOADING REGISTRY...</p>
      </div>

      <div v-else class="space-y-5">

        <!-- HEADER -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10  flex items-center justify-center" style="background: rgba(16,185,129,0.08);">
              <svg class="w-5 h-5" style="color: #c8ff00;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-xl text-[#fafaf5] font-bold" style="font-family: 'Pretendard Variable', sans-serif;">배터리 여권</h1>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[rgba(200,255,0,0.08)] text-[#c8ff00]" style="font-family: 'JetBrains Mono', monospace;">{{ filteredPassports.length }}</span>
              </div>
              <p class="text-xs" style="color: rgba(250,250,245,0.35);">전체 {{ passports.length }}건 등록</p>
            </div>
          </div>
          <button v-if="isManufacturer" @click="openCreateModal" class="bg-[#c8ff00] text-[#1a1814] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#d4ff33]">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            여권 발급
          </button>
        </div>

        <!-- FILTER BAR -->
        <div class="bg-[#1a1814]  border border-[rgba(250,250,245,0.06)] shadow-none p-3 flex flex-col sm:flex-row gap-3  ">
          <div class="relative flex-1">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg class="w-4 h-4" style="color: rgba(250,250,245,0.35);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
            <input v-model="searchQuery" type="text" placeholder="ID, 시리얼, 모델, 제조사, VIN 검색..." class="w-full px-4 py-2.5 bg-[#1f1d17] border border-[rgba(250,250,245,0.06)]  text-[#fafaf5] outline-none focus:border-[#c8ff00]" style="padding-left: 2.25rem; padding-right: 4.5rem; font-size: 0.8125rem;" />
            <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <kbd style="font-family: 'JetBrains Mono', monospace; font-size: 10px; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(250,250,245,0.06); background: #1f1d17; color: rgba(250,250,245,0.35); line-height: 1;">&#8984;K</kbd>
            </div>
          </div>
          <select v-model="filterStatus" class="w-full px-4 py-2.5 bg-[#1f1d17] border border-[rgba(250,250,245,0.06)]  text-[#fafaf5] outline-none focus:border-[#c8ff00]" style="width: auto; min-width: 140px; font-size: 0.8125rem;">
            <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>

        <!-- TABLE -->
        <div class="bg-[#1a1814]  border border-[rgba(250,250,245,0.06)] shadow-none overflow-hidden  ">
          <div v-if="filteredPassports.length > 0" class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>시리얼</th>
                  <th>모델</th>
                  <th>제조사</th>
                  <th>상태</th>
                  <th>SOC</th>
                  <th>SOH</th>
                  <th>VIN</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(p, idx) in filteredPassports" :key="p.passportId"
                    @click="viewDetail(p.passportId)" class="cursor-pointer " style="position: relative;"
                    :style="'animation-delay: ' + (idx * 0.03) + 's;'">
                  <td style="position: relative; padding-left: 1.25rem;">
                    <span class="passport-row-status-bar" :style="{
                      position: 'absolute', left: 0, top: '4px', bottom: '4px', width: '3px', borderRadius: '0 3px 3px 0',
                      backgroundColor: p.status === 'MANUFACTURED' ? '#60a5fa' :
                        p.status === 'ACTIVE' ? '#34d399' :
                        p.status === 'MAINTENANCE' ? '#fbbf24' :
                        p.status === 'ANALYSIS' ? '#a78bfa' :
                        p.status === 'RECYCLING' ? '#f97316' :
                        p.status === 'DISPOSED' ? '#ef4444' : '#64748b'
                    }"></span>
                    <span class="text-xs font-medium" style="color: #c8ff00; font-family: 'JetBrains Mono', monospace;">{{ p.passportId ? p.passportId.substring(0, 20) : '-' }}</span>
                  </td>
                  <td style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem;">{{ p.serialNumber || '-' }}</td>
                  <td class="font-medium" style="color: #fafaf5;">{{ p.model || '-' }}</td>
                  <td>{{ p.manufacturerName || '-' }}</td>
                  <td>
                    <span class="inline-flex items-center gap-1.5">
                      <span class="w-1.5 h-1.5 rounded-full" :style="{
                        backgroundColor: p.status === 'MANUFACTURED' ? '#60a5fa' :
                          p.status === 'ACTIVE' ? '#34d399' :
                          p.status === 'MAINTENANCE' ? '#fbbf24' :
                          p.status === 'ANALYSIS' ? '#a78bfa' :
                          p.status === 'RECYCLING' ? '#f97316' : '#64748b'
                      }"></span>
                      <span :class="[
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold',
                        p.status === 'ACTIVE' ? 'bg-[rgba(200,255,0,0.08)] text-[#c8ff00]' :
                        p.status === 'MAINTENANCE' ? 'bg-[rgba(255,184,0,0.1)] text-[#ffb800]' :
                        p.status === 'ANALYSIS' ? 'bg-[rgba(192,132,252,0.1)] text-[#c084fc]' :
                        p.status === 'MANUFACTURED' ? 'bg-[rgba(107,163,255,0.1)] text-[#6ba3ff]' :
                        p.status === 'RECYCLING' ? 'bg-[rgba(255,184,0,0.1)] text-[#ffb800]' : 'bg-[#2a2720] text-[rgba(250,250,245,0.5)]'
                      ]">{{ STATUS_LABELS[p.status] || p.status || '-' }}</span>
                    </span>
                  </td>
                  <td>
                    <div v-if="p.currentSoc != null" class="flex items-center gap-2 min-w-[90px]">
                      <div class="flex-1 h-1.5 rounded-full overflow-hidden" style="background: #e2e8f0;">
                        <div :class="['h-full rounded-full transition-all', getSocColor(scaleSOC(p.currentSoc))]"
                          :style="{ width: Math.min(scaleSOC(p.currentSoc), 100) + '%' }"></div>
                      </div>
                      <span class="text-xs tabular-nums font-medium w-8 text-right" style="font-family: 'JetBrains Mono', monospace; color: rgba(250,250,245,0.7);">{{ scaleSOC(p.currentSoc) }}%</span>
                    </div>
                    <span v-else class="text-xs" style="color: rgba(250,250,245,0.2);">—</span>
                  </td>
                  <td>
                    <span v-if="p.currentSoh != null" class="text-xs tabular-nums" style="font-family: 'JetBrains Mono', monospace; color: rgba(250,250,245,0.7);">{{ p.currentSoh }}%</span>
                    <span v-else class="text-xs" style="color: rgba(250,250,245,0.2);">—</span>
                  </td>
                  <td>
                    <span v-if="p.vin" class="text-xs" style="font-family: 'JetBrains Mono', monospace; color: rgba(250,250,245,0.7);">{{ p.vin }}</span>
                    <span v-else class="text-xs" style="color: rgba(250,250,245,0.2);">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Empty state -->
          <div v-else class="py-20 text-center">
            <div class="w-14 h-14 mx-auto mb-4  flex items-center justify-center" style="background: #1f1d17;">
              <svg class="w-7 h-7" style="color: rgba(250,250,245,0.2);" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/>
              </svg>
            </div>
            <p class="text-sm font-medium" style="color: rgba(250,250,245,0.7);">등록된 여권이 없습니다</p>
            <p class="text-xs mt-1" style="color: rgba(250,250,245,0.2);">검색 조건을 변경하거나 새 여권을 발급하세요.</p>
          </div>
        </div>
      </div>

      <!-- CREATE MODAL — 3-step wizard -->
      <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(6,9,15,0.8); backdrop-filter: blur(8px);" @click.self="closeCreateModal">
        <div class="w-full max-w-lg  overflow-hidden " style="background: #1a1814; border: 1px solid rgba(250,250,245,0.06); box-shadow: 0 4px 20px rgba(0,0,0,0.08);">

          <!-- Modal header -->
          <div class="px-6 py-4 flex items-center justify-between" style="border-bottom: 1px solid #e5e7eb;">
            <div>
              <h3 class="text-base font-semibold" style="font-family: 'Pretendard Variable', sans-serif; color: #fafaf5; letter-spacing: -0.01em;">배터리 여권 발급</h3>
              <p class="text-xs mt-0.5" style="color: rgba(250,250,245,0.35);">단계 {{ createStep }} / 3</p>
            </div>
            <button @click="closeCreateModal" class="p-1.5 rounded-lg transition-colors" style="color: rgba(250,250,245,0.35);"
              onmouseenter="this.style.color='#dc2626';this.style.background='rgba(220,38,38,0.08)'"
              onmouseleave="this.style.color='#6b7280';this.style.background='transparent'">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <!-- Circular Progress + Step indicators -->
          <div class="px-6 pt-5 pb-2">
            <div class="flex items-center justify-between">
              <!-- Circular progress -->
              <div class="flex items-center gap-4">
                <div class="relative w-16 h-16 flex-shrink-0">
                  <svg viewBox="0 0 64 64" class="w-full h-full" style="transform: rotate(-90deg);">
                    <circle cx="32" cy="32" r="27" fill="none" stroke="#e2e8f0" stroke-width="5"/>
                    <circle cx="32" cy="32" r="27" fill="none" stroke="#059669" stroke-width="5"
                      stroke-linecap="round"
                      :stroke-dasharray="2 * Math.PI * 27"
                      :stroke-dashoffset="2 * Math.PI * 27 * (1 - completionPct / 100)"
                      style="transition: stroke-dashoffset 0.5s ease;"/>
                  </svg>
                  <div class="absolute inset-0 flex items-center justify-center">
                    <span class="text-xs font-bold" style="color: #c8ff00; font-family: 'JetBrains Mono', monospace;">{{ completionPct }}%</span>
                  </div>
                </div>
                <div>
                  <span class="text-[10px] font-medium uppercase tracking-wider" style="color: rgba(250,250,245,0.35); font-family: 'JetBrains Mono', monospace;">COMPLETION</span>
                  <p class="text-xs mt-0.5" style="color: rgba(250,250,245,0.7);">{{ completionPct >= 100 ? '모든 항목 입력 완료' : '필수 항목을 입력하세요' }}</p>
                </div>
              </div>

              <!-- Step circles -->
              <div class="flex items-center gap-2">
                <template v-for="s in 3" :key="s">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                    :style="s < createStep
                      ? 'background: #059669; color: #fff;'
                      : s === createStep
                        ? 'background: rgba(16,185,129,0.08); color: #c8ff00; border: 2px solid #059669;'
                        : 'background: #e2e8f0; color: rgba(250,250,245,0.35);'">
                    <svg v-if="s < createStep" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span v-else>{{ s }}</span>
                  </div>
                  <div v-if="s < 3" class="w-5 h-0.5 rounded-full transition-all" :style="s < createStep ? 'background: #059669;' : 'background: #e2e8f0;'"></div>
                </template>
              </div>
            </div>
          </div>

          <!-- Step content -->
          <div class="px-6 py-5 space-y-3" style="max-height: 400px; overflow-y: auto;">

            <!-- STEP 1 -->
            <template v-if="createStep === 1">
              <div class="grid grid-cols-2 gap-3">
                <div class="col-span-2">
                  <label class="block text-[10px] font-semibold uppercase tracking-wider mb-1" style="color: rgba(250,250,245,0.35);">DID *</label>
                  <input v-model="form.did" class="w-full px-4 py-2.5 bg-[#1f1d17] border border-[rgba(250,250,245,0.06)]  text-[#fafaf5] outline-none focus:border-[#c8ff00]" placeholder="DID 식별자" />
                </div>
                <div>
                  <label class="block text-[10px] font-semibold uppercase tracking-wider mb-1" style="color: rgba(250,250,245,0.35);">모델 *</label>
                  <input v-model="form.model" class="w-full px-4 py-2.5 bg-[#1f1d17] border border-[rgba(250,250,245,0.06)]  text-[#fafaf5] outline-none focus:border-[#c8ff00]" placeholder="모델명" />
                </div>
                <div>
                  <label class="block text-[10px] font-semibold uppercase tracking-wider mb-1" style="color: rgba(250,250,245,0.35);">시리얼번호 *</label>
                  <input v-model="form.serialNumber" class="w-full px-4 py-2.5 bg-[#1f1d17] border border-[rgba(250,250,245,0.06)]  text-[#fafaf5] outline-none focus:border-[#c8ff00]" placeholder="SN-001" />
                </div>
                <div>
                  <label class="block text-[10px] font-semibold uppercase tracking-wider mb-1" style="color: rgba(250,250,245,0.35);">제조사 *</label>
                  <input v-model="form.manufacturerName" class="w-full px-4 py-2.5 bg-[#1f1d17] border border-[rgba(250,250,245,0.06)]  text-[#fafaf5] outline-none focus:border-[#c8ff00]" placeholder="제조사명" />
                </div>
                <div>
                  <label class="block text-[10px] font-semibold uppercase tracking-wider mb-1" style="color: rgba(250,250,245,0.35);">제조국</label>
                  <input v-model="form.manufactureCountry" class="w-full px-4 py-2.5 bg-[#1f1d17] border border-[rgba(250,250,245,0.06)]  text-[#fafaf5] outline-none focus:border-[#c8ff00]" placeholder="KR" />
                </div>
                <div>
                  <label class="block text-[10px] font-semibold uppercase tracking-wider mb-1" style="color: rgba(250,250,245,0.35);">셀 제조사</label>
                  <input v-model="form.cellManufacturer" class="w-full px-4 py-2.5 bg-[#1f1d17] border border-[rgba(250,250,245,0.06)]  text-[#fafaf5] outline-none focus:border-[#c8ff00]" placeholder="셀 제조사" />
                </div>
                <div>
                  <label class="block text-[10px] font-semibold uppercase tracking-wider mb-1" style="color: rgba(250,250,245,0.35);">셀 제조국</label>
                  <input v-model="form.cellManufactureCountry" class="w-full px-4 py-2.5 bg-[#1f1d17] border border-[rgba(250,250,245,0.06)]  text-[#fafaf5] outline-none focus:border-[#c8ff00]" placeholder="KR" />
                </div>
                <div>
                  <label class="block text-[10px] font-semibold uppercase tracking-wider mb-1" style="color: rgba(250,250,245,0.35);">제조일</label>
                  <input v-model="form.manufactureDate" type="date" class="w-full px-4 py-2.5 bg-[#1f1d17] border border-[rgba(250,250,245,0.06)]  text-[#fafaf5] outline-none focus:border-[#c8ff00]" />
                </div>
                <div>
                  <label class="block text-[10px] font-semibold uppercase tracking-wider mb-1" style="color: rgba(250,250,245,0.35);">셀 타입</label>
                  <select v-model="form.cellType" class="w-full px-4 py-2.5 bg-[#1f1d17] border border-[rgba(250,250,245,0.06)]  text-[#fafaf5] outline-none focus:border-[#c8ff00]">
                    <option value="">선택</option>
                    <option>Prismatic</option><option>Cylindrical</option><option>Pouch</option>
                  </select>
                </div>
                <div>
                  <label class="block text-[10px] font-semibold uppercase tracking-wider mb-1" style="color: rgba(250,250,245,0.35);">화학구성</label>
                  <input v-model="form.chemistry" class="w-full px-4 py-2.5 bg-[#1f1d17] border border-[rgba(250,250,245,0.06)]  text-[#fafaf5] outline-none focus:border-[#c8ff00]" placeholder="NMC811" />
                </div>
              </div>
            </template>

            <!-- STEP 2 -->
            <template v-if="createStep === 2">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[10px] font-semibold uppercase tracking-wider mb-1" style="color: rgba(250,250,245,0.35);">셀 수</label>
                  <input v-model="form.cellCount" type="number" class="w-full px-4 py-2.5 bg-[#1f1d17] border border-[rgba(250,250,245,0.06)]  text-[#fafaf5] outline-none focus:border-[#c8ff00]" placeholder="96" />
                </div>
                <div>
                  <label class="block text-[10px] font-semibold uppercase tracking-wider mb-1" style="color: rgba(250,250,245,0.35);">무게 (kg)</label>
                  <input v-model="form.weight" type="number" class="w-full px-4 py-2.5 bg-[#1f1d17] border border-[rgba(250,250,245,0.06)]  text-[#fafaf5] outline-none focus:border-[#c8ff00]" placeholder="450" />
                </div>
                <div>
                  <label class="block text-[10px] font-semibold uppercase tracking-wider mb-1" style="color: rgba(250,250,245,0.35);">총 에너지 (kWh)</label>
                  <input v-model="form.totalEnergy" type="number" class="w-full px-4 py-2.5 bg-[#1f1d17] border border-[rgba(250,250,245,0.06)]  text-[#fafaf5] outline-none focus:border-[#c8ff00]" placeholder="72.6" />
                </div>
                <div>
                  <label class="block text-[10px] font-semibold uppercase tracking-wider mb-1" style="color: rgba(250,250,245,0.35);">에너지 밀도</label>
                  <input v-model="form.energyDensity" type="number" class="w-full px-4 py-2.5 bg-[#1f1d17] border border-[rgba(250,250,245,0.06)]  text-[#fafaf5] outline-none focus:border-[#c8ff00]" placeholder="161" />
                </div>
                <div>
                  <label class="block text-[10px] font-semibold uppercase tracking-wider mb-1" style="color: rgba(250,250,245,0.35);">정격 용량 (Ah)</label>
                  <input v-model="form.ratedCapacity" type="number" class="w-full px-4 py-2.5 bg-[#1f1d17] border border-[rgba(250,250,245,0.06)]  text-[#fafaf5] outline-none focus:border-[#c8ff00]" placeholder="180" />
                </div>
                <div>
                  <label class="block text-[10px] font-semibold uppercase tracking-wider mb-1" style="color: rgba(250,250,245,0.35);">예상 수명 (사이클)</label>
                  <input v-model="form.expectedLifespan" type="number" class="w-full px-4 py-2.5 bg-[#1f1d17] border border-[rgba(250,250,245,0.06)]  text-[#fafaf5] outline-none focus:border-[#c8ff00]" placeholder="3000" />
                </div>
                <div>
                  <label class="block text-[10px] font-semibold uppercase tracking-wider mb-1" style="color: rgba(250,250,245,0.35);">전압 범위</label>
                  <input v-model="form.voltageRange" class="w-full px-4 py-2.5 bg-[#1f1d17] border border-[rgba(250,250,245,0.06)]  text-[#fafaf5] outline-none focus:border-[#c8ff00]" placeholder="280-403V" />
                </div>
                <div>
                  <label class="block text-[10px] font-semibold uppercase tracking-wider mb-1" style="color: rgba(250,250,245,0.35);">온도 범위</label>
                  <input v-model="form.temperatureRange" class="w-full px-4 py-2.5 bg-[#1f1d17] border border-[rgba(250,250,245,0.06)]  text-[#fafaf5] outline-none focus:border-[#c8ff00]" placeholder="-20~60°C" />
                </div>
                <div class="col-span-2">
                  <label class="block text-[10px] font-semibold uppercase tracking-wider mb-1" style="color: rgba(250,250,245,0.35);">탄소 발자국 (kg CO2)</label>
                  <input v-model="form.carbonFootprint" type="number" class="w-full px-4 py-2.5 bg-[#1f1d17] border border-[rgba(250,250,245,0.06)]  text-[#fafaf5] outline-none focus:border-[#c8ff00]" placeholder="0" />
                </div>
              </div>
            </template>

            <!-- STEP 3 -->
            <template v-if="createStep === 3">
              <div class="rounded-lg p-4 space-y-2" style="background: #1f1d17; border: 1px solid rgba(250,250,245,0.06);">
                <div class="flex justify-between text-xs"><span style="color: rgba(250,250,245,0.35);">모델</span><span class="font-medium" style="color: #fafaf5;">{{ form.model || '-' }}</span></div>
                <div class="flex justify-between text-xs"><span style="color: rgba(250,250,245,0.35);">시리얼</span><span class="font-medium" style="color: #fafaf5; font-family: 'JetBrains Mono', monospace;">{{ form.serialNumber || '-' }}</span></div>
                <div class="flex justify-between text-xs"><span style="color: rgba(250,250,245,0.35);">제조사</span><span class="font-medium" style="color: #fafaf5;">{{ form.manufacturerName || '-' }}</span></div>
                <div class="flex justify-between text-xs"><span style="color: rgba(250,250,245,0.35);">DID</span><span class="font-medium" style="color: #c8ff00; font-family: 'JetBrains Mono', monospace;">{{ form.did || '-' }}</span></div>
                <div class="flex justify-between text-xs"><span style="color: rgba(250,250,245,0.35);">셀</span><span class="font-medium" style="color: #fafaf5;">{{ form.cellType || '-' }} / {{ form.chemistry || '-' }}</span></div>
                <div class="flex justify-between text-xs"><span style="color: rgba(250,250,245,0.35);">무게 / 에너지</span><span class="font-medium" style="color: #fafaf5;">{{ form.weight || '-' }}kg / {{ form.totalEnergy || '-' }}kWh</span></div>
              </div>
            </template>
          </div>

          <!-- Modal footer -->
          <div class="px-6 py-4 flex items-center justify-between" style="border-top: 1px solid #e5e7eb;">
            <button v-if="createStep > 1" @click="prevStep" class="bg-[#1a1814] border border-[rgba(250,250,245,0.06)] text-[rgba(250,250,245,0.7)] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1f1d17]">이전</button>
            <div v-else></div>
            <div class="flex items-center gap-2">
              <button @click="closeCreateModal" class="bg-[#1a1814] border border-[rgba(250,250,245,0.06)] text-[rgba(250,250,245,0.7)] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1f1d17]">취소</button>
              <button v-if="createStep < 3" @click="nextStep" class="bg-[#c8ff00] text-[#1a1814] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#d4ff33]">다음</button>
              <button v-else @click="submitCreate" :disabled="creating" class="bg-[#c8ff00] text-[#1a1814] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#d4ff33]">
                <span v-if="creating" class="inline-flex items-center">
                  <svg class="animate-spin -ml-1 mr-1.5 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  생성 중...
                </span>
                <span v-else>여권 생성</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    </div>
  `
});
