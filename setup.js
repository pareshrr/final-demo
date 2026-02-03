#!/usr/bin/env node

/**
 * Workshop Setup Script
 * This script helps participants quickly set up OpenAI and Firebase integration
 */

import { execSync } from 'child_process';
import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    red: '\x1b[31m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function prompt(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

async function checkNodeVersion() {
    log('\n📦 Checking Node.js version...', 'blue');
    const version = process.version;
    const major = parseInt(version.split('.')[0].substring(1));
    
    if (major < 16) {
        log('❌ Node.js version 16 or higher is required', 'red');
        log(`   Current version: ${version}`, 'yellow');
        process.exit(1);
    }
    
    log(`✅ Node.js ${version} detected`, 'green');
}

async function installDependencies() {
    log('\n📦 Installing dependencies...', 'blue');
    log('   This may take a minute...', 'yellow');
    
    try {
        execSync('npm install openai firebase dotenv', { 
            stdio: 'inherit',
            cwd: __dirname 
        });
        log('✅ Dependencies installed successfully', 'green');
    } catch (error) {
        log('❌ Failed to install dependencies', 'red');
        log('   Please run: npm install openai firebase dotenv', 'yellow');
        process.exit(1);
    }
}

async function setupEnvFile() {
    log('\n🔑 Setting up environment variables...', 'blue');
    
    const envPath = path.join(__dirname, '.env');
    
    if (fs.existsSync(envPath)) {
        const overwrite = await prompt('   .env file already exists. Overwrite? (y/n): ');
        if (overwrite.toLowerCase() !== 'y') {
            log('   Skipping .env setup', 'yellow');
            return;
        }
    }
    
    log('\n   Choose setup option:', 'bright');
    log('   1. Use workshop shared keys (recommended for workshop)', 'yellow');
    log('   2. Enter your own API keys', 'yellow');
    
    const choice = await prompt('\n   Enter choice (1 or 2): ');
    
    let envContent = '';
    
    if (choice === '1') {
        // Shared workshop configuration
        envContent = `# Workshop Shared Configuration
# OpenAI API Key (Shared - Rate limited)
OPENAI_API_KEY=workshop-shared-key

# Firebase Configuration (Shared Workshop Project)
FIREBASE_API_KEY=AIzaSyBIh2SoFs2-3ODVvvwwZGacSsRXQG2FZV8
FIREBASE_AUTH_DOMAIN=quizlet-api-ac8b7.firebaseapp.com
FIREBASE_PROJECT_ID=quizlet-api-ac8b7
FIREBASE_STORAGE_BUCKET=quizlet-api-ac8b7.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=685333840049
FIREBASE_APP_ID=1:685333840049:web:fc87e352a84aaa085c6290

# Server Port
PORT=3000
`;
        log('   ✅ Using shared workshop configuration', 'green');
    } else {
        // Custom configuration
        log('\n   Enter your API keys:', 'bright');
        const openaiKey = await prompt('   OpenAI API Key: ');
        const firebaseApiKey = await prompt('   Firebase API Key: ');
        const firebaseProjectId = await prompt('   Firebase Project ID: ');
        const firebaseAuthDomain = await prompt('   Firebase Auth Domain: ');
        
        envContent = `# Custom Configuration
# OpenAI API Key
OPENAI_API_KEY=${openaiKey}

# Firebase Configuration
FIREBASE_API_KEY=${firebaseApiKey}
FIREBASE_AUTH_DOMAIN=${firebaseAuthDomain}
FIREBASE_PROJECT_ID=${firebaseProjectId}
FIREBASE_STORAGE_BUCKET=${firebaseProjectId}.appspot.com
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=

# Server Port
PORT=3000
`;
        log('   ✅ Custom configuration saved', 'green');
    }
    
    fs.writeFileSync(envPath, envContent);
    log('   ✅ .env file created', 'green');
}

async function updateServerFile() {
    log('\n🔧 Updating server.js with OpenAI integration...', 'blue');
    
    const serverPath = path.join(__dirname, 'server.js');
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    
    // Check if already updated
    if (serverContent.includes('OpenAI')) {
        log('   ⚠️  server.js already has OpenAI integration', 'yellow');
        return;
    }
    
    const newServerContent = `import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import OpenAI from 'openai';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// OpenAI Chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message, systemPrompt } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }
        
        const messages = [];
        
        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
        }
        
        messages.push({ role: 'user', content: message });
        
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: messages,
            max_tokens: 500,
            temperature: 0.7
        });
        
        const responseText = completion.choices[0].message.content;
        
        res.json({ 
            response: responseText,
            usage: completion.usage
        });
        
    } catch (error) {
        console.error('OpenAI API Error:', error);
        res.status(500).json({ 
            error: 'Failed to get AI response',
            details: error.message 
        });
    }
});

// Generate flashcard definitions endpoint
app.post('/api/generate-definition', async (req, res) => {
    try {
        const { term } = req.body;
        
        if (!term) {
            return res.status(400).json({ error: 'Term is required' });
        }
        
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful assistant that creates concise, clear definitions for study flashcards. Keep definitions under 50 words.'
                },
                {
                    role: 'user',
                    content: \`Define the following term for a flashcard: \${term}\`
                }
            ],
            max_tokens: 100,
            temperature: 0.7
        });
        
        const definition = completion.choices[0].message.content;
        
        res.json({ term, definition });
        
    } catch (error) {
        console.error('OpenAI API Error:', error);
        res.status(500).json({ 
            error: 'Failed to generate definition',
            details: error.message 
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(\`🚀 Server running at http://localhost:\${PORT}\`);
    console.log(\`📁 Workshop environment ready!\`);
    console.log(\`🤖 OpenAI integration: \${process.env.OPENAI_API_KEY ? 'Configured' : 'Not configured'}\`);
});
`;
    
    fs.writeFileSync(serverPath, newServerContent);
    log('   ✅ server.js updated with OpenAI endpoints', 'green');
}

async function createFirebaseConfig() {
    log('\n🔥 Creating Firebase configuration...', 'blue');
    
    const configPath = path.join(__dirname, 'firebase-config.js');
    
    const configContent = `/**
 * Firebase Configuration
 * Import this file to use Firebase in your application
 */

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Load configuration from environment variables
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID || import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID || import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;
`;
    
    fs.writeFileSync(configPath, configContent);
    log('   ✅ firebase-config.js created', 'green');
}

async function createExampleFiles() {
    log('\n📝 Creating example files...', 'blue');
    
    // Create example for OpenAI
    const openaiExamplePath = path.join(__dirname, 'example-openai.html');
    const openaiExample = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OpenAI Integration Example</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        h1 { color: #333; margin-top: 0; }
        textarea {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
            resize: vertical;
            box-sizing: border-box;
        }
        button {
            background: #4255ff;
            color: white;
            border: none;
            padding: 12px 24px;
            font-size: 16px;
            border-radius: 8px;
            cursor: pointer;
            margin-top: 10px;
        }
        button:hover { background: #3347dd; }
        button:disabled { background: #ccc; cursor: not-allowed; }
        .response {
            margin-top: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            white-space: pre-wrap;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🤖 OpenAI Integration Test</h1>
        <p>Test the OpenAI API integration:</p>
        
        <textarea id="messageInput" rows="4" placeholder="Ask anything..."></textarea>
        <button id="sendBtn">Send to AI</button>
        
        <div id="response" class="response" style="display:none;"></div>
    </div>

    <script>
        const sendBtn = document.getElementById('sendBtn');
        const messageInput = document.getElementById('messageInput');
        const responseDiv = document.getElementById('response');

        sendBtn.addEventListener('click', async () => {
            const message = messageInput.value.trim();
            if (!message) return;

            sendBtn.disabled = true;
            sendBtn.textContent = 'Thinking...';
            responseDiv.style.display = 'none';

            try {
                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message })
                });

                const data = await res.json();

                if (data.error) {
                    responseDiv.textContent = 'Error: ' + data.error;
                } else {
                    responseDiv.textContent = data.response;
                }
                
                responseDiv.style.display = 'block';
            } catch (error) {
                responseDiv.textContent = 'Error: ' + error.message;
                responseDiv.style.display = 'block';
            }

            sendBtn.disabled = false;
            sendBtn.textContent = 'Send to AI';
        });
    </script>
</body>
</html>
`;
    
    fs.writeFileSync(openaiExamplePath, openaiExample);
    log('   ✅ example-openai.html created', 'green');
    
    // Create example for Firebase
    const firebaseExamplePath = path.join(__dirname, 'example-firebase.html');
    const firebaseExample = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Firebase Integration Example</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #f6f7fb;
            padding: 40px 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        h1 { 
            color: #282e3e;
            margin-bottom: 10px;
            font-size: 32px;
            font-weight: 700;
        }
        .subtitle {
            color: #586380;
            margin-bottom: 30px;
            font-size: 16px;
        }
        button {
            background: #4255ff;
            color: white;
            border: none;
            padding: 12px 24px;
            font-size: 16px;
            font-weight: 600;
            border-radius: 8px;
            cursor: pointer;
            margin-bottom: 30px;
        }
        button:hover { background: #3347dd; }
        button:disabled { 
            background: #d9dce3; 
            cursor: not-allowed;
        }
        .study-sets-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .study-set-card {
            background: white;
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .study-set-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 16px rgba(0,0,0,0.12);
        }
        .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: #e8e6f9;
            color: #4255ff;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 16px;
        }
        .set-title {
            font-size: 24px;
            font-weight: 700;
            color: #282e3e;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .set-icon {
            width: 32px;
            height: 32px;
            background: #f6f7fb;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
        }
        .set-stats {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        .terms-badge {
            background: #e8e6f9;
            color: #4255ff;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
        }
        .rating {
            display: flex;
            align-items: center;
            gap: 6px;
            color: #586380;
            font-size: 16px;
            font-weight: 600;
        }
        .star {
            color: #ffcd1f;
            font-size: 20px;
        }
        .divider {
            width: 4px;
            height: 4px;
            background: #d9dce3;
            border-radius: 50%;
        }
        .set-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-top: 20px;
            border-top: 1px solid #f0f1f4;
        }
        .creator {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .creator-avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            font-size: 14px;
        }
        .creator-name {
            color: #282e3e;
            font-weight: 600;
            font-size: 14px;
        }
        .preview-btn {
            background: #f6f7fb;
            color: #586380;
            padding: 8px 20px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            border: none;
            cursor: pointer;
        }
        .preview-btn:hover {
            background: #e8e9ed;
        }
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #586380;
        }
        .status-message {
            text-align: center;
            padding: 40px 20px;
            background: white;
            border-radius: 16px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .status-message strong {
            color: #4255ff;
            font-size: 18px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔥 Firebase Study Sets</h1>
        <p class="subtitle">Displaying study sets from the shared Firestore database</p>
        
        <button id="loadBtn">🔄 Refresh Study Sets</button>
        
        <div id="flashcardList" class="study-sets-grid"></div>
    </div>

    <script type="module">
        import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
        import { getFirestore, collection, getDocs, query, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

        // Firebase configuration (Shared Workshop Project)
        const firebaseConfig = {
            apiKey: "AIzaSyBIh2SoFs2-3ODVvvwwZGacSsRXQG2FZV8",
            authDomain: "quizlet-api-ac8b7.firebaseapp.com",
            projectId: "quizlet-api-ac8b7",
            storageBucket: "quizlet-api-ac8b7.firebasestorage.app",
            messagingSenderId: "685333840049",
            appId: "1:685333840049:web:fc87e352a84aaa085c6290"
        };

        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        const loadBtn = document.getElementById('loadBtn');
        const flashcardList = document.getElementById('flashcardList');
        
        const DISPLAY_LIMIT = 20; // Show first 20 cards

        // Load flashcards
        loadBtn.addEventListener('click', loadFlashcards);

        async function loadFlashcards() {
            loadBtn.disabled = true;
            loadBtn.textContent = '⏳ Loading...';
            
            try {
                // Load flashcards without sorting (since field names vary)
                const q = query(
                    collection(db, 'flashcard_sets'),
                    limit(DISPLAY_LIMIT)
                );
                const snapshot = await getDocs(q);
                
                flashcardList.innerHTML = '';
                
                if (snapshot.empty) {
                    flashcardList.innerHTML = '<div class="empty-state"><p>No study sets found in the database.</p></div>';
                } else {
                    let count = 0;
                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        
                        // Extract data fields
                        const title = data.set_title || data.term || 'Untitled Set';
                        const termCount = data.number_of_terms || 0;
                        const studiersToday = data.studiers_today || 0;
                        const rating = data.avg_rating || 0;
                        const ratingCount = data.rating_count || 0;
                        const creatorUsername = data.creator_username || 'Unknown';
                        const hasImages = data.has_images || false;
                        
                        // Create card
                        const card = document.createElement('div');
                        card.className = 'study-set-card';
                        
                        // Get first letter for avatar
                        const initial = creatorUsername.charAt(0).toUpperCase();
                        
                        card.innerHTML = \`
                            \${studiersToday > 0 ? \`<div class="badge">📈 \${studiersToday} studiers today</div>\` : ''}
                            
                            <div class="set-title">
                                \${title}
                                \${hasImages ? '<span class="set-icon">🖼️</span>' : ''}
                            </div>
                            
                            <div class="set-stats">
                                <div class="terms-badge">\${termCount} terms</div>
                                \${rating > 0 ? \`
                                    <span class="divider"></span>
                                    <div class="rating">
                                        <span class="star">⭐</span>
                                        <span>\${rating.toFixed(1)} (\${ratingCount})</span>
                                    </div>
                                \` : ''}
                            </div>
                            
                            <div class="set-footer">
                                <div class="creator">
                                    <div class="creator-avatar">\${initial}</div>
                                    <span class="creator-name">\${creatorUsername}</span>
                                </div>
                                <button class="preview-btn">Preview</button>
                            </div>
                        \`;
                        
                        flashcardList.appendChild(card);
                        count++;
                    });
                    
                    // Show status message
                    const statusMsg = document.createElement('div');
                    statusMsg.className = 'status-message';
                    statusMsg.innerHTML = \`
                        <strong>✅ Successfully loaded \${count} study set\${count !== 1 ? 's' : ''}</strong><br>
                        <span style="font-size: 14px; color: #586380; margin-top: 8px; display: block;">
                            Database connection verified!
                        </span>
                    \`;
                    flashcardList.appendChild(statusMsg);
                }
            } catch (error) {
                console.error('Error loading flashcards:', error);
                flashcardList.innerHTML = \`
                    <div style="color: red; padding: 20px; text-align: center;">
                        <strong>❌ Error loading flashcards</strong><br>
                        <span style="font-size: 14px;">\${error.message}</span>
                    </div>
                \`;
            }
            
            loadBtn.disabled = false;
            loadBtn.textContent = '🔄 Refresh Flashcards';
        }

        // Load on page load
        loadFlashcards();
    </script>
</body>
</html>
`;
    
    fs.writeFileSync(firebaseExamplePath, firebaseExample);
    log('   ✅ example-firebase.html created', 'green');
}

async function createReadme() {
    log('\n📚 Creating workshop README...', 'blue');
    
    const readmePath = path.join(__dirname, 'README-WORKSHOP.md');
    const readmeContent = `# Workshop: OpenAI & Firebase Integration

Welcome to the prototyping workshop! This guide will help you build a flashcard app with AI-powered definitions and real-time database storage.

## 🚀 Quick Start

You've already run the setup script! Here's what was installed:

- ✅ OpenAI integration for AI-powered features
- ✅ Firebase Firestore for real-time database
- ✅ Example files to get started
- ✅ Vercel deployment configuration

## 🧪 Test Your Setup

1. **Start the server:**
   \`\`\`bash
   npm start
   \`\`\`

2. **Test OpenAI Integration:**
   - Open http://localhost:3000/example-openai.html
   - Try asking a question to verify OpenAI is working

3. **Test Firebase Integration:**
   - Open http://localhost:3000/example-firebase.html
   - Try loading flashcards from the database

## 🌐 Deploy to Vercel

Your project is ready to deploy to Vercel!

### Deployment Steps:

1. **Install Vercel CLI (optional):**
   \`\`\`bash
   npm i -g vercel
   \`\`\`

2. **Connect to GitHub:**
   \`\`\`bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   \`\`\`

3. **Deploy on Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - In project settings, set Framework Preset to **"Other"**
   - Add environment variables:
     - \`OPENAI_API_KEY\`
     - \`FIREBASE_API_KEY\`
     - \`FIREBASE_AUTH_DOMAIN\`
     - \`FIREBASE_PROJECT_ID\`
     - \`FIREBASE_STORAGE_BUCKET\`
     - \`FIREBASE_MESSAGING_SENDER_ID\`
     - \`FIREBASE_APP_ID\`
   - Deploy!

### What's Included for Vercel:

- ✅ \`vercel.json\` - Configuration file
- ✅ \`.gitignore\` - Excludes sensitive files
- ✅ \`api/\` folder - Serverless API functions
- ✅ Static files served from root
- ✅ \`.env.example\` - Template for environment variables

## 📝 Workshop Tasks

### Task 1: AI-Generated Flashcard Definitions (20 min)

Add a feature where users can enter a term and get an AI-generated definition.

**Endpoint already available:**
\`\`\`javascript
POST /api/generate-definition
Body: { "term": "React" }
Response: { "term": "React", "definition": "..." }
\`\`\`

**Your task:**
- Add a button in the UI to "Generate Definition"
- Call the API endpoint
- Display the result

### Task 2: Save Flashcards to Firebase (20 min)

Save user-created flashcards to Firebase Firestore.

**Steps:**
1. Import Firebase in your \`script.js\`
2. Use \`addDoc\` to save flashcards
3. Use \`getDocs\` to load flashcards on page load

**Example code:**
\`\`\`javascript
import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase-config.js';

await addDoc(collection(db, 'flashcard_sets'), {
  term: 'React',
  definition: 'A JavaScript library...'
});
\`\`\`

### Task 3: Combine Both Features (15 min)

Create a workflow:
1. User enters a term
2. AI generates definition
3. User reviews/edits
4. Save to Firebase
5. Display all saved flashcards

## 🔑 API Endpoints Available

### OpenAI Endpoints

**Chat Endpoint:**
\`\`\`
POST /api/chat
Body: {
  "message": "Your message",
  "systemPrompt": "Optional system prompt"
}
\`\`\`

**Generate Definition:**
\`\`\`
POST /api/generate-definition
Body: {
  "term": "Term to define"
}
\`\`\`

**Health Check:**
\`\`\`
GET /api/health
Response: { "status": "ok" }
\`\`\`

### Firebase Setup

Firebase config is in \`firebase-config.js\`. Import it:
\`\`\`javascript
import { db } from './firebase-config.js';
\`\`\`

## 🎯 Bonus Challenges

1. **Add AI-powered study tips** - Generate study tips for each flashcard
2. **Smart grouping** - Use AI to categorize flashcards by topic
3. **Quiz generation** - Generate multiple-choice questions from flashcards
4. **Real-time sync** - Use Firebase real-time listeners to sync across tabs

## 📚 Resources

- [OpenAI API Docs](https://platform.openai.com/docs/api-reference)
- [Firebase Firestore Docs](https://firebase.google.com/docs/firestore)
- [Express.js Docs](https://expressjs.com/)
- [Vercel Docs](https://vercel.com/docs)

## 🐛 Troubleshooting

**OpenAI not working?**
- Check your API key in \`.env\`
- Make sure you have credits in your OpenAI account
- Check the server console for error messages

**Firebase not working?**
- Verify Firebase config in \`.env\`
- Check Firestore security rules (should allow read/write for development)
- Open browser console to see error messages

**Server not starting?**
- Make sure port 3000 is not in use
- Run \`npm install\` again if dependencies are missing

**Vercel deployment issues?**
- Make sure all environment variables are set in Vercel dashboard
- Check Framework Preset is set to "Other"
- Check deployment logs for errors
- Verify \`api/\` folder contains serverless functions

## 💡 Tips

- Use browser DevTools Network tab to debug API calls
- Check server console for backend errors
- Use \`console.log\` liberally while developing
- Test each integration separately before combining
- Always test locally before deploying to Vercel

Happy coding! 🚀
`;
    
    fs.writeFileSync(readmePath, readmeContent);
    log('   ✅ README-WORKSHOP.md created', 'green');
}

async function updatePackageJson() {
    log('\n📦 Updating package.json...', 'blue');
    
    const packagePath = path.join(__dirname, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Ensure scripts object exists
    if (!packageJson.scripts) {
        packageJson.scripts = {};
    }
    
    packageJson.scripts.setup = 'node setup.js';
    packageJson.scripts['test-setup'] = 'node test-setup.js';
    
    // Only update description if it doesn't already mention workshop
    if (!packageJson.description || !packageJson.description.includes('workshop')) {
        packageJson.description = 'Workshop project for OpenAI and Firebase integration';
    }
    
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    log('   ✅ package.json updated', 'green');
}

async function testConnections() {
    log('\n🧪 Testing connections...', 'blue');
    
    // Check if .env exists
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
        log('   ⚠️  .env file not found, skipping connection tests', 'yellow');
        return;
    }
    
    log('   ✅ Environment file found', 'green');
    log('   💡 Start the server with "npm start" to test API endpoints', 'yellow');
}

async function createVercelConfig() {
    log('\n🚀 Creating Vercel deployment files...', 'blue');
    
    // Create vercel.json
    const vercelConfigPath = path.join(__dirname, 'vercel.json');
    const vercelConfig = {
        "buildCommand": null,
        "framework": null,
        "installCommand": "npm install"
    };
    
    fs.writeFileSync(vercelConfigPath, JSON.stringify(vercelConfig, null, 2));
    log('   ✅ vercel.json created', 'green');
    
    // Update .gitignore
    const gitignorePath = path.join(__dirname, '.gitignore');
    let gitignoreContent = 'node_modules\n.env\n.DS_Store\n';
    
    if (fs.existsSync(gitignorePath)) {
        const existing = fs.readFileSync(gitignorePath, 'utf8');
        if (!existing.includes('.env')) {
            gitignoreContent = existing + '\n.env\n.DS_Store\n';
        } else {
            gitignoreContent = existing;
        }
    }
    
    fs.writeFileSync(gitignorePath, gitignoreContent);
    log('   ✅ .gitignore updated', 'green');
    
    // Create API directory and serverless functions
    const apiDir = path.join(__dirname, 'api');
    if (!fs.existsSync(apiDir)) {
        fs.mkdirSync(apiDir);
    }
    
    // Create health.js
    const healthJs = `export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method === 'GET') {
        return res.status(200).json({ status: 'ok' });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
}
`;
    fs.writeFileSync(path.join(apiDir, 'health.js'), healthJs);
    log('   ✅ api/health.js created', 'green');
    
    // Create chat.js
    const chatJs = `import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { message, systemPrompt } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }
        
        const messages = [];
        
        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
        }
        
        messages.push({ role: 'user', content: message });
        
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: messages,
            max_tokens: 500,
            temperature: 0.7
        });
        
        const responseText = completion.choices[0].message.content;
        
        return res.status(200).json({ 
            response: responseText,
            usage: completion.usage
        });
        
    } catch (error) {
        console.error('OpenAI API Error:', error);
        return res.status(500).json({ 
            error: 'Failed to get AI response',
            details: error.message 
        });
    }
}
`;
    fs.writeFileSync(path.join(apiDir, 'chat.js'), chatJs);
    log('   ✅ api/chat.js created', 'green');
    
    // Create generate-definition.js
    const generateDefinitionJs = `import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { term } = req.body;
        
        if (!term) {
            return res.status(400).json({ error: 'Term is required' });
        }
        
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful assistant that creates concise, clear definitions for study flashcards. Keep definitions under 50 words.'
                },
                {
                    role: 'user',
                    content: \`Define the following term for a flashcard: \${term}\`
                }
            ],
            max_tokens: 100,
            temperature: 0.7
        });
        
        const definition = completion.choices[0].message.content;
        
        return res.status(200).json({ term, definition });
        
    } catch (error) {
        console.error('OpenAI API Error:', error);
        return res.status(500).json({ 
            error: 'Failed to generate definition',
            details: error.message 
        });
    }
}
`;
    fs.writeFileSync(path.join(apiDir, 'generate-definition.js'), generateDefinitionJs);
    log('   ✅ api/generate-definition.js created', 'green');
}

async function printNextSteps() {
    log('\n' + '='.repeat(60), 'green');
    log('🎉 Setup Complete!', 'bright');
    log('='.repeat(60), 'green');
    
    log('\n📋 Next Steps:', 'bright');
    log('   1. Start the server:', 'yellow');
    log('      npm start', 'blue');
    log('   2. Test OpenAI integration:', 'yellow');
    log('      http://localhost:3000/example-openai.html', 'blue');
    log('   3. Test Firebase integration:', 'yellow');
    log('      http://localhost:3000/example-firebase.html', 'blue');
    log('   4. Read the workshop guide:', 'yellow');
    log('      Open README-WORKSHOP.md', 'blue');
    
    log('\n📁 Files Created:', 'bright');
    log('   - .env (environment variables)', 'yellow');
    log('   - .gitignore (exclude sensitive files)', 'yellow');
    log('   - firebase-config.js (Firebase setup)', 'yellow');
    log('   - example-openai.html (OpenAI test)', 'yellow');
    log('   - example-firebase.html (Firebase test)', 'yellow');
    log('   - README-WORKSHOP.md (workshop guide)', 'yellow');
    log('   - vercel.json (Vercel deployment config)', 'yellow');
    log('   - api/ (serverless functions for Vercel)', 'yellow');
    
    log('\n🔑 API Endpoints Available:', 'bright');
    log('   GET  /api/health', 'yellow');
    log('   POST /api/chat', 'yellow');
    log('   POST /api/generate-definition', 'yellow');
    
    log('\n🚀 Deploy to Vercel:', 'bright');
    log('   1. Push code to GitHub', 'yellow');
    log('   2. Import repo on vercel.com', 'yellow');
    log('   3. Set Framework Preset to "Other"', 'yellow');
    log('   4. Add environment variables', 'yellow');
    log('   5. Deploy!', 'yellow');
    
    log('\n💡 Pro Tips:', 'bright');
    log('   - Check .env file for your API keys', 'yellow');
    log('   - Use the example files to test each integration', 'yellow');
    log('   - Read README-WORKSHOP.md for detailed instructions', 'yellow');
    log('   - Keep .env file local (it\'s in .gitignore)', 'yellow');
    log('   - Set environment variables in Vercel dashboard', 'yellow');
    
    log('\n' + '='.repeat(60) + '\n', 'green');
}

// Main setup flow
async function main() {
    try {
        log('\n' + '='.repeat(60), 'bright');
        log('🚀 Workshop Setup Script', 'bright');
        log('   OpenAI + Firebase Integration', 'yellow');
        log('='.repeat(60) + '\n', 'bright');
        
        await checkNodeVersion();
        await installDependencies();
        await setupEnvFile();
        await updatePackageJson();
        await updateServerFile();
        await createFirebaseConfig();
        await createVercelConfig();
        await createExampleFiles();
        await createReadme();
        await testConnections();
        await printNextSteps();
        
    } catch (error) {
        log('\n❌ Setup failed:', 'red');
        log(error.message, 'red');
        process.exit(1);
    } finally {
        rl.close();
    }
}

main();
