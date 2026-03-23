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

// Unified sidebar navigation (RBAC handled at page level)
const SIDEBAR_NAV = [
  { route: 'dashboard', label: '대시보드', icon: 'dashboard', section: '' },
  { route: 'passports', label: '배터리 여권', icon: 'passport', section: '관리' },
  { route: 'materials', label: '추적성', icon: 'chain', section: '관리' },
  { route: 'bmu-data', label: '배터리 데이터', icon: 'pulse', section: '모니터링' },
  { route: 'maintenance', label: '정비/서비스', icon: 'wrench', section: '운영' },
  { route: 'recycling', label: '재활용', icon: 'recycle', section: '운영' },
];

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

    // Restore page from URL hash on refresh
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

    // Unified nav items for sidebar
    const navItems = computed(() => SIDEBAR_NAV);

    // Grouped nav items by section for sidebar rendering
    const groupedNavItems = computed(() => {
      const groups = [];
      let currentSection = null;
      for (const item of SIDEBAR_NAV) {
        if (item.section !== currentSection) {
          currentSection = item.section;
          groups.push({ section: currentSection, items: [] });
        }
        groups[groups.length - 1].items.push(item);
      }
      return groups;
    });

    const currentPageComponent = computed(() => PAGE_COMPONENTS[currentPage.value] || 'login-page');

    // Current page title in Korean
    const currentPageTitle = computed(() => {
      const item = SIDEBAR_NAV.find(n => n.route === currentPage.value);
      if (item) return item.label;
      if (currentPage.value === 'passport-detail') return '여권 상세';
      if (currentPage.value === 'login') return '로그인';
      return '대시보드';
    });

    // User initials (first 2 chars of userId)
    const userInitials = computed(() => {
      const id = auth.value.userId;
      if (!id) return '??';
      return id.substring(0, 2).toUpperCase();
    });

    // Org color classes for badge
    const orgBadgeClasses = computed(() => {
      switch (auth.value.orgMsp) {
        case 'ManufacturerMSP': return 'bg-blue-400/20 text-blue-300 border-blue-400/30';
        case 'EVManufacturerMSP': return 'bg-purple-400/20 text-purple-300 border-purple-400/30';
        case 'ServiceMSP': return 'bg-amber-400/20 text-amber-300 border-amber-400/30';
        case 'RegulatorMSP': return 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30';
        default: return 'bg-gray-400/20 text-gray-300 border-gray-400/30';
      }
    });

    // Org avatar background color
    const orgAvatarColor = computed(() => {
      switch (auth.value.orgMsp) {
        case 'ManufacturerMSP': return 'bg-blue-500';
        case 'EVManufacturerMSP': return 'bg-purple-500';
        case 'ServiceMSP': return 'bg-amber-500';
        case 'RegulatorMSP': return 'bg-emerald-500';
        default: return 'bg-gray-500';
      }
    });

    function navigate(page, navProps, skipHistory) {
      if (!auth.value.token && page !== 'login') {
        currentPage.value = 'login';
        return;
      }
      currentPage.value = page;
      mobileMenuOpen.value = false;
      if (navProps) {
        pageProps.value = navProps;
        window.__pageProps = navProps;
      } else {
        pageProps.value = {};
        window.__pageProps = {};
      }
      if (!skipHistory) {
        history.pushState({ page, props: navProps || {} }, '', `#${page}`);
      }
    }

    // Back/forward navigation
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.page) {
        navigate(e.state.page, e.state.props, true);
      } else {
        navigate(auth.value.token ? 'dashboard' : 'login', {}, true);
      }
    });

    // Register initial state
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
      orgLabel, navItems, groupedNavItems, currentPageComponent,
      currentPageTitle, userInitials, orgBadgeClasses, orgAvatarColor,
      mobileMenuOpen,
      navigate, onLogin, logout, showToast,
    };
  },
});
