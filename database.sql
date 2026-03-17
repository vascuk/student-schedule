-- Створюємо базу даних
CREATE DATABASE IF NOT EXISTS college_schedule;
USE college_schedule;

-- Таблиця адмінів
CREATE TABLE IF NOT EXISTS admin (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    password VARCHAR(50) NOT NULL
);

-- Додаємо адміна (пароль: admin123)
INSERT INTO admin (username, password) VALUES ('admin', 'admin123');

-- Таблиця груп
CREATE TABLE IF NOT EXISTS `groups` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- Таблиця готових комплектів
CREATE TABLE IF NOT EXISTS templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    subject VARCHAR(200) NOT NULL,
    room VARCHAR(50) NOT NULL,
    teacher VARCHAR(200) NOT NULL,
    UNIQUE KEY unique_combo (subject, room, teacher)
);

-- Таблиця розкладу
CREATE TABLE IF NOT EXISTS schedule (
    id INT PRIMARY KEY AUTO_INCREMENT,
    group_id INT NOT NULL,
    day INT NOT NULL CHECK (day BETWEEN 1 AND 6),
    pair INT NOT NULL CHECK (pair BETWEEN 1 AND 5),
    template_id INT NOT NULL,
    week_type VARCHAR(20) NOT NULL CHECK (week_type IN ('both', 'numerator', 'denominator')),
    FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
);

-- Таблиця замін
CREATE TABLE IF NOT EXISTS substitutions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    group_id INT NOT NULL,
    date DATE NOT NULL,
    pair INT NOT NULL CHECK (pair BETWEEN 1 AND 5),
    template_id INT NOT NULL,
    FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
);

-- Додаємо тестові дані (необов'язково)
INSERT INTO `groups` (name) VALUES 
('ІПЗ-21'),
('ІПЗ-22'),
('КН-31');

INSERT INTO templates (subject, room, teacher) VALUES 
('Математика', '101', 'Іванов І.І.'),
('Математика', '102', 'Петров П.П.'),
('Фізика', '201', 'Сидоренко С.В.'),
('Фізика', '202', 'Коваленко К.М.'),
('Програмування', '301', 'Мельник М.І.'),
('Програмування', '302', 'Шевченко Т.Г.'),
('Англійська', '401', 'Бондаренко Б.О.'),
('Українська', '501', 'Лисенко Л.М.');