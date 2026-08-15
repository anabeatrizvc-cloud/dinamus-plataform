import { expect, test } from '@playwright/test';

const members = [
  { id: 'prof-01', name: 'Pr. Rafael', phone: '81999990001', email: 'prof@dinamus.local', roles: ['MEMBRO', 'PROFESSOR'], active: true, invitePending: false, setupToken: '' },
  { id: 'aluno-01', name: 'Ana Beatriz', phone: '81999990002', email: 'ana@dinamus.local', roles: ['MEMBRO'], active: true, invitePending: false, setupToken: '' },
];

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

test('admin creates course and discipline without layout overflow', async ({ page }) => {
  let courses = [
    { id: 'curso-01', title: 'Escola de Lideranca', description: 'Formacao para lideres.', startsAt: '2026-09-01', endsAt: '2026-11-30', status: 'OPEN' },
  ];
  let disciplines = [
    { id: 'disc-01', courseId: 'curso-01', title: 'Cuidado e discipulado', description: 'Acompanhamento pastoral.', teacherIds: ['prof-01'], maxAbsences: 2, usesGrades: false },
  ];

  await page.route('**/api/v1/admin/members', async (route) => route.fulfill({ json: members }));
  await page.route('**/api/v1/admin/academic/courses', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      const saved = { id: 'curso-novo', ...body };
      courses = [...courses, saved];
      await route.fulfill({ json: saved });
      return;
    }
    await route.fulfill({ json: courses });
  });
  await page.route('**/api/v1/admin/academic/disciplines', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      const saved = { id: 'disc-nova', ...body };
      disciplines = [...disciplines, saved];
      await route.fulfill({ json: saved });
      return;
    }
    await route.fulfill({ json: disciplines });
  });

  await page.goto('/admin/cursos', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Cursos' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Escola de Lideranca' })).toBeVisible();

  await page.getByLabel('Nome do curso').fill('Escola de Servico');
  await page.getByLabel('Descrição').fill('Formacao para voluntarios');
  await page.getByLabel('Início').fill('2026-10-01');
  await page.getByRole('button', { name: /criar curso/i }).click();

  await expect(page.getByRole('button', { name: 'Disciplinas', exact: true })).toHaveClass(/active/);
  await expect(page.getByLabel('Disciplinas cadastradas').getByRole('heading', { name: 'Escola de Servico' })).toBeVisible();

  await page.getByLabel('Nome da disciplina').fill('Serviço e cuidado');
  await page.getByLabel('Professor').selectOption('prof-01');
  await page.getByRole('button', { name: /criar disciplina/i }).click();

  await expect(page.locator('.discipline-card').filter({ hasText: 'Serviço e cuidado' })).toBeVisible();
  await expect(page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)).resolves.toBe(false);
});
