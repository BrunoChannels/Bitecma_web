<?php

class Caleta
{
    private static function mapRow($r)
    {
        if (!$r) return null;
        return [
            'id' => (int)$r['id'],
            'nombre' => $r['nombre'] ?? null,
            'region_id' => $r['region_id'] !== null ? (int)$r['region_id'] : null,
        ];
    }

    public static function all(PDO $db)
    {
        $stmt = $db->query("SELECT id, nombre, region_id FROM caletas ORDER BY region_id ASC, nombre ASC, id ASC");
        $rows = $stmt->fetchAll();
        return array_values(array_filter(array_map([self::class, 'mapRow'], $rows)));
    }

    public static function find(PDO $db, $id)
    {
        $stmt = $db->prepare("SELECT id, nombre, region_id FROM caletas WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => (int)$id]);
        $r = $stmt->fetch();
        if (!$r) return null;
        return self::mapRow($r);
    }
}
