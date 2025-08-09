import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { GoogleGenAI } from '@google/genai';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { db, testConnection } from './database.js';
import { pool } from './database.js';
import { medicineService } from './medicine-service.js';
import FacilitiesService from './facilities-service.js';
import FacilitiesServiceOSM from './facilities-service-osm.js';
import FacilitiesServiceOSMFast from './facilities-service-osm-fast.js';
import FacilitiesServiceCache from './facilities-service-cache.js';


// Load environment variables
dotenv.config({ path: './config.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Middleware
// CORS configuration (support credentials and configurable origins)
const rawAllowedOrigins = process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN || '';
const allowedOrigins = rawAllowedOrigins
  .split(',')
  .map(origin => origin.trim())
  .filter(origin => origin.length > 0);

app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  credentials: true
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(join(__dirname, 'public')));

// Trust proxy for correct IPs/protocols behind Railway/Proxies
if (isProduction) {
  app.set('trust proxy', 1);
}

// Multer configuration for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
}).single('image');

// Error handling middleware for multer
const handleMulterUpload = (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size too large. Maximum 5MB allowed.' });
      }
      return res.status(400).json({ error: 'File upload error: ' + err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

// Initialize MySQL Database
try {
  const isConnected = await testConnection();
  if (!isConnected) {
    console.error('❌ Gagal terhubung ke database MySQL');
    process.exit(1);
  }
  console.log('✅ Database MySQL berhasil diinisialisasi');
} catch (error) {
  console.error('❌ Error inisialisasi database:', error);
  process.exit(1);
}

// Initialize Gemini AI
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1] || req.session?.token;
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.log('Token verification failed:', error.message);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Routes
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});



// User registration
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generate unique UID
    const uid = uuidv4();
    
    // Create user in MySQL
    const userId = await db.createUser(uid, name, email, hashedPassword);

    // Generate JWT token
    const token = jwt.sign(
      { uid, email, name, userId },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { uid, email, name, id: userId }
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: 'Registration failed' });
    }
  }
});

// User login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Get user by email from MySQL
    const userData = await db.getUserByEmail(email);
    
    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, userData.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { uid: userData.uid, email, name: userData.name, userId: userData.id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { uid: userData.uid, email, name: userData.name, id: userData.id }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify token
app.get('/api/auth/verify', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    res.json({ user });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Chat with AI (supports text and image)
app.post('/api/chat', authenticateToken, handleMulterUpload, async (req, res) => {
  try {
    const { message, chatId, isNewChat } = req.body;
    const userId = req.user.userId;
    const imageFile = req.file;
    
    console.log('Chat request received:', {
      hasMessage: !!message,
      hasImage: !!imageFile,
      imageInfo: imageFile ? {
        originalname: imageFile.originalname,
        mimetype: imageFile.mimetype,
        size: imageFile.size
      } : null
    });
    
    // Check if there's a message or image
    if (!message && !imageFile) {
      return res.status(400).json({ error: 'Message or image is required' });
    }

    // Create or get chat session
    let currentChatId = chatId;
    const sessionTitle = message ? message.substring(0, 50) + '...' : 'Image Analysis';
    if (isNewChat || !chatId) {
      currentChatId = `chat_${Date.now()}`;
      // Create new chat session
      await db.createChatSession(currentChatId, userId, sessionTitle);
    }

    // Get chat history from MySQL
    let chatHistory = [];
    if (!isNewChat && chatId) {
      const messages = await db.getChatMessages(chatId);
      chatHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      }));
    }

    // Prepare content for AI
    let userContent = message || '';
    let imageData = null;
    
    if (imageFile) {
      try {
        // Convert image to base64 for Gemini
        const base64Image = imageFile.buffer.toString('base64');
        const mimeType = imageFile.mimetype;
        imageData = {
          inlineData: {
            data: base64Image,
            mimeType: mimeType
          }
        };
        
        console.log('Image processed for AI:', {
          size: imageFile.size,
          mimeType: mimeType,
          base64Length: base64Image.length
        });
        
        // Add image description to user content if no text message
        if (!message) {
          userContent = 'Saya mengirimkan gambar untuk dianalisis. Mohon analisis gejala yang terlihat dalam gambar ini.';
        }
      } catch (error) {
        console.error('Error processing image:', error);
        return res.status(500).json({ error: 'Failed to process image' });
      }
    }

    // Prepare context for AI
    const context = `ANDA ADALAH KONSULTAN KESEHATAN AI UNTUK PASIEN.

INSTRUKSI UTAMA:
- Jangan langsung menanyakan semua gejala sekaligus.
- Tanyakan satu per satu, lanjutkan dialog, jangan langsung semua jawaban.
- Jika ini pesan pertama, tanyakan keluhan utama dulu.
- Jika sudah ada riwayat, lanjutkan dengan pertanyaan yang relevan.
- Jika informasi belum cukup, lanjutkan bertanya ke user, jangan langsung memberi saran.
- Jika sudah cukup informasi, baru berikan saran perawatan, peringatan, dan tindak lanjut.
- JANGAN PERNAH MENAMPILKAN DIAGNOSIS PENYAKIT.
- JANGAN BERIKAN SARAN PENGOBATAN ATAU OBAT BEBAS.
- Jika perlu, SARANKAN user untuk mencari fasilitas kesehatan terdekat, BUKAN obat.
- Jawaban harus sopan, mudah dipahami, dan ringkas.

ATURAN PENULISAN:
- Setiap section judul kapital dan emoji.
- Setiap bullet gunakan simbol • (bukan *, bukan -).
- Beri spasi 2 baris antar section.
- Beri spasi 1 baris antar bullet.
- Tidak ada markdown, tidak ada bold, tidak ada simbol (*).
- Format harus rapi, mudah dibaca, dan tidak satu paragraf panjang.
- Jika sudah cukup, baru berikan saran perawatan, peringatan, tindak lanjut, dan jika perlu SARANKAN user mencari fasilitas kesehatan terdekat.
- Jika ada gambar, analisis gejala yang terlihat dalam gambar

FORMAT JAWABAN WAJIB:

🏥 SARAN PERAWATAN:

- [tulis satu saran saja di sini]

- [tulis satu saran saja di sini]

- [tulis satu saran saja di sini]


⚠️ PERINGATAN:

- [tulis satu peringatan saja di sini]

- [tulis satu peringatan saja di sini]

- [tulis satu peringatan saja di sini]


📋 SARAN TINDAK LANJUT:

- [tulis satu saran saja di sini]

- [tulis satu saran saja di sini]

- [tulis satu saran saja di sini]
.

RIWAYAT PERCAPAKAN SEBELUMNYA:
${chatHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

PESAN PASIEN SAAT INI: ${userContent}`;

    // Prepare content for Gemini
    const contents = [{
      role: 'user',
      parts: [
        { text: context }
      ]
    }];

    // Add image if present
    if (imageData) {
      contents[0].parts.push(imageData);
    }
    
    // Add additional instruction to ensure no medication recommendations
    contents[0].parts[0].text = context + '\n\nPENTING: Jangan berikan saran pengobatan atau rekomendasi obat. Jika perlu, sarankan user mencari fasilitas kesehatan terdekat, bukan obat. Fokus hanya pada saran perawatan, peringatan, dan saran tindak lanjut. Jangan gunakan simbol (*) untuk bullet points, gunakan simbol •. Berikan spasi yang cukup antara setiap section dan bullet point. Format harus rapi dan mudah dibaca. Berikan spasi 1 baris kosong setelah setiap bullet point. Jangan gunakan bold atau formatting markdown. Gunakan format yang bersih dan mudah dibaca.';

    // Generate AI response
    let aiResponse;
    try {
      const model = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contents
      });
      aiResponse = model.text;
      
      // Debug: Check AI response
      console.log('AI Response received:', aiResponse ? 'Success' : 'Empty');
      if (!aiResponse) {
        console.error('AI response is empty or undefined');
        return res.status(500).json({ error: 'AI response failed' });
      }
      
      // Format the response to ensure proper spacing and formatting
      aiResponse = aiResponse
        .replace(/\*\*/g, '') // Remove markdown bold
        .replace(/\*/g, '') // Remove markdown asterisks
        .replace(/^\s*[-*]\s*/gm, '• ') // Replace markdown bullets with proper bullets
        .replace(/\n{3,}/g, '\n\n') // Ensure proper paragraph spacing
        .replace(/(🏥 SARAN PERAWATAN:|⚠️ PERINGATAN:|📋 SARAN TINDAK LANJUT:)/g, '\n\n$1') // Add spacing before sections
        .replace(/💊 SARAN PENGOBATAN:.*?(?=🏥|⚠️|📋|$)/gs, '') // Remove any medication recommendations
        .replace(/SARAN PENGOBATAN:.*?(?=SARAN PERAWATAN:|PERINGATAN:|SARAN TINDAK LANJUT:|$)/gs, '') // Remove medication sections
        .replace(/Obat Bebas.*?(?=🏥|⚠️|📋|$)/gs, '') // Remove any medication sections
        .replace(/Rekomendasi Obat.*?(?=🏥|⚠️|📋|$)/gs, '') // Remove any medication recommendations
        .replace(/Ibuprofen.*?(?=🏥|⚠️|📋|$)/gs, '') // Remove any medication mentions
        .replace(/Paracetamol.*?(?=🏥|⚠️|📋|$)/gs, '') // Remove any medication mentions
        // Pisahkan paragraf pembuka dari section dengan 2 baris
        .replace(/([^\n])\n(\s*🏥 SARAN PERAWATAN:)/g, '$1\n\n$2')
        .replace(/([^\n])\n(\s*⚠️ PERINGATAN:)/g, '$1\n\n$2')
        .replace(/([^\n])\n(\s*📋 SARAN TINDAK LANJUT:)/g, '$1\n\n$2')
        // Pastikan judul section selalu di awal baris dan bullet di bawahnya
        .replace(/(🏥 SARAN PERAWATAN:)[ \t]*•/g, '$1\n•')
        .replace(/(⚠️ PERINGATAN:)[ \t]*•/g, '$1\n•')
        .replace(/(📋 SARAN TINDAK LANJUT:)[ \t]*•/g, '$1\n•')
        // Tambah spasi 1 baris setelah setiap bullet
        .replace(/(• [^\n]+)\n(?!\n|• )/g, '$1\n\n')
        // Tambah spasi 2 baris antar section
        .replace(/(🏥 SARAN PERAWATAN:|⚠️ PERINGATAN:|📋 SARAN TINDAK LANJUT:)/g, '\n\n$1\n')
        // Bersihkan spasi berlebih
        .replace(/\n{4,}/g, '\n\n')
        .replace(/\n{2,}$/g, '\n')
        .trim();
      
    } catch (error) {
      console.error('Error calling Gemini AI:', error);
      
      // Check if it's an API activation error
      if (error.status === 403 && error.message && error.message.includes('SERVICE_DISABLED')) {
        return res.status(500).json({ 
          error: 'Gemini AI API belum diaktifkan. Silakan aktifkan Generative Language API di Google Cloud Console.' 
        });
      }
      
      // Check if it's an API key error
      if (error.status === 400 && error.message && error.message.includes('API key not valid')) {
        return res.status(500).json({ 
          error: 'API key Gemini tidak valid. Silakan periksa konfigurasi API key.' 
        });
      }
      
      return res.status(500).json({ error: 'AI service error: ' + error.message });
    }

    // Validate parameters before saving
    if (!currentChatId || !userContent || !aiResponse) {
      console.error('Invalid parameters:', { currentChatId, userContent, aiResponse });
      return res.status(500).json({ error: 'Invalid chat parameters' });
    }

    // Save messages to MySQL
    await db.addMessage(currentChatId, 'user', userContent);
    await db.addMessage(currentChatId, 'assistant', aiResponse);

    // Update chat session title if it's a new chat
    if (isNewChat || !chatId) {
      await db.updateChatSession(currentChatId, sessionTitle);
    }

    // Get updated messages
    const updatedMessages = await db.getChatMessages(currentChatId);
    const formattedMessages = updatedMessages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp
    }));

    res.json({
      chatId: currentChatId,
      response: aiResponse,
      messages: formattedMessages
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat' });
  }
});

// Get chat history
app.get('/api/chats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const chatSessions = await db.getUserChatSessions(userId);
    
    // Format chat sessions for frontend
    const chatList = chatSessions.map(session => ({
      id: session.chat_id,
      title: session.title || 'Konsultasi Baru',
      lastUpdated: session.last_updated,
      messageCount: session.message_count || 0,
      created_at: session.created_at,
      first_message: session.first_message || 'Konsultasi kesehatan'
    }));

    console.log(`Returning ${chatList.length} chat sessions for user ${userId}`);
    res.json(chatList);
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ error: 'Failed to get chat history' });
  }
});

// Clear all chat history for user (must be before /api/chats/:chatId)
app.delete('/api/chats/clear-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Delete all chat sessions for the user (messages will be deleted automatically due to CASCADE)
    await db.clearAllUserChats(userId);
    
    res.json({ message: 'All chats deleted successfully' });
  } catch (error) {
    console.error('Clear all chats error:', error);
    res.status(500).json({ error: 'Failed to clear all chats' });
  }
});

// Get specific chat
app.get('/api/chats/:chatId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { chatId } = req.params;
    
    // Get chat session
    const chatSession = await db.getChatSession(chatId);
    if (!chatSession || chatSession.user_id !== userId) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Get messages for this chat
    const messages = await db.getChatMessages(chatId);
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp
    }));

    res.json({
      chatId: chatSession.chat_id,
      title: chatSession.title,
      messages: formattedMessages,
      createdAt: chatSession.created_at,
      lastUpdated: chatSession.last_updated
    });
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ error: 'Failed to get chat' });
  }
});

// Delete chat
app.delete('/api/chats/:chatId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { chatId } = req.params;
    
    // Verify chat belongs to user
    const chatSession = await db.getChatSession(chatId);
    if (!chatSession || chatSession.user_id !== userId) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    // Delete chat session (messages will be deleted automatically due to CASCADE)
    await db.deleteChatSession(chatId);
    
    res.json({ message: 'Chat deleted successfully' });
  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({ error: 'Failed to delete chat' });
  }
});

// Medicine Search API
app.get('/api/medicines/search', async (req, res) => {
  try {
    const { q, type, category } = req.query;
    
    // Allow empty query for filtering by type/category only
    const query = q ? q.trim() : '';
    
    const medicines = await medicineService.searchMedicines(query, type, category);
    
    res.json(medicines);
  } catch (error) {
    console.error('Medicine search error:', error);
    res.status(500).json({ error: 'Failed to search medicines' });
  }
});

// Get medicine by ID
app.get('/api/medicines/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const medicine = await medicineService.getMedicineById(id);
    
    if (!medicine) {
      return res.status(404).json({ error: 'Medicine not found' });
    }
    
    res.json(medicine);
  } catch (error) {
    console.error('Get medicine error:', error);
    res.status(500).json({ error: 'Failed to get medicine' });
  }
});

// Get medicines by type
app.get('/api/medicines/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    
    const medicines = await medicineService.getMedicinesByType(type);
    
    res.json(medicines);
  } catch (error) {
    console.error('Get medicines by type error:', error);
    res.status(500).json({ error: 'Failed to get medicines by type' });
  }
});

// Get medicine categories
app.get('/api/medicines/categories', async (req, res) => {
  console.log('GET /api/medicines/categories - Request received');
  try {
    const categories = await medicineService.getMedicineCategories();
    console.log(`Returning ${categories.length} medicine categories`);
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    // Return default categories if service fails
    const defaultCategories = [
      { id: 1, name: 'Analgesik' },
      { id: 2, name: 'Antihistamin' },
      { id: 3, name: 'Obat Batuk & Pilek' },
      { id: 4, name: 'Vitamin & Suplemen' },
      { id: 5, name: 'Obat Lambung' },
      { id: 6, name: 'Obat Pencernaan' },
      { id: 7, name: 'Obat Umum' }
    ];
    console.log('Returning default categories due to service error');
    res.json(defaultCategories);
  }
});

// Get medicines by category
app.get('/api/medicines/category/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    const medicines = await medicineService.getMedicinesByCategory(categoryId);
    
    res.json(medicines);
  } catch (error) {
    console.error('Get medicines by category error:', error);
    res.status(500).json({ error: 'Failed to get medicines by category' });
  }
});

// Get popular keywords
app.get('/api/medicines/keywords/popular', async (req, res) => {
  try {
    const keywords = await medicineService.getPopularKeywords();
    res.json(keywords);
  } catch (error) {
    console.error('Get popular keywords error:', error);
    res.status(500).json({ error: 'Failed to get popular keywords' });
  }
});

// Initialize Facilities Service
const facilitiesService = new FacilitiesService();
const facilitiesServiceOSM = new FacilitiesServiceOSM();
const facilitiesServiceOSMFast = new FacilitiesServiceOSMFast();
const facilitiesServiceCache = new FacilitiesServiceCache();

// Initialize Content Moderation Service


// Healthcare Facilities Search API (Google Places)
app.get('/api/facilities/search', async (req, res) => {
  try {
    const { address, lat, lng, type, distance } = req.query;
    
    console.log('Facilities search request (Google):', {
      address,
      lat,
      lng,
      type,
      distance,
      query: req.query
    });
    
    // Validate required parameters
    if (!address && (!lat || !lng)) {
      return res.status(400).json({ 
        error: 'Alamat atau koordinat (lat, lng) harus disediakan' 
      });
    }

    const maxDistance = parseInt(distance) || 10;
    const typeFilter = type || null;
    
    const result = await facilitiesService.searchFacilities(
      address, 
      lat ? parseFloat(lat) : null, 
      lng ? parseFloat(lng) : null, 
      typeFilter, 
      maxDistance
    );
    
    // Check if there was an error in the result
    if (result.error) {
      return res.status(400).json({ 
        error: result.error 
      });
    }
    
    // Tambahkan koordinat user ke response untuk frontend
    const responseWithUserLocation = {
      ...result,
      userLocation: {
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        address: address
      }
    };
    
    res.json(responseWithUserLocation);
  } catch (error) {
    console.error('Facilities search error:', error);
    res.status(500).json({ 
      error: error.message || 'Gagal mencari fasilitas kesehatan' 
    });
  }
});

// Healthcare Facilities Search API (OpenStreetMap - Free Alternative)
app.get('/api/facilities/search-osm', async (req, res) => {
  try {
    const { address, lat, lng, type, distance } = req.query;
    
    console.log('Facilities search request (OSM):', {
      address,
      lat,
      lng,
      type,
      distance,
      query: req.query
    });
    
    // Validate required parameters
    if (!address && (!lat || !lng)) {
      return res.status(400).json({ 
        error: 'Alamat atau koordinat (lat, lng) harus disediakan' 
      });
    }

    const maxDistance = parseInt(distance) || 10;
    const typeFilter = type || null;
    
    const result = await facilitiesServiceOSM.searchFacilities(
      address, 
      lat ? parseFloat(lat) : null, 
      lng ? parseFloat(lng) : null, 
      typeFilter, 
      maxDistance
    );
    
    // Log koordinat yang didapat dari geocoding
    if (result.user_location) {
      console.log('Geocoding result (OSM):', {
        original_address: address,
        coordinates: {
          lat: result.user_location.lat,
          lng: result.user_location.lng,
          formatted_address: result.user_location.formatted_address
        },
        facilities_found: result.total_found
      });
    }
    
    // Check if there was an error in the result
    if (result.error) {
      return res.status(400).json({ 
        error: result.error 
      });
    }
    
    // Tambahkan koordinat user ke response untuk frontend
    const responseWithUserLocation = {
      ...result,
      userLocation: {
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        address: address
      }
    };
    
    res.json(responseWithUserLocation);
  } catch (error) {
    console.error('Facilities search OSM error:', error);
    res.status(500).json({ 
      error: error.message || 'Gagal mencari fasilitas kesehatan' 
    });
  }
});

// Healthcare Facilities Search API (OpenStreetMap - Fast Version)
app.get('/api/facilities/search-osm-fast', async (req, res) => {
  try {
    const { address, lat, lng, type, distance } = req.query;
    
    console.log('Facilities search request (OSM Fast):', {
      address,
      lat,
      lng,
      type,
      distance,
      query: req.query
    });
    
    // Validate required parameters
    if (!address && (!lat || !lng)) {
      return res.status(400).json({ 
        error: 'Alamat atau koordinat (lat, lng) harus disediakan' 
      });
    }

    const maxDistance = parseInt(distance) || 10;
    const typeFilter = type || null;
    
    const result = await facilitiesServiceOSMFast.searchFacilities(
      address, 
      lat ? parseFloat(lat) : null, 
      lng ? parseFloat(lng) : null, 
      typeFilter, 
      maxDistance
    );
    
    // Log koordinat yang didapat dari geocoding
    if (result.user_location) {
      console.log('Geocoding result (OSM Fast):', {
        original_address: address,
        coordinates: {
          lat: result.user_location.lat,
          lng: result.user_location.lng,
          formatted_address: result.user_location.formatted_address
        },
        facilities_found: result.total_found
      });
    }
    
    // Check if there was an error in the result
    if (result.error) {
      return res.status(400).json({ 
        error: result.error 
      });
    }
    
    // Tambahkan koordinat user ke response untuk frontend
    const responseWithUserLocation = {
      ...result,
      userLocation: {
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        address: address
      }
    };
    
    res.json(responseWithUserLocation);
  } catch (error) {
    console.error('Facilities search OSM Fast error:', error);
    res.status(500).json({ 
      error: error.message || 'Gagal mencari fasilitas kesehatan' 
    });
  }
});

// Healthcare Facilities Search API (OpenStreetMap - Cache Version - SUPER FAST)
app.get('/api/facilities/search-osm-cache', async (req, res) => {
  try {
    const { address, lat, lng, type, distance } = req.query;
    
    console.log('Facilities search request (OSM Cache):', {
      address,
      lat,
      lng,
      type,
      distance,
      query: req.query
    });
    
    // Validate required parameters
    if (!address && (!lat || !lng)) {
      return res.status(400).json({ 
        error: 'Alamat atau koordinat (lat, lng) harus disediakan' 
      });
    }

    const maxDistance = parseInt(distance) || 10;
    const typeFilter = type || null;
    
    const result = await facilitiesServiceCache.searchFacilities(
      address, 
      lat ? parseFloat(lat) : null, 
      lng ? parseFloat(lng) : null, 
      typeFilter, 
      maxDistance
    );
    
    // Log koordinat yang didapat dari geocoding
    if (result.user_location) {
      console.log('Geocoding result (OSM Cache):', {
        original_address: address,
        coordinates: {
          lat: result.user_location.lat,
          lng: result.user_location.lng,
          formatted_address: result.user_location.formatted_address
        },
        facilities_found: result.total_found
      });
    }
    
    // Check if there was an error in the result
    if (result.error) {
      return res.status(400).json({ 
        error: result.error 
      });
    }
    
    // Tambahkan koordinat user ke response untuk frontend
    const responseWithUserLocation = {
      ...result,
      userLocation: {
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        address: address
      }
    };
    
    res.json(responseWithUserLocation);
  } catch (error) {
    console.error('Facilities search OSM Cache error:', error);
    res.status(500).json({ 
      error: error.message || 'Gagal mencari fasilitas kesehatan' 
    });
  }
});

// Get facility details
app.get('/api/facilities/:placeId', async (req, res) => {
  try {
    const { placeId } = req.params;
    
    const details = await facilitiesService.getFacilityDetails(placeId);
    
    res.json(details);
  } catch (error) {
    console.error('Get facility details error:', error);
    res.status(500).json({ 
      error: error.message || 'Gagal mendapatkan detail fasilitas' 
    });
  }
});

// Get user profile
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user data
    const userData = await db.getUserById(userId);
    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get chat statistics
    const totalChats = await db.getUserChatCount(userId);
    
    res.json({
      id: userData.id,
      name: userData.name,
      email: userData.email,
      created_at: userData.created_at,
      total_chats: totalChats
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});



// Google Custom Search API for health news
app.get('/api/news/health', async (req, res) => {
  try {
    const { q = 'berita kesehatan terbaru', start = 1 } = req.query;
    
    const GOOGLE_CUSTOM_SEARCH_API_KEY = 'AIzaSyAgjIgpcnvbSAOwv30zX7dd0B9QFU4qSaQ';
    const GOOGLE_CUSTOM_SEARCH_CX = 'b59ebcfdfbfbd4dbe';
    
    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_CUSTOM_SEARCH_API_KEY}&cx=${GOOGLE_CUSTOM_SEARCH_CX}&q=${encodeURIComponent(q)}&start=${start}&num=10&dateRestrict=m1&sort=date`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Google API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Google API error: ${data.error.message}`);
    }
    
    // Transform the data to match our needs
    const news = data.items ? data.items.map(item => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      image: item.pagemap?.cse_image?.[0]?.src || null,
      date: item.pagemap?.metatags?.[0]?.['article:published_time'] || 
            item.pagemap?.metatags?.[0]?.['og:updated_time'] || 
            new Date().toISOString()
    })) : [];
    
    res.json({
      news,
      totalResults: data.searchInformation?.totalResults || 0,
      nextPage: data.queries?.nextPage?.[0]?.startIndex || null
    });
    
  } catch (error) {
    console.error('Health news API error:', error);
    res.status(500).json({ 
      error: 'Gagal mengambil berita kesehatan',
      details: error.message 
    });
  }
});



// Start server
app.listen(PORT, () => {
  console.log(`Server HidupKu berjalan di port ${PORT}`);
  console.log(`Buka http://localhost:${PORT} di browser Anda`);
}); 