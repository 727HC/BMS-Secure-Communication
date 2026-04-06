app.component('landing-page', {
  props: ['auth', 'api', 'pageProps'],
  emits: ['navigate'],
  setup(props, { emit }) {
    const featureCards = [
      { title: '배터리 여권', desc: '생성부터 회수까지 상태를 하나의 등록 흐름으로 정리합니다.' },
      { title: '정비 이력', desc: '정비 요청, 분석 결과, 사고 기록을 이어서 관리합니다.' },
      { title: '규제 증빙', desc: '감사 기록과 회수 판단 근거를 빠르게 확인합니다.' },
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
      <div class="relative mx-auto min-h-screen max-w-[1440px] px-6 pb-10 pt-8 lg:px-16 lg:pt-10">
        <div class="pointer-events-none absolute -left-[22rem] -top-[18rem] h-[42rem] w-[42rem] rotate-45 rounded-[70px] bg-[#e1f3ff]"></div>
        <div class="pointer-events-none absolute right-[-10rem] top-[-4rem] h-[32rem] w-[32rem] rotate-45 rounded-[60px] bg-[#e1f3ff]"></div>
        <div class="pointer-events-none absolute bottom-[-12rem] right-[12rem] h-[28rem] w-[28rem] rotate-45 rounded-[60px] bg-[#e1f3ff]"></div>
        <div class="pointer-events-none absolute right-[2rem] top-[16rem] h-[16rem] w-[40rem] rounded-[48px] bg-[#00a8ff]/80 blur-[2px]"></div>

        <header class="relative z-10 flex items-center justify-between gap-6">
          <div class="flex items-center gap-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-[#1769e0] text-white shadow-sm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><rect x="6" y="2" width="12" height="20" rx="2"/><line x1="6" y1="7" x2="18" y2="7"/><line x1="6" y1="17" x2="18" y2="17"/></svg>
            </div>
            <div>
              <p class="text-sm font-semibold tracking-[0.18em] text-[#1769e0]">BATP</p>
              <p class="text-lg font-semibold tracking-[-0.02em] text-[#1769e0]">BatteryPass</p>
            </div>
          </div>

          <nav class="hidden items-center gap-10 text-base font-semibold text-[#3b3b3b] lg:flex">
            <span>배터리 여권</span>
            <span>정비 이력</span>
            <span>규제 증빙</span>
            <button @click="goLogin" type="button" class="rounded-xl bg-[#00a8ff] px-8 py-3 text-white shadow-sm transition hover:bg-[#0998e2]">로그인</button>
          </nav>

          <button @click="goLogin" type="button" class="rounded-xl bg-[#00a8ff] px-5 py-3 text-sm font-semibold text-white shadow-sm lg:hidden">로그인</button>
        </header>

        <main class="relative z-10 mt-16 grid items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1fr)] lg:gap-6 xl:mt-20">
          <section class="max-w-[33rem]">
            <p class="text-sm font-semibold uppercase tracking-[0.3em] text-[#1769e0]">BATP Platform</p>
            <h1 class="mt-5 font-display text-[3.4rem] font-semibold leading-[1.04] tracking-[-0.05em] text-[#3b3b3b] lg:text-[4.7rem]">
              배터리 여권을<br/>한 번에 보고<br/>바로 이어서 처리하세요
            </h1>
            <p class="mt-8 max-w-[32rem] text-lg leading-9 text-[#555]">
              제조, 차량 바인딩, 정비, 회수, 감사 기록을 하나의 BATP 흐름으로 정리합니다. 처음 들어오는 화면은 설명이 아니라 바로 이해되는 입구여야 합니다.
            </p>

            <div class="mt-10 flex flex-wrap items-center gap-4">
              <button @click="goLogin" type="button" class="rounded-xl bg-[#00a8ff] px-9 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-[#0998e2]">로그인</button>
              <button @click="goRegister" type="button" class="rounded-xl border border-[#d5d9df] bg-white px-9 py-4 text-lg font-semibold text-[#3b3b3b] transition hover:border-[#b9c2cf]">계정 등록</button>
            </div>
          </section>

          <section class="relative min-h-[420px] lg:min-h-[560px]">
            <div class="absolute inset-x-0 bottom-0 h-[88%] rounded-[36px] bg-white/65 backdrop-blur-[1px]"></div>
            <div class="absolute left-[8%] top-[8%] flex h-[66%] w-[58%] items-center justify-center rounded-[28px] bg-white shadow-[0_24px_80px_rgba(23,105,224,0.12)]">
              <img src="./solar-ev-station.png" alt="Solar EV station illustration" class="max-h-[88%] w-auto object-contain" />
            </div>
            <div class="absolute right-[2%] top-[12%] flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1769e0] text-white shadow-[0_16px_32px_rgba(23,105,224,0.2)]">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"><path d="M13 3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <div class="absolute right-[8%] bottom-[14%] w-[38%] rounded-[26px] bg-white px-6 py-5 shadow-[0_20px_40px_rgba(0,0,0,0.08)]">
              <p class="text-sm font-semibold uppercase tracking-[0.18em] text-[#9aa3ad]">Now available</p>
              <h2 class="mt-3 text-2xl font-semibold leading-tight tracking-[-0.03em] text-[#3b3b3b]">정비 · 회수 · 증빙을<br/>바로 확인하는 BATP 입구</h2>
              <p class="mt-4 text-sm leading-7 text-[#666]">대시보드처럼 꾸미기보다, 실제로 들어가서 어떤 작업을 이어서 할지부터 보여줍니다.</p>
            </div>
          </section>
        </main>

        <section class="relative z-10 mt-20 grid gap-6 md:grid-cols-3">
          <article v-for="card in featureCards" :key="card.title" class="rounded-[20px] bg-white px-6 py-6 shadow-[0_16px_32px_rgba(0,0,0,0.05)]">
            <p class="text-2xl font-semibold tracking-[-0.03em] text-[#3b3b3b]">{{ card.title }}</p>
            <p class="mt-4 text-[0.95rem] leading-8 text-[#666]">{{ card.desc }}</p>
          </article>
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
      { value: 3, short: '정비/분석', desc: '정비 완료 · 분석 결과 · 후속 처리' },
      { value: 4, short: '검증기관', desc: '규제 검토 · 회수 판정 · 폐기 승인' },
    ];

    watch(() => props.pageProps?.tab, (tab) => {
      activeTab.value = tab === 'register' ? 'register' : 'login';
    });

    const selectedOrg = computed(() => orgOptions.find((org) => org.value === orgNum.value) || orgOptions[0]);
    const submitLabel = computed(() => activeTab.value === 'login' ? '로그인' : '등록 요청 보내기');

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
              <input v-model="userId" type="text" placeholder="예: issuer.operator.01" class="sn-input" style="padding:0.95rem 1rem;" />
            </div>

            <div>
              <label class="mb-2 block text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-stone-500">비밀번호</label>
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
