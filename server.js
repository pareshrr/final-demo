import express from 'express';
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
                    content: `Define the following term for a flashcard: ${term}`
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

// Start server (only in local development)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}`);
        console.log(`📁 Workshop environment ready!`);
        console.log(`🤖 OpenAI integration: ${process.env.OPENAI_API_KEY ? 'Configured' : 'Not configured'}`);
    });
}

// Export for Vercel
export default app;
