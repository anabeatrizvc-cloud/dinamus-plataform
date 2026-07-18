import { expect, test } from '@playwright/test';

test('renders approved home composition on desktop', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: /uma família de cristãos íntimos de deus/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /abrir gcs/i })).toBeVisible();
  await expect(page.getByRole('navigation', { name: /navegação principal/i })).toBeVisible();
});

test('keeps primary actions reachable on mobile', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('link', { name: /abrir agenda/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /abrir eventos/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /pedido de oração/i })).toHaveCount(0);
});

test('opens GC WhatsApp flow and hides public forms', async ({ page }) => {
  await page.goto('/gcs', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: /encontre um gc perto de você/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /abrir whatsapp para encontrar um gc/i })).toHaveAttribute(
    'href',
    'https://wa.me/5581999499159',
  );

  await page.goto('/oracao', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('link', { name: /pedido de oração/i })).toHaveCount(0);
});
