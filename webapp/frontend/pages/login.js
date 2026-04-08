app.component('landing-page', {
  props: ['auth', 'api', 'pageProps'],
  emits: ['navigate'],
  setup(props, { emit }) {
    const featureCards = [
      { title: '배터리 여권', desc: '발급부터 회수 확인까지 필요한 상태를 빠르게 확인합니다.' },
      { title: '정비 기록', desc: '정비 요청과 점검 결과를 한 흐름으로 이어서 봅니다.' },
      { title: '감사 기록', desc: '검토 근거와 작업 기록을 필요한 시점에 확인합니다.' },
    ];

    function goLogin() {
      emit('navigate', 'login');
    }

    function goRegister() {
      emit('navigate', 'login', { tab: 'register' });
    }

    return { featureCards, goLogin, goRegister };
  },
  template: `
    <div class="min-h-screen overflow-hidden bg-[#f5f6f8] text-[#3b3b3b]">
      <div class="relative mx-auto min-h-screen max-w-[1440px] px-6 pb-4 pt-8 lg:px-16 lg:pt-10">
        <div class="pointer-events-none absolute -left-[22rem] -top-[18rem] h-[42rem] w-[42rem] rotate-45 rounded-[70px] bg-[#e1f3ff]"></div>
        <div class="pointer-events-none absolute right-[-10rem] top-[-4rem] h-[32rem] w-[32rem] rotate-45 rounded-[60px] bg-[#e1f3ff]"></div>
        <div class="pointer-events-none absolute bottom-[-12rem] right-[12rem] h-[28rem] w-[28rem] rotate-45 rounded-[60px] bg-[#e1f3ff]"></div>

        <header class="relative z-10 flex items-center justify-between gap-6">
          <div class="flex items-center gap-4">
            <div class="flex h-14 w-14 items-center justify-center rounded-full bg-[#1769e0] text-white shadow-sm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><rect x="6" y="2" width="12" height="20" rx="2"/><line x1="6" y1="7" x2="18" y2="7"/><line x1="6" y1="17" x2="18" y2="17"/></svg>
            </div>
            <div>
              <p class="text-[0.95rem] font-semibold tracking-[0.18em] text-[#1769e0]">BATP</p>
              <p class="text-[1.35rem] font-semibold tracking-[-0.03em] text-[#1769e0]">BatteryPass</p>
            </div>
          </div>

          <nav class="hidden items-center gap-12 text-[1.05rem] font-semibold text-[#3b3b3b] lg:flex">
            <span>배터리 여권</span>
            <span>정비 이력</span>
            <span>감사 기록</span>
            <button @click="goLogin" type="button" class="rounded-xl bg-[#00a8ff] px-9 py-3.5 text-[1.02rem] text-white shadow-sm transition hover:bg-[#0998e2]">로그인</button>
          </nav>

          <button @click="goLogin" type="button" class="rounded-xl bg-[#00a8ff] px-5 py-3 text-sm font-semibold text-white shadow-sm lg:hidden">로그인</button>
        </header>

        <main class="relative z-10 mt-17 grid items-center gap-20 lg:grid-cols-[minmax(0,1fr)_minmax(600px,1.24fr)] lg:gap-40 xl:mt-20">
          <section class="max-w-[38rem]">
            <p class="text-sm font-semibold uppercase tracking-[0.26em] text-[#1769e0]">업무 시작</p>
            <h1 class="mt-5 font-display text-[3.4rem] font-semibold leading-[1.08] tracking-[-0.05em] text-[#3b3b3b] lg:text-[4.95rem]">
              배터리 여권과<br/>관련 기록을<br/>한곳에서 확인하세요
            </h1>
            <div class="mt-9 flex max-w-[30rem] items-start gap-4 text-[#555]">
              <span class="mt-1 h-[88px] w-[6px] rounded-full bg-[#171717]"></span>
              <p class="text-[1.08rem] leading-9">
                발급, 차량 연결, 정비, 회수 확인에 필요한 화면을 한곳에 모았습니다.
              </p>
            </div>

            <div class="mt-7 flex flex-wrap items-center gap-4">
              <button @click="goLogin" type="button" class="rounded-xl bg-[#00a8ff] px-10 py-4 text-[1.08rem] font-semibold text-white shadow-sm transition hover:bg-[#0998e2]">로그인</button>
              <button @click="goRegister" type="button" class="rounded-xl border border-[#d5d9df] bg-white px-10 py-4 text-[1.08rem] font-semibold text-[#3b3b3b] transition hover:border-[#b9c2cf]">계정 등록</button>
            </div>
          </section>

          <section class="relative min-h-[560px] lg:min-h-[710px]">
            <div class="absolute inset-x-0 bottom-0 h-[93%] rounded-[42px] bg-white/68 backdrop-blur-[1px]"></div>
            <div class="absolute left-[-7%] top-[16%] flex h-[82%] w-[104%] items-end justify-center overflow-visible rounded-[34px] bg-transparent shadow-none">
              <img src="./assets/landing-hero.png" alt="Electric vehicle charging illustration" class="h-[138%] w-auto max-w-none object-contain object-right-bottom translate-x-[6%] translate-y-[15%]" />
            </div>
          </section>
        </main>

        <section class="relative z-10 mt-32 ml-[42%] w-[58%] px-4 py-2 md:px-6 md:py-3">
          <div class="grid gap-7 md:grid-cols-3 md:gap-14">
            <article v-for="card in featureCards" :key="card.title" class="min-w-0">
              <p class="text-[1.12rem] font-semibold tracking-[-0.03em] text-[#3b3b3b]">{{ card.title }}</p>
              <p class="mt-2 text-[1rem] leading-7 text-[#667085]">{{ card.desc }}</p>
            </article>
          </div>
        </section>
      </div>
    </div>
  `
});

app.component('login-page', {
  props: ['auth', 'api', 'pageProps'],
  emits: ['login', 'navigate'],
  setup(props, { emit }) {
    const { ref, computed, watch } = Vue;

    const activeTab = ref(props.pageProps?.tab === 'register' ? 'register' : 'login');
    const userId = ref('');
    const password = ref('');
    const orgNum = ref(1);
    const loading = ref(false);
    const errorMsg = ref('');

    const orgOptions = [
      { value: 1, short: '제조사', desc: '여권 발급 · 원자재 등록 · 데이터 정정' },
      { value: 2, short: 'EV제조사', desc: '차량 바인딩 · 운행 인계 · 사고 접수' },
      { value: 3, short: '정비/분석', desc: '정비 완료 · 분석 결과 · 처리 마감' },
      { value: 4, short: '검증기관', desc: '규제 검토 · 회수 판정 · 폐기 승인' },
    ];

    watch(() => props.pageProps?.tab, (tab) => {
      activeTab.value = tab === 'register' ? 'register' : 'login';
    });

    const selectedOrg = computed(() => orgOptions.find((org) => org.value === orgNum.value) || orgOptions[0]);
      const submitLabel = computed(() => activeTab.value === 'login' ? '로그인' : '계정 등록');

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

    function goLanding() {
      emit('navigate', 'landing');
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
          window.$toast('success', '조직 계정 등록이 완료되었습니다. 로그인해 주세요.');
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
      submitLabel,
      switchTab,
      goLanding,
      handleSubmit,
    };
  },
  template: `
    <div class="min-h-screen bg-[#f5f6f8] px-6 py-10 text-[#3b3b3b] lg:px-10">
      <div class="mx-auto flex min-h-[calc(100vh-5rem)] max-w-[560px] items-center">
        <div class="w-full rounded-[30px] bg-white px-7 py-8 shadow-[0_24px_80px_rgba(0,0,0,0.08)] lg:px-8 lg:py-9">
          <div class="mb-7 flex items-center justify-between gap-4">
            <div>
              <p class="sn-eyebrow" style="margin-bottom:0.25rem;">조직 인증</p>
              <h1 class="sn-display text-[2rem]">{{ activeTab === 'login' ? '로그인' : '조직 계정 등록' }}</h1>
            </div>
            <button @click="goLanding" type="button" class="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-600 transition hover:border-stone-300 hover:bg-stone-50">돌아가기</button>
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

          <div v-if="errorMsg" class="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
            {{ errorMsg }}
          </div>

          <form @submit.prevent="handleSubmit" class="mt-6 flex flex-col gap-4">
            <div>
              <label class="mb-2 block text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-stone-500">조직 선택</label>
              <div class="grid grid-cols-2 gap-2">
                <button v-for="org in orgOptions" :key="org.value" type="button" @click="orgNum = org.value"
                  class="rounded-2xl border px-4 py-3 text-left transition"
                  :class="orgNum === org.value ? 'border-stone-900 bg-stone-900 text-white shadow-sm' : 'border-stone-200 bg-stone-50 text-stone-700'">
                  <p class="text-sm font-semibold">{{ org.short }}</p>
                  <p class="mt-1 text-[0.75rem] leading-5 opacity-80">{{ org.desc }}</p>
                </button>
              </div>
            </div>

            <div>
              <label class="mb-2 block text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-stone-500">사용자 ID</label>
              <input v-model="userId" type="text" placeholder="예: issuer.operator.01" class="sn-input" style="padding:0.95rem 1rem;" />
            </div>

            <div>
              <label class="mb-2 block text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-stone-500">비밀번호</label>
              <input v-model="password" type="password" placeholder="비밀번호 입력" class="sn-input" style="padding:0.95rem 1rem;" />
            </div>

            <button type="submit" :disabled="loading"
              class="mt-2 flex items-center justify-center gap-2 rounded-2xl bg-[#00a8ff] px-4 py-4 text-sm font-semibold text-white transition"
              :class="loading ? 'cursor-not-allowed opacity-60' : 'hover:bg-[#0998e2]'">
              <svg v-if="loading" style="width:16px;height:16px;animation:spin 0.8s linear infinite;" fill="none" viewBox="0 0 24 24">
                <circle style="opacity:0.25;" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path style="opacity:0.75;" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              {{ loading ? '처리 중...' : submitLabel }}
            </button>
          </form>
        </div>
      </div>
    </div>
  `
});
