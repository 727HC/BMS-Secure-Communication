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
    <div class="min-h-screen" style="background: #0f172a; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;">

      <!-- Background decorative elements -->
      <div style="position: absolute; top: -20%; right: -10%; width: 600px; height: 600px; border-radius: 50%; background: radial-gradient(circle, rgba(22,163,74,0.08) 0%, transparent 70%); pointer-events: none;"></div>
      <div style="position: absolute; bottom: -15%; left: -5%; width: 400px; height: 400px; border-radius: 50%; background: radial-gradient(circle, rgba(37,99,235,0.06) 0%, transparent 70%); pointer-events: none;"></div>

      <!-- Main content -->
      <div style="position: relative; z-index: 1; width: 100%; max-width: 960px; display: grid; grid-template-columns: 1fr 400px; gap: 0; margin: 2rem;" class="sn-mobile-stack">

        <!-- LEFT: Branding -->
        <div class="hidden lg:flex flex-col justify-between" style="padding: 3rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.625rem; margin-bottom: 3rem;">
              <div style="width: 36px; height: 36px; border-radius: 10px; background: #16a34a; display: flex; align-items: center; justify-content: center;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><rect x="2" y="7" width="16" height="11" rx="2"/><path d="M18 10h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-2"/><line x1="7" y1="11" x2="7" y2="14"/><line x1="11" y1="10" x2="11" y2="15"/></svg>
              </div>
              <span style="font-family: var(--font-display); font-weight: 600; font-size: 1.125rem; color: #fff; letter-spacing: -0.02em;">BatteryPass</span>
            </div>
            <h1 style="font-family: var(--font-display); font-size: 2.5rem; font-weight: 700; color: #fff; letter-spacing: -0.04em; line-height: 1.1; margin-bottom: 1.25rem;">
              배터리 전주기<br/>추적 · 인증
            </h1>
            <p style="font-size: 0.9375rem; color: rgba(255,255,255,0.45); line-height: 1.8;">
              EU 신배터리법 GBA-21 규격 기반<br/>
              블록체인 인증 배터리 여권 시스템
            </p>

            <!-- Lifecycle visual -->
            <div style="display: flex; align-items: center; gap: 0; margin-top: 2.5rem;">
              <div v-for="(step, i) in [{n:'제조',c:'#60a5fa'},{n:'운행',c:'#4ade80'},{n:'정비',c:'#fbbf24'},{n:'재활용',c:'#f97316'}]" :key="i"
                style="display: flex; align-items: center;">
                <div style="display: flex; flex-direction: column; align-items: center; gap: 0.375rem;">
                  <div style="width: 10px; height: 10px; border-radius: 50%;" :style="{ background: step.c }"></div>
                  <span style="font-size: 0.625rem; color: rgba(255,255,255,0.35); letter-spacing: 0.1em; text-transform: uppercase;">{{ step.n }}</span>
                </div>
                <div v-if="i < 3" style="width: 40px; height: 1px; background: rgba(255,255,255,0.1); margin: 0 0.5rem; margin-bottom: 1rem;"></div>
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 1.25rem;">
            <span v-for="t in ['Hyperledger Fabric', 'Aries DID', 'GBA-21']" :key="t" style="font-size: 0.625rem; color: rgba(255,255,255,0.2); letter-spacing: 0.1em; text-transform: uppercase;">{{ t }}</span>
          </div>
        </div>

        <!-- RIGHT: Form card -->
        <div style="background: #fff; border-radius: 1rem; padding: 2.5rem; box-shadow: 0 25px 60px rgba(0,0,0,0.3);">

          <!-- Mobile logo -->
          <div class="lg:hidden flex items-center gap-2 mb-6">
            <div style="width: 28px; height: 28px; border-radius: 7px; background: #16a34a; display: flex; align-items: center; justify-content: center;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><rect x="2" y="7" width="16" height="11" rx="2"/><path d="M18 10h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-2"/></svg>
            </div>
            <span style="font-family: var(--font-display); font-weight: 600; font-size: 1rem; color: #171717;">BatteryPass</span>
          </div>

          <!-- Tabs -->
          <div style="display: flex; gap: 0; margin-bottom: 1.5rem; background: #f5f5f4; border-radius: 8px; padding: 3px;">
            <button @click="switchTab('login')" type="button"
              style="flex: 1; padding: 0.5rem; font-size: 0.8125rem; font-weight: 600; border: none; cursor: pointer; border-radius: 6px; transition: all 0.3s cubic-bezier(0.16,1,0.3,1);"
              :style="activeTab === 'login' ? 'background: #fff; color: #171717; box-shadow: 0 1px 3px rgba(0,0,0,0.08);' : 'background: transparent; color: #a3a3a3;'">
              로그인
            </button>
            <button @click="switchTab('register')" type="button"
              style="flex: 1; padding: 0.5rem; font-size: 0.8125rem; font-weight: 600; border: none; cursor: pointer; border-radius: 6px; transition: all 0.3s cubic-bezier(0.16,1,0.3,1);"
              :style="activeTab === 'register' ? 'background: #fff; color: #171717; box-shadow: 0 1px 3px rgba(0,0,0,0.08);' : 'background: transparent; color: #a3a3a3;'">
              회원가입
            </button>
          </div>

          <!-- Error -->
          <div v-if="errorMsg" style="margin-bottom: 1rem; padding: 0.625rem 0.75rem; font-size: 0.8125rem; background: #fef2f2; color: #dc2626; border-radius: 8px;">
            {{ errorMsg }}
          </div>

          <form @submit.prevent="handleSubmit">

            <!-- Org selector -->
            <div style="margin-bottom: 1.25rem;">
              <label style="display: block; font-size: 0.75rem; font-weight: 600; color: #525252; margin-bottom: 0.5rem;">조직 선택</label>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                <button v-for="org in orgOptions" :key="org.value" type="button"
                  @click="orgNum = org.value"
                  style="padding: 0.5rem; font-size: 0.8125rem; font-weight: 500; border: none; cursor: pointer; border-radius: 8px; transition: all 0.3s cubic-bezier(0.16,1,0.3,1);"
                  :style="orgNum === org.value
                    ? 'background: #0f172a; color: #fff;'
                    : 'background: #f5f5f4; color: #525252;'">
                  {{ org.short }}
                </button>
              </div>
              <select v-model="orgNum" class="sr-only" aria-hidden="true" tabindex="-1">
                <option v-for="opt in orgOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>

            <!-- ID -->
            <div style="margin-bottom: 0.875rem;">
              <label style="display: block; font-size: 0.75rem; font-weight: 600; color: #525252; margin-bottom: 0.375rem;">사용자 ID</label>
              <input v-model="userId" type="text" placeholder="아이디를 입력하세요" class="sn-input" />
            </div>

            <!-- Password -->
            <div style="margin-bottom: 1.5rem;">
              <label style="display: block; font-size: 0.75rem; font-weight: 600; color: #525252; margin-bottom: 0.375rem;">비밀번호</label>
              <input v-model="password" type="password" placeholder="비밀번호를 입력하세요" class="sn-input" />
            </div>

            <!-- Submit -->
            <button type="submit" :disabled="loading"
              style="width: 100%; padding: 0.75rem; background: #16a34a; color: #fff; border: none; border-radius: 10px; font-size: 0.9375rem; font-weight: 600; cursor: pointer; transition: all 0.3s cubic-bezier(0.16,1,0.3,1); display: flex; align-items: center; justify-content: center; gap: 0.5rem;"
              :style="loading ? 'opacity: 0.5; cursor: not-allowed;' : ''"
              @mouseenter="!loading && ($event.target.style.background='#15803d')"
              @mouseleave="!loading && ($event.target.style.background='#16a34a')">
              <svg v-if="loading" class="animate-spin" style="width:16px;height:16px;" fill="none" viewBox="0 0 24 24">
                <circle style="opacity:0.25;" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path style="opacity:0.75;" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              {{ loading ? '처리 중...' : (activeTab === 'login' ? '로그인' : '계정 등록') }}
            </button>
          </form>
        </div>
      </div>
    </div>
  `
});
