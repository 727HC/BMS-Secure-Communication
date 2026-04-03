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
  <div style="display:flex;flex-direction:column;gap:16px;">

    <!-- ====== PAGE HEADER ====== -->
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--color-border);">
      <div>
        <h1 class="sn-display" style="font-size: 1.5rem;">원자재 관리</h1>
        <p class="sn-caption" style="margin-top: 0.125rem;">총 {{ materials.length }}건의 원자재가 등록되어 있습니다</p>
      </div>
      <button v-if="isManufacturer" @click="openModal" class="sn-btn sn-btn-accent" style="display:inline-flex;align-items:center;gap:6px;">
        <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
        원자재 등록
      </button>
    </div>

    <!-- ====== SEARCH BAR ====== -->
    <div class="sn-panel" style="padding:8px 12px;">
      <input v-model="searchQuery" type="text" placeholder="자재ID, 명칭, 원산지, 공급업체, 인증번호 검색..."
        class="sn-input" style="width:100%;font-size:0.8125rem;" />
    </div>

    <!-- ====== TRACEABILITY HEADER ====== -->
    <div v-if="!loading && filteredMaterials.length > 0" style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1rem; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 0.5rem; margin-bottom: 1rem;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
      <span style="font-size: 0.8125rem; color: #16a34a; font-weight: 500;">블록체인 인증 공급망 추적</span>
      <span style="font-size: 0.75rem; color: #525252; margin-left: auto;">{{ filteredMaterials.filter(m => m.certificationId).length }}/{{ filteredMaterials.length }} 인증</span>
    </div>

    <!-- ====== LOADING STATE ====== -->
    <div v-if="loading" style="display: flex; align-items: center; justify-content: center; min-height: 40vh;">
      <div style="width: 28px; height: 28px; border: 2px solid rgba(0,0,0,0.06); border-top-color: var(--color-accent); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
    </div>

    <!-- ====== EMPTY STATE ====== -->
    <div v-else-if="filteredMaterials.length === 0" style="padding: 3rem; text-align: center; border: 1px dashed var(--color-border); border-radius: 0.5rem;">
      <p style="font-size: 0.875rem; color: var(--color-text-3); margin-bottom: 0.75rem;">등록된 원자재가 없습니다. 원자재를 등록하여 공급망을 투명하게 추적하세요.</p>
      <button v-if="isManufacturer" @click="openModal" class="sn-btn sn-btn-accent">원자재 등록</button>
    </div>

    <!-- ====== MATERIALS TABLE ====== -->
    <div v-else class="sn-panel" style="overflow:hidden;">
      <div style="overflow-x:auto;font-size:0.8125rem;">
        <table class="sn-table">
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
              @click="openDetail(m)" style="cursor:pointer;transition:all 0.5s cubic-bezier(0.16,1,0.3,1);">
              <td><span style="font-family:'JetBrains Mono',monospace;font-size:0.75rem;color:#a3a3a3;">{{ m.materialId }}</span></td>
              <td style="font-weight:600;color:#171717;">{{ m.name }}</td>
              <td style="color:#525252;">{{ m.origin }}</td>
              <td style="color:#525252;">{{ m.supplier }}</td>
              <td style="text-align:right;font-variant-numeric:tabular-nums;font-weight:500;color:#171717;">{{ m.quantity }}</td>
              <td style="color:#a3a3a3;">{{ m.unit }}</td>
              <td>
                <span v-if="m.certificationId" style="display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;background:#f0fdf4;border:1px solid #bbf7d0;font-size:0.75rem;font-weight:600;color:#16a34a;">
                  <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                  </svg>
                  인증됨
                </span>
                <span v-else style="font-size:0.75rem;color:#a3a3a3;font-style:italic;">미인증</span>
              </td>
              <td style="color:#a3a3a3;font-size:0.8rem;">{{ formatDate(m.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ====== REGISTRATION MODAL ====== -->
    <div v-if="showModal" class="sn-overlay" @click.self="closeModal">
      <div class="sn-modal" style="max-width:520px;">
        <!-- Modal Header -->
        <div style="padding:18px 24px;border-bottom:1px solid rgba(0,0,0,0.06);display:flex;align-items:center;justify-content:space-between;">
          <h3 style="font-size:1.05rem;font-weight:700;color:#171717;margin:0;">원자재 등록</h3>
          <button @click="closeModal" class="sn-btn sn-btn-ghost" style="padding:6px 10px;">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <!-- Modal Body -->
        <div style="padding:20px 24px;display:flex;flex-direction:column;gap:16px;">
          <div>
            <label class="sn-eyebrow" style="display:block;margin-bottom:6px;">자재 ID (자동생성)</label>
            <input v-model="form.materialId" type="text" readonly class="sn-input" style="color:#a3a3a3;" />
          </div>
          <div>
            <label style="display:block;font-size:0.82rem;font-weight:600;color:#171717;margin-bottom:6px;">명칭 <span style="color:#dc2626;">*</span></label>
            <input v-model="form.name" type="text" placeholder="예: 리튬, 코발트, 니켈" class="sn-input" />
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
            <div>
              <label style="display:block;font-size:0.82rem;font-weight:600;color:#171717;margin-bottom:6px;">원산지 <span style="color:#dc2626;">*</span></label>
              <input v-model="form.origin" type="text" placeholder="예: 호주" class="sn-input" />
            </div>
            <div>
              <label style="display:block;font-size:0.82rem;font-weight:600;color:#171717;margin-bottom:6px;">공급업체 <span style="color:#dc2626;">*</span></label>
              <input v-model="form.supplier" type="text" placeholder="예: ABC Mining" class="sn-input" />
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
            <div>
              <label style="display:block;font-size:0.82rem;font-weight:600;color:#171717;margin-bottom:6px;">수량 <span style="color:#dc2626;">*</span></label>
              <input v-model="form.quantity" type="number" min="0" step="0.01" placeholder="0" class="sn-input" style="font-variant-numeric:tabular-nums;" />
            </div>
            <div>
              <label style="display:block;font-size:0.82rem;font-weight:600;color:#171717;margin-bottom:6px;">단위</label>
              <select v-model="form.unit" class="sn-input">
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="ton">ton</option>
                <option value="lb">lb</option>
              </select>
            </div>
          </div>
          <div>
            <label style="display:block;font-size:0.82rem;font-weight:600;color:#171717;margin-bottom:6px;">인증번호 <span style="font-size:0.72rem;font-weight:400;color:#a3a3a3;">(선택)</span></label>
            <input v-model="form.certificationId" type="text" placeholder="인증서 번호" class="sn-input" />
          </div>
        </div>
        <!-- Modal Footer -->
        <div style="padding:14px 24px;border-top:1px solid rgba(0,0,0,0.06);display:flex;justify-content:flex-end;gap:10px;">
          <button @click="closeModal" class="sn-btn sn-btn-ghost">취소</button>
          <button @click="submitMaterial" :disabled="!isFormValid || submitting" class="sn-btn sn-btn-accent"
            :style="(!isFormValid || submitting) ? 'opacity:0.4;cursor:not-allowed;' : ''"
            style="display:inline-flex;align-items:center;gap:6px;">
            <svg v-if="submitting" style="animation:spin 0.8s linear infinite;width:14px;height:14px;" fill="none" viewBox="0 0 24 24">
              <circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            {{ submitting ? '등록 중...' : '등록' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ====== DETAIL MODAL ====== -->
    <div v-if="showDetail && selectedMaterial" class="sn-overlay" @click.self="showDetail = false">
      <div class="sn-modal" style="max-width:520px;">
        <!-- Header -->
        <div style="padding:18px 24px;border-bottom:1px solid rgba(0,0,0,0.06);display:flex;align-items:center;justify-content:space-between;">
          <div>
            <h3 style="font-size:1rem;font-weight:700;color:#171717;margin:0;">{{ selectedMaterial.name }}</h3>
            <p style="font-family:'JetBrains Mono',monospace;font-size:0.72rem;color:#a3a3a3;margin:2px 0 0;">{{ selectedMaterial.materialId }}</p>
          </div>
          <button @click="showDetail = false" class="sn-btn sn-btn-ghost" style="padding:6px 10px;">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <!-- Body -->
        <div style="padding:20px 24px;display:flex;flex-direction:column;gap:18px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
            <div>
              <dt class="sn-eyebrow" style="margin-bottom:4px;">원산지</dt>
              <dd style="font-size:0.85rem;font-weight:500;color:#171717;margin:0;">{{ selectedMaterial.origin }}</dd>
            </div>
            <div>
              <dt class="sn-eyebrow" style="margin-bottom:4px;">공급업체</dt>
              <dd style="font-size:0.85rem;font-weight:500;color:#171717;margin:0;">{{ selectedMaterial.supplier }}</dd>
            </div>
            <div>
              <dt class="sn-eyebrow" style="margin-bottom:4px;">수량</dt>
              <dd style="font-size:0.85rem;font-weight:500;color:#171717;font-variant-numeric:tabular-nums;margin:0;">{{ selectedMaterial.quantity }} {{ selectedMaterial.unit }}</dd>
            </div>
            <div>
              <dt class="sn-eyebrow" style="margin-bottom:4px;">등록일</dt>
              <dd style="font-size:0.82rem;color:#525252;margin:0;">{{ formatDate(selectedMaterial.createdAt) }}</dd>
            </div>
          </div>

          <!-- Certification -->
          <div v-if="selectedMaterial.certificationId" style="background:#f0fdf4;box-shadow:inset 0 0 0 1px rgba(22,163,74,0.2);border-radius:10px;padding:14px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
              <svg width="16" height="16" fill="none" stroke="#16a34a" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
              <span style="font-size:0.72rem;font-weight:600;color:#16a34a;">인증 확인됨</span>
            </div>
            <p style="font-family:'JetBrains Mono',monospace;font-size:0.82rem;color:#16a34a;margin:0;">{{ selectedMaterial.certificationId }}</p>
          </div>
          <div v-else style="background:#fafafa;box-shadow:inset 0 0 0 1px rgba(0,0,0,0.06);border-radius:10px;padding:14px;text-align:center;">
            <p style="font-size:0.75rem;color:#a3a3a3;margin:0;">인증 정보 없음</p>
          </div>

          <!-- Creator MSP -->
          <div>
            <dt class="sn-eyebrow" style="margin-bottom:4px;">등록 기관</dt>
            <dd style="display:inline-flex;font-size:0.72rem;font-weight:600;padding:3px 10px;border-radius:6px;background:#f5f5f5;color:#525252;margin:0;">
              {{ selectedMaterial.creatorMsp || selectedMaterial.creatorMSP || '-' }}
            </dd>
          </div>
        </div>
        <!-- Footer -->
        <div style="padding:14px 24px;border-top:1px solid rgba(0,0,0,0.06);display:flex;justify-content:flex-end;">
          <button @click="showDetail = false" class="sn-btn sn-btn-ghost">닫기</button>
        </div>
      </div>
    </div>
  </div>
  `,
});
