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
      { value: 1, short: '제조사', desc: '여권 발급 · 원자재 등록 · 데이터 정정' },
      { value: 2, short: 'EV제조사', desc: '차량 바인딩 · 운행 인계 · 사고 접수' },
      { value: 3, short: '정비/분석', desc: '정비 완료 · 분석 결과 · 후속 처리' },
      { value: 4, short: '검증기관', desc: '규제 검토 · 회수 판정 · 폐기 승인' },
    ];

    const selectedOrg = computed(() => orgOptions.find((org) => org.value === orgNum.value) || orgOptions[0]);
    const headline = computed(() => activeTab.value === 'login' ? '로그인' : '조직 계정 등록');
    const supportText = computed(() => activeTab.value === 'login'
      ? '등록된 조직 계정으로 BATP 작업 공간에 진입합니다.'
      : '새 조직 계정을 등록 요청하고 승인 가능한 상태로 넘깁니다.');
    const nextAction = computed(() => activeTab.value === 'login' ? '로그인 후 작업 공간 진입' : '등록 후 승인 대기');
    const submitLabel = computed(() => activeTab.value === 'login' ? '로그인' : '등록 요청 보내기');

    const checkpoints = computed(() => [
      { title: '접속 절차', value: activeTab.value === 'login' ? '조직 선택 → 자격 확인 → 진입' : '조직 선택 → 계정 등록 → 승인 대기' },
      { title: '다음 단계', value: nextAction.value },
      { title: '작업 범위', value: '개요 · 등록부 · 운영 · 점검 · 증빙' },
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
      headline,
      supportText,
      nextAction,
      submitLabel,
      checkpoints,
      switchTab,
      handleSubmit,
    };
  },
  template: `
    <div class="min-h-screen bg-stone-100 text-stone-900">
      <div class="mx-auto grid min-h-screen max-w-[1400px] lg:grid-cols-[minmax(0,1.15fr)_minmax(380px,460px)]">

        <section class="relative overflow-hidden bg-slate-950 px-8 py-10 text-white lg:px-12 lg:py-12">
          <div class="absolute -right-16 bottom-[-80px] h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl"></div>
          <div class="absolute -left-10 top-10 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl"></div>

          <div class="relative flex h-full flex-col justify-between gap-10">
            <div>
              <div class="mb-10 flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2"><rect x="6" y="2" width="12" height="20" rx="2"/><line x1="6" y1="7" x2="18" y2="7"/><line x1="6" y1="17" x2="18" y2="17"/></svg>
                </div>
                <div>
                  <p class="sn-eyebrow" style="color: rgba(255,255,255,0.45); margin-bottom: 0.15rem;">접속 준비</p>
                  <p class="text-base font-semibold tracking-[-0.02em]">BatteryPass 작업 공간</p>
                </div>
              </div>

              <h1 class="max-w-[12ch] font-display text-4xl font-semibold leading-tight tracking-[-0.05em] lg:text-5xl">
                배터리 여권 작업 공간으로 들어가기 전 확인할 것
              </h1>
              <p class="mt-4 max-w-2xl text-[0.97rem] leading-8 text-white/65">
                BATP는 조직 권한에 따라 개요, 등록부, 운영, 점검, 증빙 화면이 달라집니다. 로그인 전에 어떤 조직으로 들어가는지와 다음 단계가 무엇인지 먼저 확인합니다.
              </p>

              <div class="mt-8 grid gap-3 lg:grid-cols-3">
                <div v-for="(checkpoint, index) in checkpoints" :key="checkpoint.title" class="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p class="sn-eyebrow" style="color: rgba(255,255,255,0.4); margin-bottom: 0.35rem;">0{{ index + 1 }} · {{ checkpoint.title }}</p>
                  <p class="text-sm font-semibold leading-6 text-white">{{ checkpoint.value }}</p>
                </div>
              </div>
            </div>

            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div class="rounded-2xl border border-white/10 bg-white/5 p-4 sm:col-span-2 lg:col-span-1 xl:col-span-2">
                <p class="sn-eyebrow" style="color: rgba(255,255,255,0.4); margin-bottom: 0.35rem;">현재 조직</p>
                <p class="text-base font-semibold">{{ selectedOrg.short }}</p>
                <p class="mt-2 text-sm leading-6 text-white/65">{{ selectedOrg.desc }}</p>
              </div>
              <div v-for="section in ['개요', '등록부', '운영', '점검', '증빙']" :key="section" class="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p class="sn-eyebrow" style="color: rgba(255,255,255,0.38); margin-bottom: 0.2rem;">화면</p>
                <p class="text-sm font-semibold text-white">{{ section }}</p>
              </div>
            </div>
          </div>
        </section>

        <section class="flex flex-col justify-center bg-white px-6 py-10 lg:px-10">
          <div class="mx-auto flex w-full max-w-md flex-col gap-6">
            <div>
              <p class="sn-eyebrow" style="margin-bottom: 0.4rem;">조직 인증</p>
              <h2 class="sn-display text-[2rem]">{{ headline }}</h2>
              <p class="mt-3 text-[0.95rem] leading-7 text-stone-600">{{ supportText }}</p>
            </div>

            <div class="rounded-2xl bg-stone-100 p-1">
              <div class="grid grid-cols-2 gap-1">
                <button @click="switchTab('login')" type="button" class="rounded-xl px-4 py-3 text-sm font-semibold transition"
                  :class="activeTab === 'login' ? 'bg-stone-900 text-white shadow-sm' : 'text-stone-500'">
                  로그인
                </button>
                <button @click="switchTab('register')" type="button" class="rounded-xl px-4 py-3 text-sm font-semibold transition"
                  :class="activeTab === 'register' ? 'bg-stone-900 text-white shadow-sm' : 'text-stone-500'">
                  계정 등록
                </button>
              </div>
            </div>

            <div class="grid gap-3 sm:grid-cols-2">
              <div class="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p class="sn-eyebrow" style="margin-bottom: 0.35rem;">접속 절차</p>
                <p class="text-sm font-semibold text-stone-900">{{ checkpoints[0].value }}</p>
              </div>
              <div class="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p class="sn-eyebrow" style="margin-bottom: 0.35rem;">다음 단계</p>
                <p class="text-sm font-semibold text-stone-900">{{ nextAction }}</p>
              </div>
            </div>

            <div v-if="errorMsg" class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
              {{ errorMsg }}
            </div>

            <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
              <div>
                <label class="mb-2 block text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-stone-500">조직 선택</label>
                <div class="grid grid-cols-2 gap-2">
                  <button v-for="org in orgOptions" :key="org.value" type="button" @click="orgNum = org.value"
                    class="rounded-2xl border px-4 py-3 text-left transition"
                    :class="orgNum === org.value ? 'border-stone-900 bg-stone-900 text-white shadow-sm' : 'border-stone-200 bg-stone-50 text-stone-700'">
                    <p class="text-sm font-semibold">{{ org.short }}</p>
                    <p class="mt-1 text-[0.72rem] leading-5 opacity-80">{{ org.desc }}</p>
                  </button>
                </div>
              </div>

              <div>
                <label class="mb-2 block text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-stone-500">사용자 ID</label>
                <input v-model="userId" type="text" placeholder="예: issuer.operator.01" class="sn-input" style="padding: 0.9rem 1rem;" />
              </div>

              <div>
                <label class="mb-2 block text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-stone-500">비밀번호</label>
                <input v-model="password" type="password" placeholder="비밀번호 입력" class="sn-input" style="padding: 0.9rem 1rem;" />
              </div>

              <div class="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p class="sn-eyebrow" style="margin-bottom: 0.35rem;">조직 메모</p>
                <p class="text-sm leading-6 text-stone-700">{{ selectedOrg.desc }}</p>
              </div>

              <button type="submit" :disabled="loading"
                class="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-4 text-sm font-semibold text-white transition"
                :class="loading ? 'cursor-not-allowed opacity-60' : 'hover:bg-emerald-700'">
                <svg v-if="loading" style="width:16px;height:16px;animation:spin 0.8s linear infinite;" fill="none" viewBox="0 0 24 24">
                  <circle style="opacity:0.25;" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path style="opacity:0.75;" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                {{ loading ? '처리 중...' : submitLabel }}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  `
});
