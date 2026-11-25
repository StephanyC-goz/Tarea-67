<?php
declare(strict_types=1);

// Solo puede ejecutarse desde la terminal PHP, no desde un navegador.
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('Acceso denegado.');
}
require_once dirname(__DIR__) . '/config/database.php';

try {
    $pdo = db();
    $admins = $pdo->query(
        "SELECT id, full_name, email, is_active FROM users WHERE role = 'admin' ORDER BY id"
    )->fetchAll(PDO::FETCH_ASSOC);

    if (!$admins) {
        fwrite(STDERR, "No hay cuentas con rol admin en aula3d.\n");
        exit(1);
    }

    echo "\nAdministradores de Piramide SENATI:\n";
    foreach ($admins as $admin) {
        printf("  ID %d | %s | %s | %s\n",
            (int) $admin['id'], $admin['full_name'], $admin['email'],
            (int) $admin['is_active'] ? 'activo' : 'inactivo'
        );
    }

    echo "\nEscribe el ID del administrador que deseas recuperar: ";
    $input = fgets(STDIN);
    $idText = $input === false ? '' : trim($input);
    if ($idText === '' || !ctype_digit($idText)) {
        fwrite(STDERR, "ID invalido. No se realizaron cambios.\n");
        exit(1);
    }

    $selected = null;
    foreach ($admins as $admin) {
        if ((string) $admin['id'] === $idText) {
            $selected = $admin;
            break;
        }
    }
    if ($selected === null) {
        fwrite(STDERR, "El ID no corresponde a un administrador. No se realizaron cambios.\n");
        exit(1);
    }

    // La contraseña se genera localmente; no se escribe en GitHub ni en archivos.
    $password = rtrim(strtr(base64_encode(random_bytes(24)), '+/', '-_'), '=');
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $statement = $pdo->prepare(
        "UPDATE users SET password_hash = ?, is_active = 1 WHERE id = ? AND role = 'admin'"
    );
    $statement->execute([$hash, (int) $selected['id']]);

    echo "\nContrasena restablecida para: {$selected['email']}\n";
    echo "Nueva contrasena: {$password}\n";
    echo "Guardala de forma privada. No la compartas por chat ni GitHub.\n";
} catch (Throwable $error) {
    fwrite(STDERR, "No fue posible conectar con MySQL o actualizar la cuenta. Comprueba Laragon y la base aula3d.\n");
    exit(1);
}
