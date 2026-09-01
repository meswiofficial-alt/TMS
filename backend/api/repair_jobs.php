<?php
// api/repair_jobs.php - Full CRUD for Repair Jobs
require_once '../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];
$conn = getDBConnection();

if ($method === 'GET') {
    $status = $_GET['status'] ?? null;
    $workerId = $_GET['worker_id'] ?? null;
    
    $sql = "
        SELECT rj.*, 
               CONCAT(v.make, ' ', v.model) as vehicle_name,
               v.plate,
               w.name as worker_name,
               c.name as client_name,
               c.id as client_id
        FROM repair_jobs rj
        JOIN vehicles v ON rj.vehicle_id = v.id
        JOIN clients c ON v.client_id = c.id
        LEFT JOIN workers w ON rj.worker_id = w.id
        WHERE 1=1
    ";
    $params = [];
    
    if ($status) {
        $sql .= " AND rj.status = ?";
        $params[] = $status;
    }
    if ($workerId) {
        $sql .= " AND rj.worker_id = ?";
        $params[] = $workerId;
    }
    
    $sql .= " ORDER BY 
        CASE rj.priority 
            WHEN 'high' THEN 1 
            WHEN 'medium' THEN 2 
            WHEN 'low' THEN 3 
        END,
        rj.created_at DESC
    ";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    $jobs = $stmt->fetchAll();
    echo json_encode(['success' => true, 'data' => $jobs]);

} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['vehicle_id'], $input['description'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing required fields: vehicle_id, description']);
        exit;
    }
    
    try {
        $stmt = $conn->prepare("
            INSERT INTO repair_jobs (vehicle_id, worker_id, description, status, priority, estimated_hours, start_date) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $input['vehicle_id'],
            $input['worker_id'] ?? null,
            $input['description'],
            $input['status'] ?? 'pending',
            $input['priority'] ?? 'medium',
            $input['estimated_hours'] ?? null,
            $input['start_date'] ?? null
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
        UPDATE repair_jobs 
        SET vehicle_id = ?, worker_id = ?, description = ?, status = ?, priority = ?, estimated_hours = ?, start_date = ?, completion_date = ?
        WHERE id = ?
    ");
    
    $completionDate = $input['completion_date'] ?? null;
    if (isset($input['status']) && ($input['status'] === 'completed' || $input['status'] === 'ready') && !$completionDate) {
        $completionDate = date('Y-m-d H:i:s');
    }
    
    $stmt->execute([
        $input['vehicle_id'] ?? null,
        $input['worker_id'] ?? null,
        $input['description'] ?? '',
        $input['status'] ?? 'pending',
        $input['priority'] ?? 'medium',
        $input['estimated_hours'] ?? null,
        $input['start_date'] ?? null,
        $completionDate,
        $id
    ]);
    
    // Trigger WhatsApp notification on status change
    if (isset($input['status'])) {
        try {
            require_once __DIR__ . '/../services/JobNotificationService.php';
            $notifier = new JobNotificationService();
            $notifier->notifyJobStatusChange($id, $input['status']);
        } catch (Exception $e) {
            // Log error but don't fail the update
            error_log("WhatsApp notification failed for job $id: " . $e->getMessage());
        }
    }
    
    echo json_encode(['success' => true]);

} elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? '';
    
    $stmt = $conn->prepare("DELETE FROM repair_jobs WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(['success' => true]);

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}
