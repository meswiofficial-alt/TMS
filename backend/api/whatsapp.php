<?php
// backend/api/whatsapp.php
// WhatsApp Communication API endpoint

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../services/WhatsAppService.php';
require_once __DIR__ . '/../services/JobNotificationService.php';

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true) ?? [];

// Webhook verification (GET request from Meta with hub_mode parameter)
if ($method === 'GET' && isset($_GET['hub_mode'])) {
    $mode = $_GET['hub_mode'] ?? '';
    $token = $_GET['hub_verify_token'] ?? '';
    $challenge = $_GET['hub_challenge'] ?? '';
    
    if ($mode === 'subscribe' && $token === (getenv('WHATSAPP_WEBHOOK_TOKEN') ?: 'tristar_webhook_2024')) {
        echo $challenge;
        http_response_code(200);
        exit;
    }
    
    http_response_code(403);
    echo json_encode(['error' => 'Verification failed']);
    exit;
}

// Handle incoming webhook data (POST from Meta with object parameter)
if ($method === 'POST' && isset($input['object']) && $input['object'] === 'whatsapp_business_account') {
    require_once __DIR__ . '/../services/WebhookHandler.php';
    $handler = new WebhookHandler();
    $handler->processWebhook($input);
    exit;
}

// API endpoints for frontend
switch ($method) {
    case 'POST':
        $action = $input['action'] ?? '';
        
        switch ($action) {
            case 'queue_message':
                $service = new WhatsAppService();
                $result = $service->queueMessage(
                    $input['client_id'] ?? 0,
                    $input['template_name'] ?? '',
                    $input['variables'] ?? [],
                    isset($input['scheduled_at']) ? new DateTime($input['scheduled_at']) : null
                );
                echo json_encode($result);
                break;
                
            case 'job_status_notification':
                $service = new JobNotificationService();
                $result = $service->notifyJobStatusChange(
                    $input['job_id'] ?? 0,
                    $input['status'] ?? ''
                );
                echo json_encode($result);
                break;
                
            case 'send_payment_reminder':
                $service = new JobNotificationService();
                $result = $service->sendPaymentReminder($input['job_id'] ?? 0);
                echo json_encode($result);
                break;
                
            case 'set_opt_in':
                $service = new WhatsAppService();
                $result = $service->setClientOptIn(
                    $input['client_id'] ?? 0,
                    $input['opt_in'] ?? true,
                    $input['phone_number'] ?? null
                );
                echo json_encode($result);
                break;
                
            case 'send_bulk':
                $service = new WhatsAppService();
                $results = [];
                foreach ($input['recipients'] ?? [] as $recipient) {
                    $results[] = $service->queueMessage(
                        $recipient['client_id'],
                        $input['template_name'] ?? '',
                        $recipient['variables'] ?? []
                    );
                }
                echo json_encode(['success' => true, 'results' => $results]);
                break;
                
            default:
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid action: ' . $action]);
        }
        break;
        
    case 'GET':
        $conn = getDBConnection();
        $action = $_GET['action'] ?? 'status';
        
        switch ($action) {
            case 'status':
                $service = new WhatsAppService();
                echo json_encode(['success' => true, 'data' => $service->getQueueStats()]);
                break;
                
            case 'history':
                $service = new WhatsAppService();
                $clientId = $_GET['client_id'] ?? 0;
                echo json_encode(['success' => true, 'data' => $service->getClientHistory($clientId)]);
                break;
                
            case 'templates':
                $stmt = $conn->query("SELECT * FROM whatsapp_templates WHERE status = 'approved'");
                echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
                break;
                
            case 'inbound':
                $stmt = $conn->prepare("
                    SELECT * FROM whatsapp_inbound 
                    WHERE status = 'new' 
                    ORDER BY received_at DESC 
                    LIMIT 50
                ");
                $stmt->execute();
                echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
                break;
                
            case 'message_log':
                $limit = intval($_GET['limit'] ?? 50);
                $stmt = $conn->prepare("
                    SELECT * FROM whatsapp_queue 
                    ORDER BY created_at DESC 
                    LIMIT ?
                ");
                $stmt->execute([$limit]);
                echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
                break;
                
            default:
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid action']);
        }
        break;
        
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}
