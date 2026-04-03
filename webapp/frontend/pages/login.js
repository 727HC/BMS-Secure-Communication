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
    <div class="min-h-screen flex items-center justify-center py-12 px-4" style="background: #fafafa; font-family: 'Pretendard Variable', Pretendard, sans-serif;">

      <style>
        @keyframes sn-fadeInUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sn-input {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border-radius: 0.5rem;
          border: 1.5px solid #e5e5e5;
          background: #ffffff;
          color: #171717;
          font-size: 0.9375rem;
          font-family: 'Pretendard Variable', Pretendard, sans-serif;
          outline: none;
          transition: all 0.5s cubic-bezier(0.16,1,0.3,1);
        }
        .sn-input:focus {
          border-color: #16a34a;
          box-shadow: 0 0 0 2px #16a34a, 0 0 0 4px rgba(22,163,74,0.1);
        }
        .sn-input::placeholder { color: #a3a3a3; }
        .sn-btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.75rem 1.5rem;
          border-radius: 9999px;
          background: #171717;
          color: #ffffff;
          font-size: 0.9375rem;
          font-weight: 600;
          letter-spacing: 0.01em;
          border: none;
          cursor: pointer;
          transition: all 0.5s cubic-bezier(0.16,1,0.3,1);
          font-family: 'Pretendard Variable', Pretendard, sans-serif;
        }
        .sn-btn-primary:hover:not(:disabled) { transform: scale(1.02); background: #262626; }
        .sn-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
      </style>

      <div style="width: 100%; max-width: 420px;">

        <!-- LOGO — stagger 0ms -->
        <div class="flex flex-col items-center mb-8"
          style="animation: sn-fadeInUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards; animation-delay: 0ms; opacity: 0;">
          <div class="flex items-center gap-3 mb-3">
            <div class="flex items-center justify-center"
              style="width: 40px; height: 40px; border-radius: 10px; background: #16a34a;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="7" width="16" height="11" rx="2"/>
                <path d="M18 10h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-2"/>
                <line x1="7" y1="11" x2="7" y2="14"/>
                <line x1="11" y1="10" x2="11" y2="15"/>
              </svg>
            </div>
            <span style="font-family: 'Outfit', 'Pretendard Variable', sans-serif; font-size: 1.375rem; font-weight: 700; color: #171717; letter-spacing: -0.03em;">BatteryPass</span>
          </div>
          <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #a3a3a3; word-break: keep-all;">배터리 전주기 추적 플랫폼</span>
        </div>

        <!-- DOUBLE-BEZEL CARD — stagger 80ms -->
        <div style="background: rgba(0,0,0,0.02); padding: 6px; border-radius: 1.25rem; animation: sn-fadeInUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards; animation-delay: 80ms; opacity: 0;">
          <div style="background: #ffffff; border-radius: calc(1.25rem - 6px); padding: 1.75rem;">

            <!-- TAB SWITCHER — stagger 160ms -->
            <div class="flex mb-6"
              style="border-bottom: 2px solid #f5f5f5; animation: sn-fadeInUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards; animation-delay: 160ms; opacity: 0;">
              <button @click="switchTab('login')"
                class="pb-3 mr-6 text-sm font-semibold relative"
                style="background: none; border: none; cursor: pointer; transition: all 0.5s cubic-bezier(0.16,1,0.3,1);"
                :style="activeTab === 'login' ? 'color: #171717;' : 'color: #a3a3a3;'">
                로그인
                <span v-if="activeTab === 'login'"
                  class="absolute bottom-0 left-0 right-0"
                  style="height: 2px; background: #171717; border-radius: 1px; margin-bottom: -2px; display: block;"></span>
              </button>
              <button @click="switchTab('register')"
                class="pb-3 text-sm font-semibold relative"
                style="background: none; border: none; cursor: pointer; transition: all 0.5s cubic-bezier(0.16,1,0.3,1);"
                :style="activeTab === 'register' ? 'color: #171717;' : 'color: #a3a3a3;'">
                회원가입
                <span v-if="activeTab === 'register'"
                  class="absolute bottom-0 left-0 right-0"
                  style="height: 2px; background: #171717; border-radius: 1px; margin-bottom: -2px; display: block;"></span>
              </button>
            </div>

            <!-- ERROR — stagger 240ms -->
            <div v-if="errorMsg"
              class="mb-4 px-3 py-2.5 rounded-lg text-sm"
              style="background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; animation: sn-fadeInUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards; animation-delay: 240ms; opacity: 0;">
              {{ errorMsg }}
            </div>

            <form @submit.prevent="handleSubmit">

              <!-- ORG SELECTOR — stagger 240ms -->
              <div class="mb-5"
                style="animation: sn-fadeInUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards; animation-delay: 240ms; opacity: 0;">
                <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #a3a3a3; margin-bottom: 0.625rem; word-break: keep-all;">조직 선택</p>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                  <button v-for="org in orgOptions" :key="org.value" type="button"
                    @click="orgNum = org.value"
                    style="padding: 0.5rem 0.75rem; border-radius: 9999px; font-size: 0.8125rem; font-weight: 500; cursor: pointer; transition: all 0.5s cubic-bezier(0.16,1,0.3,1); font-family: 'Pretendard Variable', Pretendard, sans-serif; white-space: nowrap; word-break: keep-all;"
                    :style="orgNum === org.value
                      ? 'background: #171717; color: #ffffff; border: 1.5px solid #171717;'
                      : 'background: #ffffff; color: #525252; border: 1.5px solid #e5e5e5;'">
                    {{ org.short }}
                  </button>
                </div>
                <select v-model="orgNum" class="sr-only" aria-hidden="true" tabindex="-1">
                  <option v-for="opt in orgOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>

              <!-- USER ID — stagger 320ms -->
              <div class="mb-4"
                style="animation: sn-fadeInUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards; animation-delay: 320ms; opacity: 0;">
                <label style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #a3a3a3; margin-bottom: 0.375rem; word-break: keep-all;">사용자 ID</label>
                <input v-model="userId" type="text" placeholder="아이디를 입력하세요" class="sn-input" />
              </div>

              <!-- PASSWORD — stagger 400ms -->
              <div class="mb-6"
                style="animation: sn-fadeInUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards; animation-delay: 400ms; opacity: 0;">
                <label style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #a3a3a3; margin-bottom: 0.375rem; word-break: keep-all;">비밀번호</label>
                <input v-model="password" type="password" placeholder="비밀번호를 입력하세요" class="sn-input" />
              </div>

              <!-- SUBMIT — stagger 480ms -->
              <div style="animation: sn-fadeInUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards; animation-delay: 480ms; opacity: 0;">
                <button type="submit" :disabled="loading" class="sn-btn-primary">
                  <span v-if="loading" class="inline-flex items-center gap-2">
                    <svg class="animate-spin" style="width:16px;height:16px;" fill="none" viewBox="0 0 24 24">
                      <circle style="opacity:0.25;" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path style="opacity:0.75;" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    처리 중...
                  </span>
                  <span v-else>{{ activeTab === 'login' ? '로그인하기' : '계정 등록하기' }}</span>
                </button>
              </div>

            </form>
          </div>
        </div>

        <!-- FOOTER — stagger 560ms -->
        <p class="text-center mt-6"
          style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #a3a3a3; animation: sn-fadeInUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards; animation-delay: 560ms; opacity: 0;">
          GBA-21 · Hyperledger Fabric
        </p>

      </div>
    </div>
  `
});
