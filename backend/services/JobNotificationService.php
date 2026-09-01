<?php
// backend/services/JobNotificationService.php

require_once __DIR__ . '/WhatsAppService.php';

class JobNotificationService {
    private $whatsapp;
    private $conn;
    
    public function __construct() {
        $this->whatsapp = new WhatsAppService();
        $this->conn = getDBConnection();
    }
    
    /**
     * Notify client when job status changes
     */
    public function notifyJobStatusChange(int $jobId, string $newStatus): array {
        // Get job details with client info
        $stmt = $this->conn->prepare("
            SELECT 
                rj.*,
                c.id as client_id,
                c.name as client_name,
                c.phone as client_phone,
                v.make,
                v.model,
                v.plate,
                w.name as worker_name
            FROM repair_jobs rj
            JOIN vehicles v ON rj.vehicle_id = v.id
            JOIN clients c ON v.client_id = c.id
            LEFT JOIN workers w ON rj.worker_id = w.id
            WHERE rj.id = ?
        ");
        $stmt->execute([$jobId]);
        $job = $stmt->fetch();
        
        if (!$job) {
            return ['success' => false, 'error' => 'Job not found'];
        }
        
        // Determine template and variables based on status
        $templateMap = [
            'pending' => [
                'template' => 'job_received',
                'vars' => [
                    'client_name' => $this->getFirstName($job['client_name']),
                    'vehicle' => "{$job['make']} {$job['model']} ({$job['plate']})",
                    'job_description' => $this->truncate($job['description'], 50),
                    'estimated_time' => $job['estimated_hours'] ? $job['estimated_hours'] . ' hours' : 'TBD'
                ]
            ],
            'in_progress' => [
                'template' => 'job_in_progress',
                'vars' => [
                    'client_name' => $this->getFirstName($job['client_name']),
                    'vehicle' => "{$job['make']} {$job['model']}",
                    'worker_name' => $job['worker_name'] ?? 'Our technician',
                    'progress' => '50%'
                ]
            ],
            'completed' => [
                'template' => 'job_completed',
                'vars' => [
                    'client_name' => $this->getFirstName($job['client_name']),
                    'vehicle' => "{$job['make']} {$job['model']} ({$job['plate']})",
                    'total_cost' => 'KSh ' . number_format($this->calculateJobCost($jobId), 2),
                    'pickup_time' => 'Today after 5 PM'
                ]
            ],
            'ready' => [
                'template' => 'vehicle_ready',
                'vars' => [
                    'client_name' => $this->getFirstName($job['client_name']),
                    'vehicle' => "{$job['make']} {$job['model']} ({$job['plate']})",
                    'pickup_location' => 'Tristar Garage, Main Branch'
                ]
            ]
        ];
        
        if (!isset($templateMap[$newStatus])) {
            return ['success' => false, 'error' => 'No notification configured for status: ' . $newStatus];
        }
        
        $config = $templateMap[$newStatus];
        
        // Ensure client has communication prefs
        $this->ensureClientPrefs($job['client_id'], $job['client_phone']);
        
        // Queue the message
        return $this->whatsapp->queueMessage(
            $job['client_id'],
            $config['template'],
            $config['vars']
        );
    }
    
    /**
     * Send appointment reminders for upcoming jobs (called by cron daily)
     */
    public function sendAppointmentReminders(): array {
        $tomorrow = date('Y-m-d', strtotime('+1 day'));
        
        // Find jobs with appointments tomorrow
        $stmt = $this->conn->prepare("
            SELECT 
                rj.*,
                c.id as client_id,
                c.name as client_name,
                c.phone as client_phone,
                v.make,
                v.model,
                v.plate
            FROM repair_jobs rj
            JOIN vehicles v ON rj.vehicle_id = v.id
            JOIN clients c ON v.client_id = c.id
            WHERE DATE(rj.start_date) = ?
            AND rj.status IN ('pending', 'in_progress')
        ");
        $stmt->execute([$tomorrow]);
        $appointments = $stmt->fetchAll();
        
        $results = ['sent' => 0, 'failed' => 0, 'total' => count($appointments)];
        
        foreach ($appointments as $appt) {
            // Ensure client has prefs
            $this->ensureClientPrefs($appt['client_id'], $appt['client_phone']);
            
            $result = $this->whatsapp->queueMessage(
                $appt['client_id'],
                'appointment_reminder',
                [
                    'client_name' => $this->getFirstName($appt['client_name']),
                    'vehicle' => "{$appt['make']} {$appt['model']}",
                    'date' => date('d M Y', strtotime($appt['start_date'])),
                    'time' => date('g A', strtotime($appt['start_date']))
                ]
            );
            
            $result['success'] ? $results['sent']++ : $results['failed']++;
        }
        
        return $results;
    }
    
    /**
     * Send follow-up messages for completed jobs (called by cron daily)
     */
    public function sendFollowUpMessages(): array {
        $yesterday = date('Y-m-d', strtotime('-1 day'));
        
        // Find jobs completed yesterday without follow-up sent
        $stmt = $this->conn->prepare("
            SELECT 
                rj.*,
                c.id as client_id,
                c.name as client_name,
                c.phone as client_phone,
                v.make,
                v.model,
                v.plate
            FROM repair_jobs rj
            JOIN vehicles v ON rj.vehicle_id = v.id
            JOIN clients c ON v.client_id = c.id
            LEFT JOIN whatsapp_queue wq ON wq.client_id = c.id 
                AND wq.message_type = 'followup' 
                AND DATE(wq.created_at) = ?
            WHERE rj.status = 'completed'
            AND DATE(rj.created_at) = ?
            AND wq.id IS NULL
        ");
        $stmt->execute([$yesterday, $yesterday]);
        $jobs = $stmt->fetchAll();
        
        $results = ['sent' => 0, 'failed' => 0, 'total' => count($jobs)];
        
        foreach ($jobs as $job) {
            // Ensure client has prefs
            $this->ensureClientPrefs($job['client_id'], $job['client_phone']);
            
            $result = $this->whatsapp->queueMessage(
                $job['client_id'],
                'service_followup',
                [
                    'client_name' => $this->getFirstName($job['client_name']),
                    'vehicle' => "{$job['make']} {$job['model']}"
                ]
            );
            
            $result['success'] ? $results['sent']++ : $results['failed']++;
        }
        
        return $results;
    }
    
    /**
     * Send payment reminder to client
     */
    public function sendPaymentReminder(int $jobId): array {
        $stmt = $this->conn->prepare("
            SELECT 
                rj.*,
                c.id as client_id,
                c.name as client_name,
                c.phone as client_phone,
                v.make,
                v.model,
                v.plate
            FROM repair_jobs rj
            JOIN vehicles v ON rj.vehicle_id = v.id
            JOIN clients c ON v.client_id = c.id
            WHERE rj.id = ? AND rj.status = 'completed'
        ");
        $stmt->execute([$jobId]);
        $job = $stmt->fetch();
        
        if (!$job) {
            return ['success' => false, 'error' => 'Completed job not found'];
        }
        
        $amount = $this->calculateJobCost($jobId);
        
        $this->ensureClientPrefs($job['client_id'], $job['client_phone']);
        
        return $this->whatsapp->queueMessage(
            $job['client_id'],
            'payment_reminder',
            [
                'client_name' => $this->getFirstName($job['client_name']),
                'vehicle' => "{$job['make']} {$job['model']} ({$job['plate']})",
                'amount' => 'KSh ' . number_format($amount, 2)
            ]
        );
    }
    
    /**
     * Calculate total cost for a job
     */
    private function calculateJobCost(int $jobId): float {
        // Get job details
        $stmt = $this->conn->prepare("SELECT * FROM repair_jobs WHERE id = ?");
        $stmt->execute([$jobId]);
        $job = $stmt->fetch();
        
        if (!$job) {
            return 0;
        }
        
        // Base cost from estimated hours (simplified)
        $laborCost = ($job['estimated_hours'] ?? 2) * 1000; // KSh 1000 per hour
        
        // For now, return estimated cost (can be enhanced with actual parts tracking)
        return $laborCost + 2000; // Base service charge
    }
    
    /**
     * Ensure client has communication preferences set
     */
    private function ensureClientPrefs(int $clientId, ?string $phone): void {
        $stmt = $this->conn->prepare("
            SELECT id FROM client_communication_prefs WHERE client_id = ?
        ");
        $stmt->execute([$clientId]);
        
        if (!$stmt->fetch()) {
            $stmt = $this->conn->prepare("
                INSERT INTO client_communication_prefs (client_id, whatsapp_opt_in, whatsapp_number)
                VALUES (TRUE, ?, ?)
            ");
            $stmt->execute([$clientId, $phone]);
        }
    }
    
    /**
     * Get first name from full name
     */
    private function getFirstName(string $fullName): string {
        $parts = explode(' ', trim($fullName));
        return $parts[0] ?? $fullName;
    }
    
    /**
     * Truncate text to specified length
     */
    private function truncate(string $text, int $length): string {
        if (strlen($text) <= $length) {
            return $text;
        }
        return substr($text, 0, $length) . '...';
    }
}
