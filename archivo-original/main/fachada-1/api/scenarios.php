<?php
declare(strict_types=1);

require_once __DIR__.'/../config/auth.php';
auth_session();
$authUser=auth_user();
if(!$authUser){http_response_code(401);header('Content-Type: application/json');echo json_encode(['success'=>false,'message'=>'Inicia sesión.']);exit;}
if($_SERVER['REQUEST_METHOD']!=='GET' && $authUser['role']!=='admin'){http_response_code(403);header('Content-Type: application/json');echo json_encode(['success'=>false,'message'=>'Solo administradores pueden editar escenarios.']);exit;}
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

require_once __DIR__ . '/../config/database.php';
// Acceso autenticado por sesión; las mutaciones requieren rol administrador y token CSRF.

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $provided = (string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    $expected = (string)($_SESSION['csrf_token'] ?? '');
    if ($expected === '' || !hash_equals($expected, $provided)) {
        http_response_code(403);
        echo json_encode(['success'=>false, 'message'=>'Sesión no válida. Recarga el editor e inténtalo de nuevo.']);
        exit;
    }
}


function respond(array $data, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function requestBody(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '[]', true);
    if (!is_array($data)) {
        respond(['success' => false, 'message' => 'El cuerpo de la solicitud no es JSON válido.'], 400);
    }
    return $data;
}

function safeText(mixed $value, int $max = 100): string
{
    $text = trim((string)$value);
    if ($text === '') {
        return 'Escenario sin título';
    }
    return function_exists('mb_substr') ? mb_substr($text, 0, $max) : substr($text, 0, $max);
}

function backupScenario(PDO $pdo, int $id): void
{
    $q=$pdo->prepare('SELECT name,width_m,depth_m,height_m,appearance_json FROM scenarios WHERE id=?');
    $q->execute([$id]);
    $scenario=$q->fetch();
    if (!$scenario) return;
    $q=$pdo->prepare('SELECT object_uuid,catalog_key,label,pos_x,pos_y,pos_z,rot_x,rot_y,rot_z,scale_x,scale_y,scale_z,config_json FROM scenario_objects WHERE scenario_id=? ORDER BY id');
    $q->execute([$id]);
    $snapshot=json_encode(['scenario'=>$scenario,'objects'=>$q->fetchAll()],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
    if (!$snapshot) return;
    $q=$pdo->prepare('SELECT COALESCE(MAX(revision_no),0)+1 FROM scenario_versions WHERE scenario_id=?');
    $q->execute([$id]);
    $revision=(int)$q->fetchColumn();
    $q=$pdo->prepare('INSERT INTO scenario_versions (scenario_id,revision_no,snapshot_json) VALUES (?,?,?)');
    $q->execute([$id,$revision,$snapshot]);
}

try {
    $pdo = db();
    $action = $_GET['action'] ?? '';

    if ($action === 'list' && $_SERVER['REQUEST_METHOD'] === 'GET') {
        $rows = $pdo->query(
            'SELECT id, name, width_m, depth_m, height_m, updated_at
             FROM scenarios ORDER BY updated_at DESC, id DESC'
        )->fetchAll();
        respond(['success' => true, 'scenarios' => $rows]);
    }

    if ($action === 'load' && $_SERVER['REQUEST_METHOD'] === 'GET') {
        $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
        if (!$id || $id < 1) {
            respond(['success' => false, 'message' => 'Identificador de escenario inválido.'], 422);
        }
        $stmt = $pdo->prepare('SELECT id, name, width_m, depth_m, height_m, appearance_json FROM scenarios WHERE id = ?');
        $stmt->execute([$id]);
        $scenario = $stmt->fetch();
        if (!$scenario) {
            respond(['success' => false, 'message' => 'No se encontró el escenario.'], 404);
        }
        $objects = $pdo->prepare(
            'SELECT object_uuid, catalog_key, label, pos_x, pos_y, pos_z,
                    rot_x, rot_y, rot_z, scale_x, scale_y, scale_z, config_json
             FROM scenario_objects WHERE scenario_id = ? ORDER BY id ASC'
        );
        $objects->execute([$id]);
        $scenario['objects'] = $objects->fetchAll();
        respond(['success' => true, 'scenario' => $scenario]);
    }

    if ($action === 'history' && $authUser['role']!=='admin') respond(['success'=>false,'message'=>'Solo administrador.'],403);
    if ($action === 'history' && $_SERVER['REQUEST_METHOD'] === 'GET') {
        $id=filter_input(INPUT_GET,'id',FILTER_VALIDATE_INT);
        if (!$id) respond(['success'=>false,'message'=>'ID de escenario inválido.'],422);
        $q=$pdo->prepare('SELECT revision_no, created_at FROM scenario_versions WHERE scenario_id=? ORDER BY revision_no DESC LIMIT 30');
        $q->execute([$id]);
        respond(['success'=>true,'versions'=>$q->fetchAll()]);
    }

    if ($action === 'restore' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $data=requestBody();
        $id=(int)($data['id']??0);$revision=(int)($data['revision']??0);
        if ($id<1||$revision<1) respond(['success'=>false,'message'=>'Versión inválida.'],422);
        $q=$pdo->prepare('SELECT snapshot_json FROM scenario_versions WHERE scenario_id=? AND revision_no=?');
        $q->execute([$id,$revision]);
        $snapshot=$q->fetchColumn();
        if (!$snapshot) respond(['success'=>false,'message'=>'Versión no encontrada.'],404);
        $decoded=json_decode($snapshot,true);
        if (!is_array($decoded)||!isset($decoded['scenario'],$decoded['objects'])) respond(['success'=>false,'message'=>'Copia de seguridad inválida.'],422);
        $original=$decoded['scenario'];$rows=$decoded['objects'];
        if (!is_array($rows)||count($rows)>1000) respond(['success'=>false,'message'=>'Copia de seguridad excede el límite.'],422);
        $pdo->beginTransaction();
        backupScenario($pdo,$id);
        $q=$pdo->prepare('UPDATE scenarios SET name=?,width_m=?,depth_m=?,height_m=?,appearance_json=? WHERE id=?');
        $q->execute([$original['name'],$original['width_m'],$original['depth_m'],$original['height_m'],$original['appearance_json'],$id]);
        $pdo->prepare('DELETE FROM scenario_objects WHERE scenario_id=?')->execute([$id]);
        $q=$pdo->prepare('INSERT INTO scenario_objects (scenario_id,object_uuid,catalog_key,label,pos_x,pos_y,pos_z,rot_x,rot_y,rot_z,scale_x,scale_y,scale_z,config_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
        foreach($rows as $row){
            $q->execute([$id,$row['object_uuid'],$row['catalog_key'],$row['label'],$row['pos_x'],$row['pos_y'],$row['pos_z'],$row['rot_x'],$row['rot_y'],$row['rot_z'],$row['scale_x'],$row['scale_y'],$row['scale_z'],$row['config_json']]);
        }
        $pdo->commit();
        respond(['success'=>true,'id'=>$id,'message'=>'Versión recuperada. Recarga el escenario para ver los cambios.']);
    }

    if ($action === 'save' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = requestBody();
        $name = safeText($data['name'] ?? 'Mi escenario', 100);
        $dimensions = $data['dimensions'] ?? [];
        $width = (float)($dimensions['width'] ?? 0);
        $depth = (float)($dimensions['depth'] ?? 0);
        $height = (float)($dimensions['height'] ?? 0);
        $objects = $data['objects'] ?? [];
        $appearance = $data['appearance'] ?? [];
        if (!is_array($appearance)) {
            $appearance = [];
        }
        $appearanceJson = json_encode($appearance, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if ($width < 3 || $width > 100 || $depth < 3 || $depth > 100 || $height < 2.2 || $height > 20) {
            respond(['success' => false, 'message' => 'Dimensiones fuera del rango permitido.'], 422);
        }
        if (!is_array($objects) || count($objects) > 1000) {
            respond(['success' => false, 'message' => 'Cantidad de objetos no válida (máximo 1000).'], 422);
        }

        $pdo->beginTransaction();
        $scenarioId = isset($data['id']) && (int)$data['id'] > 0 ? (int)$data['id'] : null;

        if ($scenarioId) {
            $check = $pdo->prepare('SELECT id FROM scenarios WHERE id = ?');
            $check->execute([$scenarioId]);
            if (!$check->fetchColumn()) {
                $scenarioId = null;
            }
        }

        if ($scenarioId) {
            backupScenario($pdo,$scenarioId);
            $update = $pdo->prepare(
                'UPDATE scenarios SET name = ?, width_m = ?, depth_m = ?, height_m = ?, appearance_json = ? WHERE id = ?'
            );
            $update->execute([$name, $width, $depth, $height, $appearanceJson, $scenarioId]);
            $pdo->prepare('DELETE FROM scenario_objects WHERE scenario_id = ?')->execute([$scenarioId]);
        } else {
            $insert = $pdo->prepare(
                'INSERT INTO scenarios (name, width_m, depth_m, height_m, appearance_json) VALUES (?, ?, ?, ?, ?)'
            );
            $insert->execute([$name, $width, $depth, $height, $appearanceJson]);
            $scenarioId = (int)$pdo->lastInsertId();
        }

        $insertObject = $pdo->prepare(
            'INSERT INTO scenario_objects
             (scenario_id, object_uuid, catalog_key, label, pos_x, pos_y, pos_z,
              rot_x, rot_y, rot_z, scale_x, scale_y, scale_z, config_json)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );

        $allowedKeys = [
            'desk','chair','aio','keyboard','mouse','man','woman','man-senati','woman-senati','teacher',
            'wall','door','window','whiteboard','fluorescent','fan','projector','plant',
            'teacher-f','man-senati','woman-senati','safety-exit','safety-rules','fire-extinguisher',
            'safety-first-aid','safety-electrical','safety-safe-zone','safety-evacuation'
        ];

        foreach ($objects as $object) {
            if (!is_array($object)) {
                continue;
            }
            $key = (string)($object['catalogKey'] ?? '');
            if (!in_array($key, $allowedKeys, true)) {
                continue;
            }
            $position = $object['position'] ?? [];
            $rotation = $object['rotation'] ?? [];
            $scale = $object['scale'] ?? [];
            $uuid = safeText($object['id'] ?? bin2hex(random_bytes(8)), 64);
            $label = safeText($object['label'] ?? $key, 80);
            $config = json_encode($object['config'] ?? new stdClass(), JSON_UNESCAPED_UNICODE);

            $insertObject->execute([
                $scenarioId, $uuid, $key, $label,
                (float)($position['x'] ?? 0), (float)($position['y'] ?? 0), (float)($position['z'] ?? 0),
                (float)($rotation['x'] ?? 0), (float)($rotation['y'] ?? 0), (float)($rotation['z'] ?? 0),
                max(0.1, min(5, (float)($scale['x'] ?? 1))),
                max(0.1, min(5, (float)($scale['y'] ?? 1))),
                max(0.1, min(5, (float)($scale['z'] ?? 1))),
                $config
            ]);
        }

        $pdo->commit();
        respond(['success' => true, 'id' => $scenarioId, 'message' => 'Escenario guardado.']);
    }

    if ($action === 'delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = requestBody();
        $id = (int)($data['id'] ?? 0);
        if ($id < 1) {
            respond(['success' => false, 'message' => 'Identificador inválido.'], 422);
        }
        $stmt = $pdo->prepare('DELETE FROM scenarios WHERE id = ?');
        $stmt->execute([$id]);
        respond(['success' => true, 'deleted' => $stmt->rowCount()]);
    }

    respond(['success' => false, 'message' => 'Acción o método no permitido.'], 405);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('[Aula3D] ' . $e->getMessage());
    respond([
        'success' => false,
        'message' => 'Error del servidor. Verifica la conexión MySQL y que hayas importado database/schema.sql.'
    ], 500);
}
