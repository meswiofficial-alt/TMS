<?php
// api/inventory_categories.php - CRUD for Inventory Categories
require_once '../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];
$conn = getDBConnection();

if ($method === 'GET') {
    $stmt = $conn->query("SELECT * FROM inventory_categories ORDER BY name");
    $categories = $stmt->fetchAll();
    echo json_encode(['success' => true, 'data' => $categories]);

} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $stmt = $conn->prepare("INSERT INTO inventory_categories (name, description) VALUES (?, ?)");
    $stmt->execute([
        $input['name'],
        $input['description'] ?? ''
    ]);
    
    echo json_encode(['success' => true, 'id' => $conn->lastInsertId()]);

} elseif ($method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        parse_str(file_get_contents('php://input'), $input);
    }
    
    $id = $input['id'] ?? '';
    
    $stmt = $conn->prepare("UPDATE inventory_categories SET name = ?, description = ? WHERE id = ?");
    $stmt->execute([
        $input['name'],
        $input['description'] ?? '',
        $id
    ]);
    
    echo json_encode(['success' => true]);

} elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? '';
    
    $stmt = $conn->prepare("DELETE FROM inventory_categories WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(['success' => true]);

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}
