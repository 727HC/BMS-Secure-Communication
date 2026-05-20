const { test, expect } = require('@playwright/test');

const BASE = process.env.PW_BASE_URL || 'http://127.0.0.1:4173';

const VALID_REASON = '2026-05-20 펌웨어 업데이트 후 BMU 보드 재부팅으로 FC 카운터가 리셋되어 재동기화가 필요합니다.';

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function installBaseMocks(page) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();

    if (path === '/api/status') {
      return json(route, { fabric: 'connected', channel: 'passportchannel', contract: 'passport-contract', org: 'ManufacturerMSP' });
    }
    if (path === '/api/bmu/reset-fc' && method === 'POST') {
      return json(route, { success: true, did: 'did:web:bms:test-e2e-01', status: 'FC_RESET' });
    }
    return json(route, { ok: true });
  });
}

async function bootstrapAs(page, orgMsp) {
  await installBaseMocks(page);
  await page.addInitScript((org) => {
    sessionStorage.setItem('auth_token', 'mock-token-e2e');
    sessionStorage.setItem('auth_userId', 'e2e.operator');
    sessionStorage.setItem('auth_org', org);
  }, orgMsp);
}

// C4: Manufacturer happy path — 사이드바 "운영" 노출 → form → submit → 성공
test.describe('Cycle 03 — BMU Operations / C4 Happy Path (Manufacturer)', () => {
  test('Manufacturer sees 운영 in sidebar, fills form, submits, sees success', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await bootstrapAs(page, 'ManufacturerMSP');
    await page.goto(`${BASE}/#/bmu-operations`, { waitUntil: 'domcontentloaded' });

    // 사이드바 "운영" 섹션 노출 확인
    await expect(page.getByText('운영', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('BMU 운영')).toBeVisible();

    // 페이지 진입 확인
    await expect(page.getByText('FC 재동기화')).toBeVisible();

    // DID 입력
    await page.getByLabel('대상 DID').fill('did:web:bms:test-e2e-01');
    await page.getByLabel('DID 다시 입력 (오타 방지)').fill('did:web:bms:test-e2e-01');

    // 사유 입력 (50자 이상)
    await page.getByLabel(/사유/).fill(VALID_REASON);

    // 확인 체크박스
    await page.getByLabel(/본 작업이 chaincode lastFc를 초기화하고/).check();

    // submit 버튼 활성화 확인 후 클릭
    const submitBtn = page.getByRole('button', { name: /FC 재동기화 실행/ });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // 성공 메시지
    await expect(page.getByText(/재동기화 완료/)).toBeVisible();

    await page.screenshot({ path: 'screenshots/c03_bmu_ops_happy_path.png', fullPage: true });
    expect(errors).toEqual([]);
  });
});

// C5: Service RBAC — 사이드바 "운영" 미노출, /bmu-operations 직접 → /dashboard 리다이렉트
test.describe('Cycle 03 — BMU Operations / C5 RBAC (Service redirect)', () => {
  test('Service org does not see 운영 in sidebar and is redirected from /bmu-operations', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await bootstrapAs(page, 'ServiceMSP');
    await page.goto(`${BASE}/#/dashboard`, { waitUntil: 'domcontentloaded' });

    // 사이드바에 "운영" 섹션 미노출
    await expect(page.getByText('BMU 운영')).not.toBeVisible();

    // /bmu-operations 직접 접근 → /dashboard 리다이렉트
    await page.goto(`${BASE}/#/bmu-operations`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/#\/dashboard/);

    await page.screenshot({ path: 'screenshots/c03_bmu_ops_rbac_service.png', fullPage: true });
    expect(errors).toEqual([]);
  });
});
