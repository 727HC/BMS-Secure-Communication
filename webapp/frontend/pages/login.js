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
    <div class="min-h-[80vh] flex items-center justify-center">
      <div class="w-full max-w-md">
        <!-- Logo / Title -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-gray-900">Battery Passport</h1>
          <p class="mt-2 text-gray-500">배터리 여권 플랫폼</p>
        </div>

        <!-- Card -->
        <div class="bg-white rounded-xl shadow-lg overflow-hidden">
          <!-- Tabs -->
          <div class="flex border-b border-gray-200">
            <button
              @click="switchTab('login')"
              :class="['flex-1 py-3.5 text-sm font-semibold transition-colors',
                activeTab === 'login'
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50']">
              로그인
            </button>
            <button
              @click="switchTab('register')"
              :class="['flex-1 py-3.5 text-sm font-semibold transition-colors',
                activeTab === 'register'
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50']">
              회원가입
            </button>
          </div>

          <!-- Form -->
          <form @submit.prevent="handleSubmit" class="p-6 space-y-5">
            <!-- Error -->
            <div v-if="errorMsg" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {{ errorMsg }}
            </div>

            <!-- User ID -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">사용자 ID</label>
              <input v-model="userId" type="text" placeholder="아이디를 입력하세요"
                class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition" />
            </div>

            <!-- Password -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
              <input v-model="password" type="password" placeholder="비밀번호를 입력하세요"
                class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition" />
            </div>

            <!-- Org Select -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">소속 기관</label>
              <select v-model="orgNum"
                class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition bg-white">
                <option v-for="opt in orgOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>

            <!-- Submit -->
            <button type="submit" :disabled="loading"
              :class="['w-full py-2.5 rounded-lg font-semibold text-white transition-colors',
                loading ? 'bg-primary-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700']">
              <span v-if="loading" class="inline-flex items-center">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                처리중...
              </span>
              <span v-else>{{ activeTab === 'login' ? '로그인' : '회원가입' }}</span>
            </button>
          </form>
        </div>

        <p class="mt-6 text-center text-xs text-gray-400">xEV BMS Security Platform &copy; 2026</p>
      </div>
    </div>
  `
});
