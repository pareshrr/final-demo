#!/usr/bin/env node

/**
 * Pre-start check script
 * Ensures the project is properly set up before starting the server
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    green: '\x1b[32m',
    blue: '\x1b[34m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// Check if node_modules exists
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
    log('\n⚠️  Dependencies not installed!', 'yellow');
    log('Installing basic dependencies...', 'blue');
    
    try {
        execSync('npm install', { stdio: 'inherit', cwd: __dirname });
        log('✅ Basic dependencies installed', 'green');
    } catch (error) {
        log('❌ Failed to install dependencies', 'red');
        process.exit(1);
    }
}

// Check if .env exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
    log('\n⚠️  Setup not complete!', 'yellow');
    log('\nPlease run the setup script first:', 'yellow');
    log('  node setup.js', 'blue');
    log('\nOr manually create a .env file with your API keys.', 'yellow');
    log('See .env.example for reference.\n', 'yellow');
    process.exit(1);
}

// Check if OpenAI and Firebase packages are installed
const openaiPath = path.join(__dirname, 'node_modules', 'openai');
const firebasePath = path.join(__dirname, 'node_modules', 'firebase');
const dotenvPath = path.join(__dirname, 'node_modules', 'dotenv');

const missingPackages = [];
if (!fs.existsSync(openaiPath)) missingPackages.push('openai');
if (!fs.existsSync(firebasePath)) missingPackages.push('firebase');
if (!fs.existsSync(dotenvPath)) missingPackages.push('dotenv');

if (missingPackages.length > 0) {
    log('\n⚠️  Missing workshop packages!', 'yellow');
    log('\nPlease run the setup script:', 'yellow');
    log('  node setup.js', 'blue');
    log('\nThis will install all required packages:', 'yellow');
    log(`  - ${missingPackages.join(', ')}\n`, 'yellow');
    process.exit(1);
}

// All checks passed
log('✅ Setup verified, starting server...', 'green');
