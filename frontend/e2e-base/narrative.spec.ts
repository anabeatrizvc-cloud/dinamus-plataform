import { expect, test, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { campaign, checkoutUrls } from './campaign.fixture';

async function goTo(page: Page, id: string) {
  await page.locator(id).evaluate((el) => el.scrollIntoView({ behavior: 'instant' }));
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
async function fullHero(page: Page) {
  const viewport = page.viewportSize()!;
  const box = await page.locator('.hero').boundingBox();
  expect(box!.height).toBeCloseTo(viewport.height, 0);
  expect(box).toMatchObject({ x: 0, y: 0, width: viewport.width });
  await expect(page.locator('.discover-link')).toBeInViewport();
  await expect(page.locator('.floating-contribute')).toBeHidden();
}
async function capture(page: Page, path: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path });
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/api/v1/mission-base', (route) => route.fulfill({ json: campaign }));
});

test('preserves the hero and the approved narrative, with no fundraising in the first viewport', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/base/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('h1')).toHaveText('Faça partedessa história.');
  await fullHero(page);
  await expect(page.locator('.hero')).not.toContainText(/Pix|contribuir|meta|arrecadação/i);
  await expect(page.locator('.hero [role="progressbar"]')).toHaveCount(0);
  await expect(page.locator('.hero-poster')).toHaveAttribute('src', /drone-current-horizontal/);
  expect(
    await page.locator('.hero video').evaluate((video: HTMLVideoElement) => video.paused),
  ).toBe(true);
  await page.locator('.hero-poster').evaluate((img: HTMLImageElement) => img.decode());
  await capture(page, info.outputPath('01-hero.png'));
  const brand = await page.locator('.brand').boundingBox();
  await goTo(page, '#visao');
  await expect(page.locator('.floating-contribute')).toBeVisible();
  expect(await page.locator('.brand').boundingBox()).toEqual(brand);
  await expect(page.locator('.aerial-comparison .media-label')).toHaveText(['Hoje', 'A visão']);
  await expect(page.locator('.aerial-today img')).toHaveAttribute('src', /drone-current-vertical/);
  await expect(page.locator('.aerial-future img')).toHaveAttribute('src', /aerial-future/);
  await expect(page.locator('.transformation-item')).toHaveCount(2);
  await expect(page.locator('.transformation-item video').nth(0)).toHaveAttribute(
    'poster',
    /transformation-aerial-poster/,
  );
  await expect(page.locator('.transformation-item video').nth(1)).toHaveAttribute(
    'poster',
    /transformation-vertical-poster/,
  );
  for (const id of ['visao', 'ambientes', 'explore', 'contribuicao']) {
    await goTo(page, '#' + id);
    await expect(page.locator('.floating-contribute')).toBeVisible();
    await noOverflow(page);
    await capture(page, info.outputPath(id + '.png'));
  }
  await expect(page.locator('.paired-images img')).toHaveCount(4);
  await expect(page.locator('#contribuicao .progress-row')).toHaveCount(2);
  await expect(page.locator('#contribuicao .primary-action')).toHaveCount(1);
  await expect(page.locator('#contribuicao')).not.toContainText(
    /49,90|99,90|Gerar Pix|Reforma|Construção/,
  );
  await page.getByRole('link', { name: 'Base Mission Farm', exact: true }).click();
  await expect(page.locator('.floating-contribute')).toBeHidden();
  expect(errors).toEqual([]);
});

test('two transformations load on demand, preserve vertical proportions, move and pause each other', async ({
  page,
}, info) => {
  const downloads: string[] = [];
  page.on('request', (request) => {
    if (/final-project|transformation-vertical.mp4/.test(request.url()))
      downloads.push(request.url());
  });
  await page.goto('/base/', { waitUntil: 'domcontentloaded' });
  await goTo(page, '#transformations');
  expect(downloads).toEqual([]);
  const items = page.locator('.transformation-item');
  if (page.viewportSize()!.width > 760) {
    const first = await items.nth(0).boundingBox();
    const second = await items.nth(1).boundingBox();
    expect(first!.y).toBe(second!.y);
    expect(first!.width).toBeCloseTo(second!.width, 0);
    expect(second!.x).toBeGreaterThan(first!.x + first!.width);
  }
  const firstVideo = items.nth(0).locator('video');
  await items.nth(0).getByRole('button', { name: 'Reproduzir: Visão geral', exact: true }).click();
  await expect
    .poll(() => firstVideo.evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 20_000 })
    .toBeGreaterThan(0.1);
  expect(await firstVideo.evaluate((v: HTMLVideoElement) => v.muted && v.playsInline)).toBe(true);
  expect(await firstVideo.evaluate((v: HTMLVideoElement) => v.duration)).toBeCloseTo(7.04, 0);
  const pixels = await firstVideo.evaluate((v: HTMLVideoElement) => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(v, 0, 0, 32, 32);
    return new Set(ctx.getImageData(0, 0, 32, 32).data).size;
  });
  expect(pixels).toBeGreaterThan(40);
  if (page.viewportSize()!.width <= 760) {
    await page.getByRole('button', { name: 'Próxima transformação', exact: true }).click();
    await expect(page.locator('.transformation-navigation span')).toHaveText('2 / 2');
  }
  await items
    .nth(1)
    .getByRole('button', { name: 'Reproduzir: Revitalização', exact: true })
    .click();
  const secondVideo = items.nth(1).locator('video');
  await expect
    .poll(() => secondVideo.evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 20_000 })
    .toBeGreaterThan(0);
  expect(await firstVideo.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  expect(
    await secondVideo.evaluate((v: HTMLVideoElement) => v.muted && v.videoHeight > v.videoWidth),
  ).toBe(true);
  expect(await secondVideo.evaluate((v: HTMLVideoElement) => v.duration)).toBeCloseTo(10.125, 0);
  await capture(page, info.outputPath('transformation-playing.png'));
  await goTo(page, '#contribuicao');
  await expect.poll(() => secondVideo.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  if (page.viewportSize()!.width <= 760) {
    await goTo(page, '#transformations');
    await page.locator('.transformation-rail').focus();
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('.transformation-navigation span')).toHaveText('1 / 2');
  }
});

test('contribution drawer or bottom sheet traps focus, closes and restores scroll and trigger', async ({
  page,
}, info) => {
  await page.goto('/base/', { waitUntil: 'domcontentloaded' });
  await goTo(page, '#contribuicao');
  const trigger = page.locator('#contribuicao .primary-action');
  await trigger.scrollIntoViewIfNeeded();
  const scroll = await page.evaluate(() => scrollY);
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Como você quer contribuir?' });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fechar contribuição' })).toBeFocused();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  }
  await capture(page, info.outputPath('contribution-layer.png'));
  const bounds = await dialog.boundingBox();
  const viewport = page.viewportSize()!;
  expect(bounds!.x + bounds!.width).toBeCloseTo(viewport.width, 0);
  expect(bounds!.y + bounds!.height).toBeCloseTo(viewport.height, 0);
  if (viewport.width <= 760) expect(bounds!.y).toBeGreaterThan(30);
  else expect(bounds!.width).toBeLessThan(600);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => scrollY)).toBeCloseTo(scroll, 0);
  await trigger.click();
  await page.getByRole('button', { name: 'Fechar contribuição' }).click();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.mouse.click(5, 5);
  await expect(dialog).not.toBeVisible();
  await noOverflow(page);
});

test('six exact general checkouts open protected external tabs without calling Pix', async ({
  page,
  context,
}) => {
  let pixCalls = 0;
  await page.route('**/api/v1/mission-base/pix', (route) => {
    pixCalls++;
    return route.abort();
  });
  await context.route('https://www.asaas.com/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<title>Checkout test double</title>' }),
  );
  await page.goto('/base/', { waitUntil: 'domcontentloaded' });
  await goTo(page, '#visao');
  await page.locator('.floating-contribute').click();
  const links = page.locator('dialog a');
  expect(
    await links.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href'))),
  ).toEqual(checkoutUrls);
  await expect(page.locator('dialog input, dialog select, dialog canvas')).toHaveCount(0);
  for (const link of await links.all()) {
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(link).toHaveAttribute('target', '_blank');
    const url = await link.getAttribute('href');
    const popupPromise = page.waitForEvent('popup');
    await link.click();
    const popup = await popupPromise;
    await popup.waitForLoadState('domcontentloaded');
    expect(popup.url()).toBe(url);
    expect(await popup.evaluate(() => window.opener)).toBeNull();
    await popup.close();
  }
  expect(pixCalls).toBe(0);
});

test('independent financial bars preserve excess and undefined states and allow retry', async ({
  page,
}, info) => {
  await page.goto('/base/', { waitUntil: 'domcontentloaded' });
  await goTo(page, '#contribuicao');
  await expect(page.getByText('150% destinado', { exact: true })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Aquisição' })).toHaveAttribute(
    'aria-valuenow',
    '100',
  );
  const bar = await page.getByRole('progressbar', { name: 'Aquisição' }).boundingBox();
  expect(bar!.height).toBeGreaterThanOrEqual(20);
  await expect(page.getByText('Meta superada', { exact: true })).toBeVisible();
  await expect(page.getByText('Atualizado em 20/09/2026')).toHaveCount(2);
  let failing = true;
  await page.route('**/api/v1/mission-base', (route) =>
    route.fulfill(
      failing
        ? { status: 503, json: {} }
        : {
            json: {
              ...campaign,
              stages: campaign.stages.map((stage) => ({
                ...stage,
                goalCents: 0,
                raisedCents: 0,
                percent: 0,
                remainingCents: null,
                updatedAt: null,
              })),
            },
          },
    ),
  );
  await page.reload({ waitUntil: 'domcontentloaded' });
  await goTo(page, '#contribuicao');
  await expect(page.getByRole('alert')).toContainText('Não foi possível');
  failing = false;
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByText('Meta em definição', { exact: true })).toHaveCount(2);
  await expect(page.getByText('Aguardando dados', { exact: true })).toHaveCount(2);
  for (const track of await page.locator('.progress-track').all()) {
    expect(await track.getAttribute('aria-valuenow')).toBeNull();
    expect((await track.locator('span').boundingBox())!.width).toBe(0);
  }
  await expect(page.locator('.updated-at')).toHaveCount(0);
  await capture(page, info.outputPath('undefined-goals.png'));
});

test('Sora really renders all functional UI, including custom video controls and contribution layer', async ({
  page,
  browserName,
}, info) => {
  await page.goto('/base/', { waitUntil: 'domcontentloaded' });
  await goTo(page, '#transformations');
  await page.getByRole('button', { name: 'Reproduzir: Visão geral', exact: true }).click();
  await expect(page.locator('.video-controls output')).toBeVisible();
  const controlsFont = await page
    .locator('.video-controls')
    .evaluate((el) => getComputedStyle(el).fontFamily);
  expect(controlsFont.split(',')[0].replaceAll('"', '').replaceAll("'", '')).toBe('Sora');
  await goTo(page, '#contribuicao');
  await page.locator('#contribuicao .primary-action').click();
  const fontProof = await page.evaluate(async () => {
    await document.fonts.ready;
    const selectors = [
      '.site-nav a',
      '.hero-description',
      '.discover-link',
      '.eyebrow',
      '.primary-action',
      '.front-heading h3',
      '.progress-track',
      '.front-figures dd',
      '.updated-at',
      '.one-time-offer strong',
      '.one-time-offer small',
      '.monthly-heading',
      '.supporter-list a',
      '.drawer-note',
      '.video-controls',
      '.video-controls button',
      '.video-controls input',
      '.video-controls output',
    ];
    return {
      loaded: [400, 600, 700].every((weight) =>
        document.fonts.check(weight + ' 16px Sora', 'Aquisição R$ 49,90'),
      ),
      faces: Array.from(document.fonts)
        .filter((f) => f.family.includes('Sora'))
        .map((f) => ({ family: f.family, weight: f.weight, status: f.status })),
      elements: selectors.map((selector) => ({
        selector,
        family: getComputedStyle(document.querySelector(selector)!).fontFamily,
      })),
      editorial: getComputedStyle(document.querySelector('h1')!).fontFamily,
    };
  });
  expect(fontProof.loaded).toBe(true);
  for (const element of fontProof.elements)
    expect(element.family.split(',')[0].replaceAll('"', '').replaceAll("'", '')).toBe('Sora');
  expect(fontProof.editorial).toContain('Lora');
  await writeFile(info.outputPath('computed-fonts.json'), JSON.stringify(fontProof, null, 2));
  await info.attach('computed-fonts.json', {
    path: info.outputPath('computed-fonts.json'),
    contentType: 'application/json',
  });
  if (browserName === 'chromium') {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    const { root } = await cdp.send('DOM.getDocument');
    const proof = [];
    for (const selector of [
      '.one-time-offer strong',
      '.monthly-heading',
      '.supporter-list a span',
      '.drawer-note',
    ]) {
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
      const result = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
      expect(result.fonts.length).toBeGreaterThan(0);
      expect(
        result.fonts.every((font) => font.isCustomFont && font.familyName.includes('Sora')),
      ).toBe(true);
      proof.push({ selector, ...result });
    }
    await writeFile(info.outputPath('rendered-fonts.json'), JSON.stringify(proof, null, 2));
    await info.attach('rendered-fonts.json', {
      path: info.outputPath('rendered-fonts.json'),
      contentType: 'application/json',
    });
    await cdp.detach();
  }
});

test('small, landscape and wide viewports preserve full-height hero without overflow', async ({
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
    await fullHero(page);
    const title = await page.locator('h1').boundingBox();
    const discover = await page.locator('.discover-link').boundingBox();
    expect(title!.y + title!.height).toBeLessThan(discover!.y);
    await noOverflow(page);
    await goTo(page, '#visao');
    const brand = await page.locator('.brand').boundingBox();
    const cta = await page.locator('.floating-contribute').boundingBox();
    expect(brand!.x + brand!.width).toBeLessThanOrEqual(cta!.x);
    await noOverflow(page);
  }
});

test('architecture remains side by side without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4300/base/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.static-comparison img')).toHaveCount(4);
  await expect(page.locator('.static-comparison figcaption')).toHaveText([
    'Hoje',
    'A visão',
    'Hoje',
    'A visão',
  ]);
  await context.close();
});
