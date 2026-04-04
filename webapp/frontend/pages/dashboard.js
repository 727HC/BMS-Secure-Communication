app.component('dashboard-page', {
  props: ['auth', 'api'],
  emits: ['navigate'],
  setup(props, { emit }) {
    const { ref, computed, onMounted } = Vue;

    const passports = ref([]);
    const materials = ref([]);
    const loading = ref(true);

    async function fetchOverview() {
      loading.value = true;
      try {
        const [passportData, materialData] = await Promise.allSettled([
          props.api.get('/passports'),
          props.api.get('/materials'),
        ]);
        passports.value = passportData.status === 'fulfilled'
          ? (passportData.value.records || passportData.value || [])
          : [];
        materials.value = materialData.status === 'fulfilled'
          ? (materialData.value.records || materialData.value || [])
          : [];
      } finally {
        loading.value = false;
      }
    }

    onMounted(fetchOverview);

    const totalCount = computed(() => passports.value.length);
    const activeCount = computed(() => passports.value.filter((p) => p.status === 'ACTIVE').length);
    const serviceOpenCount = computed(() => passports.value.filter((p) => ['MAINTENANCE', 'ANALYSIS'].includes(p.status)).length);
    const recycleReviewCount = computed(() => passports.value.filter((p) => p.recycleAvailable && p.status !== 'DISPOSED').length);
    const bindingPendingCount = computed(() => passports.value.filter((p) => !p.vin).length);
    const recentPassports = computed(() => {
      return [...passports.value]
        .sort((a, b) => String(b.createdAt || b.timestamp || '').localeCompare(String(a.createdAt || a.timestamp || '')))
        .slice(0, 6);
    });

    const roleBrief = computed(() => {
      switch (props.auth.orgMsp) {
        case MSP.MANUFACTURER:
          return '제조 운영 현황';
        case MSP.EV_MANUFACTURER:
          return '차량 연계 운영 현황';
        case MSP.SERVICE:
          return '서비스 운영 현황';
        case MSP.REGULATOR:
          return '규제 운영 현황';
        default:
          return 'BATP 운영 현황';
      }
    });

    const roleDescription = computed(() => {
      switch (props.auth.orgMsp) {
        case MSP.MANUFACTURER:
          return '발급 직후의 신원 정보와 소재 근거를 빠르게 정리해 다음 인계 상태를 준비합니다.';
        case MSP.EV_MANUFACTURER:
          return '차량 바인딩과 후속 서비스 요청을 여권 흐름 안에서 이어 확인합니다.';
        case MSP.SERVICE:
          return '정비·분석 후속을 우선 처리하고 최근 등록 dossier를 이어서 검토합니다.';
        case MSP.REGULATOR:
          return '회수·폐기 판단과 증빙 누락 여부를 규제 docket으로 정리합니다.';
        default:
          return '등록, 운영, 검증 흐름을 한 화면에서 요약합니다.';
      }
    });

    const flowLine = computed(() => {
      if (props.auth.orgMsp === MSP.SERVICE) return '등록 현황 → 운행 상태 → 후속 확인 → 최근 등록';
      if (props.auth.orgMsp === MSP.REGULATOR) return '등록 현황 → 후속 검토 → 회수 판정 → 최근 등록';
      return '등록 현황 → 운행 상태 → 후속 확인 → 최근 등록';
    });

    const immediateChecks = computed(() => {
      const base = [
        {
          label: '바인딩이 필요한 여권',
          count: bindingPendingCount.value,
          note: '차량 바인딩 또는 초기 dossier 연결이 필요한 건',
          route: 'passports',
        },
        {
          label: '정비·분석 후속',
          count: serviceOpenCount.value,
          note: '현재 정비 또는 분석 docket에 머문 건',
          route: 'maintenance',
        },
        {
          label: '회수 검토 대상',
          count: recycleReviewCount.value,
          note: '재활용 가능 또는 회수 판정 검토가 필요한 건',
          route: 'recycling',
        },
        {
          label: '등록 소재 건수',
          count: materials.value.length,
          note: 'registry에서 연결 가능한 source material ledger 수량',
          route: 'materials',
        },
      ];

      if (props.auth.orgMsp === MSP.SERVICE) {
        base[1].note = '정비 완료 또는 분석 결과를 먼저 제출해야 하는 건';
      }
      if (props.auth.orgMsp === MSP.REGULATOR) {
        base[2].note = 'Review extraction or close disposition';
      }
      return base;
    });

    const statusDeck = computed(() => ([
      { label: '전체 등록', value: totalCount.value, hint: '등록 현황' },
      { label: '운행 상태', value: activeCount.value, hint: '차량 바인딩 완료' },
      { label: '후속 확인', value: serviceOpenCount.value, hint: '정비·분석 대기' },
      { label: '소재 ledger', value: materials.value.length, hint: 'registry linkage' },
    ]));

    function formatDate(value) {
      if (!value) return '-';
      try {
        return new Date(value).toLocaleDateString('ko-KR');
      } catch {
        return value;
      }
    }

    function nextAction(passport) {
      if (!passport.vin) return 'Advance to vehicle binding';
      if (passport.status === 'MAINTENANCE') return 'File maintenance completion';
      if (passport.status === 'ANALYSIS') return 'Submit analysis result';
      if (passport.recycleAvailable) return 'Review extraction or close disposition';
      return 'Open technical dossier';
    }

    function openRoute(route) {
      emit('navigate', route);
    }

    function openPassport(passportId) {
      emit('navigate', 'passport-detail', { passportId });
    }

    return {
      loading,
      passports,
      materials,
      roleBrief,
      roleDescription,
      flowLine,
      immediateChecks,
      statusDeck,
      recentPassports,
      formatDate,
      nextAction,
      openRoute,
      openPassport,
      getStatusBadge,
    };
  },
  template: `
    <div>
      <div v-if="loading" style="display:flex;align-items:center;justify-content:center;min-height:55vh;">
        <div style="width:28px;height:28px;border:2px solid rgba(0,0,0,0.06);border-top-color:var(--color-accent);border-radius:50%;animation:spin 0.8s linear infinite;"></div>
      </div>

      <div v-else style="display:flex;flex-direction:column;gap:1rem;">
        <section class="sn-card sn-reveal">
          <div class="sn-card-inner" style="display:flex;flex-direction:column;gap:1rem;">
            <div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap;">
              <div>
                <p class="sn-eyebrow" style="margin-bottom:0.35rem;">Overview</p>
                <h1 class="sn-display" style="font-size:1.5rem;margin-bottom:0.35rem;">운영 현황</h1>
                <p style="font-size:0.95rem;font-weight:600;color:var(--color-text-1);margin-bottom:0.25rem;">{{ roleBrief }}</p>
                <p class="sn-body" style="max-width:44rem;">{{ roleDescription }}</p>
              </div>
              <button @click="openRoute('passports')" class="sn-btn sn-btn-accent" style="font-size:0.8125rem;padding:0.625rem 1rem;">Registry 열기</button>
            </div>

            <div class="sn-panel" style="padding:0.875rem 1rem;border:1px solid rgba(0,0,0,0.05);">
              <p class="sn-eyebrow" style="margin-bottom:0.35rem;">우선 확인 흐름</p>
              <div style="font-size:0.9rem;font-weight:600;color:var(--color-text-1);">{{ flowLine }}</div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:0.75rem;">
              <div v-for="item in statusDeck" :key="item.label" style="padding:0.875rem 1rem;border-radius:0.875rem;background:#fff;border:1px solid rgba(0,0,0,0.06);">
                <p class="sn-eyebrow" style="margin-bottom:0.4rem;">{{ item.label }}</p>
                <div style="font-family:var(--font-mono);font-size:1.25rem;font-weight:700;color:var(--color-text-1);">{{ item.value }}</div>
                <p class="sn-caption" style="margin-top:0.2rem;">{{ item.hint }}</p>
              </div>
            </div>
          </div>
        </section>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:1rem;align-items:start;">
          <section class="sn-panel sn-reveal sn-reveal-d1" style="padding:1.125rem;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;margin-bottom:0.875rem;">
              <div>
                <p class="sn-eyebrow" style="margin-bottom:0.25rem;">Action docket</p>
                <h2 class="sn-heading" style="font-size:1.05rem;">즉시 확인</h2>
              </div>
              <span style="font-size:0.75rem;font-weight:700;color:var(--color-text-3);">{{ immediateChecks.reduce((sum, item) => sum + item.count, 0) }} items</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:0.75rem;">
              <button v-for="item in immediateChecks" :key="item.label" @click="openRoute(item.route)"
                style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;padding:0.875rem 0.9rem;border-radius:0.875rem;background:rgba(0,0,0,0.02);border:1px solid rgba(0,0,0,0.05);text-align:left;cursor:pointer;">
                <div>
                  <div style="font-size:0.9rem;font-weight:600;color:var(--color-text-1);margin-bottom:0.2rem;">{{ item.label }}</div>
                  <div class="sn-caption" style="max-width:22rem;">{{ item.note }}</div>
                </div>
                <div style="font-family:var(--font-mono);font-size:1rem;font-weight:700;color:var(--color-text-1);">{{ item.count }}</div>
              </button>
            </div>
          </section>

          <section class="sn-panel sn-reveal sn-reveal-d2" style="padding:1.125rem;">
            <div style="margin-bottom:0.875rem;">
              <p class="sn-eyebrow" style="margin-bottom:0.25rem;">Overview register</p>
              <h2 class="sn-heading" style="font-size:1.05rem;">등록 현황</h2>
            </div>
            <div style="display:flex;flex-direction:column;gap:0.75rem;">
              <div v-for="passport in recentPassports.slice(0, 4)" :key="passport.passportId"
                @click="openPassport(passport.passportId)"
                style="padding:0.85rem 0.9rem;border-radius:0.875rem;border:1px solid rgba(0,0,0,0.05);cursor:pointer;">
                <div style="display:flex;justify-content:space-between;gap:0.75rem;align-items:flex-start;margin-bottom:0.35rem;">
                  <div>
                    <div style="font-size:0.9rem;font-weight:600;color:var(--color-text-1);">{{ passport.model || passport.passportId }}</div>
                    <div class="sn-caption" style="margin-top:0.15rem;">{{ passport.passportId }}</div>
                  </div>
                  <span :class="['sn-badge', getStatusBadge(passport.status).bg, getStatusBadge(passport.status).text, 'border', getStatusBadge(passport.status).border]">{{ getStatusBadge(passport.status).label }}</span>
                </div>
                <div style="display:flex;justify-content:space-between;gap:0.75rem;flex-wrap:wrap;">
                  <span class="sn-caption">{{ passport.manufacturerName || '제조사 미기입' }}</span>
                  <span style="font-size:0.75rem;font-weight:600;color:var(--color-text-2);">{{ nextAction(passport) }}</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section class="sn-panel sn-reveal sn-reveal-d3" style="padding:1.125rem;overflow:hidden;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;margin-bottom:0.875rem;flex-wrap:wrap;">
            <div>
              <p class="sn-eyebrow" style="margin-bottom:0.25rem;">Recent docket</p>
              <h2 class="sn-heading" style="font-size:1.05rem;">최근 등록 여권</h2>
            </div>
            <span class="sn-caption">registry · dossier handoff</span>
          </div>
          <div style="overflow-x:auto;">
            <table class="sn-table">
              <thead>
                <tr>
                  <th>여권 ID</th>
                  <th>모델</th>
                  <th>상태</th>
                  <th>다음 조치</th>
                  <th>등록일</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="passport in recentPassports" :key="passport.passportId" @click="openPassport(passport.passportId)" style="cursor:pointer;">
                  <td style="font-family:var(--font-mono);font-size:0.75rem;">{{ passport.passportId }}</td>
                  <td>
                    <div style="font-weight:600;color:var(--color-text-1);">{{ passport.model || '-' }}</div>
                    <div class="sn-caption">{{ passport.manufacturerName || '-' }}</div>
                  </td>
                  <td><span :class="['sn-badge', getStatusBadge(passport.status).bg, getStatusBadge(passport.status).text, 'border', getStatusBadge(passport.status).border]">{{ getStatusBadge(passport.status).label }}</span></td>
                  <td style="font-size:0.75rem;font-weight:600;color:var(--color-text-2);">{{ nextAction(passport) }}</td>
                  <td>{{ formatDate(passport.createdAt || passport.timestamp) }}</td>
                </tr>
                <tr v-if="recentPassports.length === 0">
                  <td colspan="5" style="text-align:center;color:var(--color-text-3);padding:2rem 1rem;">최근 등록된 여권이 없습니다.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  `,
});
