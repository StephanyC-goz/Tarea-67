<?php
declare(strict_types=1);
require_once __DIR__.'/config/auth.php';
$authenticatedUser=require_admin();
if (empty($_SESSION['csrf_token'])) { $_SESSION['csrf_token'] = bin2hex(random_bytes(32)); }

$builtJs = __DIR__ . '/public/assets/editor.js';
$builtCss = __DIR__ . '/public/assets/editor.css';
$frontendReady = is_file($builtJs) && filesize($builtJs) > 0 && is_file($builtCss) && filesize($builtCss) > 0;
$assetVersion = $frontendReady ? (string) max((int) filemtime($builtJs), (int) filemtime($builtCss)) : 'pending';
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#f7f9fc">
  <meta name="csrf-token" content="<?= htmlspecialchars($_SESSION['csrf_token'], ENT_QUOTES, 'UTF-8') ?>">
  <title>Dirección Nacional SENATI | Editor 3D + MySQL</title>
  <?php if ($frontendReady): ?>
    <link rel="stylesheet" href="./public/assets/editor.css?v=<?= htmlspecialchars($assetVersion, ENT_QUOTES, 'UTF-8') ?>">
  <?php else: ?>
    <style>body{font:16px system-ui;background:#f7f9fc;color:#1e293b;margin:0;padding:32px}.setup{max-width:720px;margin:8vh auto;background:#fff;border:1px solid #dce4ec;border-radius:16px;padding:28px;box-shadow:0 12px 40px #1e293b12}.setup h1{margin-top:0}.setup code{background:#eef3f7;padding:3px 6px;border-radius:5px}.setup li{margin:10px 0}</style>
  <?php endif; ?>
</head>
<body>
<?php if (!$frontendReady): ?>
  <main class="setup">
    <img src="./referencias/senati_frontal.jpg" alt="Fachada Dirección Nacional SENATI" style="display:block;width:100%;max-height:235px;object-fit:cover;border-radius:12px;margin-bottom:20px">
    <h1>Preparar editor 3D de la Dirección Nacional SENATI</h1>
    <p>Abre la carpeta del proyecto en VS Code y ejecuta <code>npm install</code> y después <code>npm run build</code>. Inicia Apache y MySQL en Laragon. Recarga con <b>Ctrl + F5</b>.</p>
    <p>Si npm no está disponible, ejecuta <code>COMPILAR-FRONTEND.bat</code>. Comprueba el resultado en <a href="./diagnostico.php">Diagnóstico</a>.</p>
  </main>
<?php exit; endif; ?>
<div class="app-shell">
  <header class="topbar">
    <div class="brand">
      <div class="brand-mark"><span>3D</span></div>
      <div class="brand-copy"><strong>Dirección Nacional SENATI · 3D</strong><small>Fachada, pisos, editor y simulador de emergencias</small></div>
    </div>
    <div class="top-actions">
      <a class="btn btn-light-full" href="./recorrer.php">Recorrer escenarios</a><a class="btn btn-light-full" href="./admin.php">Administración</a><a class="btn btn-light-full" href="./diagnostico.php" title="Comprobar dependencias">Diagnóstico</a>
      <label class="scenario-name"><span>Escenario:</span><input id="scenario-name" value="Dirección Nacional SENATI · Pirámide" maxlength="100"></label>
      <button class="btn btn-primary" id="new-scene"><span class="btn-symbol">＋</span> Nuevo</button>
      <button class="btn btn-primary" id="save-scene"><span class="btn-symbol">▣</span> Guardar</button>
      <select id="saved-scenes" aria-label="Escenarios guardados"><option value="">Escenarios guardados</option></select>
      <button class="btn btn-blue" id="load-scene">Abrir</button>
      <button class="btn btn-light-full" id="history-scene" type="button" title="Recuperar un guardado anterior">Versiones</button>
      <a class="btn btn-light-full" href="./simulador.php">Simulador</a>
    </div>
  </header>

  <main class="workspace" id="workspace">
    <aside class="left-panel" id="left-panel">
      <div class="left-tabs" role="tablist" aria-label="Panel de trabajo">
        <button class="left-tab active" id="tab-objects" data-left-tab="objects">Objetos</button>
        <button class="left-tab" id="tab-scenarios" data-left-tab="scenarios">Escenarios</button>
        <button class="left-tab" id="tab-properties" data-left-tab="properties">Propiedades</button>
      </div>
      <button class="panel-collapse panel-collapse-left" id="collapse-left" title="Contraer panel" aria-label="Contraer panel">‹</button>

      <div class="left-tab-content active" id="left-tab-objects">
        <div class="library-search-wrap">
          <label class="search-box"><span class="search-icon">⌕</span><input id="object-search" type="search" placeholder="Buscar objeto..."></label>
        </div>
        <div id="category-tabs" class="category-tabs" aria-hidden="true">
          <button class="category-tab active" data-category="all">Todos</button>
          <button class="category-tab" data-category="mobiliario">Mobiliario</button>
          <button class="category-tab" data-category="computacion">Cómputo</button>
          <button class="category-tab" data-category="personas">Personas</button>
          <button class="category-tab" data-category="arquitectura">Arquitectura</button>
          <button class="category-tab" data-category="equipamiento">Equipamiento</button>
        </div>
        <div id="object-library" class="object-library"></div>
        <div class="library-tip"><span class="tip-icon">✦</span><span>Arrastra un objeto al escenario o selecciónalo y haz clic para colocarlo.</span></div>
      </div>

      <div class="left-tab-content" id="left-tab-scenarios">
        <div class="sidebar-heading"><span class="eyebrow">PLANTILLAS</span><h2>Escenarios listos para usar</h2><p>Selecciona la Pirámide SENATI, un aula o un edificio genérico. Personaliza cada modelo en 3D.</p></div>
        <button class="scenario-card selected" id="pyramid-template" type="button">
          <span class="scenario-card-art pyramid-thumb"><img src="./referencias/senati_frontal.jpg" alt="Fotografía frontal de SENATI" loading="lazy"></span>
          <span class="scenario-card-copy"><b>Pirámide · Dirección Nacional</b><small>6 pisos · aulas · 2 escaleras · ascensor didáctico</small><em>Crear maqueta 3D</em></span>
        </button>
        <button class="scenario-card" id="classroom-template">
          <span class="scenario-card-art"><span class="scenario-room-art"></span></span>
          <span class="scenario-card-copy"><b>Aula SENATI</b><small>Laboratorio de cómputo · 20 × 12 m · 24 puestos</small><em>Crear escenario</em></span>
        </button>
        <button class="scenario-card" id="building-template">
          <span class="scenario-card-art"><span class="scenario-room-art"></span></span>
          <span class="scenario-card-copy"><b>Edificio de 2 pisos · Default 2</b><small>8 participantes · escalera · pasadizo · salida exterior</small><em>Crear escenario</em></span>
        </button>
        <button class="scenario-card scenario-card-blank" id="blank-template">
          <span class="scenario-blank-icon">＋</span><span class="scenario-card-copy"><b>Escenario vacío</b><small>Un espacio nuevo para diseñar desde cero</small><em>Crear escenario</em></span>
        </button>
        <div class="scenario-help"><b>Consejo</b><span>Guarda tus escenarios para reutilizarlos y preparar diferentes prácticas de clase. <a href="VISTA_DIMENSIONES_V10.html" target="_blank" rel="noopener">Ver medidas de la Pirámide V10</a>.</span></div>
      </div>

      <div class="left-tab-content" id="left-tab-properties">
        <div class="sidebar-heading"><span class="eyebrow">INSPECTOR</span><h2>Propiedades del objeto</h2><p>Selecciona un objeto en el aula para editar sus medidas y ubicación.</p></div>
        <div id="empty-inspector" class="empty-inspector"><div class="empty-icon">◇</div><b>Ningún objeto seleccionado</b><span>Haz clic sobre un escritorio, silla, ventana o persona.</span></div>
        <div id="object-inspector" class="object-inspector hidden">
          <label>Nombre<input id="prop-label" type="text" maxlength="80"></label>
          <label>Color del objeto<input id="prop-color" type="color" value="#1655aa" title="Aplicar color al objeto seleccionado"></label>
          <div id="prop-screen-wrap" class="property-group hidden"><b>Pantalla del equipo</b><label><select id="prop-screen"><option value="windows11">Windows 11</option><option value="senati">Logo SENATI</option><option value="blank">Presentación neutra</option></select></label></div>
          <div class="property-group"><b>Posición (metros)</b><div class="property-grid">
            <label>X<input id="prop-x" type="number" step="0.1"></label>
            <label>Y<input id="prop-y" type="number" step="0.1"></label>
            <label>Z<input id="prop-z" type="number" step="0.1"></label>
          </div></div>
          <div class="property-group"><b>Rotación</b><div class="rotate-actions">
            <button class="btn btn-quiet" data-rotate="-45">−45°</button><button class="btn btn-quiet" data-rotate="45">+45°</button><button class="btn btn-quiet" data-rotate="90">90°</button>
          </div></div>
          <div class="property-group"><b>Escala</b><div class="property-grid">
            <label>X<input id="prop-sx" type="number" min=".1" max="5" step=".1"></label>
            <label>Y<input id="prop-sy" type="number" min=".1" max="5" step=".1"></label>
            <label>Z<input id="prop-sz" type="number" min=".1" max="5" step=".1"></label>
          </div></div>
          <div class="inspector-actions"><button class="btn btn-quiet" id="duplicate-object">Duplicar</button><button class="btn btn-danger" id="delete-object">Eliminar</button></div>
        </div>
        <div class="placed-list-head"><b>Objetos en el escenario</b><span class="count-pill" id="object-count">0</span></div>
        <div id="placed-objects" class="placed-objects"><span class="muted">Todavía no hay objetos.</span></div>
      </div>
    </aside>
    <div class="panel-resizer" id="resize-left" role="separator" aria-label="Redimensionar biblioteca"></div>

    <section class="stage-area" id="stage-area">
      <div class="stage-toolbar" aria-label="Herramientas del escenario">
        <div class="tool-group">
          <button class="tool-btn active" id="tool-select" title="Seleccionar" aria-label="Seleccionar"><svg viewBox="0 0 24 24"><path d="M5 3l14 10-6 1.2L10 20 5 3z"/></svg></button>
          <button class="tool-btn" id="tool-move" title="Mover" aria-label="Mover"><svg viewBox="0 0 24 24"><path d="M12 2v20M2 12h20M12 2l-3 3m3-3 3 3M12 22l-3-3m3 3 3-3M2 12l3-3m-3 3 3 3m16-3-3-3m3 3-3 3"/></svg></button>
          <button class="tool-btn" id="tool-rotate" title="Rotar" aria-label="Rotar"><svg viewBox="0 0 24 24"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 11.9-3"/></svg></button>
          <button class="tool-btn" id="tool-duplicate" title="Duplicar" aria-label="Duplicar"><svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg></button>
          <button class="tool-btn" id="tool-delete" title="Eliminar selección" aria-label="Eliminar selección"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/></svg></button>
        </div>
        <button class="view-menu-button" id="tool-top" title="Vista en perspectiva"><span>Ver</span><span>⌄</span></button>
        <button class="walk-toolbar-btn" id="tool-walk" title="Recorrer escenario">♙ Recorrer</button>
        <button class="tool-btn fullscreen-btn" id="tool-fullscreen" title="Pantalla completa" aria-label="Pantalla completa"><svg viewBox="0 0 24 24"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></svg></button>
        <span class="tool-aux" hidden><button class="tool-btn" id="tool-grid" title="Cuadrícula">▦</button><button class="tool-btn" id="tool-roof" title="Techo">▱</button></span>
      </div>
      <div id="viewport" class="viewport">
        <button id="walk-exit-button" class="hidden" type="button">Salir del recorrido · ESC</button>
        <button class="scene-panel-toggle scene-panel-left" id="show-left-panel" title="Contraer / expandir biblioteca" aria-label="Contraer o expandir biblioteca">‹</button>
        <button class="scene-panel-toggle scene-panel-right" id="show-right-panel" title="Contraer / expandir configuración" aria-label="Contraer o expandir configuración">›</button>
        <div id="viewport-help" class="hidden"></div>
        <div class="scene-top-label"><span class="live-dot"></span> VISTA 3D EN TIEMPO REAL</div>
        <div class="walk-hud hidden" id="walk-hud"><b>RECORRIDO EN PRIMERA PERSONA</b><span>W A S D para caminar · Mouse para mirar · ESC para salir</span></div>
        <div class="walk-crosshair hidden" id="walk-crosshair">＋</div>
        <div class="scene-bottom-left"><span class="scene-tag" id="scene-template-tag">Pirámide SENATI · maqueta exterior</span><span class="scene-tag" id="viewport-status">Escenario 20 × 12 m</span></div>
        <div class="scene-bottom-right"><span class="scene-tag"><span class="scene-tag-icon">✎</span><span id="stage-dimensions">56 × 38 m</span></span><span class="scene-tag"><span class="scene-tag-icon">♙</span><span id="scene-person-count">0</span></span></div>
      </div>
      <div class="stage-footer"><span><i class="status-dot"></i><span id="save-status">Cambios sin guardar</span></span><span>Orbitar · Rueda: zoom · Supr: eliminar · R: rotar</span></div>
    </section>

    <div class="panel-resizer" id="resize-right" role="separator" aria-label="Redimensionar configuración"></div>
    <aside class="right-panel" id="right-panel">
      <div class="right-panel-head"><span class="right-title-icon">▦</span><b>Área de construcción</b><button class="panel-collapse panel-collapse-right" id="collapse-right" title="Contraer panel" aria-label="Contraer panel">›</button></div>
      <section class="settings-card room-settings-card">
        <div class="settings-card-title"><span class="mini-icon">⌄</span><b>Dimensiones del escenario</b></div>
        <div class="dimension-grid">
          <label>Ancho (m)<input id="room-width" type="number" min="3" max="100" step="0.5" value="20"></label>
          <label>Largo (m)<input id="room-depth" type="number" min="3" max="100" step="0.5" value="12"></label>
          <label>Altura (m)<input id="room-height" type="number" min="2.2" max="20" step="0.1" value="3.35"></label>
        </div>
        <button class="btn btn-primary btn-full" id="apply-dimensions">Actualizar dimensiones</button>
      </section>
      <section class="settings-card pyramid-settings" id="pyramid-controls" hidden>
        <div class="settings-card-title"><span class="mini-icon">◈</span><b>Dirección Nacional SENATI</b></div>
        <label class="appearance-field">Visualización del edificio
          <select id="pyramid-shell-mode">
            <option value="exterior">Fachada completa (fotografías)</option>
            <option value="transparente">Fachada + plantas esquemáticas</option>
            <option value="estructura">Plantas y soportes esquemáticos</option>
          </select>
        </label>
        <div class="color-grid"><label>Hormigón<input id="pyramid-facade-color" type="color" value="#afa59b"></label><label>Cartel<input id="pyramid-sign-color" type="color" value="#1251cb"></label></div>
        <p class="pyramid-warning">Recreación educativa basada en fotografías. Las losas, alturas y distribución interior son orientativas y no representan el plano estructural real.</p>
        <div class="pyramid-reference-grid">
          <a href="./referencias/senati_frontal.jpg" target="_blank" rel="noopener"><img src="./referencias/senati_frontal.jpg" alt="Fotografía fachada frontal" loading="lazy">Frente</a>
          <a href="./referencias/senati_perspectiva.jpg" target="_blank" rel="noopener"><img src="./referencias/senati_perspectiva.jpg" alt="Fotografía perspectiva" loading="lazy">Perspectiva</a>
        </div>
      </section>
      <section class="settings-card floor-manager-card">
        <div class="settings-card-title"><span class="mini-icon">▦</span><b>Construcción por pisos</b></div>
        <label class="appearance-field">Piso donde construir<select id="construction-floor"><option value="all">Vista global · todos los niveles</option><option value="0">Piso 1</option></select></label>
        <label class="appearance-field">Alcance de edición<select id="floor-edit-scope"><option value="global">Global · todos los pisos</option><option value="0">Piso 1</option></select></label>
        <div class="floor-manager-actions"><button class="btn btn-light-full" id="add-floor" type="button">＋ Agregar piso</button><button class="btn btn-light-full" id="remove-floor" type="button" disabled>− Quitar piso</button></div>
        <small id="floor-manager-hint" class="floor-manager-hint">Este escenario tiene un nivel. Agrega el segundo piso para habilitar la conexión vertical.</small>
      </section>
      <section class="settings-card automatic-card">
        <div class="settings-card-title"><span class="mini-icon">⚙</span><b>Equipamiento automático</b></div>
        <label class="setting-check"><input id="auto-station" type="checkbox" checked><span><b>Equipar escritorios</b><small>PC All-in-One, teclado y mouse</small></span></label>
        <label class="setting-check"><input id="auto-seat" type="checkbox" checked><span><b>Llenar asientos</b><small>Estudiantes sentados en cada silla</small></span></label>
        <button class="btn btn-light-full" id="apply-station">Aplicar a escritorios existentes</button>
        <button class="btn btn-light-full" id="apply-seats">Aplicar a sillas existentes</button>
      </section>
      <section class="settings-card quick-view-card">
        <div class="settings-card-title"><span class="mini-icon">☼</span><b>Vista rápida</b></div>
        <div class="quick-view-grid">
          <button data-view="front"><span><svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 9h8M8 13h8"/></svg></span>Frontal</button>
          <button data-view="back"><span><svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 15h8M8 11h8"/></svg></span>Posterior</button>
          <button data-view="left"><span><svg viewBox="0 0 24 24"><path d="M5 4h14v16H5zM5 12h14"/></svg></span>Lateral I.</button>
          <button data-view="right"><span><svg viewBox="0 0 24 24"><path d="M5 4h14v16H5zM5 12h14"/></svg></span>Lateral D.</button>
          <button data-view="top"><span><svg viewBox="0 0 24 24"><path d="M4 8l8-4 8 4-8 4-8-4zM4 8v8l8 4 8-4V8M12 12v8"/></svg></span>Superior</button>
          <button data-view="perspective" class="active"><span><svg viewBox="0 0 24 24"><path d="M3 8l9-5 9 5-9 5-9-5zM3 8v8l9 5 9-5V8M12 13v8"/></svg></span>Perspectiva</button>
        </div>
      </section>
      <section class="settings-card options-card">
        <div class="settings-card-title"><span class="mini-icon">✎</span><b>Opciones</b></div>
        <label class="switch-row"><span>Mostrar cuadrícula</span><input type="checkbox" id="opt-grid" checked><i></i></label>
        <label class="switch-row"><span>Sombras</span><input type="checkbox" id="opt-shadows" checked><i></i></label>
        <label class="switch-row"><span>Iluminación realista</span><input type="checkbox" id="opt-realistic" checked><i></i></label>
        <label class="switch-row"><span>Mostrar techo</span><input type="checkbox" id="opt-roof"><i></i></label>
        <label class="appearance-field">Clima del escenario<select id="climate-mode"><option value="day">Día despejado</option><option value="night">Noche</option><option value="rain">Lluvia</option></select></label>
      </section>
      <details class="settings-card appearance-card">
        <summary>Materiales y colores</summary>
        <div class="appearance-body">
          <label class="appearance-field">Tipo de piso<select id="floor-type"><option value="tile">Cerámico cuadrado</option><option value="wood">Madera</option><option value="concrete">Concreto pulido</option><option value="carpet">Alfombra</option></select></label>
          <div class="color-grid">
            <label>Piso<input id="floor-color" type="color" value="#f3f4f6"></label>
            <label>Paredes<input id="wall-color" type="color" value="#e6e1d8"></label>
            <label>Escritorios<input id="desk-color" type="color" value="#164b82"></label>
            <label>Sillas<input id="chair-color" type="color" value="#171c24"></label>
          </div>
          <button class="btn btn-light-full" id="reset-appearance">Restablecer colores</button>
        </div>
      </details>
    </aside>
  </main>
</div>
<div id="toast" class="toast" role="status"></div>
<script type="module" src="./public/assets/editor.js?v=<?= htmlspecialchars($assetVersion, ENT_QUOTES, 'UTF-8') ?>"></script>
</body>
</html>
