-- ALTER TABLE students ADD completed_at DATETIME NULL;
ALTER TABLE students ADD status ENUM('active','inactive') DEFAULT 'active';