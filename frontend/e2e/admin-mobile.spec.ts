import { expect, test } from '@playwright/test';

test.setTimeout(60_000);

const session = {
  accessToken: 'admin-token',
  refreshToken: 'refresh',
  user: { id: 'admin-local', name: 'Equipe DNMS', email: 'admin@dinamus.local', roles: ['ADMIN', 'MEMBRO'] },
};

const members = [
  { id: 'admin-01', name: 'Ana Beatriz da Silva Albuquerque', phone: '81999990002', email: 'ana.beatriz.albuquerque@dinamus.local', roles: ['MEMBRO', 'ADMIN'], active: true, invitePending: false, setupToken: '' },
  { id: 'membro-02', name: 'Visitante com Nome Muito Comprido Para Testar Layout', phone: '81999990003', email: 'visitante.com.email.grande@dinamus.local', roles: ['MEMBRO'], active: true, invitePending: true, setupToken: 'token-longo-de-convite-para-validar-quebra-de-linha' },
];

async function mockAdminApi(page: import('@playwright/test').Page) {
  await page.route('**/api/v1/admin/events', async (route) =>
    route.fulfill({
      json: [
        {
          id: 'event-01',
          name: 'Conferência DNMS com Nome Comprido',
          startsAt: '2026-09-10',
          endsAt: '2026-09-12',
          registrationUrl: 'https://dinamus.recife/eventos/conferencia-com-link-bem-comprido',
        },
      ],
    }),
  );
  await page.route('**/api/v1/admin/members', async (route) => route.fulfill({ json: members }));
}

async function expectNoAdminOverflow(page: import('@playwright/test').Page) {
  await expect(page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).resolves.toBe(true);
  const offenders = await page.locator('main, header, section, form, article, input, textarea, select, button, .surface').evaluateAll((elements) => {
    const viewportWidth = document.documentElement.clientWidth;
    return elements
      .filter((element) => !element.closest('.admin-topbar nav'))
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && (rect.left < -1 || rect.right > viewportWidth + 1);
      })
      .slice(0, 8)
      .map((element) => `${element.tagName.toLowerCase()}.${(element as HTMLElement).className}`);
  });
  expect(offenders).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript((value) => localStorage.setItem('dnms.session', JSON.stringify(value)), session);
  await mockAdminApi(page);
});

test('admin final stays polished on narrow mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /painel da igreja/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /cursos/i })).toHaveCount(0);
  await expectNoAdminOverflow(page);

  await page.getByRole('navigation', { name: /navegação administrativa/i }).getByRole('link', { name: 'Eventos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Eventos' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Conferência DNMS com Nome Comprido' })).toBeVisible();
  await expectNoAdminOverflow(page);

  await page.getByRole('navigation', { name: /navegação administrativa/i }).getByRole('link', { name: 'Membros', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Membros' })).toBeVisible();
  await expect(page.getByText('Visitante com Nome Muito Comprido')).toBeVisible();
  await expectNoAdminOverflow(page);
});

test('removed courses routes redirect away from admin', async ({ page }) => {
  await page.goto('/admin/cursos', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await expect(page.getByRole('heading', { name: /painel da igreja/i })).toBeVisible();

  await page.goto('/cursos', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/$/);
});
