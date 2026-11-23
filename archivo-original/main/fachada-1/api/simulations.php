<?php
declare(strict_types=1);
require_once __DIR__.'/../config/auth.php';
auth_session();
$authUser=auth_user();
if(!$authUser){http_response_code(401);header('Content-Type: application/json');echo json_encode(['success'=>false,'message'=>'Inicia sesión.']);exit;}
if($_SERVER['REQUEST_METHOD']!=='GET'&&$authUser['role']!=='admin'){http_response_code(403);header('Content-Type: application/json');echo json_encode(['success'=>false,'message'=>'Solo administrador.']);exit;}
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

require_once __DIR__.'/../config/database.php';
function output(array $data,int $code=200):never{http_response_code($code);echo json_encode($data,JSON_UNESCAPED_UNICODE);exit;}
try{
 $pdo=db();$action=(string)($_GET['action']??'');
 if($action==='list' && $_SERVER['REQUEST_METHOD']==='GET'){
   $scenario=filter_input(INPUT_GET,'scenario',FILTER_VALIDATE_INT);
   if(!$scenario)output(['success'=>false,'message'=>'Escenario inválido'],422);
   $q=$pdo->prepare('SELECT id,incident_type,participants,evacuated,without_route,elapsed_seconds,created_at FROM simulation_runs WHERE scenario_id=? ORDER BY created_at DESC LIMIT 30');
   $q->execute([$scenario]);output(['success'=>true,'runs'=>$q->fetchAll()]);
 }
 if($action==='save' && $_SERVER['REQUEST_METHOD']==='POST'){
   $token=(string)($_SERVER['HTTP_X_CSRF_TOKEN']??'');$expected=(string)($_SESSION['csrf_token']??'');
   if($expected===''||!hash_equals($expected,$token))output(['success'=>false,'message'=>'La sesión expiró. Recarga el simulador.'],403);
   $data=json_decode(file_get_contents('php://input')?:'{}',true);
   if(!is_array($data))output(['success'=>false,'message'=>'JSON inválido'],422);
   $scenario=(int)($data['scenarioId']??0);$incident=(string)($data['incident']??'');
   if($scenario<1||!in_array($incident,['fire','earthquake','accident','electrical'],true))output(['success'=>false,'message'=>'Datos inválidos'],422);
   $check=$pdo->prepare('SELECT id FROM scenarios WHERE id=?');$check->execute([$scenario]);
   if(!$check->fetchColumn())output(['success'=>false,'message'=>'Escenario no encontrado'],404);
   $participants=max(0,min(500,(int)($data['participants']??0)));
   $evacuated=max(0,min($participants,(int)($data['evacuated']??0)));
   $failed=max(0,min($participants,(int)($data['withoutRoute']??0)));
   $elapsed=max(0,min(86400,(float)($data['elapsed']??0)));
   $events=$data['events']??[];
   if(!is_array($events)||count($events)>100)output(['success'=>false,'message'=>'Máximo 100 eventos'],422);
   $notes=substr(trim((string)($data['notes']??'')),0,200);
   $pdo->beginTransaction();
   $q=$pdo->prepare('INSERT INTO simulation_runs(scenario_id,incident_type,participants,evacuated,without_route,elapsed_seconds,notes) VALUES(?,?,?,?,?,?,?)');
   $q->execute([$scenario,$incident,$participants,$evacuated,$failed,$elapsed,$notes]);
   $runId=(int)$pdo->lastInsertId();
   $q=$pdo->prepare('INSERT INTO simulation_events(run_id,event_time,event_type,message) VALUES(?,?,?,?)');
   foreach($events as $event){
     if(!is_array($event))continue;
     $type=(string)($event['state']??'info');
     if(!in_array($type,['info','queued','moving','safe','blocked','exit'],true))$type='info';
     $message=substr(trim((string)($event['message']??'')),0,400);
     $time=max(0,min($elapsed,(float)($event['time']??0)));
     $q->execute([$runId,$time,$type,$message]);
   }
   $pdo->commit();output(['success'=>true,'id'=>$runId,'message'=>'Resultados guardados en MySQL.']);
 }
 output(['success'=>false,'message'=>'Acción desconocida'],405);
}catch(Throwable $e){
 if(isset($pdo)&&$pdo->inTransaction())$pdo->rollBack();
 error_log('[SENATI Simulation] '.$e->getMessage());
 output(['success'=>false,'message'=>'No se pudo guardar. Revisa MySQL e importa las tablas SQL.'],500);
}
