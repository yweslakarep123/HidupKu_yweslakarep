import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { Sequelize, DataTypes } from 'sequelize';

// Load environment variables
dotenv.config({ path: './config.env' });

// Build database configuration (supporting Railway and URL-based env)
function buildDbConfig() {
  const url =
    process.env.BISMILLAH ||
    process.env.bismillah ||
    process.env.DATABASE_URL ||
    process.env.MYSQL_URL ||
    process.env.MYSQL_PUBLIC_URL ||
    process.env.CLEARDB_DATABASE_URL ||
    process.env.JAWSDB_URL ||
    '';
  if (url) {
    try {
      const parsed = new URL(url);
      return {
        host: parsed.hostname,
        user: parsed.username,
        password: parsed.password,
        database: parsed.pathname?.replace(/^\//, '') || undefined,
        port: Number(parsed.port || 3306),
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true
      };
    } catch (_) {
      // fall through to env-based config
    }
  }

  return {
    host: process.env.MYSQL_HOST || process.env.MYSQLHOST || process.env.DB_HOST || '127.0.0.1',
    user: process.env.MYSQL_USER || process.env.MYSQLUSER || process.env.DB_USER || 'root',
    password: process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE || process.env.DB_NAME || 'hidupku_db',
    port: Number(process.env.MYSQL_PORT || process.env.MYSQLPORT || process.env.DB_PORT || 3306),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true
  };
}

const dbConfig = buildDbConfig();
// Optional debug for database connection target (no secrets printed)
if (process.env.DEBUG_DB === '1') {
  try {
    console.log('[DB DEBUG] Connecting to MySQL', {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user ? `${'*'.repeat(Math.max(0, dbConfig.user.length - 2))}${dbConfig.user.slice(-2)}` : undefined
    });
  } catch (_) {
    // ignore
  }
}

// Initialize Sequelize using resolved config
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.user,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: 'mysql',
    logging: false,
    define: {
      underscored: true
    }
  }
);

// Define models matching server.js expectations
const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  uid: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  name: { type: DataTypes.STRING(255), allowNull: false },
  email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  password: { type: DataTypes.STRING(255), allowNull: false }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

const ChatSession = sequelize.define('ChatSession', {
  chat_id: { type: DataTypes.STRING(255), primaryKey: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING(255) }
}, {
  tableName: 'chat_sessions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'last_updated'
});

const Message = sequelize.define('Message', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  chat_id: { type: DataTypes.STRING(255), allowNull: false },
  role: { type: DataTypes.ENUM('user', 'assistant'), allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  timestamp: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
}, {
  tableName: 'messages',
  timestamps: false
});

// Associations
User.hasMany(ChatSession, { foreignKey: 'user_id' });
ChatSession.belongsTo(User, { foreignKey: 'user_id' });
ChatSession.hasMany(Message, { foreignKey: 'chat_id', sourceKey: 'chat_id' });
Message.belongsTo(ChatSession, { foreignKey: 'chat_id', targetKey: 'chat_id' });

// Test database connection and sync schema if missing
async function testConnection() {
  try {
    await sequelize.authenticate();
    // Auto sync tables if they don't exist
    await sequelize.sync();
    console.log('✅ Database MySQL (Sequelize) berhasil terhubung dan sinkron');
    return true;
  } catch (error) {
    console.error('❌ Error koneksi database (Sequelize):', error.message);
    return false;
  }
}

// Database helper functions
const db = {
  // User functions
  async createUser(uid, name, email, hashedPassword) {
    const user = await User.create({ uid, name, email, password: hashedPassword });
    return user.id;
  },

  async getUserByEmail(email) {
    return await User.findOne({ where: { email } });
  },

  async getUserById(id) {
    return await User.findByPk(id);
  },

  async getUserByUid(uid) {
    return await User.findOne({ where: { uid } });
  },

  // Chat session functions
  async createChatSession(chatId, userId, title = 'Chat baru') {
    await ChatSession.create({ chat_id: chatId, user_id: userId, title });
    return chatId;
  },

  async getChatSession(chatId) {
    return await ChatSession.findOne({ where: { chat_id: chatId } });
  },

  async updateChatSession(chatId, title) {
    await ChatSession.update({ title }, { where: { chat_id: chatId } });
  },

  async getUserChatSessions(userId) {
    const [rows] = await sequelize.query(
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
      { replacements: [userId] }
    );
    return rows.map(row => ({
      chat_id: row.chat_id,
      title: row.title || 'Konsultasi Baru',
      created_at: row.created_at,
      last_updated: row.last_updated,
      message_count: row.message_count || 0,
      first_message: row.conversation_preview || 'Konsultasi kesehatan'
    }));
  },

  async getUserChatCount(userId) {
    const count = await ChatSession.count({ where: { user_id: userId } });
    return count;
  },

  async getUserChats(userId) {
    const [rows] = await sequelize.query(
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
      { replacements: [userId] }
    );
    return rows.map(row => ({
      chat_id: row.chat_id,
      title: row.title || 'Konsultasi Baru',
      created_at: row.created_at,
      last_updated: row.last_updated,
      message_count: row.message_count || 0,
      first_message: row.conversation_preview || 'Konsultasi kesehatan'
    }));
  },

  async deleteChatSession(chatId) {
    await ChatSession.destroy({ where: { chat_id: chatId } });
  },

  async clearAllUserChats(userId) {
    await ChatSession.destroy({ where: { user_id: userId } });
  },

  // Message functions
  async addMessage(chatId, role, content) {
    if (!chatId || !role || !content) {
      throw new Error(`Invalid parameters: chatId=${chatId}, role=${role}, content=${content}`);
    }
    const msg = await Message.create({ chat_id: chatId, role, content });
    return msg.id;
  },

  async getChatMessages(chatId) {
    const rows = await Message.findAll({ where: { chat_id: chatId }, order: [['timestamp', 'ASC']] });
    return rows.map(r => r.get({ plain: true }));
  },

  async getMessageCount(chatId) {
    const count = await Message.count({ where: { chat_id: chatId } });
    return count;
  },


};

// Export a dummy pool for backward-compat imports (not used anymore)
const pool = null;

export { pool, testConnection, db };