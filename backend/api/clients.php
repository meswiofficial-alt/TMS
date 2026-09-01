<?php
// api/clients.php - Full CRUD for Clients
require_once '../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];
$conn = getDBConnection();

if ($method === 'GET') {
    // Get all clients with vehicle count and optional search
    $search = $_GET['search'] ?? '';
    
    if ($search) {
        $stmt = $conn->prepare("
            SELECT c.*, COUNT(v.id) as vehicle_count
            FROM clients c
            LEFT JOIN vehicles v ON c.id = v.client_id
            WHERE c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?
            GROUP BY c.id
            ORDER BY c.name
        ");
        $searchTerm = "%$search%";
        $stmt->execute([$searchTerm, $searchTerm, $searchTerm]);
    } else {
        $stmt = $conn->query("
            SELECT c.*, COUNT(v.id) as vehicle_count
            FROM clients c
            LEFT JOIN vehicles v ON c.id = v.client_id
            GROUP BY c.id
            ORDER BY c.name
        ");
    }
    $clients = $stmt->fetchAll();
    echo json_encode(['success' => true, 'data' => $clients]);

} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $stmt = $conn->prepare("INSERT INTO clients (name, phone, email, address) VALUES (?, ?, ?, ?)");
    $stmt->execute([
        $input['name'] ?? '',
        $input['phone'] ?? '',
        $input['email'] ?? '',
        $input['address'] ?? ''
    ]);
    
    echo json_encode(['success' => true, 'id' => $conn->lastInsertId()]);

} elseif ($method === 'PUT') {
    // Handle both JSON body and form-encoded (for wider compatibility)
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        parse_str(file_get_contents('php://input'), $input);
    }
    
    $id = $input['id'] ?? '';
    
    $stmt = $conn->prepare("UPDATE clients SET name = ?, phone = ?, email = ?, address = ? WHERE id = ?");
    $stmt->execute([
        $input['name'] ?? '',
        $input['phone'] ?? '',
        $input['email'] ?? '',
        $input['address'] ?? '',
        $id
    ]);
    
    echo json_encode(['success' => true]);

} elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? '';
    
    try {
        $stmt = $conn->prepare("DELETE FROM clients WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Cannot delete client with existing records']);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}
