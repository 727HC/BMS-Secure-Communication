app.component('dashboard-page', {
  props: ['auth', 'api'],
  emits: ['navigate'],
  setup(props, { emit }) {
    const { ref, computed, onMounted, onBeforeUnmount } = Vue;

    const passports = ref([]);
    const materials = ref([]);
    const loading = ref(true);

    async function fetchOverview() {
      loading.value = true;
      try {
        const [pd, md] = await Promise.allSettled([
          props.api.get('/passports'),
          props.api.get('/materials'),
        ]);
        passports.value = pd.status === 'fulfilled' ? (pd.value.records || pd.value || []) : [];
        materials.value = md.status === 'fulfilled' ? (md.value.records || md.value || []) : [];
      } finally {
        loading.value = false;
      }
    }
    onMounted(fetchOverview);

    const total = computed(() => passports.value.length);
    const active = computed(() => passports.value.filter(p => p.status === 'ACTIVE').length);
    const svcOpen = computed(() => passports.value.filter(p => ['MAINTENANCE', 'ANALYSIS'].includes(p.status)).length);
    const recycleN = computed(() => passports.value.filter(p => p.recycleAvailable && p.status !== 'DISPOSED').length);
    const bindPend = computed(() => passports.value.filter(p => !p.vin).length);

    const avgSOC = computed(() => {
      const w = passports.value.filter(p => p.currentSoc != null || p.soc != null);
      return w.length ? Math.round(w.reduce((a, p) => a + scaleSOC(p.currentSoc ?? p.soc), 0) / w.length) : null;
    });
    const avgTemp = computed(() => {
      const w = passports.value.filter(p => p.temperature != null || p.currentTemp != null);
      return w.length ? +(w.reduce((a, p) => a + scaleTemp(p.temperature ?? p.currentTemp), 0) / w.length).toFixed(1) : null;
    });

    const SC = { MANUFACTURED: '#3b82f6', ACTIVE: '#10b981', MAINTENANCE: '#f59e0b', ANALYSIS: '#8b5cf6', RECYCLING: '#06b6d4', DISPOSED: '#94a3b8' };

    const chemistryRows = computed(() => {
      const groups = ['LFP', 'NCM', 'NCA', 'LMO', '기타'];
      const counts = groups.map((label) => {
        const n = label === '기타'
          ? passports.value.filter(p => !p.chemistry || !groups.slice(0, 4).includes(p.chemistry)).length
          : passports.value.filter(p => p.chemistry === label).length;
        return { label, value: n };
      });
      const totalCount = Math.max(counts.reduce((sum, row) => sum + row.value, 0), 1);
      return counts.map((row, index) => ({
        ...row,
        pct: row.value / totalCount * 100,
        color: ['#1769e0', '#00a8ff', '#73c8ff', '#9ad9ff', '#d6eefc'][index],
      }));
    });

    const categoryRows = computed(() => {
      const rows = [
        { label: '제조완료', value: passports.value.filter(p => p.status === 'MANUFACTURED').length },
        { label: '운행중', value: passports.value.filter(p => p.status === 'ACTIVE').length },
        { label: '정비·분석', value: passports.value.filter(p => ['MAINTENANCE', 'ANALYSIS'].includes(p.status)).length },
        { label: '회수·재활용', value: passports.value.filter(p => p.status === 'RECYCLING').length },
        { label: '폐기', value: passports.value.filter(p => p.status === 'DISPOSED').length },
      ];
      const totalCount = Math.max(rows.reduce((sum, row) => sum + row.value, 0), 1);
      return rows.map((row, index) => ({
        ...row,
        pct: row.value / totalCount * 100,
        color: ['#1769e0', '#00a8ff', '#4dc0ff', '#8ddcff', '#d8edf8'][index],
      }));
    });

    function ringSegments(rows) {
      const totalCount = Math.max(rows.reduce((sum, row) => sum + row.value, 0), 1);
      const circumference = 2 * Math.PI * 72;
      let offset = 0;
      return rows.map((row) => {
        const dash = (row.value / totalCount) * circumference;
        const seg = { ...row, dashArray: `${dash} ${circumference - dash}`, dashOffset: -offset };
        offset += dash;
        return seg;
      });
    }

    const chemistrySegments = computed(() => ringSegments(chemistryRows.value));
    const categorySegments = computed(() => ringSegments(categoryRows.value));
    const chemistryTop = computed(() => [...chemistryRows.value].sort((a, b) => b.value - a.value)[0] || null);
    const categoryTop = computed(() => [...categoryRows.value].sort((a, b) => b.value - a.value)[0] || null);

    const recent = computed(() =>
      [...passports.value]
        .sort((a, b) => String(b.createdAt || b.timestamp || '').localeCompare(String(a.createdAt || a.timestamp || '')))
        .slice(0, 8)
    );

    const displayTitle = computed(() => '대시보드');
    const rowMenuId = ref(null);
    const tableWrapRef = ref(null);

    function fmtDate(v) {
      if (!v) return '-';
      try { return new Date(v).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }); }
      catch { return v; }
    }

    function nextAction(p) {
      if (!p.vin) return '바인딩 필요';
      if (p.status === 'MAINTENANCE') return '정비 완료';
      if (p.status === 'ANALYSIS') return '분석 등록';
      if (p.recycleAvailable) return '회수 검토';
      return '상세 보기';
    }

    function actionTarget(p) {
      if (!p.vin) return { route: 'passports', label: '등록부에서 확인' };
      if (p.status === 'MAINTENANCE' || p.status === 'ANALYSIS') return { route: 'maintenance', label: nextAction(p) };
      if (p.recycleAvailable || p.status === 'RECYCLING') return { route: 'recycling', label: nextAction(p) };
      return { route: 'passport-detail', label: '기술 문서' };
    }

    function primaryActionLabel(passport) {
      return actionTarget(passport).label;
    }

    function go(r) { emit('navigate', r); }
    function goPP(id) { emit('navigate', 'passport-detail', { passportId: id }); }
    function goAction(passport) {
      const target = actionTarget(passport);
      if (target.route === 'passport-detail') return goPP(passport.passportId);
      return go(target.route);
    }

    function toggleRowMenu(id) {
      rowMenuId.value = rowMenuId.value === id ? null : id;
    }

    function quickActions(passport) {
      const items = [{ key: 'detail', label: '기술 문서 보기' }];
      if (!passport.vin) items.push({ key: 'bind', label: '등록부에서 바인딩 확인' });
      if (passport.status === 'MAINTENANCE' || passport.status === 'ANALYSIS') items.push({ key: 'maintenance', label: '정비 화면으로 이동' });
      if (passport.recycleAvailable || passport.status === 'RECYCLING') items.push({ key: 'recycling', label: '재활용 화면으로 이동' });
      return items;
    }

    function runQuickAction(passport, actionKey) {
      rowMenuId.value = null;
      if (actionKey === 'detail') return goPP(passport.passportId);
      if (actionKey === 'bind') return go('passports');
      if (actionKey === 'maintenance') return go('maintenance');
      if (actionKey === 'recycling') return go('recycling');
    }

    function closeMenuOnOutside(event) {
      if (tableWrapRef.value && !tableWrapRef.value.contains(event.target)) {
        rowMenuId.value = null;
      }
    }

    onMounted(() => {
      document.addEventListener('click', closeMenuOnOutside);
    });

    onBeforeUnmount(() => {
      document.removeEventListener('click', closeMenuOnOutside);
    });

    return {
      loading, total, active, svcOpen, recycleN, bindPend,
      avgSOC, avgTemp, recent, materials, displayTitle, SC,
      chemistryRows, categoryRows, chemistrySegments, categorySegments, chemistryTop, categoryTop,
      fmtDate, nextAction, actionTarget, primaryActionLabel, go, goPP, goAction, getStatusBadge,
      rowMenuId, tableWrapRef, toggleRowMenu, quickActions, runQuickAction,
    };
  },
  template: `
<div>
  <div v-if="loading" style="display:flex;align-items:center;justify-content:center;min-height:52vh;">
    <div style="width:26px;height:26px;border:2.5px solid #dbe4f0;border-top-color:#1769e0;border-radius:50%;animation:spin .7s linear infinite;"></div>
  </div>

  <div v-else style="display:flex;flex-direction:column;gap:24px;">

    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;">
      <div>
        <p class="sn-eyebrow" style="margin:0 0 6px;color:#94a3b8;">운영 개요</p>
        <h1 class="sn-display" style="font-size:2rem;margin:0 0 6px;">{{ displayTitle }}</h1>
        <p class="sn-body" style="margin:0;max-width:44rem;">배터리 여권의 등록 현황, 후속 처리, 회수 검토 상태를 한 번에 확인하고 바로 다음 조치로 이어집니다.</p>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <button style="display:inline-flex;align-items:center;gap:8px;padding:11px 18px;background:#fff;border:1px solid rgba(0,0,0,0.08);border-radius:12px;font-size:14px;font-weight:600;color:#475569;cursor:pointer;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>
          내보내기
        </button>
        <button style="display:inline-flex;align-items:center;gap:8px;padding:11px 18px;background:#fff;border:1px solid rgba(0,0,0,0.08);border-radius:12px;font-size:14px;font-weight:600;color:#475569;cursor:pointer;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 5h18"/><path d="M6 12h12"/><path d="M10 19h4"/></svg>
          필터
        </button>
        <button @click="go('passports')" style="display:inline-flex;align-items:center;gap:8px;padding:12px 18px;background:#1769e0;color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 14px 28px rgba(23,105,224,0.18);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          여권 추가
        </button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;">
      <div style="background:#fff;border-radius:20px;padding:22px 24px;box-shadow:0 1px 3px rgba(0,0,0,0.05);border:1px solid rgba(0,0,0,0.04);">
        <p class="sn-eyebrow" style="margin-bottom:8px;color:#94a3b8;">등록 여권</p>
        <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:10px;">
          <p style="font-family:var(--font-display);font-size:3rem;font-weight:700;line-height:1;color:#0f172a;margin:0;">{{ total }}</p>
          <span style="display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:#edf7f0;color:#11945c;font-size:12px;font-weight:700;">+ {{ bindPend > 0 ? bindPend : active }}건</span>
        </div>
        <p class="sn-caption" style="margin-top:10px;">현재 등록부에 올라온 배터리 여권 수</p>
      </div>
      <div style="background:#fff;border-radius:20px;padding:22px 24px;box-shadow:0 1px 3px rgba(0,0,0,0.05);border:1px solid rgba(0,0,0,0.04);">
        <p class="sn-eyebrow" style="margin-bottom:8px;color:#94a3b8;">후속 처리</p>
        <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:10px;">
          <p style="font-family:var(--font-display);font-size:3rem;font-weight:700;line-height:1;color:#0f172a;margin:0;">{{ svcOpen }}</p>
          <span style="display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:#eef5ff;color:#1769e0;font-size:12px;font-weight:700;">정비·분석 대기</span>
        </div>
        <p class="sn-caption" style="margin-top:10px;">정비 또는 분석 결과 입력이 필요한 여권</p>
      </div>
      <div style="background:#fff;border-radius:20px;padding:22px 24px;box-shadow:0 1px 3px rgba(0,0,0,0.05);border:1px solid rgba(0,0,0,0.04);">
        <p class="sn-eyebrow" style="margin-bottom:8px;color:#94a3b8;">회수 검토</p>
        <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:10px;">
          <p style="font-family:var(--font-display);font-size:3rem;font-weight:700;line-height:1;color:#0f172a;margin:0;">{{ recycleN }}</p>
          <span style="display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:#ecfbff;color:#0891b2;font-size:12px;font-weight:700;">회수·재활용 검토</span>
        </div>
        <p class="sn-caption" style="margin-top:10px;">재활용 가능 또는 추출 검토 상태</p>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start;">
      <section style="background:#fff;border-radius:20px;padding:22px 24px;box-shadow:0 1px 3px rgba(0,0,0,0.05);border:1px solid rgba(0,0,0,0.04);">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:18px;">
          <div>
            <p class="sn-eyebrow" style="margin-bottom:6px;color:#94a3b8;">Chemistry</p>
            <h2 class="sn-heading" style="font-size:1.1rem;margin:0;">화학계열 분포</h2>
          </div>
          <span class="sn-caption">화학계열 기준</span>
        </div>
        <div style="display:grid;grid-template-columns:220px 1fr;gap:22px;align-items:center;">
          <div style="display:flex;justify-content:center;">
            <svg viewBox="0 0 180 180" style="width:180px;height:180px;">
              <circle cx="90" cy="90" r="72" fill="none" stroke="#eef4fb" stroke-width="24"></circle>
              <circle v-for="segment in chemistrySegments" :key="segment.label" cx="90" cy="90" r="72" fill="none" :stroke="segment.color" stroke-width="24" stroke-linecap="butt" :stroke-dasharray="segment.dashArray" :stroke-dashoffset="segment.dashOffset" transform="rotate(-90 90 90)"></circle>
              <circle cx="90" cy="90" r="38" fill="#fff"></circle>
              <text x="90" y="82" text-anchor="middle" style="font-family:var(--font-display);font-size:13px;font-weight:700;fill:#0f172a;">총 {{ total }}</text>
              <text x="90" y="101" text-anchor="middle" style="font-size:11px;font-weight:600;fill:#94a3b8;">여권</text>
            </svg>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:14px;background:linear-gradient(135deg,#eef5ff 0%,#f8fbff 100%);border:1px solid rgba(23,105,224,0.08);">
              <div>
                <div class="sn-caption" style="margin-bottom:4px;">대표 화학계열</div>
                <div style="font-size:14px;font-weight:800;color:#0f172a;">{{ chemistryTop?.label || '-' }}</div>
              </div>
              <div style="text-align:right;">
                <div style="font-family:var(--font-mono);font-size:13px;font-weight:700;color:#1769e0;">{{ chemistryTop?.value || 0 }}건</div>
                <div class="sn-caption">{{ Math.round(chemistryTop?.pct || 0) }}%</div>
              </div>
            </div>
            <div v-for="row in chemistryRows" :key="row.label" style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 12px;border-radius:14px;background:#f8fbff;">
              <div>
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
                  <span style="width:10px;height:10px;border-radius:50%;" :style="{ background: row.color }"></span>
                  <span style="font-size:14px;font-weight:700;color:#334155;">{{ row.label }}</span>
                </div>
                <div style="height:6px;border-radius:999px;background:#e6eff8;overflow:hidden;">
                  <div :style="{ width: row.pct + '%', background: row.color, height: '100%' }"></div>
                </div>
              </div>
              <div style="text-align:right;">
                <div style="font-family:var(--font-mono);font-size:14px;font-weight:700;color:#0f172a;">{{ row.value }}</div>
                <div class="sn-caption">{{ Math.round(row.pct) }}%</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style="background:#fff;border-radius:20px;padding:22px 24px;box-shadow:0 1px 3px rgba(0,0,0,0.05);border:1px solid rgba(0,0,0,0.04);">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:18px;">
          <div>
            <p class="sn-eyebrow" style="margin-bottom:6px;color:#94a3b8;">Category</p>
            <h2 class="sn-heading" style="font-size:1.1rem;margin:0;">상태 분류</h2>
          </div>
          <span class="sn-caption">상태 기준</span>
        </div>
        <div style="display:grid;grid-template-columns:220px 1fr;gap:22px;align-items:center;">
          <div style="display:flex;justify-content:center;">
            <svg viewBox="0 0 180 180" style="width:180px;height:180px;">
              <circle cx="90" cy="90" r="72" fill="none" stroke="#eef4fb" stroke-width="24"></circle>
              <circle v-for="segment in categorySegments" :key="segment.label" cx="90" cy="90" r="72" fill="none" :stroke="segment.color" stroke-width="24" stroke-linecap="butt" :stroke-dasharray="segment.dashArray" :stroke-dashoffset="segment.dashOffset" transform="rotate(-90 90 90)"></circle>
              <circle cx="90" cy="90" r="38" fill="#fff"></circle>
              <text x="90" y="82" text-anchor="middle" style="font-family:var(--font-display);font-size:13px;font-weight:700;fill:#0f172a;">총 {{ total }}</text>
              <text x="90" y="101" text-anchor="middle" style="font-size:11px;font-weight:600;fill:#94a3b8;">상태</text>
            </svg>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:14px;background:linear-gradient(135deg,#eef5ff 0%,#f8fbff 100%);border:1px solid rgba(23,105,224,0.08);">
              <div>
                <div class="sn-caption" style="margin-bottom:4px;">현재 비중이 큰 상태</div>
                <div style="font-size:14px;font-weight:800;color:#0f172a;">{{ categoryTop?.label || '-' }}</div>
              </div>
              <div style="text-align:right;">
                <div style="font-family:var(--font-mono);font-size:13px;font-weight:700;color:#1769e0;">{{ categoryTop?.value || 0 }}건</div>
                <div class="sn-caption">{{ Math.round(categoryTop?.pct || 0) }}%</div>
              </div>
            </div>
            <div v-for="row in categoryRows" :key="row.label" style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 12px;border-radius:14px;background:#f8fbff;">
              <div>
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
                  <span style="width:10px;height:10px;border-radius:50%;" :style="{ background: row.color }"></span>
                  <span style="font-size:14px;font-weight:700;color:#334155;">{{ row.label }}</span>
                </div>
                <div style="height:6px;border-radius:999px;background:#e6eff8;overflow:hidden;">
                  <div :style="{ width: row.pct + '%', background: row.color, height: '100%' }"></div>
                </div>
              </div>
              <div style="text-align:right;">
                <div style="font-family:var(--font-mono);font-size:14px;font-weight:700;color:#0f172a;">{{ row.value }}</div>
                <div class="sn-caption">{{ Math.round(row.pct) }}%</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <div style="display:flex;justify-content:center;">
      <button style="display:inline-flex;align-items:center;gap:10px;padding:13px 18px;background:#fff;border:1px solid rgba(0,0,0,0.08);border-radius:12px;font-size:14px;font-weight:600;color:#475569;cursor:pointer;box-shadow:0 8px 20px rgba(15,23,42,0.04);">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        맞춤 리포트 추가
      </button>
    </div>

    <section ref="tableWrapRef" style="background:#fff;border-radius:20px;padding:18px 20px;box-shadow:0 1px 3px rgba(0,0,0,0.05);border:1px solid rgba(0,0,0,0.04);overflow:hidden;">
      <div style="overflow-x:auto;">
        <table class="sn-table" style="min-width:900px;">
          <thead>
            <tr>
              <th>여권</th>
              <th>모델</th>
              <th>무게</th>
              <th>화학계열</th>
              <th>총 에너지</th>
              <th>등록일</th>
              <th>상태</th>
              <th>다음 조치</th>
              <th style="text-align:right;">관리</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="passport in recent" :key="passport.passportId" @click="goPP(passport.passportId)" style="cursor:pointer;">
              <td>
                <div style="display:flex;flex-direction:column;gap:4px;">
                  <span style="font-size:14px;font-weight:700;color:#0f172a;">{{ passport.passportId }}</span>
                  <span class="sn-caption">{{ passport.manufacturerName || '-' }}</span>
                </div>
              </td>
              <td>{{ passport.model || '-' }}</td>
              <td>{{ passport.weight ? passport.weight + 'kg' : '-' }}</td>
              <td>{{ passport.chemistry || '-' }}</td>
              <td>{{ passport.totalEnergy ? passport.totalEnergy + 'kWh' : '-' }}</td>
              <td>{{ fmtDate(passport.createdAt || passport.timestamp) }}</td>
              <td>
                <span style="display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;font-size:12px;font-weight:700;" :style="{ background: (SC[passport.status] || '#94a3b8') + '18', color: SC[passport.status] || '#94a3b8' }">
                  <span style="width:8px;height:8px;border-radius:50%;" :style="{ background: SC[passport.status] || '#94a3b8' }"></span>
                  {{ getStatusBadge(passport.status).label }}
                </span>
              </td>
              <td>
                <button @click.stop="goAction(passport)" style="display:inline-flex;align-items:center;gap:6px;padding:7px 11px;border:none;border-radius:10px;background:#f8fbff;color:#1769e0;font-size:12px;font-weight:700;cursor:pointer;">
                  {{ actionTarget(passport).label }}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17L17 7"/><path d="M8 7h9v9"/></svg>
                </button>
              </td>
              <td style="text-align:right;">
                <div style="display:inline-flex;align-items:center;gap:8px;position:relative;">
                  <button @click.stop="goAction(passport)" style="padding:7px 12px;border:none;border-radius:10px;background:#0f172a;color:#fff;font-size:12px;font-weight:700;cursor:pointer;">{{ primaryActionLabel(passport) }}</button>
                  <button @click.stop="goPP(passport.passportId)" style="padding:7px 12px;border:none;border-radius:10px;background:#eef5ff;color:#1769e0;font-size:12px;font-weight:700;cursor:pointer;">상세</button>
                  <button @click.stop="toggleRowMenu(passport.passportId)" :aria-expanded="rowMenuId === passport.passportId ? 'true' : 'false'" style="width:30px;height:30px;border:none;border-radius:10px;background:#f8fafc;color:#94a3b8;cursor:pointer;font-size:18px;line-height:1;">⋯</button>
                  <div v-if="rowMenuId === passport.passportId" style="position:absolute;top:38px;right:0;min-width:180px;background:#fff;border:1px solid rgba(0,0,0,0.08);border-radius:14px;box-shadow:0 18px 30px rgba(15,23,42,0.12);padding:6px;z-index:5;">
                    <button
                      v-for="item in quickActions(passport)"
                      :key="item.key"
                      @click.stop="runQuickAction(passport, item.key)"
                      style="display:flex;align-items:center;width:100%;padding:10px 12px;border:none;background:transparent;border-radius:10px;font-size:13px;font-weight:600;color:#334155;cursor:pointer;text-align:left;"
                    >
                      <span>{{ item.label }}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17L17 7"/><path d="M8 7h9v9"/></svg>
                    </button>
                  </div>
                </div>
              </td>
            </tr>
            <tr v-if="!recent.length">
              <td colspan="9" style="text-align:center;color:#94a3b8;padding:36px 0;">등록된 여권이 없습니다</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</div>
  `,
});
