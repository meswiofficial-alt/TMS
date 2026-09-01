<?php
// backend/services/WebhookHandler.php
// Handles incoming WhatsApp webhook events

require_once __DIR__ . '/../config/database.php';

class WebhookHandler {
    private $conn;
    
    public function __construct() {
        $this->conn = getDBConnection();
    }
    
    /**
     * Process incoming webhook data
     */
    public function processWebhook(array $data): void {
        // Verify it's a WhatsApp Business Account webhook
        if (($data['object'] ?? '') !== 'whatsapp_business_account') {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid webhook object']);
            return;
        }
        
        foreach ($data['entry'] ?? [] as $entry) {
            foreach ($entry['changes'] ?? [] as $change) {
                $value = $change['value'] ?? [];
                
                // Process message status updates
                if (isset($value['statuses'])) {
                    $this->processStatusUpdates($value['statuses']);
                }
                
                // Process incoming messages
                if (isset($value['messages'])) {
                    $this->processInboundMessages($value['messages'], $value['metadata'] ?? []);
                }
            }
        }
        
        // Always return 200 to acknowledge receipt
        http_response_code(200);
        echo json_encode(['success' => true]);
    }
    
    /**
     * Process message status updates (sent, delivered, read, failed)
     */
    private function processStatusUpdates(array $statuses): void {
        foreach ($statuses as $status) {
            $messageId = $status['id'] ?? '';
            $statusType = $status['status'] ?? '';
            $timestamp = isset($status['timestamp']) ? date('Y-m-d H:i:s', $status['timestamp']) : date('Y-m-d H:i:s');
            
            // Find queue entry by WhatsApp message ID
            $stmt = $this->conn->prepare("
                SELECT id FROM whatsapp_queue 
                WHERE JSON_UNQUOTE(JSON_EXTRACT(api_response, '$.messages[0].id')) = ?
            ");
            $stmt->execute([$messageId]);
            $queueItem = $stmt->fetch();
            
            if (!$queueItem) {
                continue;
            }
            
            $queueId = $queueItem['id'];
            
            // Update queue status based on event type
            $statusColumn = match($statusType) {
                'delivered' => 'delivered_at',
                'read' => 'read_at',
                default => null
            };
            
            if ($statusColumn) {
                $stmt = $this->conn->prepare("
                    UPDATE whatsapp_queue 
                    SET status = ?, {$statusColumn} = ?
                    WHERE id = ?
                ");
                $stmt->execute([$statusType, $timestamp, $queueId]);
            }
            
            // Log analytics event
            $stmt = $this->conn->prepare("
                INSERT INTO whatsapp_analytics (message_id, event_type, metadata) 
                VALUES (?, ?, ?)
            ");
            $stmt->execute([
                $queueId,
                $statusType,
                json_encode($status)
            ]);
            
            // Handle failed messages
            if ($statusType === 'failed' && isset($status['errors'])) {
                $errorMsg = $status['errors'][0]['title'] ?? 'Unknown error';
                $stmt = $this->conn->prepare("
                    UPDATE whatsapp_queue 
                    SET error_message = ?, retry_count = retry_count + 1
                    WHERE id = ?
                ");
                $stmt->execute([$errorMsg, $queueId]);
            }
        }
    }
    
    /**
     * Process inbound messages from customers
     */
    private function processInboundMessages(array $messages, array $metadata): void {
        $phoneNumberId = $metadata['phone_number_id'] ?? '';
        
        foreach ($messages as $message) {
            $from = $message['from'] ?? '';
            $waMessageId = $message['id'] ?? '';
            $timestamp = isset($message['timestamp']) ? date('Y-m-d H:i:s', $message['timestamp']) : date('Y-m-d H:i:s');
            $messageType = $message['type'] ?? 'text';
            
            // Extract message content based on type
            $textContent = '';
            $mediaUrl = null;
            $mediaCaption = null;
            
            switch ($messageType) {
                case 'text':
                    $textContent = $message['text']['body'] ?? '';
                    break;
                    
                case 'image':
                    $mediaUrl = $message['image']['id'] ?? null;
                    $mediaCaption = $message['image']['caption'] ?? null;
                    $textContent = '[Image' . ($mediaCaption ? ': ' . $mediaCaption : '') . ']';
                    break;
                    
                case 'audio':
                    $mediaUrl = $message['audio']['id'] ?? null;
                    $textContent = '[Audio message]';
                    break;
                    
                case 'video':
                    $mediaUrl = $message['video']['id'] ?? null;
                    $mediaCaption = $message['video']['caption'] ?? null;
                    $textContent = '[Video' . ($mediaCaption ? ': ' . $mediaCaption : '') . ']';
                    break;
                    
                case 'document':
                    $textContent = '[Document: ' . ($message['document']['filename'] ?? 'unknown') . ']';
                    break;
                    
                case 'location':
                    $location = $message['location'] ?? [];
                    $textContent = '[Location: ' . ($location['name'] ?? 'Shared location') . ']';
                    break;
                    
                case 'button':
                    $textContent = $message['button']['text'] ?? '[Button click]';
                    break;
                    
                case 'interactive':
                    $interactive = $message['interactive'] ?? [];
                    if (isset($interactive['button_reply'])) {
                        $textContent = '[Reply: ' . $interactive['button_reply']['title'] . ']';
                    } elseif (isset($interactive['list_reply'])) {
                        $textContent = '[Selected: ' . $interactive['list_reply']['title'] . ']';
                    }
                    break;
                    
                default:
                    $textContent = '[' . ucfirst($messageType) . ' message]';
            }
            
            // Find client by phone number
            $clientId = $this->findClientByPhone($from);
            
            // Store inbound message
            $stmt = $this->conn->prepare("
                INSERT INTO whatsapp_inbound 
                (client_id, phone, message, message_type, media_url, media_caption, wa_message_id, received_at, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new')
            ");
            $stmt->execute([
                $clientId,
                $from,
                $textContent,
                $messageType,
                $mediaUrl,
                $mediaCaption,
                $waMessageId,
                $timestamp
            ]);
            
            // Auto-reply to common responses (optional)
            $this->handleAutoReply($from, $textContent, $clientId);
        }
    }
    
    /**
     * Find client by phone number
     */
    private function findClientByPhone(string $phone): ?int {
        // Clean phone number for comparison
        $cleanPhone = preg_replace('/[^0-9]/', '', $phone);
        
        // Try exact match first
        $stmt = $this->conn->prepare("
            SELECT c.id FROM clients c
            JOIN client_communication_prefs ccp ON c.id = ccp.client_id
            WHERE ccp.whatsapp_number = ? OR c.phone = ?
            LIMIT 1
        ");
        $stmt->execute([$phone, $phone]);
        $client = $stmt->fetch();
        
        if ($client) {
            return $client['id'];
        }
        
        // Try partial match (last 9 digits)
        if (strlen($cleanPhone) >= 9) {
            $last9 = substr($cleanPhone, -9);
            $stmt = $this->conn->prepare("
                SELECT id FROM clients 
                WHERE phone LIKE ? OR phone LIKE ?
                LIMIT 1
            ");
            $stmt->execute(['%' . $last9, '%' . $cleanPhone]);
            $client = $stmt->fetch();
            
            if ($client) {
                return $client['id'];
            }
        }
        
        return null;
    }
    
    /**
     * Handle auto-replies for common customer messages
     */
    private function handleAutoReply(string $phone, string $message, ?int $clientId): void {
        $msg = strtolower(trim($message));
        
        // Simple keyword matching for auto-replies
        $autoReplies = [
            'hours' => '🕐 Our office hours are:\nMonday - Friday: 8 AM - 6 PM\nSaturday: 8 AM - 4 PM\nSunday: Closed',
            'location' => '📍 We are located at:\nTristar Garage, Main Branch\nNairobi, Kenya\n\nDirections: [Google Maps Link]',
            'mpesa' => '💳 M-Pesa Paybill:\nBusiness No: 123456\nAccount: Your Phone Number\n\nPlease share payment confirmation after paying.',
            'stop' => null, // Handle opt-out
            'hello' => '👋 Hello! Welcome to Tristar Garage.\n\nHow can we help you today?\n\n1. Check job status\n2. Book appointment\n3. Speak to operator',
            'hi' => '👋 Hello! Welcome to Tristar Garage.\n\nHow can we help you today?\n\n1. Check job status\n2. Book appointment\n3. Speak to operator',
            '1' => '🔍 To check your job status, please share your vehicle plate number (e.g., ABC-123).',
            '2' => '📅 To book an appointment, please share:\n- Your name\n- Vehicle type\n- Preferred date/time',
            '3' => '👤 Connecting you to an operator...\n\nPlease wait, someone will assist you shortly.',
        ];
        
        // Handle opt-out
        if ($msg === 'stop' || $msg === 'unsubscribe') {
            if ($clientId) {
                $stmt = $this->conn->prepare("
                    UPDATE client_communication_prefs 
                    SET whatsapp_opt_in = FALSE 
                    WHERE client_id = ?
                ");
                $stmt->execute([$clientId]);
            }
            return;
        }
        
        // Find matching auto-reply
        $reply = null;
        foreach ($autoReplies as $keyword => $response) {
            if (str_contains($msg, $keyword)) {
                $reply = $response;
                break;
            }
        }
        
        // Send auto-reply if matched
        if ($reply) {
            require_once __DIR__ . '/WhatsAppService.php';
            $whatsapp = new WhatsAppService();
            $whatsapp->sendImmediate($phone, 'custom', ['message' => $reply]);
            
            // Log the auto-reply
            $inboundId = $this->conn->lastInsertId();
            $stmt = $this->conn->prepare("
                UPDATE whatsapp_inbound 
                SET status = 'replied', replied_at = NOW(), reply_message = ?
                WHERE id = ?
            ");
            $stmt->execute([$reply, $inboundId]);
        }
    }
}
