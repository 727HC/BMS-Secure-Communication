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
    <div class="min-h-screen flex" style="background: #fff;">

      <!-- LEFT: Branding strip -->
      <div class="hidden lg:flex flex-col justify-between" style="width: 400px; background: var(--color-primary); padding: 3rem; color: #fff;">
        <div>
          <div class="flex items-center gap-2 mb-12">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: var(--color-accent); display: flex; align-items: center; justify-content: center;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><rect x="2" y="7" width="16" height="11" rx="2"/><path d="M18 10h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-2"/><line x1="7" y1="11" x2="7" y2="14"/><line x1="11" y1="10" x2="11" y2="15"/></svg>
            </div>
            <span style="font-family: var(--font-display); font-weight: 600; font-size: 1rem; letter-spacing: -0.02em;">BatteryPass</span>
          </div>
          <h1 style="font-family: var(--font-display); font-size: 2.25rem; font-weight: 600; letter-spacing: -0.04em; line-height: 1.15; margin-bottom: 1rem;">배터리 전주기<br/>추적 플랫폼</h1>
          <p style="font-size: 0.875rem; color: rgba(255,255,255,0.6); line-height: 1.7;">EU 신배터리법 GBA-21 규격 기반<br/>블록체인 인증 시스템</p>
        </div>
        <div style="display: flex; gap: 1.5rem;">
          <span v-for="s in ['제조','운행','정비','재활용']" :key="s" style="font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.15em; color: rgba(255,255,255,0.3);">{{ s }}</span>
        </div>
      </div>

      <!-- RIGHT: Form -->
      <div class="flex-1 flex items-center justify-center px-6 py-12" style="background: var(--color-surface);">
        <div style="width: 100%; max-width: 380px;">

          <!-- Mobile logo -->
          <div class="lg:hidden flex items-center gap-2 mb-8">
            <div style="width: 28px; height: 28px; border-radius: 6px; background: var(--color-accent); display: flex; align-items: center; justify-content: center;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><rect x="2" y="7" width="16" height="11" rx="2"/><path d="M18 10h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-2"/></svg>
            </div>
            <span class="sn-heading" style="font-size: 1rem;">BatteryPass</span>
          </div>

          <!-- Tabs -->
          <div class="flex gap-6 mb-6" style="border-bottom: 1px solid var(--color-border);">
            <button @click="switchTab('login')" type="button"
              style="padding-bottom: 0.75rem; font-size: 0.9375rem; font-weight: 600; background: none; border: none; cursor: pointer; position: relative;"
              :style="activeTab === 'login' ? 'color: var(--color-text-1);' : 'color: var(--color-text-3);'">
              로그인
              <span v-if="activeTab === 'login'" style="position: absolute; bottom: -1px; left: 0; right: 0; height: 2px; background: var(--color-text-1);"></span>
            </button>
            <button @click="switchTab('register')" type="button"
              style="padding-bottom: 0.75rem; font-size: 0.9375rem; font-weight: 600; background: none; border: none; cursor: pointer; position: relative;"
              :style="activeTab === 'register' ? 'color: var(--color-text-1);' : 'color: var(--color-text-3);'">
              회원가입
              <span v-if="activeTab === 'register'" style="position: absolute; bottom: -1px; left: 0; right: 0; height: 2px; background: var(--color-text-1);"></span>
            </button>
          </div>

          <!-- Error -->
          <div v-if="errorMsg" class="mb-4 text-sm" style="padding: 0.625rem 0.75rem; background: #fef2f2; color: #dc2626; border-radius: 6px;">
            {{ errorMsg }}
          </div>

          <form @submit.prevent="handleSubmit">

            <!-- Org -->
            <div style="margin-bottom: 1.25rem;">
              <label class="sn-eyebrow block mb-2">조직</label>
              <div class="grid grid-cols-2 gap-2">
                <button v-for="org in orgOptions" :key="org.value" type="button"
                  @click="orgNum = org.value" class="sn-btn" style="font-size: 0.8125rem;"
                  :style="orgNum === org.value
                    ? 'background: var(--color-primary); color: #fff; box-shadow: none;'
                    : 'background: #fff; color: var(--color-text-2); box-shadow: inset 0 0 0 1px var(--color-border);'">
                  {{ org.short }}
                </button>
              </div>
              <select v-model="orgNum" class="sr-only" aria-hidden="true" tabindex="-1">
                <option v-for="opt in orgOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>

            <!-- ID -->
            <div style="margin-bottom: 1rem;">
              <label class="sn-eyebrow block mb-1">사용자 ID</label>
              <input v-model="userId" type="text" placeholder="아이디" class="sn-input" />
            </div>

            <!-- Password -->
            <div style="margin-bottom: 1.5rem;">
              <label class="sn-eyebrow block mb-1">비밀번호</label>
              <input v-model="password" type="password" placeholder="비밀번호" class="sn-input" />
            </div>

            <!-- Submit -->
            <button type="submit" :disabled="loading" class="sn-btn sn-btn-primary" style="width: 100%;"
              :style="loading ? 'opacity: 0.5; cursor: not-allowed;' : ''">
              <svg v-if="loading" class="animate-spin" style="width:16px;height:16px;" fill="none" viewBox="0 0 24 24">
                <circle style="opacity:0.25;" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path style="opacity:0.75;" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              {{ loading ? '처리 중...' : (activeTab === 'login' ? '로그인' : '계정 등록') }}
            </button>
          </form>

          <p class="sn-eyebrow text-center mt-8">GBA-21 · Hyperledger Fabric · Blockchain</p>
        </div>
      </div>
    </div>
  `
});
