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
      { value: 1, label: '제조사 (Manufacturer)', short: '제조사', desc: '배터리 제조 및 여권 발급', icon: 'factory', color: '#059669' },
      { value: 2, label: 'EV제조사 (EV Manufacturer)', short: 'EV제조사', desc: '차량 바인딩 및 운행 관리', icon: 'car', color: '#7c3aed' },
      { value: 3, label: '정비/분석 (Service)', short: '정비/분석', desc: '배터리 정비 및 상태 분석', icon: 'wrench', color: '#d97706' },
      { value: 4, label: '검증기관 (Regulator)', short: '검증기관', desc: '규제 준수 및 인증 관리', icon: 'shield', color: '#2563eb' },
    ];

    const selectedOrg = computed(() => orgOptions.find(o => o.value === orgNum.value));

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
        } else {
          emit('login', data);
        }
      } catch (err) {
        errorMsg.value = err.message || '요청 처리 중 오류가 발생했습니다.';
      } finally {
        loading.value = false;
      }
    }

    return { activeTab, userId, password, orgNum, loading, errorMsg, orgOptions, selectedOrg, switchTab, handleSubmit };
  },
  template: `
    <div class="min-h-screen relative overflow-hidden" style="background: #1a1814;">

      <!-- ═══ ARCHITECTURAL GRID — subtle structure ═══ -->
      <div class="absolute inset-0 pointer-events-none" style="opacity: 0.04;">
        <div class="absolute top-0 left-1/4 w-px h-full" style="background: #c8ff00;"></div>
        <div class="absolute top-0 left-2/4 w-px h-full" style="background: #c8ff00;"></div>
        <div class="absolute top-0 left-3/4 w-px h-full" style="background: #c8ff00;"></div>
        <div class="absolute top-1/3 left-0 w-full h-px" style="background: #c8ff00;"></div>
        <div class="absolute top-2/3 left-0 w-full h-px" style="background: #c8ff00;"></div>
      </div>

      <!-- ═══ MONUMENTAL BATTERY FORM — background architecture ═══ -->
      <div class="absolute right-0 top-0 bottom-0 w-1/2 pointer-events-none hidden lg:block">
        <svg viewBox="0 0 600 900" class="h-full w-full" preserveAspectRatio="xMaxYMid slice" style="opacity: 0.12;">
          <rect x="120" y="60" width="360" height="780" rx="40" fill="none" stroke="#c8ff00" stroke-width="2"/>
          <rect x="220" y="20" width="160" height="50" rx="20" fill="none" stroke="#c8ff00" stroke-width="2"/>
          <rect x="140" y="120" width="320" height="700" rx="20" fill="#c8ff00" opacity="0.3"/>
          <line x1="140" y1="295" x2="460" y2="295" stroke="#1a1814" stroke-width="3"/>
          <line x1="140" y1="470" x2="460" y2="470" stroke="#1a1814" stroke-width="3"/>
          <line x1="140" y1="645" x2="460" y2="645" stroke="#1a1814" stroke-width="3"/>
        </svg>
      </div>

      <!-- ═══ MAIN CONTENT — asymmetric editorial layout ═══ -->
      <div class="relative z-10 min-h-screen flex flex-col justify-between px-6 sm:px-12 lg:px-20 py-8 lg:py-12">

        <!-- TOP ROW: Navigation marker -->
        <header class="flex items-center justify-between login-reveal" style="animation-delay: 0s;">
          <div class="flex items-center gap-4">
            <div class="w-3 h-3 rounded-full" style="background: #c8ff00;"></div>
            <span class="text-xs tracking-[0.3em] uppercase" style="color: #c8ff00; font-family: 'JetBrains Mono', monospace;">Battery Passport Platform</span>
          </div>
          <span class="text-xs" style="color: rgba(255,255,255,0.2); font-family: 'JetBrains Mono', monospace;">GBA—21</span>
        </header>

        <!-- CENTER: Split layout -->
        <div class="flex flex-col lg:flex-row items-start lg:items-center gap-12 lg:gap-24 flex-1 py-12 lg:py-0">

          <!-- LEFT: Monumental typography -->
          <div class="lg:w-1/2 login-reveal" style="animation-delay: 0.15s;">
            <div class="mb-6">
              <span class="inline-block text-xs tracking-[0.2em] uppercase mb-4" style="color: #c8ff00; font-family: 'JetBrains Mono', monospace;">Blockchain Verified</span>
            </div>
            <h1 class="leading-none tracking-tight" style="font-family: 'Pretendard Variable', sans-serif; font-weight: 800; color: #fafaf5;">
              <span class="block" style="font-size: clamp(3rem, 7vw, 5.5rem);">배터리</span>
              <span class="block" style="font-size: clamp(3rem, 7vw, 5.5rem); color: #c8ff00;">여권</span>
            </h1>
            <p class="mt-6 max-w-md leading-relaxed" style="font-size: 1.05rem; color: rgba(250,250,245,0.4); font-weight: 300; font-family: 'Pretendard Variable', sans-serif;">
              EU 신배터리법 GBA 21 규격 기반<br/>
              배터리 전주기 추적·인증 플랫폼
            </p>

            <!-- Lifecycle — horizontal typographic list -->
            <div class="flex items-center gap-6 mt-10 login-reveal" style="animation-delay: 0.3s;">
              <div v-for="(s, i) in ['제조','운행','정비','재활용']" :key="i" class="flex items-center gap-6">
                <div class="text-center">
                  <span class="block text-2xl font-light" style="color: rgba(250,250,245,0.15); font-family: 'JetBrains Mono', monospace;">0{{ i + 1 }}</span>
                  <span class="block text-xs mt-1 tracking-widest uppercase" style="color: rgba(250,250,245,0.5);">{{ s }}</span>
                </div>
                <div v-if="i < 3" class="w-8 h-px" style="background: rgba(200,255,0,0.15);"></div>
              </div>
            </div>
          </div>

          <!-- RIGHT: Form — stark, functional -->
          <div class="w-full lg:w-[420px] flex-shrink-0 login-reveal" style="animation-delay: 0.25s;">

            <!-- Tab line -->
            <div class="flex gap-0 mb-10" style="border-bottom: 1px solid rgba(250,250,245,0.08);">
              <button @click="switchTab('login')"
                class="pb-3 px-1 mr-8 text-sm font-medium transition-all relative"
                :style="activeTab === 'login' ? 'color: #c8ff00;' : 'color: rgba(250,250,245,0.3);'">
                로그인
                <span v-if="activeTab === 'login'" class="absolute bottom-0 left-0 right-0 h-0.5" style="background: #c8ff00;"></span>
              </button>
              <button @click="switchTab('register')"
                class="pb-3 px-1 text-sm font-medium transition-all relative"
                :style="activeTab === 'register' ? 'color: #c8ff00;' : 'color: rgba(250,250,245,0.3);'">
                회원가입
                <span v-if="activeTab === 'register'" class="absolute bottom-0 left-0 right-0 h-0.5" style="background: #c8ff00;"></span>
              </button>
            </div>

            <!-- Error -->
            <div v-if="errorMsg" class="mb-6 px-4 py-3 text-sm" style="background: rgba(239,68,68,0.1); border-left: 3px solid #ef4444; color: #fca5a5;">
              {{ errorMsg }}
            </div>

            <form @submit.prevent="handleSubmit" class="space-y-6">

              <!-- ORG SELECTION — bold typographic list -->
              <div>
                <label class="block text-xs tracking-[0.15em] uppercase mb-3" style="color: rgba(250,250,245,0.3); font-family: 'JetBrains Mono', monospace;">조직 선택</label>
                <div class="space-y-0" style="border: 1px solid rgba(250,250,245,0.06);">
                  <button v-for="(org, i) in orgOptions" :key="org.value" type="button"
                    @click="orgNum = org.value"
                    class="w-full flex items-center justify-between px-5 py-4 transition-all"
                    :style="[
                      orgNum === org.value
                        ? 'background: rgba(200,255,0,0.06); border-left: 3px solid ' + org.color + ';'
                        : 'background: transparent; border-left: 3px solid transparent;',
                      i < orgOptions.length - 1 ? 'border-bottom: 1px solid rgba(250,250,245,0.04);' : ''
                    ].join('')"
                    @mouseenter="orgNum !== org.value && ($event.currentTarget.style.background = 'rgba(250,250,245,0.02)')"
                    @mouseleave="orgNum !== org.value && ($event.currentTarget.style.background = 'transparent')">
                    <div class="flex items-center gap-4">
                      <span class="text-xs tabular-nums" style="color: rgba(250,250,245,0.15); font-family: 'JetBrains Mono', monospace;">0{{ org.value }}</span>
                      <div>
                        <span class="block text-sm font-semibold" :style="orgNum === org.value ? 'color: #fafaf5;' : 'color: rgba(250,250,245,0.5);'">{{ org.short }}</span>
                        <span class="block text-xs mt-0.5" style="color: rgba(250,250,245,0.2);">{{ org.desc }}</span>
                      </div>
                    </div>
                    <div v-if="orgNum === org.value" class="w-2 h-2 rounded-full" :style="'background: ' + org.color"></div>
                  </button>
                </div>
                <select v-model="orgNum" class="sr-only" aria-hidden="true" tabindex="-1">
                  <option v-for="opt in orgOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>

              <!-- CREDENTIALS — minimal, stark -->
              <div>
                <label class="block text-xs tracking-[0.15em] uppercase mb-2" style="color: rgba(250,250,245,0.3); font-family: 'JetBrains Mono', monospace;">사용자 ID</label>
                <input v-model="userId" type="text" placeholder="아이디를 입력하세요"
                  class="w-full px-0 py-3 bg-transparent outline-none text-base transition-colors"
                  style="border: none; border-bottom: 1px solid rgba(250,250,245,0.1); color: #fafaf5; font-family: 'Pretendard Variable', sans-serif;"
                  onfocus="this.style.borderBottomColor='#c8ff00'"
                  onblur="this.style.borderBottomColor='rgba(250,250,245,0.1)'" />
              </div>

              <div>
                <label class="block text-xs tracking-[0.15em] uppercase mb-2" style="color: rgba(250,250,245,0.3); font-family: 'JetBrains Mono', monospace;">비밀번호</label>
                <input v-model="password" type="password" placeholder="비밀번호를 입력하세요"
                  class="w-full px-0 py-3 bg-transparent outline-none text-base transition-colors"
                  style="border: none; border-bottom: 1px solid rgba(250,250,245,0.1); color: #fafaf5; font-family: 'Pretendard Variable', sans-serif;"
                  onfocus="this.style.borderBottomColor='#c8ff00'"
                  onblur="this.style.borderBottomColor='rgba(250,250,245,0.1)'" />
              </div>

              <!-- SUBMIT — monumental button -->
              <button type="submit" :disabled="loading"
                class="w-full py-4 mt-4 text-sm font-semibold tracking-[0.1em] uppercase transition-all"
                :style="loading
                  ? 'background: rgba(200,255,0,0.2); color: rgba(26,24,20,0.5); cursor: not-allowed;'
                  : 'background: #c8ff00; color: #1a1814;'"
                @mouseenter="!loading && ($event.target.style.background = '#d4ff33')"
                @mouseleave="!loading && ($event.target.style.background = '#c8ff00')">
                <span v-if="loading" class="inline-flex items-center justify-center gap-2">
                  <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  처리중
                </span>
                <span v-else>{{ activeTab === 'login' ? '로그인' : '계정 등록' }}</span>
              </button>
            </form>
          </div>
        </div>

        <!-- BOTTOM ROW: Credits -->
        <footer class="flex items-center justify-between login-reveal" style="animation-delay: 0.4s;">
          <div class="flex items-center gap-6">
            <span v-for="t in ['Hyperledger Fabric', 'Aries DID', 'Ed25519', 'CouchDB']" :key="t"
              class="text-xs" style="color: rgba(250,250,245,0.12); font-family: 'JetBrains Mono', monospace;">{{ t }}</span>
          </div>
          <span class="text-xs" style="color: rgba(250,250,245,0.12); font-family: 'JetBrains Mono', monospace;">v2.0</span>
        </footer>
      </div>

      <style>
        @keyframes loginReveal {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .login-reveal {
          opacity: 0;
          animation: loginReveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        /* Placeholder styling for dark background */
        input::placeholder {
          color: rgba(250, 250, 245, 0.15) !important;
          font-weight: 300;
        }
      </style>
    </div>
  `
});
