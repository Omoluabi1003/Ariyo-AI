import { registerSW } from 'virtual:pwa-register';

registerSW({
  onNeedRefresh() {
    window.location.reload();
  },
  onOfflineReady() {
    console.info('[pwa] App ready to work offline.');
  },
});
