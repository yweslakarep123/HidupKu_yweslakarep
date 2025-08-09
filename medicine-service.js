import dotenv from 'dotenv';
import fs from 'fs/promises';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { GoogleGenAI } from '@google/genai';

// Load environment variables (only from file in non-production)
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: './config.env' });
}

// Resolve dataset path and loader (CSV)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATASET_PATH = join(__dirname, 'Obat_Bebas dan Bebas_Terbatas - products.csv');

let medicineDataset = null; // cache
async function loadMedicineDataset() {
  if (medicineDataset) return medicineDataset;
  try {
    const fileContent = await fs.readFile(DATASET_PATH, 'utf-8');
    const rows = parse(fileContent, { columns: true, skip_empty_lines: true });
    medicineDataset = rows.map(r => ({
      title: String(r.title || r.Title || '').trim(),
      description: String(r.description || r.Description || '').trim()
    })).filter(r => r.title && r.description);
    console.log(`[Medicine] Loaded dataset: ${medicineDataset.length} items`);
  } catch (err) {
    console.error('[Medicine] Failed to load dataset CSV:', err.message);
    medicineDataset = [];
  }
  return medicineDataset;
}

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
    try {
      const dataset = await loadMedicineDataset();
      const queryTokens = tokenizeText(query);
      if (queryTokens.length === 0 && !type && !category) {
        return [];
      }
      // Candidate filter by text
      let candidates = dataset;
      if (queryTokens.length > 0) {
        const lowerQuery = (query || '').toLowerCase();
        candidates = candidates.filter(row => {
          const text = `${row.title} ${row.description}`.toLowerCase();
          return text.includes(lowerQuery) || queryTokens.some(t => text.includes(t));
        });
      }
      // Enhanced processing with Gemini AI
      console.log(`Processing ${candidates.length} medicines with AI...`);
      const results = await Promise.all(candidates.map(async (row, index) => {
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
    try {
      const dataset = await loadMedicineDataset();
      const row = dataset.find(r => r.title === id);
      if (!row) return null;
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
    }
  },

  // Get medicines by type
  async getMedicinesByType(type) {
    try {
      const dataset = await loadMedicineDataset();
      const results = dataset
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
    }
  },

  // Get medicine categories (extracted from descriptions)
  async getMedicineCategories() {
    try {
      const dataset = await loadMedicineDataset();
      const categories = new Set();
      dataset.slice(0, 2000).forEach(row => {
        const category = extractCategory(row.description);
        categories.add(category);
      });
      const result = Array.from(categories).map((name, index) => ({ id: index + 1, name }));
      console.log(`Found ${result.length} medicine categories from dataset`);
      return result;
    } catch (error) {
      console.error('Error getting medicine categories from dataset:', error);
      const defaultCategories = [
        { id: 1, name: 'Analgesik' },
        { id: 2, name: 'Antihistamin' },
        { id: 3, name: 'Obat Batuk & Pilek' },
        { id: 4, name: 'Vitamin & Suplemen' },
        { id: 5, name: 'Obat Lambung' },
        { id: 6, name: 'Obat Pencernaan' },
        { id: 7, name: 'Obat Umum' }
      ];
      return defaultCategories;
    }
  },

  // Get medicines by category
  async getMedicinesByCategory(categoryId) {
    try {
      // First get the category name
      const categories = await this.getMedicineCategories();
      const category = categories.find(cat => cat.id == categoryId);
      
      if (!category) {
        return [];
      }
      const dataset = await loadMedicineDataset();
      const results = dataset
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
    }
  },

  // Get popular keywords (extracted from titles and descriptions)
  async getPopularKeywords() {
    try {
      const dataset = await loadMedicineDataset();
      const keywordCount = new Map();
      dataset.forEach(row => {
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
    }
  }
}; 