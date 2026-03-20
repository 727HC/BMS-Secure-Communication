const { createApp, ref, computed, onMounted, watch } = Vue;

const API_BASE = window.location.origin + '/api';

// Shared API helper
function createApi(auth) {
  async function request(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (auth.token) {
      opts.headers['Authorization'] = `Bearer ${auth.token}`;
    }
    if (body) {
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(`${API_BASE}${path}`, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }
  return {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    put: (path, body) => request('PUT', path, body),
  };
}

// MSP label map
const MSP_LABELS = {
  ManufacturerMSP: '제조사',
  EVManufacturerMSP: 'EV제조사',
  ServiceMSP: '정비/분석',
  RegulatorMSP: '검증기관',
};

const MSP_ORG_NUM = {
  ManufacturerMSP: 1,
  EVManufacturerMSP: 2,
  ServiceMSP: 3,
  RegulatorMSP: 4,
};

// Navigation items per role
const NAV_CONFIG = {
  ManufacturerMSP: [
    { route: 'dashboard', label: '대시보드' },
    { route: 'passports', label: '여권관리' },
    { route: 'bmu-data', label: 'BMU데이터' },
    { route: 'materials', label: '원자재' },
    { route: 'maintenance', label: '정비이력' },
    { route: 'recycling', label: '재활용' },
  ],
  EVManufacturerMSP: [
    { route: 'dashboard', label: '대시보드' },
    { route: 'passports', label: '여권조회' },
    { route: 'bmu-data', label: 'BMU데이터' },
    { route: 'maintenance', label: '정비요청' },
    { route: 'recycling', label: '재활용' },
  ],
  ServiceMSP: [
    { route: 'dashboard', label: '대시보드' },
    { route: 'passports', label: '여권조회' },
    { route: 'bmu-data', label: 'BMU데이터' },
    { route: 'maintenance', label: '정비수행' },
    { route: 'recycling', label: '재활용판정' },
  ],
  RegulatorMSP: [
    { route: 'dashboard', label: '대시보드' },
    { route: 'passports', label: '여권검증' },
    { route: 'bmu-data', label: 'BMU데이터' },
    { route: 'maintenance', label: '정비이력' },
    { route: 'recycling', label: '폐기관리' },
  ],
};

// Page component map
const PAGE_COMPONENTS = {
  login: 'login-page',
  dashboard: 'dashboard-page',
  passports: 'passports-page',
  'passport-detail': 'passport-detail-page',
  materials: 'materials-page',
  'bmu-data': 'bmu-data-page',
  maintenance: 'maintenance-page',
  recycling: 'recycling-page',
};

const app = createApp({
  setup() {
    const auth = ref({
      token: localStorage.getItem('bp_token') || null,
      userId: localStorage.getItem('bp_userId') || null,
      orgMsp: localStorage.getItem('bp_orgMsp') || null,
    });

    // 새로고침 시 URL 해시에서 페이지 복원
    const hashPage = window.location.hash.replace('#', '');
    const initialPage = auth.value.token
      ? (hashPage && PAGE_COMPONENTS[hashPage] ? hashPage : 'dashboard')
      : 'login';
    const currentPage = ref(initialPage);
    const pageProps = ref({});
    const toasts = ref([]);
    const mobileMenuOpen = ref(false);

    const api = computed(() => createApi(auth.value));

    const orgLabel = computed(() => MSP_LABELS[auth.value.orgMsp] || auth.value.orgMsp);

    const navItems = computed(() => NAV_CONFIG[auth.value.orgMsp] || []);

    const currentPageComponent = computed(() => PAGE_COMPONENTS[currentPage.value] || 'login-page');

    function navigate(page, navProps, skipHistory) {
      if (!auth.value.token && page !== 'login') {
        currentPage.value = 'login';
        return;
      }
      currentPage.value = page;
      if (navProps) {
        pageProps.value = navProps;
        window.__pageProps = navProps;
      } else {
        pageProps.value = {};
        window.__pageProps = {};
      }
      // Browser history support (뒤로가기/앞으로가기)
      if (!skipHistory) {
        history.pushState({ page, props: navProps || {} }, '', `#${page}`);
      }
    }

    // 뒤로가기/앞으로가기 처리
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.page) {
        navigate(e.state.page, e.state.props, true);
      } else {
        navigate(auth.value.token ? 'dashboard' : 'login', {}, true);
      }
    });

    // 초기 상태 등록
    history.replaceState({ page: currentPage.value, props: {} }, '', `#${currentPage.value}`);

    function onLogin(data) {
      auth.value = { token: data.token, userId: data.userId, orgMsp: data.mspId };
      localStorage.setItem('bp_token', data.token);
      localStorage.setItem('bp_userId', data.userId);
      localStorage.setItem('bp_orgMsp', data.mspId);
      showToast('success', `${data.userId}님 환영합니다`);
      navigate('dashboard');
    }

    function logout() {
      auth.value = { token: null, userId: null, orgMsp: null };
      localStorage.removeItem('bp_token');
      localStorage.removeItem('bp_userId');
      localStorage.removeItem('bp_orgMsp');
      navigate('login');
    }

    function showToast(type, message) {
      toasts.value.push({ type, message });
      setTimeout(() => toasts.value.shift(), 3000);
    }

    // Expose toast globally
    window.$toast = showToast;

    return {
      auth, currentPage, pageProps, toasts, api,
      orgLabel, navItems, currentPageComponent, mobileMenuOpen,
      navigate, onLogin, logout, showToast,
    };
  },
});
