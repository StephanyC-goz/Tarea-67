<?php
declare(strict_types=1);
require_once __DIR__.'/config/auth.php';
if(auth_user()){header('Location: recorrer.php');exit;}
$error='';
if($_SERVER['REQUEST_METHOD']==='POST'){
    csrf_must($_POST['csrf_token']??null);
    $count=(int)($_SESSION['failed_logins']??0);
    $last=(int)($_SESSION['failed_at']??0);
    if($count>=8 && (time()-$last)<300){$error='Demasiados intentos. Vuelve a intentarlo en unos minutos.';}
    else {
        $email=strtolower(trim((string)($_POST['email']??'')));
        $pass=(string)($_POST['password']??'');
        try {
            $q=db()->prepare('SELECT id,password_hash,is_active FROM users WHERE email=? LIMIT 1');$q->execute([$email]);$u=$q->fetch();
            if(!$u || !password_verify($pass,$u['password_hash'])){
                $error='Correo o contraseña incorrectos.';$_SESSION['failed_logins']=$count+1;$_SESSION['failed_at']=time();auth_log(null,'login_failed','Intento de inicio de sesión');
            }elseif(!(int)$u['is_active']){
                $error='Tu cuenta está pendiente de aprobación del administrador, o fue bloqueada.';
            }else{
                session_regenerate_id(true);$_SESSION['user_id']=(int)$u['id'];$_SESSION['failed_logins']=0;db()->prepare('UPDATE users SET last_login_at=NOW() WHERE id=?')->execute([(int)$u['id']]);
                auth_log((int)$u['id'],'login','Inicio de sesión');header('Location: recorrer.php');exit;
            }
        }catch(Throwable $e){error_log('Login: '.$e->getMessage());$error='No se puede acceder a usuarios. Importa database/usuarios.sql y revisa MySQL.';}
    }
}
?><!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Iniciar sesión · SENATI 3D</title><link rel="stylesheet" href="assets/auth.css"></head><body class="auth-page">
<main class="auth-layout">
 <section class="auth-hero"><div class="hero-overlay"><div class="hero-brand"><span class="hero-mark">S</span><span>ENTORNO 3D / SENATI</span></div><div class="hero-text"><span class="eyebrow">EXPERIENCIA DIGITAL · DIRECCIÓN NACIONAL</span><h2>Explora. Aprende.<br><em>Transforma espacios.</em></h2><p>Recorre ambientes virtuales, interactúa con los equipos y conoce los escenarios educativos desde cualquier navegador.</p><div class="hero-pills"><span>◈ 6 pisos</span><span>◈ 120 estaciones</span><span>◈ Experiencia interactiva</span></div></div><p class="hero-foot">Maqueta académica independiente · No es un portal oficial de autenticación SENATI.</p></div></section>
 <section class="auth-right"><div class="auth-card"><div class="auth-label">ACCESO A LA PLATAFORMA</div><div class="brand">Bienvenido de nuevo</div><h1>Ingresa a tu espacio 3D</h1><p class="muted">Los visitantes y alumnos acceden con funciones limitadas. Las cuentas administradoras se reconocen por el rol guardado en la base de datos y habilitan editor, simulador y gestión de usuarios.</p><div class="access-types"><span>◉ Visitante</span><span>◉ Alumno</span><span>✧ Administrador</span></div><div class="role-help"><b>¿Cómo se identifica el acceso?</b><small>• <b>Administrador</b>: cuenta con rol <code>admin</code> aprobada en MySQL.<br>• <b>Alumno</b>: cuenta con rol <code>alumno</code>.<br>• <b>Visitante</b>: cuenta con rol <code>visitante</code> o acceso público restringido.</small></div>
 <?php if(isset($_GET['pending'])):?><p class="success">Registro enviado. Tu cuenta requiere aprobación del administrador.</p><?php endif;?>
 <?php if($error):?><p class="error"><?=h($error)?></p><?php endif;?>
 <form method="post"><input type="hidden" name="csrf_token" value="<?=h(csrf_token())?>"><label>Correo electrónico<input name="email" type="email" required maxlength="190" autocomplete="username" placeholder="nombre@correo.com"></label><label>Contraseña<input name="password" type="password" required autocomplete="current-password" placeholder="Tu contraseña"></label><button class="primary" type="submit">Ingresar a los escenarios <span>→</span></button></form>
 <div class="guest-actions"><a class="ghost-link" href="recorrer.php?guest=1">Entrar como visitante</a></div><div class="auth-links">¿No tienes una cuenta? <a href="registro.php">Crear una cuenta</a></div><p class="privacy-note">Acceso protegido · Las contraseñas se verifican de forma segura y no se envían al portal oficial de SENATI.</p></div></section>
</main></body></html>
