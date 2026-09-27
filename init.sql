CREATE DATABASE IF NOT EXISTS reading_tracker;
USE reading_tracker;

-- Bảng lưu thông tin gốc của sách từ Open Library
CREATE TABLE IF NOT EXISTS books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    open_library_key VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    author_name VARCHAR(255),
    cover_url VARCHAR(255),
    total_pages INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng lưu tiến độ và trạng thái đọc của người dùng
CREATE TABLE IF NOT EXISTS user_library (
    id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL,
    status ENUM('want_to_read', 'reading', 'read') DEFAULT 'want_to_read',
    pages_read INT DEFAULT 0,
    rating INT DEFAULT NULL,
    started_at TIMESTAMP NULL,
    finished_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    CONSTRAINT chk_rating CHECK (rating >= 1 AND rating <= 5)
);