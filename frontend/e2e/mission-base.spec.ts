import { expect, test, type Page } from '@playwright/test';
import { campaign } from '../e2e-base/campaign.fixture';

test.setTimeout(90_000);

const session = {
  accessToken: 'admin-token',
  refreshToken: 'refresh',
  user: {
    id: 'admin-local',
    name: 'Equipe DNMS',
    email: 'admin@dinamus.local',
    roles: ['ADMIN', 'MEMBRO'],
  },
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    (value) => localStorage.setItem('dnms.session', JSON.stringify(value)),
    session,
  );
});

async function openAdmin(page: Page) {
  await page.goto('/admin/base-missionaria', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#module-title')).toHaveText('Base Missionária');
  await expect(page.locator('.mission-admin-stage')).toHaveCount(2);
}

test('undefined goals accept omitted nullable fields from the real API', async ({ page }) => {
  await page.route('**/api/v1/admin/mission-base', (route) =>
    route.fulfill({
      json: {
        ...campaign,
        totalGoalCents: 0,
        totalRaisedCents: 0,
        percent: 0,
        stages: campaign.stages.map(({ remainingCents, updatedAt, updatedBy, ...stage }) => ({
          ...stage,
          goalCents: 0,
          raisedCents: 0,
          percent: 0,
          goalExceeded: false,
        })),
      },
    }),
  );
  await openAdmin(page);
  await expect(page.getByText('Meta em definição (publicado)', { exact: true })).toHaveCount(2);
  await expect(page.getByText('Sem alterações registradas', { exact: true })).toHaveCount(2);
  await expect(page.locator('.mission-stage-editor')).not.toContainText(/NaN|undefined/);
});

test('admin saves two independent fronts, validates negatives and retains audit details', async ({
  page,
}, info) => {
  const requests: unknown[] = [];
  await page.route('**/api/v1/admin/mission-base', async (route) => {
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON();
      requests.push(body);
      expect(body.version).toBe(4);
      expect(body.stages.map((stage: { id: string }) => stage.id)).toEqual([
        'aquisicao',
        'revitalizacao',
      ]);
      expect(body.stages[0]).toMatchObject({
        name: 'Aquisição da Base',
        description: 'Consolidar a propriedade.',
        goalCents: 0,
        raisedCents: 12050,
        sortOrder: 2,
        visible: false,
      });
      await route.fulfill({
        json: {
          ...campaign,
          version: 5,
          stages: campaign.stages.map((stage, index) => ({ ...stage, ...body.stages[index] })),
        },
      });
    } else await route.fulfill({ json: campaign });
  });
  await openAdmin(page);
  await expect(page.getByText('destinado confirmado', { exact: true })).toBeVisible();
  const acquisition = page.getByRole('article', { name: 'aquisicao', exact: true });
  await expect(acquisition).toContainText('admin-test');
  await expect(acquisition).toContainText('150% destinado');
  await acquisition.getByLabel('Destinado confirmado (R$)', { exact: true }).fill('-1');
  await page.getByRole('button', { name: 'Salvar Base Missionária', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Valores negativos');
  expect(requests).toHaveLength(0);
  await acquisition.getByLabel('Título público').fill('Aquisição da Base');
  await acquisition.getByLabel('Propósito').fill('Consolidar a propriedade.');
  await acquisition.getByLabel('Meta da frente (R$)', { exact: true }).fill('');
  await acquisition.getByLabel('Destinado confirmado (R$)', { exact: true }).fill('120.50');
  await acquisition.getByLabel('Ordem', { exact: true }).fill('2');
  await acquisition.getByLabel('Visível na página pública').uncheck();
  await page.getByRole('button', { name: 'Salvar Base Missionária', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('atualizada com sucesso');
  expect(requests).toHaveLength(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await acquisition.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('admin-fronts.png') });
});

test('concurrent edit keeps drafts, blocks stale save and reloads only after confirmation', async ({
  page,
}) => {
  let version = 4;
  await page.route('**/api/v1/admin/mission-base', async (route) => {
    if (route.request().method() === 'PUT') {
      version = 5;
      await route.fulfill({
        status: 409,
        json: { code: 'STALE_VERSION', message: 'Recarregue os dados.' },
      });
    } else await route.fulfill({ json: { ...campaign, version } });
  });
  await openAdmin(page);
  const title = page.getByLabel('Título', { exact: true });
  await title.fill('Minha edição ainda não enviada');
  const save = page.getByRole('button', { name: 'Salvar Base Missionária', exact: true });
  await save.click();
  await expect(page.getByRole('status')).toContainText('Outra pessoa alterou');
  await expect(title).toHaveValue('Minha edição ainda não enviada');
  await expect(save).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Zerar destinações' })).toBeDisabled();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Recarregar dados' }).click();
  await expect(title).toHaveValue(campaign.title);
  await expect(save).toBeEnabled();
});

test('reset requires confirmation and carries the published version', async ({ page }) => {
  let resetCalls = 0;
  await page.route('**/api/v1/admin/mission-base', (route) => route.fulfill({ json: campaign }));
  await page.route('**/api/v1/admin/mission-base/reset', async (route) => {
    resetCalls++;
    expect(route.request().postDataJSON()).toEqual({ confirmation: 'ZERAR', version: 4 });
    await route.fulfill({
      json: {
        ...campaign,
        version: 5,
        totalRaisedCents: 0,
        stages: campaign.stages.map((stage) => ({
          ...stage,
          raisedCents: 0,
          percent: 0,
          remainingCents: stage.goalCents,
        })),
      },
    });
  });
  await openAdmin(page);
  const reset = page.getByRole('button', { name: 'Zerar destinações' });
  await reset.click();
  await expect(page.getByRole('status')).toContainText('Digite ZERAR');
  expect(resetCalls).toBe(0);
  await page.getByLabel('Digite ZERAR para confirmar').fill('ZERAR');
  await reset.click();
  await expect(page.getByRole('status')).toContainText('histórico foram preservados');
  expect(resetCalls).toBe(1);
});
