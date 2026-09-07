import fs from 'fs';
import path from 'path';

const COVERS_DIR = path.join(process.cwd(), 'generated', 'covers');

interface CoverConfig {
  slug: string;
  title: string;
  category: string;
  bgColor: string;
  accentColor: string;
  emoji: string;
  pattern: string;
}

const covers: CoverConfig[] = [
  { slug: 'zara-and-the-missing-moonbeam', title: 'Zara and the Missing Moonbeam', category: 'Adventure', bgColor: '#1e1b4b', accentColor: '#fbbf24', emoji: '🌙', pattern: 'stars' },
  { slug: 'tobis-amazing-robot', title: "Tobi's Amazing Robot", category: 'Science & Technology', bgColor: '#0f172a', accentColor: '#22d3ee', emoji: '🤖', pattern: 'gears' },
  { slug: 'amara-and-the-talking-baobab', title: 'Amara and the Talking Baobab', category: 'African Stories', bgColor: '#14532d', accentColor: '#f59e0b', emoji: '🌳', pattern: 'leaves' },
  { slug: 'the-little-lion-who-learned-to-listen', title: 'The Little Lion Who Learned to Listen', category: 'Life Skills', bgColor: '#78350f', accentColor: '#fbbf24', emoji: '🦁', pattern: 'waves' },
  { slug: 'adas-first-day-of-school', title: "Ada's First Day of School", category: 'Life Skills', bgColor: '#3b0764', accentColor: '#a78bfa', emoji: '🎒', pattern: 'dots' },
  { slug: 'the-adventure-inside-my-computer', title: 'The Adventure Inside My Computer', category: 'Education', bgColor: '#0c0a09', accentColor: '#4ade80', emoji: '💻', pattern: 'circuit' },
  { slug: 'kemi-and-the-secret-garden', title: 'Kemi and the Secret Garden', category: 'Nature', bgColor: '#14532d', accentColor: '#86efac', emoji: '🌸', pattern: 'petals' },
  { slug: 'why-does-the-rain-fall', title: 'Why Does the Rain Fall?', category: 'Science', bgColor: '#1e3a5f', accentColor: '#93c5fd', emoji: '🌧️', pattern: 'rain' },
  { slug: 'the-boy-who-befriended-numbers', title: 'The Boy Who Befriended Numbers', category: 'Education', bgColor: '#312e81', accentColor: '#fcd34d', emoji: '🔢', pattern: 'numbers' },
  { slug: 'nias-big-idea', title: "Nia's Big Idea", category: 'Entrepreneurship', bgColor: '#7c2d12', accentColor: '#fdba74', emoji: '💡', pattern: 'burst' },
  { slug: 'the-kindness-jar', title: 'The Kindness Jar', category: 'Friendship', bgColor: '#701a75', accentColor: '#f9a8d4', emoji: '💝', pattern: 'hearts' },
  { slug: 'chidis-trip-to-space', title: "Chidi's Trip to Space", category: 'Science', bgColor: '#020617', accentColor: '#c4b5fd', emoji: '🚀', pattern: 'space' },
  { slug: 'the-village-that-saved-water', title: 'The Village That Saved Water', category: 'Environment', bgColor: '#164e63', accentColor: '#67e8f9', emoji: '💧', pattern: 'water' },
  { slug: 'maya-and-the-brave-little-seed', title: 'Maya and the Brave Little Seed', category: 'Nature', bgColor: '#166534', accentColor: '#86efac', emoji: '🌱', pattern: 'sprout' },
  { slug: 'my-first-internet-safety-book', title: 'My First Internet Safety Book', category: 'Technology', bgColor: '#1e293b', accentColor: '#38bdf8', emoji: '🛡️', pattern: 'shield' },
  { slug: 'the-three-friends-and-the-broken-bridge', title: 'The Three Friends and the Broken Bridge', category: 'Friendship', bgColor: '#5b21b6', accentColor: '#c4b5fd', emoji: '🌉', pattern: 'bridge' },
  { slug: 'the-day-i-became-a-young-scientist', title: 'The Day I Became a Young Scientist', category: 'Science', bgColor: '#1e3a5f', accentColor: '#fbbf24', emoji: '🔬', pattern: 'science' },
  { slug: 'amina-learns-to-save', title: 'Amina Learns to Save', category: 'Money Skills', bgColor: '#166534', accentColor: '#fbbf24', emoji: ' piggy', pattern: 'coins' },
  { slug: 'the-mystery-of-rainbow-hill', title: 'The Mystery of Rainbow Hill', category: 'Adventure', bgColor: '#312e81', accentColor: '#fcd34d', emoji: '🌈', pattern: 'rainbow' },
  { slug: 'goodnight-little-explorer', title: 'Goodnight, Little Explorer', category: 'Bedtime', bgColor: '#1e1b4b', accentColor: '#e9d5ff', emoji: '⭐', pattern: 'moon' },
];

function generateCoverSVG(config: CoverConfig): string {
  const width = 600;
  const height = 900;

  // Generate decorative elements based on pattern
  let decorations = '';

  switch (config.pattern) {
    case 'stars':
      decorations = `
        <circle cx="100" cy="200" r="2" fill="${config.accentColor}" opacity="0.7"/>
        <circle cx="500" cy="150" r="3" fill="${config.accentColor}" opacity="0.6"/>
        <circle cx="450" cy="300" r="2" fill="${config.accentColor}" opacity="0.8"/>
        <circle cx="80" cy="400" r="2.5" fill="${config.accentColor}" opacity="0.5"/>
        <circle cx="520" cy="500" r="2" fill="${config.accentColor}" opacity="0.7"/>
        <circle cx="150" cy="600" r="3" fill="${config.accentColor}" opacity="0.6"/>
        <circle cx="480" cy="700" r="2" fill="${config.accentColor}" opacity="0.5"/>
        <circle cx="300" cy="120" r="4" fill="${config.accentColor}" opacity="0.4"/>
      `;
      break;
    case 'gears':
      decorations = `
        <circle cx="80" cy="200" r="30" fill="none" stroke="${config.accentColor}" stroke-width="1.5" opacity="0.3"/>
        <circle cx="80" cy="200" r="15" fill="none" stroke="${config.accentColor}" stroke-width="1" opacity="0.3"/>
        <circle cx="520" cy="350" r="25" fill="none" stroke="${config.accentColor}" stroke-width="1.5" opacity="0.25"/>
        <circle cx="520" cy="350" r="12" fill="none" stroke="${config.accentColor}" stroke-width="1" opacity="0.25"/>
        <rect x="460" y="600" width="60" height="60" rx="8" fill="none" stroke="${config.accentColor}" stroke-width="1" opacity="0.2" transform="rotate(45, 490, 630)"/>
      `;
      break;
    case 'leaves':
      for (let i = 0; i < 8; i++) {
        const x = 80 + Math.random() * 440;
        const y = 100 + Math.random() * 700;
        const r = Math.random() * 360;
        decorations += `<ellipse cx="${x}" cy="${y}" rx="20" ry="10" fill="${config.accentColor}" opacity="0.15" transform="rotate(${r}, ${x}, ${y})"/>`;
      }
      break;
    case 'waves':
      decorations = `
        <path d="M0,250 Q150,220 300,250 T600,250" fill="none" stroke="${config.accentColor}" stroke-width="1" opacity="0.2"/>
        <path d="M0,270 Q150,240 300,270 T600,270" fill="none" stroke="${config.accentColor}" stroke-width="1" opacity="0.15"/>
        <path d="M0,650 Q150,620 300,650 T600,650" fill="none" stroke="${config.accentColor}" stroke-width="1" opacity="0.2"/>
      `;
      break;
    case 'dots':
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 8; col++) {
          decorations += `<circle cx="${70 + col * 65}" cy="${120 + row * 120}" r="2" fill="${config.accentColor}" opacity="0.12"/>`;
        }
      }
      break;
    case 'circuit':
      decorations = `
        <line x1="50" y1="200" x2="200" y2="200" stroke="${config.accentColor}" stroke-width="1" opacity="0.2"/>
        <line x1="200" y1="200" x2="200" y2="350" stroke="${config.accentColor}" stroke-width="1" opacity="0.2"/>
        <line x1="400" y1="600" x2="550" y2="600" stroke="${config.accentColor}" stroke-width="1" opacity="0.2"/>
        <line x1="400" y1="600" x2="400" y2="750" stroke="${config.accentColor}" stroke-width="1" opacity="0.2"/>
        <circle cx="200" cy="200" r="4" fill="${config.accentColor}" opacity="0.3"/>
        <circle cx="400" cy="600" r="4" fill="${config.accentColor}" opacity="0.3"/>
      `;
      break;
    case 'petals':
      for (let i = 0; i < 5; i++) {
        const angle = (i * 72) * Math.PI / 180;
        const x = 300 + Math.cos(angle) * 150;
        const y = 400 + Math.sin(angle) * 150;
        decorations += `<circle cx="${x}" cy="${y}" r="20" fill="${config.accentColor}" opacity="0.1"/>`;
      }
      break;
    case 'rain':
      for (let i = 0; i < 12; i++) {
        const x = 80 + Math.random() * 440;
        const y = 150 + Math.random() * 200;
        decorations += `<line x1="${x}" y1="${y}" x2="${x - 5}" y2="${y + 15}" stroke="${config.accentColor}" stroke-width="1.5" opacity="0.2" stroke-linecap="round"/>`;
      }
      break;
    case 'numbers':
      const nums = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
      for (let i = 0; i < nums.length; i++) {
        const x = 80 + (i % 5) * 110;
        const y = 180 + Math.floor(i / 5) * 250;
        decorations += `<text x="${x}" y="${y}" font-family="Georgia, serif" font-size="28" fill="${config.accentColor}" opacity="0.12">${nums[i]}</text>`;
      }
      break;
    case 'burst':
      for (let i = 0; i < 8; i++) {
        const angle = (i * 45) * Math.PI / 180;
        const x1 = 300 + Math.cos(angle) * 60;
        const y1 = 400 + Math.sin(angle) * 60;
        const x2 = 300 + Math.cos(angle) * 150;
        const y2 = 400 + Math.sin(angle) * 150;
        decorations += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${config.accentColor}" stroke-width="2" opacity="0.15" stroke-linecap="round"/>`;
      }
      break;
    case 'hearts':
      for (let i = 0; i < 6; i++) {
        const x = 80 + Math.random() * 440;
        const y = 150 + Math.random() * 550;
        decorations += `<text x="${x}" y="${y}" font-size="24" opacity="0.15">❤</text>`;
      }
      break;
    case 'space':
      for (let i = 0; i < 15; i++) {
        const x = 50 + Math.random() * 500;
        const y = 100 + Math.random() * 700;
        const r = 1 + Math.random() * 2;
        decorations += `<circle cx="${x}" cy="${y}" r="${r}" fill="white" opacity="${0.2 + Math.random() * 0.3}"/>`;
      }
      break;
    case 'water':
      for (let i = 0; i < 6; i++) {
        const x = 100 + Math.random() * 400;
        const y = 200 + Math.random() * 500;
        decorations += `
          <ellipse cx="${x}" cy="${y}" rx="25" ry="12" fill="none" stroke="${config.accentColor}" stroke-width="1" opacity="0.15"/>
          <ellipse cx="${x}" cy="${y + 20}" rx="35" ry="15" fill="none" stroke="${config.accentColor}" stroke-width="0.8" opacity="0.1"/>
        `;
      }
      break;
    case 'sprout':
      decorations = `
        <path d="M280,650 Q280,550 300,500 Q320,550 320,650" fill="${config.accentColor}" opacity="0.15"/>
        <ellipse cx="270" cy="490" rx="25" ry="18" fill="${config.accentColor}" opacity="0.12" transform="rotate(-30, 270, 490)"/>
        <ellipse cx="330" cy="480" rx="25" ry="18" fill="${config.accentColor}" opacity="0.12" transform="rotate(30, 330, 480)"/>
      `;
      break;
    case 'shield':
      decorations = `
        <path d="M300,180 L380,220 L380,320 Q380,400 300,440 Q220,400 220,320 L220,220 Z" fill="none" stroke="${config.accentColor}" stroke-width="2" opacity="0.2"/>
      `;
      break;
    case 'bridge':
      decorations = `
        <path d="M80,600 Q200,500 300,500 Q400,500 520,600" fill="none" stroke="${config.accentColor}" stroke-width="2" opacity="0.2"/>
        <line x1="180" y1="520" x2="180" y2="600" stroke="${config.accentColor}" stroke-width="1.5" opacity="0.15"/>
        <line x1="300" y1="500" x2="300" y2="600" stroke="${config.accentColor}" stroke-width="1.5" opacity="0.15"/>
        <line x1="420" y1="520" x2="420" y2="600" stroke="${config.accentColor}" stroke-width="1.5" opacity="0.15"/>
      `;
      break;
    case 'science':
      decorations = `
        <circle cx="300" cy="350" r="60" fill="none" stroke="${config.accentColor}" stroke-width="1" opacity="0.15"/>
        <circle cx="300" cy="350" r="100" fill="none" stroke="${config.accentColor}" stroke-width="0.8" opacity="0.1"/>
        <circle cx="360" cy="320" r="8" fill="${config.accentColor}" opacity="0.15"/>
        <circle cx="250" cy="380" r="6" fill="${config.accentColor}" opacity="0.12"/>
      `;
      break;
    case 'coins':
      for (let i = 0; i < 5; i++) {
        const x = 200 + Math.random() * 200;
        const y = 350 + i * 40;
        decorations += `<circle cx="${x}" cy="${y}" r="20" fill="none" stroke="${config.accentColor}" stroke-width="1.5" opacity="0.15"/>`;
      }
      break;
    case 'rainbow':
      const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#6366f1', '#a855f7'];
      for (let i = 0; i < colors.length; i++) {
        const r = 200 + i * 20;
        decorations += `<circle cx="300" cy="450" r="${r}" fill="none" stroke="${colors[i]}" stroke-width="2" opacity="0.08" clip-path="url(#half)"/>`;
      }
      break;
    case 'moon':
      decorations = `
        <circle cx="300" cy="200" r="50" fill="${config.accentColor}" opacity="0.15"/>
        <circle cx="315" cy="190" r="40" fill="${config.bgColor}"/>
        <circle cx="400" cy="160" r="2" fill="${config.accentColor}" opacity="0.4"/>
        <circle cx="200" cy="180" r="1.5" fill="${config.accentColor}" opacity="0.3"/>
        <circle cx="420" cy="220" r="2.5" fill="${config.accentColor}" opacity="0.35"/>
      `;
      break;
  }

  // Word wrap title
  const titleLines: string[] = [];
  const maxCharsPerLine = 18;
  const words = config.title.split(' ');
  let currentLine = '';
  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length > maxCharsPerLine) {
      if (currentLine) titleLines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = currentLine ? currentLine + ' ' + word : word;
    }
  }
  if (currentLine) titleLines.push(currentLine);

  const titleText = titleLines
    .map((line, i) => `<tspan x="300" dy="${i === 0 ? 0 : 36}">${line}</tspan>`)
    .join('');

  const titleY = 480 - (titleLines.length - 1) * 18;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="${config.bgColor}"/>

  <!-- Gradient overlay -->
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${config.accentColor};stop-opacity:0.15"/>
      <stop offset="100%" style="stop-color:${config.bgColor};stop-opacity:0"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#grad)"/>

  <!-- Decorations -->
  ${decorations}

  <!-- Category -->
  <text x="300" y="100" font-family="Georgia, serif" font-size="14" fill="${config.accentColor}" text-anchor="middle" letter-spacing="3" opacity="0.7">${config.category.toUpperCase()}</text>

  <!-- Emoji -->
  <text x="300" y="340" font-size="80" text-anchor="middle" opacity="0.9">${config.emoji}</text>

  <!-- Title -->
  <text x="300" y="${titleY}" font-family="Georgia, 'Times New Roman', serif" font-size="32" fill="white" text-anchor="middle" font-weight="bold">
    ${titleText}
  </text>

  <!-- Divider -->
  <line x1="250" y1="${titleY + titleLines.length * 36 + 20}" x2="350" y2="${titleY + titleLines.length * 36 + 20}" stroke="${config.accentColor}" stroke-width="2" opacity="0.5"/>

  <!-- Author -->
  <text x="300" y="${titleY + titleLines.length * 36 + 55}" font-family="Georgia, serif" font-size="13" fill="white" text-anchor="middle" opacity="0.6">LittleReads Editorial Team</text>

  <!-- Brand -->
  <rect x="0" y="840" width="${width}" height="60" fill="black" opacity="0.3"/>
  <text x="300" y="875" font-family="Georgia, serif" font-size="16" fill="${config.accentColor}" text-anchor="middle" font-weight="bold" letter-spacing="2">LITTLEREADS</text>
</svg>`;
}

async function generateAllCovers() {
  fs.mkdirSync(COVERS_DIR, { recursive: true });

  console.log('Generating 20 book covers...\n');
  console.log('TITLE | FILE | STATUS');
  console.log('------|------|--------');

  for (const cover of covers) {
    try {
      const svg = generateCoverSVG(cover);
      const outputPath = path.join(COVERS_DIR, `${cover.slug}.svg`);
      fs.writeFileSync(outputPath, svg);

      const stats = fs.statSync(outputPath);
      const sizeKB = Math.round(stats.size / 1024);
      console.log(`${cover.title} | ${cover.slug}.svg | PASS (${sizeKB}KB)`);
    } catch (error) {
      console.log(`${cover.title} | ERROR | FAIL`);
      console.error(error);
    }
  }

  console.log(`\n✅ Generated ${covers.length} covers`);
  console.log(`Covers saved to ${COVERS_DIR}`);
}

generateAllCovers().catch(console.error);
