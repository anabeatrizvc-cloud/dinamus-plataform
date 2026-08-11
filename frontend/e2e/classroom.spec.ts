import { expect, test } from '@playwright/test';

const dashboard = {
  courses: [
    {
      id: 'curso-fundamentos',
      title: 'Fundamentos DNMS',
      description: 'Formacao essencial para novos membros.',
      startsAt: '2026-08-20',
      endsAt: '2026-10-20',
      status: 'OPEN',
    },
  ],
  enrolledDisciplines: [
    {
      id: 'disc-doutrina',
      courseId: 'curso-fundamentos',
      title: 'Doutrina e vida crista',
      description: 'Fundamentos da fe e servico.',
      teacherIds: ['professor-demo'],
      maxAbsences: 2,
      usesGrades: true,
    },
  ],
  teachingDisciplines: [
    {
      id: 'disc-doutrina',
      courseId: 'curso-fundamentos',
      title: 'Doutrina e vida crista',
      description: 'Fundamentos da fe e servico.',
      teacherIds: ['professor-demo'],
      maxAbsences: 2,
      usesGrades: true,
    },
  ],
};

const workspace = {
  course: dashboard.courses[0],
  discipline: dashboard.enrolledDisciplines[0],
  students: [{ id: 'aluno-demo', name: 'Ana Beatriz', phone: '81999992222', email: 'aluno@dinamus.local', roles: ['MEMBRO'], active: true, invitePending: false, setupToken: '' }],
  lessons: [{ id: 'lesson-01', disciplineId: 'disc-doutrina', title: 'Identidade e familia espiritual', lessonDate: '2026-08-20', attendanceToken: '', attendanceTokenExpiresAt: '' }],
  materials: [{ id: 'material-01', disciplineId: 'disc-doutrina', lessonId: 'lesson-01', title: 'Guia da aula 1', url: 'https://dinamus.recife/materiais/guia' }],
  evaluations: [{ id: 'eval-01', disciplineId: 'disc-doutrina', title: 'Resumo aplicado', weight: 1, maxScore: 10 }],
  grades: [{ id: 'grade-01', evaluationId: 'eval-01', studentId: 'aluno-demo', score: 8.5 }],
  attendance: [],
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'dnms.session',
      JSON.stringify({
        accessToken: 'test-token',
        refreshToken: 'refresh',
        user: { id: 'professor-demo', name: 'Prof. Rafael', email: 'professor@dinamus.local', roles: ['PROFESSOR', 'MEMBRO'] },
      }),
    );
  });
  await page.route('**/api/v1/classroom', async (route) => route.fulfill({ json: dashboard }));
  await page.route('**/api/v1/classroom/disciplines/disc-doutrina', async (route) => route.fulfill({ json: workspace }));
  await page.route('**/api/v1/classroom/teacher/lessons/lesson-01/attendance-token', async (route) =>
    route.fulfill({ json: { ...workspace.lessons[0], attendanceToken: 'qr-token', attendanceTokenExpiresAt: '2026-09-01T12:00:00Z' } }),
  );
});

test('renders classroom workspace and QR action responsively', async ({ page }) => {
  await page.goto('/cursos', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: /cursos, disciplinas e presença/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /doutrina e vida crista/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /doutrina e vida crista/i })).toBeVisible();
  await expect(page.locator('.student-row').filter({ hasText: 'Ana Beatriz' })).toBeVisible();

  await page.getByRole('button', { name: /gerar qr/i }).click();
  await expect(page.getByRole('img', { name: /qr code de presença/i })).toBeVisible();
});
