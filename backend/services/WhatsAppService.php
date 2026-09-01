<?php
// backend/services/WhatsAppService.php

require_once __DIR__ . '/../config/database.php';

class WhatsAppService {
    private $apiUrl;
    private $phoneNumberId;
    private $accessToken;
    private $provider;
    private $conn;
    
    // Rate limiting
    private $maxMessagesPerSecond = 20;
    private $maxMessagesPerDay = 1000;
    
    public function __construct(string $provider = 'meta') {
        $this->provider = $provider;
        $this->conn = getDBConnection();
        
        // Load credentials from environment or use defaults for development
        $this->phoneNumberId = getenv('WHATSAPP_PHONE_ID') ?: 'demo';
        $this->accessToken = getenv('WHATSAPP_ACCESS_TOKEN') ?: 'demo_token';
        
        switch ($provider) {
            case 'meta':
                $this->apiUrl = 'https://graph.facebook.com/v18.0/' . $this->phoneNumberId . '/messages';
                break;
            case 'twilio':
                $this->apiUrl = 'https://api.twilio.com/2010-04-01/Accounts/' . (getenv('TWILIO_SID') ?: 'demo') . '/Messages.json';
                break;
            default:
                $this->apiUrl = '';
        }
    }
    
    /**
     * Queue a message for sending
     */
    public function queueMessage(int $clientId, string $templateName, array $variables = [], ?DateTime $scheduledAt = null): array {
        // Check rate limits
        if (!$this->checkRateLimit($clientId)) {
            return ['success' => false, 'error' => 'Rate limit exceeded'];
        }
        
        // Get client preferences
        $prefs = $this->getClientPreferences($clientId);
        if (!$prefs || !$prefs['whatsapp_opt_in']) {
            return ['success' => false, 'error' => 'Client not opted in for WhatsApp'];
        }
        
        // Check quiet hours
        if ($this->isQuietHours($prefs['quiet_hours_start'], $prefs['quiet_hours_end'])) {
            $scheduledAt = $this->getNextActiveTime($prefs['quiet_hours_end']);
        }
        
        // Get template
        $template = $this->getTemplate($templateName, $prefs['preferred_language']);
        if (!$template) {
            return ['success' => false, 'error' => 'Template not found: ' . $templateName];
        }
        
        // Personalize message
        $message = $this->personalizeMessage($template['body_text'], $variables);
        
        // Insert into queue
        $stmt = $this->conn->prepare("
            INSERT INTO whatsapp_queue (client_id, phone, template_id, message_type, variables, scheduled_at, status)
            VALUES (?, ?, ?, ?, ?, ?, 'pending')
        ");
        
        $stmt->execute([
            $clientId,
            $prefs['whatsapp_number'],
            $template['id'],
            $template['category'],
            json_encode($variables),
            $scheduledAt ? $scheduledAt->format('Y-m-d H:i:s') : null
        ]);
        
        $queueId = $this->conn->lastInsertId();
        
        return [
            'success' => true,
            'queue_id' => $queueId,
            'scheduled_at' => $scheduledAt ? $scheduledAt->format('c') : 'immediate',
            'message_preview' => substr($message, 0, 100)
        ];
    }
    
    /**
     * Send immediate message (bypasses queue)
     */
    public function sendImmediate(string $phone, string $templateName, array $variables = []): array {
        $template = $this->getTemplate($templateName);
        if (!$template) {
            return ['success' => false, 'error' => 'Template not found'];
        }
        
        $message = $this->personalizeMessage($template['body_text'], $variables);
        
        return $this->sendToAPI($phone, $message, $template);
    }
    
    /**
     * Process queued messages (called by cron job)
     */
    public function processQueue(int $batchSize = 50): array {
        $stmt = $this->conn->prepare("
            SELECT * FROM whatsapp_queue 
            WHERE status = 'pending' 
            AND (scheduled_at IS NULL OR scheduled_at <= NOW())
            ORDER BY created_at ASC 
            LIMIT ?
        ");
        $stmt->execute([$batchSize]);
        $messages = $stmt->fetchAll();
        
        $results = ['sent' => 0, 'failed' => 0, 'processed' => 0];
        
        foreach ($messages as $msg) {
            $template = $this->getTemplateById($msg['template_id']);
            if (!$template) {
                $this->updateQueueStatus($msg['id'], 'failed', [], 'Template not found');
                $results['failed']++;
                continue;
            }
            
            $variables = json_decode($msg['variables'], true) ?? [];
            $message = $this->personalizeMessage($template['body_text'], $variables);
            
            $result = $this->sendToAPI($msg['phone'], $message, $template);
            
            if ($result['success']) {
                $this->updateQueueStatus($msg['id'], 'sent', $result);
                $results['sent']++;
            } else {
                $this->updateQueueStatus($msg['id'], 'failed', $result, $result['error']);
                $results['failed']++;
            }
            
            $results['processed']++;
            
            // Rate limiting delay
            usleep(50000); // 50ms between messages
        }
        
        return $results;
    }
    
    /**
     * Send message via API
     */
    private function sendToAPI(string $phone, string $message, array $template): array {
        // Demo mode - log instead of sending
        if ($this->accessToken === 'demo_token' || $this->phoneNumberId === 'demo') {
            return [
                'success' => true,
                'demo' => true,
                'message_id' => 'demo_' . uniqid(),
                'phone' => $phone,
                'message_preview' => substr($message, 0, 50)
            ];
        }
        
        $payload = $this->buildPayload($phone, $message, $template);
        
        $ch = curl_init($this->apiUrl);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $this->accessToken,
                'Content-Type: application/json'
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($error) {
            return [
                'success' => false,
                'error' => 'CURL Error: ' . $error
            ];
        }
        
        $responseData = json_decode($response, true);
        
        if ($httpCode === 200 && isset($responseData['messages'][0]['id'])) {
            return [
                'success' => true,
                'message_id' => $responseData['messages'][0]['id'],
                'raw_response' => $responseData
            ];
        }
        
        return [
            'success' => false,
            'error' => $responseData['error']['message'] ?? 'API request failed',
            'code' => $httpCode,
            'raw_response' => $responseData
        ];
    }
    
    /**
     * Build API payload based on provider
     */
    private function buildPayload(string $phone, string $message, array $template): array {
        // Ensure phone has country code
        $phone = $this->formatPhoneNumber($phone);
        
        switch ($this->provider) {
            case 'meta':
                return [
                    'messaging_product' => 'whatsapp',
                    'recipient_type' => 'individual',
                    'to' => $phone,
                    'type' => 'template',
                    'template' => [
                        'name' => $template['name'],
                        'language' => ['code' => $template['language'] ?? 'en'],
                        'components' => $this->buildTemplateComponents($message, $template)
                    ]
                ];
                
            case 'twilio':
                return [
                    'To' => 'whatsapp:' . $phone,
                    'From' => 'whatsapp:' . $this->phoneNumberId,
                    'Body' => $message
                ];
        }
        
        return [];
    }
    
    /**
     * Build template components for Meta API
     */
    private function buildTemplateComponents(string $message, array $template): array {
        $components = [];
        
        // Extract variables from message
        if (preg_match_all('/{{(\w+)}}/', $template['body_text'], $matches)) {
            $parameters = [];
            foreach ($matches[1] as $param) {
                $parameters[] = [
                    'type' => 'text',
                    'text' => $param
                ];
            }
            if (!empty($parameters)) {
                $components[] = [
                    'type' => 'body',
                    'parameters' => $parameters
                ];
            }
        }
        
        return $components;
    }
    
    /**
     * Personalize message template with variables
     */
    private function personalizeMessage(string $template, array $variables): string {
        $search = array_map(fn($k) => '{{' . $k . '}}', array_keys($variables));
        $replace = array_values($variables);
        return str_replace($search, $replace, $template);
    }
    
    /**
     * Get template by name and language
     */
    private function getTemplate(string $name, string $lang = 'en'): ?array {
        $stmt = $this->conn->prepare("
            SELECT * FROM whatsapp_templates 
            WHERE name = ? AND language = ? AND status = 'approved'
            LIMIT 1
        ");
        $stmt->execute([$name, $lang]);
        return $stmt->fetch() ?: null;
    }
    
    /**
     * Get template by ID
     */
    private function getTemplateById(int $id): ?array {
        $stmt = $this->conn->prepare("SELECT * FROM whatsapp_templates WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }
    
    /**
     * Get client communication preferences
     */
    private function getClientPreferences(int $clientId): ?array {
        $stmt = $this->conn->prepare("
            SELECT * FROM client_communication_prefs WHERE client_id = ?
        ");
        $stmt->execute([$clientId]);
        $prefs = $stmt->fetch();
        
        // If no prefs exist, create defaults
        if (!$prefs) {
            // Get client phone
            $stmt = $this->conn->prepare("SELECT phone FROM clients WHERE id = ?");
            $stmt->execute([$clientId]);
            $client = $stmt->fetch();
            
            if ($client) {
                $stmt = $this->conn->prepare("
                    INSERT INTO client_communication_prefs (client_id, whatsapp_opt_in, whatsapp_number)
                    VALUES (TRUE, ?, ?)
                ");
                $stmt->execute([$clientId, $client['phone']]);
                
                return $this->getClientPreferences($clientId);
            }
        }
        
        return $prefs ?: null;
    }
    
    /**
     * Check rate limits for client
     */
    private function checkRateLimit(int $clientId): bool {
        $stmt = $this->conn->prepare("
            SELECT COUNT(*) FROM whatsapp_queue 
            WHERE client_id = ? AND DATE(created_at) = CURDATE()
        ");
        $stmt->execute([$clientId]);
        $todayCount = (int) $stmt->fetchColumn();
        
        return $todayCount < 10; // Max 10 messages per client per day
    }
    
    /**
     * Check if currently in quiet hours
     */
    private function isQuietHours(string $start, string $end): bool {
        $now = new DateTime();
        $startTime = DateTime::createFromFormat('H:i:s', $start);
        $endTime = DateTime::createFromFormat('H:i:s', $end);
        
        if (!$startTime || !$endTime) {
            return false;
        }
        
        $nowTime = (int) $now->format('Hi');
        $startInt = (int) $startTime->format('Hi');
        $endInt = (int) $endTime->format('Hi');
        
        if ($startInt < $endInt) {
            return $nowTime >= $startInt && $nowTime <= $endInt;
        }
        // Crosses midnight
        return $nowTime >= $startInt || $nowTime <= $endInt;
    }
    
    /**
     * Get next active time after quiet hours
     */
    private function getNextActiveTime(string $endTime): DateTime {
        $next = new DateTime();
        $end = DateTime::createFromFormat('H:i:s', $endTime);
        
        if ($end) {
            $next->setTime((int) $end->format('H'), (int) $end->format('i'), 0);
        }
        
        if ($next <= new DateTime()) {
            $next->modify('+1 day');
        }
        
        return $next;
    }
    
    /**
     * Format phone number with country code
     */
    private function formatPhoneNumber(string $phone): string {
        // Remove all non-numeric characters
        $phone = preg_replace('/[^0-9]/', '', $phone);
        
        // Add Kenya country code if missing
        if (strlen($phone) === 9) {
            $phone = '254' . $phone;
        } elseif (strlen($phone) === 10 && $phone[0] === '0') {
            $phone = '254' . substr($phone, 1);
        }
        
        return $phone;
    }
    
    /**
     * Update queue status
     */
    private function updateQueueStatus(int $id, string $status, array $apiResponse, ?string $error = null): void {
        $statusColumn = match($status) {
            'delivered' => 'delivered_at',
            'read' => 'read_at',
            default => null
        };
        
        $sql = "UPDATE whatsapp_queue SET status = ?, api_response = ?, error_message = ?";
        $params = [$status, json_encode($apiResponse), $error];
        
        if ($statusColumn && $status !== 'pending') {
            $sql .= ", {$statusColumn} = NOW()";
        }
        
        if ($status === 'sent') {
            $sql .= ", sent_at = NOW()";
        }
        
        $sql .= " WHERE id = ?";
        $params[] = $id;
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
    }
    
    /**
     * Get queue statistics
     */
    public function getQueueStats(): array {
        // Today's stats
        $stmt = $this->conn->prepare("
            SELECT 
                COUNT(*) as total_today,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
                SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
                SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as read_count,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
            FROM whatsapp_queue 
            WHERE DATE(created_at) = CURDATE()
        ");
        $stmt->execute();
        $todayStats = $stmt->fetch();
        
        // Last 7 days
        $stmt = $this->conn->prepare("
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as total,
                SUM(CASE WHEN status IN ('sent', 'delivered', 'read') THEN 1 ELSE 0 END) as successful
            FROM whatsapp_queue 
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        ");
        $stmt->execute();
        $weeklyStats = $stmt->fetchAll();
        
        // Opt-in stats
        $stmt = $this->conn->prepare("
            SELECT 
                COUNT(*) as total_clients,
                SUM(CASE WHEN whatsapp_opt_in = 1 THEN 1 ELSE 0 END) as opted_in
            FROM client_communication_prefs
        ");
        $stmt->execute();
        $optInStats = $stmt->fetch();
        
        return [
            'today' => $todayStats,
            'weekly' => $weeklyStats,
            'opt_in' => $optInStats
        ];
    }
    
    /**
     * Set WhatsApp opt-in preference for client
     */
    public function setClientOptIn(int $clientId, bool $optIn, ?string $phoneNumber = null): array {
        $stmt = $this->conn->prepare("
            INSERT INTO client_communication_prefs (client_id, whatsapp_opt_in, whatsapp_number)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                whatsapp_opt_in = VALUES(whatsapp_opt_in),
                whatsapp_number = COALESCE(VALUES(whatsapp_number), whatsapp_number)
        ");
        
        // Get client phone if not provided
        if (!$phoneNumber) {
            $clientStmt = $this->conn->prepare("SELECT phone FROM clients WHERE id = ?");
            $clientStmt->execute([$clientId]);
            $client = $clientStmt->fetch();
            $phoneNumber = $client['phone'] ?? null;
        }
        
        $stmt->execute([$clientId, $optIn ? 1 : 0, $phoneNumber]);
        
        return ['success' => true];
    }
    
    /**
     * Get message history for client
     */
    public function getClientHistory(int $clientId, int $limit = 50): array {
        $stmt = $this->conn->prepare("
            SELECT * FROM whatsapp_queue 
            WHERE client_id = ? 
            ORDER BY created_at DESC 
            LIMIT ?
        ");
        $stmt->execute([$clientId, $limit]);
        return $stmt->fetchAll();
    }
}
