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
    <div class="min-h-screen flex items-center justify-center py-12 px-4" style="background: var(--color-surface);">

      <div style="width: 100%; max-width: 420px;">

        <!-- LOGO -->
        <div class="flex flex-col items-center mb-8">
          <div class="flex items-center gap-3 mb-3">
            <div class="flex items-center justify-center" style="width: 40px; height: 40px; border-radius: 10px; background: var(--color-accent);">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="7" width="16" height="11" rx="2"/>
                <path d="M18 10h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-2"/>
                <line x1="7" y1="11" x2="7" y2="14"/>
                <line x1="11" y1="10" x2="11" y2="15"/>
              </svg>
            </div>
            <span class="sn-display" style="font-size: 1.375rem;">BatteryPass</span>
          </div>
          <span class="sn-eyebrow">배터리 전주기 추적 플랫폼</span>
        </div>

        <!-- DOUBLE-BEZEL CARD -->
        <div class="sn-card">
          <div class="sn-card-inner" style="padding: 1.75rem;">

            <!-- TAB SWITCHER -->
            <div class="flex mb-6" style="border-bottom: 2px solid rgba(0,0,0,0.04);">
              <button @click="switchTab('login')"
                class="pb-3 mr-6 text-sm font-semibold relative"
                style="background: none; border: none; cursor: pointer;"
                :style="activeTab === 'login' ? 'color: var(--color-text-1);' : 'color: var(--color-text-3);'">
                로그인
                <span v-if="activeTab === 'login'" class="absolute bottom-0 left-0 right-0" style="height: 2px; background: var(--color-text-1); margin-bottom: -2px;"></span>
              </button>
              <button @click="switchTab('register')"
                class="pb-3 text-sm font-semibold relative"
                style="background: none; border: none; cursor: pointer;"
                :style="activeTab === 'register' ? 'color: var(--color-text-1);' : 'color: var(--color-text-3);'">
                회원가입
                <span v-if="activeTab === 'register'" class="absolute bottom-0 left-0 right-0" style="height: 2px; background: var(--color-text-1); margin-bottom: -2px;"></span>
              </button>
            </div>

            <!-- ERROR -->
            <div v-if="errorMsg" class="mb-4 px-3 py-2.5 rounded-lg text-sm" style="background: #fef2f2; border: 1px solid #fecaca; color: #dc2626;">
              {{ errorMsg }}
            </div>

            <form @submit.prevent="handleSubmit">

              <!-- ORG SELECTOR -->
              <div class="mb-5">
                <p class="sn-eyebrow mb-2">조직 선택</p>
                <div class="grid grid-cols-2 gap-2">
                  <button v-for="org in orgOptions" :key="org.value" type="button"
                    @click="orgNum = org.value"
                    class="sn-btn" style="font-size: 0.8125rem;"
                    :style="orgNum === org.value
                      ? 'background: var(--color-primary); color: #fff; box-shadow: none;'
                      : 'background: transparent; color: var(--color-text-2); box-shadow: inset 0 0 0 1px var(--color-border);'">
                    {{ org.short }}
                  </button>
                </div>
                <select v-model="orgNum" class="sr-only" aria-hidden="true" tabindex="-1">
                  <option v-for="opt in orgOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>

              <!-- USER ID -->
              <div class="mb-4">
                <label class="sn-eyebrow block mb-1">사용자 ID</label>
                <input v-model="userId" type="text" placeholder="아이디를 입력하세요" class="sn-input" />
              </div>

              <!-- PASSWORD -->
              <div class="mb-6">
                <label class="sn-eyebrow block mb-1">비밀번호</label>
                <input v-model="password" type="password" placeholder="비밀번호를 입력하세요" class="sn-input" />
              </div>

              <!-- SUBMIT -->
              <button type="submit" :disabled="loading" class="sn-btn sn-btn-primary" style="width: 100%;"
                :style="loading ? 'opacity: 0.5; cursor: not-allowed;' : ''">
                <svg v-if="loading" class="animate-spin" style="width:16px;height:16px;" fill="none" viewBox="0 0 24 24">
                  <circle style="opacity:0.25;" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path style="opacity:0.75;" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                {{ loading ? '처리 중...' : (activeTab === 'login' ? '로그인하기' : '계정 등록하기') }}
              </button>

            </form>
          </div>
        </div>

        <!-- FOOTER -->
        <p class="sn-eyebrow text-center mt-6">GBA-21 · Hyperledger Fabric</p>

      </div>
    </div>
  `
});
