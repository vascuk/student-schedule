require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = 3000;

// Підключення до MySQL
const db = mysql.createConnection({
    host: "mysql.railway.internal",
    user: "root",
    password: "bNwMkFZvWmyrBfhRuCstdTjzPHsMIwXU",
    database: "railway"
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

// ========== ТАБЛИЦЯ ДЛЯ ЛОГІВ АДМІНКИ ==========
db.query(`CREATE TABLE IF NOT EXISTS admin_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ip VARCHAR(45),
    user_agent TEXT,
    device_type VARCHAR(50),
    os VARCHAR(50),
    browser VARCHAR(50),
    browser_version VARCHAR(20),
    accept_language VARCHAR(100),
    referer VARCHAR(500),
    method VARCHAR(10),
    url VARCHAR(500),
    query_params TEXT,
    body_data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`, (err) => {
    if (err) console.error('Помилка створення таблиці admin_logs:', err);
    else console.log('Таблиця admin_logs готова');
});

// ========== MIDDLEWARE ==========
app.use(express.json());
app.use(express.static(path.join(__dirname, 'views')));
app.use(session({
    secret: process.env.SESSION_SECRET || 'admin_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// ========== ЛОГУВАННЯ АДМІН-ЗАПИТІВ ==========
app.use('/admin', (req, res, next) => {
    // Отримуємо IP (з урахуванням проксі)
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || 
               req.socket.remoteAddress || 
               req.connection.remoteAddress;
    
    // Отримуємо User-Agent
    const userAgent = req.headers['user-agent'] || 'невідомо';
    
    // Отримуємо час
    const timestamp = new Date().toISOString();
    
    // Отримуємо мову браузера
    const acceptLanguage = req.headers['accept-language'] || 'невідомо';
    
    // Отримуємо реферер (звідки прийшов)
    const referer = req.headers['referer'] || 'прямий перехід';
    
    // Отримуємо метод запиту
    const method = req.method;
    
    // Отримуємо URL
    const url = req.originalUrl;
    
    // Отримуємо параметри запиту (якщо є)
    const queryParams = JSON.stringify(req.query);
    
    // Отримуємо дані форми (якщо є)
    const bodyData = req.method === 'POST' ? JSON.stringify(req.body) : null;
    
    // Визначаємо тип пристрою
    let deviceType = 'Комп\'ютер';
    if (userAgent.includes('Mobile')) deviceType = 'Мобільний телефон';
    else if (userAgent.includes('Tablet')) deviceType = 'Планшет';
    
    // Визначаємо ОС
    let os = 'Невідомо';
    if (userAgent.includes('Windows NT 10.0')) os = 'Windows 10/11';
    else if (userAgent.includes('Windows NT 6.1')) os = 'Windows 7';
    else if (userAgent.includes('Mac OS X')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
    
    // Визначаємо браузер
    let browser = 'Невідомо';
    if (userAgent.includes('Edg/')) browser = 'Microsoft Edge';
    else if (userAgent.includes('Chrome/')) browser = 'Google Chrome';
    else if (userAgent.includes('Firefox/')) browser = 'Mozilla Firefox';
    else if (userAgent.includes('Safari/')) browser = 'Safari';
    else if (userAgent.includes('OPR/')) browser = 'Opera';
    
    // Визначаємо версію браузера
    let browserVersion = 'невідомо';
    const versionMatch = userAgent.match(/(Chrome|Edg|Firefox|OPR)\/(\d+\.\d+)/);
    if (versionMatch) browserVersion = versionMatch[2];
    
    // Виводимо в консоль
    console.log(`\n🔐 [${timestamp}] ДОСТУП ДО АДМІНКИ`);
    console.log(`📡 IP: ${ip}`);
    console.log(`💻 Пристрій: ${deviceType}`);
    console.log(`🖥️ ОС: ${os}`);
    console.log(`🌐 Браузер: ${browser} ${browserVersion}`);
    console.log(`🔗 URL: ${method} ${url}`);
    console.log(`📍 Мова: ${acceptLanguage}`);
    console.log(`🔙 Реферер: ${referer}`);
    if (queryParams !== '{}') console.log(`📝 Параметри: ${queryParams}`);
    if (bodyData) console.log(`📦 Дані форми: ${bodyData}`);
    
    // Зберегти в базу даних
    db.query(
        `INSERT INTO admin_logs 
        (ip, user_agent, device_type, os, browser, browser_version, accept_language, referer, method, url, query_params, body_data, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            ip, 
            userAgent, 
            deviceType, 
            os, 
            browser, 
            browserVersion,
            acceptLanguage,
            referer,
            method,
            url,
            queryParams !== '{}' ? queryParams : null,
            bodyData,
            timestamp
        ],
        (err) => {
            if (err) console.error('Помилка збереження логу:', err);
        }
    );
    
    next();
});

// ========== СТОРІНКИ ==========
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

app.get('/teacher.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'teacher.html'));
});

// ========== АВТОРИЗАЦІЯ ==========
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

// ========== ГРУПИ ==========
app.get('/api/groups', (req, res) => {
    db.query('SELECT * FROM `groups` ORDER BY name', (err, results) => {
        if (err) {
            res.json({ success: false, error: err.message });
        } else {
            res.json({ success: true, data: results });
        }
    });
});

app.get('/api/groups/:id', (req, res) => {
    db.query('SELECT * FROM `groups` WHERE id = ?', [req.params.id], (err, results) => {
        if (err) {
            res.json({ success: false, error: err.message });
        } else {
            res.json({ success: true, data: results[0] });
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

// ========== КОМПЛЕКТИ ==========
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

// ========== РОЗКЛАД ==========
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

// ========== ЗАМІНИ ==========
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

// ========== ВСІ ЗАМІНИ (ДЛЯ ВИКЛАДАЧІВ) ==========
app.get('/api/substitutions/all', (req, res) => {
    db.query('SELECT * FROM substitutions ORDER BY date DESC', (err, results) => {
        if (err) {
            res.json({ success: false, error: err.message });
        } else {
            res.json({ success: true, data: results });
        }
    });
});

// ========== ВИКЛАДАЧІ ==========
app.get('/api/teachers', (req, res) => {
    db.query('SELECT DISTINCT teacher FROM templates ORDER BY teacher', (err, results) => {
        if (err) {
            res.json({ success: false, error: err.message });
        } else {
            res.json({ success: true, data: results.map(t => ({ name: t.teacher })) });
        }
    });
});

app.get('/api/teacher-schedule/:teacherName', (req, res) => {
    const teacherName = decodeURIComponent(req.params.teacherName);
    const weekType = getWeekType();

    db.query(`
        SELECT s.*, g.name as group_name, t.subject, t.room, t.teacher
        FROM schedule s
        JOIN templates t ON s.template_id = t.id
        JOIN \`groups\` g ON s.group_id = g.id
        WHERE t.teacher = ? AND (s.week_type = ? OR s.week_type = 'both')
        ORDER BY s.day, s.pair
    `, [teacherName, weekType], (err, results) => {
        if (err) {
            res.json({ success: false, error: err.message });
        } else {
            res.json({ success: true, data: results });
        }
    });
});

// ========== ФУНКЦІЯ ВИЗНАЧЕННЯ ТИЖНЯ ==========
function getWeekType() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now - start) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil(days / 7);
    return weekNumber % 2 === 0 ? 'numerator' : 'denominator';
}

// ========== ЗАПУСК СЕРВЕРА ==========
app.listen(PORT, () => {
    console.log(`Сервер запущено на http://localhost:${PORT}`);
    console.log(`Адмін панель: http://localhost:${PORT}/admin`);
});
