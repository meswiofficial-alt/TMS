<?php
// backend/api/activity_log.php
// Activity History and Audit Log API

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];
$conn = getDBConnection();

if ($method === 'GET') {
    $action = $_GET['action'] ?? 'list';
    
    switch ($action) {
        case 'list':
            getActivityLog($conn);
            break;
        case 'login_history':
            getLoginHistory($conn);
            break;
        case 'stats':
            getActivityStats($conn);
            break;
        case 'categories':
            getCategories($conn);
            break;
        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid action']);
    }
} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
    
    switch ($action) {
        case 'log':
            logActivity($conn, $input);
            break;
        case 'login':
            logLogin($conn, $input);
            break;
        case 'logout':
            logLogout($conn, $input);
            break;
        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid action']);
    }
}

/**
 * Get activity log with filtering
 */
function getActivityLog($conn) {
    $category = $_GET['category'] ?? '';
    $userId = $_GET['user_id'] ?? '';
    $dateFrom = $_GET['date_from'] ?? '';
    $dateTo = $_GET['date_to'] ?? '';
    $limit = intval($_GET['limit'] ?? 100);
    $offset = intval($_GET['offset'] ?? 0);
    
    $where = [];
    $params = [];
    
    if ($category) {
        $where[] = "action_category = ?";
        $params[] = $category;
    }
    if ($userId) {
        $where[] = "user_id = ?";
        $params[] = $userId;
    }
    if ($dateFrom) {
        $where[] = "created_at >= ?";
        $params[] = $dateFrom . ' 00:00:00';
    }
    if ($dateTo) {
        $where[] = "created_at <= ?";
        $params[] = $dateTo . ' 23:59:59';
    }
    
    $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
    
    // Get total count
    $countStmt = $conn->prepare("SELECT COUNT(*) FROM activity_log $whereClause");
    $countStmt->execute($params);
    $total = $countStmt->fetchColumn();
    
    // Get records
    $stmt = $conn->prepare("
        SELECT * FROM activity_log 
        $whereClause 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
    ");
    $stmt->execute([...$params, $limit, $offset]);
    $records = $stmt->fetchAll();
    
    echo json_encode([
        'success' => true,
        'data' => $records,
        'total' => $total,
        'limit' => $limit,
        'offset' => $offset
    ]);
}

/**
 * Get login history
 */
function getLoginHistory($conn) {
    $userId = $_GET['user_id'] ?? '';
    $status = $_GET['status'] ?? '';
    $limit = intval($_GET['limit'] ?? 50);
    
    $where = [];
    $params = [];
    
    if ($userId) {
        $where[] = "user_id = ?";
        $params[] = $userId;
    }
    if ($status) {
        $where[] = "login_status = ?";
        $params[] = $status;
    }
    
    $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
    
    $stmt = $conn->prepare("
        SELECT * FROM user_login_history 
        $whereClause 
        ORDER BY login_at DESC 
        LIMIT ?
    ");
    $stmt->execute([...$params, $limit]);
    
    echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
}

/**
 * Get activity statistics
 */
function getActivityStats($conn) {
    // Today's activities
    $stmt = $conn->prepare("
        SELECT 
            COUNT(*) as total_today,
            SUM(CASE WHEN action_category = 'auth' THEN 1 ELSE 0 END) as logins,
            SUM(CASE WHEN action_category = 'client' THEN 1 ELSE 0 END) as client_actions,
            SUM(CASE WHEN action_category = 'job' THEN 1 ELSE 0 END) as job_actions,
            SUM(CASE WHEN action_category = 'invoice' THEN 1 ELSE 0 END) as invoices,
            SUM(CASE WHEN action_category = 'whatsapp' THEN 1 ELSE 0 END) as messages
        FROM activity_log 
        WHERE DATE(created_at) = CURDATE()
    ");
    $stmt->execute();
    $today = $stmt->fetch();
    
    // Activity by category
    $stmt = $conn->prepare("
        SELECT action_category, COUNT(*) as count 
        FROM activity_log 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY action_category
        ORDER BY count DESC
    ");
    $stmt->execute();
    $byCategory = $stmt->fetchAll();
    
    // Active users today
    $stmt = $conn->prepare("
        SELECT COUNT(DISTINCT user_id) as active_users 
        FROM activity_log 
        WHERE DATE(created_at) = CURDATE()
    ");
    $stmt->execute();
    $activeUsers = $stmt->fetchColumn();
    
    // Login stats
    $stmt = $conn->prepare("
        SELECT 
            COUNT(*) as total_logins,
            SUM(CASE WHEN login_status = 'failed' THEN 1 ELSE 0 END) as failed_logins
        FROM user_login_history 
        WHERE DATE(login_at) = CURDATE()
    ");
    $stmt->execute();
    $loginStats = $stmt->fetch();
    
    echo json_encode([
        'success' => true,
        'data' => [
            'today' => $today,
            'by_category' => $byCategory,
            'active_users' => $activeUsers,
            'login_stats' => $loginStats
        ]
    ]);
}

/**
 * Get distinct categories
 */
function getCategories($conn) {
    $stmt = $conn->query("
        SELECT DISTINCT action_category 
        FROM activity_log 
        ORDER BY action_category
    ");
    echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_COLUMN)]);
}

/**
 * Log an activity
 */
function logActivity($conn, $input) {
    $stmt = $conn->prepare("
        INSERT INTO activity_log 
        (user_id, user_name, user_role, action_category, action_type, action_description, entity_type, entity_id, ip_address, user_agent, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    
    $stmt->execute([
        $input['user_id'] ?? null,
        $input['user_name'] ?? 'System',
        $input['user_role'] ?? 'system',
        $input['action_category'] ?? 'system',
        $input['action_type'] ?? 'unknown',
        $input['action_description'] ?? '',
        $input['entity_type'] ?? null,
        $input['entity_id'] ?? null,
        $_SERVER['REMOTE_ADDR'] ?? null,
        $_SERVER['HTTP_USER_AGENT'] ?? null,
        isset($input['metadata']) ? json_encode($input['metadata']) : null
    ]);
    
    echo json_encode(['success' => true, 'id' => $conn->lastInsertId()]);
}

/**
 * Log user login
 */
function logLogin($conn, $input) {
    $stmt = $conn->prepare("
        INSERT INTO user_login_history 
        (user_id, user_name, user_role, ip_address, user_agent, login_status, failure_reason)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    
    $stmt->execute([
        $input['user_id'] ?? 0,
        $input['user_name'] ?? 'Unknown',
        $input['user_role'] ?? 'operator',
        $_SERVER['REMOTE_ADDR'] ?? $input['ip_address'] ?? null,
        $_SERVER['HTTP_USER_AGENT'] ?? $input['user_agent'] ?? null,
        $input['login_status'] ?? 'success',
        $input['failure_reason'] ?? null
    ]);
    
    echo json_encode(['success' => true, 'id' => $conn->lastInsertId()]);
}

/**
 * Log user logout
 */
function logLogout($conn, $input) {
    $userId = $input['user_id'] ?? 0;
    
    // Find the most recent login without logout
    $stmt = $conn->prepare("
        UPDATE user_login_history 
        SET logout_at = NOW(),
            session_duration = TIMESTAMPDIFF(MINUTE, login_at, NOW())
        WHERE user_id = ? AND logout_at IS NULL 
        ORDER BY login_at DESC 
        LIMIT 1
    ");
    $stmt->execute([$userId]);
    
    echo json_encode(['success' => true]);
}
