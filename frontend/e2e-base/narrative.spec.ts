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
  await expect(page.locator('h1')).toHaveText('Faça partedessa história');
  await expect(page.locator('.hero-description, .section-intro')).toHaveCount(0);
  await expect(page.locator('#contribution-title')).toHaveText('Faça parte dessa história');
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
  await expect(page.locator('.project-pair .paired-images ~ *, .project-pair details')).toHaveCount(
    0,
  );
  await expect(page.locator('#ambientes')).not.toContainText(/Projeto completo/i);
  await expect(page.locator('#contribuicao .progress-row')).toHaveCount(2);
  await expect(page.locator('#contribuicao .primary-action')).toHaveCount(1);
  await expect(page.locator('#donation-options')).not.toHaveAttribute('open');
  await expect(page.locator('.one-time-offer')).toBeHidden();
  await expect(page.locator('#contribuicao')).not.toContainText(/Gerar Pix|Reforma|Construção/);
  const shortCopy = await page
    .locator('h1, h2, h3, p, figcaption, button, summary')
    .allTextContents();
  expect(shortCopy.filter((text) => /[.\u2026]$/.test(text.trim()))).toEqual([]);
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

test('drawer contribution keeps current choices and leaves the goals visible after closing', async ({
  page,
}, info) => {
  await page.goto('/base/', { waitUntil: 'domcontentloaded' });
  await goTo(page, '#visao');
  await page.locator('.floating-contribute').click();
  const drawer = page.getByRole('dialog', { name: 'Como você quer contribuir?' });
  const close = page.getByRole('button', { name: 'Fechar contribuição', exact: true });
  await expect(drawer).toBeVisible();
  await expect(close).toBeFocused();
  await expect(page.locator('#contribuicao #donation-options')).toHaveCount(0);
  await expect(drawer.locator('.monthly-offer small')).toHaveText('Recorrência de cobrança mensal');
  await expect(drawer.locator('.supporter-list a small')).toHaveText(Array(5).fill('/ mês'));
  const beforeClose = (await page.locator('#panorama-geral').boundingBox())!.y;
  expect(beforeClose).toBeGreaterThanOrEqual(84);
  const bounds = (await drawer.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(bounds.x + bounds.width).toBeCloseTo(viewport.width, 0);
  if (viewport.width > 760) expect(bounds.width).toBeLessThanOrEqual(480);
  else expect(bounds.y + bounds.height).toBeCloseTo(viewport.height, 0);
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    expect(await drawer.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  }
  await drawer.evaluate((el) => el.scrollTo(0, 0));
  await capture(page, info.outputPath('contribution-drawer.png'));
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await expect(page.locator('#panorama-geral')).toBeFocused();
  expect((await page.locator('#panorama-geral').boundingBox())!.y).toBeCloseTo(beforeClose, 0);
  await expect(page.locator('.progress-track').first()).toBeInViewport();
  expect(await page.locator('body').evaluate((el) => el.style.position)).toBe('');
  await capture(page, info.outputPath('goals-after-close.png'));
  await page.locator('#contribuicao .primary-action').click();
  await expect(drawer).toBeVisible();
  await close.click();
  await expect(drawer).toBeHidden();
  await expect(page.locator('.progress-track').first()).toBeInViewport();
  await page.locator('.floating-contribute').click();
  await page.mouse.click(5, 5);
  await expect(drawer).toBeHidden();
  await noOverflow(page);
});

test('six exact general checkouts open protected external tabs without calling Pix', async ({
  page,
  context,
}) => {
  test.setTimeout(120_000);
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
  const links = page.locator('#donation-options a');
  expect(
    await links.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href'))),
  ).toEqual(checkoutUrls);
  await expect(
    page.locator('#donation-options input, #donation-options select, #donation-options canvas'),
  ).toHaveCount(0);
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

test('contribution opens the drawer from the mobile menu and scrolls the background to goals', async ({
  page,
}) => {
  await page.goto('/base/', { waitUntil: 'domcontentloaded' });
  await goTo(page, '#visao');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  if (page.viewportSize()!.width <= 760)
    await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
  await page.locator('.floating-contribute').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.site-nav')).not.toHaveClass(/open/);
  await page.getByRole('button', { name: 'Fechar contribuição', exact: true }).click();
  await expect(page.locator('#panorama-geral')).toBeInViewport();
  await expect(page.locator('.progress-track').first()).toBeInViewport();
});

test('panoramic gallery keeps every image, video, navigation and indicator', async ({
  page,
}, info) => {
  await page.goto('/base/', { waitUntil: 'domcontentloaded' });
  await goTo(page, '#explore');
  await expect(page.locator('.gallery-thumbs button')).toHaveCount(6);
  await expect(page.locator('#explore img[src$="entrada.jpeg"]')).toHaveCount(0);
  const position = page.locator('.gallery-position');
  await expect(position).toHaveText('2 / 6');
  await page.getByRole('button', { name: 'Próxima mídia', exact: true }).click();
  await expect(position).toHaveText('3 / 6');
  await page.getByRole('button', { name: 'Mídia anterior', exact: true }).click();
  await expect(position).toHaveText('2 / 6');
  for (let i = 0; i < 6; i++) {
    const thumb = page.locator('.gallery-thumbs button').nth(i);
    const source = await thumb.locator('img').getAttribute('src');
    await thumb.click();
    await expect(thumb).toHaveAttribute('aria-pressed', 'true');
    await expect(position).toHaveText(`${i + 1} / 6`);
    const frame = page.locator('.gallery-frame');
    if (i === 0 || i === 5) {
      await expect(frame.locator('video')).toHaveAttribute('poster', source!);
      await expect(frame.locator('video')).not.toHaveAttribute('src');
    } else {
      await expect(frame.locator('img')).toHaveAttribute('src', source!);
      await frame.locator('img').evaluate((image: HTMLImageElement) => image.decode());
      await expect(frame.locator('img')).toHaveCSS('object-fit', 'cover');
    }
    await noOverflow(page);
  }
  await page.locator('.gallery-thumbs button').nth(1).click();
  await goTo(page, '#explore');
  await capture(page, info.outputPath('panoramic-gallery.png'));
});

test('gallery advances automatically and pauses on choice; navigation stays white', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install();
  await page.goto('/base/', { waitUntil: 'domcontentloaded' });
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 10_000));
  await goTo(page, '#explore');
  await expect(page.locator('.gallery-frame')).toBeInViewport();
  await page.mouse.move(0, 0);
  const position = page.locator('.gallery-position');
  const initial = await position.textContent();
  await page.clock.runFor(5500);
  await expect(position).not.toHaveText(initial!);
  await page.getByRole('button', { name: 'Pausar galeria', exact: true }).click();
  const paused = await position.textContent();
  await page.mouse.move(0, 0);
  await page.clock.runFor(5500);
  await expect(position).toHaveText(paused!);
  await page.getByRole('button', { name: 'Reproduzir galeria', exact: true }).click();
  await page.clock.runFor(100);
  await expect(page.locator('.gallery-toggle')).toHaveAttribute('aria-label', 'Pausar galeria');
  await page.mouse.move(0, 0);
  await page.clock.runFor(5500);
  await expect(position).not.toHaveText(paused!);
  await page.locator('.gallery-thumbs button').nth(1).click();
  await page.mouse.move(0, 0);
  await page.clock.runFor(5500);
  await expect(page.locator('.gallery-position')).toHaveText('2 / 6');
  if (page.viewportSize()!.width <= 760) {
    await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
    await page.clock.runFor(100);
  }
  const link = page.locator('.site-nav a[href="#explore"]');
  await link.click();
  await page.clock.runFor(100);
  await expect(link).toHaveAttribute('aria-current', 'location');
  await expect(link).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(page.locator('.floating-contribute')).toHaveCSS(
    'background-color',
    'rgb(197, 90, 57)',
  );
});

test('inactive campaigns keep donation options unavailable', async ({ page }) => {
  await page.route('**/api/v1/mission-base', (route) =>
    route.fulfill({ json: { ...campaign, active: false } }),
  );
  await page.goto('/base/', { waitUntil: 'domcontentloaded' });
  await goTo(page, '#contribuicao');
  await expect(page.locator('.floating-contribute')).toBeDisabled();
  await expect(page.locator('#contribuicao .primary-action')).toBeDisabled();
  await expect(page.locator('#donation-options')).toBeHidden();
  await expect(page.locator('.contribution-methods')).toHaveText(
    'Contribuições temporariamente indisponíveis',
  );
});

test('percentage bars calculate backend amounts, cap the fill and handle zero goals without status text', async ({
  page,
}, info) => {
  await page.route('**/api/v1/mission-base', (route) =>
    route.fulfill({
      json: { ...campaign, stages: campaign.stages.map((stage) => ({ ...stage, percent: 999 })) },
    }),
  );
  await page.goto('/base/', { waitUntil: 'domcontentloaded' });
  await goTo(page, '#contribuicao');
  await expect(page.locator('.progress-label')).toHaveText(['150%', '25%']);
  await expect(page.getByRole('progressbar', { name: 'Aquisição' })).toHaveAttribute(
    'aria-valuenow',
    '100',
  );
  await expect(page.getByRole('progressbar', { name: 'Aquisição' })).toHaveAttribute(
    'aria-valuetext',
    '150%',
  );
  await expect(page.locator('.progress-list')).not.toContainText(
    /R\$|Meta em definição|Aguardando dados|Atualizado|Meta superada/,
  );
  const track = (await page.locator('.progress-track').first().boundingBox())!;
  const fill = (await page.locator('.progress-track > span').first().boundingBox())!;
  expect(fill.width).toBeLessThanOrEqual(track.width);
  await capture(page, info.outputPath('percentage-goals.png'));
  let failing = true;
  await page.route('**/api/v1/mission-base', (route) =>
    route.fulfill(
      failing
        ? { status: 503, json: {} }
        : {
            json: {
              ...campaign,
              stages: campaign.stages.map((stage, index) => ({
                ...stage,
                goalCents: index ? 1000 : 0,
                raisedCents: index ? -100 : 1000,
                percent: 80,
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
  await expect(page.locator('.progress-label')).toHaveText(['0%', '0%']);
  for (const bar of await page.locator('.progress-track').all()) {
    await expect(bar).toHaveAttribute('aria-valuenow', '0');
    expect((await bar.locator('span').boundingBox())!.width).toBe(0);
  }
  await expect(page.locator('.progress-list')).not.toContainText(
    /Meta em definição|Aguardando dados/,
  );
  await capture(page, info.outputPath('zero-goals.png'));
});

test('Sora really renders all functional UI, including custom video controls and contribution drawer', async ({
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
      '#transformations-title',
      '.discover-link',
      '.eyebrow',
      '.primary-action',
      '.front-heading h3',
      '.progress-track',
      '.progress-label',
      '#drawer-title',
      '.one-time-offer strong',
      '.one-time-offer small',
      '.monthly-heading',
      '.supporter-list a',
      '#panorama-geral h3',
      '#donation-options summary small',
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
      fallbacks: Array.from(document.querySelectorAll('base-root *'))
        .filter(
          (el) =>
            !el.closest('h1, h2') &&
            Array.from(el.childNodes).some(
              (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
            ),
        )
        .filter(
          (el) =>
            !getComputedStyle(el).fontFamily.startsWith('Sora') &&
            !getComputedStyle(el).fontFamily.startsWith('"Sora"'),
        )
        .map((el) => ({
          tag: el.tagName,
          text: el.textContent,
          font: getComputedStyle(el).fontFamily,
        })),
    };
  });
  expect(fontProof.loaded).toBe(true);
  for (const element of fontProof.elements)
    expect(element.family.split(',')[0].replaceAll('"', '').replaceAll("'", '')).toBe('Sora');
  expect(fontProof.editorial).toContain('Lora');
  expect(fontProof.fallbacks).toEqual([]);
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
      '#panorama-geral > h3',
      '#donation-options summary small',
      '.front-heading h3',
      '.progress-label',
      '.allocation-note',
    ]) {
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
      const result = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
      expect(result.fonts.length, selector).toBeGreaterThan(0);
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
    await goTo(page, '#explore');
    const frame = (await page.locator('.gallery-frame').boundingBox())!;
    expect(frame.width / frame.height).toBeCloseTo(viewport.width <= 760 ? 16 / 9 : 21 / 9, 1);
    await noOverflow(page);
    await page.locator('.floating-contribute').click();
    await expect(
      page.getByRole('button', { name: 'Fechar contribuição', exact: true }),
    ).toBeFocused();
    await expect(page.locator('.one-time-offer')).toBeInViewport();
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
