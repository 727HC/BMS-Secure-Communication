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

// Retry helper for MVCC_READ_CONFLICT (Fabric concurrent write conflicts)
async function retryOnConflict(fn, maxRetries = 3, delayMs = 1500) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (e.message && e.message.includes('MVCC_READ_CONFLICT') && i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, delayMs));
        continue;
      }
      throw e;
    }
  }
}

// ===== Shared constants (used across all pages) =====

// Scaling constants for BMU raw data
const SOC_SCALE_DIVISOR = 655.35;
const TEMP_SCALE_DIVISOR = 1310.7;

function scaleSOC(val) {
  if (val == null) return 0;
  const n = Number(val);
  return n > 100 ? +(n / SOC_SCALE_DIVISOR).toFixed(1) : +n.toFixed(1);
}
function scaleTemp(val) {
  if (val == null) return 0;
  const n = Number(val);
  return n > 100 ? +(n / TEMP_SCALE_DIVISOR).toFixed(1) : +n.toFixed(1);
}

// MSP constants
const MSP = {
  MANUFACTURER: 'ManufacturerMSP',
  EV_MANUFACTURER: 'EVManufacturerMSP',
  SERVICE: 'ServiceMSP',
  REGULATOR: 'RegulatorMSP',
};

// Status constants + config (shared across all pages)
const STATUS_LIST = ['MANUFACTURED', 'ACTIVE', 'MAINTENANCE', 'ANALYSIS', 'RECYCLING', 'DISPOSED'];

const STATUS_LABELS = {
  MANUFACTURED: '제조완료', ACTIVE: '운행중', MAINTENANCE: '정비중',
  ANALYSIS: '분석중', RECYCLING: '재활용', DISPOSED: '폐기',
};

const STATUS_CONFIG = {
  MANUFACTURED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500', label: '제조완료' },
  ACTIVE:       { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', label: '운행중' },
  MAINTENANCE:  { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', label: '정비중' },
  ANALYSIS:     { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500', label: '분석중' },
  RECYCLING:    { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500', label: '재활용' },
  DISPOSED:     { bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-300', dot: 'bg-slate-400', label: '폐기' },
};

function getStatusBadge(status) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.DISPOSED;
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
  { route: 'materials', label: '원자재', icon: 'chain', section: '관리' },
  { route: 'bmu-data', label: '배터리 데이터', icon: 'pulse', section: '모니터링' },
  { route: 'maintenance', label: '정비/서비스', icon: 'wrench', section: '운영' },
  { route: 'recycling', label: '재활용', icon: 'recycle', section: '운영' },
  { route: 'qr-scan', label: 'QR 스캔', icon: 'qr', section: '도구' },
  { route: 'audit-log', label: '감사 로그', icon: 'audit', section: '도구' },
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
  'qr-scan': 'qr-scan-page',
  'audit-log': 'audit-log-page',
};

const app = createApp({
  setup() {
    const auth = ref({
      token: localStorage.getItem('bp_token') || null,
      userId: localStorage.getItem('bp_userId') || null,
      orgMsp: localStorage.getItem('bp_orgMsp') || null,
    });

    // Restore page from URL hash on refresh (supports #passport-detail?passportId=XXX)
    const rawHash = window.location.hash.replace('#', '');
    const [hashPage, hashQuery] = rawHash.split('?');
    const hashParams = new URLSearchParams(hashQuery || '');
    const initialPage = auth.value.token
      ? (hashPage && PAGE_COMPONENTS[hashPage] ? hashPage : 'dashboard')
      : 'login';
    const currentPage = ref(initialPage);
    const initialProps = {};
    if (hashParams.get('passportId')) initialProps.passportId = hashParams.get('passportId');
    window.__pageProps = initialProps;
    const pageProps = ref(initialProps);
    const toasts = ref([]);
    const mobileMenuOpen = ref(false);

    const api = computed(() => createApi(auth.value));

    // Fabric connection status (polled from /api/status)
    const fabricStatus = ref('checking');
    async function checkFabricStatus() {
      try {
        const data = await api.value.get('/status');
        fabricStatus.value = data.fabric || 'connected';
      } catch {
        fabricStatus.value = 'disconnected';
      }
    }
    if (auth.value.token) checkFabricStatus();
    setInterval(() => { if (auth.value.token) checkFabricStatus(); }, 30000);

    // Notification badges — pending request counts per route
    const navBadges = ref({});
    async function fetchNavBadges() {
      try {
        const data = await api.value.get('/passports');
        const list = data.records || data || [];
        const msp = auth.value.orgMsp;
        const badges = {};
        if (msp === MSP.SERVICE) {
          const maintCount = list.filter(p => p.status === 'MAINTENANCE').length;
          const analysisCount = list.filter(p => p.status === 'ANALYSIS').length;
          if (maintCount > 0) badges['maintenance'] = maintCount;
          if (analysisCount > 0) badges['maintenance'] = (badges['maintenance'] || 0) + analysisCount;
        }
        if (msp === MSP.REGULATOR) {
          const recycleCount = list.filter(p => p.recycleAvailable && p.status !== 'DISPOSED').length;
          if (recycleCount > 0) badges['recycling'] = recycleCount;
        }
        if (msp === MSP.EV_MANUFACTURER) {
          const activeCount = list.filter(p => p.status === 'ACTIVE' && p.vin).length;
          if (activeCount > 0) badges['maintenance'] = activeCount;
        }
        navBadges.value = badges;
      } catch (e) { console.warn('fetchNavBadges error:', e.message); }
    }
    if (auth.value.token) fetchNavBadges();
    setInterval(() => { if (auth.value.token) fetchNavBadges(); }, 15000);

    const orgLabel = computed(() => MSP_LABELS[auth.value.orgMsp] || auth.value.orgMsp);

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
        case MSP.MANUFACTURER: return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        case MSP.EV_MANUFACTURER: return 'bg-purple-50 text-purple-700 border-purple-200';
        case MSP.SERVICE: return 'bg-amber-50 text-amber-700 border-amber-200';
        case MSP.REGULATOR: return 'bg-teal-50 text-teal-700 border-teal-200';
        default: return 'bg-gray-50 text-gray-600 border-gray-200';
      }
    });

    // Org avatar background color
    const orgAvatarColor = computed(() => {
      switch (auth.value.orgMsp) {
        case MSP.MANUFACTURER: return 'bg-emerald-600';
        case MSP.EV_MANUFACTURER: return 'bg-purple-600';
        case MSP.SERVICE: return 'bg-amber-600';
        case MSP.REGULATOR: return 'bg-teal-600';
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
        let hashUrl = `#${page}`;
        if (navProps && navProps.passportId) hashUrl += `?passportId=${encodeURIComponent(navProps.passportId)}`;
        history.pushState({ page, props: navProps || {} }, '', hashUrl);
      }
      fetchNavBadges();
    }

    // Back/forward navigation
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.page) {
        navigate(e.state.page, e.state.props, true);
      } else {
        // Fallback: parse hash for page & props (B-2 fix)
        const hash = window.location.hash.replace('#', '');
        const [pg, q] = hash.split('?');
        const page = PAGE_COMPONENTS[pg] ? pg : (auth.value.token ? 'dashboard' : 'login');
        const props = Object.fromEntries(new URLSearchParams(q || ''));
        navigate(page, props, true);
      }
    });

    // Register initial state (include initialProps for passport-detail refresh)
    const initHash = initialProps.passportId
      ? `#${currentPage.value}?passportId=${encodeURIComponent(initialProps.passportId)}`
      : `#${currentPage.value}`;
    history.replaceState({ page: currentPage.value, props: initialProps }, '', initHash);

    function onLogin(data) {
      auth.value = { token: data.token, userId: data.userId, orgMsp: data.mspId };
      localStorage.setItem('bp_token', data.token);
      localStorage.setItem('bp_userId', data.userId);
      localStorage.setItem('bp_orgMsp', data.mspId);
      showToast('success', `${data.userId}님 환영합니다`);
      navigate('dashboard');
      checkFabricStatus();
      setTimeout(fetchNavBadges, 1000);
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
      auth, currentPage, pageProps, toasts, api, fabricStatus, navBadges,
      orgLabel, groupedNavItems, currentPageComponent,
      currentPageTitle, userInitials, orgBadgeClasses, orgAvatarColor,
      mobileMenuOpen,
      navigate, onLogin, logout, showToast,
    };
  },
});
