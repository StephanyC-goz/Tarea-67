<?php
declare(strict_types=1);
require_once __DIR__.'/config/auth.php';$me=require_admin();$error='';$notice='';
try{$pdo=db();}catch(Throwable $e){http_response_code(500);exit('Error de conexión MySQL');}
if($_SERVER['REQUEST_METHOD']==='POST'){
 csrf_must($_POST['csrf_token']??null);
 $uid=filter_var($_POST['user_id']??null,FILTER_VALIDATE_INT);
 $role=(string)($_POST['role']??'visitante');$active=(string)($_POST['active']??'1');
 if(!$uid||!in_array($role,['admin','alumno','visitante'],true)||!in_array($active,['0','1'],true))$error='Datos inválidos.';
 else{
  try{
   $pdo->beginTransaction();$q=$pdo->prepare('SELECT id,role,is_active FROM users WHERE id=? FOR UPDATE');$q->execute([$uid]);$other=$q->fetch();
   if(!$other){$error='Usuario no encontrado.';}
   elseif((int)$uid===(int)$me['id']&&($active==='0'||$role!=='admin')){$error='No puedes desactivar tu propia cuenta administradora.';}
   else{
     if($other['role']==='admin'&&($role!=='admin'||$active==='0')){
      $activeAdminCount=(int)$pdo->query("SELECT COUNT(*) FROM users WHERE role='admin' AND is_active=1")->fetchColumn();
      if($activeAdminCount<=1)$error='Debe quedar al menos un administrador activo.';
     }
     if(!$error){$pdo->prepare('UPDATE users SET role=?,is_active=? WHERE id=?')->execute([$role,(int)$active,$uid]);$notice='Permisos actualizados.';}
   }
   if($error)$pdo->rollBack();else $pdo->commit();
   if(!$error)auth_log((int)$me['id'],'admin_user_update','Usuario '.$uid.' => '.$role.'/'.(int)$active);
  }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();error_log('Admin: '.$e->getMessage());$error='No se pudo actualizar el usuario.';}
 }
}
$users=$pdo->query('SELECT id,full_name,email,role,is_active,created_at,last_login_at FROM users ORDER BY created_at DESC')->fetchAll();
$logs=$pdo->query('SELECT l.event,l.detail,l.created_at,u.email FROM access_logs l LEFT JOIN users u ON u.id=l.user_id ORDER BY l.id DESC LIMIT 30')->fetchAll();
?><!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Administración | SENATI 3D</title><link rel="stylesheet" href="assets/auth.css"></head><body><main class="dashboard"><header class="dash-bar"><div><div class="brand">SENATI 3D</div><h1>Administración de accesos</h1><p class="muted">Gestiona cuentas y permisos. Solo las personas administradoras pueden editar escenarios.</p></div><div class="dash-actions"><a href="recorrer.php">Recorrer escenarios</a><a href="index.php">Editor 3D</a><a href="simulador.php">Simulador</a><form method="post" action="logout.php"><input type="hidden" name="csrf_token" value="<?=h(csrf_token())?>"><button class="primary">Salir</button></form></div></header><section class="admin-summary"><div class="admin-stat"><small>CUENTAS REGISTRADAS</small><strong><?=count($users)?></strong><span>Usuarios del entorno 3D</span></div><div class="admin-stat"><small>CUENTAS ACTIVAS</small><strong><?=count(array_filter($users,fn($u)=>(int)$u['is_active']===1))?></strong><span>Con permiso de acceso</span></div><div class="admin-stat"><small>PENDIENTES / BLOQUEADAS</small><strong><?=count(array_filter($users,fn($u)=>(int)$u['is_active']===0))?></strong><span>Revisar solicitudes</span></div><div class="admin-stat"><small>ADMINISTRADORES</small><strong><?=count(array_filter($users,fn($u)=>$u['role']==='admin'))?></strong><span>Gestión completa</span></div></section><?php if($error):?><p class="error"><?=h($error)?></p><?php endif;if($notice):?><p class="success"><?=h($notice)?></p><?php endif;?><h2>Usuarios (<?=count($users)?>)</h2><div class="table-wrap"><table><thead><tr><th>Nombre y correo</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead><tbody><?php foreach($users as $u):?><tr><td><b><?=h((string)$u['full_name'])?></b><br><small><?=h((string)$u['email'])?></small></td><td><?=h((string)$u['role'])?></td><td><?=((int)$u['is_active']===1?'Activo':'Bloqueado')?></td><td><form class="inline" method="post"><input type="hidden" name="csrf_token" value="<?=h(csrf_token())?>"><input type="hidden" name="user_id" value="<?=(int)$u['id']?>"><select name="role" aria-label="Rol"><option value="visitante" <?=$u['role']==='visitante'?'selected':''?>>Visitante</option><option value="alumno" <?=$u['role']==='alumno'?'selected':''?>>Alumno</option><option value="admin" <?=$u['role']==='admin'?'selected':''?>>Administrador</option></select><select name="active" aria-label="Acceso"><option value="1" <?=$u['is_active']?'selected':''?>>Activo</option><option value="0" <?=$u['is_active']?'':'selected'?>>Bloqueado</option></select><button>Guardar</button></form></td></tr><?php endforeach;?></tbody></table></div><h2>Actividad reciente</h2><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Detalle</th></tr></thead><tbody><?php foreach($logs as $l):?><tr><td><?=h((string)$l['created_at'])?></td><td><?=h((string)($l['email']??'Visitante'))?></td><td><?=h((string)$l['event'])?></td><td><?=h((string)$l['detail'])?></td></tr><?php endforeach;?></tbody></table></div></main></body></html>
