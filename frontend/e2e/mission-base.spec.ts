import { expect, test } from '@playwright/test';

test.setTimeout(60_000);

const campaign = {
  id: 'current',
  title: 'Um lugar para o avanço do Reino.',
  description: 'Estamos construindo uma base missionária para servir, alcançar e transformar vidas através do Evangelho.',
  active: true,
  totalGoalCents: 6000000,
  totalRaisedCents: 1800000,
  percent: 30,
  goalExceeded: false,
  updatedAt: '2026-09-12T12:00:00Z',
  stages: [
    {
      id: 'aquisicao',
      name: 'Aquisição',
      description: 'Aquisição do espaço destinado à Base Missionária.',
      goalCents: 3000000,
      raisedCents: 1800000,
      percent: 60,
      goalExceeded: false,
      status: 'EM_ANDAMENTO',
      icon: 'key',
      sortOrder: 1,
      current: true,
      visible: true,
    },
    {
      id: 'reforma',
      name: 'Reforma',
      description: 'Adequação da estrutura existente para servir pessoas com excelência.',
      goalCents: 2000000,
      raisedCents: 0,
      percent: 0,
      goalExceeded: false,
      status: 'EM_BREVE',
      icon: 'tool',
      sortOrder: 2,
      current: false,
      visible: true,
    },
    {
      id: 'construcao',
      name: 'Construção',
      description: 'Construção e finalização dos ambientes necessários para a missão.',
      goalCents: 1000000,
      raisedCents: 0,
      percent: 0,
      goalExceeded: false,
      status: 'EM_BREVE',
      icon: 'building',
      sortOrder: 3,
      current: false,
      visible: true,
    },
  ],
};

const session = {
  accessToken: 'admin-token',
  refreshToken: 'refresh',
  user: { id: 'admin-local', name: 'Equipe DNMS', email: 'admin@dinamus.local', roles: ['ADMIN', 'MEMBRO'] },
};

async function expectNoOverflow(page: import('@playwright/test').Page) {
  await expect(page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).resolves.toBe(true);
}

test('public mission base generates static pix without changing progress', async ({ page }) => {
  let pixHit = false;
  await page.route('**/api/v1/mission-base', async (route) => route.fulfill({ json: campaign }));
  await page.route('**/api/v1/mission-base/pix', async (route) => {
    pixHit = true;
    const body = route.request().postDataJSON();
    expect(body.stageId).toBe('reforma');
    expect(body.amountCents).toBe(12345);
    await route.fulfill({
      json: {
        stageId: 'reforma',
        stageName: 'Reforma',
        amountCents: 12345,
        txid: 'REFORMA20260912ABCD1234',
        pixPayload: '00020101021226580014BR.GOV.BCB.PIX0136pix@dinamus.local5204000053039865406123.455802BR5919IGREJA DINAMUS REC6006RECIFE62280524REFORMA20260912ABCD12346304ABCD',
      },
    });
  });

  await page.goto('/base-missionaria', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /um lugar para o avanço do reino/i })).toBeVisible();
  await expect(page.getByText('30%')).toBeVisible();
  await page.getByRole('button', { name: /contribuir agora/i }).click();
  await page.getByRole('button', { name: /reforma/i }).click();
  await page.getByLabel('Outro valor').fill('123,45');
  await page.getByRole('button', { name: /gerar pix/i }).click();

  await expect(page.getByAltText(/qr code pix/i)).toBeVisible();
  await expect(page.getByText(/txid reforma/i)).toBeVisible();
  expect(pixHit).toBe(true);
  await expectNoOverflow(page);
});

test('admin mission base edits campaign on mobile without horizontal overflow', async ({ page }) => {
  let putHit = false;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((value) => localStorage.setItem('dnms.session', JSON.stringify(value)), session);
  await page.route('**/api/v1/admin/mission-base', async (route) => {
    if (route.request().method() === 'PUT') {
      putHit = true;
      await route.fulfill({ json: campaign });
      return;
    }
    await route.fulfill({ json: campaign });
  });

  await page.goto('/admin/base-missionaria', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#module-title')).toHaveText('Base Missionária');
  await expect(page.getByText('arrecadado', { exact: true })).toBeVisible();
  await page.getByLabel('Título').fill('Um lugar para o avanço do Reino.');
  await page.getByRole('button', { name: /salvar base missionária/i }).click();

  await expect(page.getByRole('status')).toContainText('Base Missionária atualizada');
  expect(putHit).toBe(true);
  await expectNoOverflow(page);
});
