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
      { value: 1, label: '제조사 (Manufacturer)', short: '제조사', desc: '배터리 제조 및 여권 발급', icon: 'factory', color: '#34d399' },
      { value: 2, label: 'EV제조사 (EV Manufacturer)', short: 'EV제조사', desc: '차량 바인딩 및 운행 관리', icon: 'car', color: '#a78bfa' },
      { value: 3, label: '정비/분석 (Service)', short: '정비/분석', desc: '배터리 정비 및 상태 분석', icon: 'wrench', color: '#fbbf24' },
      { value: 4, label: '검증기관 (Regulator)', short: '검증기관', desc: '규제 준수 및 인증 관리', icon: 'shield', color: '#60a5fa' },
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
    <div class="min-h-screen flex" style="background: var(--bp-void);">

      <!-- ═══ Background Grid + Ambient ═══ -->
      <div class="fixed inset-0 pointer-events-none overflow-hidden">
        <!-- Hex grid pattern -->
        <div class="absolute inset-0 opacity-[0.025]"
             style="background-image: url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cpath d=%22M0 0h1v60H0zM60 0v60M0 0h60M0 60h60%22 fill=%22none%22 stroke=%2234d399%22 stroke-width=%220.5%22/%3E%3C/svg%3E');"></div>
        <!-- Radial glows -->
        <div class="absolute -top-32 left-1/4 w-[700px] h-[700px] rounded-full blur-[150px]" style="background: radial-gradient(circle, rgba(52,211,153,0.07), transparent 65%);"></div>
        <div class="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px]" style="background: radial-gradient(circle, rgba(96,165,250,0.04), transparent 65%);"></div>
      </div>

      <!-- ═══════════════════════════════════════
           LEFT — Battery Telemetry HUD
           ═══════════════════════════════════════ -->
      <div class="hidden lg:flex flex-1 flex-col items-center justify-center relative overflow-hidden">

        <!-- System label -->
        <div class="absolute top-8 left-8 bp-animate-in">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 0 15px rgba(16,185,129,0.3);">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="6" y="2" width="12" height="20" rx="2"/><line x1="6" y1="6" x2="18" y2="6"/><line x1="6" y1="18" x2="18" y2="18"/>
              </svg>
            </div>
            <div>
              <div class="text-[10px] font-bold tracking-[0.15em]" style="color: var(--bp-signal); font-family: var(--font-mono);">BATTERY PASSPORT</div>
              <div class="text-[9px] tracking-[0.1em]" style="color: var(--bp-text-muted); font-family: var(--font-mono);">PLATFORM v2.0</div>
            </div>
          </div>
        </div>

        <!-- Central battery + floating data -->
        <div class="relative bp-animate-in bp-delay-1" style="width: 320px; height: 420px;">

          <!-- Floating telemetry data points -->
          <div class="absolute -left-8 top-16 login-float-1">
            <div class="px-3 py-2 rounded-lg" style="background: var(--bp-surface-2); border: 1px solid var(--bp-border); backdrop-filter: blur(10px);">
              <div class="text-[9px] uppercase tracking-wider" style="color: var(--bp-text-muted); font-family: var(--font-mono);">SOC</div>
              <div class="text-lg font-bold" style="color: var(--bp-signal); font-family: var(--font-display);">93.4<span class="text-xs">%</span></div>
            </div>
          </div>
          <div class="absolute -right-4 top-28 login-float-2">
            <div class="px-3 py-2 rounded-lg" style="background: var(--bp-surface-2); border: 1px solid var(--bp-border); backdrop-filter: blur(10px);">
              <div class="text-[9px] uppercase tracking-wider" style="color: var(--bp-text-muted); font-family: var(--font-mono);">VOLTAGE</div>
              <div class="text-lg font-bold" style="color: #60a5fa; font-family: var(--font-display);">396<span class="text-xs">V</span></div>
            </div>
          </div>
          <div class="absolute -left-4 bottom-32 login-float-3">
            <div class="px-3 py-2 rounded-lg" style="background: var(--bp-surface-2); border: 1px solid var(--bp-border); backdrop-filter: blur(10px);">
              <div class="text-[9px] uppercase tracking-wider" style="color: var(--bp-text-muted); font-family: var(--font-mono);">TEMP</div>
              <div class="text-lg font-bold" style="color: #fbbf24; font-family: var(--font-display);">28.3<span class="text-xs">°C</span></div>
            </div>
          </div>

          <!-- Battery SVG (larger) -->
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="relative">
              <svg width="140" height="230" viewBox="0 0 140 230" fill="none">
                <!-- Outer glow ring -->
                <ellipse cx="70" cy="130" rx="90" ry="90" stroke="var(--bp-signal)" stroke-width="0.5" opacity="0.15" stroke-dasharray="4 6"/>
                <ellipse cx="70" cy="130" rx="70" ry="70" stroke="var(--bp-signal)" stroke-width="0.3" opacity="0.08" stroke-dasharray="2 4"/>
                <!-- Body -->
                <rect x="20" y="25" width="100" height="190" rx="14" stroke="var(--bp-signal)" stroke-width="1.5" fill="var(--bp-surface-2)" opacity="0.9"/>
                <!-- Cap -->
                <rect x="45" y="10" width="50" height="18" rx="7" stroke="var(--bp-signal)" stroke-width="1.5" fill="var(--bp-surface-3)"/>
                <!-- Inner cell area -->
                <rect x="28" y="55" width="84" height="152" rx="8" fill="var(--bp-surface-3)"/>
                <!-- Charge level -->
                <rect x="28" rx="8" fill="url(#battGrad2)">
                  <animate attributeName="height" values="20;152;110;152" dur="5s" repeatCount="indefinite" keyTimes="0;0.35;0.65;1" calcMode="spline" keySplines="0.25 0.1 0.25 1;0.25 0.1 0.25 1;0.25 0.1 0.25 1"/>
                  <animate attributeName="y" values="187;55;97;55" dur="5s" repeatCount="indefinite" keyTimes="0;0.35;0.65;1" calcMode="spline" keySplines="0.25 0.1 0.25 1;0.25 0.1 0.25 1;0.25 0.1 0.25 1"/>
                </rect>
                <!-- Cell dividers -->
                <line x1="28" y1="90" x2="112" y2="90" stroke="var(--bp-void)" stroke-width="1" opacity="0.3"/>
                <line x1="28" y1="125" x2="112" y2="125" stroke="var(--bp-void)" stroke-width="1" opacity="0.3"/>
                <line x1="28" y1="160" x2="112" y2="160" stroke="var(--bp-void)" stroke-width="1" opacity="0.3"/>
                <!-- Bolt -->
                <path d="M62 100 L72 100 L68 125 L82 125 L65 155 L69 130 L56 130 Z" fill="var(--bp-void)" opacity="0.4"/>
                <defs>
                  <linearGradient id="battGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#34d399" stop-opacity="0.85"/>
                    <stop offset="50%" stop-color="#10b981" stop-opacity="0.7"/>
                    <stop offset="100%" stop-color="#059669" stop-opacity="0.5"/>
                  </linearGradient>
                </defs>
              </svg>
              <!-- Pulsing glow -->
              <div class="absolute inset-0 -z-10 blur-[60px] opacity-25" style="background: radial-gradient(circle, var(--bp-signal), transparent 60%); animation: bp-pulse 4s ease-in-out infinite;"></div>
            </div>
          </div>
        </div>

        <!-- Title -->
        <div class="text-center mt-2 bp-animate-in bp-delay-2">
          <h1 style="font-family: var(--font-display); font-size: 2rem; font-weight: 800; color: var(--bp-text-1); letter-spacing: -0.03em; line-height: 1.1;">
            Battery Passport
          </h1>
          <p class="mt-2 text-sm" style="color: var(--bp-text-3); max-width: 320px; line-height: 1.5;">
            GBA 21 기반 배터리 전주기 관리.<br/>블록체인 · DID · Ed25519 보안 인프라.
          </p>
        </div>

        <!-- Vertical lifecycle timeline -->
        <div class="absolute right-12 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0 bp-animate-in bp-delay-3">
          <div v-for="(step, i) in [
            { label: '제조', color: '#34d399', icon: '⚙' },
            { label: '운행', color: '#60a5fa', icon: '⚡' },
            { label: '정비', color: '#fbbf24', icon: '🔧' },
            { label: '재활용', color: '#a78bfa', icon: '♻' }
          ]" :key="i" class="flex items-center gap-3">
            <div class="flex flex-col items-center">
              <!-- Node -->
              <div class="w-10 h-10 rounded-xl flex items-center justify-center text-sm relative"
                   :style="'background: ' + step.color + '12; border: 1px solid ' + step.color + '25;'">
                <span>{{ step.icon }}</span>
                <!-- Pulse ring -->
                <div class="absolute inset-0 rounded-xl" :style="'border: 1px solid ' + step.color + '30; animation: login-pulse 3s ease-in-out infinite; animation-delay: ' + (i * 0.6) + 's;'"></div>
              </div>
              <!-- Connector -->
              <div v-if="i < 3" class="w-px h-6 relative overflow-hidden" :style="'background: ' + step.color + '15;'">
                <div class="absolute w-full" :style="'background: ' + step.color + '; animation: login-drop 2.5s ease-in-out infinite; animation-delay: ' + (i * 0.5) + 's;'"></div>
              </div>
            </div>
            <span class="text-[10px] font-medium w-8" :style="'color: ' + step.color + '80; font-family: var(--font-mono);'">{{ step.label }}</span>
          </div>
        </div>

        <!-- Tech badges -->
        <div class="absolute bottom-8 left-8 flex items-center gap-2 bp-animate-in bp-delay-4">
          <span v-for="t in ['Fabric 2.5', 'Aries DID', 'Ed25519', 'CouchDB']" :key="t"
            class="px-2 py-1 rounded text-[9px] font-medium" style="background: var(--bp-surface-3); color: var(--bp-text-muted); font-family: var(--font-mono); border: 1px solid var(--bp-border);">
            {{ t }}
          </span>
        </div>
      </div>

      <!-- ═══════════════════════════════════════
           RIGHT — Auth Terminal
           ═══════════════════════════════════════ -->
      <div class="w-full lg:w-[480px] flex-shrink-0 flex items-center justify-center p-6 lg:p-8 relative"
           style="background: linear-gradient(180deg, var(--bp-surface-1), var(--bp-void)); border-left: 1px solid var(--bp-border);">

        <!-- Glass panel -->
        <div class="w-full max-w-sm bp-animate-in" style="backdrop-filter: blur(20px);">

          <!-- Mobile logo -->
          <div class="text-center mb-6 lg:hidden">
            <div class="w-10 h-10 mx-auto rounded-lg flex items-center justify-center mb-3" style="background: linear-gradient(135deg, #10b981, #059669);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><rect x="6" y="2" width="12" height="20" rx="2"/><line x1="6" y1="6" x2="18" y2="6"/></svg>
            </div>
            <div class="text-base font-bold" style="font-family: var(--font-display); color: var(--bp-text-1);">Battery Passport</div>
          </div>

          <!-- Tab switcher -->
          <div class="bp-tabs mb-5">
            <button @click="switchTab('login')" :class="['bp-tab', activeTab === 'login' ? 'bp-tab-active' : '']">
              <span class="inline-flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                로그인
              </span>
            </button>
            <button @click="switchTab('register')" :class="['bp-tab', activeTab === 'register' ? 'bp-tab-active' : '']">
              <span class="inline-flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                회원가입
              </span>
            </button>
          </div>

          <!-- Header -->
          <div class="mb-5">
            <h2 class="text-lg font-bold" style="font-family: var(--font-display); color: var(--bp-text-1);">
              {{ activeTab === 'login' ? '시스템 접속' : '계정 등록' }}
            </h2>
            <p class="text-xs mt-0.5" style="color: var(--bp-text-3);">
              {{ activeTab === 'login' ? '인증된 조직 사용자만 접근 가능합니다.' : '조직 역할을 선택하여 계정을 등록합니다.' }}
            </p>
          </div>

          <!-- Error -->
          <div v-if="errorMsg" class="mb-4 flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs bp-animate-in"
               style="background: var(--bp-danger-dim); border: 1px solid rgba(248,113,113,0.2); color: var(--bp-danger);">
            <svg class="w-3.5 h-3.5 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            <span>{{ errorMsg }}</span>
          </div>

          <form @submit.prevent="handleSubmit" class="space-y-4">

            <!-- ── Org Selection (vertical list) ── -->
            <div>
              <label class="block text-[10px] font-semibold uppercase tracking-[0.1em] mb-2" style="color: var(--bp-text-3); font-family: var(--font-mono);">ORGANIZATION</label>
              <div class="space-y-1.5">
                <button v-for="org in orgOptions" :key="org.value" type="button"
                  @click="orgNum = org.value"
                  class="w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all duration-200 text-left relative overflow-hidden"
                  :style="orgNum === org.value
                    ? 'background: ' + org.color + '08; border-color: ' + org.color + '35; box-shadow: 0 0 16px ' + org.color + '08;'
                    : 'background: var(--bp-surface-2); border-color: var(--bp-border);'">
                  <!-- Active left bar -->
                  <div class="absolute left-0 top-0 bottom-0 w-[3px] rounded-r transition-all duration-200"
                       :style="orgNum === org.value ? 'background: ' + org.color + ';' : 'background: transparent;'"></div>
                  <!-- Icon -->
                  <div class="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 transition-all" :style="'background: ' + org.color + (orgNum === org.value ? '20' : '10') + ';'">
                    <svg v-if="org.icon === 'factory'" class="w-3.5 h-3.5" :style="'color: ' + org.color" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20h20"/><path d="M5 20V8l5 4V8l5 4V4h3v16"/></svg>
                    <svg v-else-if="org.icon === 'car'" class="w-3.5 h-3.5" :style="'color: ' + org.color" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 17h2m10 0h2M3 11l1.5-5h15L21 11"/><rect x="2" y="11" width="20" height="8" rx="2"/></svg>
                    <svg v-else-if="org.icon === 'wrench'" class="w-3.5 h-3.5" :style="'color: ' + org.color" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
                    <svg v-else class="w-3.5 h-3.5" :style="'color: ' + org.color" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  </div>
                  <!-- Text -->
                  <div class="flex-1 min-w-0">
                    <div class="text-xs font-semibold" :style="orgNum === org.value ? 'color: ' + org.color : 'color: var(--bp-text-1)'">{{ org.short }}</div>
                    <div class="text-[10px] truncate" style="color: var(--bp-text-3);">{{ org.desc }}</div>
                  </div>
                  <!-- Check -->
                  <div v-if="orgNum === org.value" class="flex-shrink-0">
                    <svg class="w-4 h-4" :style="'color: ' + org.color" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                </button>
              </div>
              <select v-model="orgNum" class="sr-only" aria-hidden="true" tabindex="-1">
                <option v-for="opt in orgOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>

            <!-- ── Credentials ── -->
            <div>
              <label class="block text-[10px] font-semibold uppercase tracking-[0.1em] mb-1.5" style="color: var(--bp-text-3); font-family: var(--font-mono);">USER ID</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--bp-text-3)" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <input v-model="userId" type="text" placeholder="아이디를 입력하세요" class="bp-input" style="padding-left: 2.25rem; font-size: 0.8125rem;" />
              </div>
            </div>

            <div>
              <label class="block text-[10px] font-semibold uppercase tracking-[0.1em] mb-1.5" style="color: var(--bp-text-3); font-family: var(--font-mono);">PASSWORD</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--bp-text-3)" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                </div>
                <input v-model="password" type="password" placeholder="비밀번호를 입력하세요" class="bp-input" style="padding-left: 2.25rem; font-size: 0.8125rem;" />
              </div>
            </div>

            <!-- ── Submit ── -->
            <button type="submit" :disabled="loading"
              class="bp-btn w-full py-3 text-sm font-semibold rounded-lg transition-all duration-200"
              :style="loading
                ? 'background: var(--bp-surface-4); color: var(--bp-text-3); cursor: not-allowed;'
                : 'background: linear-gradient(135deg, #10b981, #059669); color: white; box-shadow: 0 2px 12px rgba(16,185,129,0.2), inset 0 1px 0 rgba(255,255,255,0.1);'">
              <span v-if="loading" class="inline-flex items-center justify-center">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                처리중...
              </span>
              <span v-else>{{ activeTab === 'login' ? '로그인' : '계정 등록' }}</span>
            </button>
          </form>

          <!-- Footer -->
          <div class="mt-6 pt-3 flex items-center justify-between" style="border-top: 1px solid var(--bp-border);">
            <span class="text-[9px]" style="color: var(--bp-text-muted); font-family: var(--font-mono);">Hyperledger Fabric + Aries</span>
            <span class="text-[9px]" style="color: var(--bp-text-muted); font-family: var(--font-mono);">v2.0</span>
          </div>
        </div>
      </div>

      <style>
        @keyframes login-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes login-drop {
          0% { top: -4px; height: 4px; opacity: 0; }
          30% { opacity: 1; }
          100% { top: 100%; height: 4px; opacity: 0; }
        }
        .login-float-1 { animation: login-bob 6s ease-in-out infinite; }
        .login-float-2 { animation: login-bob 7s ease-in-out infinite; animation-delay: -2s; }
        .login-float-3 { animation: login-bob 5s ease-in-out infinite; animation-delay: -4s; }
        @keyframes login-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      </style>
    </div>
  `
});
