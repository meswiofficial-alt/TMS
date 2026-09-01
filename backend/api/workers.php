<?php
// api/workers.php - Full CRUD for Workers
require_once '../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];
$conn = getDBConnection();

if ($method === 'GET') {
    $sql = "SELECT * FROM workers ORDER BY name";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $workers = $stmt->fetchAll();
    echo json_encode(['success' => true, 'data' => $workers]);

} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['name'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing required field: name']);
        exit;
    }
    
    try {
        $stmt = $conn->prepare("
            INSERT INTO workers (name, phone, email, position, hire_date) 
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $input['name'],
            $input['phone'] ?? '',
            $input['email'] ?? '',
            $input['position'] ?? '',
            $input['hire_date'] ?? null
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
        UPDATE workers 
        SET name = ?, phone = ?, email = ?, position = ?, hire_date = ?
        WHERE id = ?
    ");
    $stmt->execute([
        $input['name'],
        $input['phone'] ?? '',
        $input['email'] ?? '',
        $input['position'] ?? '',
        $input['hire_date'] ?? null,
        $id
    ]);
    
    echo json_encode(['success' => true]);

} elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? '';
    
    $stmt = $conn->prepare("DELETE FROM workers WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(['success' => true]);

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}
