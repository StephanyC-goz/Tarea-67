<?php
declare(strict_types=1);
require_once __DIR__.'/config/auth.php';
require_admin();
$client=$_SERVER['REMOTE_ADDR']??'';
if(!in_array($client,['127.0.0.1','::1'],true)){http_response_code(403);exit('Solo se permite diagnóstico desde localhost.');}
$checks=[];
$checks['PHP ≥ 8.1']=version_compare(PHP_VERSION,'8.1.0','>=')?'OK':'Error: actualiza PHP';
$checks['Extensión PDO MySQL']=in_array('mysql',PDO::getAvailableDrivers(),true)?'OK':'Falta habilitar pdo_mysql';
foreach(['public/assets/editor.js','public/assets/simulator.js','public/assets/recorrer.js','public/assets/editor.css','index.php','api/scenarios.php','referencias/senati_frontal.jpg'] as $name){
$checks[$name]=is_file(__DIR__.'/'.$name)&&filesize(__DIR__.'/'.$name)>0?'OK':'Falta archivo';}
try{require_once __DIR__.'/config/database.php';$db=db();$db->query('SELECT id FROM scenarios LIMIT 1');$db->query('SELECT id FROM scenario_versions LIMIT 1');$checks['Conexión MySQL + tablas']='OK';}
catch(Throwable $e){$checks['Conexión MySQL + tablas']='No configurada. Importa database/schema.sql o ACTUALIZAR_BD_EXISTENTE.sql';}
function esc($str){return htmlspecialchars((string)$str,ENT_QUOTES,'UTF-8');}
?><!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Diagnóstico · Pirámide SENATI</title><style>body{font:16px system-ui;background:#edf2f7;color:#203047;margin:0;padding:36px}.wrap{max-width:810px;margin:auto;background:#fff;border-radius:18px;padding:28px;box-shadow:0 6px 35px #1233}h1{margin-top:0}.item{display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid #e8eef4;gap:20px}b{color:#1a4b8e}.good{color:#177c4e}.bad{color:#b83b31}code{background:#eaf0f7;padding:3px 6px;border-radius:5px}</style><div class="wrap"><h1>Diagnóstico de instalación</h1><p>Proyecto fusionado Dirección Nacional SENATI / editor de escenarios 3D.</p><?php foreach($checks as $k=>$v):?><div class="item"><b><?=esc($k)?></b><span class="<?= $v==='OK'?'good':'bad' ?>"><?=esc($v)?></span></div><?php endforeach;?><p>Si faltan los archivos <code>public/assets</code>, ejecuta <code>COMPILAR-FRONTEND.bat</code> o <code>npm install</code> y <code>npm run build</code> desde la carpeta raíz.</p><p><a href="./index.php">Ir al editor</a></p></div></html>
