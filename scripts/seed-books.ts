import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { booksMetadata, sampleReviews } from '../content/books-metadata';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedBooks() {
  console.log('Seeding 20 books to Supabase...\n');

  // Get or create categories
  const categoryMap: Record<string, string> = {};

  const categories = await supabase.from('categories').select('id, slug');
  if (categories.data) {
    for (const cat of categories.data) {
      categoryMap[cat.slug] = cat.id;
    }
  }

  console.log(`Found ${Object.keys(categoryMap).length} categories`);

  // Seed books
  console.log('\nTITLE | CATEGORY | PRICE | STATUS');
  console.log('------|----------|-------|--------');

  const productIds: Record<string, string> = {};

  for (const book of booksMetadata) {
    try {
      // Check if product already exists
      const existing = await supabase
        .from('products')
        .select('id')
        .eq('slug', book.slug)
        .single();

      if (existing.data) {
        productIds[book.slug] = existing.data.id;
        console.log(`${book.title} | ${book.category} | ₦${book.price} | EXISTS`);
        continue;
      }

      // Upload cover if file exists
      let coverUrl = '';
      const coverPath = path.join(process.cwd(), book.cover_path);
      if (fs.existsSync(coverPath)) {
        const coverFile = fs.readFileSync(coverPath);
        const { data: coverData, error: coverError } = await supabase.storage
          .from('ebook-covers')
          .upload(`${book.slug}.svg`, coverFile, { contentType: 'image/svg+xml', upsert: true });

        if (!coverError && coverData) {
          const { data: urlData } = supabase.storage
            .from('ebook-covers')
            .getPublicUrl(coverData.path);
          coverUrl = urlData.publicUrl;
        }
      }

      // Upload PDF if file exists
      let pdfPath = '';
      const pdfFilePath = path.join(process.cwd(), book.pdf_path);
      if (fs.existsSync(pdfFilePath)) {
        const pdfFile = fs.readFileSync(pdfFilePath);
        const { data: pdfData, error: pdfError } = await supabase.storage
          .from('ebook-files')
          .upload(`${book.slug}.pdf`, pdfFile, { contentType: 'application/pdf', upsert: true });

        if (!pdfError && pdfData) {
          pdfPath = pdfData.path;
        }
      }

      // Insert product
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          title: book.title,
          slug: book.slug,
          author: book.author,
          short_description: book.short_description,
          description: book.description,
          price: book.price,
          cover_url: coverUrl,
          pdf_path: pdfPath,
          age_min: book.age_min,
          age_max: book.age_max,
          reading_level: book.reading_level,
          page_count: book.page_count,
          reading_time: book.reading_time,
          category_id: categoryMap[book.category_slug] || null,
          featured: book.featured,
          published: true,
        })
        .select()
        .single();

      if (productError) {
        console.log(`${book.title} | ${book.category} | ₦${book.price} | ERROR: ${productError.message}`);
        continue;
      }

      productIds[book.slug] = product.id;

      // Insert learning outcomes
      if (book.learning_outcomes.length > 0) {
        const outcomes = book.learning_outcomes.map((outcome, index) => ({
          product_id: product.id,
          outcome,
          sort_order: index,
        }));
        await supabase.from('product_learning_outcomes').insert(outcomes);
      }

      // Insert keywords
      if (book.keywords.length > 0) {
        const keywords = book.keywords.map((keyword) => ({
          product_id: product.id,
          keyword,
        }));
        await supabase.from('product_keywords').insert(keywords);
      }

      console.log(`${book.title} | ${book.category} | ₦${book.price} | PASS`);
    } catch (error) {
      console.log(`${book.title} | ERROR | FAIL`);
      console.error(error);
    }
  }

  // Seed sample reviews (demo data)
  console.log('\nSeeding sample reviews (demo data)...');

  // Get a demo user or skip reviews if no user
  const { data: users } = await supabase.auth.admin.listUsers();
  const demoUser = users?.users?.[0];

  if (demoUser) {
    for (const review of sampleReviews) {
      const productId = productIds[review.book_slug];
      if (!productId) continue;

      // Skip if review already exists
      const { data: existing } = await supabase
        .from('reviews')
        .select('id')
        .eq('product_id', productId)
        .eq('user_id', demoUser.id)
        .single();

      if (existing) continue;

      await supabase.from('reviews').insert({
        product_id: productId,
        user_id: demoUser.id,
        rating: review.rating,
        title: review.title,
        content: review.content,
        verified_purchase: true,
        status: 'approved',
      });
    }
    console.log('Sample reviews seeded');
  } else {
    console.log('No users found - skipping reviews (create a user first)');
  }

  console.log('\n✅ Seeding complete!');
}

seedBooks().catch(console.error);
