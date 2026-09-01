<?php
// api/vehicles.php - Full CRUD for Vehicles
require_once '../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];
$conn = getDBConnection();

if ($method === 'GET') {
    $clientId = $_GET['client_id'] ?? null;
    $status = $_GET['status'] ?? null;
    
    $sql = "
        SELECT v.*, c.name as client_name 
        FROM vehicles v
        JOIN clients c ON v.client_id = c.id
        WHERE 1=1
    ";
    $params = [];
    
    if ($clientId) {
        $sql .= " AND v.client_id = ?";
        $params[] = $clientId;
    }
    
    $sql .= " ORDER BY v.make, v.model";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    $vehicles = $stmt->fetchAll();
    echo json_encode(['success' => true, 'data' => $vehicles]);

} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['client_id'], $input['make'], $input['model'], $input['plate'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing required fields: client_id, make, model, plate']);
        exit;
    }
    
    try {
        $stmt = $conn->prepare("
            INSERT INTO vehicles (client_id, make, model, year, plate, vin, color) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $input['client_id'],
            $input['make'],
            $input['model'],
            $input['year'] ?? null,
            $input['plate'],
            $input['vin'] ?? '',
            $input['color'] ?? ''
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
        UPDATE vehicles 
        SET client_id = ?, make = ?, model = ?, year = ?, plate = ?, vin = ?, color = ?
        WHERE id = ?
    ");
    $stmt->execute([
        $input['client_id'],
        $input['make'],
        $input['model'],
        $input['year'] ?? null,
        $input['plate'],
        $input['vin'] ?? '',
        $input['color'] ?? '',
        $id
    ]);
    
    echo json_encode(['success' => true]);

} elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? '';
    
    try {
        $stmt = $conn->prepare("DELETE FROM vehicles WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Cannot delete vehicle with existing records']);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}
