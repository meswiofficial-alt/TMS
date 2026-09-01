<?php
// backend/cron/send_appointment_reminders.php
// Send appointment reminders for tomorrow's jobs
// Run daily at 9 AM: 0 9 * * * php /var/www/html/backend/cron/send_appointment_reminders.php

$lockFile = __DIR__ . '/appointment_reminders.lock';

if (file_exists($lockFile) && (time() - filemtime($lockFile)) < 3600) {
    exit("Already ran recently\n");
}

touch($lockFile);

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/logs/whatsapp_errors.log');

try {
    require_once __DIR__ . '/../services/JobNotificationService.php';
    
    $service = new JobNotificationService();
    $results = $service->sendAppointmentReminders();
    
    $logMessage = sprintf(
        "[%s] Appointment Reminders | Total: %d | Sent: %d | Failed: %d\n",
        date('Y-m-d H:i:s'),
        $results['total'],
        $results['sent'],
        $results['failed']
    );
    
    $logDir = __DIR__ . '/logs';
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    file_put_contents($logDir . '/appointment_reminders.log', $logMessage, FILE_APPEND);
    echo $logMessage;
    
} catch (Exception $e) {
    $errorMsg = "[" . date('Y-m-d H:i:s') . "] Error: " . $e->getMessage() . "\n";
    error_log($errorMsg);
    echo $errorMsg;
} finally {
    if (file_exists($lockFile)) {
        unlink($lockFile);
    }
}
