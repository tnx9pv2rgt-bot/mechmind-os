#!/usr/bin/env node

/**
 * Bundle Analyzer Script
 * 
 * Analyzes webpack bundle size and provides optimization recommendations
 * 
 * Usage: node scripts/analyze-bundle.js
 */

const fs = require('fs')
const path = require('path')

const STATS_FILE = path.join(__dirname, '../.next/stats.json')
const OUTPUT_FILE = path.join(__dirname, '../bundle-analysis.html')

// Size thresholds in KB
const THRESHOLDS = {
  TOTAL: 500,      // 500KB total
  CHUNK: 250,      // 250KB per chunk
  MODULE: 100,     // 100KB per module
  WARNING: 50,     // 50KB warning
}

function formatSize(bytes) {
  const kb = bytes / 1024
  const mb = kb / 1024
  
  if (mb >= 1) {
    return `${mb.toFixed(2)} MB`
  }
  return `${kb.toFixed(2)} KB`
}

function getColorForSize(kb) {
  if (kb > THRESHOLDS.MODULE) return '#ef4444' // Red
  if (kb > THRESHOLDS.WARNING) return '#f59e0b' // Yellow
  return '#10b981' // Green
}

function analyzeBundle(stats) {
  const chunks = stats.chunks || []
  const modules = stats.modules || []
  
  const analysis = {
    totalSize: 0,
    chunks: [],
    largeModules: [],
    recommendations: [],
  }
  
  // Analyze chunks
  chunks.forEach((chunk) => {
    const size = chunk.size || 0
    analysis.totalSize += size
    
    const chunkInfo = {
      id: chunk.id,
      names: chunk.names || [],
      size: size,
      files: chunk.files || [],
      modules: chunk.modules?.length || 0,
    }
    
    analysis.chunks.push(chunkInfo)
    
    if (size > THRESHOLDS.CHUNK * 1024) {
      analysis.recommendations.push({
        type: 'warning',
        message: `Chunk "${chunk.names?.join(', ')}" is ${formatSize(size)} (>${THRESHOLDS.CHUNK}KB)`,
        suggestion: 'Consider code splitting or lazy loading',
      })
    }
  })
  
  // Analyze modules
  modules.forEach((module) => {
    const size = module.size || 0
    const kb = size / 1024
    
    if (kb > THRESHOLDS.WARNING) {
      analysis.largeModules.push({
        name: module.name,
        size: size,
        chunks: module.chunks,
      })
    }
  })
  
  // Sort by size
  analysis.chunks.sort((a, b) => b.size - a.size)
  analysis.largeModules.sort((a, b) => b.size - a.size)
  
  // Total size recommendation
  const totalKb = analysis.totalSize / 1024
  if (totalKb > THRESHOLDS.TOTAL) {
    analysis.recommendations.push({
      type: 'error',
      message: `Total bundle size is ${formatSize(analysis.totalSize)} (>${THRESHOLDS.TOTAL}KB)`,
      suggestion: 'Implement aggressive code splitting and tree shaking',
    })
  }
  
  return analysis
}

function generateHTML(analysis) {
  const totalKb = analysis.totalSize / 1024
  const totalColor = getColorForSize(totalKb)
  
  const recommendationsHTML = analysis.recommendations
    .map((rec) => `
      <div class="recommendation ${rec.type}">
        <strong>${rec.type.toUpperCase()}:</strong> ${rec.message}
        <br><em>Suggestion: ${rec.suggestion}</em>
      </div>
    `)
    .join('')
  
  const chunksHTML = analysis.chunks
    .map((chunk) => {
      const kb = chunk.size / 1024
      const color = getColorForSize(kb)
      return `
        <tr>
          <td>${chunk.names.join(', ') || 'unnamed'}</td>
          <td style="color: ${color}">${formatSize(chunk.size)}</td>
          <td>${chunk.modules}</td>
          <td>${chunk.files.join(', ')}</td>
        </tr>
      `
    })
    .join('')
  
  const modulesHTML = analysis.largeModules
    .slice(0, 20)
    .map((mod) => {
      const kb = mod.size / 1024
      const color = getColorForSize(kb)
      return `
        <tr>
          <td style="max-width: 400px; overflow: hidden; text-overflow: ellipsis;">${mod.name}</td>
          <td style="color: ${color}">${formatSize(mod.size)}</td>
          <td>${mod.chunks?.join(', ') || '-'}</td>
        </tr>
      `
    })
    .join('')
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Bundle Analysis - MechMind OS</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 40px;
      line-height: 1.6;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      color: #333;
      margin-bottom: 30px;
      font-size: 32px;
    }
    h2 {
      color: #555;
      margin: 30px 0 15px;
      font-size: 24px;
    }
    .summary {
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }
    .total-size {
      font-size: 48px;
      font-weight: bold;
      margin: 20px 0;
    }
    .recommendation {
      padding: 15px;
      border-radius: 8px;
      margin: 10px 0;
    }
    .recommendation.error {
      background: #fee;
      border-left: 4px solid #ef4444;
    }
    .recommendation.warning {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
    }
    .recommendation.info {
      background: #e0f2fe;
      border-left: 4px solid #0ea5e9;
    }
    table {
      width: 100%;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border-collapse: collapse;
    }
    th, td {
      padding: 15px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }
    th {
      background: #f8f9fa;
      font-weight: 600;
      color: #666;
    }
    tr:hover {
      background: #f8f9fa;
    }
    .legend {
      display: flex;
      gap: 20px;
      margin: 20px 0;
      flex-wrap: wrap;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .legend-color {
      width: 16px;
      height: 16px;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📦 Bundle Analysis Report</h1>
    
    <div class="summary">
      <h2>Summary</h2>
      <div class="total-size" style="color: ${totalColor}">
        ${formatSize(analysis.totalSize)}
      </div>
      <p>Total bundle size across all chunks</p>
      
      <div class="legend">
        <div class="legend-item">
          <div class="legend-color" style="background: #10b981"></div>
          <span>Optimal (&lt;50KB)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #f59e0b"></div>
          <span>Warning (50-100KB)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #ef4444"></div>
          <span>Critical (&gt;100KB)</span>
        </div>
      </div>
    </div>
    
    ${analysis.recommendations.length > 0 ? `
      <h2>⚠️ Recommendations</h2>
      ${recommendationsHTML}
    ` : ''}
    
    <h2>📊 Chunks</h2>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Size</th>
          <th>Modules</th>
          <th>Files</th>
        </tr>
      </thead>
      <tbody>
        ${chunksHTML}
      </tbody>
    </table>
    
    <h2>🔍 Large Modules (Top 20)</h2>
    <table>
      <thead>
        <tr>
          <th>Module</th>
          <th>Size</th>
          <th>Chunks</th>
        </tr>
      </thead>
      <tbody>
        ${modulesHTML}
      </tbody>
    </table>
    
    <div style="margin-top: 40px; text-align: center; color: #999;">
      Generated: ${new Date().toLocaleString()}
    </div>
  </div>
</body>
</html>`
}

function main() {
  console.log('📦 Analyzing bundle...\n')
  
  if (!fs.existsSync(STATS_FILE)) {
    console.error('❌ Stats file not found. Run build with:')
    console.error('   ANALYZE=true npm run build')
    process.exit(1)
  }
  
  const stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'))
  const analysis = analyzeBundle(stats)
  
  // Print summary
  console.log(`Total Size: ${formatSize(analysis.totalSize)}`)
  console.log(`Chunks: ${analysis.chunks.length}`)
  console.log(`Large Modules: ${analysis.largeModules.length}\n`)
  
  if (analysis.recommendations.length > 0) {
    console.log('Recommendations:')
    analysis.recommendations.forEach((rec) => {
      console.log(`  [${rec.type.toUpperCase()}] ${rec.message}`)
    })
    console.log('')
  }
  
  // Generate HTML report
  const html = generateHTML(analysis)
  fs.writeFileSync(OUTPUT_FILE, html)
  
  console.log(`✅ Analysis complete!
  Report: ${OUTPUT_FILE}
  
Open the HTML file in your browser to see detailed results.`)
}

main()
