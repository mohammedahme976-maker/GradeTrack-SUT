CREATE DATABASE IF NOT EXISTS grade_tracker
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE grade_tracker;

CREATE TABLE IF NOT EXISTS users (
    id            INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    fullname      VARCHAR(120)     NOT NULL,
    username      VARCHAR(60)      NOT NULL,
    password_hash VARCHAR(255)     NOT NULL,
    created_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS grades (
    id              INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    user_id         INT UNSIGNED     NOT NULL,
    subject         VARCHAR(120)     NOT NULL,
    assessment_name VARCHAR(180)     NOT NULL,
    mark            DECIMAL(8,2)     NOT NULL,
    total           DECIMAL(8,2)     NOT NULL,
    semester        TINYINT UNSIGNED NOT NULL DEFAULT 1,
    created_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_user_subject (user_id, subject),
    KEY idx_user_semester (user_id, semester),

    CONSTRAINT fk_grades_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

