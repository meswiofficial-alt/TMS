-- Sample data for WhatsApp system testing
INSERT IGNORE INTO client_communication_prefs (client_id, whatsapp_opt_in, whatsapp_number) VALUES 
(1, 1, '+254712345678'), 
(2, 1, '+254723456789'), 
(3, 0, '+254734567890');

INSERT IGNORE INTO whatsapp_queue (client_id, phone, template_id, message_type, variables, status, sent_at) VALUES 
(1, '+254712345678', 1, 'job_update', '{"client_name": "Alice"}', 'delivered', NOW()),
(2, '+254723456789', 2, 'job_update', '{"client_name": "Bob"}', 'read', NOW()),
(1, '+254712345678', 5, 'appointment', '{"client_name": "Alice"}', 'sent', NOW());
