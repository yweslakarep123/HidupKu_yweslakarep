import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

// Load environment variables
dotenv.config({ path: './config.env' });

// Database configuration
const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'hidupku_db',
  port: process.env.MYSQL_PORT || 3306
};

// Initialize Gemini AI
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

// NLP helper functions
function tokenizeText(text) {
  if (!text) return [];
  
  // Convert to lowercase and remove special characters
  const cleaned = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Split into words and filter out common stop words
  const stopWords = new Set([
    'dan', 'atau', 'dengan', 'untuk', 'dari', 'ke', 'di', 'pada', 'yang', 'ini', 'itu',
    'adalah', 'akan', 'sudah', 'belum', 'tidak', 'bukan', 'saya', 'anda', 'kami',
    'mereka', 'seperti', 'sebagai', 'oleh', 'karena', 'jika', 'ketika', 'setelah',
    'sebelum', 'sambil', 'serta', 'atau', 'namun', 'tetapi', 'melainkan'
  ]);
  
  return cleaned.split(' ')
    .filter(word => word.length > 2 && !stopWords.has(word));
}

function calculateRelevanceScore(queryTokens, title, description) {
  const titleTokens = tokenizeText(title);
  const descTokens = tokenizeText(description);
  
  let score = 0;
  
  // Check exact matches in title (higher weight)
  queryTokens.forEach(token => {
    if (titleTokens.includes(token)) {
      score += 3;
    }
  });
  
  // Check exact matches in description
  queryTokens.forEach(token => {
    if (descTokens.includes(token)) {
      score += 1;
    }
  });
  
  // Check partial matches
  queryTokens.forEach(queryToken => {
    titleTokens.forEach(titleToken => {
      if (titleToken.includes(queryToken) || queryToken.includes(titleToken)) {
        score += 0.5;
      }
    });
    
    descTokens.forEach(descToken => {
      if (descToken.includes(queryToken) || queryToken.includes(descToken)) {
        score += 0.3;
      }
    });
  });
  
  return score;
}

// Function to determine medicine type from title or description
function determineMedicineType(title, description) {
  const text = (title + ' ' + description).toLowerCase();
  
  if (text.includes('bebas terbatas') || text.includes('bebas_terbatas')) {
    return 'bebas_terbatas';
  } else if (text.includes('keras') || text.includes('resep') || text.includes('antibiotik')) {
    return 'keras';
  } else {
    return 'bebas'; // default
  }
}

// Function to extract category from description
function extractCategory(description) {
  const desc = description.toLowerCase();
  
  if (desc.includes('demam') || desc.includes('nyeri') || desc.includes('sakit kepala')) {
    return 'Analgesik';
  } else if (desc.includes('alergi') || desc.includes('gatal') || desc.includes('bersin')) {
    return 'Antihistamin';
  } else if (desc.includes('batuk') || desc.includes('pilek')) {
    return 'Obat Batuk & Pilek';
  } else if (desc.includes('vitamin') || desc.includes('suplemen')) {
    return 'Vitamin & Suplemen';
  } else if (desc.includes('lambung') || desc.includes('maag') || desc.includes('asam')) {
    return 'Obat Lambung';
  } else if (desc.includes('diare') || desc.includes('sembelit')) {
    return 'Obat Pencernaan';
  } else {
    return 'Obat Umum';
  }
}

export const medicineService = {
  // Enhanced search medicines using Gemini AI and advanced NLP
  async searchMedicines(query, type = '', category = '') {
    let connection;
    
    try {
      connection = await mysql.createConnection(dbConfig);
      
      // Tokenize the query
      const queryTokens = tokenizeText(query);
      
      if (queryTokens.length === 0 && !type && !category) {
        return [];
      }
      
      // Build the base query with improved search
      let sql = 'SELECT title, description FROM obat_bebas_dan_bebas_terbatas___products WHERE 1=1';
      const params = [];
      
      // Enhanced search conditions if query provided
      if (queryTokens.length > 0) {
        // Use more sophisticated search patterns
        const searchConditions = [];
        
        // Exact phrase match (highest priority)
        searchConditions.push(`(title LIKE ? OR description LIKE ?)`);
        params.push(`%${query}%`, `%${query}%`);
        
        // Individual token matches
        queryTokens.forEach(token => {
          if (token.length > 2) {
            searchConditions.push(`(title LIKE ? OR description LIKE ?)`);
            params.push(`%${token}%`, `%${token}%`);
          }
        });
        
        // Synonym and related terms (using Gemini AI)
        try {
          const synonyms = await this.getQuerySynonyms(query);
          console.log(`Generated synonyms for "${query}":`, synonyms);
          if (synonyms.length > 0) {
            console.log(`Query expansion: "${query}" → [${synonyms.join(', ')}]`);
          }
          synonyms.forEach(synonym => {
            if (synonym.length > 2) {
              searchConditions.push(`(title LIKE ? OR description LIKE ?)`);
              params.push(`%${synonym}%`, `%${synonym}%`);
            }
          });
        } catch (error) {
          console.log('Synonym generation failed, continuing with basic search');
        }
        
        sql += ` AND (${searchConditions.join(' OR ')})`;
      }
      
      // Execute query
      const [rows] = await connection.execute(sql, params);
      
      // Enhanced processing with Gemini AI
      console.log(`Processing ${rows.length} medicines with AI...`);
      const results = await Promise.all(rows.map(async (row, index) => {
        const relevanceScore = await this.calculateEnhancedRelevanceScore(query, row.title, row.description);
        const medicineType = determineMedicineType(row.title, row.description);
        const categoryName = extractCategory(row.description);
        
        if (index < 3) { // Log first 3 for debugging
          console.log(`Medicine ${index + 1}: "${row.title}" - Score: ${relevanceScore}, Type: ${medicineType}, Category: ${categoryName}`);
        }
        
        return {
          id: row.title,
          name: row.title,
          description: row.description,
          type: medicineType,
          category_name: categoryName,
          relevance_score: relevanceScore
        };
      }));
      
      // Filter by type if specified
      let filteredResults = results;
      if (type) {
        filteredResults = filteredResults.filter(medicine => medicine.type === type);
      }
      
      // Filter by category if specified
      if (category) {
        filteredResults = filteredResults.filter(medicine => 
          medicine.category_name.toLowerCase().includes(category.toLowerCase())
        );
      }
      
      // Sort by relevance score (highest first)
      filteredResults.sort((a, b) => b.relevance_score - a.relevance_score);
      
      // Limit to 10 results for better UI performance
      const finalResults = filteredResults.slice(0, 10);
      
      console.log(`Final results: ${finalResults.length} medicines`);
      console.log(`Top 3 relevance scores: ${finalResults.slice(0, 3).map(m => m.relevance_score).join(', ')}`);
      console.log(`Query: "${query}" → Found ${finalResults.length} relevant medicines`);
      console.log(`Search completed successfully with AI enhancement`);
      console.log(`=== Medicine Search Summary ===`);
      console.log(`Query: "${query}"`);
      console.log(`Results: ${finalResults.length} medicines`);
      console.log(`Top scores: ${finalResults.slice(0, 3).map(m => `${m.name}: ${m.relevance_score}%`).join(', ')}`);
      console.log(`AI Enhancement: Query Expansion + NLP + Gemini AI + Smart Ranking + Advanced Medicine Search`);
      console.log(`==============================`);
      
      return finalResults;
      
    } catch (error) {
      console.error('Error searching medicines:', error);
      throw error;
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  },

  // Enhanced relevance scoring using Gemini AI
  async calculateEnhancedRelevanceScore(query, title, description) {
    try {
      const prompt = `
        Analisis relevansi antara query pencarian dan informasi obat.
        
        Query: "${query}"
        Nama Obat: "${title}"
        Deskripsi: "${description}"
        
        Berikan skor relevansi dari 0-100 berdasarkan:
        1. Kecocokan langsung nama obat dengan query (bobot 40%)
        2. Kecocokan gejala/indikasi dengan query (bobot 35%)
        3. Kecocokan kategori obat dengan query (bobot 25%)
        
        Pertimbangkan sinonim, istilah medis, dan bahasa sehari-hari.
        Jawab hanya dengan angka skor (0-100).
      `;
      
      const model = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });
      
      const response = model.text.trim();
      const score = parseFloat(response) || 0;
      
      // Fallback to basic scoring if AI fails
      if (isNaN(score) || score < 0 || score > 100) {
        return calculateRelevanceScore(tokenizeText(query), title, description);
      }
      
      return Math.min(100, Math.max(0, score)); // Ensure score is between 0-100
      
    } catch (error) {
      console.log('AI scoring failed, using basic scoring');
      return calculateRelevanceScore(tokenizeText(query), title, description);
    }
  },

  // Generate query synonyms using Gemini AI
  async getQuerySynonyms(query) {
    try {
      const prompt = `
        Berikan 5 sinonim atau istilah terkait untuk query pencarian obat berikut.
        Fokus pada istilah medis, gejala, dan bahasa sehari-hari.
        
        Query: "${query}"
        
        Berikan hanya daftar kata-kata, pisahkan dengan koma.
        Contoh: demam, panas, fever, suhu tinggi, badan panas
        
        Jika query adalah gejala, berikan sinonim gejala tersebut.
        Jika query adalah nama obat, berikan nama generik atau merek lain.
      `;
      
      const model = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });
      
      const response = model.text.trim();
      const synonyms = response.split(',').map(s => s.trim().toLowerCase()).filter(s => s.length > 0);
      
      return synonyms.slice(0, 5); // Limit to 5 synonyms
      
    } catch (error) {
      console.log('Synonym generation failed');
      return [];
    }
  },

  // Get medicine by ID (using title as ID)
  async getMedicineById(id) {
    let connection;
    
    try {
      connection = await mysql.createConnection(dbConfig);
      
      const [rows] = await connection.execute(
        'SELECT title, description FROM obat_bebas_dan_bebas_terbatas___products WHERE title = ?',
        [id]
      );
      
      if (rows.length === 0) {
        return null;
      }
      
      const row = rows[0];
      const medicineType = determineMedicineType(row.title, row.description);
      const categoryName = extractCategory(row.description);
      
      return {
        id: row.title,
        name: row.title,
        description: row.description,
        type: medicineType,
        category_name: categoryName
      };
      
    } catch (error) {
      console.error('Error getting medicine by ID:', error);
      throw error;
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  },

  // Get medicines by type
  async getMedicinesByType(type) {
    let connection;
    
    try {
      connection = await mysql.createConnection(dbConfig);
      
      const [rows] = await connection.execute(
        'SELECT title, description FROM obat_bebas_dan_bebas_terbatas___products'
      );
      
      const results = rows
        .map(row => {
          const medicineType = determineMedicineType(row.title, row.description);
          const categoryName = extractCategory(row.description);
          
          return {
            id: row.title,
            name: row.title,
            description: row.description,
            type: medicineType,
            category_name: categoryName
          };
        })
        .filter(medicine => medicine.type === type);
      
      return results;
      
    } catch (error) {
      console.error('Error getting medicines by type:', error);
      throw error;
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  },

  // Get medicine categories (extracted from descriptions)
  async getMedicineCategories() {
    let connection;
    
    try {
      connection = await mysql.createConnection(dbConfig);
      
      // Test connection first
      await connection.ping();
      console.log('Database connection successful for categories');
      
      const [rows] = await connection.execute(
        'SELECT DISTINCT description FROM obat_bebas_dan_bebas_terbatas___products LIMIT 100'
      );
      
      const categories = new Set();
      rows.forEach(row => {
        const category = extractCategory(row.description);
        categories.add(category);
      });
      
      const result = Array.from(categories).map((name, index) => ({
        id: index + 1,
        name: name
      }));
      
      console.log(`Found ${result.length} medicine categories from database`);
      return result;
      
    } catch (error) {
      console.error('Error getting medicine categories from database:', error);
      // Return default categories if database is not available
      const defaultCategories = [
        { id: 1, name: 'Analgesik' },
        { id: 2, name: 'Antihistamin' },
        { id: 3, name: 'Obat Batuk & Pilek' },
        { id: 4, name: 'Vitamin & Suplemen' },
        { id: 5, name: 'Obat Lambung' },
        { id: 6, name: 'Obat Pencernaan' },
        { id: 7, name: 'Obat Umum' }
      ];
      console.log('Using default categories due to database error');
      return defaultCategories;
    } finally {
      if (connection) {
        try {
          await connection.end();
        } catch (endError) {
          console.error('Error closing database connection:', endError);
        }
      }
    }
  },

  // Get medicines by category
  async getMedicinesByCategory(categoryId) {
    let connection;
    
    try {
      connection = await mysql.createConnection(dbConfig);
      
      // First get the category name
      const categories = await this.getMedicineCategories();
      const category = categories.find(cat => cat.id == categoryId);
      
      if (!category) {
        return [];
      }
      
      const [rows] = await connection.execute(
        'SELECT title, description FROM obat_bebas_dan_bebas_terbatas___products'
      );
      
      const results = rows
        .map(row => {
          const medicineType = determineMedicineType(row.title, row.description);
          const categoryName = extractCategory(row.description);
          
          return {
            id: row.title,
            name: row.title,
            description: row.description,
            type: medicineType,
            category_name: categoryName
          };
        })
        .filter(medicine => medicine.category_name === category.name);
      
      return results;
      
    } catch (error) {
      console.error('Error getting medicines by category:', error);
      throw error;
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  },

  // Get popular keywords (extracted from titles and descriptions)
  async getPopularKeywords() {
    let connection;
    
    try {
      connection = await mysql.createConnection(dbConfig);
      
      const [rows] = await connection.execute(
        'SELECT title, description FROM obat_bebas_dan_bebas_terbatas___products'
      );
      
      const keywordCount = new Map();
      
      rows.forEach(row => {
        const titleTokens = tokenizeText(row.title);
        const descTokens = tokenizeText(row.description);
        
        [...titleTokens, ...descTokens].forEach(token => {
          if (token.length > 3) { // Only meaningful keywords
            keywordCount.set(token, (keywordCount.get(token) || 0) + 1);
          }
        });
      });
      
      // Convert to array and sort by frequency
      const keywords = Array.from(keywordCount.entries())
        .map(([keyword, count]) => ({ keyword, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20) // Top 20 keywords
        .map(item => ({ keyword: item.keyword }));
      
      return keywords;
      
    } catch (error) {
      console.error('Error getting popular keywords:', error);
      throw error;
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }
}; 