<?php
declare(strict_types=1);

/*
 * Configuración MySQL. En Laragon/XAMPP los valores por defecto suelen funcionar.
 * En producción define AULA_DB_HOST, AULA_DB_NAME, AULA_DB_USER y AULA_DB_PASS.
 */
function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $host = getenv('AULA_DB_HOST') ?: '127.0.0.1';
    $name = getenv('AULA_DB_NAME') ?: 'aula3d';
    $user = getenv('AULA_DB_USER') ?: 'root';
    $pass = getenv('AULA_DB_PASS') ?: '';

    $dsn = "mysql:host={$host};dbname={$name};charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}
