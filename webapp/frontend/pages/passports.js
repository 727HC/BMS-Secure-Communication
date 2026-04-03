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
        <p style="font-size:0.85rem;color:#a3a3a3;font-family:'JetBrains Mono',monospace;">LOADING REGISTRY...</p>
      </div>

      <div v-else class="space-y-5">

        <!-- HEADER -->
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;">
          <div>
            <h1 class="sn-display" style="font-size:1.75rem;">배터리 여권</h1>
            <p class="sn-caption" style="margin-top:0.25rem;">전체 {{ passports.length }}건 등록</p>
          </div>
          <button v-if="isManufacturer" @click="openCreateModal" class="sn-btn sn-btn-primary" style="display:inline-flex;align-items:center;gap:6px;">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            여권 발급
          </button>
        </div>

        <!-- FILTER BAR -->
        <div class="sn-panel" style="padding:12px 16px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;">
          <input v-model="searchQuery" type="text" placeholder="ID, 시리얼, 모델, 제조사, VIN 검색..." class="sn-input" style="flex:1;min-width:200px;font-size:0.8125rem;" />
          <select v-model="filterStatus" class="sn-input" style="width:auto;min-width:140px;font-size:0.8125rem;">
            <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>

        <!-- TABLE -->
        <div class="sn-panel" style="overflow:hidden;">
          <div v-if="filteredPassports.length > 0" class="overflow-x-auto">
            <table class="sn-table">
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
                  <td style="position:relative;padding-left:1.25rem;">
                    <span :style="{
                      position:'absolute',left:0,top:'4px',bottom:'4px',width:'3px',borderRadius:'0 3px 3px 0',
                      backgroundColor: p.status==='MANUFACTURED'?'#60a5fa':p.status==='ACTIVE'?'#34d399':p.status==='MAINTENANCE'?'#fbbf24':p.status==='ANALYSIS'?'#a78bfa':p.status==='RECYCLING'?'#f97316':p.status==='DISPOSED'?'#ef4444':'#64748b'
                    }"></span>
                    <span style="font-size:0.75rem;font-family:'JetBrains Mono',monospace;color:#525252;">{{ p.passportId ? p.passportId.substring(0,20) : '-' }}</span>
                  </td>
                  <td style="font-family:'JetBrains Mono',monospace;font-size:0.75rem;color:#525252;">{{ p.serialNumber || '-' }}</td>
                  <td style="font-weight:600;color:#171717;">{{ p.model || '-' }}</td>
                  <td style="color:#525252;">{{ p.manufacturerName || '-' }}</td>
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
                    <div v-if="p.currentSoc != null" style="display:flex;align-items:center;gap:8px;min-width:90px;">
                      <div style="flex:1;height:6px;border-radius:999px;overflow:hidden;background:#e5e5e5;">
                        <div :style="{ width:Math.min(scaleSOC(p.currentSoc),100)+'%', height:'100%', borderRadius:'999px', background: scaleSOC(p.currentSoc)>50?'#171717':scaleSOC(p.currentSoc)>20?'#f59e0b':'#ef4444' }"></div>
                      </div>
                      <span style="font-family:'JetBrains Mono',monospace;font-size:0.75rem;font-weight:600;color:#525252;">{{ scaleSOC(p.currentSoc) }}%</span>
                    </div>
                    <span v-else style="color:#a3a3a3;font-size:0.8rem;">—</span>
                  </td>
                  <td>
                    <span v-if="p.currentSoh != null" style="font-family:'JetBrains Mono',monospace;font-size:0.75rem;color:#525252;">{{ p.currentSoh }}%</span>
                    <span v-else style="color:#a3a3a3;font-size:0.8rem;">—</span>
                  </td>
                  <td>
                    <span v-if="p.vin" style="font-family:'JetBrains Mono',monospace;font-size:0.75rem;color:#525252;">{{ p.vin }}</span>
                    <span v-else style="color:#a3a3a3;font-size:0.8rem;">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Empty state -->
          <div v-else style="padding:80px 24px;text-align:center;">
            <div style="width:56px;height:56px;border-radius:12px;background:#f5f5f5;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#a3a3a3" stroke-width="1.5">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/>
              </svg>
            </div>
            <p style="font-size:0.875rem;font-weight:600;color:#171717;margin:0 0 4px;">등록된 여권이 없습니다</p>
            <p style="font-size:0.8rem;color:#a3a3a3;margin:0;">검색 조건을 변경하거나 새 여권을 발급하세요.</p>
          </div>
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
              <button v-if="createStep < 3" @click="nextStep" class="sn-btn sn-btn-primary">다음</button>
              <button v-else @click="submitCreate" :disabled="creating" class="sn-btn sn-btn-primary" :style="creating ? 'opacity:0.6;cursor:not-allowed;' : ''">
                <svg v-if="creating" style="width:14px;height:14px;animation:spin 0.8s linear infinite;margin-right:4px;" fill="none" viewBox="0 0 24 24"><circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                {{ creating ? '생성 중...' : '여권 생성' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    </div>
  `
});
