import { expect, test } from '@playwright/test';

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  await expect(page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).resolves.toBe(true);

  const offenders = await page.locator('main, section, form, label, input, button, a').evaluateAll((elements) => {
    const viewportWidth = document.documentElement.clientWidth;

    return elements
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && (rect.left < -1 || rect.right > viewportWidth + 1);
      })
      .map((element) => `${element.tagName.toLowerCase()}.${(element as HTMLElement).className}`)
      .slice(0, 6);
  });

  expect(offenders).toEqual([]);
}

test('login page keeps a polished form layout on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Senha', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
  await page.getByRole('button', { name: /mostrar senha/i }).click();
  await expect(page.getByLabel('Senha', { exact: true })).toHaveAttribute('type', 'text');
  await expect(page.getByRole('link', { name: /voltar para o site/i })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('login page remains balanced on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/login', { waitUntil: 'domcontentloaded' });

  const card = page.locator('.auth-card');
  await expect(card).toBeVisible();
  await expect(card).toHaveCSS('display', 'grid');
  await expect(page.locator('.auth-form')).toHaveCSS('display', 'grid');
  await expectNoHorizontalOverflow(page);
});

test('setup password page uses the same safe auth layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/setup-password?token=convite-local', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: 'Criar senha' })).toBeVisible();
  await expect(page.getByLabel('Token do convite')).toHaveValue('convite-local');
  await expect(page.getByLabel('Senha')).toBeVisible();
  await expect(page.getByRole('button', { name: /concluir acesso/i })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
