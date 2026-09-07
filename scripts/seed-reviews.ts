import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://ulplkgswaxalclaynncf.supabase.co';
const envContent = fs.readFileSync('.env.local', 'utf8');
const serviceKey = envContent.split('\n').find(l => l.startsWith('SUPABASE_SERVICE_ROLE_KEY='))!.split('=').slice(1).join('=');
const supabase = createClient(supabaseUrl, serviceKey);

const demoUserId = '66a94ef5-46ae-47b1-a37c-8cec10f06318';

const reviews = [
  { book_slug: 'zara-and-the-missing-moonbeam', rating: 5, title: 'My daughter loves this!', content: 'We read this every night. The story is gentle and beautiful. Zara is a wonderful role model.' },
  { book_slug: 'zara-and-the-missing-moonbeam', rating: 4, title: 'Great bedtime story', content: 'Nice story with a good message about problem solving. My son asks to read it again and again.' },
  { book_slug: 'tobis-amazing-robot', rating: 5, title: 'Inspired my son to build!', content: 'After reading this, my son started building robots from cardboard boxes. Educational and fun!' },
  { book_slug: 'tobis-amazing-robot', rating: 5, title: 'Perfect for young inventors', content: 'My students loved this book. It makes engineering feel accessible and exciting for children.' },
  { book_slug: 'amara-and-the-talking-baobab', rating: 5, title: 'Beautiful African tale', content: 'Finally, a children\'s book that celebrates African stories. My children love the wisdom of the baobab.' },
  { book_slug: 'adas-first-day-of-school', rating: 5, title: 'Helped with my daughter\'s anxiety', content: 'My daughter was so nervous about starting school. This book helped her feel brave. Highly recommend.' },
  { book_slug: 'the-kindness-jar', rating: 4, title: 'Lovely message', content: 'A simple but powerful story. We started our own kindness jar at home after reading this.' },
  { book_slug: 'chidis-trip-to-space', rating: 5, title: 'Now he wants to be an astronaut', content: 'My son asks about planets every day now. The space facts are presented in a fun, easy way.' },
  { book_slug: 'goodnight-little-explorer', rating: 5, title: 'Perfect bedtime story', content: 'The perfect length and tone for bedtime. My daughter falls asleep smiling every time.' },
  { book_slug: 'goodnight-little-explorer', rating: 4, title: 'Calm and sweet', content: 'Gentle story that helps my children wind down. The illustrations in our imagination are wonderful.' },
  { book_slug: 'my-first-internet-safety-book', rating: 5, title: 'Essential reading', content: 'Every parent should read this with their child. It covers online safety without being scary.' },
  { book_slug: 'my-first-internet-safety-book', rating: 5, title: 'Important for today\'s kids', content: 'Finally a book that teaches internet safety in a way children understand. Well written.' },
  { book_slug: 'the-mystery-of-rainbow-hill', rating: 4, title: 'Fun mystery story', content: 'My daughter loved solving the clues along with Tolu and Sam. Great for developing logical thinking.' },
  { book_slug: 'amina-learns-to-save', rating: 5, title: 'Changed our pocket money routine', content: 'Now Amina saves her pocket money wisely. Great financial literacy for children.' },
  { book_slug: 'the-village-that-saved-water', rating: 4, title: 'Important environmental message', content: 'Teaches water conservation in a way that is relevant for African children. Well done.' },
];

async function seedReviews() {
  let inserted = 0;
  let skipped = 0;

  const { data: products } = await supabase.from('products').select('id, slug');
  const slugToId: Record<string, string> = {};
  if (products) {
    for (const p of products) slugToId[p.slug] = p.id;
  }

  for (const review of reviews) {
    const productId = slugToId[review.book_slug];
    if (!productId) { skipped++; continue; }

    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('product_id', productId)
      .eq('user_id', demoUserId)
      .single();

    if (existing) { skipped++; continue; }

    const { error } = await supabase.from('reviews').insert({
      product_id: productId,
      user_id: demoUserId,
      rating: review.rating,
      title: review.title,
      content: review.content,
      verified_purchase: true,
      status: 'approved',
    });

    if (error) {
      console.log(`ERROR: ${review.title} - ${error.message}`);
    } else {
      inserted++;
    }
  }

  console.log(`Reviews: ${inserted} inserted, ${skipped} skipped`);
}

seedReviews().catch(console.error);
