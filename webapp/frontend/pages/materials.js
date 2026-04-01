app.component('materials-page', {
  props: ['auth', 'api'],
  emits: ['navigate'],
  setup(props, { emit }) {
    const { ref, computed, onMounted } = Vue;

    const materials = ref([]);
    const loading = ref(false);
    const showModal = ref(false);
    const submitting = ref(false);
    const searchQuery = ref('');

    const isManufacturer = computed(() => props.auth.orgMsp === MSP.MANUFACTURER);

    const form = ref({
      materialId: '',
      name: '',
      origin: '',
      supplier: '',
      quantity: '',
      unit: 'kg',
      certificationId: '',
    });

    function generateMaterialId() {
      return 'MAT-' + Date.now();
    }

    async function fetchMaterials() {
      loading.value = true;
      try {
        const data = await props.api.get('/materials');
        materials.value = Array.isArray(data) ? data : (data.materials || []);
      } catch (e) {
        window.$toast('error', '원자재 목록 조회 실패: ' + e.message);
      } finally {
        loading.value = false;
      }
    }

    const filteredMaterials = computed(() => {
      if (!searchQuery.value) return materials.value;
      const q = searchQuery.value.toLowerCase();
      return materials.value.filter(m =>
        (m.materialId || '').toLowerCase().includes(q) ||
        (m.name || '').toLowerCase().includes(q) ||
        (m.origin || '').toLowerCase().includes(q) ||
        (m.supplier || '').toLowerCase().includes(q) ||
        (m.certificationId || '').toLowerCase().includes(q)
      );
    });

    function openModal() {
      form.value = {
        materialId: generateMaterialId(),
        name: '',
        origin: '',
        supplier: '',
        quantity: '',
        unit: 'kg',
        certificationId: '',
      };
      showModal.value = true;
    }

    function closeModal() {
      showModal.value = false;
    }

    const isFormValid = computed(() => {
      return form.value.name && form.value.origin && form.value.supplier && form.value.quantity;
    });

    async function submitMaterial() {
      if (!isFormValid.value) return;
      submitting.value = true;
      try {
        const payload = {
          ...form.value,
          quantity: Number(form.value.quantity),
        };
        await props.api.post('/materials', payload);
        window.$toast('success', '원자재가 등록되었습니다.');
        closeModal();
        await fetchMaterials();
      } catch (e) {
        window.$toast('error', '원자재 등록 실패: ' + e.message);
      } finally {
        submitting.value = false;
      }
    }

    function formatDate(dateStr) {
      if (!dateStr) return '-';
      const d = new Date(dateStr);
      return d.toLocaleString('ko-KR');
    }

    // Detail modal
    const selectedMaterial = ref(null);
    const showDetail = ref(false);

    function openDetail(m) {
      selectedMaterial.value = m;
      showDetail.value = true;
    }

    onMounted(fetchMaterials);

    return {
      materials, loading, showModal, form, submitting, searchQuery,
      isManufacturer, isFormValid, filteredMaterials,
      openModal, closeModal, submitMaterial, formatDate, fetchMaterials,
      selectedMaterial, showDetail, openDetail,
    };
  },
  template: `
  <div style="display:flex;flex-direction:column;gap:24px;">

    <!-- ====== PAGE HEADER ====== -->
    <div class="" style="display:flex;align-items:center;justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:14px;">
        <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#059669,#059669);display:flex;align-items:center;justify-content:center;">
          <svg width="22" height="22" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
          </svg>
        </div>
        <div>
          <h1 class="text-gray-900 font-bold" style="font-family:'Pretendard Variable', sans-serif;font-size:1.35rem;color:#111827;margin:0;">원자재 관리</h1>
          <p style="font-family:'Pretendard Variable', sans-serif;font-size:0.72rem;color:#6b7280;margin-top:2px;">배터리 원자재 등록 및 공급망 이력 추적</p>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <span class="bg-emerald-50 text-emerald-700" style="font-family:'JetBrains Mono', monospace;font-size:0.7rem;padding:3px 10px;border-radius:20px;">
          {{ filteredMaterials.length }}건
        </span>
        <button v-if="isManufacturer" @click="openModal" class="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700" style="display:inline-flex;align-items:center;gap:6px;font-size:0.82rem;">
          <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
          원자재 등록
        </button>
      </div>
    </div>

    <!-- ====== SEARCH BAR ====== -->
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm  " style="padding:12px 16px;">
      <div style="position:relative;">
        <svg style="position:absolute;left:12px;top:50%;transform:translateY(-50%);pointer-events:none;" width="16" height="16" fill="none" stroke="#6b7280" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input v-model="searchQuery" type="text" placeholder="자재ID, 명칭, 원산지, 공급업체, 인증번호 검색..."
          class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" style="width:100%;padding-left:38px;font-family:'Pretendard Variable', sans-serif;font-size:0.85rem;" />
      </div>
    </div>

    <!-- ====== LOADING STATE ====== -->
    <div v-if="loading" class="bg-white rounded-xl border border-gray-200 shadow-sm  " style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:72px 0;">
      <div style="position:relative;width:40px;height:40px;">
        <div style="position:absolute;inset:0;border-radius:50%;border:3px solid #f1f5f9;"></div>
        <div style="position:absolute;inset:0;border-radius:50%;border:3px solid #059669;border-top-color:transparent;animation:spin 0.8s linear infinite;"></div>
      </div>
      <p style="margin-top:14px;font-size:0.85rem;color:#6b7280;font-family:'Pretendard Variable', sans-serif;">원자재 목록을 불러오고 있습니다...</p>
    </div>

    <!-- ====== EMPTY STATE ====== -->
    <div v-else-if="filteredMaterials.length === 0" class="bg-white rounded-xl border border-gray-200 shadow-sm  " style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:64px 24px;">
      <div style="width:64px;height:64px;border-radius:16px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;margin-bottom:16px;">
        <svg width="32" height="32" fill="none" stroke="#6b7280" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
        </svg>
      </div>
      <h3 style="font-family:'Pretendard Variable', sans-serif;font-size:1rem;color:#111827;margin:0 0 4px;">등록된 원자재가 없습니다</h3>
      <p style="font-size:0.82rem;color:#6b7280;text-align:center;max-width:320px;font-family:'Pretendard Variable', sans-serif;">원자재를 등록하여 공급망을 투명하게 추적하세요.</p>
      <button v-if="isManufacturer" @click="openModal" class="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700" style="margin-top:16px;display:inline-flex;align-items:center;gap:6px;font-size:0.82rem;">
        <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
        첫 원자재 등록하기
      </button>
    </div>

    <!-- ====== MATERIALS TABLE ====== -->
    <div v-else class="bg-white rounded-xl border border-gray-200 shadow-sm bg-white rounded-xl border border-gray-200 shadow-sm  " style="overflow:hidden;">
      <!-- Table header strip -->
      <div style="padding:12px 20px;border-bottom:1px solid #f1f5f9;background:#ffffff;display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="bp-dot-signal" style="width:8px;height:8px;"></span>
          <span style="font-family:'Pretendard Variable', sans-serif;font-size:0.82rem;font-weight:600;color:#374151;">원자재 목록</span>
        </div>
        <span class="bg-emerald-50 text-emerald-700" style="font-family:'JetBrains Mono', monospace;font-size:0.68rem;padding:2px 10px;border-radius:20px;">
          {{ filteredMaterials.length }}건
        </span>
      </div>
      <div style="overflow-x:auto;">
        <table class="w-full text-sm" style="font-size: 0.8rem;" style="width:100%;">
          <thead>
            <tr>
              <th>ID</th>
              <th>이름</th>
              <th>원산지</th>
              <th>공급사</th>
              <th style="text-align:right;">수량</th>
              <th>단위</th>
              <th>인증ID</th>
              <th>등록일</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(m, idx) in filteredMaterials" :key="m.materialId"
              @click="openDetail(m)" style="cursor:pointer;">
              <td><span class="font-mono" style="font-size:0.75rem;color:#6b7280;">{{ m.materialId }}</span></td>
              <td style="font-weight:600;color:#111827;">{{ m.name }}</td>
              <td>
                <span style="display:inline-flex;align-items:center;gap:4px;color:#374151;">
                  <svg width="13" height="13" fill="none" stroke="#6b7280" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  {{ m.origin }}
                </span>
              </td>
              <td style="color:#374151;">{{ m.supplier }}</td>
              <td style="text-align:right;font-variant-numeric:tabular-nums;font-weight:500;color:#111827;">{{ m.quantity }}</td>
              <td style="color:#6b7280;">{{ m.unit }}</td>
              <td>
                <span v-if="m.certificationId" class="bg-emerald-50 text-emerald-700" style="font-family:'JetBrains Mono', monospace;font-size:0.7rem;display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:6px;">
                  <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                  </svg>
                  {{ m.certificationId }}
                </span>
                <span v-else style="color:#6b7280;font-size:0.8rem;">-</span>
              </td>
              <td style="color:#6b7280;font-size:0.8rem;">{{ formatDate(m.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ====== REGISTRATION MODAL ====== -->
    <div v-if="showModal" style="position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:16px;">
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(6px);" @click="closeModal"></div>
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm bg-white rounded-xl border border-gray-200 shadow-sm " style="position:relative;z-index:1;max-width:520px;width:100%;overflow:hidden;">
        <!-- Modal Header -->
        <div style="padding:18px 24px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:34px;height:34px;border-radius:10px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;">
              <svg width="16" height="16" fill="none" stroke="#059669" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
            </div>
            <h3 style="font-family:'Pretendard Variable', sans-serif;font-size:1.1rem;font-weight:700;color:#111827;margin:0;">원자재 등록</h3>
          </div>
          <button @click="closeModal" class="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50" style="padding:6px;">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <!-- Modal Body -->
        <div style="padding:20px 24px;display:flex;flex-direction:column;gap:16px;">
          <div>
            <label style="display:block;font-family:'Pretendard Variable', sans-serif;font-size:0.7rem;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">자재 ID (자동생성)</label>
            <input v-model="form.materialId" type="text" readonly class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" style="width:100%;font-family:'JetBrains Mono', monospace;color:#6b7280;background:#ffffff;" />
          </div>
          <div>
            <label style="display:block;font-family:'Pretendard Variable', sans-serif;font-size:0.82rem;font-weight:600;color:#374151;margin-bottom:6px;">명칭 <span style="color:#dc2626;">*</span></label>
            <input v-model="form.name" type="text" placeholder="예: 리튬, 코발트, 니켈" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" style="width:100%;" />
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
            <div>
              <label style="display:block;font-family:'Pretendard Variable', sans-serif;font-size:0.82rem;font-weight:600;color:#374151;margin-bottom:6px;">원산지 <span style="color:#dc2626;">*</span></label>
              <input v-model="form.origin" type="text" placeholder="예: 호주" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" style="width:100%;" />
            </div>
            <div>
              <label style="display:block;font-family:'Pretendard Variable', sans-serif;font-size:0.82rem;font-weight:600;color:#374151;margin-bottom:6px;">공급업체 <span style="color:#dc2626;">*</span></label>
              <input v-model="form.supplier" type="text" placeholder="예: ABC Mining" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" style="width:100%;" />
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
            <div>
              <label style="display:block;font-family:'Pretendard Variable', sans-serif;font-size:0.82rem;font-weight:600;color:#374151;margin-bottom:6px;">수량 <span style="color:#dc2626;">*</span></label>
              <input v-model="form.quantity" type="number" min="0" step="0.01" placeholder="0" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" style="width:100%;font-variant-numeric:tabular-nums;" />
            </div>
            <div>
              <label style="display:block;font-family:'Pretendard Variable', sans-serif;font-size:0.82rem;font-weight:600;color:#374151;margin-bottom:6px;">단위</label>
              <select v-model="form.unit" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" style="width:100%;background:#ffffff;">
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="ton">ton</option>
                <option value="lb">lb</option>
              </select>
            </div>
          </div>
          <div>
            <label style="display:block;font-family:'Pretendard Variable', sans-serif;font-size:0.82rem;font-weight:600;color:#374151;margin-bottom:6px;">인증번호 <span style="font-size:0.72rem;font-weight:400;color:#6b7280;">(선택)</span></label>
            <input v-model="form.certificationId" type="text" placeholder="인증서 번호" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" style="width:100%;" />
          </div>
        </div>
        <!-- Modal Footer -->
        <div style="padding:14px 24px;border-top:1px solid #f1f5f9;background:#ffffff;display:flex;justify-content:flex-end;gap:10px;">
          <button @click="closeModal" class="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">취소</button>
          <button @click="submitMaterial" :disabled="!isFormValid || submitting"
            :class="['inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium', (!isFormValid || submitting) ? '' : 'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium-primary']"
            :style="(!isFormValid || submitting) ? 'opacity:0.4;cursor:not-allowed;' : ''"
            style="display:inline-flex;align-items:center;gap:6px;">
            <svg v-if="submitting" style="animation:spin 0.8s linear infinite;" width="16" height="16" fill="none" viewBox="0 0 24 24">
              <circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            {{ submitting ? '등록 중...' : '등록' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ====== DETAIL MODAL ====== -->
    <div v-if="showDetail && selectedMaterial" style="position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:16px;">
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(6px);" @click="showDetail = false"></div>
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm bg-white rounded-xl border border-gray-200 shadow-sm " style="position:relative;z-index:1;max-width:520px;width:100%;overflow:hidden;">
        <!-- Header -->
        <div style="padding:18px 24px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:34px;height:34px;border-radius:10px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;">
              <svg width="16" height="16" fill="none" stroke="#059669" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
              </svg>
            </div>
            <div>
              <h3 style="font-family:'Pretendard Variable', sans-serif;font-size:1rem;font-weight:700;color:#111827;margin:0;">{{ selectedMaterial.name }}</h3>
              <p class="font-mono" style="font-size:0.72rem;color:#6b7280;margin:2px 0 0;">{{ selectedMaterial.materialId }}</p>
            </div>
          </div>
          <button @click="showDetail = false" class="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50" style="padding:6px;">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <!-- Body -->
        <div style="padding:20px 24px;display:flex;flex-direction:column;gap:18px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
            <div>
              <dt style="font-size:0.65rem;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">원산지</dt>
              <dd style="font-size:0.85rem;font-weight:500;color:#111827;display:flex;align-items:center;gap:6px;margin:0;">
                <svg width="14" height="14" fill="none" stroke="#6b7280" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                {{ selectedMaterial.origin }}
              </dd>
            </div>
            <div>
              <dt style="font-size:0.65rem;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">공급업체</dt>
              <dd style="font-size:0.85rem;font-weight:500;color:#111827;margin:0;">{{ selectedMaterial.supplier }}</dd>
            </div>
            <div>
              <dt style="font-size:0.65rem;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">수량</dt>
              <dd style="font-size:0.85rem;font-weight:500;color:#111827;font-variant-numeric:tabular-nums;margin:0;">{{ selectedMaterial.quantity }} {{ selectedMaterial.unit }}</dd>
            </div>
            <div>
              <dt style="font-size:0.65rem;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">등록일</dt>
              <dd style="font-size:0.82rem;color:#374151;margin:0;">{{ formatDate(selectedMaterial.createdAt) }}</dd>
            </div>
          </div>

          <!-- Certification -->
          <div v-if="selectedMaterial.certificationId" style="background:#ffffff;border:1px solid #059669;border-radius:10px;padding:14px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
              <svg width="16" height="16" fill="none" stroke="#059669" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
              <span style="font-size:0.72rem;font-weight:600;color:#059669;">인증 확인됨</span>
            </div>
            <p class="font-mono" style="font-size:0.82rem;color:#059669;margin:0;">{{ selectedMaterial.certificationId }}</p>
          </div>
          <div v-else style="background:#ffffff;border:1px solid #f1f5f9;border-radius:10px;padding:14px;text-align:center;">
            <p style="font-size:0.75rem;color:#6b7280;margin:0;">인증 정보 없음</p>
          </div>

          <!-- Creator MSP -->
          <div>
            <dt style="font-size:0.65rem;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">등록 기관</dt>
            <dd class="bg-emerald-50 text-emerald-700" style="display:inline-flex;font-size:0.72rem;font-weight:600;padding:3px 10px;border-radius:6px;margin:0;">
              {{ selectedMaterial.creatorMsp || selectedMaterial.creatorMSP || '-' }}
            </dd>
          </div>
        </div>
        <!-- Footer -->
        <div style="padding:14px 24px;border-top:1px solid #f1f5f9;background:#ffffff;display:flex;justify-content:flex-end;">
          <button @click="showDetail = false" class="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">닫기</button>
        </div>
      </div>
    </div>
  </div>
  `,
});
