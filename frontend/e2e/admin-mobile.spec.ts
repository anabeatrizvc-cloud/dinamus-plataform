import { expect, test } from '@playwright/test';

const session = {
  accessToken: 'admin-token',
  refreshToken: 'refresh',
  user: { id: 'admin-local', name: 'Equipe DNMS', email: 'admin@dinamus.local', roles: ['ADMIN', 'MEMBRO'] },
};

const members = [
  { id: 'prof-01', name: 'Pr. Rafael com Nome Bem Grande', phone: '81999990001', email: 'professor.longo@dinamus.local', roles: ['MEMBRO', 'PROFESSOR'], active: true, invitePending: false, setupToken: '' },
  { id: 'aluno-01', name: 'Ana Beatriz da Silva Albuquerque', phone: '81999990002', email: 'ana.beatriz.albuquerque@dinamus.local', roles: ['MEMBRO'], active: true, invitePending: true, setupToken: 'token-longo-de-convite-para-validar-quebra-de-linha' },
];

const courses = [
  { id: 'curso-01', title: 'Escola de Liderança e Serviço Cristão', description: 'Formação para líderes, voluntários e professores.', startsAt: '2026-09-01', endsAt: '2026-11-30', status: 'OPEN' },
];

const disciplines = [
  { id: 'disc-01', courseId: 'curso-01', title: 'Cuidado, discipulado e acompanhamento pastoral', description: 'Acompanhamento pastoral.', teacherIds: ['prof-01'], maxAbsences: 2, usesGrades: false },
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
  await page.route('**/api/v1/admin/academic/courses', async (route) => route.fulfill({ json: courses }));
  await page.route('**/api/v1/admin/academic/disciplines', async (route) => route.fulfill({ json: disciplines }));
  await page.route('**/api/v1/admin/academic/reports/attendance?**', async (route) =>
    route.fulfill({
      json: [{ studentId: 'aluno-01', studentName: members[1].name, presences: 3, absences: 1, frequencyPercent: 75, situation: 'Dentro do limite' }],
    }),
  );
}

async function expectNoAdminOverflow(page: import('@playwright/test').Page) {
  await expect(page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).resolves.toBe(true);
  const offenders = await page.locator('main, header, section, form, article, input, textarea, select, button, .surface').evaluateAll((elements) => {
    const viewportWidth = document.documentElement.clientWidth;
    return elements
      .filter((element) => !element.closest('.admin-topbar nav, .academic-switcher'))
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

test('admin modules stay composed on narrow mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('/admin/eventos', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Eventos' })).toBeVisible();
  await expectNoAdminOverflow(page);

  await page.getByRole('link', { name: 'Membros' }).click();
  await expect(page.getByRole('heading', { name: 'Membros' })).toBeVisible();
  await expectNoAdminOverflow(page);

  await page.getByRole('link', { name: 'Cursos' }).click();
  await expect(page.getByRole('heading', { name: 'Cursos' })).toBeVisible();
  await expectNoAdminOverflow(page);

  await page.getByRole('button', { name: 'Disciplinas', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Escola de Liderança e Serviço Cristão' })).toBeVisible();
  await expectNoAdminOverflow(page);

  await page.getByRole('button', { name: 'Relatórios', exact: true }).click();
  await page.getByRole('button', { name: /gerar prévia/i }).click();
  await expect(page.getByText('Dentro do limite')).toBeVisible();
  await expectNoAdminOverflow(page);
});
