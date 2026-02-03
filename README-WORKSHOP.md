# Workshop: OpenAI & Firebase Integration

Welcome to the prototyping workshop! This guide will help you build a flashcard app with AI-powered definitions and real-time database storage.

## 🚀 Quick Start

You've already run the setup script! Here's what was installed:

- ✅ OpenAI integration for AI-powered features
- ✅ Firebase Firestore for real-time database
- ✅ Example files to get started
- ✅ Vercel deployment configuration

## 🧪 Test Your Setup

1. **Start the server:**
   ```bash
   npm start
   ```

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
   ```bash
   npm i -g vercel
   ```

2. **Connect to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

3. **Deploy on Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - In project settings, set Framework Preset to **"Other"**
   - Add environment variables:
     - `OPENAI_API_KEY`
     - `FIREBASE_API_KEY`
     - `FIREBASE_AUTH_DOMAIN`
     - `FIREBASE_PROJECT_ID`
     - `FIREBASE_STORAGE_BUCKET`
     - `FIREBASE_MESSAGING_SENDER_ID`
     - `FIREBASE_APP_ID`
   - Deploy!

### What's Included for Vercel:

- ✅ `vercel.json` - Configuration file
- ✅ `.gitignore` - Excludes sensitive files
- ✅ `api/` folder - Serverless API functions
- ✅ Static files served from root
- ✅ `.env.example` - Template for environment variables

## 📝 Workshop Tasks

### Task 1: AI-Generated Flashcard Definitions (20 min)

Add a feature where users can enter a term and get an AI-generated definition.

**Endpoint already available:**
```javascript
POST /api/generate-definition
Body: { "term": "React" }
Response: { "term": "React", "definition": "..." }
```

**Your task:**
- Add a button in the UI to "Generate Definition"
- Call the API endpoint
- Display the result

### Task 2: Save Flashcards to Firebase (20 min)

Save user-created flashcards to Firebase Firestore.

**Steps:**
1. Import Firebase in your `script.js`
2. Use `addDoc` to save flashcards
3. Use `getDocs` to load flashcards on page load

**Example code:**
```javascript
import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase-config.js';

await addDoc(collection(db, 'flashcard_sets'), {
  term: 'React',
  definition: 'A JavaScript library...'
});
```

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
```
POST /api/chat
Body: {
  "message": "Your message",
  "systemPrompt": "Optional system prompt"
}
```

**Generate Definition:**
```
POST /api/generate-definition
Body: {
  "term": "Term to define"
}
```

**Health Check:**
```
GET /api/health
Response: { "status": "ok" }
```

### Firebase Setup

Firebase config is in `firebase-config.js`. Import it:
```javascript
import { db } from './firebase-config.js';
```

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
- Check your API key in `.env`
- Make sure you have credits in your OpenAI account
- Check the server console for error messages

**Firebase not working?**
- Verify Firebase config in `.env`
- Check Firestore security rules (should allow read/write for development)
- Open browser console to see error messages

**Server not starting?**
- Make sure port 3000 is not in use
- Run `npm install` again if dependencies are missing

**Vercel deployment issues?**
- Make sure all environment variables are set in Vercel dashboard
- Check Framework Preset is set to "Other"
- Check deployment logs for errors
- Verify `api/` folder contains serverless functions

## 💡 Tips

- Use browser DevTools Network tab to debug API calls
- Check server console for backend errors
- Use `console.log` liberally while developing
- Test each integration separately before combining
- Always test locally before deploying to Vercel

Happy coding! 🚀
