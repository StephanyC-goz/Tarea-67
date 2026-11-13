<?php
declare(strict_types=1);
require_once __DIR__.'/database.php';
function auth_session(): void {
    if(session_status() === PHP_SESSION_ACTIVE) return;
    ini_set('session.use_strict_mode','1');
    ini_set('session.use_only_cookies','1');
    session_name('senati3d_session');
    session_set_cookie_params(['lifetime'=>0,'path'=>'/','secure'=>!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS']!=='off','httponly'=>true,'samesite'=>'Lax']);
    session_start();
    if(empty($_SESSION['csrf_token'])) $_SESSION['csrf_token']=bin2hex(random_bytes(32));
}
function auth_user(): ?array {
    auth_session();
    if(empty($_SESSION['user_id'])) return null;
    try {
        $q=db()->prepare('SELECT id, full_name, email, role, is_active FROM users WHERE id=? LIMIT 1');
        $q->execute([(int)$_SESSION['user_id']]);
        $user=$q->fetch();
        if(!$user || !(int)$user['is_active']) {unset($_SESSION['user_id']);return null;}
        return $user;
    }catch(Throwable $e){ error_log('Auth: '.$e->getMessage());return null; }
}
function require_login(): array {
    $u=auth_user();
    if(!$u){header('Location: login.php');exit;}
    return $u;
}
function require_admin(): array {
    $u=require_login();
    if($u['role']!=='admin'){header('Location: recorrer.php');exit;}
    return $u;
}
function csrf_token(): string {auth_session();return (string)$_SESSION['csrf_token'];}
function csrf_ok(?string $given): bool {return is_string($given)&&hash_equals(csrf_token(),$given);}
function csrf_must(?string $given): void {if(!csrf_ok($given)){http_response_code(403);exit('Solicitud inválida. Recarga la página.');}}
function h(string $text): string {return htmlspecialchars($text,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');}
function auth_log(?int $userId,string $action,string $detail=''): void {
    try{$q=db()->prepare('INSERT INTO access_logs(user_id,event,detail,ip_address) VALUES(?,?,?,?)');$q->execute([$userId,$action,(function_exists('mb_substr')?mb_substr($detail,0,150):substr($detail,0,150)),substr($_SERVER['REMOTE_ADDR']??'',0,45)]);}catch(Throwable $e){error_log('Audit: '.$e->getMessage());}
}
