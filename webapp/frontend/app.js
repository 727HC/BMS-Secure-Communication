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
    const contentType = res.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
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
  { route: 'qr-scan', label: 'QR / NFC', icon: 'qr', section: '도구' },
  { route: 'audit-log', label: '감사 로그', icon: 'audit', section: '도구' },
];

const SIDEBAR_QUICK_LINKS = [
  { key: 'customers', label: '고객/공급사', description: '연결 준비 중', toast: '고객/공급사 화면은 다음 라운드에서 연결합니다.' },
  { key: 'access', label: '접근 제어', description: '권한 설계 준비 중', toast: '접근 제어 화면은 권한 흐름 정리 후 연결합니다.' },
  { key: 'support', label: '지원', description: '가이드 준비 중', toast: '지원 센터는 연결 전입니다. 우선 감사 로그와 작업 화면부터 마감합니다.' },
  { key: 'settings', label: '설정', description: '환경 설정 준비 중', toast: '설정 화면은 아직 연결 전입니다.' },
];

const IA_SECTION_CHIPS = [
  { key: 'overview', label: '개요' },
  { key: 'registry', label: '등록부' },
  { key: 'operations', label: '운영' },
  { key: 'inspection', label: '점검' },
  { key: 'evidence', label: '증빙' },
];

const ROUTE_META = {
  landing: {
    section: 'overview',
    pageTitle: 'BATP',
    shellTitle: 'BATP',
    shellDescription: '배터리 여권 플랫폼의 시작 화면입니다.',
  },
  login: {
    section: 'overview',
    pageTitle: '로그인',
    shellTitle: '접속 준비',
    shellDescription: '사용자 권한을 확인하고 BATP 작업 공간으로 진입합니다.',
  },
  dashboard: {
    section: 'overview',
    pageTitle: '개요',
    shellTitle: '운영 현황',
    shellDescription: '상태, 병목, 최근 변화를 한 화면에서 읽는 운영 개요입니다.',
  },
  passports: {
    section: 'registry',
    pageTitle: '배터리 여권 등록부',
    shellTitle: '등록부',
    shellDescription: '발급, 바인딩, 후속 검토를 한 화면에서 관리합니다.',
  },
  'passport-detail': {
    section: 'registry',
    pageTitle: '기술 문서',
    shellTitle: '기술 문서',
    shellDescription: '식별, 규제, 운영 증빙을 한 화면에서 확인합니다.',
  },
  materials: {
    section: 'registry',
    pageTitle: '원자재 원장',
    shellTitle: '원자재 원장',
    shellDescription: '소재 출처와 인증 근거를 등록부 안에서 추적합니다.',
  },
  maintenance: {
    section: 'operations',
    pageTitle: '정비 운영',
    shellTitle: '정비 운영',
    shellDescription: '정비 요청, 완료 기록, 사고 대응을 운영 docket으로 묶습니다.',
  },
  recycling: {
    section: 'operations',
    pageTitle: '회수 운영',
    shellTitle: '회수 운영',
    shellDescription: '분석, 회수 판정, 추출·폐기 결정을 한 흐름으로 정리합니다.',
  },
  'bmu-data': {
    section: 'inspection',
    pageTitle: '현장 데이터 점검',
    shellTitle: '현장 데이터 점검',
    shellDescription: 'BMU 원천 데이터를 점검 화면에서 확인합니다.',
  },
  'qr-scan': {
    section: 'inspection',
    pageTitle: '식별 스캔',
    shellTitle: '식별 스캔',
    shellDescription: 'QR/NFC 식별로 현장 문서 화면으로 바로 진입합니다.',
  },
  'audit-log': {
    section: 'evidence',
    pageTitle: '감사 기록부',
    shellTitle: '감사 기록부',
    shellDescription: '검증 근거와 행위 이력을 증빙 원장으로 확인합니다.',
  },
};

// Page component map
const PAGE_COMPONENTS = {
  landing: 'landing-page',
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
      : ((hashPage === 'login' || hashPage === 'landing') ? hashPage : 'landing');
    const currentPage = ref(initialPage);
    const initialProps = {};
    if (hashParams.get('passportId')) initialProps.passportId = hashParams.get('passportId');
    window.__pageProps = initialProps;
    const pageProps = ref(initialProps);
    const toasts = ref([]);
    const mobileMenuOpen = ref(false);
    const sidebarQuery = ref('');

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
    const fabricInterval = setInterval(() => { if (auth.value.token) checkFabricStatus(); }, 30000);

    // Notification badges — pending request counts per route
    const navBadges = ref({});
    async function fetchNavBadges() {
      try {
        const data = await api.value.get('/passports');
        const list = data.records || data || [];
        const msp = auth.value.orgMsp;
        const badges = {};
        if (msp === MSP.SERVICE) {
          const serviceCount = list.filter(p => p.status === 'MAINTENANCE').length;
          if (serviceCount > 0) badges['maintenance'] = serviceCount;
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
    const badgeInterval = setInterval(() => { if (auth.value.token) fetchNavBadges(); }, 15000);

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

    const currentPageComponent = computed(() => PAGE_COMPONENTS[currentPage.value] || (auth.value.token ? 'dashboard-page' : 'landing-page'));
    const currentPageMeta = computed(() => ROUTE_META[currentPage.value] || ROUTE_META.dashboard);
    const totalPendingCount = computed(() => (
      Object.values(navBadges.value || {}).reduce((sum, count) => sum + Number(count || 0), 0)
    ));
    const currentNavLabel = computed(() => {
      if (currentPage.value === 'passport-detail') return '여권 상세';
      const item = SIDEBAR_NAV.find((nav) => nav.route === currentPage.value);
      return item ? item.label : currentPageMeta.value.pageTitle || '개요';
    });

    // Current page title in Korean
    const currentPageTitle = computed(() => {
      return currentPageMeta.value.pageTitle || '개요';
    });

    const sidebarSearchHint = computed(() => {
      const query = sidebarQuery.value.trim().toLowerCase();
      if (!query) return '화면 이름으로 바로 이동';
      const navItem = SIDEBAR_NAV.find((item) => item.label.toLowerCase().includes(query));
      if (navItem) return `${navItem.label} 화면으로 이동`;
      const quickItem = SIDEBAR_QUICK_LINKS.find((item) => item.label.toLowerCase().includes(query));
      if (quickItem) return `${quickItem.label} 연결 상태 안내`;
      return '일치하는 메뉴 없음';
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

    function openSidebarUtility(key) {
      const item = SIDEBAR_QUICK_LINKS.find((entry) => entry.key === key);
      if (!item) return;
      showToast('info', item.toast);
    }

    function submitSidebarSearch() {
      const query = sidebarQuery.value.trim().toLowerCase();
      if (!query) return;
      const navItem = SIDEBAR_NAV.find((item) => item.label.toLowerCase().includes(query));
      if (navItem) {
        navigate(navItem.route);
        sidebarQuery.value = '';
        return;
      }
      const quickItem = SIDEBAR_QUICK_LINKS.find((item) => item.label.toLowerCase().includes(query));
      if (quickItem) {
        openSidebarUtility(quickItem.key);
        return;
      }
      showToast('error', '일치하는 화면이 없습니다');
    }

    function navigate(page, navProps, skipHistory) {
      if (!auth.value.token && !['landing', 'login'].includes(page)) {
        currentPage.value = 'landing';
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
        const page = PAGE_COMPONENTS[pg] ? pg : (auth.value.token ? 'dashboard' : 'landing');
        const raw = Object.fromEntries(new URLSearchParams(q || ''));
        const ALLOWED_PROPS = ['passportId', 'tab', 'materialId', 'recordId'];
        const props = {};
        for (const key of ALLOWED_PROPS) {
          if (raw[key]) props[key] = raw[key];
        }
        navigate(page, props, true);
      }
    });

    // Register initial state (preserve full query string for tab persistence)
    const initHash = hashQuery
      ? `#${currentPage.value}?${hashQuery}`
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
      clearInterval(fabricInterval);
      clearInterval(badgeInterval);
      navigate('landing');
    }

    function showToast(type, message) {
      toasts.value.push({ type, message });
      setTimeout(() => toasts.value.shift(), 3000);
    }

    // Expose toast globally
    window.$toast = showToast;

    return {
      auth, currentPage, pageProps, toasts, api, fabricStatus, navBadges,
      IA_SECTION_CHIPS,
      orgLabel, groupedNavItems, currentPageComponent,
      currentPageMeta, currentPageTitle, currentNavLabel, totalPendingCount,
      userInitials, orgBadgeClasses, orgAvatarColor,
      mobileMenuOpen, sidebarQuery, sidebarSearchHint,
      navigate, onLogin, logout, showToast, submitSidebarSearch, openSidebarUtility,
    };
  },
});
