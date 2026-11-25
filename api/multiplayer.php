<?php
declare(strict_types=1);

require_once __DIR__.'/../config/auth.php';
auth_session();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('X-Content-Type-Options: nosniff');

$user=auth_user();
$isGuest=!empty($_SESSION['guest_user']);
if(!$user&&!$isGuest){
    http_response_code(401);
    echo json_encode(['success'=>false,'message'=>'Inicia sesión para entrar al recorrido multijugador.']);
    exit;
}
if(empty($_SESSION['walk_player_key']))$_SESSION['walk_player_key']=bin2hex(random_bytes(32));
$playerKey=(string)$_SESSION['walk_player_key'];
$csrf=(string)($_SESSION['csrf_token']??'');
$playerName=trim((string)($user['full_name']??($_SESSION['guest_user']['full_name']??'Visitante')));
$playerName=function_exists('mb_substr')?mb_substr($playerName,0,48):substr($playerName,0,48);
$userId=isset($user['id'])?(int)$user['id']:null;

if($_SERVER['REQUEST_METHOD']==='POST'){
    $given=(string)($_SERVER['HTTP_X_CSRF_TOKEN']??'');
    if($csrf===''||!hash_equals($csrf,$given)){
        http_response_code(403);
        echo json_encode(['success'=>false,'message'=>'La sesión expiró. Recarga el recorrido.']);
        exit;
    }
}
session_write_close();

function respond(array $data,int $code=200):never{
    http_response_code($code);
    echo json_encode($data,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
    exit;
}
function bodyData():array{
    $value=json_decode(file_get_contents('php://input')?:'{}',true);
    return is_array($value)?$value:[];
}
function numberInRange(mixed $value,float $min,float $max):float{
    $n=is_numeric($value)?(float)$value:0.0;
    return max($min,min($max,$n));
}

try{
    $pdo=db();
    $action=(string)($_GET['action']??'');
    if($action==='leave'&&$_SERVER['REQUEST_METHOD']==='POST'){
        $q=$pdo->prepare('DELETE FROM walk_players WHERE player_key=?');
        $q->execute([$playerKey]);
        respond(['success'=>true]);
    }
    if(in_array($action,['join','update'],true)&&$_SERVER['REQUEST_METHOD']==='POST'){
        $data=bodyData();
        $floor=(int)max(0,min(7,(int)($data['floor']??0)));
        $x=numberInRange($data['x']??0,-80,80);
        $y=numberInRange($data['y']??1.68,0,80);
        $z=numberInRange($data['z']??0,-80,80);
        $yaw=numberInRange($data['yaw']??0,-1000,1000);
        $scene=(string)($data['scene']??'piramide');
        if(!in_array($scene,['piramide','aula'],true))$scene='piramide';

        $sql='INSERT INTO walk_players
            (player_key,user_id,player_name,scene_key,floor_no,pos_x,pos_y,pos_z,yaw,updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,NOW())
            ON DUPLICATE KEY UPDATE user_id=VALUES(user_id),player_name=VALUES(player_name),
            scene_key=VALUES(scene_key),floor_no=VALUES(floor_no),pos_x=VALUES(pos_x),
            pos_y=VALUES(pos_y),pos_z=VALUES(pos_z),yaw=VALUES(yaw),updated_at=NOW()';
        $q=$pdo->prepare($sql);
        $q->execute([$playerKey,$userId,$playerName,$scene,$floor,$x,$y,$z,$yaw]);
        respond(['success'=>true,'player_key'=>$playerKey,'player_name'=>$playerName]);
    }
    if($action==='poll'&&$_SERVER['REQUEST_METHOD']==='GET'){
        $pdo->exec('DELETE FROM walk_players WHERE updated_at < (NOW() - INTERVAL 20 SECOND)');
        $scene=(string)($_GET['scene']??'piramide');
        if(!in_array($scene,['piramide','aula'],true))$scene='piramide';
        $q=$pdo->prepare('SELECT player_key,player_name,scene_key,floor_no,pos_x,pos_y,pos_z,yaw
            FROM walk_players
            WHERE scene_key=? AND player_key<>? AND updated_at >= (NOW() - INTERVAL 12 SECOND)
            ORDER BY player_name ASC');
        $q->execute([$scene,$playerKey]);
        respond(['success'=>true,'players'=>$q->fetchAll()]);
    }
    respond(['success'=>false,'message'=>'Acción no permitida.'],405);
}catch(Throwable $e){
    error_log('[SENATI Multiplayer] '.$e->getMessage());
    respond(['success'=>false,'message'=>'No se pudo sincronizar el recorrido multijugador. Verifica la tabla walk_players.'],500);
}
