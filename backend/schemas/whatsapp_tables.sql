-- WhatsApp Communication System Tables
-- Run this SQL to set up the WhatsApp automation system

-- WhatsApp message templates
CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    category ENUM('job_update', 'appointment', 'followup', 'payment', 'promo') NOT NULL,
    language VARCHAR(5) DEFAULT 'en',
    header_text VARCHAR(100),
    body_text TEXT NOT NULL,
    footer_text VARCHAR(100),
    button_data JSON,
    meta_template_id VARCHAR(100),
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Message queue
CREATE TABLE IF NOT EXISTS whatsapp_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    template_id INT,
    custom_message TEXT,
    message_type ENUM('job_update', 'appointment', 'followup', 'payment', 'promo') NOT NULL,
    variables JSON,
    scheduled_at DATETIME,
    sent_at DATETIME,
    delivered_at DATETIME,
    read_at DATETIME,
    status ENUM('pending', 'queued', 'sent', 'delivered', 'read', 'failed') DEFAULT 'pending',
    error_message VARCHAR(255),
    api_response JSON,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES whatsapp_templates(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_scheduled (scheduled_at),
    INDEX idx_client (client_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Customer communication preferences
CREATE TABLE IF NOT EXISTS client_communication_prefs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL UNIQUE,
    whatsapp_opt_in BOOLEAN DEFAULT FALSE,
    whatsapp_number VARCHAR(20),
    preferred_language ENUM('en', 'sw') DEFAULT 'en',
    quiet_hours_start TIME DEFAULT '21:00:00',
    quiet_hours_end TIME DEFAULT '08:00:00',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    INDEX idx_opt_in (whatsapp_opt_in)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Message analytics log
CREATE TABLE IF NOT EXISTS whatsapp_analytics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message_id INT NOT NULL,
    event_type ENUM('sent', 'delivered', 'read', 'failed', 'replied') NOT NULL,
    event_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSON,
    FOREIGN KEY (message_id) REFERENCES whatsapp_queue(id) ON DELETE CASCADE,
    INDEX idx_event (event_type),
    INDEX idx_timestamp (event_timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Inbound messages from customers
CREATE TABLE IF NOT EXISTS whatsapp_inbound (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT,
    phone VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    message_type ENUM('text', 'image', 'audio', 'video', 'document', 'location', 'button', 'interactive') DEFAULT 'text',
    media_url VARCHAR(500),
    media_caption VARCHAR(500),
    wa_message_id VARCHAR(100),
    received_at DATETIME NOT NULL,
    status ENUM('new', 'read', 'replied', 'archived') DEFAULT 'new',
    replied_at DATETIME,
    reply_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_client (client_id),
    INDEX idx_received (received_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default WhatsApp templates
INSERT INTO whatsapp_templates (name, category, language, body_text, status) VALUES
('job_received', 'job_update', 'en', 
 '🔧 *Job Received*\n\nHi {{client_name}},\n\nWe''ve received your service request for:\n🚗 {{vehicle}}\n📋 {{job_description}}\n⏱️ Estimated: {{estimated_time}}\n\nWe''ll keep you updated on progress!\n\n_Tristar Garage_', 
 'approved'),

('job_in_progress', 'job_update', 'en',
 '⚙️ *Update: Work in Progress*\n\nHi {{client_name}},\n\nGood news! {{worker_name}} is now working on your {{vehicle}}.\n\nWe''ll notify you when it''s ready.\n\n_Tristar Garage_',
 'approved'),

('job_completed', 'job_update', 'en',
 '✅ *Job Completed*\n\nHi {{client_name}},\n\nYour {{vehicle}} is ready!\n\n💰 Total Cost: {{total_cost}}\n🕐 Pickup: {{pickup_time}}\n\nThank you for choosing Tristar Garage!\n\nReply STOP to unsubscribe.',
 'approved'),

('vehicle_ready', 'job_update', 'en',
 '🚗 *Vehicle Ready for Pickup*\n\nHi {{client_name}},\n\nYour {{vehicle}} is fully serviced and ready!\n\n📍 {{pickup_location}}\n\nOffice Hours: 8 AM - 6 PM\n\n_Tristar Garage_',
 'approved'),

('appointment_reminder', 'appointment', 'en',
 '📅 *Appointment Reminder*\n\nHi {{client_name}},\n\nThis is a reminder for your service appointment:\n\n📅 Date: {{date}}\n🕐 Time: {{time}}\n🚗 Vehicle: {{vehicle}}\n\nPlease arrive 10 minutes early.\n\n_Tristar Garage_',
 'approved'),

('service_followup', 'followup', 'en',
 '⭐ *How Was Your Service?*\n\nHi {{client_name}},\n\nWe hope you''re satisfied with the service on your {{vehicle}}.\n\nYour feedback helps us improve!\n\nReply with a rating: 1-5\n\n_Tristar Garage_',
 'approved'),

('payment_reminder', 'payment', 'en',
 '💳 *Payment Reminder*\n\nHi {{client_name}},\n\nThis is a friendly reminder for your pending payment:\n\n💰 Amount Due: {{amount}}\n🚗 Vehicle: {{vehicle}}\n\nPay at pickup or M-Pesa: 0700000000\n\n_Tristar Garage_',
 'approved');
