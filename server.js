const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 1. Database Connection & Table
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) console.error('Error opening database:', err.message);
    else {
        console.log('Connected to the SQLite database successfully!');
        db.run(`CREATE TABLE IF NOT EXISTS Product_Review (
            review_id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            username TEXT NOT NULL,
            rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
            review_text TEXT CHECK(length(review_text) <= 1000),
            review_date DATE DEFAULT (date('now')),
            status TEXT DEFAULT 'Visible' CHECK (status IN ('Visible', 'Hidden', 'Reported')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    }
});

const allowedStatuses = ['Visible', 'Hidden', 'Reported'];

// --- CRUD API ROUTES ---

// CREATE: Add a new review
app.post('/api/reviews', (req, res) => {
    const { product_id, user_id, username, rating, review_text, status } = req.body;

    if (!product_id || !Number.isInteger(product_id)) return res.status(400).json({ error: "product_id is required as an integer." });
    if (!user_id || !Number.isInteger(user_id)) return res.status(400).json({ error: "user_id is required as an integer." });
    if (!username || typeof username !== 'string') return res.status(400).json({ error: "username is required." });
    if (!rating || !Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: "rating must be an integer between 1 and 5." });

    const query = `INSERT INTO Product_Review (product_id, user_id, username, rating, review_text, status) VALUES (?, ?, ?, ?, ?, ?)`;
    const values = [product_id, user_id, username, rating, review_text || null, status || 'Visible'];

    db.run(query, values, function(err) {
        if (err) return res.status(500).json({ error: "Database error: " + err.message });
        res.status(201).json({ message: "Review created successfully", review_id: this.lastID });
    });
});

// READ: Get ALL reviews for the dashboard (Fixed Route)
app.get('/api/reviews', (req, res) => {
    const query = `SELECT * FROM Product_Review ORDER BY created_at DESC`;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: "Database error: " + err.message });
        res.status(200).json(rows);
    });
});

// UPDATE: Edit an existing review
app.put('/api/reviews/:review_id', (req, res) => {
    const reviewId = parseInt(req.params.review_id, 10);
    
    // Ab hum username, product_id, aur user_id ko bhi extract kar rahe hain
    const { product_id, user_id, username, rating, review_text, status } = req.body;

    let updateFields = [];
    let values = [];

    // Har field ke liye check aur update logic
    if (product_id !== undefined && product_id !== '') { updateFields.push("product_id = ?"); values.push(product_id); }
    if (user_id !== undefined && user_id !== '') { updateFields.push("user_id = ?"); values.push(user_id); }
    if (username !== undefined && username.trim() !== '') { updateFields.push("username = ?"); values.push(username); }
    if (rating !== undefined) { updateFields.push("rating = ?"); values.push(rating); }
    if (review_text !== undefined) { updateFields.push("review_text = ?"); values.push(review_text); }
    if (status !== undefined) { updateFields.push("status = ?"); values.push(status); }

    if (updateFields.length === 0) return res.status(400).json({ error: "No valid fields provided." });

    updateFields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(reviewId);

    const query = `UPDATE Product_Review SET ${updateFields.join(', ')} WHERE review_id = ?`;

    db.run(query, values, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: "Review updated successfully" });
    });
});

// DELETE: Remove a review
app.delete('/api/reviews/:review_id', (req, res) => {
    const reviewId = parseInt(req.params.review_id, 10);
    const query = `DELETE FROM Product_Review WHERE review_id = ?`;
    
    db.run(query, [reviewId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: "Review deleted successfully" });
    });
});

// Start Server
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});