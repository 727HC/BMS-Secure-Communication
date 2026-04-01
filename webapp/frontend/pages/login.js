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

      <!-- ═══ Ambient effects ═══ -->
      <div class="fixed inset-0 pointer-events-none overflow-hidden">
        <div class="absolute top-0 left-0 w-full h-full opacity-[0.02]"
             style="background-image: url('data:image/svg+xml,%3Csvg width=&quot;40&quot; height=&quot;40&quot; xmlns=&quot;http://www.w3.org/2000/svg&quot;%3E%3Cpath d=&quot;M0 0h1v40H0zM40 0h1v40h-1zM0 0v1h40V0zM0 40v1h40v-1z&quot; fill=&quot;%2334d399&quot;/%3E%3C/svg%3E');"></div>
        <div class="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full blur-[120px]" style="background: radial-gradient(circle, rgba(52,211,153,0.08), transparent 70%);"></div>
        <div class="absolute -bottom-20 right-0 w-[500px] h-[500px] rounded-full blur-[100px]" style="background: radial-gradient(circle, rgba(96,165,250,0.05), transparent 70%);"></div>
      </div>

      <!-- ═══════════════════════════════════════════════════════
           LEFT PANEL — Battery Lifecycle Schematic
           ═══════════════════════════════════════════════════════ -->
      <div class="hidden lg:flex flex-1 flex-col justify-center items-center relative px-12">

        <!-- Floating badge -->
        <div class="absolute top-8 left-8 flex items-center gap-2 bp-animate-in">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: linear-gradient(135deg, var(--bp-signal), #059669);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="6" y="2" width="12" height="20" rx="2" ry="2"/>
              <line x1="6" y1="6" x2="18" y2="6"/><line x1="6" y1="18" x2="18" y2="18"/>
              <path d="M12 9v6"/><path d="M9 12h6"/>
            </svg>
          </div>
          <span class="text-xs font-semibold tracking-wide" style="color: var(--bp-text-2); font-family: var(--font-mono);">BP.PLATFORM</span>
        </div>

        <!-- Main visual: Battery lifecycle -->
        <div class="relative max-w-md w-full bp-animate-in bp-delay-1">

          <!-- Large battery SVG -->
          <div class="flex justify-center mb-12">
            <div class="relative">
              <svg width="120" height="200" viewBox="0 0 120 200" fill="none" class="drop-shadow-2xl">
                <!-- Battery body -->
                <rect x="10" y="20" width="100" height="170" rx="12" stroke="var(--bp-signal)" stroke-width="2" fill="var(--bp-surface-2)" opacity="0.8"/>
                <!-- Battery cap -->
                <rect x="35" y="8" width="50" height="16" rx="6" stroke="var(--bp-signal)" stroke-width="2" fill="var(--bp-surface-3)"/>
                <!-- Charge level (animated) -->
                <rect x="18" y="50" width="84" height="132" rx="6" fill="var(--bp-surface-3)"/>
                <rect x="18" y="50" width="84" rx="6" fill="url(#battGrad)" class="login-charge-bar" style="height: 132px;">
                  <animate attributeName="height" values="20;132;100;132" dur="4s" repeatCount="indefinite" keyTimes="0;0.4;0.7;1" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1"/>
                  <animate attributeName="y" values="162;50;82;50" dur="4s" repeatCount="indefinite" keyTimes="0;0.4;0.7;1" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1"/>
                </rect>
                <defs>
                  <linearGradient id="battGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#34d399" stop-opacity="0.9"/>
                    <stop offset="100%" stop-color="#059669" stop-opacity="0.6"/>
                  </linearGradient>
                </defs>
                <!-- Bolt icon -->
                <path d="M52 85 L62 85 L58 105 L70 105 L55 130 L59 110 L48 110 Z" fill="var(--bp-void)" opacity="0.6"/>
              </svg>

              <!-- Pulsing glow behind battery -->
              <div class="absolute inset-0 -z-10 blur-3xl opacity-30" style="background: radial-gradient(circle, var(--bp-signal), transparent 60%); animation: bp-pulse 3s ease-in-out infinite;"></div>
            </div>
          </div>

          <!-- Title -->
          <h1 class="text-center mb-3" style="font-family: var(--font-display); font-size: 2.25rem; font-weight: 800; color: var(--bp-text-1); letter-spacing: -0.03em; line-height: 1.1;">
            Battery Passport<br/>Platform
          </h1>
          <p class="text-center text-sm mb-10" style="color: var(--bp-text-3); max-width: 360px; margin: 0 auto; line-height: 1.6;">
            GBA 21 기반 배터리 전주기 관리 플랫폼.<br/>블록체인과 DID로 신뢰할 수 있는 이력을 제공합니다.
          </p>

          <!-- Lifecycle timeline -->
          <div class="flex items-center justify-center gap-0 px-4 bp-animate-in bp-delay-3">
            <div v-for="(step, i) in [
              { icon: '⚙', label: '제조', color: '#34d399' },
              { icon: '⚡', label: '운행', color: '#60a5fa' },
              { icon: '🔧', label: '정비', color: '#fbbf24' },
              { icon: '♻', label: '재활용', color: '#a78bfa' }
            ]" :key="i" class="flex items-center">
              <!-- Node -->
              <div class="flex flex-col items-center">
                <div class="w-11 h-11 rounded-xl flex items-center justify-center text-lg border transition-all duration-300"
                     :style="'background: ' + step.color + '15; border-color: ' + step.color + '30;'">
                  {{ step.icon }}
                </div>
                <span class="mt-1.5 text-[10px] font-medium" style="color: var(--bp-text-3);">{{ step.label }}</span>
              </div>
              <!-- Connector line (animated) -->
              <div v-if="i < 3" class="w-8 h-px mx-1 mb-5 relative overflow-hidden" style="background: var(--bp-border);">
                <div class="absolute inset-0 h-full" :style="'background: ' + step.color + '; animation: login-flow 2s ease-in-out infinite; animation-delay: ' + (i * 0.4) + 's; transform: translateX(-100%);'"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom left: tech stack -->
        <div class="absolute bottom-8 left-8 flex items-center gap-3 bp-animate-in bp-delay-4">
          <span class="px-2 py-1 rounded text-[10px] font-medium" style="background: var(--bp-surface-3); color: var(--bp-text-3); font-family: var(--font-mono);">Hyperledger Fabric</span>
          <span class="px-2 py-1 rounded text-[10px] font-medium" style="background: var(--bp-surface-3); color: var(--bp-text-3); font-family: var(--font-mono);">Aries + DID</span>
          <span class="px-2 py-1 rounded text-[10px] font-medium" style="background: var(--bp-surface-3); color: var(--bp-text-3); font-family: var(--font-mono);">Ed25519</span>
        </div>
      </div>

      <!-- ═══════════════════════════════════════════════════════
           RIGHT PANEL — Auth Form (Terminal Style)
           ═══════════════════════════════════════════════════════ -->
      <div class="w-full lg:w-[520px] flex-shrink-0 flex items-center justify-center p-6 lg:p-10 relative"
           style="background: var(--bp-surface-1); border-left: 1px solid var(--bp-border);">

        <!-- Mobile header -->
        <div class="absolute top-6 left-6 lg:hidden flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg flex items-center justify-center" style="background: linear-gradient(135deg, var(--bp-signal), #059669);">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="6" y="2" width="12" height="20" rx="2" ry="2"/>
              <line x1="6" y1="6" x2="18" y2="6"/><line x1="6" y1="18" x2="18" y2="18"/>
            </svg>
          </div>
          <span class="text-sm font-bold" style="color: var(--bp-text-1); font-family: var(--font-display);">Battery Passport</span>
        </div>

        <div class="w-full max-w-sm bp-animate-in">

          <!-- Tab switcher -->
          <div class="bp-tabs mb-6">
            <button @click="switchTab('login')"
              :class="['bp-tab', activeTab === 'login' ? 'bp-tab-active' : '']">
              <span class="inline-flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
                로그인
              </span>
            </button>
            <button @click="switchTab('register')"
              :class="['bp-tab', activeTab === 'register' ? 'bp-tab-active' : '']">
              <span class="inline-flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/>
                  <line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
                </svg>
                회원가입
              </span>
            </button>
          </div>

          <!-- Header -->
          <div class="mb-6">
            <h2 class="text-xl font-bold mb-1" style="font-family: var(--font-display); color: var(--bp-text-1);">
              {{ activeTab === 'login' ? '시스템 접속' : '계정 등록' }}
            </h2>
            <p class="text-sm" style="color: var(--bp-text-3);">
              {{ activeTab === 'login' ? '인증된 사용자만 접근할 수 있습니다.' : '조직과 역할을 선택하여 등록합니다.' }}
            </p>
          </div>

          <!-- Error -->
          <div v-if="errorMsg" class="mb-4 flex items-start gap-2 px-4 py-3 rounded-lg text-sm bp-animate-in"
               style="background: var(--bp-danger-dim); border: 1px solid rgba(248,113,113,0.25); color: var(--bp-danger);">
            <svg class="flex-shrink-0 w-4 h-4 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <span>{{ errorMsg }}</span>
          </div>

          <form @submit.prevent="handleSubmit" class="space-y-4">

            <!-- ── Org Selection Cards ── -->
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider mb-2" style="color: var(--bp-text-3);">소속 기관</label>
              <div class="grid grid-cols-2 gap-2">
                <button v-for="org in orgOptions" :key="org.value"
                  type="button"
                  @click="orgNum = org.value"
                  class="relative text-left p-3 rounded-lg border transition-all duration-150"
                  :style="orgNum === org.value
                    ? 'background: ' + org.color + '12; border-color: ' + org.color + '50; box-shadow: 0 0 20px ' + org.color + '15, inset 0 0 30px ' + org.color + '05; transform: scale(1.02);'
                    : 'background: var(--bp-surface-2); border-color: var(--bp-border); transform: scale(1);'"
                  @mouseenter="$event.currentTarget.style.borderColor = orgNum !== org.value ? 'var(--bp-border-hover)' : org.color + '40'"
                  @mouseleave="$event.currentTarget.style.borderColor = orgNum !== org.value ? 'var(--bp-border)' : org.color + '40'">
                  <!-- Active indicator -->
                  <div v-if="orgNum === org.value" class="absolute top-2 right-2 w-2 h-2 rounded-full" :style="'background: ' + org.color + ';'"></div>
                  <!-- Icon -->
                  <div class="w-7 h-7 rounded-md flex items-center justify-center mb-1.5" :style="'background: ' + org.color + '20;'">
                    <svg v-if="org.icon === 'factory'" class="w-3.5 h-3.5" :style="'color: ' + org.color" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M2 20h20"/><path d="M5 20V8l5 4V8l5 4V4h3v16"/>
                    </svg>
                    <svg v-else-if="org.icon === 'car'" class="w-3.5 h-3.5" :style="'color: ' + org.color" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M5 17h2m10 0h2M3 11l1.5-5h15L21 11"/><rect x="2" y="11" width="20" height="8" rx="2"/><circle cx="7" cy="17" r="1"/><circle cx="17" cy="17" r="1"/>
                    </svg>
                    <svg v-else-if="org.icon === 'wrench'" class="w-3.5 h-3.5" :style="'color: ' + org.color" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
                    </svg>
                    <svg v-else class="w-3.5 h-3.5" :style="'color: ' + org.color" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  </div>
                  <div class="text-xs font-semibold" :style="orgNum === org.value ? 'color: ' + org.color : 'color: var(--bp-text-1)'">{{ org.short }}</div>
                  <div class="text-[10px] mt-0.5" style="color: var(--bp-text-3); line-height: 1.3;">{{ org.desc }}</div>
                </button>
              </div>
              <!-- Hidden select for Playwright compatibility -->
              <select v-model="orgNum" class="sr-only" aria-hidden="true" tabindex="-1">
                <option v-for="opt in orgOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>

            <!-- ── User ID ── -->
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5" style="color: var(--bp-text-3);">사용자 ID</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--bp-text-3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <input v-model="userId" type="text" placeholder="아이디를 입력하세요"
                  class="bp-input bp-input-icon" style="padding-left: 2.25rem;" />
              </div>
            </div>

            <!-- ── Password ── -->
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5" style="color: var(--bp-text-3);">비밀번호</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--bp-text-3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                </div>
                <input v-model="password" type="password" placeholder="비밀번호를 입력하세요"
                  class="bp-input bp-input-icon" style="padding-left: 2.25rem;" />
              </div>
            </div>

            <!-- ── Submit ── -->
            <button type="submit" :disabled="loading"
              class="bp-btn w-full py-3 mt-2 text-sm font-semibold rounded-lg transition-all duration-200"
              :style="loading
                ? 'background: var(--bp-surface-4); color: var(--bp-text-3); cursor: not-allowed;'
                : 'background: linear-gradient(135deg, #10b981, #059669); color: white; box-shadow: 0 2px 12px rgba(16,185,129,0.2), inset 0 1px 0 rgba(255,255,255,0.1);'"
              @mouseenter="!loading && ($event.target.style.boxShadow = '0 4px 20px rgba(16,185,129,0.3), inset 0 1px 0 rgba(255,255,255,0.15)')"
              @mouseleave="!loading && ($event.target.style.boxShadow = '0 2px 12px rgba(16,185,129,0.2), inset 0 1px 0 rgba(255,255,255,0.1)')">
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
          <div class="mt-8 pt-4 flex items-center justify-between" style="border-top: 1px solid var(--bp-border);">
            <span class="text-[10px]" style="color: var(--bp-text-muted); font-family: var(--font-mono);">Hyperledger Fabric + Aries</span>
            <span class="text-[10px]" style="color: var(--bp-text-muted); font-family: var(--font-mono);">v2.0</span>
          </div>
        </div>
      </div>

      <style>
        @keyframes login-flow {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
      </style>
    </div>
  `
});
