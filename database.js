import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './config.env' });

// Database configuration
const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'hidupku_db',
  port: process.env.MYSQL_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database MySQL berhasil terhubung');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Error koneksi database:', error.message);
    return false;
  }
}

// Database helper functions
const db = {
  // User functions
  async createUser(uid, name, email, hashedPassword) {
    try {
      const [result] = await pool.execute(
        'INSERT INTO users (uid, name, email, password) VALUES (?, ?, ?, ?)',
        [uid, name, email, hashedPassword]
      );
      return result.insertId;
    } catch (error) {
      throw error;
    }
  },

  async getUserByEmail(email) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      return rows[0];
    } catch (error) {
      throw error;
    }
  },

  async getUserById(id) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );
      return rows[0];
    } catch (error) {
      throw error;
    }
  },

  async getUserByUid(uid) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE uid = ?',
        [uid]
      );
      return rows[0];
    } catch (error) {
      throw error;
    }
  },

  // Chat session functions
  async createChatSession(chatId, userId, title = 'Chat baru') {
    try {
      const [result] = await pool.execute(
        'INSERT INTO chat_sessions (chat_id, user_id, title) VALUES (?, ?, ?)',
        [chatId, userId, title]
      );
      return result.insertId;
    } catch (error) {
      throw error;
    }
  },

  async getChatSession(chatId) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM chat_sessions WHERE chat_id = ?',
        [chatId]
      );
      return rows[0];
    } catch (error) {
      throw error;
    }
  },

  async updateChatSession(chatId, title) {
    try {
      await pool.execute(
        'UPDATE chat_sessions SET title = ?, last_updated = CURRENT_TIMESTAMP WHERE chat_id = ?',
        [title, chatId]
      );
    } catch (error) {
      throw error;
    }
  },

  async getUserChatSessions(userId) {
    try {
      const [rows] = await pool.execute(
        `SELECT cs.chat_id, cs.title, cs.created_at, cs.last_updated,
                COUNT(m.id) as message_count,
                (SELECT GROUP_CONCAT(content ORDER BY timestamp ASC SEPARATOR ' | ') 
                 FROM messages 
                 WHERE chat_id = cs.chat_id 
                 AND role = 'user' 
                 LIMIT 3) as conversation_preview
         FROM chat_sessions cs
         LEFT JOIN messages m ON cs.chat_id = m.chat_id
         WHERE cs.user_id = ?
         GROUP BY cs.chat_id, cs.title, cs.created_at, cs.last_updated
         ORDER BY cs.last_updated DESC`,
        [userId]
      );
      
      // Ensure all required fields are present
      return rows.map(row => ({
        chat_id: row.chat_id,
        title: row.title || 'Konsultasi Baru',
        created_at: row.created_at,
        last_updated: row.last_updated,
        message_count: row.message_count || 0,
        first_message: row.conversation_preview || 'Konsultasi kesehatan'
      }));
    } catch (error) {
      console.error('Error getting user chat sessions:', error);
      throw error;
    }
  },

  async getUserChatCount(userId) {
    try {
      const [rows] = await pool.execute(
        'SELECT COUNT(*) as count FROM chat_sessions WHERE user_id = ?',
        [userId]
      );
      return rows[0].count;
    } catch (error) {
      throw error;
    }
  },

  async getUserChats(userId) {
    try {
      const [rows] = await pool.execute(
        `SELECT cs.chat_id, cs.title, cs.created_at, cs.last_updated,
                COUNT(m.id) as message_count,
                (SELECT GROUP_CONCAT(content ORDER BY timestamp ASC SEPARATOR ' | ') 
                 FROM messages 
                 WHERE chat_id = cs.chat_id 
                 AND role = 'user' 
                 LIMIT 3) as conversation_preview
         FROM chat_sessions cs
         LEFT JOIN messages m ON cs.chat_id = m.chat_id
         WHERE cs.user_id = ?
         GROUP BY cs.chat_id, cs.title, cs.created_at, cs.last_updated
         ORDER BY cs.last_updated DESC`,
        [userId]
      );
      
      // Ensure all required fields are present
      return rows.map(row => ({
        chat_id: row.chat_id,
        title: row.title || 'Konsultasi Baru',
        created_at: row.created_at,
        last_updated: row.last_updated,
        message_count: row.message_count || 0,
        first_message: row.conversation_preview || 'Konsultasi kesehatan'
      }));
    } catch (error) {
      console.error('Error getting user chats:', error);
      throw error;
    }
  },

  async deleteChatSession(chatId) {
    try {
      await pool.execute('DELETE FROM chat_sessions WHERE chat_id = ?', [chatId]);
    } catch (error) {
      throw error;
    }
  },

  async clearAllUserChats(userId) {
    try {
      await pool.execute('DELETE FROM chat_sessions WHERE user_id = ?', [userId]);
    } catch (error) {
      throw error;
    }
  },

  // Message functions
  async addMessage(chatId, role, content) {
    try {
      // Validate parameters
      if (!chatId || !role || !content) {
        throw new Error(`Invalid parameters: chatId=${chatId}, role=${role}, content=${content}`);
      }
      
      const [result] = await pool.execute(
        'INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)',
        [chatId, role, content]
      );
      return result.insertId;
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  },

  async getChatMessages(chatId) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM messages WHERE chat_id = ? ORDER BY timestamp ASC',
        [chatId]
      );
      return rows;
    } catch (error) {
      throw error;
    }
  },

  async getMessageCount(chatId) {
    try {
      const [rows] = await pool.execute(
        'SELECT COUNT(*) as count FROM messages WHERE chat_id = ?',
        [chatId]
      );
      return rows[0].count;
    } catch (error) {
      throw error;
    }
  },


};

export { pool, testConnection, db }; 