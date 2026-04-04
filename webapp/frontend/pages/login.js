app.component('login-page', {
  props: ['auth', 'api'],
  emits: ['login', 'navigate'],
  setup(props, { emit }) {
    const { ref, computed } = Vue;

    const activeTab = ref('login');
    const userId = ref('');
    const password = ref('');
    const orgNum = ref(1);
    const loading = ref(false);
    const errorMsg = ref('');

    const orgOptions = [
      { value: 1, label: '제조사 (Manufacturer)', short: '제조사', desc: '여권 발급 · 원자재 등록 · 등록 정정', note: 'issuer filing desk', accent: '#059669' },
      { value: 2, label: 'EV제조사 (EV Manufacturer)', short: 'EV제조사', desc: '차량 바인딩 · 운행 인계 · 사고 접수', note: 'vehicle binding desk', accent: '#7c3aed' },
      { value: 3, label: '정비/분석 (Service)', short: '정비/분석', desc: '정비 완료 · 분석 결과 · 후속 docket 정리', note: 'service action desk', accent: '#d97706' },
      { value: 4, label: '검증기관 (Regulator)', short: '검증기관', desc: '규제 검토 · 회수 판정 · disposal 승인', note: 'compliance review desk', accent: '#2563eb' },
    ];

    const selectedOrg = computed(() => orgOptions.find((org) => org.value === orgNum.value) || orgOptions[0]);

    const headlineKo = computed(() => activeTab.value === 'login' ? '접속 자격 확인' : '조직 계정 등록');
    const supportTitle = computed(() => activeTab.value === 'login' ? 'Submit credential checkpoint' : 'File enrollment request');
    const supportBody = computed(() => activeTab.value === 'login'
      ? '조직별 access desk에서 자격을 확인하고 BATP 운영 화면으로 진입합니다.'
      : '신규 조직 계정을 filing queue에 등록하고 승인 가능한 자격 상태로 넘깁니다.');
    const submitLabel = computed(() => activeTab.value === 'login' ? '접속 승인 요청' : '등록 요청 제출');
    const checkpointSteps = computed(() => [
      { code: '01', title: 'Route map', value: activeTab.value === 'login' ? 'credential → org check → access' : 'intake → org filing → activation' },
      { code: '02', title: 'Desk assignment', value: selectedOrg.value.note },
      { code: '03', title: 'Surface scope', value: 'Overview · Registry · Operations · Inspection · Evidence' },
    ]);
    const deskNotes = computed(() => [
      'Overview · Registry · Operations · Inspection · Evidence',
      activeTab.value === 'login' ? '현재 조직 권한으로 접근 가능한 BATP surface만 엽니다.' : '등록 후에는 login checkpoint로 돌아가 access 승인 요청을 진행합니다.',
      selectedOrg.value.desc,
    ]);

    function resetForm() {
      userId.value = '';
      password.value = '';
      orgNum.value = 1;
      errorMsg.value = '';
    }

    function switchTab(tab) {
      activeTab.value = tab;
      resetForm();
    }

    async function handleSubmit() {
      if (!userId.value || !password.value) {
        errorMsg.value = '아이디와 비밀번호를 입력해주세요.';
        return;
      }
      loading.value = true;
      errorMsg.value = '';

      const endpoint = activeTab.value === 'login' ? '/auth/login' : '/auth/register';
      const body = { userId: userId.value, password: password.value, orgNum: orgNum.value };

      try {
        const data = await props.api.post(endpoint, body);
        if (activeTab.value === 'register') {
          window.$toast('success', '회원가입이 완료되었습니다. 로그인해주세요.');
          switchTab('login');
          userId.value = body.userId;
          orgNum.value = body.orgNum;
        } else {
          emit('login', data);
        }
      } catch (err) {
        errorMsg.value = err.message || '요청 처리 중 오류가 발생했습니다.';
      } finally {
        loading.value = false;
      }
    }

    return {
      activeTab,
      userId,
      password,
      orgNum,
      loading,
      errorMsg,
      orgOptions,
      selectedOrg,
      headlineKo,
      supportTitle,
      supportBody,
      submitLabel,
      checkpointSteps,
      deskNotes,
      switchTab,
      handleSubmit,
    };
  },
  template: `
    <div class="min-h-screen" style="background:#f4f4f0; display:flex; align-items:stretch; justify-content:center;">
      <div style="width:100%; max-width:1400px; min-height:100vh; display:grid; grid-template-columns:minmax(0, 1.15fr) minmax(360px, 460px);">

        <section style="background:#111827; color:#fff; padding:2.5rem 2.75rem; display:flex; flex-direction:column; justify-content:space-between; gap:2rem; position:relative; overflow:hidden;">
          <div style="position:absolute; inset:auto -8% -15% auto; width:320px; height:320px; border-radius:50%; background:radial-gradient(circle, rgba(34,197,94,0.12) 0%, rgba(17,24,39,0) 70%);"></div>
          <div style="position:absolute; inset:10% auto auto -10%; width:220px; height:220px; border-radius:50%; background:radial-gradient(circle, rgba(59,130,246,0.12) 0%, rgba(17,24,39,0) 72%);"></div>

          <div style="position:relative; z-index:1;">
            <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:2.5rem;">
              <div style="width:40px; height:40px; border-radius:12px; background:#16a34a; display:flex; align-items:center; justify-content:center;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2"><rect x="6" y="2" width="12" height="20" rx="2"/><line x1="6" y1="7" x2="18" y2="7"/><line x1="6" y1="17" x2="18" y2="17"/></svg>
              </div>
              <div>
                <p class="sn-eyebrow" style="color:rgba(255,255,255,0.45); margin-bottom:0.2rem;">Access desk</p>
                <p style="font-size:1rem; font-weight:700; letter-spacing:-0.02em;">BatteryPass Access Desk</p>
              </div>
            </div>

            <h1 style="font-family:var(--font-display); font-size:3rem; line-height:1.04; letter-spacing:-0.05em; font-weight:700; margin:0 0 1rem; max-width:12ch;">
              registry · operations · evidence로 이어지는 접속 관문
            </h1>
            <p style="max-width:42rem; font-size:0.96rem; line-height:1.85; color:rgba(255,255,255,0.62); margin:0;">
              BATP는 소비자 랜딩이 아니라 조직별 업무 흐름에 맞는 checkpoint로 진입해야 합니다. 접속 전 단계에서 자격, 담당 desk, 다음 action을 먼저 확인하고 들어갑니다.
            </p>

            <div style="display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:0.85rem; margin-top:2rem;">
              <div v-for="step in checkpointSteps" :key="step.code" style="padding:0.95rem 1rem; border-radius:0.95rem; background:rgba(255,255,255,0.05); box-shadow:inset 0 0 0 1px rgba(255,255,255,0.08);">
                <p class="sn-eyebrow" style="color:rgba(255,255,255,0.38); margin-bottom:0.4rem;">{{ step.code }} · {{ step.title }}</p>
                <p style="font-size:0.92rem; font-weight:600; color:#fff; line-height:1.5; margin:0;">{{ step.value }}</p>
              </div>
            </div>
          </div>

          <div style="position:relative; z-index:1; display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:0.9rem; align-items:start;">
            <div style="grid-column:1 / -1; padding:1rem 1.05rem; border-radius:1rem; background:rgba(255,255,255,0.05); box-shadow:inset 0 0 0 1px rgba(255,255,255,0.08);">
              <p class="sn-eyebrow" style="color:rgba(255,255,255,0.38); margin-bottom:0.45rem;">Desk focus</p>
              <p style="font-size:1rem; font-weight:700; margin:0 0 0.35rem;">{{ selectedOrg.short }}</p>
              <p style="font-size:0.84rem; line-height:1.7; color:rgba(255,255,255,0.62); margin:0;">{{ selectedOrg.desc }}</p>
            </div>
            <div v-for="section in ['Overview','Registry','Operations','Inspection','Evidence']" :key="section" style="padding:0.85rem 0.95rem; border-radius:0.95rem; background:rgba(255,255,255,0.04); box-shadow:inset 0 0 0 1px rgba(255,255,255,0.06);">
              <p class="sn-eyebrow" style="color:rgba(255,255,255,0.35); margin-bottom:0.2rem;">Surface</p>
              <p style="font-size:0.86rem; font-weight:600; margin:0;">{{ section }}</p>
            </div>
          </div>
        </section>

        <section style="background:#fff; padding:2.25rem 2rem; display:flex; flex-direction:column; justify-content:center; gap:1.5rem; border-left:1px solid rgba(0,0,0,0.06);">
          <div>
            <p class="sn-eyebrow" style="margin-bottom:0.45rem;">Credential checkpoint</p>
            <h1 class="sn-display" style="font-size:2rem; margin:0 0 0.25rem;">Access Intake</h1>
            <h2 class="sn-display" style="font-size:1.35rem; margin:0 0 0.4rem; color:var(--color-text-1);">{{ headlineKo }}</h2>
            <p style="font-size:0.95rem; line-height:1.75; color:var(--color-text-2); margin:0;">{{ supportBody }}</p>
          </div>

          <div style="display:flex; gap:0.35rem; background:#f5f5f4; border-radius:0.9rem; padding:0.25rem;">
            <button @click="switchTab('login')" type="button"
              style="flex:1; padding:0.7rem 0.8rem; border:none; border-radius:0.72rem; font-size:0.85rem; font-weight:700; cursor:pointer;"
              :style="activeTab === 'login' ? 'background:#171717; color:#fff;' : 'background:transparent; color:#737373;'">
              Sign in
            </button>
            <button @click="switchTab('register')" type="button"
              style="flex:1; padding:0.7rem 0.8rem; border:none; border-radius:0.72rem; font-size:0.85rem; font-weight:700; cursor:pointer;"
              :style="activeTab === 'register' ? 'background:#171717; color:#fff;' : 'background:transparent; color:#737373;'">
              Register
            </button>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
            <div style="padding:0.95rem 1rem; border-radius:0.95rem; background:#fafaf9; border:1px solid var(--color-border);">
              <p class="sn-eyebrow" style="margin-bottom:0.35rem;">Checkpoint progression</p>
              <p style="font-size:0.92rem; font-weight:700; color:var(--color-text-1); margin:0;">{{ checkpointSteps[0].value }}</p>
            </div>
            <div style="padding:0.95rem 1rem; border-radius:0.95rem; background:#fafaf9; border:1px solid var(--color-border);">
              <p class="sn-eyebrow" style="margin-bottom:0.35rem;">Next access action</p>
              <p style="font-size:0.92rem; font-weight:700; color:var(--color-text-1); margin:0;">{{ supportTitle }}</p>
            </div>
          </div>

          <div v-if="errorMsg" style="padding:0.8rem 0.9rem; border-radius:0.9rem; background:#fef2f2; color:#b91c1c; border:1px solid #fecaca; font-size:0.84rem; line-height:1.6;">
            {{ errorMsg }}
          </div>

          <form @submit.prevent="handleSubmit" style="display:flex; flex-direction:column; gap:1rem;">
            <div>
              <label style="display:block; font-size:0.72rem; font-weight:700; color:var(--color-text-2); margin-bottom:0.45rem; letter-spacing:0.08em; text-transform:uppercase;">조직 선택</label>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.55rem;">
                <button v-for="org in orgOptions" :key="org.value" type="button" @click="orgNum = org.value"
                  style="padding:0.8rem 0.85rem; text-align:left; border-radius:0.95rem; border:none; cursor:pointer; transition:all 0.25s ease;"
                  :style="orgNum === org.value
                    ? 'background:#111827; color:#fff; box-shadow:0 10px 24px rgba(17,24,39,0.12);'
                    : 'background:#f5f5f4; color:#404040;'">
                  <div style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem; margin-bottom:0.25rem;">
                    <span style="font-size:0.83rem; font-weight:700;">{{ org.short }}</span>
                    <span style="width:8px; height:8px; border-radius:50%;" :style="{ background: org.accent }"></span>
                  </div>
                  <p style="font-size:0.72rem; line-height:1.55; margin:0; opacity:0.78;">{{ org.note }}</p>
                </button>
              </div>
              <p style="margin-top:0.6rem; font-size:0.76rem; line-height:1.65; color:var(--color-text-3);">{{ selectedOrg.desc }}</p>
            </div>

            <div>
              <label style="display:block; font-size:0.72rem; font-weight:700; color:var(--color-text-2); margin-bottom:0.45rem; letter-spacing:0.08em; text-transform:uppercase;">사용자 ID</label>
              <input v-model="userId" type="text" placeholder="예: issuer.operator.01" class="sn-input" style="padding:0.85rem 0.95rem;" />
            </div>

            <div>
              <label style="display:block; font-size:0.72rem; font-weight:700; color:var(--color-text-2); margin-bottom:0.45rem; letter-spacing:0.08em; text-transform:uppercase;">비밀번호</label>
              <input v-model="password" type="password" placeholder="접속 비밀번호 입력" class="sn-input" style="padding:0.85rem 0.95rem;" />
            </div>

            <div style="padding:0.95rem 1rem; border-radius:0.95rem; background:#fafaf9; border:1px solid var(--color-border);">
              <p class="sn-eyebrow" style="margin-bottom:0.35rem;">Desk notes</p>
              <ul style="display:flex; flex-direction:column; gap:0.35rem; margin:0; padding-left:1rem; color:var(--color-text-2); font-size:0.8rem; line-height:1.65;">
                <li v-for="note in deskNotes" :key="note">{{ note }}</li>
              </ul>
            </div>

            <button type="submit" :disabled="loading"
              style="width:100%; padding:0.9rem 1rem; background:#16a34a; color:#fff; border:none; border-radius:0.95rem; font-size:0.94rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:0.55rem;"
              :style="loading ? 'opacity:0.6; cursor:not-allowed;' : ''">
              <svg v-if="loading" style="width:16px; height:16px; animation:spin 0.8s linear infinite;" fill="none" viewBox="0 0 24 24">
                <circle style="opacity:0.25;" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path style="opacity:0.75;" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              {{ loading ? '처리 중...' : submitLabel }}
            </button>
          </form>
        </section>
      </div>
    </div>
  `
});
