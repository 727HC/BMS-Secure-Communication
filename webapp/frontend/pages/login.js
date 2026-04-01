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
    <div class="min-h-screen flex">

      <!-- ═══ LEFT — Brand Hero ═══ -->
      <div class="hidden lg:flex flex-1 flex-col justify-between p-12 relative overflow-hidden"
           style="background: linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%);">

        <!-- Top: Logo -->
        <div class="relative z-10">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="6" y="2" width="12" height="20" rx="2"/><line x1="6" y1="6" x2="18" y2="6"/><line x1="6" y1="18" x2="18" y2="18"/>
                <path d="M12 9v6"/><path d="M9 12h6"/>
              </svg>
            </div>
            <span class="text-white/80 text-sm font-semibold tracking-wide">BATTERY PASSPORT</span>
          </div>
        </div>

        <!-- Center: Main message -->
        <div class="relative z-10 max-w-lg">
          <h1 class="text-white text-5xl font-extrabold leading-tight tracking-tight" style="font-family: var(--font-display);">
            배터리 여권<br/>관리 플랫폼
          </h1>
          <p class="text-white/70 text-lg mt-4 leading-relaxed" style="font-family: var(--font-body);">
            GBA 21 규격 기반 배터리 전주기 관리.<br/>
            블록체인과 DID 기술로 신뢰할 수 있는 이력을 제공합니다.
          </p>

          <!-- Lifecycle steps -->
          <div class="flex items-center gap-3 mt-10">
            <div v-for="(step, i) in [{label:'제조', emoji:'⚙️'}, {label:'운행', emoji:'🚗'}, {label:'정비', emoji:'🔧'}, {label:'재활용', emoji:'♻️'}]" :key="i"
                 class="flex items-center gap-3">
              <div class="flex flex-col items-center">
                <div class="w-12 h-12 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center text-xl">
                  {{ step.emoji }}
                </div>
                <span class="text-white/60 text-xs mt-1.5 font-medium">{{ step.label }}</span>
              </div>
              <svg v-if="i < 3" class="w-4 h-4 text-white/30 mb-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </div>
        </div>

        <!-- Bottom: Tech stack -->
        <div class="relative z-10 flex items-center gap-3">
          <span v-for="t in ['Hyperledger Fabric', 'Aries DID', 'Ed25519']" :key="t"
                class="px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-lg text-white/60 text-xs font-medium">{{ t }}</span>
        </div>

        <!-- Background pattern (subtle circles) -->
        <div class="absolute inset-0 pointer-events-none opacity-[0.07]">
          <div class="absolute top-20 right-20 w-80 h-80 border border-white rounded-full"></div>
          <div class="absolute top-40 right-40 w-60 h-60 border border-white rounded-full"></div>
          <div class="absolute -bottom-20 -left-20 w-96 h-96 border border-white rounded-full"></div>
        </div>
      </div>

      <!-- ═══ RIGHT — Auth Form ═══ -->
      <div class="w-full lg:w-[520px] flex-shrink-0 flex items-center justify-center p-8 lg:p-12 bg-white">
        <div class="w-full max-w-sm">

          <!-- Mobile logo -->
          <div class="lg:hidden text-center mb-8">
            <div class="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="6" y="2" width="12" height="20" rx="2"/><line x1="6" y1="6" x2="18" y2="6"/></svg>
            </div>
            <h2 class="text-xl font-bold text-gray-900">배터리 여권 플랫폼</h2>
          </div>

          <!-- Tab toggle -->
          <div class="flex bg-gray-100 rounded-xl p-1 mb-8">
            <button @click="switchTab('login')"
              :class="['flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all',
                activeTab === 'login' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700']">
              로그인
            </button>
            <button @click="switchTab('register')"
              :class="['flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all',
                activeTab === 'register' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700']">
              회원가입
            </button>
          </div>

          <!-- Header -->
          <div class="mb-6">
            <h2 class="text-2xl font-bold text-gray-900" style="font-family: var(--font-display);">
              {{ activeTab === 'login' ? '로그인' : '계정 등록' }}
            </h2>
            <p class="text-gray-500 text-sm mt-1">
              {{ activeTab === 'login' ? '소속 기관을 선택하고 로그인하세요.' : '조직 정보와 함께 계정을 생성합니다.' }}
            </p>
          </div>

          <!-- Error -->
          <div v-if="errorMsg" class="mb-5 flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            <span>{{ errorMsg }}</span>
          </div>

          <form @submit.prevent="handleSubmit" class="space-y-5">

            <!-- Org selection (2x2 grid) -->
            <div>
              <label class="block text-sm font-semibold text-gray-900 mb-2">소속 기관</label>
              <div class="grid grid-cols-2 gap-2">
                <button v-for="org in orgOptions" :key="org.value" type="button"
                  @click="orgNum = org.value"
                  class="relative text-left p-3.5 rounded-xl border-2 transition-all"
                  :style="orgNum === org.value
                    ? 'border-color: ' + org.color + '; background: ' + org.color + '08;'
                    : 'border-color: #e5e7eb; background: white;'"
                  @mouseenter="orgNum !== org.value && ($event.currentTarget.style.borderColor = '#d1d5db')"
                  @mouseleave="orgNum !== org.value && ($event.currentTarget.style.borderColor = '#e5e7eb')">
                  <!-- Check -->
                  <div v-if="orgNum === org.value" class="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center" :style="'background:' + org.color">
                    <svg class="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <!-- Icon -->
                  <div class="w-9 h-9 rounded-lg flex items-center justify-center mb-2" :style="'background: ' + org.color + '12;'">
                    <svg v-if="org.icon==='factory'" class="w-4.5 h-4.5" :style="'color:'+org.color" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20h20"/><path d="M5 20V8l5 4V8l5 4V4h3v16"/></svg>
                    <svg v-else-if="org.icon==='car'" class="w-4.5 h-4.5" :style="'color:'+org.color" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 17h2m10 0h2M3 11l1.5-5h15L21 11"/><rect x="2" y="11" width="20" height="8" rx="2"/></svg>
                    <svg v-else-if="org.icon==='wrench'" class="w-4.5 h-4.5" :style="'color:'+org.color" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
                    <svg v-else class="w-4.5 h-4.5" :style="'color:'+org.color" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  </div>
                  <div class="text-sm font-semibold" :style="orgNum === org.value ? 'color:' + org.color : 'color: #111827'">{{ org.short }}</div>
                  <div class="text-xs text-gray-400 mt-0.5 leading-snug">{{ org.desc }}</div>
                </button>
              </div>
              <select v-model="orgNum" class="sr-only" aria-hidden="true" tabindex="-1">
                <option v-for="opt in orgOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>

            <!-- User ID -->
            <div>
              <label class="block text-sm font-semibold text-gray-900 mb-1.5">사용자 ID</label>
              <input v-model="userId" type="text" placeholder="아이디를 입력하세요"
                class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-[15px] placeholder-gray-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition" />
            </div>

            <!-- Password -->
            <div>
              <label class="block text-sm font-semibold text-gray-900 mb-1.5">비밀번호</label>
              <input v-model="password" type="password" placeholder="비밀번호를 입력하세요"
                class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-[15px] placeholder-gray-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition" />
            </div>

            <!-- Submit -->
            <button type="submit" :disabled="loading"
              :class="['w-full py-3.5 rounded-xl text-[15px] font-semibold text-white transition-all',
                loading ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] shadow-lg shadow-emerald-600/20']">
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
          <div class="mt-8 pt-6 border-t border-gray-100 text-center">
            <p class="text-xs text-gray-400">Hyperledger Fabric · Aries DID · Ed25519</p>
          </div>
        </div>
      </div>
    </div>
  `
});
