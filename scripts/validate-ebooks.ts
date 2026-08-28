import fs from 'fs';
import path from 'path';
import { booksMetadata } from '../content/books-metadata';

const COVERS_DIR = path.join(process.cwd(), 'generated', 'covers');
const PDFS_DIR = path.join(process.cwd(), 'generated', 'ebooks');

interface ValidationRow {
  title: string;
  metadata: boolean;
  cover: boolean;
  coverSize: string;
  pdf: boolean;
  pdfSize: string;
  validPdf: boolean;
  wordCount: number;
  price: number;
  category: string;
  ageRange: string;
  slug: string;
  status: string;
  issues: string[];
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

function isValidPdfBuffer(buffer: Buffer): boolean {
  // Check PDF magic bytes: %PDF
  return buffer.length > 4 &&
    buffer[0] === 0x25 && // %
    buffer[1] === 0x50 && // P
    buffer[2] === 0x44 && // D
    buffer[3] === 0x46;   // F
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
  return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
}

function validateAll(): ValidationRow[] {
  const results: ValidationRow[] = [];

  for (const book of booksMetadata) {
    const issues: string[] = [];

    // Check metadata
    const hasMetadata = !!(book.title && book.slug && book.price > 0 && book.category && book.age_min && book.age_max);

    // Check cover
    const coverPath = path.join(COVERS_DIR, `${book.slug}.svg`);
    let coverExists = fs.existsSync(coverPath);
    let coverSize = 'N/A';
    if (coverExists) {
      const coverStat = fs.statSync(coverPath);
      coverSize = formatBytes(coverStat.size);
      if (coverStat.size === 0) {
        issues.push('Cover is empty');
      }
      // Check SVG is valid
      const coverContent = fs.readFileSync(coverPath, 'utf-8');
      if (!coverContent.includes('<svg') || !coverContent.includes('</svg>')) {
        issues.push('Cover SVG invalid');
      }
    } else {
      issues.push('Cover missing');
    }

    // Check PDF
    const pdfPath = path.join(PDFS_DIR, `${book.slug}.pdf`);
    let pdfExists = fs.existsSync(pdfPath);
    let pdfSize = 'N/A';
    let validPdf = false;
    let wordCount = 0;

    if (pdfExists) {
      const pdfStat = fs.statSync(pdfPath);
      pdfSize = formatBytes(pdfStat.size);
      if (pdfStat.size === 0) {
        issues.push('PDF is empty');
      }
      const pdfBuffer = fs.readFileSync(pdfPath);
      validPdf = isValidPdfBuffer(pdfBuffer);
      if (!validPdf) {
        issues.push('PDF header invalid (not a real PDF)');
      }
    } else {
      issues.push('PDF missing');
    }

    // Count words in description (manuscript proxy)
    wordCount = countWords(book.description);

    // Check unique slug
    const slugs = booksMetadata.map(b => b.slug);
    const duplicateSlugs = slugs.filter(s => s === book.slug);
    if (duplicateSlugs.length > 1) {
      issues.push('Duplicate slug');
    }

    // Determine status
    let status = 'PASS';
    if (!hasMetadata) status = 'FAIL - metadata';
    else if (!coverExists) status = 'FAIL - cover';
    else if (!pdfExists) status = 'FAIL - pdf';
    else if (!validPdf) status = 'FAIL - pdf invalid';
    else if (issues.length > 0) status = 'WARN';

    results.push({
      title: book.title,
      metadata: hasMetadata,
      cover: coverExists,
      coverSize,
      pdf: pdfExists,
      pdfSize,
      validPdf,
      wordCount,
      price: book.price,
      category: book.category,
      ageRange: `${book.age_min}-${book.age_max}`,
      slug: book.slug,
      status,
      issues,
    });
  }

  return results;
}

// Main
const results = validateAll();

console.log('\n=== LITTLEREADS EBOOK VALIDATION REPORT ===\n');

// Summary
const passCount = results.filter(r => r.status === 'PASS').length;
const warnCount = results.filter(r => r.status === 'WARN').length;
const failCount = results.filter(r => r.status.startsWith('FAIL')).length;

console.log(`TOTAL: ${results.length} | PASS: ${passCount} | WARN: ${warnCount} | FAIL: ${failCount}\n`);

// Table header
console.log('TITLE | META | COVER | COVER SZ | PDF | PDF SZ | VALID | WORDS | PRICE | CATEGORY | AGE | STATUS');
console.log('------|------|-------|----------|-----|--------|-------|-------|-------|----------|-----|--------');

for (const r of results) {
  console.log(
    `${r.title.substring(0, 40).padEnd(40)} | ` +
    `${r.metadata ? '✅' : '❌'} | ` +
    `${r.cover ? '✅' : '❌'} | ` +
    `${r.coverSize.padEnd(8)} | ` +
    `${r.pdf ? '✅' : '❌'} | ` +
    `${r.pdfSize.padEnd(7)} | ` +
    `${r.validPdf ? '✅' : '❌'} | ` +
    `${String(r.wordCount).padStart(5)} | ` +
    `₦${String(r.price).padStart(5)} | ` +
    `${r.category.padEnd(18)} | ` +
    `${r.ageRange} | ` +
    `${r.status}`
  );
}

// Issues
const issuesFound = results.filter(r => r.issues.length > 0);
if (issuesFound.length > 0) {
  console.log('\n=== ISSUES ===');
  for (const r of issuesFound) {
    console.log(`${r.title}: ${r.issues.join(', ')}`);
  }
}

// Duplicate slug check
const slugs = results.map(r => r.slug);
const uniqueSlugs = new Set(slugs);
console.log(`\n=== SLUG CHECK ===`);
console.log(`Unique slugs: ${uniqueSlugs.size}/${slugs.length}`);
if (uniqueSlugs.size !== slugs.length) {
  console.log('WARNING: Duplicate slugs found!');
}

// Word count summary
const totalWords = results.reduce((sum, r) => sum + r.wordCount, 0);
console.log(`\n=== MANUSCRIPT WORD COUNTS ===`);
console.log(`Total description words across all books: ${totalWords}`);
for (const r of results) {
  console.log(`  ${r.title}: ~${r.wordCount} words (description only; full manuscripts in PDFs)`);
}
