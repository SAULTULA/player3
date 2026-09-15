/* ==================================================================
   RADIO GRACIA Y PAZ — PWA
   Registro del Service Worker + botón "Instalar App"
   v2 — Fix: detección robusta de instalación (triple capa)
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

// Clave en localStorage (persiste entre sesiones, se borra si el usuario limpia datos)
const INSTALLED_KEY = 'pwa_installed';

/**
 * Capa 1 — display-mode: la fuente de verdad más confiable.
 * Si la app se abre desde el ícono instalado, standalone === true.
 * Capa 2 — localStorage: recordamos la instalación entre sesiones.
 * NOTA: se borra si el usuario limpia caché → por eso existe la capa 3.
 * Capa 3 — getInstalledRelatedApps(): API nativa de Android Chrome ≥ 84.
 * Detecta si la PWA ya está instalada aunque se haya borrado localStorage.
 */
function isInstalledSync() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    window.navigator.standalone === true ||
    localStorage.getItem(INSTALLED_KEY) === 'true'
  );
}

/**
 * Verificación asíncrona con la API nativa getInstalledRelatedApps().
 * Solo funciona en Chrome/Android con HTTPS y el campo "related_applications"
 * configurado en el manifest. Si detecta la app instalada, oculta el botón.
 */
async function checkInstalledRelatedApps() {
  if (!('getInstalledRelatedApps' in navigator)) return;
  try {
    const relatedApps = await navigator.getInstalledRelatedApps();
    if (relatedApps.length > 0) {
      console.log('✅ getInstalledRelatedApps: PWA detectada como instalada.', relatedApps);
      markAsInstalled();
    }
  } catch (err) {
    console.warn('⚠️ getInstalledRelatedApps falló (normal en localhost):', err);
  }
}

/** Oculta el botón de instalación y persiste el estado. */
function markAsInstalled() {
  localStorage.setItem(INSTALLED_KEY, 'true');
  if (btnInstall) btnInstall.hidden = true;
  deferredPrompt = null;
  console.log('✅ App marcada como instalada — botón ocultado permanentemente.');
}

// -------- Ocultar botón de inmediato si la detección síncrona lo confirma --------
if (btnInstall && isInstalledSync()) {
  btnInstall.hidden = true;
}

// -------- Ejecutar verificación asíncrona (Capa 3) --------
checkInstalledRelatedApps();

// -------- Escuchar cambios de display-mode en tiempo real --------
// Cubre el caso en que el usuario instala la PWA sin hacer clic en nuestro botón
// (por ejemplo desde el menú del navegador) y luego vuelve a la pestaña abierta.
const standaloneQuery = window.matchMedia('(display-mode: standalone)');
const standaloneListener = (e) => {
  if (e.matches) {
    console.log('📱 display-mode cambió a standalone — app instalada.');
    markAsInstalled();
  }
};
// Usar addEventListener si está disponible (moderno), sino addListener (legacy)
if (standaloneQuery.addEventListener) {
  standaloneQuery.addEventListener('change', standaloneListener);
} else {
  standaloneQuery.addListener(standaloneListener);
}

// -------- Chrome / Edge / Android: capturamos el prompt --------
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();

  // Si la app ya fue instalada (cualquier capa), ignoramos el evento
  if (isInstalledSync()) {
    console.log('ℹ️ beforeinstallprompt ignorado: app ya instalada (sync check).');
    return;
  }

  // Lanzar verificación asíncrona adicional antes de mostrar el botón
  checkInstalledRelatedApps().then(() => {
    // Solo mostramos el botón si la verificación asíncrona tampoco lo detectó
    if (!isInstalledSync()) {
      deferredPrompt = e;
      if (btnInstall) btnInstall.hidden = false;
      console.log('📲 beforeinstallprompt capturado — mostrando botón.');
    } else {
      console.log('ℹ️ beforeinstallprompt ignorado: app detectada por API async.');
    }
  });
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
        markAsInstalled();
      } else {
        // El usuario canceló: volvemos a mostrar el botón
        console.log('❌ Usuario canceló la instalación');
        deferredPrompt = null;
        btnInstall.hidden = false;
      }
    } catch (err) {
      console.warn('⚠️ Error durante prompt():', err);
      deferredPrompt = null;
      btnInstall.hidden = false;
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
if (isIOS && !isInstalledSync() && btnInstall) {
  // Verificar también con la API async antes de mostrar
  checkInstalledRelatedApps().then(() => {
    if (!isInstalledSync() && btnInstall) {
      btnInstall.hidden = false;
    }
  });
}

console.log('🚀 Radio Gracia y Paz — PWA lista | instalada (sync):', isInstalledSync());