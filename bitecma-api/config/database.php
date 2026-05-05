<?php

define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'bitecmac_web');
define('DB_USER', getenv('DB_USER') ?: 'bitecmac_web');
define('DB_PASS', getenv('DB_PASS') ?: 'REEMPLAZA_ESTA_CLAVE_EN_CPANEL');
define('DB_CHARSET', getenv('DB_CHARSET') ?: 'utf8mb4');

function getDB()
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $pdo;
}
