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
      nextStep, prevStep, getGbaPct,
    };
  },
  template: `
    <div>
      <!-- LOADING -->
      <div v-if="loading" style="display: flex; align-items: center; justify-content: center; min-height: 40vh;">
        <div style="width: 28px; height: 28px; border: 2px solid rgba(0,0,0,0.06); border-top-color: var(--color-accent); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
      </div>

      <div v-else class="space-y-4">

        <!-- HEADER -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--color-border);">
          <div>
            <div style="display: flex; align-items: baseline; gap: 0.5rem;">
              <h1 class="sn-display" style="font-size: 1.5rem;">배터리 여권</h1>
              <span style="font-family: var(--font-mono); font-size: 0.875rem; color: var(--color-text-3); margin-left: 0.5rem;">{{ filteredPassports.length }}건</span>
            </div>
            <p class="sn-caption" style="margin-top: 0.125rem;">총 {{ passports.length }}건의 배터리 여권이 등록되어 있습니다</p>
          </div>
          <button v-if="isManufacturer" @click="openCreateModal" class="sn-btn sn-btn-accent" style="display:inline-flex;align-items:center;gap:6px;">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            여권 발급
          </button>
        </div>

        <!-- FILTER BAR -->
        <div class="sn-panel" style="padding:8px 12px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
          <input v-model="searchQuery" type="text" placeholder="ID, 시리얼, 모델, 제조사, VIN 검색..." class="sn-input" style="flex:1;min-width:200px;font-size:0.8125rem;" />
          <select v-model="filterStatus" class="sn-input" style="width:auto;min-width:140px;font-size:0.8125rem;">
            <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>

        <!-- Sort control -->
        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
          <span style="font-size: 0.6875rem; color: var(--color-text-3);">정렬:</span>
          <button v-for="s in [{v:'', l:'최신순'}, {v:'gba', l:'GBA'}]" :key="s.v"
            @click="sortBy = s.v" type="button"
            style="font-size: 0.6875rem; padding: 0.25rem 0.5rem; background: none; border: none; cursor: pointer; border-radius: 3px;"
            :style="sortBy === s.v ? 'color: var(--color-text-1); background: rgba(0,0,0,0.04);' : 'color: var(--color-text-3);'">
            {{ s.l }}
          </button>
        </div>

        <!-- CARD GRID -->
        <div v-if="filteredPassports.length > 0">
          <!-- CARD GRID (structural change from table) -->
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px;">
            <div v-for="p in filteredPassports" :key="p.passportId"
              @click="viewDetail(p.passportId)"
              style="background: #fff; border: 1px solid rgba(0,0,0,0.06); border-radius: 8px; padding: 1rem; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden;"
              @mouseenter="$event.currentTarget.style.borderColor='rgba(0,0,0,0.15)';$event.currentTarget.style.transform='translateY(-1px)'"
              @mouseleave="$event.currentTarget.style.borderColor='rgba(0,0,0,0.06)';$event.currentTarget.style.transform='none'">

              <!-- Status top bar -->
              <div style="position: absolute; top: 0; left: 0; right: 0; height: 3px;"
                :style="{ background: p.status==='ACTIVE'?'#16a34a':p.status==='MANUFACTURED'?'#2563eb':p.status==='MAINTENANCE'?'#d97706':p.status==='ANALYSIS'?'#7c3aed':p.status==='RECYCLING'?'#ea580c':'#a3a3a3' }"></div>

              <!-- Header: model + status -->
              <div style="display: flex; align-items: start; justify-content: space-between; margin-bottom: 0.5rem;">
                <div style="font-size: 0.875rem; font-weight: 600; color: var(--color-text-1); line-height: 1.3;">{{ p.model || '미등록 모델' }}</div>
                <span style="font-size: 0.625rem; font-weight: 600; padding: 0.125rem 0.5rem; border-radius: 3px; white-space: nowrap; flex-shrink: 0; margin-left: 0.5rem;"
                  :style="{ background: p.status==='ACTIVE'?'#f0fdf4':p.status==='MANUFACTURED'?'#eff6ff':p.status==='MAINTENANCE'?'#fffbeb':'#f5f5f5', color: p.status==='ACTIVE'?'#16a34a':p.status==='MANUFACTURED'?'#2563eb':p.status==='MAINTENANCE'?'#d97706':'#a3a3a3' }">
                  {{ getStatusBadge(p.status).label }}
                </span>
              </div>

              <!-- ID -->
              <div style="font-family: var(--font-mono); font-size: 0.625rem; color: var(--color-text-3); margin-bottom: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ p.passportId }}</div>

              <!-- Specs row -->
              <div style="display: flex; gap: 0.75rem; font-size: 0.6875rem; color: var(--color-text-2); margin-bottom: 0.75rem;">
                <span v-if="p.manufacturerName">{{ p.manufacturerName }}</span>
                <span v-if="p.chemistry" style="background: rgba(0,0,0,0.04); padding: 0 0.25rem; border-radius: 2px;">{{ p.chemistry }}</span>
                <span v-if="p.weight">{{ p.weight }}kg</span>
              </div>

              <!-- SOC/SOH gauges -->
              <div v-if="p.currentSoc != null || p.currentSoh != null" style="display: flex; gap: 1rem; align-items: center;">
                <div v-if="p.currentSoc != null" style="flex: 1;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                    <span style="font-size: 0.5625rem; color: var(--color-text-3);">SOC</span>
                    <span style="font-family: var(--font-mono); font-size: 0.625rem; font-weight: 600; color: var(--color-text-1);">{{ scaleSOC(p.currentSoc) }}%</span>
                  </div>
                  <div style="height: 4px; background: rgba(0,0,0,0.06); border-radius: 2px; overflow: hidden;">
                    <div style="height: 100%; border-radius: 2px;" :style="{ width: Math.min(scaleSOC(p.currentSoc), 100) + '%', background: scaleSOC(p.currentSoc) >= 60 ? '#16a34a' : scaleSOC(p.currentSoc) >= 30 ? '#d97706' : '#dc2626' }"></div>
                  </div>
                </div>
                <div v-if="p.currentSoh != null" style="flex: 1;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                    <span style="font-size: 0.5625rem; color: var(--color-text-3);">SOH</span>
                    <span style="font-family: var(--font-mono); font-size: 0.625rem; font-weight: 600; color: var(--color-text-1);">{{ p.currentSoh }}%</span>
                  </div>
                  <div style="height: 4px; background: rgba(0,0,0,0.06); border-radius: 2px; overflow: hidden;">
                    <div style="height: 100%; border-radius: 2px;" :style="{ width: Math.min(p.currentSoh, 100) + '%', background: p.currentSoh >= 80 ? '#16a34a' : p.currentSoh >= 50 ? '#d97706' : '#dc2626' }"></div>
                  </div>
                </div>
              </div>
              <div v-else style="font-size: 0.625rem; color: var(--color-text-3); font-style: italic;">센서 데이터 없음</div>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else style="padding: 3rem; text-align: center; border: 1px dashed var(--color-border); border-radius: 0.5rem;">
          <p style="font-size: 0.875rem; color: var(--color-text-3); margin-bottom: 0.75rem;">등록된 여권이 없습니다. 검색 조건을 변경하거나 새 여권을 발급하세요.</p>
          <button v-if="isManufacturer" @click="openCreateModal" class="sn-btn sn-btn-accent">여권 발급</button>
        </div>
      </div>

      <!-- CREATE MODAL — 3-step wizard -->
      <div v-if="showCreateModal" class="sn-overlay" @click.self="closeCreateModal">
        <div class="sn-modal" style="max-width:560px;">

          <!-- Modal header -->
          <div style="padding:20px 24px;border-bottom:1px solid rgba(0,0,0,0.06);display:flex;align-items:center;justify-content:space-between;">
            <div>
              <h3 style="font-size:1.05rem;font-weight:700;color:#171717;margin:0;">배터리 여권 발급</h3>
              <p style="font-size:0.75rem;color:#a3a3a3;margin:4px 0 0;">단계 {{ createStep }} / 3</p>
            </div>
            <button @click="closeCreateModal" class="sn-btn sn-btn-ghost" style="padding:6px 10px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <!-- Circular Progress + Step indicators -->
          <div style="padding:20px 24px 12px;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <!-- Circular progress -->
              <div style="display:flex;align-items:center;gap:16px;">
                <div style="position:relative;width:56px;height:56px;flex-shrink:0;">
                  <svg viewBox="0 0 64 64" style="width:100%;height:100%;transform:rotate(-90deg);">
                    <circle cx="32" cy="32" r="27" fill="none" stroke="#e5e5e5" stroke-width="5"/>
                    <circle cx="32" cy="32" r="27" fill="none" stroke="#171717" stroke-width="5"
                      stroke-linecap="round"
                      :stroke-dasharray="2 * Math.PI * 27"
                      :stroke-dashoffset="2 * Math.PI * 27 * (1 - completionPct / 100)"
                      style="transition: stroke-dashoffset 0.5s cubic-bezier(0.16,1,0.3,1);"/>
                  </svg>
                  <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
                    <span style="font-size:0.7rem;font-weight:700;color:#171717;font-family:'JetBrains Mono',monospace;">{{ completionPct }}%</span>
                  </div>
                </div>
                <div>
                  <span class="sn-eyebrow">COMPLETION</span>
                  <p style="font-size:0.8rem;color:#525252;margin:4px 0 0;">{{ completionPct >= 100 ? '모든 항목 입력 완료' : '필수 항목을 입력하세요' }}</p>
                </div>
              </div>

              <!-- Step circles -->
              <div style="display:flex;align-items:center;gap:8px;">
                <template v-for="s in 3" :key="s">
                  <div style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;transition:all 0.3s;"
                    :style="s < createStep ? 'background:#171717;color:#fff;' : s===createStep ? 'background:#f5f5f5;color:#171717;box-shadow:inset 0 0 0 2px #171717;' : 'background:#f5f5f5;color:#a3a3a3;'">
                    <svg v-if="s < createStep" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                    <span v-else>{{ s }}</span>
                  </div>
                  <div v-if="s < 3" style="width:20px;height:2px;border-radius:1px;transition:background 0.3s;" :style="s < createStep ? 'background:#171717;' : 'background:#e5e5e5;'"></div>
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
                  <label class="sn-eyebrow" style="display:block;margin-bottom:6px;">DID *</label>
                  <input v-model="form.did" class="sn-input" placeholder="DID 식별자" />
                </div>
                <div>
                  <label class="sn-eyebrow" style="display:block;margin-bottom:6px;">모델 *</label>
                  <input v-model="form.model" class="sn-input" placeholder="모델명" />
                </div>
                <div>
                  <label class="sn-eyebrow" style="display:block;margin-bottom:6px;">시리얼번호 *</label>
                  <input v-model="form.serialNumber" class="sn-input" placeholder="SN-001" />
                </div>
                <div>
                  <label class="sn-eyebrow" style="display:block;margin-bottom:6px;">제조사 *</label>
                  <input v-model="form.manufacturerName" class="sn-input" placeholder="제조사명" />
                </div>
                <div>
                  <label class="sn-eyebrow" style="display:block;margin-bottom:6px;">제조국</label>
                  <input v-model="form.manufactureCountry" class="sn-input" placeholder="KR" />
                </div>
                <div>
                  <label class="sn-eyebrow" style="display:block;margin-bottom:6px;">셀 제조사</label>
                  <input v-model="form.cellManufacturer" class="sn-input" placeholder="셀 제조사" />
                </div>
                <div>
                  <label class="sn-eyebrow" style="display:block;margin-bottom:6px;">셀 제조국</label>
                  <input v-model="form.cellManufactureCountry" class="sn-input" placeholder="KR" />
                </div>
                <div>
                  <label class="sn-eyebrow" style="display:block;margin-bottom:6px;">제조일</label>
                  <input v-model="form.manufactureDate" type="date" class="sn-input" />
                </div>
                <div>
                  <label class="sn-eyebrow" style="display:block;margin-bottom:6px;">셀 타입</label>
                  <select v-model="form.cellType" class="sn-input">
                    <option value="">선택</option>
                    <option>Prismatic</option><option>Cylindrical</option><option>Pouch</option>
                  </select>
                </div>
                <div>
                  <label class="sn-eyebrow" style="display:block;margin-bottom:6px;">화학구성</label>
                  <input v-model="form.chemistry" class="sn-input" placeholder="NMC811" />
                </div>
              </div>
            </template>

            <!-- STEP 2 -->
            <template v-if="createStep === 2">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="sn-eyebrow" style="display:block;margin-bottom:6px;">셀 수</label>
                  <input v-model="form.cellCount" type="number" class="sn-input" placeholder="96" />
                </div>
                <div>
                  <label class="sn-eyebrow" style="display:block;margin-bottom:6px;">무게 (kg)</label>
                  <input v-model="form.weight" type="number" class="sn-input" placeholder="450" />
                </div>
                <div>
                  <label class="sn-eyebrow" style="display:block;margin-bottom:6px;">총 에너지 (kWh)</label>
                  <input v-model="form.totalEnergy" type="number" class="sn-input" placeholder="72.6" />
                </div>
                <div>
                  <label class="sn-eyebrow" style="display:block;margin-bottom:6px;">에너지 밀도</label>
                  <input v-model="form.energyDensity" type="number" class="sn-input" placeholder="161" />
                </div>
                <div>
                  <label class="sn-eyebrow" style="display:block;margin-bottom:6px;">정격 용량 (Ah)</label>
                  <input v-model="form.ratedCapacity" type="number" class="sn-input" placeholder="180" />
                </div>
                <div>
                  <label class="sn-eyebrow" style="display:block;margin-bottom:6px;">예상 수명 (사이클)</label>
                  <input v-model="form.expectedLifespan" type="number" class="sn-input" placeholder="3000" />
                </div>
                <div>
                  <label class="sn-eyebrow" style="display:block;margin-bottom:6px;">전압 범위</label>
                  <input v-model="form.voltageRange" class="sn-input" placeholder="280-403V" />
                </div>
                <div>
                  <label class="sn-eyebrow" style="display:block;margin-bottom:6px;">온도 범위</label>
                  <input v-model="form.temperatureRange" class="sn-input" placeholder="-20~60°C" />
                </div>
                <div class="col-span-2">
                  <label class="sn-eyebrow" style="display:block;margin-bottom:6px;">탄소 발자국 (kg CO2)</label>
                  <input v-model="form.carbonFootprint" type="number" class="sn-input" placeholder="0" />
                </div>
              </div>
            </template>

            <!-- STEP 3 -->
            <template v-if="createStep === 3">
              <div style="border-radius:0.75rem;padding:16px;display:flex;flex-direction:column;gap:10px;box-shadow:inset 0 0 0 1px rgba(0,0,0,0.06);background:#fafafa;">
                <div style="display:flex;justify-content:space-between;font-size:0.82rem;"><span style="color:#a3a3a3;">모델</span><span style="font-weight:600;color:#171717;">{{ form.model || '-' }}</span></div>
                <div style="display:flex;justify-content:space-between;font-size:0.82rem;"><span style="color:#a3a3a3;">시리얼</span><span style="font-weight:600;color:#171717;font-family:'JetBrains Mono',monospace;">{{ form.serialNumber || '-' }}</span></div>
                <div style="display:flex;justify-content:space-between;font-size:0.82rem;"><span style="color:#a3a3a3;">제조사</span><span style="font-weight:600;color:#171717;">{{ form.manufacturerName || '-' }}</span></div>
                <div style="display:flex;justify-content:space-between;font-size:0.82rem;"><span style="color:#a3a3a3;">DID</span><span style="font-weight:600;color:#525252;font-family:'JetBrains Mono',monospace;font-size:0.75rem;">{{ form.did || '-' }}</span></div>
                <div style="display:flex;justify-content:space-between;font-size:0.82rem;"><span style="color:#a3a3a3;">셀</span><span style="font-weight:600;color:#171717;">{{ form.cellType || '-' }} / {{ form.chemistry || '-' }}</span></div>
                <div style="display:flex;justify-content:space-between;font-size:0.82rem;"><span style="color:#a3a3a3;">무게 / 에너지</span><span style="font-weight:600;color:#171717;">{{ form.weight || '-' }}kg / {{ form.totalEnergy || '-' }}kWh</span></div>
              </div>
            </template>
          </div>

          <!-- Modal footer -->
          <div style="padding:16px 24px;border-top:1px solid rgba(0,0,0,0.06);display:flex;align-items:center;justify-content:space-between;">
            <button v-if="createStep > 1" @click="prevStep" class="sn-btn sn-btn-ghost">이전</button>
            <div v-else></div>
            <div style="display:flex;align-items:center;gap:8px;">
              <button @click="closeCreateModal" class="sn-btn sn-btn-ghost">취소</button>
              <button v-if="createStep < 3" @click="nextStep" class="sn-btn sn-btn-accent">다음</button>
              <button v-else @click="submitCreate" :disabled="creating" class="sn-btn sn-btn-accent" :style="creating ? 'opacity:0.6;cursor:not-allowed;' : ''">
                <svg v-if="creating" style="width:14px;height:14px;animation:spin 0.8s linear infinite;margin-right:4px;" fill="none" viewBox="0 0 24 24"><circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                {{ creating ? '생성 중...' : '여권 생성' }}
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  `
});
