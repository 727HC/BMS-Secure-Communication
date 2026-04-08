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
    const isRegulator = computed(() => props.auth.orgMsp === MSP.REGULATOR);

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

    const bindingPendingCount = computed(() =>
      passports.value.filter((passport) => !passport.vin).length
    );

    const reviewPendingCount = computed(() =>
      passports.value.filter((passport) => getGbaPct(passport) < 100).length
    );

    const registerEnglishTitle = computed(() => {
      if (isManufacturer.value) return '발급 목록';
      if (isRegulator.value) return '검토 목록';
      return '배터리 여권';
    });

    const registerSummary = computed(() => {
      if (isManufacturer.value) {
        return '발급 대기, 차량 연결, 제출 준비 상태를 한눈에 확인합니다.';
      }
      if (isRegulator.value) {
        return '검토 대기와 서류 보완, 재활용 전환 대상을 차례대로 확인합니다.';
      }
      return '여권 상태와 정비 필요 여부를 목록에서 바로 확인합니다.';
    });

    function getPrimaryActionLabel(passport) {
      if (isManufacturer.value && !passport.vin) return '차량 연결';
      if (isRegulator.value) return '검토 이어서 보기';
      return '상세 보기';
    }

    function getPrimaryActionNote(passport) {
      if (isManufacturer.value && !passport.vin) return 'VIN 등록 대기';
      if (getGbaPct(passport) < 100) return '문서 보완 필요';
      if (passport.recycleAvailable) return '재활용 검토 대기';
      return '다음 작업 준비 완료';
    }

    function getLifecycleMemo(passport) {
      if (passport.status === 'MAINTENANCE') return '정비 진행 중';
      if (passport.status === 'ANALYSIS') return '점검 결과 대기';
      if (passport.status === 'RECYCLING') return '회수·재활용 검토 중';
      if (!passport.vin) return 'VIN 등록 대기';
      return '상세 정보 최신';
    }

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
        const created = await props.api.post('/passports', body);
        window.$toast('success', '배터리 여권이 생성되었습니다.');
        closeCreateModal();
        await fetchPassports();
        emit('navigate', 'passport-detail', { passportId: created.passportId || body.passportId });
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
      return 'bg-[#ef4444]';
    }

    return {
      passports, loading, searchQuery, filterStatus, sortBy, showCreateModal, creating, createStep,
      form, statusOptions, isManufacturer, isRegulator, filteredPassports, scaleSOC, completionPct,
      bindingPendingCount, reviewPendingCount, registerEnglishTitle, registerSummary,
      openCreateModal, closeCreateModal, submitCreate, viewDetail, getStatusBadge, getSocColor,
      nextStep, prevStep, getGbaPct, getPrimaryActionLabel, getPrimaryActionNote, getLifecycleMemo,
    };
  },
  template: `
    <div>
      <!-- LOADING -->
      <div v-if="loading" style="display: flex; align-items: center; justify-content: center; min-height: 40vh;">
        <div style="width: 28px; height: 28px; border: 2px solid rgba(0,0,0,0.06); border-top-color: var(--color-accent); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
      </div>

      <div v-else class="space-y-4">

        <!-- COVER -->
        <section class="sn-section-card">
          <div class="sn-section-head">
            <div class="sn-section-head-row">
              <div class="sn-page-head-main">
                <p class="sn-eyebrow" style="margin-bottom:0.5rem;">여권 목록</p>
                <h1 class="sn-display" style="font-size:1.75rem;">배터리 여권</h1>
                <p class="sn-heading" style="font-size:1rem;margin-top:0.375rem;">{{ registerEnglishTitle }}</p>
                <p class="sn-caption" style="margin-top:0.375rem; max-width:42rem;">{{ registerSummary }}</p>
              </div>
              <div class="sn-page-actions">
                <div class="sn-kpi-mini">
                  <p class="sn-eyebrow" style="margin-bottom:0.3rem;">등록 현황</p>
                  <p style="font-family:var(--font-mono); font-size:1.1rem; font-weight:700; color:var(--color-text-1);">{{ filteredPassports.length }}</p>
                </div>
                <button v-if="isManufacturer" @click="openCreateModal" class="sn-btn sn-btn-accent" style="display:inline-flex;align-items:center;gap:6px;">
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  여권 발급
                </button>
              </div>
            </div>
          </div>

          <div class="sn-info-grid sn-info-grid-auto">
            <div class="sn-info-tile">
              <p class="sn-eyebrow" style="margin-bottom:0.35rem;">진행 상황</p>
              <p style="font-size:0.95rem; font-weight:600; color:var(--color-text-1);">{{ isManufacturer ? '발급 → 차량 연결 → 운행 전환' : '검토 → 문서 확인 → 판정' }}</p>
            </div>
            <div class="sn-info-tile">
              <p class="sn-eyebrow" style="margin-bottom:0.35rem;">바인딩 대기</p>
              <p style="font-family:var(--font-mono); font-size:1rem; font-weight:700; color:var(--color-text-1);">{{ bindingPendingCount }}</p>
            </div>
            <div class="sn-info-tile">
              <p class="sn-eyebrow" style="margin-bottom:0.35rem;">다음 확인</p>
              <p style="font-size:0.95rem; font-weight:600; color:var(--color-text-1);">{{ isRegulator ? '서류 미비·재활용 전환 대상 우선 확인' : '문서 미비·VIN 누락 대상 우선 정리' }}</p>
            </div>
            <div class="sn-info-tile">
              <p class="sn-eyebrow" style="margin-bottom:0.35rem;">문서 보완 필요</p>
              <p style="font-family:var(--font-mono); font-size:1rem; font-weight:700; color:var(--color-text-1);">{{ reviewPendingCount }}</p>
            </div>
          </div>

          <div class="sn-toolbar" style="padding:0.9rem 1.25rem; background:#fff;">
            <input v-model="searchQuery" type="text" placeholder="ID, 시리얼, 모델, 제조사, VIN 검색..." class="sn-input" style="flex:1; min-width:220px; font-size:0.875rem;" />
            <select v-model="filterStatus" class="sn-input" style="width:auto; min-width:140px; font-size:0.875rem;">
              <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
            <div style="display:flex; align-items:center; gap:0.35rem;">
              <span style="font-size:0.75rem; color:var(--color-text-3);">정렬</span>
              <button v-for="s in [{v:'', l:'최신순'}, {v:'gba', l:'GBA'}]" :key="s.v"
                @click="sortBy = s.v" type="button"
                style="font-size:0.75rem; padding:0.3rem 0.55rem; background:none; border:none; cursor:pointer; border-radius:3px;"
                :style="sortBy === s.v ? 'color: var(--color-text-1); background: rgba(0,0,0,0.04);' : 'color: var(--color-text-3);'">
                {{ s.l }}
              </button>
            </div>
          </div>
        </section>

        <div v-if="filteredPassports.length > 0" style="border:1px solid var(--color-border); border-radius:1.25rem; overflow:hidden; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
          <div class="sn-mobile-hide" style="display:grid; grid-template-columns:minmax(0, 1.1fr) minmax(0, 1.3fr) minmax(0, 0.9fr) minmax(0, 0.9fr); gap:1rem; padding:0.9rem 1.1rem; border-bottom:1px solid var(--color-border); background:#fbfdff;">
            <span class="sn-eyebrow">여권 ID</span>
            <span class="sn-eyebrow">요약</span>
            <span class="sn-eyebrow">진행 메모</span>
            <span class="sn-eyebrow">다음 조치</span>
          </div>

          <div v-for="p in filteredPassports" :key="p.passportId"
            @click="viewDetail(p.passportId)"
            style="padding:1rem 1.1rem; border-bottom:1px solid var(--color-border); cursor:pointer; transition:background 0.2s;"
            @mouseenter="$event.currentTarget.style.background='#f8fbff'"
            @mouseleave="$event.currentTarget.style.background='#fff'">
            <div class="sn-mobile-hide" style="display:grid; grid-template-columns:minmax(0, 1.1fr) minmax(0, 1.3fr) minmax(0, 0.9fr) minmax(0, 0.9fr); gap:1rem; align-items:start;">
              <div>
                <p style="font-family:var(--font-mono); font-size:0.875rem; font-weight:700; color:var(--color-text-1);">{{ p.passportId }}</p>
                <p style="margin-top:0.35rem; font-size:0.875rem; color:var(--color-text-3);">{{ p.serialNumber || '시리얼 정보 없음' }}</p>
              </div>
              <div>
                <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                  <p style="font-size:0.95rem; font-weight:700; color:var(--color-text-1);">{{ p.model || '미등록 모델' }}</p>
                  <span :class="['bp-stamp', getStatusBadge(p.status).bg, getStatusBadge(p.status).text, getStatusBadge(p.status).border]" style="font-size:0.75rem;">
                    {{ getStatusBadge(p.status).label }}
                  </span>
                </div>
                <p style="margin-top:0.35rem; font-size:0.875rem; color:var(--color-text-2);">
                  {{ p.manufacturerName || '제조사 미기록' }} · {{ p.chemistry || '화학 정보 없음' }} · GBA {{ getGbaPct(p) }}%
                </p>
                <div style="margin-top:0.55rem; display:flex; gap:0.9rem; align-items:center; flex-wrap:wrap;">
                  <span style="font-size:0.75rem; color:var(--color-text-3);">SOC <strong style="color:var(--color-text-1); font-family:var(--font-mono);">{{ p.currentSoc != null ? scaleSOC(p.currentSoc) + '%' : '--' }}</strong></span>
                  <span style="font-size:0.75rem; color:var(--color-text-3);">SOH <strong style="color:var(--color-text-1); font-family:var(--font-mono);">{{ p.currentSoh != null ? p.currentSoh + '%' : '--' }}</strong></span>
                </div>
              </div>
              <div>
                <p style="font-size:0.875rem; font-weight:600; color:var(--color-text-1);">{{ getLifecycleMemo(p) }}</p>
                <p style="margin-top:0.35rem; font-size:0.75rem; color:var(--color-text-3);">{{ p.vin || '차대번호 미등록' }}</p>
              </div>
              <div>
                <p style="font-size:0.875rem; font-weight:600; color:var(--color-text-1);">{{ getPrimaryActionLabel(p) }}</p>
                <p style="margin-top:0.35rem; font-size:0.75rem; color:var(--color-text-3);">{{ getPrimaryActionNote(p) }}</p>
              </div>
            </div>

            <div class="lg:hidden" style="display:flex; flex-direction:column; gap:0.55rem;">
              <div style="display:flex; justify-content:space-between; gap:0.75rem; align-items:flex-start;">
                <div>
                  <p style="font-size:0.875rem; font-weight:700; color:var(--color-text-1);">{{ p.manufacturerName || '제조사 미기록' }}</p>
                  <p style="font-family:var(--font-mono); font-size:0.75rem; color:var(--color-text-3); margin-top:0.2rem;">{{ p.passportId }}</p>
                </div>
                <span :class="['bp-stamp', getStatusBadge(p.status).bg, getStatusBadge(p.status).text, getStatusBadge(p.status).border]" style="font-size:0.75rem;">
                  {{ getStatusBadge(p.status).label }}
                </span>
              </div>
              <p style="font-size:0.875rem; color:var(--color-text-2);">{{ getLifecycleMemo(p) }}</p>
              <p style="font-size:0.75rem; color:var(--color-text-3);">GBA {{ getGbaPct(p) }}% · {{ p.vin || '차대번호 대기' }}</p>
            </div>
          </div>
        </div>

        <div v-else style="padding: 3rem; text-align: center; border: 1px dashed var(--color-border); border-radius: 0.5rem;">
          <p style="font-size: 0.875rem; color: var(--color-text-3); margin-bottom: 0.75rem;">등록된 여권이 없습니다. 검색 조건을 변경하거나 새 여권을 발급하세요.</p>
          <button v-if="isManufacturer" @click="openCreateModal" class="sn-btn sn-btn-accent">여권 발급</button>
        </div>
      </div>

      <!-- CREATE MODAL — 3-step wizard -->
      <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="closeCreateModal">
        <div class="sn-overlay fixed inset-0 bg-black/40 backdrop-blur-sm" @click="closeCreateModal"></div>
        <div class="sn-modal relative bg-white shadow-xl border border-gray-200 w-full" style="max-width:560px;border-radius:1rem;">

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
