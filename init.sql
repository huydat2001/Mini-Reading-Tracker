CREATE DATABASE IF NOT EXISTS reading_tracker;
USE reading_tracker;

-- Bảng lưu thông tin gốc của sách từ Open Library
CREATE TABLE IF NOT EXISTS books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    open_library_id VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    author_name VARCHAR(255),
    cover_url VARCHAR(500),
    description TEXT NULL,
    subjects JSON NULL,
    publish_year INT NULL,
    total_pages INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_books_open_library_id (open_library_id),
    INDEX idx_books_title (title)
);

-- Bảng lưu tiến độ và trạng thái đọc của người dùng
CREATE TABLE IF NOT EXISTS user_library (
    id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL UNIQUE,
    status ENUM('want_to_read', 'reading', 'read') DEFAULT 'want_to_read',
    pages_read INT DEFAULT 0,
    rating INT DEFAULT NULL,
    notes TEXT NULL,
    started_at TIMESTAMP NULL,
    finished_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    INDEX idx_user_library_status (status),
    CONSTRAINT chk_rating CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
    CONSTRAINT chk_pages_read CHECK (pages_read >= 0)
);

-- Seed data mẫu để demo ngay sau docker-compose up
INSERT INTO books (open_library_id, title, author_name, cover_url, description, publish_year, total_pages) VALUES
('/works/OL82563W', 'The Great Gatsby', 'F. Scott Fitzgerald', 'https://covers.openlibrary.org/b/id/7222246-L.jpg', 'A classic novel of the Jazz Age, telling the story of the mysteriously wealthy Jay Gatsby and his love for Daisy Buchanan.', 1925, 180),
('/works/OL45804W', 'To Kill a Mockingbird', 'Harper Lee', 'https://covers.openlibrary.org/b/id/8228691-L.jpg', 'A gripping tale of racial injustice and childhood innocence in the American South.', 1960, 281),
('/works/OL153426W', '1984', 'George Orwell', 'https://covers.openlibrary.org/b/id/7222246-L.jpg', 'A dystopian vision of a totalitarian future where truth is manipulated and freedom is crushed.', 1949, 328),
('/works/OL27648W', 'Pride and Prejudice', 'Jane Austen', 'https://covers.openlibrary.org/b/id/8091016-L.jpg', 'A romantic novel of manners following Elizabeth Bennet and Mr. Darcy.', 1813, 432),
('/works/OL27448W', 'Moby Dick', 'Herman Melville', 'https://covers.openlibrary.org/b/id/7222246-L.jpg', 'The epic saga of Captain Ahab and his obsessive hunt for the white whale.', 1851, 635),
('/works/OL52397W', 'The Hobbit', 'J.R.R. Tolkien', 'https://covers.openlibrary.org/b/id/6979861-L.jpg', 'Bilbo Baggins embarks on an unexpected journey with dwarves and a wizard.', 1937, 310),
('/works/OL106358W', 'Dune', 'Frank Herbert', 'https://covers.openlibrary.org/b/id/8101351-L.jpg', 'A science fiction epic set on the desert planet Arrakis.', 1965, 688),
('/works/OL362427W', 'Sapiens', 'Yuval Noah Harari', 'https://covers.openlibrary.org/b/id/8370226-L.jpg', 'A brief history of humankind, from ancient ancestors to modern societies.', 2011, 443);

INSERT INTO user_library (book_id, status, pages_read, rating, notes, started_at, finished_at) VALUES
(1, 'read', 180, 5, 'Tuyệt vời, một kiệt tác về giấc mơ Mỹ.', '2024-01-05 08:00:00', '2024-01-20 22:00:00'),
(2, 'reading', 120, NULL, 'Đang đọc dở, rất cuốn.', '2024-02-01 09:00:00', NULL),
(3, 'reading', 45, NULL, NULL, '2024-02-10 20:00:00', NULL),
(4, 'want_to_read', 0, NULL, NULL, NULL, NULL),
(5, 'want_to_read', 0, NULL, NULL, NULL, NULL),
(6, 'read', 310, 4, 'Phiêu lưu hấp dẫn, hợp để đọc trước LOTR.', '2023-12-01 08:00:00', '2023-12-15 23:00:00');
