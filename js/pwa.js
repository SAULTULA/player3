/* ==================================================================
   RADIO GRACIA Y PAZ — PWA
   Registro del Service Worker + botón "Instalar App"
   ================================================================== */

// -------- 1. REGISTRAR SERVICE WORKER --------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('✅ Service Worker registrado:', reg.scope))
      .catch(err => console.warn('⚠️ Error al registrar SW:', err));
  });
}

// -------- 2. BOTÓN "INSTALAR APP" --------
const btnInstall = document.getElementById('btnInstall');
let deferredPrompt = null;

// Detecta si la app ya está instalada (modo standalone)
function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

// Chrome / Edge / Android: capturamos el evento
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (!isStandalone() && btnInstall) {
    btnInstall.hidden = false;
  }
  console.log('📲 beforeinstallprompt capturado');
});

// Click en el botón instalar
if (btnInstall) {
  btnInstall.addEventListener('click', async () => {
    if (!deferredPrompt) {
      // Fallback para navegadores que no disparan el evento (iOS, Firefox)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

      if (isIOS) {
        alert(
          'Para instalar la app en iPhone/iPad:\n\n' +
          '1. Toca el botón Compartir (⬆️)\n' +
          '2. Selecciona "Añadir a pantalla de inicio"\n' +
          '3. Confirma'
        );
      } else {
        alert(
          'Para instalar la app:\n\n' +
          '• En Chrome/Edge: menú (⋮) → "Instalar aplicación"\n' +
          '• En Firefox: menú (⋮) → "Instalar"\n' +
          '• En Safari iOS: Compartir → "Añadir a pantalla de inicio"'
        );
      }
      return;
    }

    // Ocultar mientras se muestra el prompt nativo
    btnInstall.hidden = true;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('🎯 Resultado de instalación:', outcome);

      if (outcome === 'accepted') {
        console.log('🎉 Usuario aceptó la instalación');
      } else {
        console.log('❌ Usuario canceló la instalación');
        if (!isStandalone()) btnInstall.hidden = false;
      }
    } catch (err) {
      console.warn('⚠️ Error durante prompt():', err);
      if (!isStandalone()) btnInstall.hidden = false;
    } finally {
      deferredPrompt = null;
    }
  });
}

// Instalación exitosa
window.addEventListener('appinstalled', () => {
  if (btnInstall) btnInstall.hidden = true;
  console.log('🎉 App instalada correctamente');
});

// Fallback iOS
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
if (isIOS && !isStandalone() && btnInstall) {
  btnInstall.hidden = false;
}

// Si ya está instalada, ocultar botón
if (isStandalone() && btnInstall) {
  btnInstall.hidden = true;
}

console.log('🚀 Radio Gracia y Paz — PWA lista');