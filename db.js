const mysql = require('mysql2');

// Create connection pool for better performance
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',           //  MySQL username
  password: 'admin',      //  MySQL password
  database: 'volunteer_connect_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error(' Database connection failed:', err.message);
    process.exit(1);
  }
  console.log(' Connected to MySQL Database');
  connection.release();
});

// Export promise-based pool
module.exports = pool.promise();
