import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const BOOKS_DIR = path.join(process.cwd(), 'generated', 'ebooks');

interface StorySection {
  heading?: string;
  paragraphs: string[];
}

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

const allBooks: BookStory[] = [
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
          'Then she noticed something. On the left path, she could see the faintest silver glimmer on the leaves. It was very small, but it was there.',
          '"That way," she said, and followed the silver traces.',
        ],
      },
      {
        heading: 'Chapter 3: The Wise Tortoise',
        paragraphs: [
          'The silver traces led Zara to the banks of the Whispering River. There, sitting on a rock as still as a statue, was an old tortoise.',
          '"Good evening, child," said the tortoise. "You look like someone on a quest."',
          '"I am looking for the moonbeam," said Zara. "Have you seen it?"',
          'The tortoise blinked slowly. "I did see a strange silver light cross the river about an hour ago. It went toward the Meadow of Echoes."',
          '"What is the Meadow of Echoes?" Zara asked.',
          '"It is a place where things go when they are confused. Things that have lost their purpose sometimes wander there, waiting to be found."',
          '"Then that is where I must go," said Zara.',
          'The tortoise nodded. "You are brave for your age. But remember — the answer you seek may not be what you expect."',
        ],
      },
      {
        heading: 'Chapter 4: The Meadow of Echoes',
        paragraphs: [
          'The Meadow of Echoes was beautiful but strange. The grass was soft and blue-grey, and the air was filled with gentle whispers — echoes of laughter, echoes of songs, echoes of things half-remembered.',
          'In the middle of the meadow, Zara saw a small light flickering. It was not as bright as the moonbeam should be. It seemed tired.',
          'Zara walked toward it slowly. "Hello? Are you the moonbeam?"',
          'The light wobbled. Then, in a voice like wind chimes, it said, "I am. But I am not lost. I am tired."',
          '"Tired?" asked Zara, sitting down on the grass.',
          '"Every night, I travel from the moon to your garden. I have done this for hundreds of years. But tonight, I felt so heavy. I could not make the journey."',
          'Zara thought about this. "Why do you travel to our garden every night?"',
          '"Because the garden needs me. And because your grandmother sits there every evening, and the moonbeam makes her smile. I do it for the smiles."',
        ],
      },
      {
        heading: 'Chapter 5: The Journey Home',
        paragraphs: [
          'Zara sat with the moonbeam for a while. She told it about Mama Nkechi, about the flowers in the garden, about the fireflies that danced every night.',
          'As she spoke, the moonbeam began to glow brighter. Each word of gratitude, each story of joy, seemed to fill it with energy.',
          '"I think," said the moonbeam, "that I just needed to remember why I make the journey."',
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
      'She used problem-solving skills to follow the silver traces.',
      'The tortoise taught her that answers are sometimes different from what we expect.',
      'The moonbeam was healed by kindness and gratitude.',
    ],
    discussionQuestions: [
      'Have you ever been brave even when you were a little scared?',
      'Why is remembering why we do things important?',
      'How can you show gratitude to people who help you?',
    ],
  },
  {
    slug: 'tobis-amazing-robot',
    title: "Tobi's Amazing Robot",
    author: 'LittleReads Editorial Team',
    ageRange: 'Ages 6–8',
    category: 'Science & Technology',
    copyrightYear: 2026,
    story: [
      {
        paragraphs: [
          'Tobi loved taking things apart. His mother often found bits of old radios, clocks, and toys scattered around his room. "Tobi!" she would call. "What happened to the kitchen timer?"',
          '"I am building something, Mama," he would say.',
          'But most of the time, he did not know what he was building. He just loved the way things fit together inside.',
        ],
      },
      {
        heading: 'Chapter 1: The Science Fair',
        paragraphs: [
          'When Mrs. Adeyemi announced the school science fair, Tobi\'s eyes lit up.',
          '"You can work in pairs or alone," she said. "Build something, grow something, or discover something. Use your imagination!"',
          'Tobi knew exactly what he wanted to build. A robot.',
          'But not just any robot. A robot from recycled materials. A robot that could wave, and blink, and maybe even dance.',
          '"You are going to build a robot?" said his friend Nneka, wide-eyed. "That sounds really hard."',
          '"It will be," said Tobi. "But I think I can do it."',
        ],
      },
      {
        heading: 'Chapter 2: Failed Attempts',
        paragraphs: [
          'Tobi collected everything he could find: old cans, cardboard boxes, bottle caps, wires from a broken earphone, two old buttons, and a small motor from a toy car that no longer worked.',
          'His first attempt was terrible. The body was too heavy and toppled over.',
          'His second attempt fell apart when he tried to attach the arms.',
          'His third attempt worked for about ten seconds before the head popped off and rolled across the floor.',
          'Tobi sat in the middle of his mess and sighed. "Maybe Nneka was right. Maybe this is too hard."',
          'He thought about throwing everything away. But then he remembered something his father always said: "Every expert was once a beginner who did not give up."',
        ],
      },
      {
        heading: 'Chapter 3: A Better Design',
        paragraphs: [
          'The next day, Tobi did something different. Instead of building right away, he drew a plan.',
          'He looked at pictures of real robots. He studied how joints work. He figured out that the body needed to be lighter, so he used a cardboard box instead of a tin can.',
          'He used bottle caps as wheels, and the old earphone wires connected the buttons (eyes) to the small motor (for blinking).',
          'His mother helped him cut some pieces safely. His father helped him tape the wires in place.',
          'Step by step, piece by piece, the robot began to take shape.',
        ],
      },
      {
        heading: 'Chapter 4: Sparks of Life',
        paragraphs: [
          'After three days of building, testing, fixing, and building again, Tobi pressed the battery into place.',
          'For a moment, nothing happened.',
          'Then the motor hummed. The button-eyes blinked. And the robot\'s cardboard arm slowly rose and fell, as if waving hello.',
          'Tobi jumped up and down. "MAMA! MAMA! It works!"',
          'His mother came running. When she saw the robot — lopsided, made of rubbish, but definitely waving — she clapped her hands and laughed.',
          '"Tobi, that is the most beautiful robot I have ever seen."',
        ],
      },
      {
        heading: 'Chapter 5: The Science Fair',
        paragraphs: [
          'On science fair day, Tobi carried his robot proudly to school. It was not as shiny as Nneka\'s volcano. It was not as big as Chidi\'s solar system. But when Tobi turned it on and it waved at the judges, everyone clapped.',
          'Mrs. Adeyemi smiled. "And what is this made of?"',
          '"Recycled materials," said Tobi. "Old cans, cardboard, bottle caps, and wires. Nothing was bought. Everything was reused."',
          'The judges whispered to each other. Then they announced the winner.',
          'Tobi won first place. Not just for the robot, but for the idea behind it — that amazing things can be made from things other people throw away.',
        ],
      },
      {
        heading: 'Chapter 6: Keep Building',
        paragraphs: [
          'That night, Tobi put his first-place ribbon on the shelf next to his robot. He looked at it and smiled.',
          'Then he pulled out more cardboard, more wires, and a new idea. He was already thinking about his next invention.',
          'Because Tobi had learned something important: the best inventions do not come from perfect first attempts. They come from trying, failing, learning, and trying again.',
          'And that is how every amazing thing begins.',
        ],
      },
    ],
    learningReflection: [
      'Tobi learned that failure is a step toward success, not the end.',
      'Drawing a plan before building is smart engineering.',
      'Recycling old materials is good for the environment.',
      'Perseverance and creativity go hand in hand.',
    ],
    discussionQuestions: [
      'Have you ever failed at something but kept trying?',
      'What recycled materials could you use to make something new?',
      'Why is making a plan before starting important?',
    ],
  },
  {
    slug: 'amara-and-the-talking-baobab',
    title: 'Amara and the Talking Baobab',
    author: 'LittleReads Editorial Team',
    ageRange: 'Ages 6–8',
    category: 'African Stories',
    copyrightYear: 2026,
    story: [
      {
        paragraphs: [
          'In the village of Oke-Oye, there stood a baobab tree so old that nobody remembered when it was planted. Its trunk was wide enough for five children to hold hands around, and its branches stretched out like great arms embracing the sky.',
          'The elders said the tree was special. They said it had wisdom. But no one had heard it speak in a very long time.',
        ],
      },
      {
        heading: 'Chapter 1: The Girl Who Listened',
        paragraphs: [
          'Amara was different from the other children in the village. While they ran and played and shouted, Amara liked to sit quietly and listen. She listened to the birds, to the wind, and to the stories her grandmother told in the evenings.',
          '"You have the gift of listening, Amara," her grandmother always said. "Not everyone has that."',
          'One hot afternoon, after helping her grandmother fetch water from the stream, Amara sat beneath the great baobab tree to rest.',
          'She leaned against its rough bark and closed her eyes. The shade was cool, and the air was still.',
          'Then she heard something.',
          'It was not the wind. It was not a bird. It was a deep, slow voice, like the sound of the earth itself speaking.',
          '"Hello, little one."',
        ],
      },
      {
        heading: 'Chapter 2: The Tree Speaks',
        paragraphs: [
          'Amara opened her eyes wide. She looked around. There was no one there. Only the tree.',
          '"Who said hello?" she whispered.',
          '"I did," said the voice. It came from above, from somewhere in the great branches. "I am the Baobab of Oke-Oye. And you are the first person to sit with me quietly enough to hear my voice in many, many years."',
          'Amara was scared at first. But the voice was warm and kind, like her grandfather\'s voice.',
          '"You can really talk?" she said.',
          '"All trees can talk," said the baobab. "But most people are too busy and too loud to listen. You, Amara, are different. You listen."',
          'Amara smiled. She had never felt so special.',
        ],
      },
      {
        heading: 'Chapter 3: The Stories of the Baobab',
        paragraphs: [
          'The baobab told Amara many stories that afternoon. It told her about the village long ago, when there were fewer houses and more trees. It told her about the animals that used to drink from the stream and the birds that nested in its branches.',
          '"I have watched this village grow," said the baobab. "I have seen happy times and hard times. I have seen children grow up and become grandparents. And through it all, I have stood here, giving shade and shelter."',
          '"Do you ever get lonely?" Amara asked.',
          '"Sometimes," said the baobab. "But then someone like you comes and sits with me, and I remember that I am not alone. The village is my family. The earth is my home. And the rain is my friend."',
          '"What can I do for you?" Amara asked.',
          '"Listen," said the baobab. "Just keep listening. To me, to the birds, to the wind, and to the people around you. When you listen, you understand. And when you understand, you can help."',
        ],
      },
      {
        heading: 'Chapter 4: Sharing the Wisdom',
        paragraphs: [
          'Every day after that, Amara visited the baobab. She listened to its stories and shared what she learned with the other children.',
          '"The baobab says the stream is getting smaller," she told them. "We should not throw trash near the water."',
          '"The baobab says the birds are leaving because there are fewer trees," she told the elders. "We should plant more trees."',
          'At first, people did not believe her. A talking tree? That was impossible!',
          'But Amara was patient. She told the stories with such care and detail that slowly, people began to listen. And when they listened, they understood.',
          'The village planted new trees. They cleaned the stream. They built birdhouses in the gardens. And the village of Oke-Oye became greener and happier than it had been in years.',
        ],
      },
      {
        heading: 'Chapter 5: A Gift of Wisdom',
        paragraphs: [
          'One evening, as the sun set over Oke-Oye, Amara sat beneath the baobab for the last time that day.',
          '"Thank you," she said, "for sharing your wisdom with me."',
          '"Thank you for listening," said the baobab. "You have given an old tree a reason to keep talking."',
          'Amara placed her hand on the bark. It felt warm and alive, like the hand of a friend.',
          '"I will always come back," she said.',
          '"I know," said the baobab. "And I will always be here."',
          'Amara walked home through the golden light, her heart full of stories, her ears full of wisdom, and her mind full of the deep, deep knowledge that when you truly listen, the whole world has something to teach you.',
        ],
      },
    ],
    learningReflection: [
      'Listening is a powerful skill that many people forget to use.',
      'Nature has wisdom to share if we are quiet enough to hear it.',
      'Caring for the environment helps everyone in the community.',
      'One person who listens can inspire an entire village to change.',
    ],
    discussionQuestions: [
      'What sounds do you hear when you sit quietly outside?',
      'How can we show respect for nature in our daily lives?',
      'Why do you think people stopped listening to the baobab?',
    ],
  },
  {
    slug: 'the-little-lion-who-learned-to-listen',
    title: 'The Little Lion Who Learned to Listen',
    author: 'LittleReads Editorial Team',
    ageRange: 'Ages 5–7',
    category: 'Life Skills',
    copyrightYear: 2026,
    story: [
      {
        paragraphs: [
          'In the golden savanna of West Africa, there lived a little lion called Leo. Leo had the biggest mane of any cub his age and the loudest roar.',
          'But Leo had a problem. He never listened.',
        ],
      },
      {
        heading: 'Chapter 1: Leo Never Listens',
        paragraphs: [
          '"Leo, do not run near the river!" his mother would call.',
          'But Leo would run anyway. SPLASH! He would fall in, and his mother would have to fish him out.',
          '"Leo, do not eat those red berries!" his teacher would say.',
          'But Leo would eat them anyway. Then his tummy would hurt, and he would miss play time.',
          '"Leo, wait for me!" his friend Zuri would shout.',
          'But Leo would race ahead, leaving Zuri behind.',
          'Everyone told Leo the same thing: "You must learn to listen!"',
          'But Leo never listened to that either.',
        ],
      },
      {
        heading: 'Chapter 2: Trouble at the Waterhole',
        paragraphs: [
          'One morning, Leo\'s mother told him an important story.',
          '"Today, the river is running very fast because of the rain last night. You must stay away from the waterhole, Leo. It is dangerous."',
          'Leo nodded, but he was already thinking about playing near the river with his friends.',
          'Sure enough, Leo went to the waterhole anyway. The water was rushing and swirling, just as his mother had said.',
          '"It does not look so bad," Leo muttered to himself.',
          'He stepped closer. Then closer. Then he reached out a paw to touch the water —',
          'WHOOSH!',
          'The rushing water grabbed his paw and pulled. Leo slipped and fell into the muddy riverbank, stuck in the thick, sticky mud.',
        ],
      },
      {
        heading: 'Chapter 3: Stuck',
        paragraphs: [
          'Leo tried to pull himself out. He pushed with his legs. He scratched with his claws. But the mud held tight.',
          '"Help!" he cried. "Someone help me!"',
          'But his friends had gone home. His mother was far away. The river rushed past, and the mud pulled at him.',
          'Leo felt scared. For the first time, he wished he had listened.',
          'Just then, he heard a slow, deep voice.',
          '"Well, well, well. A little lion in a big pickle."',
          'It was Uncle Hippo, who lived downstream.',
          '"Uncle Hippo! I am stuck!" cried Leo.',
          '"I can see that," said Uncle Hippo. "Did your mother tell you to stay away from the river today?"',
          'Leo lowered his head. "Yes."',
          '"And did you listen?"',
          '"No," whispered Leo.',
        ],
      },
      {
        heading: 'Chapter 4: A Helping Hand (and Hoof)',
        paragraphs: [
          'Uncle Hippo waded into the shallow part of the river and carefully nudged Leo toward the bank. With a mighty push, he freed Leo from the mud.',
          'Leo lay on the dry ground, breathing hard.',
          '"Thank you, Uncle Hippo," he said.',
          '"You are welcome," said Uncle Hippo. "But next time, listen to your mother. Listening is not just about hearing words. It is about caring. When your mother tells you something, she is caring for you."',
          'Leo thought about this. "When I do not listen, it is like I am saying I do not care about what she says?"',
          'Uncle Hippo nodded. "Exactly. And when Zuri asks you to wait, and you race ahead, how do you think she feels?"',
          'Leo remembered the times Zuri had looked sad when he left her behind.',
          '"She probably feels like I do not care about her," said Leo quietly.',
        ],
      },
      {
        heading: 'Chapter 5: Learning to Listen',
        paragraphs: [
          'Leo went home and told his mother everything. He told her he was sorry for not listening. He told her he understood now that listening means caring.',
          'His mother nuzzled him gently. "I am glad you are safe, Leo. And I am proud of you for understanding."',
          'The next day, Leo ran to find Zuri.',
          '"Zuri! Wait for me! I want to walk with you!"',
          'Zuri smiled. "Really? You want to walk with me?"',
          '"Yes. I am going to listen more. I want to be a good friend."',
          'And from that day on, Leo listened — to his mother, to his teacher, to Uncle Hippo, and most of all, to his friends.',
          'He still had the biggest mane and the loudest roar. But now he also had the biggest heart.',
        ],
      },
    ],
    learningReflection: [
      'Listening is not just hearing words — it is caring about what others say.',
      'When we do not listen, people we love can get hurt.',
      'It is brave to say sorry and change.',
      'Good friends listen to each other.',
    ],
    discussionQuestions: [
      'Have you ever gotten into trouble because you did not listen?',
      'How does it feel when someone does not listen to you?',
      'What can you do to remember to listen more?',
    ],
  },
  {
    slug: 'adas-first-day-of-school',
    title: "Ada's First Day of School",
    author: 'LittleReads Editorial Team',
    ageRange: 'Ages 5–6',
    category: 'Life Skills',
    copyrightYear: 2026,
    story: [
      {
        paragraphs: [
          'Today was the day. Ada was starting school.',
          'She had new shoes. She had a new bag. She had a new uniform that was a little bit too big.',
          'But even with all the new things, Ada felt nervous inside.',
        ],
      },
      {
        heading: 'Chapter 1: Butterfly Tummies',
        paragraphs: [
          '"I think there are butterflies in my tummy," Ada told her mother as they walked to school.',
          '"Those are not real butterflies," said her mother with a smile. "They are feelings. Being nervous is normal. Everyone feels it."',
          '"Even you, Mama?"',
          '"Even me. Do you know what I do when I feel nervous? I take a deep breath and remind myself: I can do hard things."',
          'Ada took a deep breath. "I can do hard things," she whispered to herself.',
          'They reached the school gate. It was big and bright, with colourful drawings on the walls.',
          '"Are you ready?" her mother asked.',
          'Ada held her mother\'s hand tight. "I think so."',
        ],
      },
      {
        heading: 'Chapter 2: New Faces',
        paragraphs: [
          'Inside the school, everything was new. New rooms. New smells. New sounds. And so many new faces!',
          'Ada\'s teacher was Mrs. Okafor. She had a warm smile and kind eyes.',
          '"Welcome, Ada!" she said. "We have been waiting for you."',
          'Ada looked around the classroom. Other children were already sitting at small tables, drawing and talking.',
          'A boy with a big grin waved at her. "Hi! My name is Chukwu. Do you want to sit next to me?"',
          'Ada smiled for the first time that morning. "Yes, please," she said, and sat down.',
        ],
      },
      {
        heading: 'Chapter 3: The Nervous Feeling',
        paragraphs: [
          'Mrs. Okafor showed the class how to write their names. Ada tried, but her letters were wobbly.',
          '"I cannot do it," she whispered to Chukwu.',
          '"It is okay," said Chukwu. "My letters were wobbly too. Mrs. Okafor says practice makes better."',
          'Ada looked around. Some children were already writing neatly. Others were just like her, with wobbly letters and unsure hands.',
          '"You are doing fine, Ada," said Mrs. Okafor, walking past. "Every expert started as a beginner."',
          'That made Ada feel a little bit braver.',
        ],
      },
      {
        heading: 'Chapter 4: Lunch and Laughter',
        paragraphs: [
          'At lunchtime, Ada and Chukwu sat together in the playground. They shared their snacks and talked about their favourite things.',
          '"I like drawing," said Ada.',
          '"I like building things," said Chukwu. "We should build something together!"',
          'They laughed and played, and the nervous butterflies in Ada\'s tummy flew away without her even noticing.',
          'When the bell rang, Ada was surprised. "Already? I thought it just started!"',
          'Chukwu laughed. "That means you are having fun."',
        ],
      },
      {
        heading: 'Chapter 5: Going Home',
        paragraphs: [
          'When Ada\'s mother came to pick her up, Ada ran to her with a big smile.',
          '"Mama! School is fun! I made a friend! His name is Chukwu, and we are going to build things together!"',
          'Her mother laughed. "And how are the butterflies?"',
          'Ada thought about it. "They are gone! I did not even notice when they left!"',
          'As they walked home, Ada held her mother\'s hand and told her about everything — the wobbly letters, the new classroom, the snacks, and the games.',
          'That night, Ada put her new bag by the door, ready for tomorrow.',
          '"I can do hard things," she said to herself. And she meant it.',
        ],
      },
    ],
    learningReflection: [
      'Feeling nervous is normal, and everyone experiences it.',
      'Taking deep breaths can help calm nervous feelings.',
      'Making friends makes new experiences easier and more fun.',
      'Practice makes things better, even if they start out wobbly.',
    ],
    discussionQuestions: [
      'How did Ada feel on her first day of school?',
      'What helped Ada feel less nervous?',
      'Have you ever been nervous about something new? What happened?',
    ],
  },
  {
    slug: 'the-adventure-inside-my-computer',
    title: 'The Adventure Inside My Computer',
    author: 'LittleReads Editorial Team',
    ageRange: 'Ages 7–10',
    category: 'Education',
    copyrightYear: 2026,
    story: [
      {
        paragraphs: [
          'One Saturday morning, Emeka and his younger sister Zainab were playing a game on the computer when something strange happened.',
          'The screen flickered. The speakers buzzed. And suddenly, a tiny voice said, "Help! Someone has turned on the virus! Can you hear me?"',
          'Before they could answer, the computer screen pulled them in like a magnet.',
        ],
      },
      {
        heading: 'Chapter 1: Welcome to the Motherboard',
        paragraphs: [
          'Emeka and Zainab landed with a gentle bump on a flat green surface covered in silver pathways and strange buildings.',
          '"Where are we?" whispered Zainab.',
          '"I think," said Emeka, looking around in amazement, "we are inside the computer."',
          'The green surface stretched out in every direction, like a city seen from above. Silver roads connected rectangular buildings. Tiny lights pulsed along the pathways.',
          '"The silver roads are circuits," Emeka explained. "They carry electricity and data around the computer."',
          '"It looks like a tiny city!" said Zainab.',
          'A small, friendly character bounced toward them. It looked like a glowing orb of light.',
          '"Hello! I am Bit. I am a piece of data. Welcome to the motherboard — the main circuit board of the computer!"',
        ],
      },
      {
        heading: 'Chapter 2: The RAM Highway',
        paragraphs: [
          '"Come on," said Bit. "We need to hurry. A virus has entered the system, and it is blocking data from flowing properly."',
          'Bit led them to a long, wide highway where glowing orbs of all colours rushed past at incredible speed.',
          '"This is RAM — Random Access Memory," Bit explained. "It is where the computer keeps information it is using right now. Think of it as the computer\'s short-term memory."',
          '"So everything I have open on the screen is stored here?" asked Emeka.',
          '"Exactly! RAM is very fast, but it forgets everything when the computer turns off."',
          'They watched as orbs of data raced along the highway. Some carried words, some carried pictures, and some carried sounds.',
          '"But look," said Bit, pointing ahead. "The virus is there, blocking the highway!"',
        ],
      },
      {
        heading: 'Chapter 3: The Brain of the Computer',
        paragraphs: [
          'The virus was a dark, spiky mass sitting right in the middle of the RAM highway, stopping data from moving.',
          '"We need the CPU to process this virus and remove it," said Bit.',
          '"The CPU?" asked Zainab.',
          '"The Central Processing Unit — the brain of the computer!"',
          'Bit led them to a huge building in the centre of the motherboard. Inside, a powerful light pulsed steadily.',
          '"This is where all the thinking happens," said Bit. "Every instruction, every calculation, every decision passes through here."',
          'Emeka was fascinated. "So when I click on something, the CPU figures out what to do?"',
          '"Exactly! But the CPU can only think about a few things at a time. That is why it works with RAM to manage everything efficiently."',
        ],
      },
      {
        heading: 'Chapter 4: The Hard Drive Guardian',
        paragraphs: [
          'The CPU sent out a powerful signal that pushed the virus off the RAM highway. But the virus escaped toward another area.',
          '"The hard drive!" cried Bit. "It is trying to corrupt our permanent files!"',
          'They raced to the hard drive — a massive spinning disc that stored all the computer\'s long-term information.',
          'A tall, steady character guarded the entrance. "I am the Hard Drive Guardian," she said. "My job is to keep all files safe and organised."',
          '"We need your help," said Bit. "A virus is heading this way."',
          'The Guardian nodded. "I will scan for it and lock it out."',
          'She sent a beam of light that caught the virus and trapped it in a quarantine zone.',
          '"Quarantine!" she declared. "The virus is contained. It cannot touch any of our files now."',
        ],
      },
      {
        heading: 'Chapter 5: Going Home',
        paragraphs: [
          'With the virus safely quarantined, the motherboard returned to normal. Data flowed smoothly along the circuits, and the RAM highway was clear.',
          '"Thank you for your help!" said Bit. "You two are the bravest humans we have ever had inside the computer."',
          '"We learned so much," said Emeka. "The CPU is the brain, RAM is the short-term memory, and the hard drive is the long-term storage."',
          '"And the motherboard connects everything together," added Zainab. "Like a city!"',
          'Bit smiled. "You could teach this class!"',
          'The screen flickered once more, and suddenly Emeka and Zainab were back in their chair, looking at the computer.',
          '"Did that really happen?" asked Zainab.',
          'Emeka grinned. "Let me tell you about the CPU and the RAM and the hard drive..."',
          'And from that day on, Emeka and Zainab never looked at a computer the same way again.',
        ],
      },
    ],
    learningReflection: [
      'The CPU is the brain of the computer that processes all instructions.',
      'RAM is fast but temporary memory for active tasks.',
      'The hard drive stores information permanently.',
      'The motherboard connects all parts of the computer together.',
      'Keeping your computer safe from viruses is important.',
    ],
    discussionQuestions: [
      'What part of the computer do you think is the most important? Why?',
      'How is a computer\'s memory similar to your own memory?',
      'What would happen if the CPU stopped working?',
    ],
  },
  {
    slug: 'kemi-and-the-secret-garden',
    title: 'Kemi and the Secret Garden',
    author: 'LittleReads Editorial Team',
    ageRange: 'Ages 6–8',
    category: 'Nature',
    copyrightYear: 2026,
    story: [
      {
        paragraphs: [
          'When Kemi moved to the new house, everything felt strange. The walls were bare, the rooms smelled different, and she missed her old friends.',
          'But the best thing about the new house was hidden behind a crumbling wall at the back of the garden.',
        ],
      },
      {
        heading: 'Chapter 1: Behind the Wall',
        paragraphs: [
          'One morning, while exploring the garden, Kemi noticed a crack in the old wall. Through the crack, she could see green leaves and something that sparkled.',
          'She pushed gently on the wall. A section of it swung open like a door.',
          'Kemi stepped through and gasped.',
          'The most beautiful garden she had ever seen spread out before her. There were flowers of every colour — red, yellow, purple, white — and a small pond where tadpoles swam in circles.',
          '"Who did this?" she wondered.',
          'The garden was wild and overgrown, but clearly someone had once loved it very much. There were paths, now covered in moss, and a small stone bench beneath a mango tree.',
        ],
      },
      {
        heading: 'Chapter 2: Learning to Tend',
        paragraphs: [
          'Kemi showed the garden to her mother, who smiled knowingly.',
          '"Ah," she said. "Mrs. Olumide, the previous owner, loved gardening. She was very old, and she could no longer tend the garden. That is why it has gone wild."',
          'Kemi\'s mother gave her some gardening gloves and a small trowel. "If you want to bring it back to life, this is a good place to start."',
          'Day after day, Kemi worked in the garden. She pulled weeds carefully, watered the thirsty plants, and cleared the paths.',
          'At first, she did not know which plants were flowers and which were weeds. She made mistakes. She pulled up a beautiful lavender thinking it was a weed, and felt terrible.',
          '"You will learn," her mother said. "Every gardener makes mistakes. The garden forgives, and so should you."',
        ],
      },
      {
        heading: 'Chapter 3: The Pond of Life',
        paragraphs: [
          'The pond was Kemi\'s favourite discovery. In the water, she could see tiny tadpoles swimming around.',
          '"What are they?" she asked her mother.',
          '"Those are baby frogs. They will grow legs, lose their tails, and one day hop out of the pond as little frogs."',
          'Kemi watched them every day, amazed at how they changed. One tadpole grew front legs first. Another grew back legs first. They all changed in their own time.',
          '"Every creature in this garden has a purpose," her mother told her. "The bees pollinate the flowers. The earthworms keep the soil healthy. The frogs eat the insects. It is a whole ecosystem working together."',
          '"Like a team?" asked Kemi.',
          '"Exactly like a team. And when one part is missing, the whole team struggles."',
        ],
      },
      {
        heading: 'Chapter 4: The Garden Grows',
        paragraphs: [
          'Months passed, and the garden transformed. Kemi planted new flowers and vegetables. She built a small birdhouse. She cleared the pond so the frogs had a clean home.',
          'Other children in the neighbourhood heard about Kemi\'s garden and came to help. Together, they built a compost bin, planted sunflowers, and made a sign: "The Secret Garden of Kemi — Open to All."',
          'One day, an elderly woman walked through the garden gate. Her eyes filled with tears.',
          '"Mrs. Olumide!" Kemi exclaimed.',
          '"You brought it back," said the old woman, touching a rose petal gently. "My garden lives again."',
          'Mrs. Olumide sat on the stone bench and told Kemi stories about the garden — how she planted each tree, named each flower bed, and spent forty years watching it grow.',
        ],
      },
      {
        heading: 'Chapter 5: The Lesson of the Garden',
        paragraphs: [
          'As the sun set, Mrs. Olumide took Kemi\'s hand.',
          '"A garden teaches you the most important lessons in life, Kemi. It teaches patience — because you cannot rush a seed. It teaches responsibility — because a garden needs daily care. And it teaches that beautiful things grow when you give them time, attention, and love."',
          'Kemi looked around at her garden — at the flowers, the frogs, the birds, and the children who came to play.',
          '"I understand," she said. "And I will take care of it forever."',
          'Mrs. Olumide smiled. "That is all I ever wanted."',
          'That night, Kemi lay in bed and listened to the crickets singing from the garden. She was no longer lonely. She had a garden, new friends, and the deep knowledge that when you care for living things, they care for you right back.',
        ],
      },
    ],
    learningReflection: [
      'Ecosystems are teams of living things that depend on each other.',
      'Gardens require patience, care, and daily attention.',
      'Every creature in nature has a role to play.',
      'Caring for living things teaches us responsibility.',
    ],
    discussionQuestions: [
      'What living things can you find in your neighbourhood?',
      'Why is every creature in a garden important?',
      'What would you plant in your own secret garden?',
    ],
  },
  {
    slug: 'why-does-the-rain-fall',
    title: 'Why Does the Rain Fall?',
    author: 'LittleReads Editorial Team',
    ageRange: 'Ages 7–10',
    category: 'Science',
    copyrightYear: 2026,
    story: [
      {
        paragraphs: [
          'The rain was falling hard on the tin roof of Kofi\'s house. PING! PING! PING! It was loud and exciting.',
          'Kofi pressed his nose against the window and watched the water run down the glass in wiggly lines.',
          '"Grandma," he said. "Where does the rain come from?"',
        ],
      },
      {
        heading: 'Chapter 1: A Big Question',
        paragraphs: [
          'Grandma Ama settled into her rocking chair and smiled.',
          '"That is one of the best questions anyone has ever asked me. Come, sit with me, and I will tell you a story about a tiny drop of water called Drip."',
          'Kofi climbed onto Grandma\'s lap. "Tell me!"',
          '"Drip lived in the great Volta River, far away from here. Every morning, the sun would shine on the river, and Drip would feel warm and happy."',
          '"But one day, the sun was very, very hot. So hot that Drip began to float up, up, up into the sky!"',
          '"Like a balloon?" asked Kofi.',
          '"Exactly like a balloon! This process is called evaporation. When water gets warm, it turns into an invisible gas called water vapour and rises into the sky."',
        ],
      },
      {
        heading: 'Chapter 2: Into the Clouds',
        paragraphs: [
          '"So Drip floated higher and higher, past the birds, past the treetops, and up into the sky."',
          '"As Drip rose higher, it got colder. The cold air made Drip slow down and join hands with other tiny water drops."',
          '"When thousands of little drops held hands together, they formed a cloud!"',
          '"So clouds are made of tiny water drops?" said Kofi, amazed.',
          '"Yes! This is called condensation. When warm water vapour gets cold high in the sky, it turns back into tiny liquid water drops and forms clouds."',
          '"The clouds kept collecting more and more water drops. They grew bigger and darker and heavier."',
          '"When the cloud became too heavy to hold any more water — SPLASH — the water fell back down to the earth!"',
          '"And that is rain!" Kofi shouted.',
        ],
      },
      {
        heading: 'Chapter 3: The Water Cycle',
        paragraphs: [
          '"Exactly," said Grandma. "But here is the beautiful part. The rain falls back into the rivers, the lakes, and the oceans. And then the sun heats the water again, and Drip floats up to the sky again, and the whole thing starts over!"',
          '"A cycle!" said Kofi. "It goes round and round forever!"',
          '"Forever and ever," said Grandma. "It is called the water cycle. And it has been happening since the very beginning of the world."',
          'Kofi thought about it. "So the water in my cup might have been rain before? Or part of the ocean? Or even part of a cloud?"',
          '"Yes! Water moves around the earth in a never-ending cycle. The water you drink today could have been rain in your great-grandmother\'s time."',
          'Kofi\'s eyes went wide. "That is amazing!"',
        ],
      },
      {
        heading: 'Chapter 4: Why Rain Matters',
        paragraphs: [
          '"But Grandma, why do we need rain?"',
          '"Oh, Kofi, we need rain for almost everything! Rain fills the rivers so fish can live. Rain gives water to the crops so food can grow. Rain fills the wells so people can drink. Without rain, the earth would be dry and nothing would grow."',
          '"But too much rain is not good either," Grandma added. "Too much rain can cause floods, which can damage homes and wash away roads."',
          '"So we need the right amount of rain," said Kofi.',
          '"Just right," said Grandma. "Like Goldilocks — not too much, not too little."',
          'They both laughed, and the rain outside began to slow down.',
        ],
      },
      {
        heading: 'Chapter 5: Dancing in the Rain',
        paragraphs: [
          'The rain stopped, and a rainbow stretched across the sky — all seven colours, bright and beautiful.',
          '"Grandma, what is the rainbow?"',
          '"When the sun shines through the rain drops, the light bends and splits into seven colours. It is like the sky saying thank you to the rain."',
          'Kofi ran outside and jumped in a puddle. SPLASH!',
          '"I love rain!" he shouted. "Because now I know where it comes from!"',
          'He ran back inside, muddy and happy, and hugged his grandmother.',
          '"Thank you, Grandma. Now every time it rains, I will think of Drip floating up to the clouds."',
          'And he did. Every single time.',
        ],
      },
    ],
    learningReflection: [
      'Evaporation turns water into vapour when the sun heats it.',
      'Condensation happens when water vapour cools and forms clouds.',
      'Precipitation is when clouds release water as rain.',
      'The water cycle repeats endlessly and is essential for life on Earth.',
    ],
    discussionQuestions: [
      'What would happen if it never rained again?',
      'Can you find examples of the water cycle in your home?',
      'Where does the water in your favourite river come from?',
    ],
  },
  {
    slug: 'the-boy-who-befriended-numbers',
    title: 'The Boy Who Befriended Numbers',
    author: 'LittleReads Editorial Team',
    ageRange: 'Ages 7–9',
    category: 'Education',
    copyrightYear: 2026,
    story: [
      {
        paragraphs: [
          'Jide hated maths. He hated the numbers, the equations, and especially the homework.',
          '"Why do I need to know what X equals?" he would grumble.',
          'But one night, something extraordinary happened. The numbers on his homework sheet started to move.',
        ],
      },
      {
        heading: 'Chapter 1: The Number That Spoke',
        paragraphs: [
          'First, the number 1 stood up on the page and stretched.',
          '"Finally!" said 1. "Someone is paying attention to us!"',
          'Jide rubbed his eyes. He must be dreaming.',
          '"You are not dreaming," said 7, who also stood up. 7 was tall and mysterious, wearing a scarf. "We have been on this page for three hours. We were bored."',
          '"Numbers can talk?" said Jide.',
          '"Numbers do many things," said 1. "We are the foundation of everything. Without us, you could not count your fingers, tell the time, or buy anything at the market."',
          'Jide had never thought of it that way.',
        ],
      },
      {
        heading: 'Chapter 2: The Numbers\' Stories',
        paragraphs: [
          'Each number told Jide its story.',
          '5 was adventurous. "I am the number of fingers on a hand, the number of senses, the number of points on a star! I am everywhere!"',
          '3 was creative. "I am the number of primary colours. Without me, you would not have purple, green, or orange!"',
          'And then there was 0. Zero was small and quiet, sitting in the corner of the page.',
          '"What is your story?" Jide asked 0 gently.',
          '0 smiled. "I am the most important number of all. Without me, 10 is just 1. And 100 is just 1. I give numbers their power. I am the beginning of possibility."',
          'Jide thought about this. 0 was not nothing — 0 was the start of everything.',
        ],
      },
      {
        heading: 'Chapter 3: Patterns Everywhere',
        paragraphs: [
          'The numbers showed Jide something he had never noticed before: patterns.',
          '"Look out the window," said 2. "Count the leaves on that branch."',
          'Jide counted: 2, 4, 6, 8, 10.',
          '"Even numbers!" he said.',
          '"Now count the petals on the flower," said 3.',
          '3, 6, 9, 12.',
          '"Patterns!" said Jide, excited. "The world is full of patterns!"',
          '"Of course it is," said 7. "Maths is not about memorising. It is about seeing. Once you see the patterns, everything becomes a puzzle. And puzzles are fun."',
        ],
      },
      {
        heading: 'Chapter 4: Maths in Real Life',
        paragraphs: [
          'The next day, Jide saw numbers everywhere.',
          'At the market, he calculated how much change his mother should get from the trader.',
          '"Mama, you should get 150 naira back!"',
          'His mother checked. "That is exactly right! How did you know?"',
          'Jide smiled. "I have friends who helped me."',
          'On the way home, he counted the tiles on the pavement. He noticed the pattern: blue, white, blue, white.',
          'He saw numbers in the clock, in the bus number, in the house numbers along the street.',
          'Maths was not boring at all. He had just never looked at it the right way before.',
        ],
      },
      {
        heading: 'Chapter 5: A New Beginning',
        paragraphs: [
          'That night, Jide opened his homework book and smiled.',
          'The numbers were not moving anymore, but he could almost hear them whispering.',
          'He picked up his pencil and started solving problems. This time, it was not a chore. It was a puzzle. And Jide loved puzzles.',
          'When he finished, he looked at his work and felt proud.',
          '"Thank you," he whispered to the page.',
          'And if you looked very closely, you might have seen the number 1 wink.',
          'From that day on, Jide never said he hated maths again. He said, "I am still learning." And there is a big, beautiful difference between the two.',
        ],
      },
    ],
    learningReflection: [
      'Numbers are everywhere and form the foundation of everyday life.',
      'Maths is about seeing patterns, not just memorising formulas.',
      'Zero is not nothing — it gives other numbers their value.',
      'A growth mindset makes learning easier and more enjoyable.',
    ],
    discussionQuestions: [
      'Can you find numbers and patterns in your daily life?',
      'Which number from the story do you like best? Why?',
      'How does it feel when you change from "I cannot" to "I am still learning"?',
    ],
  },
  {
    slug: 'nias-big-idea',
    title: "Nia's Big Idea",
    author: 'LittleReads Editorial Team',
    ageRange: 'Ages 8–10',
    category: 'Entrepreneurship',
    copyrightYear: 2026,
    story: [
      {
        paragraphs: [
          'Every morning, Nia watched the women in her neighbourhood walk three kilometres to fetch water from the far stream. They carried heavy buckets on their heads, and their feet ached by the time they got home.',
          'One hot afternoon, Nia sat under a tree and thought.',
          '"There has to be a better way," she said to herself.',
          'And then, the big idea came.',
        ],
      },
      {
        heading: 'Chapter 1: The Problem',
        paragraphs: [
          '"Mama, why do we have to walk so far for water?" Nia asked her mother.',
          '"Because the well near our house dried up two years ago, and no one has fixed it."',
          '"But what about rainwater? Could we collect it?"',
          'Her mother laughed gently. "We would need containers, and a system, and someone who knows how to build it."',
          'Nia thought about this. She did not know how to build a water collection system. But she knew someone who might — Uncle Bello, who was good with his hands.',
          'She also thought about the containers. Her mother and neighbours threw away large plastic drums after using them. What if those drums could be used to collect rainwater?',
          'The pieces of the puzzle were coming together in Nia\'s mind.',
        ],
      },
      {
        heading: 'Chapter 2: The Plan',
        paragraphs: [
          'Nia drew a plan on a piece of cardboard. She showed it to Uncle Bello.',
          '"I want to build a rainwater collection system," she explained. "We collect the drums from the neighbours. You help us build the gutters and pipes. And everyone shares the water."',
          'Uncle Bello studied the drawing. "This is clever, Nia. But who will pay for the pipes and materials?"',
          'Nia had thought about that too. "If every family contributes 500 naira, we will have enough. It is less than what they spend buying water from the tanker truck every week."',
          'Uncle Bello smiled. "You have thought of everything. I will help you."',
        ],
      },
      {
        heading: 'Chapter 3: Building Together',
        paragraphs: [
          'Nia went door to door, explaining her idea. Some people were excited. Others were doubtful.',
          '"A little girl thinks she can solve the water problem?" some whispered.',
          'But Nia did not give up. She showed them her plan, explained the costs, and told them how much they would save.',
          'Slowly, families began to contribute. Uncle Bello collected the materials. The children helped clean the drums. The women helped build the gutter system on the roofs.',
          'After two weeks, the rainwater collection system was ready. Four large drums connected to gutters on five houses. When the next rain came, the drums would fill up.',
        ],
      },
      {
        heading: 'Chapter 4: The First Rain',
        paragraphs: [
          'Three days later, the rain came.',
          'Nia stood outside with the other children, watching water flow through the gutters and into the drums. For the first time in years, the water was right there — clean, fresh, and free.',
          'Mama Aisha was the first to fill her bucket. "This is wonderful!" she cried. "No more walking three kilometres!"',
          'The neighbourhood celebrated. Everyone had water. The children danced. The elders smiled.',
          'One of the doubtful women came to Nia. "I am sorry I doubted you, child. You have done something wonderful for all of us."',
          'Nia smiled. "It was not just me. It was everyone working together."',
        ],
      },
      {
        heading: 'Chapter 5: What Nia Learned',
        paragraphs: [
          'That night, Nia thought about what had happened. She had seen a problem, made a plan, and brought people together to solve it.',
          '"Is this what they call entrepreneurship?" she asked her mother.',
          '"Yes," said Mama. "Entrepreneurship is about seeing what people need and finding a way to provide it. You have that gift, Nia."',
          'Nia did not know what she wanted to be when she grew up. But she knew one thing: she would always look for problems to solve, because every problem is a big idea waiting to happen.',
          'And that is exactly how great things begin.',
        ],
      },
    ],
    learningReflection: [
      'Entrepreneurship is about identifying problems and creating solutions.',
      'A good plan helps convince others to support your idea.',
      'Community collaboration makes big projects possible.',
      'Even young people can create real change.',
    ],
    discussionQuestions: [
      'What problem in your neighbourhood would you like to solve?',
      'How did Nia convince the doubters to support her?',
      'Why is it important for a plan to show how much something costs?',
    ],
  },
  {
    slug: 'the-kindness-jar',
    title: 'The Kindness Jar',
    author: 'LittleReads Editorial Team',
    ageRange: 'Ages 5–7',
    category: 'Friendship',
    copyrightYear: 2026,
    story: [
      {
        paragraphs: [
          'When Amara started at a new school, everything felt strange. The classrooms were different. The playground was bigger. And she did not know anyone.',
          '"I feel nervous, Mama," she said.',
          'Her mother gave her a beautiful glass jar and a bag of small smooth stones.',
          '"This is your Kindness Jar," her mother said. "Every time you do something kind, put a stone inside. Let us see how full it can get."',
        ],
      },
      {
        heading: 'Chapter 1: The First Stone',
        paragraphs: [
          'On her first day, Amara sat next to a girl named Chioma, who looked sad.',
          '"Are you okay?" Amara asked.',
          '"I lost my crayons," said Chioma. "I cannot do my drawing."',
          'Amara thought for a moment. Then she broke her own crayon set in half and shared it with Chioma.',
          '"Thank you!" said Chioma, smiling for the first time.',
          'That night, Amara put the first stone in her jar.',
          '"One kind act today," she told her mother. "I shared my crayons."',
          '"How did it feel?" her mother asked.',
          '"Good," said Amara. "It felt really good."',
        ],
      },
      {
        heading: 'Chapter 2: More Stones',
        paragraphs: [
          'The next day, Amara helped a younger child find their classroom. Stone.',
          'The day after that, she said "good morning" to the school guard who always looked lonely. Stone.',
          'Then she helped clean up after lunch when no one else would. Stone.',
          'And when she saw a boy sitting alone at break time, she invited him to play. Stone.',
          'Every evening, Amara dropped a stone in the jar and thought about the kind things she had done.',
          'The jar was filling up slowly, one stone at a time.',
        ],
      },
      {
        heading: 'Chapter 3: Something Amazing',
        paragraphs: [
          'Something strange was happening at school. Amara noticed that Chioma was being kind to others too.',
          '"I saw how you shared your crayons with me," Chioma said. "So I shared my snacks with someone today."',
          'And the boy Amara had invited to play — he helped another child carry their books.',
          'It was like kindness was contagious. One kind act led to another, which led to another.',
          'Amara\'s jar was almost full. But the kindness at school was just beginning.',
        ],
      },
      {
        heading: 'Chapter 4: The Full Jar',
        paragraphs: [
          'After one month, Amara\'s jar was completely full of stones.',
          'She brought it to show her mother, beaming.',
          '"Look, Mama! Every stone is a kind thing I did!"',
          'Her mother held the jar up to the light. It was heavy and beautiful, the stones shining like jewels.',
          '"Amara, look at this jar. When you started, it was empty. But every small act of kindness added something beautiful."',
          '"Mama, I think kindness is like the jar. When you start with nothing, but keep adding, it becomes something wonderful."',
          'Her mother hugged her tightly. "That is exactly right, my love."',
        ],
      },
      {
        heading: 'Chapter 5: The Ripple Effect',
        paragraphs: [
          'By the end of the term, Amara had made more friends than she could count. Not because she was the loudest or the smartest, but because she was the kindest.',
          'Chioma, the guard, the younger children, the lonely boy — they were all her friends now.',
          'And every one of them had started their own kindness jar.',
          'The classroom teacher, Mrs. Eze, put a large jar in the middle of the classroom. "Let us fill this together," she said.',
          'And they did. One stone, one kind act, one smile at a time.',
          'Because kindness does not just fill a jar. It fills hearts, classrooms, and the whole world.',
        ],
      },
    ],
    learningReflection: [
      'Small acts of kindness can make a big difference.',
      'Kindness is contagious — it inspires others to be kind too.',
      'Being kind helps you make friends.',
      'Even one person can start something beautiful.',
    ],
    discussionQuestions: [
      'What kind things have you done today?',
      'How did it feel when someone was kind to you?',
      'Can you start your own kindness jar at home?',
    ],
  },
  {
    slug: 'chidis-trip-to-space',
    title: "Chidi's Trip to Space",
    author: 'LittleReads Editorial Team',
    ageRange: 'Ages 7–10',
    category: 'Science',
    copyrightYear: 2026,
    story: [
      {
        paragraphs: [
          'Chidi loved looking at the stars. Every night, he would lie on a mat outside his house and stare up at the sky.',
          '"One day," he told his father, "I will go up there."',
          'His father laughed. "I believe you will, my son."',
          'One night, something magical happened.',
        ],
      },
      {
        heading: 'Chapter 1: The Shooting Star',
        paragraphs: [
          'A shooting star streaked across the sky, bright and golden.',
          '"Make a wish!" his father said.',
          'Chidi closed his eyes tight. "I wish I could visit every planet in the solar system."',
          'The shooting star seemed to stop, turn around, and fly straight toward Chidi. A warm, golden light wrapped around him.',
          'When he opened his eyes, he was sitting inside a small, comfortable spacecraft. A friendly robot floated beside him.',
          '"Welcome aboard the Star Explorer!" said the robot. "I am Nova, your guide. You wished to visit the planets. Shall we begin?"',
          '"Is this real?" whispered Chidi.',
          '"As real as the stars themselves," said Nova. "Hold on tight!"',
        ],
      },
      {
        heading: 'Chapter 2: Mercury and Venus',
        paragraphs: [
          'The Star Explorer zoomed toward the sun, stopping first at Mercury.',
          '"Mercury is the closest planet to the sun," Nova explained. "It is tiny and very hot during the day — up to 430 degrees Celsius! But at night, it is freezing cold."',
          'Chidi peered out the window at the grey, cratered surface. "It looks like the moon," he said.',
          '"Good observation! Mercury has no atmosphere to protect it, so it is covered in crasts from meteorite impacts."',
          'They flew on to Venus.',
          '"Venus is sometimes called Earth\'s twin because it is almost the same size. But do not be fooled — Venus has a thick, poisonous atmosphere and is the hottest planet in our solar system, even hotter than Mercury!"',
          '"Wow," said Chidi. "And people want to live on Mars? Venus is closer!"',
          '"Venus is too hostile," said Nova. "Mars is much more promising."',
        ],
      },
      {
        heading: 'Chapter 3: Earth and Mars',
        paragraphs: [
          'Next, they passed by Earth. Chidi looked down and saw Africa, his home, glowing in the sunlight.',
          '"Earth is special," said Nova. "It is the only planet we know of that has liquid water, breathable air, and life. You should take care of it."',
          '"I will," said Chidi quietly.',
          'Then they arrived at Mars, the Red Planet.',
          '"Mars has the tallest mountain in the solar system — Olympus Mons. It is almost three times the height of Mount Everest!"',
          'Chidi stared at the red landscape. Dusty, dry, and beautiful. "I want to come back here someday," he said. "As a real astronaut."',
          '"Dream big," said Nova. "Mars is waiting."',
        ],
      },
      {
        heading: 'Chapter 4: The Gas Giants',
        paragraphs: [
          'Beyond Mars lay the gas giants — Jupiter, Saturn, Uranus, and Neptune.',
          'Jupiter was enormous. "Jupiter is so big that all the other planets could fit inside it," said Nova.',
          'Chidi saw the Great Red Spot — a storm larger than Earth that had been raging for hundreds of years.',
          'Then came Saturn, with its beautiful rings.',
          '"Saturn\'s rings are made of ice and rock, some as small as sand and some as big as houses," Nova explained.',
          'Uranus rolled on its side like a lazy ball, and Neptune shone bright blue, the farthest planet from the sun.',
          '"Neptune has the fastest winds in the solar system — over 2,000 kilometres per hour!" said Nova.',
          '"Everything is so different," said Chidi. "Every planet is unique."',
          '"That is the beauty of our solar system," said Nova. "Each world tells its own story."',
        ],
      },
      {
        heading: 'Chapter 5: Coming Home',
        paragraphs: [
          'The Star Explorer turned back toward Earth. Chidi was sad to leave the planets but excited to go home.',
          '"Nova, will I remember this?"',
          '"You will remember the feeling," said Nova. "And that feeling will inspire you to learn more, study hard, and chase your dream."',
          'The golden light wrapped around Chidi again, and when he opened his eyes, he was lying on his mat outside his house, looking up at the stars.',
          'His father was beside him, smiling. "You fell asleep while stargazing. Did you dream of anything special?"',
          'Chidi looked at the sky — at Mars, a tiny red dot, and Saturn, barely visible through his telescope.',
          '"I dreamed of the future, Papa. And I am going to make it real."',
          'He went inside and picked up his science book. There was so much to learn. And Chidi was ready.',
        ],
      },
    ],
    learningReflection: [
      'Our solar system has eight unique planets, each with special features.',
      'The sun is the centre of the solar system.',
      'Earth is special because it supports life.',
      'Dreaming big and studying hard are the first steps to achieving your goals.',
    ],
    discussionQuestions: [
      'Which planet would you most like to visit? Why?',
      'What is the difference between a gas giant and a rocky planet?',
      'What do you think we need to do to take care of Earth?',
    ],
  },
  {
    slug: 'the-village-that-saved-water',
    title: 'The Village That Saved Water',
    author: 'LittleReads Editorial Team',
    ageRange: 'Ages 7–10',
    category: 'Environment',
    copyrightYear: 2026,
    story: [
      {
        paragraphs: [
          'The village of Ile-Iwa had always had plenty of water. The river ran clear, the well was deep, and the rains came every year.',
          'But one year, the rains were late. And then later. And then they stopped altogether.',
          'The well began to run low. The river slowed to a trickle. And the people of Ile-Iwa grew worried.',
        ],
      },
      {
        heading: 'Chapter 1: The Drying Well',
        paragraphs: [
          'Every morning, the women of the village would go to the well and lower their buckets. But each day, the buckets came up emptier.',
          'The elders called a meeting under the great iroko tree.',
          '"We must do something," said Chief Adewale. "But what?"',
          'Everyone argued. Some wanted to dig the well deeper. Some wanted to move closer to the river. Some said they should pray for rain.',
          'But no one had a clear plan.',
          'Then a quiet voice spoke up.',
          '"I have an idea," said Binta.',
        ],
      },
      {
        heading: 'Chapter 2: Binta\'s Plan',
        paragraphs: [
          'Binta was only eleven years old, but she was known in the village for her sharp mind.',
          '"We cannot wait for rain," she said. "We must save the water we have and find ways to collect more."',
          'She held up a drawing she had made.',
          '"First, we fix the leaky pots and broken containers. Every drop matters. Second, we build rainwater collectors on every roof. Third, we plant drought-resistant crops that do not need much water. Fourth, we share what we have instead of hoarding."',
          'The elders looked at each other. The plan was simple but smart.',
          '"How do you know all this?" asked Chief Adewale.',
          '"I read it in books at school," said Binta. "Water conservation is something people have done for thousands of years. We just forgot."',
        ],
      },
      {
        heading: 'Chapter 3: Working Together',
        paragraphs: [
          'The village followed Binta\'s plan.',
          'First, they found and fixed every leaky container. An old cooking pot with a crack? Patched. A leaking bucket? Repaired. They saved more water in a week than they expected.',
          'Then, Uncle Soji helped build rainwater collectors — large tarps connected to barrels on every roof. When the rain finally came, every house was ready to catch it.',
          'The farmers planted millet and sorghum, crops that grew well in dry conditions.',
          'And the sharing system meant that no family went thirsty. Those with more water shared with those who had less.',
        ],
      },
      {
        heading: 'Chapter 4: The Rain Returns',
        paragraphs: [
          'After three months, the rains finally came. The sky opened up, and the rain poured down.',
          'The rainwater collectors filled up. The well rose. The river flowed again.',
          'But this time, Ile-Iwa was prepared. They had water stored. They had habits of saving. And they had a plan for the future.',
          'The villagers celebrated with a feast under the iroko tree.',
          'Chief Adewale raised his cup. "We must thank Binta, who reminded us that solving problems starts with thinking clearly and working together."',
          'Binta smiled shyly. But she was not done yet.',
        ],
      },
      {
        heading: 'Chapter 5: The Water Committee',
        paragraphs: [
          'Binta suggested the village form a Water Committee — a group of people responsible for maintaining the water systems, checking the collectors, and making sure everyone had enough.',
          '"And it should include children," she said. "Because water is our future, and we need to learn how to protect it."',
          'The elders agreed. Binta became the youngest member of the Ile-Iwa Water Committee.',
          'Other villages heard about what Ile-Iwa had done. They sent people to learn, and Binta taught them everything she knew.',
          'She was not a chief, and she was not a scientist. She was a girl who read books, thought carefully, and believed that even the youngest person could make a difference.',
          'And she was right.',
        ],
      },
    ],
    learningReflection: [
      'Water conservation means using water wisely and not wasting it.',
      'Communities can solve big problems when they work together.',
      'Even young people can have brilliant ideas that help everyone.',
      'Planning ahead and preparing for the future is important.',
    ],
    discussionQuestions: [
      'How do you use water at home? Are there ways to save more?',
      'Why is it important to share resources in a community?',
      'What would you do if you noticed a problem that no one else was fixing?',
    ],
  },
  {
    slug: 'maya-and-the-brave-little-seed',
    title: 'Maya and the Brave Little Seed',
    author: 'LittleReads Editorial Team',
    ageRange: 'Ages 5–7',
    category: 'Nature',
    copyrightYear: 2026,
    story: [
      {
        paragraphs: [
          'Maya planted a tiny seed in the garden behind her house.',
          '"Grow, little seed," she whispered. "I cannot wait to see you."',
          'The seed was buried in the dark, cool soil. It was small and alone, and it was afraid.',
        ],
      },
      {
        heading: 'Chapter 1: Underground',
        paragraphs: [
          'Deep underground, the little seed sat in the darkness.',
          '"This is scary," the seed thought. "I cannot see anything. I am all alone."',
          'But the soil was warm and wet, and the seed felt something strange happening inside. A tiny root was pushing down, and a small shoot was reaching up.',
          '"What is happening to me?" the seed wondered.',
          '"You are growing," said a friendly earthworm, wriggling past. "Do not be afraid. Growth happens in the dark, in the quiet, in places no one can see. Trust the process."',
          'The seed was not sure what "trust the process" meant, but it felt the warmth of the soil and decided to try.',
        ],
      },
      {
        heading: 'Chapter 2: Waiting',
        paragraphs: [
          'Above ground, Maya watered the soil every morning.',
          '"Nothing is happening, Mama," she said on the third day.',
          '"Be patient," her mother said. "Seeds take time. The roots are growing deep underground. When they are strong enough, the plant will appear."',
          'Maya waited. She watered. She waited some more.',
          'Day five. Nothing.',
          'Day seven. Nothing.',
          'Day ten. Nothing.',
          'Maya was about to give up when she noticed something. A tiny green shoot, barely bigger than a thread, was poking through the soil.',
          '"MAMA! It is growing! It is growing!"',
        ],
      },
      {
        heading: 'Chapter 3: Reaching for the Sun',
        paragraphs: [
          'Now that the little plant had broken through the soil, everything happened faster.',
          'The shoot stretched toward the sun, growing taller every day. Two small leaves opened on either side like little hands waving hello.',
          'Maya named the plant Little Green.',
          '"You are so brave, Little Green. You grew all the way up from the dark."',
          'But growing was not easy. One day, a strong wind bent Little Green almost to the ground.',
          'Maya rushed outside. "Are you okay?"',
          'The next morning, Little Green was standing up straight again. The wind had made its stem stronger.',
          '"Wow," said Maya. "The hard things made you stronger."',
        ],
      },
      {
        heading: 'Chapter 4: Blooming',
        paragraphs: [
          'Weeks passed. Little Green grew taller and wider. More leaves appeared. And then, one bright morning, a bud appeared at the top.',
          'Maya could hardly breathe. "Is that a flower?"',
          'She watched it every day. The bud grew bigger and bigger, swelling with colour inside.',
          'Then one afternoon, the bud opened.',
          'It was a beautiful flower — bright yellow petals with a soft, sweet scent. Maya had never seen anything so wonderful.',
          '"You did it, Little Green! You grew from a tiny seed into the most beautiful flower in the garden!"',
        ],
      },
      {
        heading: 'Chapter 5: Seeds for Tomorrow',
        paragraphs: [
          'As the weeks went on, more flowers bloomed. Bees came to visit. Butterflies danced around the petals.',
          'Maya sat in the garden and thought about the journey from seed to flower.',
          'It had taken patience. It had taken care. It had taken time.',
          '"Mama," she said. "I learned something important."',
          '"What is that, my love?"',
          '"Beautiful things do not happen overnight. You have to wait, and care, and believe that something wonderful is growing, even when you cannot see it yet."',
          'Her mother smiled. "That is one of the wisest things anyone has ever said."',
          'That autumn, Maya collected seeds from Little Green\'s flowers. She gave them to her friends at school.',
          '"Plant these," she said. "Water them. Be patient. And watch something beautiful grow."',
        ],
      },
    ],
    learningReflection: [
      'Growth happens gradually, and patience is essential.',
      'Hard experiences can make us stronger.',
      'Caring for living things teaches us responsibility.',
      'Beautiful things take time to develop.',
    ],
    discussionQuestions: [
      'Why was the seed scared underground?',
      'What made the plant stronger after the storm?',
      'Is there something in your life that is growing slowly? How can you be patient?',
    ],
  },
  {
    slug: 'my-first-internet-safety-book',
    title: 'My First Internet Safety Book',
    author: 'LittleReads Editorial Team',
    ageRange: 'Ages 7–10',
    category: 'Technology',
    copyrightYear: 2026,
    story: [
      {
        paragraphs: [
          'The internet is an amazing place. It is full of games, videos, stories, and things to learn. But like any place, there are rules to keep you safe.',
          'This book will help you become a Smart Surfer — someone who uses the internet wisely and safely.',
        ],
      },
      {
        heading: 'Chapter 1: Your Personal Information',
        paragraphs: [
          'Your name, your school, your address, your phone number, and your birthday are personal information. They are like your secrets — only share them with people you trust.',
          'On the internet, there are people you have never met. Even if someone seems friendly, do not share personal information with strangers online.',
          'This includes:',
          'Your full name and surname',
          'Your school name',
          'Your home address',
          'Your phone number',
          'Your parents\' names or workplace',
          'Photos of your house or school',
          'Think of it this way: you would not shout your home address on a busy street. The internet is like a very, very big street.',
        ],
      },
      {
        heading: 'Chapter 2: Passwords Are Your Shields',
        paragraphs: [
          'A password is like a key to your house. You would not give your house key to a stranger, right? The same goes for passwords.',
          'Here are the rules for strong passwords:',
          'Make them long — at least 8 characters',
          'Mix letters, numbers, and symbols',
          'Never use your name or birthday',
          'Never share your password with friends',
          'Use a different password for each account',
          'If someone asks for your password online, that is a big red flag. Never share it, no matter how friendly they seem.',
        ],
      },
      {
        heading: 'Chapter 3: Online Strangers',
        paragraphs: [
          'Some people on the internet pretend to be children when they are actually adults. This is called "catfishing," and it can be dangerous.',
          'Here are warning signs:',
          'Someone you do not know asks to be your friend',
          'They ask for your photo or personal information',
          'They want to meet you in person',
          'They ask you to keep secrets from your parents',
          'They offer you gifts or money',
          'If any of these happen, tell a trusted adult immediately. You will never be in trouble for telling — you will be praised for being smart and brave.',
        ],
      },
      {
        heading: 'Chapter 4: Ask an Adult for Help',
        paragraphs: [
          'If you see something online that makes you feel confused, scared, or uncomfortable, tell a trusted adult right away.',
          'A trusted adult is:',
          'Your parent or guardian',
          'Your teacher',
          'Another family member you trust',
          'You do not have to fix the problem yourself. Adults have the tools and knowledge to help.',
          'It is never "snitching" to tell an adult about something dangerous online. It is being safe and smart.',
        ],
      },
      {
        heading: 'Chapter 5: Cyberbullying Basics',
        paragraphs: [
          'Cyberbullying is when someone uses the internet to be mean, embarrass, or hurt another person. This can happen through messages, comments, or sharing photos without permission.',
          'If someone is being mean to you online:',
          'Do not reply — bullies want a reaction',
          'Block the person',
          'Save the evidence (take a screenshot)',
          'Tell a trusted adult',
          'Remember: being kind online is just as important as being kind in person. Think before you type. Ask yourself: "Would I say this to someone\'s face?"',
        ],
      },
      {
        heading: 'Chapter 6: Being a Smart Surfer',
        paragraphs: [
          'The internet is a tool, and like all tools, it is best when used wisely.',
          'Be a Smart Surfer by:',
          'Protecting your personal information',
          'Using strong, unique passwords',
          'Never talking to strangers online without adult permission',
          'Telling a trusted adult if something feels wrong',
          'Being kind and respectful to others online',
          'Using the internet for learning, creativity, and fun',
          'The internet can open doors to amazing things — learning, connecting with friends, and exploring new ideas. Stay safe, stay smart, and enjoy the journey.',
        ],
      },
    ],
    learningReflection: [
      'Personal information should be kept private online.',
      'Strong passwords protect your accounts and data.',
      'Not everyone online is who they say they are.',
      'Telling a trusted adult about online problems is brave, not snitching.',
      'Cyberbullying is wrong, and there are steps to take against it.',
    ],
    discussionQuestions: [
      'What personal information should you never share online?',
      'Why is it important to have different passwords for different accounts?',
      'What would you do if someone you do not know sent you a message online?',
    ],
  },
  {
    slug: 'the-three-friends-and-the-broken-bridge',
    title: 'The Three Friends and the Broken Bridge',
    author: 'LittleReads Editorial Team',
    ageRange: 'Ages 6–8',
    category: 'Friendship',
    copyrightYear: 2026,
    story: [
      {
        paragraphs: [
          'Folake loved to plan things. She had notebooks full of ideas and lists of things to do.',
          'Ibrahim was strong and brave. He could carry heavy things and was never afraid of a challenge.',
          'Chinwe was creative. She could make beautiful things from sticks, stones, and scraps.',
          'Together, they were the best of friends.',
        ],
      },
      {
        heading: 'Chapter 1: The Broken Bridge',
        paragraphs: [
          'The three friends lived on one side of the Maji River. Their school was on the other side.',
          'Every day, they crossed the old wooden bridge to get to school. It was old, but it worked.',
          'Until one rainy morning, when they heard a terrible CRACK.',
          'The bridge had broken! A huge section in the middle was gone, swept away by the rushing water.',
          '"How will we get to school?" cried Chinwe.',
          '"I will build a new bridge!" said Ibrahim, rolling up his sleeves.',
          '"Let me plan how we should do it," said Folake, pulling out her notebook.',
          '"I will help build it!" said Chinwe.',
          'And so their adventure began.',
        ],
      },
      {
        heading: 'Chapter 2: Ibrahim\'s Attempt',
        paragraphs: [
          'Ibrahim carried the biggest logs he could find and dropped them across the river.',
          '"There!" he said proudly. "The bridge is done."',
          'But the logs were not connected. When he stepped on the first one, it rolled, and SPLASH — Ibrahim fell into the shallow water.',
          '"You need more than just strong logs," said Folake, helping him up. "You need a plan."',
          '"My turn next!" said Chinwe.',
        ],
      },
      {
        heading: 'Chapter 3: Chinwe\'s Attempt',
        paragraphs: [
          'Chinwe tried to weave branches and vines together to make a beautiful bridge.',
          'It looked wonderful, but when she tested it, the vines snapped and the bridge collapsed into the river.',
          '"The materials are not strong enough," said Ibrahim. "We need wood and nails, not just vines."',
          '"You are right," said Chinwe. "Beauty alone is not enough."',
          'Folake sat down with her notebook. "Let me think about this properly," she said.',
        ],
      },
      {
        heading: 'Chapter 4: Folake\'s Plan',
        paragraphs: [
          'Folake drew a careful diagram. She measured the width of the river. She calculated how many logs they needed.',
          '"Ibrahim, we need your strength to carry the big logs into position. Chinwe, we need your creativity to weave a strong rope railing and make it safe."',
          '"And you, Folake?" asked Ibrahim.',
          '"I will make sure everything is in the right place and the bridge is safe to cross."',
          'Together, they worked. Ibrahim carried the heavy logs. Chinwe wove strong railings from vines. Folake directed everything, checking each step.',
          'By sunset, the bridge was finished. It was not as fancy as the old one, but it was strong, safe, and beautiful.',
        ],
      },
      {
        heading: 'Chapter 5: Stronger Together',
        paragraphs: [
          'The next morning, the three friends crossed the new bridge together. It held firm under their feet.',
          '"We did it!" said Chinwe.',
          '"Alone, we could not," said Ibrahim. "Together, we could."',
          '"That is the lesson," said Folake. "Ibrahim has strength. Chinwe has creativity. And I have planning. Alone, each of us fails. Together, each of us succeeds."',
          'From that day on, the three friends were even closer. They had learned that friendship is not just about playing together — it is about combining your strengths to solve hard problems.',
          'And the bridge across the Maji River stood strong for many years to come.',
        ],
      },
    ],
    learningReflection: [
      'Everyone has different strengths, and that is what makes teamwork powerful.',
      'Planning before acting leads to better results.',
      'Strength alone is not enough — it needs direction.',
      'Creativity and planning are just as important as physical strength.',
    ],
    discussionQuestions: [
      'What is your special strength?',
      'When have you worked with friends to solve a problem?',
      'Why did the bridge fail when each friend tried alone?',
    ],
  },
  {
    slug: 'the-day-i-became-a-young-scientist',
    title: 'The Day I Became a Young Scientist',
    author: 'LittleReads Editorial Team',
    ageRange: 'Ages 8–10',
    category: 'Science',
    copyrightYear: 2026,
    story: [
      {
        paragraphs: [
          'When Faridah\'s science teacher, Mr. Osei, announced the annual science project, every student groaned.',
          '"Not another project!" whispered Faridah\'s friend Amina.',
          'But Mr. Osei held up his hand. "This time, you will not just build a poster. You will do real science. You will ask a question, form a hypothesis, test it, and report your findings."',
          'Faridah\'s eyes widened. She had always been curious. This was her chance.',
        ],
      },
      {
        heading: 'Chapter 1: The Question',
        paragraphs: [
          'Faridah sat in the garden that evening, thinking.',
          '"What question do I want to answer?" she asked herself.',
          'She looked at the plants in her mother\'s garden. Some grew big and strong. Others were small and weak, even though they were planted at the same time.',
          '"Why do some plants grow better than others?"',
          'She wrote down her question: "Does the type of soil affect how fast plants grow?"',
          'Now she needed a hypothesis — an educated guess.',
          '"I think," she wrote, "that plants growing in compost soil will grow faster than plants in regular soil, because compost has more nutrients."',
          'There. Her hypothesis was written. Now she needed to test it.',
        ],
      },
      {
        heading: 'Chapter 2: The Experiment',
        paragraphs: [
          'Faridah collected six small pots. She put compost soil in three and regular garden soil in three.',
          'She planted the same type of seeds — beans — in each pot, making sure they were the same depth.',
          'She placed all six pots in the same sunny spot and gave them the same amount of water every day.',
          '"The only difference," she told herself, "is the soil. Everything else stays the same. That is called a controlled experiment."',
          'Every day after school, Faridah measured each plant. She used a ruler to check height and counted the leaves.',
          'She wrote everything in a notebook, just like a real scientist.',
        ],
      },
      {
        heading: 'Chapter 3: The Results',
        paragraphs: [
          'After three weeks, the results were clear.',
          'The plants in compost soil were taller, greener, and had more leaves than the ones in regular soil.',
          'Faridah calculated the averages:',
          'Compost soil: average height 14 cm, average 6 leaves',
          'Regular soil: average height 9 cm, average 4 leaves',
          '"My hypothesis was correct!" she said. "Plants in compost soil grow faster because compost has more nutrients."',
          'But she was not done. Good scientists also think about what else might have affected the results.',
          '"Maybe I should repeat the experiment," she wrote. "To make sure my results are reliable."',
        ],
      },
      {
        heading: 'Chapter 4: The Presentation',
        paragraphs: [
          'On science project day, Faridah presented her experiment to the class.',
          'She explained her question, her hypothesis, her method, her results, and her conclusion.',
          'Then she said something that surprised everyone:',
          '"I learned that being a scientist is not about being the smartest person in the room. It is about being the most curious. Anyone can be a scientist if they ask questions, test their ideas, and keep learning."',
          'The class clapped. Mr. Osei smiled.',
          '"Faridah, you did not just do a science project. You did real science. That is what makes a true scientist."',
        ],
      },
      {
        heading: 'Chapter 5: A New Way of Thinking',
        paragraphs: [
          'After her project, Faridah saw the world differently.',
          'When her mother said, "The soup tastes better today," Faridah asked, "What did you change in the recipe?"',
          'When it rained one day and was sunny the next, she thought about weather patterns.',
          'When her brother said, "I always lose at football," she said, "Have you tried practising differently? Maybe you need to test a new strategy."',
          'Science was not just a school subject. It was a way of thinking — of observing the world, asking questions, and finding answers through evidence.',
          'And that is how Faridah became a young scientist. Not because of a project, but because of a curious mind.',
        ],
      },
    ],
    learningReflection: [
      'The scientific method has steps: question, hypothesise, experiment, analyse, conclude.',
      'A controlled experiment changes only one variable at a time.',
      'Recording data carefully is essential for good science.',
      'Being a scientist means being curious and asking "why?"',
    ],
    discussionQuestions: [
      'What question would you like to investigate?',
      'Why did Faridah only change one thing in her experiment?',
      'How can you use scientific thinking in your daily life?',
    ],
  },
  {
    slug: 'amina-learns-to-save',
    title: 'Amina Learns to Save',
    author: 'LittleReads Editorial Team',
    ageRange: 'Ages 7–10',
    category: 'Money Skills',
    copyrightYear: 2026,
    story: [
      {
        paragraphs: [
          'Every Saturday, Amina received her pocket money — 500 naira from her mother.',
          'And every Saturday, she spent it all before sundown.',
          'Sweets from Mallam Bello\'s shop. A new pencil case. A small toy from the market.',
          'By Sunday, her pockets were empty.',
        ],
      },
      {
        heading: 'Chapter 1: The Book She Wanted',
        paragraphs: [
          'One day, Amina saw a beautiful book in the bookshop window. It was a science encyclopedia with colourful pictures of planets, animals, and inventions.',
          'It cost 3,000 naira.',
          'Amina rushed inside and picked it up. "I want this!" she told her mother.',
          'Her mother looked at the price and then at Amina. "Do you have 3,000 naira?"',
          'Amina checked her pocket. She had 500 naira — this week\'s pocket money, already half spent on sweets.',
          '"I do not," she said, her heart sinking.',
          '"Then you will need to save for it," her mother said.',
          '"But that would take six weeks!" said Amina. "That is forever!"',
          'Her mother smiled. "Or it is six weeks of smart choices."',
        ],
      },
      {
        heading: 'Chapter 2: Needs and Wants',
        paragraphs: [
          'That evening, Amina\'s mother sat with her at the kitchen table.',
          '"Let me teach you something important," she said. "The difference between needs and wants."',
          '"A need is something you must have to live — food, water, shelter, clothing, school supplies."',
          '"A want is something you would like to have but do not need — sweets, toys, extra stationery."',
          '"Both are okay," her mother continued. "But when you spend all your money on wants, you have nothing left for the things that really matter."',
          'Amina thought about her spending. Sweets — want. Extra pencils — want. The science book — also a want, but a want that would help her learn.',
          '"So if I stop buying so many sweets," Amina said slowly, "I can save for the book?"',
          'Exactly.',
        ],
      },
      {
        heading: 'Chapter 3: The Saving Plan',
        paragraphs: [
          'Amina made a plan:',
          'Week 1: Save 300 naira. Spend 200 on small treats.',
          'Week 2: Save 400 naira. Spend 100.',
          'Week 3-6: Save as much as possible.',
          'Her mother gave her a special piggy bank — a painted tin can with a slot on top.',
          '"Every naira you put in is a naira closer to your goal," her mother said.',
          'The first week was hard. When she walked past Mallam Bello\'s shop and smelled the sweets, her hand almost reached for her pocket.',
          'But then she thought of the science book — the planets, the animals, the inventions — and kept walking.',
          '"I am saving for something better," she told herself.',
        ],
      },
      {
        heading: 'Chapter 4: Watching It Grow',
        paragraphs: [
          'Week after week, Amina saved. The piggy bank grew heavier.',
          'When she reached 1,500 naira — half of her goal — she almost quit. "This is taking too long!"',
          'But her mother said, "You are halfway there! The hardest part is the beginning, and you already did that."',
          'Amina kept going. She found ways to save even more. She sold her old crayons to a younger child. She did extra chores for small amounts of money.',
          'By week five, she had 2,500 naira. By week six, she had 3,200 naira.',
          'More than enough!',
        ],
      },
      {
        heading: 'Chapter 5: The Reward',
        paragraphs: [
          'Amina walked into the bookshop with her piggy bank money in an envelope and bought the science encyclopedia.',
          'It felt different from any other purchase she had ever made.',
          'When she bought sweets, the feeling lasted a few minutes. But this — this felt like an accomplishment.',
          '"I earned this," she told her mother. "I saved and I waited and I did it."',
          'Her mother hugged her. "That is the power of saving, Amina. It is not about having less fun now. It is about having something better later."',
          'Amina read her book every night. She learned about planets, deep oceans, and electricity.',
          'And when her next pocket money arrived on Saturday, she put 300 naira directly into her piggy bank.',
          'Because Amina had learned that saving is not a punishment — it is a superpower.',
        ],
      },
    ],
    learningReflection: [
      'Needs and wants are different, and knowing the difference helps with money.',
      'Setting a savings goal makes it easier to save.',
      'Delayed gratification leads to bigger, better rewards.',
      'Earning and saving money gives a sense of accomplishment.',
    ],
    discussionQuestions: [
      'What is the difference between a need and a want?',
      'Have you ever saved for something? How did it feel to finally get it?',
      'What would you save for if you had pocket money every week?',
    ],
  },
  {
    slug: 'the-mystery-of-rainbow-hill',
    title: 'The Mystery of Rainbow Hill',
    author: 'LittleReads Editorial Team',
    ageRange: 'Ages 7–9',
    category: 'Adventure',
    copyrightYear: 2026,
    story: [
      {
        paragraphs: [
          'Everyone in the town of Akure had heard the legend of Rainbow Hill.',
          'They said that once a year, on the first day of the new season, the hill glowed with every colour of the rainbow. Red, orange, yellow, green, blue, indigo, and violet — all shining at once.',
          'But no one had ever seen it happen. Most people thought it was just a story.',
          'Tolu and Sam did not think so.',
        ],
      },
      {
        heading: 'Chapter 1: The Old Map',
        paragraphs: [
          'Tolu found the map in her grandmother\'s attic — an old, folded piece of paper with strange markings.',
          '"Look at this, Sam!"',
          'Sam peered over her shoulder. The map showed a path through the forest, past a waterfall, and up to the peak of Rainbow Hill.',
          'At the top was a symbol: a circle with seven colours.',
          '"And look," said Tolu, pointing at the bottom corner. There was a riddle written in faded ink:',
          '"Seven colours light the hill when wisdom, courage, and friendship stand still."',
          '"Wisdom, courage, and friendship," Sam repeated. "I wonder what that means."',
          '"There is one way to find out," said Tolu. "Let us go."',
        ],
      },
      {
        heading: 'Chapter 2: Into the Forest',
        paragraphs: [
          'The next morning, the two friends set out with backpacks full of water, snacks, and a torch.',
          'The forest path was green and cool. Birds sang overhead, and sunlight filtered through the leaves.',
          'After an hour of walking, they came to a fork in the path.',
          '"Which way?" asked Sam.',
          'Tolu studied the map. "Left goes to the waterfall. Right goes deeper into the forest."',
          '"Let us try left first," said Sam. "The waterfall might have a clue."',
          'They followed the path to the waterfall, a beautiful cascade of water falling over mossy rocks.',
          'Behind the waterfall, carved into the rock, they found the first clue:',
          '"Wisdom speaks through questions, not answers. Ask and you shall find."',
          'Tolu and Sam looked at each other. "We need to ask the right question," said Tolu.',
          '"Maybe the waterfall knows?" said Sam.',
          '"How do we get to the top of Rainbow Hill?" Tolu asked aloud.',
          'The waterfall seemed to change. A section of water thinned, revealing a hidden path behind it.',
          '"There it is!" shouted Sam.',
        ],
      },
      {
        heading: 'Chapter 3: The Stone Bridge',
        paragraphs: [
          'The hidden path led them to an old stone bridge over a deep ravine.',
          'But the bridge was damaged — several stones were missing from the middle.',
          '"How do we cross?" said Sam, peering down into the dark ravine.',
          'Tolu found loose stones nearby. "We could try to rebuild it," she said.',
          'They worked together, lifting heavy stones and placing them carefully. It took time and effort, but eventually, the bridge was solid enough to cross.',
          'On the other side, carved into a stone wall, was the second clue:',
          '"Courage is not the absence of fear. It is walking forward despite it."',
          'Sam gulped. "I think we are getting closer."',
        ],
      },
      {
        heading: 'Chapter 4: The Final Climb',
        paragraphs: [
          'The path to the top of Rainbow Hill was steep and rocky. Clouds gathered above them.',
          '"Are you scared?" Tolu asked.',
          '"A little," said Sam. "But I am more curious than scared."',
          '"That is exactly what courage is," said Tolu.',
          'They climbed together, helping each other over difficult spots. When Sam slipped, Tolu caught her hand. When Tolu was tired, Sam encouraged her to keep going.',
          'At the peak, they found a stone circle — seven large stones arranged in a ring, each painted a different colour of the rainbow.',
          'In the centre was a flat stone with a message:',
          '"Stand together in the centre, and the hill will remember its light."',
        ],
      },
      {
        heading: 'Chapter 5: The Rainbow',
        paragraphs: [
          'Tolu and Sam stepped into the centre of the stone circle, holding hands.',
          'For a moment, nothing happened.',
          'Then the sky above them began to change. The clouds parted, and rays of sunlight streamed down, hitting the seven coloured stones.',
          'One by one, the stones began to glow. Red. Orange. Yellow. Green. Blue. Indigo. Violet.',
          'The entire hilltop was bathed in rainbow light. It was more beautiful than either of them had imagined.',
          '"We did it!" whispered Tolu.',
          '"The riddle makes sense now," said Sam. "Wisdom led us through the questions. Courage carried us through the difficult climb. And friendship — us working together — brought us here."',
          'They sat in the rainbow light for a long time, not saying anything, just feeling the magic of the moment.',
          'When the light faded, they walked back down the mountain, hand in hand, with hearts full of wonder.',
          'The mystery of Rainbow Hill was solved. But the best part was not the rainbow — it was the journey they shared.',
        ],
      },
    ],
    learningReflection: [
      'Logical thinking and following clues help solve mysteries.',
      'Courage means being scared but moving forward anyway.',
      'Friendship and cooperation make hard journeys easier.',
      'The best adventures are shared with people you trust.',
    ],
    discussionQuestions: [
      'How did Tolu and Sam use logical thinking to find the clues?',
      'When have you been brave even though you were scared?',
      'What adventure would you like to go on with your best friend?',
    ],
  },
  {
    slug: 'goodnight-little-explorer',
    title: 'Goodnight, Little Explorer',
    author: 'LittleReads Editorial Team',
    ageRange: 'Ages 5–7',
    category: 'Bedtime Stories',
    copyrightYear: 2026,
    story: [
      {
        paragraphs: [
          'The sun was setting behind the hills, painting the sky in shades of pink and gold.',
          'Little Explorer — that was what her grandmother called her — stood at the edge of the garden and looked out at the world.',
          '"One last adventure before bed," she whispered.',
        ],
      },
      {
        heading: 'Chapter 1: The Chocolate River',
        paragraphs: [
          'As the last light of day faded, the garden began to change. The flowers grew taller. The trees stretched wider. And a river appeared where there had been none before — a river of warm, flowing chocolate.',
          'Little Explorer stepped onto the bank and dipped her toe in. It was smooth and sweet.',
          'She found a leaf boat and climbed in. The chocolate river carried her gently downstream, past chocolate banks lined with marshmallow flowers and candy cane trees.',
          'A family of frogs sat on a lily pad, croaking lullabies. "Ribbit, ribbit, rest your head. The day is done, it is time for bed."',
          'Little Explorer smiled and let the river carry her on.',
        ],
      },
      {
        heading: 'Chapter 2: The Pillow Mountain',
        paragraphs: [
          'The chocolate river led her to the foot of a tall mountain. But this was no ordinary mountain — it was made entirely of soft, fluffy pillows.',
          'Little Explorer climbed. Each step was soft and warm, like sinking into a cloud.',
          'Halfway up, she met a cloud rabbit who was napping on a pillow ledge.',
          '"Where are you going?" asked the rabbit sleepily.',
          '"To the top of Pillow Mountain!"',
          '"Why?"',
          '"To see the view before bed."',
          'The rabbit yawned. "The best view is right here, where it is warm and soft. Why not rest a while?"',
          'Little Explorer sat beside the rabbit for a moment, feeling the softness of the mountain beneath her.',
          '"Maybe just a moment," she said.',
        ],
      },
      {
        heading: 'Chapter 3: The Firefly Forest',
        paragraphs: [
          'When Little Explorer continued her climb, she reached the top of the mountain and stepped into a magical forest.',
          'Every tree was filled with fireflies — hundreds of them — glowing soft gold and green.',
          'They danced through the air like living stars, leaving trails of gentle light.',
          'Little Explorer walked among them, her hands outstretched, letting the light dance around her fingers.',
          'An old owl sat in the highest branch of the tallest tree.',
          '"Beautiful, is it not?" said the owl.',
          '"It is the most beautiful thing I have ever seen," said Little Explorer.',
          '"The fireflies only come out at night," said the owl. "They save their light for when the world is dark, to remind everyone that there is beauty even in the quiet moments."',
          'Little Explorer watched the fireflies dance and felt her eyelids growing heavy.',
        ],
      },
      {
        heading: 'Chapter 4: The Star Garden',
        paragraphs: [
          'Beyond the forest, Little Explorer found a garden — but not a garden of flowers. This was a garden of stars.',
          'They grew from the ground like silver tulips, each one glowing with a soft, warm light.',
          'She reached out and touched one. It was warm, like holding a tiny sun.',
          '"These are baby stars," said a voice. It was the friendly owl, who had flown silently behind her.',
          '"Where do they come from?"',
          '"From dreams," said the owl. "Every time a child falls asleep thinking happy thoughts, a star is born. The more you dream, the more stars grow."',
          'Little Explorer picked a small star and held it close. It made her feel warm and safe.',
          '"I will dream happy dreams tonight," she said.',
          '"Then the garden will grow," said the owl.',
        ],
      },
      {
        heading: 'Chapter 5: Goodnight',
        paragraphs: [
          'Little Explorer was very tired now. The adventures had been wonderful, but her eyes were closing and her body felt heavy with sleep.',
          'She lay down in the soft grass of the Star Garden, the little star resting in her hands, and looked up at the sky.',
          'The moon was round and gentle, like a grandmother\'s smile.',
          '"Goodnight, moon," she whispered.',
          '"Goodnight, fireflies."',
          '"Goodnight, chocolate river and Pillow Mountain."',
          '"Goodnight, owl."',
          '"Goodnight, stars — all the ones that are and all the ones that will be born from my dreams tonight."',
          'And as she closed her eyes, the Star Garden glowed a little brighter, and the fireflies danced a little softer, and the chocolate river hummed a lullaby just for her.',
          'Little Explorer smiled and drifted off to sleep, ready for tomorrow\'s adventures.',
          'Goodnight, little explorer. Goodnight.',
        ],
      },
    ],
    learningReflection: [
      'Imagination can take us on wonderful adventures, even at bedtime.',
      'Nature is beautiful, especially in the quiet moments.',
      'Dreams are a special kind of adventure.',
      'Ending the day with gratitude and peaceful thoughts helps us rest.',
    ],
    discussionQuestions: [
      'What adventure would you go on before bedtime?',
      'What would you say goodnight to if you could say goodnight to everything?',
      'How do you feel when someone reads you a bedtime story?',
    ],
  },
];

function createBookPDF(book: BookStory, outputPath: string) {
  const doc = new PDFDocument({
    size: 'A5',
    margins: { top: 60, bottom: 60, left: 50, right: 50 },
    info: {
      Title: book.title,
      Author: book.author,
      Subject: `Children's eBook - ${book.category} - ${book.ageRange}`,
      Creator: 'LittleReads eBook Generator',
    },
  });

  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  // Cover
  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#7C3AED');
  doc.fontSize(10).fill('#ffffff').text('LittleReads', 50, 80, { align: 'center' });
  doc.moveDown(4);
  doc.fontSize(22).fill('#ffffff').text(book.title, 50, undefined, {
    align: 'center', width: doc.page.width - 100,
  });
  doc.moveDown(2);
  doc.fontSize(11).fill('#ffffff').text(book.category, 50, undefined, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).fill('#ffffff').text(book.ageRange, 50, undefined, { align: 'center' });
  doc.moveDown(3);
  doc.fontSize(10).fill('#ffffff').text(`by ${book.author}`, 50, undefined, { align: 'center' });
  doc.addPage();

  // Title Page
  doc.fontSize(10).fill('#999').text('LittleReads', 50, 120, { align: 'center' });
  doc.moveDown(4);
  doc.fontSize(20).fill('#333').text(book.title, 50, undefined, { align: 'center', width: doc.page.width - 100 });
  doc.moveDown(2);
  doc.fontSize(12).fill('#666').text(`by ${book.author}`, { align: 'center' });
  doc.moveDown(1);
  doc.fontSize(10).fill('#999').text(`${book.ageRange} • ${book.category}`, { align: 'center' });
  doc.addPage();

  // Copyright
  doc.fontSize(8).fill('#999');
  doc.text(`© ${book.copyrightYear} LittleReads Publishing`, 50, 120, { align: 'center' });
  doc.moveDown(0.5);
  doc.text('All rights reserved.', { align: 'center' });
  doc.moveDown(0.5);
  doc.text('Published by LittleReads Publishing', { align: 'center' });
  doc.moveDown(0.5);
  doc.text('www.littlereads.com', { align: 'center' });
  doc.addPage();

  // Story
  let pageNum = 5;
  for (const section of book.story) {
    if (section.heading) {
      doc.fontSize(13).fill('#7C3AED').text(section.heading, 50, 70, { width: doc.page.width - 100 });
      doc.moveDown(0.5);
    }
    const startY = section.heading ? undefined : 70;
    for (const para of section.paragraphs) {
      doc.fontSize(10).fill('#333').text(para, 50, startY, { width: doc.page.width - 100, lineGap: 3 });
      doc.moveDown(0.6);
    }
    doc.fontSize(8).fill('#999').text(`${pageNum}`, 50, doc.page.height - 35, { align: 'center', width: doc.page.width - 100 });
    doc.addPage();
    pageNum++;
  }

  // Learning Reflection
  doc.fontSize(13).fill('#7C3AED').text('What We Learned', 50, 70, { width: doc.page.width - 100 });
  doc.moveDown(0.5);
  for (const point of book.learningReflection) {
    doc.fontSize(10).fill('#333').text(`• ${point}`, 60, undefined, { width: doc.page.width - 120, lineGap: 3 });
    doc.moveDown(0.3);
  }
  doc.addPage();

  // Discussion Questions
  doc.fontSize(13).fill('#7C3AED').text('Discussion Questions', 50, 70, { width: doc.page.width - 100 });
  doc.moveDown(0.5);
  for (let i = 0; i < book.discussionQuestions.length; i++) {
    doc.fontSize(10).fill('#333').text(`${i + 1}. ${book.discussionQuestions[i]}`, 60, undefined, { width: doc.page.width - 120, lineGap: 3 });
    doc.moveDown(0.4);
  }
  doc.addPage();

  // End Page
  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#FFF8F0');
  doc.fontSize(10).fill('#7C3AED').text('LittleReads', 50, 120, { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(14).fill('#333').text('Thank you for reading!', 50, undefined, { align: 'center' });
  doc.moveDown(1);
  doc.fontSize(10).fill('#666').text('Big Adventures for Little Readers', { align: 'center' });
  doc.moveDown(1);
  doc.fontSize(10).fill('#999').text('www.littlereads.com', { align: 'center' });

  doc.end();

  return new Promise<void>((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

async function generateAllEbooks() {
  fs.mkdirSync(BOOKS_DIR, { recursive: true });

  console.log('Generating 20 ebooks...\n');
  console.log('TITLE | PAGES | STATUS');
  console.log('------|-------|--------');

  for (const book of allBooks) {
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

  console.log(`\n✅ Generated ${allBooks.length} ebooks`);
}

generateAllEbooks().catch(console.error);
