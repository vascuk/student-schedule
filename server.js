
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = 3000;

// Підключення до MySQL
const db = mysql.createConnection({
host: process.env.DB_HOST,
user: process.env.DB_USER,
password: process.env.DB_PASSWORD,
database: process.env.DB_NAME
});

db.connect(err => {
    if (err) {
        console.error('Помилка підключення до БД:', err);
    } else {
        console.log('Підключено до MySQL');
    }
});

// ========== ІНІЦІАЛІЗАЦІЯ ТАБЛИЦЬ ==========
db.query(`CREATE TABLE IF NOT EXISTS admin (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    password VARCHAR(50) NOT NULL
)`, (err) => {
    if (err) console.error('Помилка створення таблиці admin:', err);
    else {
        console.log('Таблиця admin готова');
        db.query(`INSERT IGNORE INTO admin (username, password) VALUES ('admin', 'admin123')`);
    }
});

db.query(`CREATE TABLE IF NOT EXISTS \`groups\` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE
)`, (err) => {
    if (err) console.error('Помилка створення таблиці groups:', err);
    else console.log('Таблиця groups готова');
});

db.query(`CREATE TABLE IF NOT EXISTS templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    subject VARCHAR(200) NOT NULL,
    room VARCHAR(50) NOT NULL,
    teacher VARCHAR(200) NOT NULL,
    UNIQUE KEY unique_combo (subject, room, teacher)
)`, (err) => {
    if (err) console.error('Помилка створення таблиці templates:', err);
    else console.log('Таблиця templates готова');
});

db.query(`CREATE TABLE IF NOT EXISTS schedule (
    id INT PRIMARY KEY AUTO_INCREMENT,
    group_id INT NOT NULL,
    day INT NOT NULL,
    pair INT NOT NULL,
    template_id INT NOT NULL,
    week_type VARCHAR(20) NOT NULL,
    FOREIGN KEY (group_id) REFERENCES \`groups\`(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
)`, (err) => {
    if (err) console.error('Помилка створення таблиці schedule:', err);
    else console.log('Таблиця schedule готова');
});

db.query(`CREATE TABLE IF NOT EXISTS substitutions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    group_id INT NOT NULL,
    date DATE NOT NULL,
    pair INT NOT NULL,
    template_id INT NOT NULL,
    FOREIGN KEY (group_id) REFERENCES \`groups\`(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
)`, (err) => {
    if (err) console.error('Помилка створення таблиці substitutions:', err);
    else console.log('Таблиця substitutions готова');
});

// Додаємо тестові дані
db.query(`INSERT IGNORE INTO \`groups\` (name) VALUES 
    ('ІПЗ-21'), ('ІПЗ-22'), ('КН-31')`);

db.query(`INSERT IGNORE INTO templates (subject, room, teacher) VALUES 
    ('Математика', '101', 'Іванов І.І.'),
    ('Математика', '102', 'Петров П.П.'),
    ('Фізика', '201', 'Сидоренко С.В.'),
    ('Фізика', '202', 'Коваленко К.М.'),
    ('Програмування', '301', 'Мельник М.І.'),
    ('Програмування', '302', 'Шевченко Т.Г.'),
    ('Англійська', '401', 'Бондаренко Б.О.'),
    ('Українська', '501', 'Лисенко Л.М.')`);

// ========== КІНЕЦЬ ІНІЦІАЛІЗАЦІЇ ==========

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'admin_secret',
    resave: false,
    saveUninitial: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// ... (тут твій код API)

app.listen(PORT, () => {
    console.log(`Сервер запущено на http://localhost:${PORT}`);
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'admin_secret',
    resave: false,
    saveUninitial: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// ==================== СТОРІНКИ ====================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// ==================== АВТОРИЗАЦІЯ ====================
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    db.query('SELECT * FROM admin WHERE username = ? AND password = ?', 
        [username, password], 
        (err, results) => {
            if (err) {
                res.json({ success: false, error: err.message });
            } else if (results.length > 0) {
                req.session.admin = true;
                res.json({ success: true });
            } else {
                res.json({ success: false, error: 'Невірний логін або пароль' });
            }
        });
});

app.get('/api/check-auth', (req, res) => {
    res.json({ authenticated: req.session.admin || false });
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// ==================== ГРУПИ ====================
app.get('/api/groups', (req, res) => {
    db.query('SELECT * FROM `groups` ORDER BY name', (err, results) => {
        if (err) {
            res.json({ success: false, error: err.message });
        } else {
            res.json({ success: true, data: results });
        }
    });
});

app.post('/api/groups', (req, res) => {
    if (!req.session.admin) {
        return res.json({ success: false, error: 'Не авторизований' });
    }
    
    const { name } = req.body;
    db.query('INSERT INTO `groups` (name) VALUES (?)', [name], (err, result) => {
        if (err) {
            res.json({ success: false, error: err.message });
        } else {
            res.json({ success: true, id: result.insertId });
        }
    });
});

app.delete('/api/groups/:id', (req, res) => {
    if (!req.session.admin) {
        return res.json({ success: false, error: 'Не авторизований' });
    }
    
    db.query('DELETE FROM `groups` WHERE id = ?', [req.params.id], (err) => {
        if (err) {
            res.json({ success: false, error: err.message });
        } else {
            res.json({ success: true });
        }
    });
});

// ==================== КОМПЛЕКТИ ====================
app.get('/api/templates', (req, res) => {
    db.query('SELECT * FROM templates ORDER BY subject', (err, results) => {
        if (err) {
            res.json({ success: false, error: err.message });
        } else {
            res.json({ success: true, data: results });
        }
    });
});

app.post('/api/templates', (req, res) => {
    if (!req.session.admin) {
        return res.json({ success: false, error: 'Не авторизований' });
    }
    
    const { subject, room, teacher } = req.body;
    db.query('INSERT INTO templates (subject, room, teacher) VALUES (?, ?, ?)',
        [subject, room, teacher], (err, result) => {
            if (err) {
                res.json({ success: false, error: err.message });
            } else {
                res.json({ success: true, id: result.insertId });
            }
        });
});

app.delete('/api/templates/:id', (req, res) => {
    if (!req.session.admin) {
        return res.json({ success: false, error: 'Не авторизований' });
    }
    
    db.query('DELETE FROM templates WHERE id = ?', [req.params.id], (err) => {
        if (err) {
            res.json({ success: false, error: err.message });
        } else {
            res.json({ success: true });
        }
    });
});

// ==================== РОЗКЛАД ====================
app.get('/api/schedule/:groupId', (req, res) => {
    db.query('SELECT * FROM schedule WHERE group_id = ? ORDER BY day, pair', 
        [req.params.groupId], (err, results) => {
            if (err) {
                res.json({ success: false, error: err.message });
            } else {
                res.json({ success: true, data: results });
            }
        });
});

app.post('/api/schedule', (req, res) => {
    if (!req.session.admin) {
        return res.json({ success: false, error: 'Не авторизований' });
    }
    
    const { group_id, day, pair, template_id, week_type } = req.body;
    db.query('INSERT INTO schedule (group_id, day, pair, template_id, week_type) VALUES (?, ?, ?, ?, ?)',
        [group_id, day, pair, template_id, week_type], (err, result) => {
            if (err) {
                res.json({ success: false, error: err.message });
            } else {
                res.json({ success: true, id: result.insertId });
            }
        });
});

app.put('/api/schedule/:id', (req, res) => {
    if (!req.session.admin) {
        return res.json({ success: false, error: 'Не авторизований' });
    }
    
    const { template_id, week_type } = req.body;
    db.query('UPDATE schedule SET template_id = ?, week_type = ? WHERE id = ?',
        [template_id, week_type, req.params.id], (err) => {
            if (err) {
                res.json({ success: false, error: err.message });
            } else {
                res.json({ success: true });
            }
        });
});

app.delete('/api/schedule/:id', (req, res) => {
    if (!req.session.admin) {
        return res.json({ success: false, error: 'Не авторизований' });
    }
    
    db.query('DELETE FROM schedule WHERE id = ?', [req.params.id], (err) => {
        if (err) {
            res.json({ success: false, error: err.message });
        } else {
            res.json({ success: true });
        }
    });
});

app.post('/api/schedule/delete-all', (req, res) => {
    if (!req.session.admin) {
        return res.json({ success: false, error: 'Не авторизований' });
    }
    
    const { group_id, day, pair } = req.body;
    db.query('DELETE FROM schedule WHERE group_id = ? AND day = ? AND pair = ?',
        [group_id, day, pair], (err) => {
            if (err) {
                res.json({ success: false, error: err.message });
            } else {
                res.json({ success: true });
            }
        });
});

// ==================== ЗАМІНИ ====================
app.get('/api/substitutions/:groupId', (req, res) => {
    db.query('SELECT * FROM substitutions WHERE group_id = ? ORDER BY date DESC', 
        [req.params.groupId], (err, results) => {
            if (err) {
                res.json({ success: false, error: err.message });
            } else {
                res.json({ success: true, data: results });
            }
        });
});

app.post('/api/substitutions', (req, res) => {
    if (!req.session.admin) {
        return res.json({ success: false, error: 'Не авторизований' });
    }
    
    const { group_id, date, pair, template_id } = req.body;
    db.query('INSERT INTO substitutions (group_id, date, pair, template_id) VALUES (?, ?, ?, ?)',
        [group_id, date, pair, template_id], (err, result) => {
            if (err) {
                res.json({ success: false, error: err.message });
            } else {
                res.json({ success: true, id: result.insertId });
            }
        });
});

app.delete('/api/substitutions/:id', (req, res) => {
    if (!req.session.admin) {
        return res.json({ success: false, error: 'Не авторизований' });
    }
    
    db.query('DELETE FROM substitutions WHERE id = ?', [req.params.id], (err) => {
        if (err) {
            res.json({ success: false, error: err.message });
        } else {
            res.json({ success: true });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Сервер запущено на http://localhost:${PORT}`);
    console.log(`Адмін панель: http://localhost:${PORT}/admin`);
});
