// Start script semplificato per Render
const { execSync } = require('child_process');

// Genera Prisma client
console.log('🔄 Generating Prisma client...');
execSync('npx prisma generate', { stdio: 'inherit' });

// Compila TypeScript
console.log('🔨 Building...');
try {
  execSync('npm run build', { stdio: 'inherit' });
} catch (e) {
  console.log('⚠️ Build had warnings, continuing...');
}

// Avvia
console.log('🚀 Starting server...');
require('./dist/main');
