CREATE DATABASE IF NOT EXISTS pet_expressions;
USE pet_expressions;

CREATE TABLE IF NOT EXISTS jobs (
    id CHAR(36) NOT NULL PRIMARY KEY,
    image_key VARCHAR(255) NOT NULL,
    status ENUM('pending', 'done', 'failed') NOT NULL DEFAULT 'pending',
    label VARCHAR(32) NULL,
    confidence FLOAT NULL,
    probabilities JSON NULL,
    error TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
