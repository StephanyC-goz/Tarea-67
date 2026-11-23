<?php
declare(strict_types=1);
// Diagnostico PREVIO al inicio de sesion, restringido al servidor local.
$remote = $_SERVER['REMOTE_ADDR'] ?? '';
if (!in_array($remote, ['127.0.0.1', '::1'], true)) {
    http_response_code(403);
    exit('El diagnostico solo se permite desde localhost.');
}
$checks = [];
$add = static function (string $name, bool $ok, string $hint = '') use (&$checks): void {
    $checks[] = ['name' => $name, 'ok' => $ok, 'hint' => $hint];
};
$add('Servidor PHP', version_compare(PHP_VERSION, '8.1.0', '>='), 'Se necesita PHP 8.1 o superior.');
$add('Extension PDO MySQL', class_exists(PDO::class) && in_array('mysql', PDO::getAvailableDrivers(), true), 'Habilita pdo_mysql en Laragon.');
$required = [
    'config/auth.php' => 'Autenticacion',
    'config/database.php' => 'Configuracion MySQL',
    'registro.php' => 'Registro',
    'login.php' => 'Inicio de sesion',
    'index.php' => 'Editor',
    'recorrer.php' => 'Recorrido',
    'database/schema.sql' => 'Esquema aula3d',
    'public/assets/editor.js' => 'Editor compilado',
    'public/assets/recorrer.js' => 'Recorrido compilado',
    'public/assets/simulator.js' => 'Simulador compilado',
    'modulos/fachada-original/FACHADA_EXTERIOR.html' => 'Fachada original',
    'modulos/fachada-original/public/assets/exterior-preview.js' => 'Fachada compilada',
];
foreach ($required as $name => $label) {
    $file = __DIR__ . '/' . $name;
    $add($label, is_file($file) && filesize($file) > 0, $name);
}
if (is_file(__DIR__ . '/config/database.php') && class_exists(PDO::class)
    && in_array('mysql', PDO::getAvailableDrivers(), true)) {
    try {
        require_once __DIR__ . '/config/database.php';
        $db = db();
        $db->query('SELECT COUNT(*) FROM users')->fetchColumn();
        $db->query('SELECT COUNT(*) FROM scenarios')->fetchColumn();
        $add('Base de datos aula3d', true);
    } catch (Throwable $e) {
        $add('Base de datos aula3d', false, 'Inicia MySQL e importa database/schema.sql si la instalacion es nueva.');
    }
}
$ok = count(array_filter($checks, static fn (array $c): bool => $c['ok']));
$total = count($checks);
$h = static fn (string $v): string => htmlspecialchars($v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
?>
<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0c2242">
<title>Comprobar instalacion · SENATI 3D</title>
<style>
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 0 0,#1c467b,#08172c 68%);font:14px system-ui,Segoe UI,sans-serif;color:#e9f4ff;min-height:100vh}
main{max-width:840px;margin:0 auto;padding:38px 18px}.intro{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}
h1{font-size:clamp(28px,4vw,42px);letter-spacing:-.04em;line-height:1.12;margin:16px 0}.eyebrow{color:#86ceff;font-size:11px;font-weight:900;letter-spacing:.14em}
.summary{background:#ffffff12;border:1px solid #c1ddff3f;border-radius:13px;padding:12px 17px;font-weight:850}.list{background:#fbfdff;color:#1b385d;border-radius:20px;padding:10px 22px;box-shadow:0 22px 60px #030d1f5a}
.item{padding:13px 0;border-bottom:1px solid #e7eef7;display:flex;justify-content:space-between;align-items:center;gap:17px}.item:last-child{border-bottom:0}.item strong{display:block;font-size:13px}.item small{display:block;color:#637e9d;margin-top:3px;overflow-wrap:anywhere}.status{font-size:11px;font-weight:900;padding:7px 12px;border-radius:10px;white-space:nowrap}.status.ok{background:#e0f7e8;color:#176e3b}.status.bad{background:#fff0e7;color:#ac3a19}
.actions{display:flex;gap:12px;margin:22px 0;flex-wrap:wrap}.actions a{background:#2779ed;border-radius:11px;padding:12px 17px;color:white;text-decoration:none;font-weight:800}.actions a.alt{background:#ffffff20;border:1px solid #a1c9fa6b}
p{font-size:13px;line-height:1.8;color:#c7d9ef}code{color:#9cdcff}
</style></head><body><main>
<div class="intro"><div><div class="eyebrow">PIRAMIDE SENATI · DIAGNOSTICO LOCAL</div><h1>Estado de la instalacion</h1></div><div class="summary"><?= $ok ?> de <?= $total ?> comprobaciones correctas</div></div>
<div class="list">
<?php foreach($checks as $c): ?>
<div class="item"><div><strong><?= $h($c['name']) ?></strong><?php if($c['hint']): ?><small><?= $h($c['hint']) ?></small><?php endif; ?></div><span class="status <?= $c['ok']?'ok':'bad' ?>"><?= $c['ok']?'Correcto':'Revisar' ?></span></div>
<?php endforeach; ?>
</div>
<div class="actions"><a href="PANEL_UNIFICADO.html">Volver al portal</a><a class="alt" href="registro.php">Registro</a><a class="alt" href="login.php">Inicio de sesion</a></div>
<p>Si faltan los recursos compilados, abre PowerShell en la carpeta del proyecto y ejecuta <code>npm ci</code>, <code>npm run check</code> y <code>npm run build</code>. Si falla la base de datos, verifica MySQL y usa <code>database/schema.sql</code> solamente en una instalacion nueva. Esta pantalla no expone contrasenas ni errores internos de MySQL.</p>
</main></body></html>
