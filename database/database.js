const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'schedule.db');
const db = new sqlite3.Database(dbPath);

// Ініціалізація таблиць
db.serialize(() => {
    // Таблиця готових комплектів
    db.run(`CREATE TABLE IF NOT EXISTS templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        subject_name TEXT NOT NULL,
        audience_name TEXT NOT NULL,
        teacher_name TEXT NOT NULL
    )`);
    
    // Таблиця груп
    db.run(`CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
    )`);
    
    // Таблиця розкладу
    db.run(`CREATE TABLE IF NOT EXISTS schedule (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER NOT NULL,
        day_of_week INTEGER NOT NULL,
        pair_number INTEGER NOT NULL,
        template_id INTEGER NOT NULL,
        week_type TEXT NOT NULL,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
    )`);
    
    // Таблиця замін
    db.run(`CREATE TABLE IF NOT EXISTS substitutions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        pair_number INTEGER NOT NULL,
        template_id INTEGER NOT NULL,
        old_template_id INTEGER,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
        FOREIGN KEY (old_template_id) REFERENCES templates(id) ON DELETE SET NULL
    )`);
    
    // Додаємо тестові дані
    addTestData();
});

// Додавання тестових даних
function addTestData() {
    // Перевіряємо чи є дані
    db.get("SELECT COUNT(*) as count FROM templates", (err, row) => {
        if (err) return;
        
        if (row.count === 0) {
            // Додаємо тестові комплекти
            db.run(`INSERT INTO templates (name, subject_name, audience_name, teacher_name) VALUES 
                ('Математика Іванов 101', 'Математика', '101', 'Іванов І.І.'),
                ('Математика Петров 102', 'Математика', '102', 'Петров П.П.'),
                ('Фізика Сидоренко 201', 'Фізика', '201', 'Сидоренко С.В.'),
                ('Фізика Коваленко 202', 'Фізика', '202', 'Коваленко К.М.'),
                ('Програмування Мельник 301', 'Програмування', '301', 'Мельник М.І.')`);
        }
    });
    
    db.get("SELECT COUNT(*) as count FROM groups", (err, row) => {
        if (err) return;
        
        if (row.count === 0) {
            // Додаємо тестові групи
            db.run(`INSERT INTO groups (name) VALUES 
                ('ІПЗ-21'),
                ('ІПЗ-22'),
                ('КН-31')`);
        }
    });
}

// Функції для комплектів
function getAllTemplates(callback) {
    db.all("SELECT * FROM templates ORDER BY subject_name", callback);
}

function addTemplate(name, subject, audience, teacher, callback) {
    db.run("INSERT INTO templates (name, subject_name, audience_name, teacher_name) VALUES (?, ?, ?, ?)",
        [name, subject, audience, teacher], function(err) {
            callback(err, this?.lastID);
        });
}

function deleteTemplate(id, callback) {
    db.run("DELETE FROM templates WHERE id = ?", [id], callback);
}

// Функції для груп
function getAllGroups(callback) {
    db.all("SELECT * FROM groups ORDER BY name", callback);
}

function getGroupById(id, callback) {
    db.get("SELECT * FROM groups WHERE id = ?", [id], callback);
}

function addGroup(name, callback) {
    db.run("INSERT INTO groups (name) VALUES (?)", [name], function(err) {
        callback(err, this?.lastID);
    });
}

function deleteGroup(id, callback) {
    db.run("DELETE FROM groups WHERE id = ?", [id], callback);
}

// Функції для розкладу
function getScheduleByGroup(groupId, weekType, callback) {
    db.all(`
        SELECT * FROM schedule 
        WHERE group_id = ? AND (week_type = ? OR week_type = 'both')
        ORDER BY day_of_week, pair_number
    `, [groupId, weekType], callback);
}

function getFullScheduleByGroup(groupId, callback) {
    db.all(`
        SELECT * FROM schedule 
        WHERE group_id = ?
        ORDER BY day_of_week, pair_number
    `, [groupId], callback);
}

function getSchedulePair(id, callback) {
    db.get("SELECT * FROM schedule WHERE id = ?", [id], callback);
}

function getSchedulePairByGroupAndPair(groupId, date, pairNumber, callback) {
    const dayOfWeek = new Date(date).getDay();
    const dayNum = dayOfWeek === 0 ? 7 : dayOfWeek;
    
    db.get(`
        SELECT * FROM schedule 
        WHERE group_id = ? AND day_of_week = ? AND pair_number = ?
    `, [groupId, dayNum, pairNumber], callback);
}

function addScheduleItem(groupId, dayOfWeek, pairNumber, templateId, weekType, callback) {
    db.run(`
        INSERT INTO schedule (group_id, day_of_week, pair_number, template_id, week_type)
        VALUES (?, ?, ?, ?, ?)
    `, [groupId, dayOfWeek, pairNumber, templateId, weekType], function(err) {
        callback(err, this?.lastID);
    });
}

function updateScheduleItem(id, templateId, weekType, callback) {
    db.run(`
        UPDATE schedule 
        SET template_id = ?, week_type = ?
        WHERE id = ?
    `, [templateId, weekType, id], callback);
}

function deleteScheduleItem(id, callback) {
    db.run("DELETE FROM schedule WHERE id = ?", [id], callback);
}

// Функції для замін
function getSubstitutionsByGroup(groupId, callback) {
    db.all(`
        SELECT * FROM substitutions 
        WHERE group_id = ?
        ORDER BY date DESC, pair_number
    `, [groupId], callback);
}

function addSubstitution(groupId, date, pairNumber, templateId, oldTemplateId, callback) {
    db.run(`
        INSERT INTO substitutions (group_id, date, pair_number, template_id, old_template_id)
        VALUES (?, ?, ?, ?, ?)
    `, [groupId, date, pairNumber, templateId, oldTemplateId], function(err) {
        callback(err, this?.lastID);
    });
}

function deleteSubstitution(id, callback) {
    db.run("DELETE FROM substitutions WHERE id = ?", [id], callback);
}

module.exports = {
    getAllTemplates,
    addTemplate,
    deleteTemplate,
    getAllGroups,
    getGroupById,
    addGroup,
    deleteGroup,
    getScheduleByGroup,
    getFullScheduleByGroup,
    getSchedulePair,
    getSchedulePairByGroupAndPair,
    addScheduleItem,
    updateScheduleItem,
    deleteScheduleItem,
    getSubstitutionsByGroup,
    addSubstitution,
    deleteSubstitution
};