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

// Clave de almacenamiento persistente
const INSTALLED_KEY = 'pwa_installed';

/**
 * Devuelve true si la app está corriendo en modo standalone
 * O si el usuario ya la instaló en una sesión anterior.
 */
function isInstalled() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    localStorage.getItem(INSTALLED_KEY) === 'true'
  );
}

/** Oculta el botón de instalación de forma permanente. */
function markAsInstalled() {
  localStorage.setItem(INSTALLED_KEY, 'true');
  if (btnInstall) btnInstall.hidden = true;
  console.log('✅ App marcada como instalada — botón ocultado permanentemente.');
}

// -------- Ocultar botón de inmediato si ya está instalado --------
if (btnInstall && isInstalled()) {
  btnInstall.hidden = true;
}

// -------- Chrome / Edge / Android: capturamos el prompt --------
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  // Si la app ya fue instalada, ignoramos el evento completamente
  if (isInstalled()) {
    console.log('ℹ️ beforeinstallprompt ignorado: app ya instalada.');
    return;
  }
  deferredPrompt = e;
  if (btnInstall) btnInstall.hidden = false;
  console.log('📲 beforeinstallprompt capturado — mostrando botón.');
});

// -------- Click en el botón instalar --------
if (btnInstall) {
  btnInstall.addEventListener('click', async () => {
    if (!deferredPrompt) {
      // Fallback para navegadores sin soporte nativo (iOS / Firefox)
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

    // Ocultar botón mientras se muestra el prompt nativo
    btnInstall.hidden = true;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('🎯 Resultado de instalación:', outcome);

      if (outcome === 'accepted') {
        // El usuario aceptó: persistimos la instalación
        markAsInstalled();
      } else {
        // El usuario canceló: volvemos a mostrar el botón
        console.log('❌ Usuario canceló la instalación');
        btnInstall.hidden = false;
      }
    } catch (err) {
      console.warn('⚠️ Error durante prompt():', err);
      btnInstall.hidden = false;
    } finally {
      deferredPrompt = null;
    }
  });
}

// -------- Evento nativo de instalación completada --------
window.addEventListener('appinstalled', () => {
  markAsInstalled();
  console.log('🎉 App instalada correctamente (evento appinstalled).');
});

// -------- Fallback iOS: mostrar botón solo si no está instalada --------
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
if (isIOS && !isInstalled() && btnInstall) {
  btnInstall.hidden = false;
}

console.log('🚀 Radio Gracia y Paz — PWA lista | instalada:', isInstalled());