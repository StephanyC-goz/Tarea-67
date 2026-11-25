<?php
declare(strict_types=1);
require_once __DIR__.'/config/auth.php';auth_session();
if($_SERVER['REQUEST_METHOD']!=='POST'){http_response_code(405);exit('Método no permitido');}
csrf_must($_POST['csrf_token']??null);$uid=isset($_SESSION['user_id'])?(int)$_SESSION['user_id']:null;auth_log($uid,'logout');
$_SESSION=[];session_regenerate_id(true);session_destroy();header('Location: login.php');exit;
