import { expect, test } from '@playwright/test';

test.setTimeout(60_000);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'dnms.session',
      JSON.stringify({
        accessToken: 'admin-token',
        refreshToken: 'refresh',
        user: { id: 'admin-local', name: 'Equipe DNMS', email: 'admin@dinamus.local', roles: ['ADMIN', 'MEMBRO'] },
      }),
    );
  });
});

test('admin switches modules and creates event through backend route', async ({ page }) => {
  let events = [
    { id: 'event-01', name: 'Culto Especial', startsAt: '2026-09-10', endsAt: '', registrationUrl: 'https://dinamus.recife/eventos/culto' },
  ];
  let postHit = false;

  await page.route('**/api/v1/admin/members', async (route) => route.fulfill({ json: [] }));
  await page.route('**/api/v1/admin/events', async (route) => {
    if (route.request().method() === 'POST') {
      postHit = true;
      const body = route.request().postDataJSON();
      const saved = { id: 'event-new', ...body };
      events = [...events, saved];
      await route.fulfill({ json: saved });
      return;
    }
    await route.fulfill({ json: events });
  });

  await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /painel da igreja/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /cursos/i })).toHaveCount(0);

  await page.getByRole('navigation', { name: /navegação administrativa/i }).getByRole('link', { name: 'Eventos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Eventos' })).toBeVisible();

  await page.getByLabel('Nome do evento').fill('Conferência DNMS');
  await page.getByLabel('Data de início').fill('2026-10-12');
  await page.getByLabel('Link de inscrição').fill('https://dinamus.recife/eventos/conferencia');
  await page.getByRole('button', { name: /criar evento/i }).click();

  await expect(page.getByRole('status')).toContainText('Evento criado');
  await expect(page.getByRole('heading', { name: 'Conferência DNMS' })).toBeVisible();
  expect(postHit).toBe(true);
  await expect(page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)).resolves.toBe(false);
});
