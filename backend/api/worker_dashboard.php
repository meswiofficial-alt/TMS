<?php
// api/worker_dashboard.php - Worker Management Dashboard
require_once '../config/database.php';

// Set error handling to return JSON instead of HTML
set_exception_handler(function($e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server error: ' . $e->getMessage()]);
    exit;
});

$method = $_SERVER['REQUEST_METHOD'];
$conn = getDBConnection();

if ($method === 'GET') {
    $action = $_GET['action'] ?? 'list';
    
    switch ($action) {
        case 'list':
            getWorkersWithStats($conn);
            break;
        case 'get':
            getWorkerDetails($conn, $_GET['id'] ?? 0);
            break;
        case 'earnings':
            getWorkerEarnings($conn, $_GET['id'] ?? 0);
            break;
        case 'payment_history':
            getWorkerPaymentHistory($conn, $_GET['id'] ?? 0);
            break;
        default:
            echo json_encode(['success' => false, 'error' => 'Invalid action']);
    }
} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        parse_str(file_get_contents('php://input'), $input);
    }
    
    $action = $input['action'] ?? '';
    
    switch ($action) {
        case 'add_payment':
            addWorkerPayment($conn, $input);
            break;
        default:
            echo json_encode(['success' => false, 'error' => 'Invalid action']);
    }
}

function getWorkersWithStats($conn) {
    $sql = "
        SELECT 
            w.*,
            COUNT(DISTINCT rj.id) as total_jobs,
            SUM(CASE WHEN rj.status = 'completed' THEN 1 ELSE 0 END) as completed_jobs,
            COALESCE(SUM(wp.amount), 0) as total_earnings
        FROM workers w
        LEFT JOIN repair_jobs rj ON w.id = rj.worker_id
        LEFT JOIN worker_payments wp ON w.id = wp.worker_id
        GROUP BY w.id
        ORDER BY w.name
    ";
    
    $stmt = $conn->query($sql);
    $workers = $stmt->fetchAll();
    
    echo json_encode(['success' => true, 'data' => $workers]);
}

function getWorkerDetails($conn, $workerId) {
    $stmt = $conn->prepare("SELECT * FROM workers WHERE id = ?");
    $stmt->execute([$workerId]);
    $worker = $stmt->fetch();
    
    if (!$worker) {
        echo json_encode(['success' => false, 'error' => 'Worker not found']);
        return;
    }
    
    $stmt = $conn->prepare("SELECT COALESCE(SUM(amount), 0) as total FROM worker_payments WHERE worker_id = ?");
    $stmt->execute([$workerId]);
    $earnings = $stmt->fetch();
    
    $stmt = $conn->prepare("SELECT COUNT(*) as total FROM repair_jobs WHERE worker_id = ?");
    $stmt->execute([$workerId]);
    $jobs = $stmt->fetch();
    
    echo json_encode([
        'success' => true,
        'data' => array_merge($worker, ['total_earnings' => $earnings['total'], 'total_jobs' => $jobs['total']])
    ]);
}

function addWorkerPayment($conn, $input) {
    $stmt = $conn->prepare("INSERT INTO worker_payments (worker_id, amount, payment_date, payment_type, description, created_by) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $input['worker_id'],
        $input['amount'],
        $input['payment_date'] ?? date('Y-m-d'),
        $input['payment_type'] ?? 'salary',
        $input['description'] ?? '',
        $input['created_by'] ?? 1
    ]);
    
    echo json_encode(['success' => true, 'id' => $conn->lastInsertId()]);
}

/**
 * Get payment history for a worker
 */
function getWorkerPaymentHistory($conn, $workerId) {
    $stmt = $conn->prepare("
        SELECT 
            wp.*,
            u.name as created_by_name
        FROM worker_payments wp
        LEFT JOIN users u ON wp.created_by = u.id
        WHERE wp.worker_id = ?
        ORDER BY wp.payment_date DESC, wp.created_at DESC
    ");
    $stmt->execute([$workerId]);
    $payments = $stmt->fetchAll();
    
    echo json_encode(['success' => true, 'data' => $payments]);
}
