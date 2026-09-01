<?php
// api/transactions.php - Full CRUD for Transactions
require_once '../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];
$conn = getDBConnection();

if ($method === 'GET') {
    $dateFrom = $_GET['date_from'] ?? null;
    $dateTo = $_GET['date_to'] ?? null;
    $type = $_GET['type'] ?? null;
    
    $sql = "
        SELECT t.*, 
               c.name as client_name,
               w.name as worker_name
        FROM transactions t
        LEFT JOIN clients c ON t.client_id = c.id
        LEFT JOIN workers w ON t.worker_id = w.id
        WHERE 1=1
    ";
    $params = [];
    
    if ($dateFrom) {
        $sql .= " AND t.transaction_date >= ?";
        $params[] = $dateFrom;
    }
    if ($dateTo) {
        $sql .= " AND t.transaction_date <= ?";
        $params[] = $dateTo;
    }
    if ($type) {
        $sql .= " AND t.type = ?";
        $params[] = $type;
    }
    
    $sql .= " ORDER BY t.transaction_date DESC, t.created_at DESC LIMIT 100";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    $transactions = $stmt->fetchAll();
    echo json_encode(['success' => true, 'data' => $transactions]);

} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['type'], $input['category'], $input['amount'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing required fields: type, category, amount']);
        exit;
    }
    
    // Validate category against ENUM values
    $validCategories = ['client_payment', 'staff_salary', 'parts', 'maintenance', 'other'];
    $category = in_array($input['category'], $validCategories) ? $input['category'] : 'other';
    
    try {
        $stmt = $conn->prepare("
            INSERT INTO transactions (type, category, description, amount, payment_method, reference, client_id, worker_id, vehicle_id, transaction_date, notes) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $input['type'],
            $category,
            $input['description'] ?? '',
            $input['amount'],
            $input['payment_method'] ?? 'cash',
            $input['reference'] ?? '',
            $input['client_id'] ?? null,
            $input['worker_id'] ?? null,
            $input['vehicle_id'] ?? null,
            $input['transaction_date'] ?? date('Y-m-d'),
            $input['notes'] ?? ''
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
    
    // Validate category against ENUM values
    $validCategories = ['client_payment', 'staff_salary', 'parts', 'maintenance', 'other'];
    $category = in_array($input['category'], $validCategories) ? $input['category'] : 'other';
    
    $stmt = $conn->prepare("
        UPDATE transactions 
        SET type = ?, category = ?, description = ?, amount = ?, payment_method = ?, reference = ?, client_id = ?, worker_id = ?, vehicle_id = ?, transaction_date = ?, notes = ?
        WHERE id = ?
    ");
    $stmt->execute([
        $input['type'],
        $category,
        $input['description'] ?? '',
        $input['amount'],
        $input['payment_method'] ?? 'cash',
        $input['reference'] ?? '',
        $input['client_id'] ?? null,
        $input['worker_id'] ?? null,
        $input['vehicle_id'] ?? null,
        $input['transaction_date'] ?? date('Y-m-d'),
        $input['notes'] ?? '',
        $id
    ]);
    
    echo json_encode(['success' => true]);

} elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? '';
    
    $stmt = $conn->prepare("DELETE FROM transactions WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(['success' => true]);

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}
