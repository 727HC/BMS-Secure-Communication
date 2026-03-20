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
         style="background: linear-gradient(135deg, #f0f7ff 0%, #e8f4f8 50%, #f0fdf4 100%);">
      <!-- Subtle grid pattern overlay -->
      <div class="fixed inset-0 opacity-[0.03] pointer-events-none"
           style="background-image: url('data:image/svg+xml,%3Csvg width=&quot;40&quot; height=&quot;40&quot; xmlns=&quot;http://www.w3.org/2000/svg&quot;%3E%3Cpath d=&quot;M0 0h40v40H0z&quot; fill=&quot;none&quot;/%3E%3Cpath d=&quot;M0 0h1v40H0zM40 0h1v40h-1zM0 0v1h40V0zM0 40v1h40v-1z&quot; fill=&quot;%231e3a8a&quot;/%3E%3C/svg%3E');"></div>

      <div class="relative z-10 w-full max-w-5xl">
        <div class="flex flex-col lg:flex-row bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">

          <!-- Left: Branding Panel -->
          <div class="lg:w-5/12 bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 p-8 lg:p-10 text-white flex flex-col justify-center relative overflow-hidden">
            <!-- Decorative circles -->
            <div class="absolute -top-20 -right-20 w-64 h-64 bg-primary-600 rounded-full opacity-20"></div>
            <div class="absolute -bottom-16 -left-16 w-48 h-48 bg-primary-600 rounded-full opacity-15"></div>

            <div class="relative z-10">
              <!-- Icon -->
              <div class="mb-6">
                <div class="w-16 h-16 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center border border-white/20">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="6" y="2" width="12" height="20" rx="2" ry="2"/>
                    <line x1="6" y1="6" x2="18" y2="6"/>
                    <line x1="6" y1="18" x2="18" y2="18"/>
                    <path d="M10 2v4"/>
                    <path d="M14 2v4"/>
                    <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" opacity="0.3"/>
                    <path d="M12 10v4" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M10 12h4" stroke="currentColor" stroke-width="1.5"/>
                  </svg>
                </div>
              </div>

              <!-- Title -->
              <h1 class="text-2xl lg:text-3xl font-bold leading-tight mb-2">
                Battery Passport<br/>Platform
              </h1>
              <p class="text-primary-200 text-sm font-medium tracking-wide mb-8">
                GBA 21 규격 | xEV BMS 보안 플랫폼
              </p>

              <!-- Feature list -->
              <div class="space-y-4">
                <div class="flex items-start space-x-3">
                  <div class="flex-shrink-0 w-6 h-6 rounded-full bg-green-400/20 flex items-center justify-center mt-0.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-white">블록체인 기반 배터리 전주기 관리</p>
                    <p class="text-xs text-primary-300 mt-0.5">Hyperledger Fabric 분산원장</p>
                  </div>
                </div>
                <div class="flex items-start space-x-3">
                  <div class="flex-shrink-0 w-6 h-6 rounded-full bg-green-400/20 flex items-center justify-center mt-0.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-white">Ed25519 DID 서명 검증</p>
                    <p class="text-xs text-primary-300 mt-0.5">ACA-Py 기반 자기주권 신원</p>
                  </div>
                </div>
                <div class="flex items-start space-x-3">
                  <div class="flex-shrink-0 w-6 h-6 rounded-full bg-green-400/20 flex items-center justify-center mt-0.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-white">4개 조직 역할 기반 접근제어</p>
                    <p class="text-xs text-primary-300 mt-0.5">MSP 기반 RBAC 권한 관리</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Login / Register Form -->
          <div class="lg:w-7/12 p-8 lg:p-10 flex flex-col justify-center">
            <!-- Tab Toggle -->
            <div class="flex mb-8 bg-gray-100 rounded-lg p-1">
              <button
                @click="switchTab('login')"
                :class="['flex-1 py-2.5 text-sm font-semibold rounded-md transition-all duration-200',
                  activeTab === 'login'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700']">
                <span class="inline-flex items-center justify-center space-x-1.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/>
                    <polyline points="10 17 15 12 10 7"/>
                    <line x1="15" y1="12" x2="3" y2="12"/>
                  </svg>
                  <span>로그인</span>
                </span>
              </button>
              <button
                @click="switchTab('register')"
                :class="['flex-1 py-2.5 text-sm font-semibold rounded-md transition-all duration-200',
                  activeTab === 'register'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700']">
                <span class="inline-flex items-center justify-center space-x-1.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/>
                    <circle cx="8.5" cy="7" r="4"/>
                    <line x1="20" y1="8" x2="20" y2="14"/>
                    <line x1="23" y1="11" x2="17" y2="11"/>
                  </svg>
                  <span>회원가입</span>
                </span>
              </button>
            </div>

            <!-- Form Header -->
            <div class="mb-6">
              <h2 class="text-xl font-bold text-gray-900">
                {{ activeTab === 'login' ? '계정에 로그인' : '새 계정 등록' }}
              </h2>
              <p class="mt-1 text-sm text-gray-500">
                {{ activeTab === 'login' ? '배터리 여권 플랫폼에 접속합니다.' : '조직 정보와 함께 계정을 생성합니다.' }}
              </p>
            </div>

            <!-- Error -->
            <div v-if="errorMsg" class="mb-5 flex items-start space-x-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              <svg class="flex-shrink-0 w-5 h-5 text-red-400 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              <span>{{ errorMsg }}</span>
            </div>

            <!-- Form -->
            <form @submit.prevent="handleSubmit" class="space-y-5">
              <!-- User ID -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">사용자 ID</label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                  <input v-model="userId" type="text" placeholder="아이디를 입력하세요"
                    class="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition text-sm" />
                </div>
              </div>

              <!-- Password -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">비밀번호</label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                  </div>
                  <input v-model="password" type="password" placeholder="비밀번호를 입력하세요"
                    class="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition text-sm" />
                </div>
              </div>

              <!-- Org Select -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">소속 기관</label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                      <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                  </div>
                  <select v-model="orgNum"
                    class="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition bg-white text-sm appearance-none cursor-pointer">
                    <option v-for="opt in orgOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                  <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                </div>
              </div>

              <!-- Submit -->
              <button type="submit" :disabled="loading"
                :class="['w-full py-3 rounded-lg font-semibold text-white transition-all duration-200 flex items-center justify-center space-x-2',
                  loading ? 'bg-primary-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700 hover:shadow-lg hover:shadow-primary-600/25 active:scale-[0.98]']">
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

            <!-- Footer -->
            <div class="mt-8 pt-6 border-t border-gray-100">
              <div class="flex items-center justify-between text-xs text-gray-400">
                <span>xEV BMS Security Platform</span>
                <span>&copy; 2026</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
});
