<?php
declare(strict_types=1);
require_once __DIR__.'/config/auth.php';
if(auth_user()){header('Location: recorrer.php');exit;}
$error='';
if($_SERVER['REQUEST_METHOD']==='POST'){
    csrf_must($_POST['csrf_token']??null);
    $name=trim((string)($_POST['name']??''));$email=strtolower(trim((string)($_POST['email']??'')));$pass=(string)($_POST['password']??'');$requestedRole=(string)($_POST['account_role']??'visitante');
    if((function_exists('mb_strlen')?mb_strlen($name):strlen($name))<3||(function_exists('mb_strlen')?mb_strlen($name):strlen($name))>100||!filter_var($email,FILTER_VALIDATE_EMAIL)||strlen($pass)<10||strlen($pass)>128||!in_array($requestedRole,['visitante','alumno'],true)){$error='Completa el nombre, elige si ingresarás como visitante o alumno, usa un correo válido y una contraseña de 10 a 128 caracteres.';}
    else {
        try {
            $pdo=db();$pdo->beginTransaction();
            $exists=(int)$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
            // Primer administrador solo desde localhost; nunca expongas una instalación sin configurar.
            $isLocal=in_array($_SERVER['REMOTE_ADDR']??'',['127.0.0.1','::1'],true);
            if($exists===0&&!$isLocal){$pdo->rollBack();$error='El administrador inicial debe registrarse desde la misma computadora del servidor.';}
            else {
                $role=$exists===0?'admin':$requestedRole;
                $isActive=($role==='admin')?1:0;
                $q=$pdo->prepare('INSERT INTO users(full_name,email,password_hash,role,is_active) VALUES(?,?,?,?,?)');
                $q->execute([$name,$email,password_hash($pass,PASSWORD_DEFAULT),$role,$isActive]);
                $uid=(int)$pdo->lastInsertId();$pdo->commit();
                auth_log($uid,'register','Cuenta creada: '.$role.($isActive?' activo':' pendiente'));
                if($isActive){session_regenerate_id(true);$_SESSION['user_id']=$uid;header('Location: recorrer.php');}
                else header('Location: login.php?pending=1');exit;
            }
        }catch(Throwable $e){if(isset($pdo)&&$pdo->inTransaction())$pdo->rollBack();error_log('Register: '.$e->getMessage());$error='No se pudo registrar. Revisa la base de datos o si el correo ya está registrado.';}
    }
}
?><!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Registro · SENATI 3D</title><link rel="stylesheet" href="assets/auth.css"></head><body class="auth-page">
<main class="auth-layout"><section class="auth-hero"><div class="hero-overlay"><div class="hero-brand"><span class="hero-mark">S</span><span>ENTORNO 3D / SENATI</span></div><div class="hero-text"><span class="eyebrow">REGISTRO DE USUARIOS</span><h2>Una nueva forma<br><em>de explorar.</em></h2><p>Regístrate para recorrer los salones virtuales, utilizar sus computadoras y descubrir los seis pisos de la maqueta.</p><div class="hero-pills"><span>◈ Vista inmersiva</span><span>◈ Aula interactiva</span></div></div><p class="hero-foot">Proyecto académico independiente. No registra credenciales de SINFO.</p></div></section>
<section class="auth-right"><div class="auth-card"><div class="auth-label">CREA TU ACCESO</div><div class="brand">Únete a la experiencia</div><h1>Crear cuenta</h1><p class="muted">Elige si tu cuenta será de <b>visitante</b> o de <b>alumno</b>. Ambas requieren aprobación del administrador. La primera cuenta creada en localhost será administradora automáticamente.</p><?php if($error):?><p class="error"><?=h($error)?></p><?php endif;?>
<form method="post"><input type="hidden" name="csrf_token" value="<?=h(csrf_token())?>"><label>Nombre completo<input name="name" required minlength="3" maxlength="100" autocomplete="name" placeholder="Nombres y apellidos"></label><label>Tipo de acceso<select name="account_role" required><option value="visitante">Visitante · recorrido limitado</option><option value="alumno">Alumno · recorrido y aulas</option></select></label><label>Correo electrónico<input name="email" type="email" required maxlength="190" autocomplete="email" placeholder="nombre@correo.com"></label><label>Contraseña segura<input name="password" type="password" required minlength="10" maxlength="128" autocomplete="new-password" placeholder="Mínimo 10 caracteres"></label><button class="primary" type="submit">Crear mi cuenta <span>→</span></button></form><div class="auth-links">¿Ya tienes una cuenta? <a href="login.php">Iniciar sesión</a></div><p class="privacy-note">Tus credenciales se guardan mediante hash seguro de contraseña en la base de datos local.</p></div></section></main></body></html>
