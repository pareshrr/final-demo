import OpenAI from 'openai';

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
                    content: `Define the following term for a flashcard: ${term}`
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
