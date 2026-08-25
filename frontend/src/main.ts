import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

void cleanupLegacyServiceWorker();

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));

async function cleanupLegacyServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));

    if ('caches' in globalThis) {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.includes('ngsw') || key.includes('dnms')).map((key) => caches.delete(key)));
    }
  } catch {
    // Cache cleanup is best-effort; the app must still bootstrap if the browser denies it.
  }
}
