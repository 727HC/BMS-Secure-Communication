app.component('login-page', {
  props: ['auth', 'api'],
  emits: ['login', 'navigate'],
  setup(props, { emit }) {
    const { ref } = Vue;

    const activeTab = ref('login');
    const userId = ref('');
    const password = ref('');
    const orgNum = ref(1);
    const loading = ref(false);
    const errorMsg = ref('');

    const orgOptions = [
      { value: 1, label: '제조사 (Manufacturer)' },
      { value: 2, label: 'EV제조사 (EV Manufacturer)' },
      { value: 3, label: '정비/분석 (Service)' },
      { value: 4, label: '검증기관 (Regulator)' },
    ];

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

    return { activeTab, userId, password, orgNum, loading, errorMsg, orgOptions, switchTab, handleSubmit };
  },
  template: `
    <div class="min-h-screen flex items-center justify-center"
         style="background: linear-gradient(135deg, #0f172a 0%, #14432a 50%, #065f46 100%);">
      <!-- Grid overlay -->
      <div class="fixed inset-0 opacity-[0.04] pointer-events-none"
           style="background-image: url('data:image/svg+xml,%3Csvg width=&quot;60&quot; height=&quot;60&quot; xmlns=&quot;http://www.w3.org/2000/svg&quot;%3E%3Cpath d=&quot;M0 0h60v60H0z&quot; fill=&quot;none&quot;/%3E%3Cpath d=&quot;M0 0h1v60H0zM60 0h1v60h-1zM0 0v1h60V0zM0 60v1h60v-1z&quot; fill=&quot;%236ee7b7&quot;/%3E%3C/svg%3E');"></div>

      <!-- Floating ambient shapes -->
      <div class="fixed top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="fixed bottom-1/3 right-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="fixed top-2/3 left-1/2 w-64 h-64 bg-teal-500/8 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Centered container -->
      <div class="relative z-10 flex flex-col lg:flex-row items-start gap-12 xl:gap-16 px-6 py-12 max-w-5xl mx-auto">

      <!-- ===== LEFT: Platform Info (hidden on mobile) ===== -->
      <div class="hidden lg:flex flex-1 flex-col justify-start pt-4">
        <!-- Logo -->
        <div class="mb-10">
          <div class="inline-flex items-center justify-center w-14 h-14 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 mb-5 shadow-lg shadow-emerald-900/30">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="6" y="2" width="12" height="20" rx="2" ry="2"/>
              <line x1="6" y1="6" x2="18" y2="6"/>
              <line x1="6" y1="18" x2="18" y2="18"/>
              <path d="M12 9v6"/><path d="M9 12h6"/>
            </svg>
          </div>
          <h1 class="text-4xl font-bold text-white tracking-tight leading-tight mb-3">Battery Passport<br/>Platform</h1>
          <p class="text-emerald-300/70 text-base leading-relaxed max-w-md">GBA 21 기반 배터리 전주기 여권 관리 플랫폼.<br/>블록체인과 DID로 신뢰할 수 있는 배터리 이력을 제공합니다.</p>
        </div>

        <!-- Feature cards 2x2 grid -->
        <div class="grid grid-cols-2 gap-3 max-w-md">
          <div class="bg-white/[0.05] backdrop-blur-sm rounded-xl border border-white/[0.08] p-3.5">
            <div class="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-2.5">
              <svg class="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
            </div>
            <h3 class="text-xs font-semibold text-white mb-0.5">GBA 21 규제 준수</h3>
            <p class="text-[10px] text-emerald-200/40 leading-relaxed">21개 필수 항목 자동 추적</p>
          </div>
          <div class="bg-white/[0.05] backdrop-blur-sm rounded-xl border border-white/[0.08] p-3.5">
            <div class="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center mb-2.5">
              <svg class="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </div>
            <h3 class="text-xs font-semibold text-white mb-0.5">DID/VC 신뢰성</h3>
            <p class="text-[10px] text-emerald-200/40 leading-relaxed">Ed25519 서명 + VC 무결성</p>
          </div>
          <div class="bg-white/[0.05] backdrop-blur-sm rounded-xl border border-white/[0.08] p-3.5">
            <div class="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center mb-2.5">
              <svg class="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
            <h3 class="text-xs font-semibold text-white mb-0.5">BMU 실시간 모니터링</h3>
            <p class="text-[10px] text-emerald-200/40 leading-relaxed">센서 데이터 블록체인 기록</p>
          </div>
          <div class="bg-white/[0.05] backdrop-blur-sm rounded-xl border border-white/[0.08] p-3.5">
            <div class="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center mb-2.5">
              <svg class="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </div>
            <h3 class="text-xs font-semibold text-white mb-0.5">배터리 전주기 관리</h3>
            <p class="text-[10px] text-emerald-200/40 leading-relaxed">제조부터 폐기까지 추적</p>
          </div>
        </div>

        <!-- Org badges -->
        <div class="mt-6 flex items-center gap-2 flex-wrap">
          <span class="text-[10px] text-emerald-300/30 uppercase tracking-widest mr-1">참여 조직</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-300/60 border border-emerald-500/20">제조사</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/15 text-purple-300/60 border border-purple-500/20">EV제조사</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/15 text-amber-300/60 border border-amber-500/20">정비/분석</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-teal-500/15 text-teal-300/60 border border-teal-500/20">검증기관</span>
        </div>
      </div>

      <!-- ===== RIGHT: Login Form ===== -->
      <div class="w-full lg:w-[400px] flex-shrink-0">
        <div class="w-full">
          <!-- Mobile logo (hidden on desktop) -->
          <div class="text-center mb-8 lg:hidden">
            <div class="inline-flex items-center justify-center w-14 h-14 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 mb-4 shadow-lg shadow-emerald-900/30">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="6" y="2" width="12" height="20" rx="2" ry="2"/>
                <line x1="6" y1="6" x2="18" y2="6"/>
                <line x1="6" y1="18" x2="18" y2="18"/>
                <path d="M12 9v6"/><path d="M9 12h6"/>
              </svg>
            </div>
            <h1 class="text-2xl font-bold text-white tracking-tight">Battery Passport</h1>
            <p class="text-emerald-300/70 text-sm mt-1">GBA 21 Platform</p>
          </div>

          <!-- Login Card -->
          <div class="bg-white/[0.07] backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl shadow-black/30 overflow-hidden">
            <!-- Tab Toggle -->
            <div class="flex m-5 mb-0 bg-white/5 rounded-xl p-1 border border-white/10">
              <button
                @click="switchTab('login')"
                :class="['flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200',
                  activeTab === 'login'
                    ? 'bg-white/15 text-white shadow-sm border border-white/10'
                    : 'text-emerald-200/60 hover:text-white/80']">
                <span class="inline-flex items-center justify-center gap-1.5">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/>
                    <polyline points="10 17 15 12 10 7"/>
                    <line x1="15" y1="12" x2="3" y2="12"/>
                  </svg>
                  <span>로그인</span>
                </span>
              </button>
              <button
                @click="switchTab('register')"
                :class="['flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200',
                  activeTab === 'register'
                    ? 'bg-white/15 text-white shadow-sm border border-white/10'
                    : 'text-emerald-200/60 hover:text-white/80']">
                <span class="inline-flex items-center justify-center gap-1.5">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/>
                    <circle cx="8.5" cy="7" r="4"/>
                    <line x1="20" y1="8" x2="20" y2="14"/>
                    <line x1="23" y1="11" x2="17" y2="11"/>
                  </svg>
                  <span>회원가입</span>
                </span>
              </button>
            </div>

            <!-- Form -->
            <div class="p-5 pt-5">
              <!-- Header -->
              <div class="mb-5">
                <h2 class="text-lg font-bold text-white">
                  {{ activeTab === 'login' ? '계정에 로그인' : '새 계정 등록' }}
                </h2>
                <p class="mt-0.5 text-sm text-emerald-200/50">
                  {{ activeTab === 'login' ? '배터리 여권 플랫폼에 접속합니다.' : '조직 정보와 함께 계정을 생성합니다.' }}
                </p>
              </div>

              <!-- Error -->
              <div v-if="errorMsg" class="mb-4 flex items-start gap-2 bg-red-500/15 border border-red-400/30 text-red-300 px-4 py-3 rounded-xl text-sm">
                <svg class="flex-shrink-0 w-5 h-5 text-red-400 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                <span>{{ errorMsg }}</span>
              </div>

              <form @submit.prevent="handleSubmit" class="space-y-4">
                <!-- User ID -->
                <div>
                  <label class="block text-sm font-medium text-emerald-100/70 mb-1.5">사용자 ID</label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                    </div>
                    <input v-model="userId" type="text" placeholder="아이디를 입력하세요"
                      class="w-full pl-10 pr-4 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400/50 outline-none transition text-sm" />
                  </div>
                </div>

                <!-- Password -->
                <div>
                  <label class="block text-sm font-medium text-emerald-100/70 mb-1.5">비밀번호</label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0110 0v4"/>
                      </svg>
                    </div>
                    <input v-model="password" type="password" placeholder="비밀번호를 입력하세요"
                      class="w-full pl-10 pr-4 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400/50 outline-none transition text-sm" />
                  </div>
                </div>

                <!-- Org Select -->
                <div>
                  <label class="block text-sm font-medium text-emerald-100/70 mb-1.5">소속 기관</label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                        <polyline points="9 22 9 12 15 12 15 22"/>
                      </svg>
                    </div>
                    <select v-model="orgNum"
                      class="w-full pl-10 pr-8 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400/50 outline-none transition text-sm appearance-none cursor-pointer">
                      <option v-for="opt in orgOptions" :key="opt.value" :value="opt.value" class="bg-slate-800 text-white">{{ opt.label }}</option>
                    </select>
                    <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </div>
                  </div>
                </div>

                <!-- Submit -->
                <button type="submit" :disabled="loading"
                  :class="['w-full py-3 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 mt-2',
                    loading
                      ? 'bg-emerald-500/40 cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 hover:shadow-lg hover:shadow-emerald-500/25 active:scale-[0.98]']">
                  <span v-if="loading" class="inline-flex items-center">
                    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    처리중...
                  </span>
                  <span v-else>{{ activeTab === 'login' ? '로그인' : '계정 등록' }}</span>
                </button>
              </form>
            </div>
          </div>

          <!-- Footer -->
          <div class="mt-6 flex items-center justify-between text-[10px] text-emerald-300/25">
            <span>Hyperledger Fabric + Aries</span>
            <span>v2.0</span>
          </div>
        </div>
      </div>

      </div><!-- /Centered container -->
    </div>
  `
});
