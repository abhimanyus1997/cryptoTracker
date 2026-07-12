export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // Cache for 1 year

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { contract, name, symbol } = req.query;
  
  if (!contract && !name && !symbol) {
    return res.status(400).json({ error: 'Missing contract, name, or symbol parameter' });
  }

  // Create deterministic seed from input
  const seedString = contract || name || symbol;
  const seed = hashCode(seedString);
  
  // Generate unique color palette from seed
  const colors = generateColorPalette(seed);
  
  // Generate SVG pattern based on seed
  const svg = generateFractalSVG(seed, colors, symbol || name || 'TOKEN');

  res.setHeader('Content-Type', 'image/svg+xml');
  res.status(200).send(svg);
}

// Hash function to create deterministic seed
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Generate beautiful color palette from seed
function generateColorPalette(seed) {
  const palettes = [
    ['#FF6B6B', '#4ECDC4', '#45B7D1'], // Coral Reef
    ['#F093FB', '#F5576C', '#4FACFE'], // Sunset Glow  
    ['#43E97B', '#38F9D7', '#FA709A'], // Neon Dreams
    ['#667EEA', '#764BA2', '#F093FB'], // Purple Haze
    ['#FF9A9E', '#FECFEF', '#FECFEF'], // Pink Mist
    ['#A18CD1', '#FBC2EB', '#F6D365'], // Cotton Candy
    ['#84FAB0', '#8FD3F4', '#A6C1EE'], // Ocean Breeze
    ['#FFECD2', '#FCB69F', '#FF9A9E'], // Peach Cream
    ['#FFD93D', '#FF6B6B', '#C44569'], // Vibrant Contrast
    ['#6C5CE7', '#A29BFE', '#74B9FF'], // Cool Blues
  ];
  
  return palettes[seed % palettes.length];
}

// Generate complex fractal SVG pattern
function generateFractalSVG(seed, colors, symbol) {
  const patternType = seed % 5;
  const rotation = (seed % 360) - 180;
  const scale = 0.8 + (seed % 40) / 100;
  
  let patternContent = '';
  
  switch(patternType) {
    case 0: // Geometric Flower
      patternContent = generateFlowerPattern(seed, colors);
      break;
    case 1: // Spiral Galaxy
      patternContent = generateSpiralPattern(seed, colors);
      break;
    case 2: // Radial Burst
      patternContent = generateRadialPattern(seed, colors);
      break;
    case 3: // Crystal Formation
      patternContent = generateCrystalPattern(seed, colors);
      break;
    case 4: // Sacred Geometry
      patternContent = generateSacredGeometry(seed, colors);
      break;
  }
  
  return `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${colors[0]};stop-opacity:1" />
        <stop offset="50%" style="stop-color:${colors[1]};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${colors[2] || colors[0]};stop-opacity:1" />
      </linearGradient>
      <radialGradient id="grad2" cx="50%" cy="50%" r="50%">
        <stop offset="0%" style="stop-color:${colors[1]};stop-opacity:0.8" />
        <stop offset="100%" style="stop-color:${colors[0]};stop-opacity:1" />
      </radialGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    
    <rect width="200" height="200" fill="#1a1f27" rx="32"/>
    <g transform="translate(100, 100) scale(${scale}) rotate(${rotation}) translate(-100, -100)">
      ${patternContent}
    </g>
    
    <text x="100" y="110" font-family="Arial, sans-serif" font-size="32" font-weight="bold" 
          text-anchor="middle" fill="white" fill-opacity="0.95" filter="url(#glow)">${symbol.slice(0, 4)}</text>
  </svg>`;
}

// Geometric Flower Pattern
function generateFlowerPattern(seed, colors) {
  const petals = 5 + (seed % 8);
  const layers = 2 + (seed % 3);
  let content = '';
  
  for (let layer = 0; layer < layers; layer++) {
    const radius = 30 + layer * 20;
    for (let i = 0; i < petals; i++) {
      const angle = (360 / petals) * i + layer * 15;
      const opacity = 0.7 - layer * 0.15;
      content += `<ellipse cx="100" cy="${60 - radius/2}" rx="25" ry="${radius}" 
                          fill="url(#grad${(layer % 2) + 1})" fill-opacity="${opacity}"
                          transform="rotate(${angle}, 100, 100)" />`;
    }
  }
  return content;
}

// Spiral Galaxy Pattern
function generateSpiralPattern(seed, colors) {
  let content = '';
  const arms = 3 + (seed % 4);
  
  for (let arm = 0; arm < arms; arm++) {
    for (let i = 0; i < 30; i++) {
      const angle = (arm * 360 / arms) + i * 12;
      const distance = 10 + i * 2.5;
      const x = 100 + distance * Math.cos(angle * Math.PI / 180);
      const y = 100 + distance * Math.sin(angle * Math.PI / 180);
      const size = 3 + (30 - i) * 0.15;
      const opacity = 0.9 - i * 0.025;
      
      content += `<circle cx="${x}" cy="${y}" r="${size}" 
                          fill="${colors[i % colors.length]}" fill-opacity="${opacity}" />`;
    }
  }
  return content;
}

// Radial Burst Pattern
function generateRadialPattern(seed, colors) {
  let content = '';
  const rays = 8 + (seed % 12);
  
  for (let i = 0; i < rays; i++) {
    const angle = (360 / rays) * i;
    const length = 50 + (seed % 40);
    const endX = 100 + length * Math.cos(angle * Math.PI / 180);
    const endY = 100 + length * Math.sin(angle * Math.PI / 180);
    
    content += `<line x1="100" y1="100" x2="${endX}" y2="${endY}" 
                       stroke="${colors[i % colors.length]}" stroke-width="6" stroke-opacity="0.7" />
                <circle cx="${endX}" cy="${endY}" r="8" 
                        fill="${colors[(i + 1) % colors.length]}" fill-opacity="0.8" />`;
  }
  return content;
}

// Crystal Formation Pattern
function generateCrystalPattern(seed, colors) {
  let content = '';
  const crystals = 6 + (seed % 6);
  
  for (let i = 0; i < crystals; i++) {
    const angle = (360 / crystals) * i;
    const length = 40 + (seed % 30);
    const endX = 100 + length * Math.cos(angle * Math.PI / 180);
    const endY = 100 + length * Math.sin(angle * Math.PI / 180);
    const midX = 100 + (length/2) * Math.cos((angle - 15) * Math.PI / 180);
    const midY = 100 + (length/2) * Math.sin((angle - 15) * Math.PI / 180);
    const midX2 = 100 + (length/2) * Math.cos((angle + 15) * Math.PI / 180);
    const midY2 = 100 + (length/2) * Math.sin((angle + 15) * Math.PI / 180);
    
    content += `<polygon points="100,100 ${midX},${midY} ${endX},${endY} ${midX2},${midY2}" 
                           fill="${colors[i % colors.length]}" fill-opacity="0.6" />`;
  }
  return content;
}

// Sacred Geometry Pattern (Flower of Life inspired)
function generateSacredGeometry(seed, colors) {
  let content = '';
  const rings = 3;
  const radius = 25;
  
  // Central circle
  content += `<circle cx="100" cy="100" r="${radius}" 
                       fill="none" stroke="${colors[0]}" stroke-width="2" stroke-opacity="0.8" />`;
  
  // First ring of 6 circles
  for (let i = 0; i < 6; i++) {
    const angle = 60 * i;
    const cx = 100 + radius * Math.cos(angle * Math.PI / 180);
    const cy = 100 + radius * Math.sin(angle * Math.PI / 180);
    
    content += `<circle cx="${cx}" cy="${cy}" r="${radius}" 
                         fill="none" stroke="${colors[1]}" stroke-width="3" stroke-opacity="0.7" />
                <circle cx="${cx}" cy="${cy}" r="${radius * 0.6}" 
                         fill="${colors[2] || colors[0]}" fill-opacity="0.3" />`;
  }
  
  return content;
}
