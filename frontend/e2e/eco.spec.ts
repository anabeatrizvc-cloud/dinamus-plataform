import { expect, test } from '@playwright/test';

const lesson = { id: 'eco-2026-08-25', title: 'Aula', lessonDate: '2026-08-25' };
const photoDataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const session = {
  accessToken: 'admin-token',
  refreshToken: 'refresh',
  user: { id: 'admin-local', name: 'Equipe DNMS', email: 'admin@dinamus.local', roles: ['ADMIN', 'MEMBRO'] },
};

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  await expect(page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).resolves.toBe(true);
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/eco/lesson', async (route) => route.fulfill({ json: lesson }));
});

test('hidden Eco QR page points to the attendance flow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/eco', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: /presença da aula/i })).toBeVisible();
  await expect(page.getByText('Aula - 25/08/2026')).toBeVisible();
  await expect(page.getByRole('img', { name: /qr code/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /abrir presença/i })).toHaveAttribute('href', /\/eco\/presenca\?data=2026-08-25/);
  await expectNoHorizontalOverflow(page);
});

test('Eco attendance form sends name phone and selfie to backend', async ({ page }) => {
  let posted = false;
  await page.route('**/api/v1/eco/attendance', async (route) => {
    posted = true;
    const body = route.request().postDataJSON();
    expect(body.name).toBe('Aluno Eco');
    expect(body.phone).toContain('99949');
    expect(body.lessonDate).toBe('2026-08-25');
    expect(body.photoDataUrl).toMatch(/^data:image\/jpeg;base64,/);
    await route.fulfill({ status: 201, json: { id: 'att-01', lessonId: lesson.id, ...body, status: 'PENDING', createdAt: new Date().toISOString(), validatedAt: '' } });
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/eco/presenca?data=2026-08-25', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Nome completo').fill('Aluno Eco');
  await page.getByLabel('Celular com DDD').fill('81999499159');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'selfie.png',
    mimeType: 'image/png',
    buffer: Buffer.from(photoDataUrl.split(',')[1], 'base64'),
  });
  await page.getByRole('button', { name: /usar foto/i }).click();
  await page.getByRole('button', { name: /confirmar presença/i }).click();

  await expect(page.getByRole('status')).toContainText('Presença enviada');
  expect(posted).toBe(true);
  await expectNoHorizontalOverflow(page);
});

test('admin can open Eco lesson, inspect selfie and validate attendance', async ({ page }) => {
  let validationHit = false;
  const attendance = {
    id: 'att-01',
    lessonId: lesson.id,
    lessonDate: lesson.lessonDate,
    name: 'Aluno Eco',
    phone: '(81) 99949-9159',
    photoDataUrl,
    status: 'PENDING',
    createdAt: '2026-08-25T13:00:00Z',
    validatedAt: '',
  };

  await page.addInitScript((value) => localStorage.setItem('dnms.session', JSON.stringify(value)), session);
  await page.route('**/api/v1/admin/eco/lessons', async (route) => route.fulfill({ json: [lesson] }));
  await page.route('**/api/v1/admin/eco/lessons/eco-2026-08-25/attendances', async (route) => route.fulfill({ json: [attendance] }));
  await page.route('**/api/v1/admin/eco/lessons/eco-2026-08-25/attendances/att-01/validation', async (route) => {
    validationHit = true;
    const body = route.request().postDataJSON();
    await route.fulfill({ json: { ...attendance, status: body.validated ? 'VALIDATED' : 'REJECTED', validatedAt: '2026-08-25T13:10:00Z' } });
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/admin/eco', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Eco' })).toBeVisible();
  await expect(page.getByRole('button', { name: /aula - 25\/08\/2026/i })).toBeVisible();
  await expect(page.getByText('Aluno Eco')).toBeVisible();

  await page.getByRole('button', { name: /ver selfie/i }).click();
  await expect(page.getByRole('dialog', { name: /selfie enviada/i })).toBeVisible();
  await page.getByRole('button', { name: /fechar foto/i }).click();

  await page.getByRole('button', { name: 'Validar presença', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Presença validada');
  expect(validationHit).toBe(true);
  await expectNoHorizontalOverflow(page);
});
