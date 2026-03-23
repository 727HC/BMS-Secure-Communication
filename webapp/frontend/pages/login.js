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
    <div class="min-h-screen flex items-center justify-center px-4 py-12"
         style="background: linear-gradient(135deg, #0f172a 0%, #14432a 50%, #065f46 100%);">
      <!-- Grid overlay -->
      <div class="fixed inset-0 opacity-[0.04] pointer-events-none"
           style="background-image: url('data:image/svg+xml,%3Csvg width=&quot;60&quot; height=&quot;60&quot; xmlns=&quot;http://www.w3.org/2000/svg&quot;%3E%3Cpath d=&quot;M0 0h60v60H0z&quot; fill=&quot;none&quot;/%3E%3Cpath d=&quot;M0 0h1v60H0zM60 0h1v60h-1zM0 0v1h60V0zM0 60v1h60v-1z&quot; fill=&quot;%236ee7b7&quot;/%3E%3C/svg%3E');"></div>

      <!-- Floating ambient shapes -->
      <div class="fixed top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="fixed bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div class="relative z-10 w-full max-w-md">
        <!-- Logo & Branding -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 mb-5 shadow-lg shadow-emerald-900/30">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="6" y="2" width="12" height="20" rx="2" ry="2"/>
              <line x1="6" y1="6" x2="18" y2="6"/>
              <line x1="6" y1="18" x2="18" y2="18"/>
              <path d="M10 2v4"/>
              <path d="M14 2v4"/>
              <rect x="9" y="9" width="6" height="6" rx="1" fill="white" opacity="0.2"/>
              <path d="M12 10v4" stroke="white" stroke-width="1.5"/>
              <path d="M10 12h4" stroke="white" stroke-width="1.5"/>
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-white tracking-tight">Battery Passport</h1>
          <p class="text-emerald-300/80 text-sm font-medium mt-1 tracking-wider">GBA 21 Platform</p>
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
        <div class="mt-6 text-center">
          <p class="text-xs text-emerald-300/30">Battery Passport Platform v2.0</p>
        </div>
      </div>
    </div>
  `
});
