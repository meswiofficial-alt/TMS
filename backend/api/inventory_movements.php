<?php
// api/inventory_movements.php - Get inventory movement log
require_once '../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];
$conn = getDBConnection();

if ($method === 'GET') {
    $itemId = $_GET['item_id'] ?? null;
    
    $sql = "
        SELECT im.*, i.name as item_name, u.name as user_name
        FROM inventory_movements im
        JOIN inventory i ON im.item_id = i.id
        LEFT JOIN users u ON im.user_id = u.id
        WHERE 1=1
    ";
    $params = [];
    
    if ($itemId) {
        $sql .= " AND im.item_id = ?";
        $params[] = $itemId;
    }
    
    $sql .= " ORDER BY im.created_at DESC LIMIT 100";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    $movements = $stmt->fetchAll();
    echo json_encode(['success' => true, 'data' => $movements]);

} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $stmt = $conn->prepare("INSERT INTO inventory_movements (item_id, quantity, type, user_id, notes) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([
        $input['item_id'],
        $input['quantity'],
        $input['type'],
        $input['user_id'] ?? null,
        $input['notes'] ?? ''
    ]);
    
    // Update inventory quantity
    if ($input['type'] === 'addition') {
        $stmt = $conn->prepare("UPDATE inventory SET quantity = quantity + ? WHERE id = ?");
    } else {
        $stmt = $conn->prepare("UPDATE inventory SET quantity = GREATEST(0, quantity - ?) WHERE id = ?");
    }
    $stmt->execute([$input['quantity'], $input['item_id']]);
    
    echo json_encode(['success' => true, 'id' => $conn->lastInsertId()]);
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}
