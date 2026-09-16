import { expect, test, type Page } from '@playwright/test';

const campaign = {
  id: 'test-campaign',
  title: 'Base Mission Farm',
  description: '',
  active: true,
  totalGoalCents: 6000000,
  totalRaisedCents: 1800000,
  percent: 30,
  goalExceeded: false,
  stages: ['Aquisição', 'Reforma', 'Construção'].map((name, index) => ({
    id: ['aquisicao', 'reforma', 'construcao'][index],
    name,
    description: '',
    goalCents: 2000000,
    raisedCents: index === 0 ? 1800000 : 0,
    percent: index === 0 ? 90 : 0,
    goalExceeded: false,
    status: 'EM_ANDAMENTO',
    icon: 'key',
    sortOrder: index,
    current: index === 1,
    visible: true,
  })),
};

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

async function fullViewportHero(page: Page) {
  const viewport = page.viewportSize()!;
  await expect
    .poll(async () => (await page.locator('.hero').boundingBox())?.height)
    .toBeCloseTo(viewport.height, 0);
  const hero = await page.locator('.hero').boundingBox();
  expect(hero).toMatchObject({ x: 0, y: 0, width: viewport.width });
  expect(await page.locator('.hero-video').boundingBox()).toEqual(hero);
  const vision = await page.locator('#visao').boundingBox();
  expect(vision!.y).toBeCloseTo(viewport.height, 0);
  await expect(page.locator('.floating-contribute')).toBeHidden();
}

async function goToSection(page: Page, id: string) {
  await page.locator(id).evaluate((el) => el.scrollIntoView({ behavior: 'instant' }));
}

async function imagesLoaded(page: Page, section: string) {
  for (const img of await page.locator(`${section} img`).all()) {
    await expect
      .poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0))
      .toBe(true);
  }
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/api/v1/mission-base', (route) => route.fulfill({ json: campaign }));
});

test('story starts without fundraising and reveals one persistent invitation at the vision', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/base/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('h1')).toHaveText('Faça partedessa história.');
  await expect(page.locator('.floating-contribute')).toBeHidden();
  await expect(page.locator('.hero')).not.toContainText(/Pix|contribuir|meta|arrecadação/i);
  await expect(page.locator('.hero [role="progressbar"]')).toHaveCount(0);
  await expect(page.locator('.hero video source')).toHaveAttribute(
    'src',
    /drone-current-horizontal/,
  );
  expect(await page.locator('.hero video').evaluate((el: HTMLVideoElement) => el.paused)).toBe(
    true,
  );
  await fullViewportHero(page);
  await expect(page.getByRole('link', { name: 'Conheça a Base', exact: true })).toBeInViewport();
  await page.evaluate(async () => {
    const logo = new Image();
    logo.src = '/base/assets/base/brand/logo-base-horizontal.svg';
    await logo.decode();
    await document.fonts.ready;
  });
  expect(await page.evaluate(() => document.fonts.check('400 38px Lora'))).toBe(true);
  expect(await page.evaluate(() => document.fonts.check('400 14px Sora'))).toBe(true);
  await expect(page.locator('.brand-art')).toHaveAttribute('src', /logo-base-horizontal\.svg$/);
  await page.screenshot({ path: info.outputPath('01-hero.png') });

  const before = await page.locator('.brand').boundingBox();
  await page.evaluate(() => scrollTo({ top: 200, behavior: 'instant' }));
  await expect(page.locator('.floating-contribute')).toBeVisible();
  await page.getByRole('link', { name: 'Conheça a Base', exact: true }).click();
  await expect(page.locator('.floating-contribute')).toBeVisible();
  expect(await page.locator('.brand').boundingBox()).toEqual(before);
  await expect(page.locator('#visao .media-label')).toHaveText(['Hoje', 'A visão']);
  await expect(page.locator('.aerial-today img')).toHaveAttribute('src', /drone-current-vertical/);
  await expect(page.locator('#transformation-video')).toHaveAttribute('poster', /aerial-future/);
  await imagesLoaded(page, '#visao');
  await page.screenshot({ path: info.outputPath('02-vision.png') });

  for (const id of ['#ambientes', '#explore', '#contribuicao']) {
    await goToSection(page, id);
    await expect(page.locator('.floating-contribute')).toBeVisible();
    await noOverflow(page);
    await imagesLoaded(page, id);
    await page.screenshot({ path: info.outputPath(`${id.slice(1)}.png`) });
  }
  await expect(page.locator('.paired-images img')).toHaveCount(4);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('link', { name: 'Base Mission Farm', exact: true }).click();
  await expect(page.locator('.floating-contribute')).toBeHidden();
  expect(errors).toEqual([]);
});

test('transformation plays inline with actual moving pixels and gallery switches media', async ({
  page,
}) => {
  await page.goto('/base/', { waitUntil: 'domcontentloaded' });
  await goToSection(page, '#visao');
  await page.getByRole('button', { name: 'Ver a transformação', exact: true }).click();
  const video = page.locator('#transformation-video');
  await video.scrollIntoViewIfNeeded();
  if (page.viewportSize()!.width <= 760) {
    const bounds = await video.boundingBox();
    const header = await page.locator('.site-header').boundingBox();
    expect(bounds!.y).toBeGreaterThanOrEqual(header!.height);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  }
  await expect
    .poll(() => video.evaluate((el: HTMLVideoElement) => el.currentTime))
    .toBeGreaterThan(0);
  expect(await video.evaluate((el: HTMLVideoElement) => el.duration)).toBeCloseTo(7.04, 0);
  expect(await video.evaluate((el: HTMLVideoElement) => el.muted && el.playsInline)).toBe(true);
  await expect
    .poll(() =>
      video.evaluate((el: HTMLVideoElement) => {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(el, 0, 0, 32, 32);
        return new Set(ctx.getImageData(0, 0, 32, 32).data).size;
      }),
    )
    .toBeGreaterThan(40);
  await page.getByRole('button', { name: 'Pausar transformação', exact: true }).click();
  expect(await video.evaluate((el: HTMLVideoElement) => el.paused)).toBe(true);
  await goToSection(page, '#explore');
  const original = await page.locator('.gallery-frame img').getAttribute('src');
  await page.getByRole('button', { name: 'Próxima mídia', exact: true }).click();
  await expect(page.locator('.gallery-frame img')).not.toHaveAttribute('src', original!);
  await page.getByRole('button', { name: 'Caminhada pelo terreno', exact: true }).click();
  await expect(page.locator('.gallery-frame video source')).toHaveAttribute(
    'src',
    /caminhada-terreno/,
  );
  await page.getByRole('button', { name: 'Vista aérea', exact: true }).click();
  await expect(page.locator('.gallery-frame video source')).toHaveAttribute(
    'src',
    /drone-current-horizontal/,
  );
});

test('contribution uses the existing Pix API, with exact cents and unchanged totals', async ({
  page,
}, info) => {
  const requests: unknown[] = [];
  await page.route('**/api/v1/mission-base/pix', async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({
      json: {
        stageId: 'reforma',
        stageName: 'Reforma',
        amountCents: 12345,
        txid: 'TEST-ONLY',
        pixPayload: 'TEST-ONLY-NOT-A-PAYMENT',
      },
    });
  });
  await page.goto('/base/', { waitUntil: 'domcontentloaded' });
  await goToSection(page, '#visao');
  await page.getByRole('link', { name: 'Quero contribuir', exact: true }).click();
  await expect(page.locator('#contribution-title')).toBeInViewport();
  const progress = await page.locator('.progress-list').innerText();
  await page.getByRole('radio', { name: 'Reforma', exact: true }).check();
  await page.getByLabel('Outro valor', { exact: true }).fill('123,45');
  await page.getByRole('button', { name: 'Gerar Pix', exact: true }).click();
  await expect(
    page.getByAltText('QR Code Pix para contribuição da Base Mission Farm'),
  ).toBeVisible();
  expect(requests).toEqual([{ stageId: 'reforma', amountCents: 12345 }]);
  expect(await page.locator('.progress-list').innerText()).toEqual(progress);
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          document.documentElement.dataset['copiedPix'] = value;
        },
      },
    }),
  );
  await page.getByRole('button', { name: 'Copiar código Pix', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Código Pix copiado.');
  expect(await page.locator('html').getAttribute('data-copied-pix')).toBe(
    'TEST-ONLY-NOT-A-PAYMENT',
  );
  await page.screenshot({ path: info.outputPath('pix.png') });
  await noOverflow(page);
});

test('undefined goals have no progress bar and API failures can be retried', async ({ page }) => {
  let fail = true;
  await page.route('**/api/v1/mission-base', (route) =>
    route.fulfill(
      fail
        ? { status: 503, json: {} }
        : {
            json: {
              ...campaign,
              totalGoalCents: 0,
              stages: campaign.stages.map((stage) => ({ ...stage, goalCents: 0 })),
            },
          },
    ),
  );
  await page.goto('/base/#contribuicao', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar');
  fail = false;
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByText('Meta em definição', { exact: true })).toHaveCount(3);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  const rows = await page.locator('.progress-row').all();
  for (let i = 1; i < rows.length; i++) {
    const prev = await rows[i - 1].boundingBox();
    const next = await rows[i].boundingBox();
    expect(next!.y - (prev!.y + prev!.height)).toBeGreaterThanOrEqual(12);
  }
  await page.getByRole('button', { name: 'Gerar Pix', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('a partir de R$ 1,00');
  await page.getByRole('button', { name: 'R$ 50,00', exact: true }).click();
  await page.getByLabel('Outro valor', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Gerar Pix', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('a partir de R$ 1,00');
  await page.route('**/api/v1/mission-base/pix', (route) =>
    route.fulfill({ status: 503, json: {} }),
  );
  await page.getByLabel('Outro valor', { exact: true }).fill('10,00');
  await page.getByRole('button', { name: 'Gerar Pix', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Não foi possível gerar o Pix');
  await expect(page.getByRole('button', { name: 'Gerar Pix', exact: true })).toBeEnabled();
});

test('architecture remains available side by side without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4300/base/');
  await expect(page.getByRole('heading', { name: 'Base Mission Farm', exact: true })).toBeVisible();
  await expect(page.locator('.static-comparison img')).toHaveCount(4);
  await expect(page.locator('.static-comparison figcaption')).toHaveText([
    'Hoje',
    'A visão',
    'Hoje',
    'A visão',
  ]);
  await context.close();
});

test('small, landscape and wide viewports keep the hero and navigation within bounds', async ({
  page,
}) => {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 768, height: 1024 },
    { width: 844, height: 390 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/base/', { waitUntil: 'domcontentloaded' });
    await fullViewportHero(page);
    await expect(page.locator('h1')).toBeInViewport();
    const title = await page.locator('h1').boundingBox();
    const discover = await page.locator('.discover-link').boundingBox();
    expect(title!.y + title!.height).toBeLessThan(discover!.y);
    expect(discover!.y + discover!.height).toBeLessThanOrEqual(viewport.height);
    await noOverflow(page);
    if (viewport.width < 761) {
      await page.getByRole('button', { name: 'Abrir menu' }).click();
      await expect(page.getByRole('navigation')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('navigation')).toBeHidden();
    }
    await goToSection(page, '#visao');
    await expect(page.locator('.floating-contribute')).toBeVisible();
    await noOverflow(page);
    const brand = await page.locator('.brand').boundingBox();
    const cta = await page.locator('.floating-contribute').boundingBox();
    expect(brand!.x + brand!.width).toBeLessThanOrEqual(cta!.x);
  }
});

test('hero follows viewport height changes without reloading', async ({ page }) => {
  await page.goto('/base/', { waitUntil: 'domcontentloaded' });
  const width = page.viewportSize()!.width;
  for (const height of [720, 640, 844]) {
    await page.setViewportSize({ width, height });
    await fullViewportHero(page);
  }
});

test('brand artwork and fonts load cleanly', async ({ page }, info) => {
  await page.goto('/base/', { waitUntil: 'domcontentloaded' });
  await page.locator('.brand-art').evaluate((img: HTMLImageElement) => img.decode());
  await page.evaluate(() => document.fonts.ready);
  const families = await page.evaluate(() =>
    Array.from(
      new Set(
        Array.from(document.fonts)
          .filter((font) => font.status === 'loaded')
          .map((font) => font.family.replaceAll('"', '').replaceAll("'", '')),
      ),
    ),
  );
  expect(families).toEqual(expect.arrayContaining(['Sora', 'Lora']));
  await expect(page.locator('.brand-art')).toHaveAttribute('src', /logo-base-horizontal\.svg$/);
  await fullViewportHero(page);
  await page.screenshot({ path: info.outputPath('brand-hero.png') });
});
