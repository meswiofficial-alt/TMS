<?php
// api/inventory.php - Full CRUD for Inventory
require_once '../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];
$conn = getDBConnection();

if ($method === 'GET') {
    $categoryId = $_GET['category_id'] ?? null;
    $lowStock = $_GET['low_stock'] ?? null;
    
    $sql = "
        SELECT i.*, 
               ic.name as category_name
        FROM inventory i
        LEFT JOIN inventory_categories ic ON i.category_id = ic.id
        WHERE 1=1
    ";
    $params = [];
    
    if ($categoryId) {
        $sql .= " AND i.category_id = ?";
        $params[] = $categoryId;
    }
    if ($lowStock) {
        $sql .= " AND i.quantity <= i.min_quantity";
    }
    
    $sql .= " ORDER BY i.name";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    $inventory = $stmt->fetchAll();
    echo json_encode(['success' => true, 'data' => $inventory]);

} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['name'], $input['quantity'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing required fields: name, quantity']);
        exit;
    }
    
    try {
        $stmt = $conn->prepare("
            INSERT INTO inventory (name, category_id, quantity, unit, location, min_quantity, vehicle_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $input['name'],
            $input['category_id'] ?? null,
            $input['quantity'] ?? 0,
            $input['unit'] ?? 'pieces',
            $input['location'] ?? '',
            $input['min_quantity'] ?? 5,
            $input['vehicle_id'] ?? null
        ]);
        
        echo json_encode(['success' => true, 'id' => $conn->lastInsertId()]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }

} elseif ($method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        parse_str(file_get_contents('php://input'), $input);
    }
    
    $id = $input['id'] ?? '';
    
    $stmt = $conn->prepare("
        UPDATE inventory 
        SET name = ?, category_id = ?, quantity = ?, unit = ?, location = ?, min_quantity = ?, vehicle_id = ?
        WHERE id = ?
    ");
    $stmt->execute([
        $input['name'] ?? '',
        $input['category_id'] ?? null,
        $input['quantity'] ?? 0,
        $input['unit'] ?? 'pieces',
        $input['location'] ?? '',
        $input['min_quantity'] ?? 5,
        $input['vehicle_id'] ?? null,
        $id
    ]);
    
    echo json_encode(['success' => true]);

} elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? '';
    
    try {
        $stmt = $conn->prepare("DELETE FROM inventory WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Cannot delete inventory item']);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}
