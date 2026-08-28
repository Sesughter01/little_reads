import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const BOOKS_DIR = path.join(process.cwd(), 'generated', 'ebooks');

interface BookStory {
  slug: string;
  title: string;
  author: string;
  ageRange: string;
  category: string;
  copyrightYear: number;
  story: StorySection[];
  learningReflection: string[];
  discussionQuestions: string[];
}

interface StorySection {
  heading?: string;
  paragraphs: string[];
}

const books: BookStory[] = [
  {
    slug: 'zara-and-the-missing-moonbeam',
    title: 'Zara and the Missing Moonbeam',
    author: 'LittleReads Editorial Team',
    ageRange: 'Ages 5–7',
    category: 'Adventure',
    copyrightYear: 2026,
    story: [
      {
        paragraphs: [
          'Every evening, when the sky turned the colour of ripe mangoes, a single beam of moonlight would land right in the middle of the magical garden of Nkemdilim. The flowers would open their petals wider, the fireflies would dance, and everything felt safe and warm.',
          'But one evening, the moonbeam did not come.',
        ],
      },
      {
        heading: 'Chapter 1: The Missing Light',
        paragraphs: [
          'Zara noticed it first. She was sitting on the old stone bench with her grandmother, watching the sky, when the garden grew dimmer than usual.',
          '"Mama Nkechi," Zara whispered. "Where is the moonbeam?"',
          'Her grandmother looked up. The moon was there, round and bright, but its light seemed to miss the garden entirely.',
          '"Hmm," said Mama Nkechi, stroking her chin. "That has never happened before. Perhaps the moonbeam has lost its way."',
          'Zara looked at the garden — the flowers drooping slightly, the fireflies confused, the little pond reflecting only darkness. Something had to be done.',
          '"I will find it," said Zara, standing up with determination.',
          'Mama Nkechi smiled. "Then you will need courage, patience, and a good pair of walking shoes."',
        ],
      },
      {
        heading: 'Chapter 2: The Path of Stars',
        paragraphs: [
          'Zara packed a small bag with water, a biscuit, and a little torch — just in case. She kissed her grandmother goodbye and stepped onto the path that wound through the Whispering Woods.',
          'The path was lit by stars overhead, but it was darker than Zara expected. Branches reached out like gentle fingers, and owls hooted softly in the distance.',
          '"Do not be afraid," Zara told herself. "The moonbeam needs me."',
          'After walking for a while, she came to a fork in the road. One path went left, toward the river. The other went right, toward the mountains.',
          'Zara stopped. Which way would a moonbeam go?',
          'Then she noticed something. On the left path, she could see the faintest silver glimmer on the leaves. It was very small, but it was there.',
          '"That way," she said, and followed the silver traces.',
        ],
      },
      {
        heading: 'Chapter 3: The Wise Tortoise',
        paragraphs: [
          'The silver traces led Zara to the banks of the Whispering River. There, sitting on a rock as still as a statue, was an old tortoise.',
          '"Good evening, child," said the tortoise, without moving. "You look like someone on a quest."',
          '"I am looking for the moonbeam," said Zara. "Have you seen it?"',
          'The tortoise blinked slowly. "I have seen many things. I have seen rivers change course and mountains grow old. But I have never seen a lost moonbeam."',
          'Zara felt disappointed, but the tortoise continued.',
          '"However, I did see a strange silver light cross the river about an hour ago. It went toward the Meadow of Echoes."',
          '"What is the Meadow of Echoes?" Zara asked.',
          '"It is a place where things go when they are confused," said the tortoise. "Things that have lost their purpose sometimes wander there, waiting to be found."',
          '"Then that is where I must go," said Zara.',
          'The tortoise nodded. "You are brave for your age. But remember — the answer you seek may not be what you expect."',
          'Zara thanked the tortoise and crossed the river on the stepping stones, the water silver beneath her feet.',
        ],
      },
      {
        heading: 'Chapter 4: The Meadow of Echoes',
        paragraphs: [
          'The Meadow of Echoes was beautiful but strange. The grass was soft and blue-grey, and the air was filled with gentle whispers — echoes of laughter, echoes of songs, echoes of things half-remembered.',
          'In the middle of the meadow, Zara saw a small light flickering. It was not as bright as the moonbeam should be. It seemed tired.',
          'Zara walked toward it slowly. As she got closer, the light pulsed gently.',
          '"Hello?" Zara said softly. "Are you the moonbeam?"',
          'The light wobbled. Then, in a voice like wind chimes, it said, "I am. But I am not lost. I am tired."',
          '"Tired?" asked Zara, sitting down on the grass.',
          '"Every night, I travel from the moon to your garden. I have done this for hundreds of years. But tonight, I felt so heavy. I could not make the journey."',
          'Zara thought about this. "Why do you travel to our garden every night?"',
          '"Because the garden needs me. And because your grandmother sits there every evening, and the moonbeam makes her smile. I do it for the smiles."',
          'Zara\'s heart felt warm. "That is the kindest thing I have ever heard."',
        ],
      },
      {
        heading: 'Chapter 5: The Journey Home',
        paragraphs: [
          'Zara sat with the moonbeam for a while. She told it about Mama Nkechi, about the flowers in the garden, about the fireflies that danced every night.',
          'As she spoke, the moonbeam began to glow brighter. Each word of gratitude, each story of joy, seemed to fill it with energy.',
          '"I think," said the moonbeam, "that I just needed to remember why I make the journey."',
          'Zara smiled. "Then let me help you remember every night."',
          'She held out her hands, and the moonbeam floated gently into her palms. It was warm, like holding sunshine.',
          'Together, they walked back through the meadow, across the river, and through the Whispering Woods. Zara talked the whole way — about flowers, about her grandmother, about the simple joys of home.',
          'By the time they reached the garden, the moonbeam was shining brighter than ever.',
        ],
      },
      {
        heading: 'Chapter 6: Home Again',
        paragraphs: [
          'The moonbeam landed in the centre of the garden, and suddenly everything came alive. The flowers opened wider, the fireflies danced, and the little pond sparkled with silver light.',
          'Mama Nkechi looked up from her bench and smiled.',
          '"You found it," she said.',
          '"It was tired, Mama. It just needed to remember why it comes."',
          'Her grandmother pulled her close. "That is a lesson for all of us, Zara. Sometimes we forget our reasons. And sometimes, all we need is someone to remind us."',
          'Zara sat on the bench beside her grandmother, watching the moonbeam dance across the garden. The fireflies joined in, and the flowers hummed softly.',
          'And every evening after that, Zara would sit in the garden and whisper a small thank you to the moonbeam — just in case it ever forgot again.',
        ],
      },
    ],
    learningReflection: [
      'Zara showed courage by going on a quest alone at night.',
      'She used her problem-solving skills to follow the silver traces.',
      'The tortoise taught her that answers are sometimes different from what we expect.',
      'Most importantly, the moonbeam was healed by kindness and gratitude.',
    ],
    discussionQuestions: [
      'Have you ever been brave even when you were a little scared?',
      'Why do you think remembering why we do things is important?',
      'How can you show gratitude to the people who help you?',
      'If you could help someone remember their purpose, how would you do it?',
    ],
  },
];

function createBookPDF(book: BookStory, outputPath: string) {
  const doc = new PDFDocument({
    size: 'A5',
    margins: {
      top: 60,
      bottom: 60,
      left: 50,
      right: 50,
    },
    info: {
      Title: book.title,
      Author: book.author,
      Subject: `Children's eBook - ${book.category} - ${book.ageRange}`,
      Creator: 'LittleReads eBook Generator',
    },
  });

  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  // ---- Cover Page ----
  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#7C3AED');

  doc.fontSize(10).fill('#ffffff').text('LittleReads', 50, 80, { align: 'center' });
  doc.fontSize(24).fill('#ffffff').text(book.title, 50, 160, {
    align: 'center',
    width: doc.page.width - 100,
  });
  doc.fontSize(12).fill('#ffffff').text(book.category, 50, 240, { align: 'center' });
  doc.fontSize(10).fill('#ffffff').text(book.ageRange, 50, 270, { align: 'center' });
  doc.fontSize(10).fill('#ffffff').text(`by ${book.author}`, 50, 340, { align: 'center' });
  doc.addPage();

  // ---- Title Page ----
  doc.fontSize(10).fill('#666666').text('LittleReads', 50, 100, { align: 'center' });
  doc.moveDown(3);
  doc.fontSize(20).fill('#333333').text(book.title, 50, undefined, {
    align: 'center',
    width: doc.page.width - 100,
  });
  doc.moveDown(1);
  doc.fontSize(12).fill('#666666').text(`by ${book.author}`, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).fill('#999999').text(book.ageRange, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).fill('#999999').text(book.category, { align: 'center' });
  doc.addPage();

  // ---- Copyright Page ----
  doc.fontSize(8).fill('#999999');
  doc.text(`© ${book.copyrightYear} LittleReads Publishing`, 50, 100, { align: 'center' });
  doc.moveDown(0.5);
  doc.text('All rights reserved.', { align: 'center' });
  doc.moveDown(0.5);
  doc.text('No part of this publication may be reproduced, distributed, or transmitted', { align: 'center' });
  doc.moveDown(0.3);
  doc.text('in any form without prior written permission.', { align: 'center' });
  doc.moveDown(1);
  doc.text(`First Edition: ${book.copyrightYear}`, { align: 'center' });
  doc.moveDown(0.5);
  doc.text('Published by LittleReads Publishing', { align: 'center' });
  doc.moveDown(0.5);
  doc.text('www.littlereads.com', { align: 'center' });
  doc.addPage();

  // ---- Story Pages ----
  let pageNum = 5;

  for (const section of book.story) {
    if (section.heading) {
      doc.fontSize(14).fill('#7C3AED').text(section.heading, 50, 80, {
        width: doc.page.width - 100,
      });
      doc.moveDown(0.5);
    }

    const startY = section.heading ? undefined : 80;

    for (const paragraph of section.paragraphs) {
      doc.fontSize(11).fill('#333333').text(paragraph, 50, startY, {
        width: doc.page.width - 100,
        lineGap: 4,
        align: 'left',
      });
      doc.moveDown(0.8);
    }

    // Page number
    doc.fontSize(8).fill('#999999').text(`${pageNum}`, 50, doc.page.height - 40, {
      align: 'center',
      width: doc.page.width - 100,
    });

    doc.addPage();
    pageNum++;
  }

  // ---- Learning Reflection ----
  doc.fontSize(14).fill('#7C3AED').text('What We Learned', 50, 80, {
    width: doc.page.width - 100,
  });
  doc.moveDown(0.5);

  for (const point of book.learningReflection) {
    doc.fontSize(10).fill('#333333').text(`• ${point}`, 60, undefined, {
      width: doc.page.width - 120,
      lineGap: 3,
    });
    doc.moveDown(0.3);
  }

  doc.addPage();

  // ---- Discussion Questions ----
  doc.fontSize(14).fill('#7C3AED').text('Discussion Questions', 50, 80, {
    width: doc.page.width - 100,
  });
  doc.moveDown(0.5);

  for (let i = 0; i < book.discussionQuestions.length; i++) {
    doc.fontSize(10).fill('#333333').text(`${i + 1}. ${book.discussionQuestions[i]}`, 60, undefined, {
      width: doc.page.width - 120,
      lineGap: 3,
    });
    doc.moveDown(0.5);
  }

  doc.addPage();

  // ---- End Page ----
  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#FFF8F0');
  doc.fontSize(10).fill('#7C3AED').text('LittleReads', 50, 100, { align: 'center' });
  doc.moveDown(1);
  doc.fontSize(14).fill('#333333').text('Thank you for reading!', 50, undefined, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).fill('#666666').text('Big Adventures for Little Readers', { align: 'center' });
  doc.moveDown(1);
  doc.fontSize(10).fill('#999999').text('www.littlereads.com', { align: 'center' });

  doc.end();

  return new Promise<void>((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

async function generateAllEbooks() {
  // Ensure output directory exists
  fs.mkdirSync(BOOKS_DIR, { recursive: true });

  console.log('Generating 20 ebooks...\n');
  console.log('TITLE | PAGES | STATUS');
  console.log('------|-------|--------');

  for (const book of books) {
    const outputPath = path.join(BOOKS_DIR, `${book.slug}.pdf`);
    try {
      await createBookPDF(book, outputPath);
      const stats = fs.statSync(outputPath);
      const sizeKB = Math.round(stats.size / 1024);
      console.log(`${book.title} | ${book.story.length + 4}pp | PASS (${sizeKB}KB)`);
    } catch (error) {
      console.log(`${book.title} | ERROR | FAIL`);
      console.error(error);
    }
  }

  console.log('\n✅ Ebook generation complete!');
  console.log(`Generated ${books.length} ebooks in ${BOOKS_DIR}`);
}

generateAllEbooks().catch(console.error);
