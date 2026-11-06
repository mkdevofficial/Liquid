// Gamified Microlearning Engine & Seasons Curriculum for Liquid Framework

/**
 * Self-contained in-browser Liquid validator & compiler for microlearning challenges.
 * Validates section headers, 2-space indentation rules, tags, and scoped styles.
 */
export function compile(source, options = {}) {
  const file = options.file || 'Component.liq';
  const rawLines = String(source || '').split(/\r?\n/);
  let currentSection = 'ui';
  let stylesContent = '';
  let logicContent = '';
  const uiLines = [];

  for (let lineIndex = 0; lineIndex < rawLines.length; lineIndex++) {
    const lineNumber = lineIndex + 1;
    const rawLine = rawLines[lineIndex];

    const sectionMatch = rawLine.match(/^---\s*([a-zA-Z0-9_-]*)\s*$/);
    if (sectionMatch) {
      const rawName = sectionMatch[1].toLowerCase();
      if (rawName === 'logic' || rawName === 'js' || rawName === 'script') {
        currentSection = 'logic';
      } else if (rawName === 'style' || rawName === 'styles' || rawName === 'css') {
        currentSection = 'style';
      } else if (rawName === 'ui' || rawName === 'template' || rawName === '') {
        currentSection = 'ui';
      } else {
        throw new Error(`[LQ-102] Unknown section header '--- ${rawName}'. Valid sections are '--- logic', '--- style', or '--- ui'. (Line ${lineNumber})`);
      }
      continue;
    }

    if (currentSection === 'logic') {
      logicContent += rawLine + '\n';
      continue;
    }

    if (currentSection === 'style') {
      stylesContent += rawLine + '\n';
      continue;
    }

    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('//') || (trimmed[0] === '/' && trimmed[1] === '*')) {
      continue;
    }

    const leadingWhitespaceMatch = rawLine.match(/^[ \t]*/);
    const leadingWhitespace = leadingWhitespaceMatch ? leadingWhitespaceMatch[0] : '';
    const hasTabs = leadingWhitespace.includes('\t');
    const hasSpaces = leadingWhitespace.includes(' ');

    if (hasTabs && hasSpaces) {
      throw new Error(`[LQ-101] Mixed tabs and spaces in indentation are not allowed. Please use spaces only (2 spaces per indent level). (Line ${lineNumber})`);
    }

    if (hasTabs) {
      throw new Error(`[LQ-101] Indentation contains tabs. Liquid strictly requires 2 spaces. (Line ${lineNumber})`);
    }

    const indentLength = leadingWhitespace.length;
    if (indentLength % 2 !== 0) {
      throw new Error(`[LQ-103] Inconsistent indentation level: ${indentLength} spaces. Each indentation level must be an exact multiple of 2 spaces. (Line ${lineNumber})`);
    }

    uiLines.push({ line: lineNumber, indent: indentLength, text: trimmed });
  }

  return {
    code: '// compiled successfully',
    css: stylesContent,
    uiLines,
    logicContent
  };
}

// --- Web Audio API Pure Synth Sound Engine (Zero external audio files needed) ---
let audioCtx = null;
function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playSound(type = 'success', enabled = true) {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    if (type === 'success') {
      // Pleasant bright ascending chord: C5 (523Hz), E5 (659Hz), G5 (784Hz), C6 (1046Hz)
      const freqs = [523.25, 659.25, 783.99, 1046.50];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.18, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.36);
      });
    } else if (type === 'error') {
      // Gentle soft buzz: 160Hz -> 120Hz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.25);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
    } else if (type === 'levelup') {
      // Triumphal fanfare
      const notes = [
        { f: 523.25, t: 0.00, d: 0.12 },
        { f: 659.25, t: 0.12, d: 0.12 },
        { f: 783.99, t: 0.24, d: 0.12 },
        { f: 1046.5, t: 0.38, d: 0.45 }
      ];
      notes.forEach(({ f, t, d }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + t);
        gain.gain.setValueAtTime(0.25, now + t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + d);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + t);
        osc.stop(now + t + d + 0.01);
      });
    } else if (type === 'exam') {
      // Grand victory sequence
      const freqs = [392, 523.25, 659.25, 783.99, 1046.5, 1318.5];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + i * 0.09);
        gain.gain.setValueAtTime(0.2, now + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.09);
        osc.stop(now + i * 0.09 + 0.52);
      });
    }
  } catch (err) {
    // Fail gracefully if audio is blocked by user browser policy
  }
}

// --- Player Profile & Progression Store ---
const STORAGE_KEY = 'liquid_play_profile_v1';

export function getInitialProfile() {
  return {
    xp: 0,
    streak: 1,
    soundEnabled: true,
    completedEpisodes: {}, // { 's1-e1': true, ... }
    passedExams: {},        // { 's1': true, ... }
    examScores: {},         // { 's1': 100, ... }
    unlockedSeasons: { 1: true },
    activeSeasonId: 1
  };
}

export function loadProfile() {
  if (typeof window === 'undefined') return getInitialProfile();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getInitialProfile();
    const data = JSON.parse(raw);
    return { ...getInitialProfile(), ...data };
  } catch {
    return getInitialProfile();
  }
}

export function saveProfile(profile) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {}
}

export function getRankInfo(xp = 0) {
  if (xp >= 3000) {
    return { level: 5, titleAr: 'أسطورة ليكويد 👑', titleEn: 'Liquid Legend 👑', nextXp: 5000, currentBase: 3000, color: '#f59e0b' };
  }
  if (xp >= 1500) {
    return { level: 4, titleAr: 'مهندس الواجهات 🏛️', titleEn: 'UI Architect 🏛️', nextXp: 3000, currentBase: 1500, color: '#8b5cf6' };
  }
  if (xp >= 700) {
    return { level: 3, titleAr: 'بارع الـ Signals ⚡', titleEn: 'Reactivity Pro ⚡', nextXp: 1500, currentBase: 700, color: '#06b6d4' };
  }
  if (xp >= 250) {
    return { level: 2, titleAr: 'مبرمج صاعد 🚀', titleEn: 'Rising Apprentice 🚀', nextXp: 700, currentBase: 250, color: '#10b981' };
  }
  return { level: 1, titleAr: 'مستكشف مبتدئ 🌱', titleEn: 'Liquid Scout 🌱', nextXp: 250, currentBase: 0, color: '#0284c7' };
}

// --- Seasons & Microlearning Curriculum ---
export const SEASONS = [
  {
    id: 1,
    titleAr: 'الموسم الأول: أول قطرة — الأساسيات والصياغة الأنيقة',
    titleEn: 'Season 1: First Drop — Foundations & Syntax',
    badge: '💧',
    badgeNameAr: 'شارة كشاف ليكويد',
    badgeNameEn: 'Liquid Scout Badge',
    descriptionAr: 'تعلم كيف تتخلص من زوائد HTML والأقواس، واكتب واجهات مستخدم فائقة الإيجاز مع مسافتين إزاحة فقط.',
    descriptionEn: 'Say goodbye to closing tags and angle brackets. Master indent-based UI syntax in under 3 minutes per bite.',
    totalXp: 400,
    examThreshold: 80, // % required to pass
    episodes: [
      {
        id: 's1-e1',
        titleAr: 'قاعدة المسافات البادئة (2-Space Indent)',
        titleEn: 'The Indentation Rule (2 Spaces)',
        xp: 50,
        type: 'code',
        summaryAr: 'في Liquid الهيكل يتم تحديده بمسافتين فقط. لا وجود لأقواس الفتح والإغلاق ولا وسوم الإغلاق.',
        summaryEn: 'In Liquid, structure is purely indentation. 2 spaces indent child elements. No <> tags.',
        theoryAr: `في لغة Liquid، كل سطر يمثل عنصراً واحداً.
العنصر الأب يبدأ في بداية السطر، وأي عنصر ابن يوضع تحته بإزاحة مقدارها **مسافتان بالضبط** (2 spaces).
إذا استخدمت الـ Tab أو مسافات غير متناسقة سيرشدك المترجم فوراً بالخطأ **LQ-101**.`,
        theoryEn: `In Liquid, each line represents one element.
Children are indented with exactly **2 spaces**.
Tabs or erratic indents trigger error **LQ-101**.`,
        starterCode: `--- ui
div.card
  h1 أهلاً بك في Liquid
  p ابدأ رحلتك التفاعلية هنا`,
        challengePromptAr: 'عدل الكود أدناه لإضافة زر باسم `button.btn-start` تحته نص "ابدأ الآن" مع الالتزام التام بالإزاحة الصحيحة (مسافتان تحت div.card).',
        challengePromptEn: 'Update the code below to add a `button.btn-start` with text "Start Now", keeping proper 2-space indentation.',
        validate(code) {
          try {
            const res = compile(code);
            const hasButton = code.includes('button.btn-start') || code.includes('button');
            const hasProperIndent = code.match(/\n {2}button/);
            if (!hasButton) {
              return { success: false, msgAr: 'يجب إضافة وسم button في الكود', msgEn: 'You must add a button element' };
            }
            if (!hasProperIndent) {
              return { success: false, msgAr: 'تأكد من وضع مسافتين بالضبط (2 spaces) قبل زر button ليكون ابناً لـ div.card', msgEn: 'Ensure exactly 2 spaces indent before button' };
            }
            return { success: true };
          } catch (e) {
            return { success: false, msgAr: `خطأ مترجم: ${e.message}`, msgEn: `Compiler Error: ${e.message}` };
          }
        }
      },
      {
        id: 's1-e2',
        titleAr: 'اختصارات الكلاس والمعرّف (.class & #id)',
        titleEn: 'Shorthand Class & ID (.class & #id)',
        xp: 50,
        type: 'quiz',
        summaryAr: 'ضع نقطة للكلاس وشباك للمعرّف ملاصقة لاسم الوسم بدون كتابة class="...".',
        summaryEn: 'Append .class and #id directly to the tag name without attribute ceremony.',
        theoryAr: `بدلاً من كتابة:
\`<div class="alert alert-success" id="banner"></div>\`

في Liquid تكتبها في سطر واحد فائق الإيجاز:
\`div.alert.alert-success#banner مرحباً بك!\``,
        theoryEn: `Instead of bulky HTML attributes, in Liquid you write:
\`div.alert.alert-success#banner Welcome!\``,
        questionAr: 'ما هي الطريقة الصحيحة لكتابة عنصر span يحمل كلاس `badge` ومعرف `primary` مع النص "جديد"؟',
        questionEn: 'Which is the correct way to write a span with class `badge`, id `primary`, and text "New"?',
        options: [
          'span.badge#primary جديد',
          'span class="badge" id="primary" جديد',
          'span .badge #primary جديد',
          '<span class="badge" id="primary">جديد</span>'
        ],
        correctIndex: 0,
        explanationAr: 'في Liquid تلصق الكلاس والمعرف بالوسم مباشرة بدون مسافات: span.badge#primary.',
        explanationEn: 'In Liquid, shorthand classes and IDs are chained directly to tag name.'
      },
      {
        id: 's1-e3',
        titleAr: 'حقن المتغيرات الحية {interpolation}',
        titleEn: 'Data Interpolation {interpolation}',
        xp: 50,
        type: 'code',
        summaryAr: 'استخدم الأقواس المجعدة {expression} لعرض أي تعبير جافاسكريبت داخل النص أو الخصائص.',
        summaryEn: 'Use curly braces {expression} to evaluate and render any dynamic JS expression.',
        theoryAr: `في أقسام UI، يمكنك تضمين أي متغير أو تعبير جافاسكريبت داخل الأقواس \`{...}\`:
\`\`\`liquid
--- logic
const name = 'أحمد';
const year = 2026;

--- ui
div.profile
  h2 مرحباً {name} في عام {year}
\`\`\``,
        theoryEn: `Within UI sections, embed dynamic expressions inside \`{...}\`:
\`\`\`liquid
--- logic
const user = 'Sara';

--- ui
h1 Hello {user}
\`\`\``,
        starterCode: `--- logic
const framework = 'Liquid';
const speed = 'فائق السرعة';

--- ui
div.hero
  h1 {framework} هو إطار عمل
`,
        challengePromptAr: 'أكمل سطر الـ h1 ليصبح: `{framework} هو إطار عمل {speed}` ثم افحص النتيجة.',
        challengePromptEn: 'Complete the h1 line to read: `{framework} is {speed}`.',
        validate(code) {
          try {
            compile(code);
            if (!code.includes('{speed}')) {
              return { success: false, msgAr: 'تأكد من حقن التعبير {speed} داخل النص', msgEn: 'Ensure {speed} is interpolated in text' };
            }
            return { success: true };
          } catch (e) {
            return { success: false, msgAr: `خطأ ترجمة: ${e.message}`, msgEn: `Compile error: ${e.message}` };
          }
        }
      },
      {
        id: 's1-e4',
        titleAr: 'ربط الأحداث المباشر (@click)',
        titleEn: 'Event Binding with @ (@click)',
        xp: 50,
        type: 'quiz',
        summaryAr: 'استخدم البادئة @ متبوعة باسم الحدث (@click, @input, @submit).',
        summaryEn: 'Prefix event names with @, such as @click, @keydown.enter, @input.',
        theoryAr: `في Liquid، لا نحتاج لكتابة \`onclick="handleClick()"\`.
نستخدم رمز \`@\` المباشر:
\`\`\`liquid
button.btn @click=saveData حفظ التعديلات
\`\`\`
كما يدعم Liquid معدّلات الأحداث مثل \`@click.stop\` و \`@keydown.enter\` تلقائياً!`,
        theoryEn: `Liquid uses @ prefix for ultra-fast events:
\`\`\`liquid
button.btn @click=saveData Save
\`\`\`
Event modifiers like \`@click.prevent\` and \`@keydown.enter\` work automatically!`,
        questionAr: 'كيف نربط دالة `toggleMenu` بحدث النقر على زر في Liquid؟',
        questionEn: 'How do you bind the function `toggleMenu` to a button click in Liquid?',
        options: [
          'button @click=toggleMenu فتح القائمة',
          'button (click)=toggleMenu فتح القائمة',
          'button v-on:click=toggleMenu فتح القائمة',
          'button onclick="toggleMenu()" فتح القائمة'
        ],
        correctIndex: 0,
        explanationAr: 'في لغة Liquid يُكتب الحدث مباشرة بالبادئة @ كالتالي: @click=toggleMenu.',
        explanationEn: 'Liquid binds events using the @ prefix directly.'
      }
    ],
    // --- Boss Exam at the end of Season 1 ---
    exam: {
      id: 's1-boss',
      titleAr: '🏆 امتحان نهاية الموسم الأول: قطرة الإتقان',
      titleEn: '🏆 Season 1 Boss Exam: Drop of Mastery',
      rewardXp: 200,
      questions: [
        {
          qAr: 'كم عدد المسافات البادئة الإلزامية لتعريف عنصر ابن في Liquid؟',
          qEn: 'How many indentation spaces strictly define a child element in Liquid?',
          options: ['مسافة واحدة (1 space)', 'مسافتان بالضبط (2 spaces)', 'أربع مسافات (4 spaces)', 'حسب رغبة المبرمج'],
          correct: 1,
          expAr: 'قاعدة Liquid الصارمة هي مسافتان بالضبط (2 spaces) لكل مستوى تداخل.'
        },
        {
          qAr: 'أي من الأكواد التالية ينشئ زراً بالمعرف `submit-btn` والكلاس `btn-success`؟',
          qEn: 'Which syntax creates a button with id `submit-btn` and class `btn-success`?',
          options: ['button#submit-btn.btn-success إرسال', 'button.submit-btn#btn-success إرسال', 'button id="submit-btn" class="btn-success"', '<button id="submit-btn" class="btn-success">'],
          correct: 0,
          expAr: 'الكلاس يبدأ بنقطة والمعرف يبدأ بشباك: button#submit-btn.btn-success.'
        },
        {
          qAr: 'ما هو كود الخطأ الذي يطلقه مترجم Liquid عند خلط الـ Tabs والمسافات؟',
          qEn: 'Which error code is thrown when mixing tabs and spaces in indentation?',
          options: ['LQ-101', 'LQ-202', 'LQ-301', 'LQ-404'],
          correct: 0,
          expAr: 'الخطأ LQ-101 هو مخصص لـ "Mixed tabs and spaces in indentation".'
        },
        {
          qAr: 'ماذا يحدث إذا قمنا بتضمين تعبير متغير داخل الأقواس {2 + 3} في قالب الواجهة؟',
          qEn: 'What happens when evaluating {2 + 3} in a Liquid template?',
          options: ['يظهر النص الحرفي {2 + 3}', 'يتم حساب التعبير وعرض الرقم 5', 'يحدث خطأ أثناء الترجمة', 'يتم تجاهل السطر'],
          correct: 1,
          expAr: 'أي تعبير داخل {} هو كود JavaScript نقي يُقيّم تلقائياً.'
        },
        {
          qAr: 'ما هو التنسيق الصحيح لمنع السلوك الافتراضي لنموذج Form عند إرساله؟',
          qEn: 'How do you prevent the default event on form submit in Liquid?',
          options: ['form @submit.prevent=handleSubmit', 'form @submit(preventDefault)=handleSubmit', 'form onsubmit="return false;"', 'form !submit=handleSubmit'],
          correct: 0,
          expAr: 'يدعم Liquid معدلات الأحداث المدمجة مثل @submit.prevent مباشرة.'
        }
      ]
    }
  },

  {
    id: 2,
    titleAr: 'الموسم الثاني: نبض التفاعلية — الإشارات وسحر الـ Signals',
    titleEn: 'Season 2: Reactivity Pulse — The Magic of Signals',
    badge: '⚡',
    badgeNameAr: 'شارة كيميائي التفاعلية',
    badgeNameEn: 'Reactivity Alchemist Badge',
    descriptionAr: 'اكتشف كيف يحدث Liquid عناصر DOM فقط دون Virtual DOM، وأتقن signal و computed و effect و $bind.',
    descriptionEn: 'Master fine-grained reactivity. No virtual DOM overhead. Learn signal, computed, effect, and $bind.',
    totalXp: 600,
    examThreshold: 80,
    episodes: [
      {
        id: 's2-e1',
        titleAr: 'إنشاء الإشارة وقراءتها signal()',
        titleEn: 'Creating and Reading Signals',
        xp: 75,
        type: 'code',
        summaryAr: 'signal(initialValue) يعطيك دالة تقرأ قيمتها باستدعائها count() وتحدثها بـ count.value++.',
        summaryEn: 'signal(init) creates a reactive primitive read via count() and updated via count.value++.',
        theoryAr: `الإشارات (Signals) هي قلب Liquid:
\`\`\`javascript
import { signal } from 'liquid';

const score = signal(10);
console.log(score()); // قراءة: 10
score.value += 5;     // تحديث: 15
score.set(20);        // أو بدالة set
\`\`\`
عندما تتغير الإشارة، يتحدث فقط النص المحدد في المتصفح بسرعة خيالية!`,
        theoryEn: `Signals represent fine-grained reactive state:
\`\`\`javascript
const score = signal(10);
score(); // read
score.value += 5; // write
\`\`\``,
        starterCode: `--- logic
import { signal } from 'liquid';

// أنشئ إشارة باسم clicks تبدأ بالقيمة 0
const clicks = signal(0);

function tap() {
  clicks.value++;
}

--- ui
div.counter
  p النقرات: {clicks()}
  button @click=tap انقر هنا`,
        challengePromptAr: 'تأكد من وجود الإشارة clicks ودالة tap ثم اضغط فحص الكود.',
        challengePromptEn: 'Verify the clicks signal and tap handler, then click check.',
        validate(code) {
          try {
            compile(code);
            if (!code.includes('signal(') || !code.includes('clicks')) {
              return { success: false, msgAr: 'يجب تعريف إشارة باسم clicks عبر signal(...)', msgEn: 'Must define clicks signal' };
            }
            return { success: true };
          } catch (e) {
            return { success: false, msgAr: `خطأ ترجمة: ${e.message}`, msgEn: `Error: ${e.message}` };
          }
        }
      },
      {
        id: 's2-e2',
        titleAr: 'القيم المشتقة الذكية computed()',
        titleEn: 'Smart Derived Values computed()',
        xp: 75,
        type: 'quiz',
        summaryAr: 'computed تحسب القيمة تلقائياً وتخزنها مؤقتاً (Cached) ولا تعيد الحساب إلا إذا تغيرت الإشارة الأصلية.',
        summaryEn: 'computed derives state lazily and memoizes result until dependencies change.',
        theoryAr: `إذا كانت لديك إشارة \`price\` وتريد حساب السعر مع الضريبة:
\`\`\`javascript
const price = signal(100);
const total = computed(() => price() * 1.15);
\`\`\`
الدالة \`computed\` ذكية جداً: لا تعيد الحساب أبداً إلا إذا تغيرت قيمة \`price\`!`,
        theoryEn: `computed calculates derived state automatically:
\`\`\`javascript
const price = signal(100);
const total = computed(() => price() * 1.15);
\`\`\``,
        questionAr: 'ما هي الميزة الأساسية لـ computed() مقارنة بكتابة دالة عادية؟',
        questionEn: 'What is the main advantage of computed() over a regular function?',
        options: [
          'تخزين الناتج مؤقتاً (Memoization) وعدم إعادة الحساب إلا عند تغير الإشارات المعتمدة عليها',
          'أنها تعمل فقط داخل لغات أخرى غير JavaScript',
          'أنها تمنع المستخدم من تحديث الصفحة',
          'ليس هناك أي فرق بينهما'
        ],
        correctIndex: 0,
        explanationAr: 'computed تقوم بالتخزين المؤقت وتتبع التبعيات بدقة ولا تعيد التنفيذ إلا عند الحاجة.',
        explanationEn: 'computed tracks dependencies and caches results for peak performance.'
      },
      {
        id: 's2-e3',
        titleAr: 'المؤثرات الجانبية effect() ودورة الحياة',
        titleEn: 'Side Effects & effect()',
        xp: 75,
        type: 'quiz',
        summaryAr: 'effect تراقب الإشارات وتنفذ كوداً جانبياً (مثل التخزين في localStorage أو تحديث عنوان الصفحة).',
        summaryEn: 'effect automatically runs and re-runs when any referenced signal changes.',
        theoryAr: `عندما تحتاج لتسجيل البيانات، تحديث عنوان التبويب، أو مزامنة localStorage:
\`\`\`javascript
import { signal, effect } from 'liquid';

const username = signal('سارة');

effect(() => {
  document.title = 'مرحباً ' + username();
});
\`\`\`
في كل مرة يتغير \`username\`، يُعاد تشغيل الـ effect تلقائياً!`,
        theoryEn: `Effects run side-effects whenever referenced signals change:
\`\`\`javascript
effect(() => {
  localStorage.setItem('theme', theme());
});
\`\`\``,
        questionAr: 'كيف نتجنب حدوث حلقة لا نهائية (Infinite Loop LQ-202) عند قراءة إشارة داخل effect وتحديثها؟',
        questionEn: 'How do you avoid infinite reactive loops (LQ-202) inside an effect?',
        options: [
          'استخدام untrack(() => signal()) لقراءة الإشارة بدون الاشتراك في مراقبتها',
          'حذف الإشارة بالكامل من الذاكرة',
          'وضع الـ effect داخل وسم h1',
          'تحويل الملف إلى صيغة HTML تقليدية'
        ],
        correctIndex: 0,
        explanationAr: 'تسمح دالة untrack(...) بقراءة الإشارة دون تسجيلها كتابع في الـ effect.',
        explanationEn: 'untrack(...) reads a signal without registering a dependency.'
      },
      {
        id: 's2-e4',
        titleAr: 'الربط المزدوج الفوري $bind',
        titleEn: 'Two-Way Binding with $bind',
        xp: 75,
        type: 'code',
        summaryAr: 'توجيه $bind=mySignal يربط حقول الإدخال بالإشارة تلقائياً ذهاباً وإياباً.',
        summaryEn: '$bind=mySignal synchronizes input value with signal bi-directionally.',
        theoryAr: `بدلاً من ربط \`value={text()}\` وكتابة \`@input=...\`:
\`\`\`liquid
--- logic
const query = signal('');

--- ui
div.search
  input type="text" $bind=query placeholder="ابحث..."
  p أنت تبحث عن: {query()}
\`\`\`
أي حرف يكتبه المستخدم ينتقل للإشارة، وأي تعديل برمجي ينعكس في الحقل فوراً!`,
        theoryEn: `Effortless two-way binding:
\`\`\`liquid
input type="text" $bind=query
\`\`\``,
        starterCode: `--- logic
import { signal } from 'liquid';

const note = signal('ملاحظة أولية');

--- ui
div.editor
  input type="text" $bind=note
  p المعاينة: {note()}
`,
        challengePromptAr: 'تحقق من كود الربط $bind واضغط فحص لتأكيد صلاحية الربط.',
        challengePromptEn: 'Check the $bind syntax and compile.',
        validate(code) {
          try {
            compile(code);
            if (!code.includes('$bind=')) {
              return { success: false, msgAr: 'يجب أن يحتوي الكود على توجيه $bind=', msgEn: 'Must contain $bind= directive' };
            }
            return { success: true };
          } catch (e) {
            return { success: false, msgAr: `خطأ ترجمة: ${e.message}`, msgEn: `Compile error: ${e.message}` };
          }
        }
      }
    ],
    exam: {
      id: 's2-boss',
      titleAr: '🏆 امتحان نهاية الموسم الثاني: صانع التفاعلية',
      titleEn: '🏆 Season 2 Boss Exam: Reactivity Architect',
      rewardXp: 300,
      questions: [
        {
          qAr: 'كيف يتم تحديث قيمة إشارة count في Liquid؟',
          qEn: 'How do you update a signal count in Liquid?',
          options: ['count.value = 5 أو count.set(5)', 'count = 5', 'update(count, 5)', 'count.change(5)'],
          correct: 0,
          expAr: 'يمكن استخدام الخاصية المباشرة count.value = 5 أو الدالة count.set(5).'
        },
        {
          qAr: 'ما الفرق الجوهري بين Liquid وأطر العمل مثل React في تحديث الـ DOM؟',
          qEn: 'What is the core difference between Liquid and React in DOM updates?',
          options: ['Liquid يحدث فقط العقدة المتأثرة مباشرة دون شجرة وهمية Virtual DOM', 'Liquid يعيد تصيير الصفحة بالكامل من الخادم', 'Liquid يتطلب بطاقة شاشة مخصصة', 'لا يوجد أي فرق تقني'],
          correct: 0,
          expAr: 'Liquid يستخدم Fine-grained Reactivity دقيقة تحدّث نص أو خاصية الـ DOM مباشرة وبسرعة خارقة.'
        },
        {
          qAr: 'ما هو كود الخطأ الدال على وجود حلقة تفاعلية لا نهائية (Cyclic Dependency)؟',
          qEn: 'Which error code indicates an infinite reactive loop?',
          options: ['LQ-202', 'LQ-101', 'LQ-401', 'LQ-302'],
          correct: 0,
          expAr: 'الخطأ LQ-202 هو خطأ الحلقة التفاعلية اللانهائية.'
        },
        {
          qAr: 'أي توجيه في Liquid يوفر الربط ثنائي الاتجاه لحقول الإدخال وصناديق الاختيار؟',
          qEn: 'Which directive provides two-way binding in Liquid?',
          options: ['$bind', '@bind', ':model', '#bind'],
          correct: 0,
          expAr: 'التوجيه المخصص في Liquid هو $bind=signalName.'
        },
        {
          qAr: 'متى يتم تنفيذ الدالة الممررة إلى effect() لأول مرة؟',
          qEn: 'When does the function passed to effect() execute for the first time?',
          options: ['فور استدعائها مباشرة وتسجيل التبعيات', 'بعد مرور 5 ثوانٍ', 'فقط عند نقر زر الفأرة', 'لا تنفذ إلا عند إغلاق المتصفح'],
          correct: 0,
          expAr: 'دالة effect() تنفذ على الفور (Synchronously) لتتبع الإشارات المقروءة بداخلها.'
        }
      ]
    }
  },

  {
    id: 3,
    titleAr: 'الموسم الثالث: البناء المعماري — الشروط والحلقات والمكونات',
    titleEn: 'Season 3: Architecture — Blocks, Loops & Components',
    badge: '🧩',
    badgeNameAr: 'شارة مهندس المكونات',
    badgeNameEn: 'Component Architect Badge',
    descriptionAr: 'احترف شروط if/else وحلقات each ذات المفاتيح الفريدة واستيراد المكونات مع Props و Slots.',
    descriptionEn: 'Master if/else branches, keyed each loops, component decomposition with props and slots.',
    totalXp: 800,
    examThreshold: 80,
    episodes: [
      {
        id: 's3-e1',
        titleAr: 'الشروط الذكية (if / elseif / else)',
        titleEn: 'Conditional Blocks (if / elseif / else)',
        xp: 100,
        type: 'code',
        summaryAr: 'شروط بسيطة ومعبرة بدون أقواس: if condition متبوعة بالعناصر المزاحة.',
        summaryEn: 'Expressive conditionals: if condition followed by indented block.',
        theoryAr: `في واجهات Liquid، تكتب الشروط بانسيابية كاملة:
\`\`\`liquid
--- ui
div.panel
  if isLoggedIn()
    p مرحباً بك يا {user.name}
    button @click=logout تسجيل الخروج
  else
    button @click=login تسجيل الدخول
\`\`\`
لا حوجة لأقواس أو كلمات إغلاق؛ مستوى المسافات البادئة هو الذي يحدد نطاق كل شرط!`,
        theoryEn: `Clean indentation-based conditionals:
\`\`\`liquid
if condition
  h1 Active
else
  h1 Inactive
\`\`\``,
        starterCode: `--- logic
import { signal } from 'liquid';
const score = signal(85);

--- ui
div.result
  if score() >= 90
    span.badge ممتاز 🌟
  elseif score() >= 50
    span.badge ناجح ✓
  else
    span.badge أعد المحاولة 🔄
`,
        challengePromptAr: 'افحص كود الشروط الثلاثية if / elseif / else واضغط على فحص الكود.',
        challengePromptEn: 'Verify the conditional block syntax and check.',
        validate(code) {
          try {
            compile(code);
            if (!code.includes('if ') || !code.includes('else')) {
              return { success: false, msgAr: 'يجب أن يحتوي الكود على شروط if و else', msgEn: 'Must include if and else' };
            }
            return { success: true };
          } catch (e) {
            return { success: false, msgAr: `خطأ ترجمة: ${e.message}`, msgEn: `Error: ${e.message}` };
          }
        }
      },
      {
        id: 's3-e2',
        titleAr: 'الحلقات السريعة فائقة الدقة (each ... (key))',
        titleEn: 'Keyed List Loops (each ... (key))',
        xp: 100,
        type: 'quiz',
        summaryAr: 'تكرار القوائم بكفاءة: each items() as item (item.id). المفتاح يمنع إعادة بناء العناصر.',
        summaryEn: 'Efficient list loops with keys preserve DOM elements on updates.',
        theoryAr: `صياغة حلقة التكرار في Liquid:
\`\`\`liquid
ul.tasks
  each tasks() as task (task.id)
    li.item {task.title}
\`\`\`
المفتاح \`(task.id)\` في نهاية السطر يضمن أن إضافة عنصر جديد لن تعيد إنشاء بقية عناصر القائمة، بل تحركها فقط في الـ DOM بأعلى كفاءة!
تكرار المفتاح يطلق التحذير الذكي **LQ-204**.`,
        theoryEn: `Keyed list rendering:
\`\`\`liquid
each items() as item (item.id)
  li {item.name}
\`\`\``,
        questionAr: 'ما هي الفائدة الحيوية لكتابة المفتاح الفريد (item.id) في حلقة each؟',
        questionEn: 'What is the vital purpose of providing a unique key (item.id) in each?',
        options: [
          'الحفاظ على عناصر DOM القائمة وإعادة استخدامها بدلاً من هدم القائمة وإعادة بنائها بالكامل',
          'لتغيير لون النصوص إلى الأزرق',
          'لإلغاء فحص الأخطاء في الكود',
          'لتشغيل الصوت في المتصفح'
        ],
        correctIndex: 0,
        explanationAr: 'المفتاح الفريد يسمح لخوارزمية المصالحة (Reconciliation) بربط كل كائن بعنصره الحقيقي في DOM بدقة مطلقة.',
        explanationEn: 'Unique keys enable precise keyed DOM reconciliation without recreating nodes.'
      },
      {
        id: 's3-e3',
        titleAr: 'تجزئة الكود والمكونات الفرعية (Props)',
        titleEn: 'Components & Props',
        xp: 100,
        type: 'code',
        summaryAr: 'استورد أي ملف .liq واستخدمه مباشرة كوسم مع تمرير الخصائص title="...".',
        summaryEn: 'Import any .liq file and use it as a custom tag with props.',
        theoryAr: `في Liquid المكون هو مجرد ملف \`.liq\` آخر:
\`\`\`liquid
--- logic
import UserCard from './components/UserCard.liq';

--- ui
div.team
  UserCard name="علي" role="مطور واجهات"
  UserCard name="منى" role="مهندسة نظم"
\`\`\`
تصل الخصائص إلى المكون الفرعي كمُدخلات نقية يمكن الوصول إليها باسم المتغير!`,
        theoryEn: `Components in Liquid are first-class .liq files:
\`\`\`liquid
--- logic
import Header from './Header.liq';

--- ui
Header title="My App"
\`\`\``,
        starterCode: `--- logic
import Card from './components/Card.liq';

--- ui
div.container
  Card title="مشروعي الأول" category="frontend"
`,
        challengePromptAr: 'تحقق من صياغة استدعاء المكون وتمرير الخصائص (Props) واضغط فحص.',
        challengePromptEn: 'Verify component invocation and props syntax.',
        validate(code) {
          try {
            compile(code);
            if (!code.includes('Card ') || !code.includes('title=')) {
              return { success: false, msgAr: 'تأكد من تمرير الخاصية title إلى Card', msgEn: 'Pass title prop to Card' };
            }
            return { success: true };
          } catch (e) {
            return { success: false, msgAr: `خطأ ترجمة: ${e.message}`, msgEn: `Error: ${e.message}` };
          }
        }
      },
      {
        id: 's3-e4',
        titleAr: 'فتحات تضمين القوالب (Slots)',
        titleEn: 'Slot Transclusion (Slots)',
        xp: 100,
        type: 'quiz',
        summaryAr: 'وسم slot داخل المكون يتيح للآباء حقن أي محتوى فرعي بحرية تامة.',
        summaryEn: 'The slot tag enables flexible child content transclusion.',
        theoryAr: `عندما تصنع قالباً عاماً مثل نافذة منبثقة أو بطاقة:
\`\`\`liquid
--- ui (Modal.liq)
div.modal-box
  h2 {title}
  div.body
    slot
\`\`\`
الآن يستطيع أي مكون استخدامه وحقن أي عناصر تحته:
\`\`\`liquid
Modal title="تنبيه"
  p هذا النص سيتم حقنه داخل مكان الـ slot!
\`\`\``,
        theoryEn: `Slots allow passing markup into components:
\`\`\`liquid
div.card
  slot
\`\`\``,
        questionAr: 'أين سيتم عرض الأطفال الممررين تحت مكون معين؟',
        questionEn: 'Where are the children passed to a component rendered?',
        options: [
          'في المكان المخصص لوسم slot داخل المكون الفرعي',
          'في نهاية الصفحة دائماً',
          'في عنوان التبويب document.title',
          'يتم حذفهم تلقائياً'
        ],
        correctIndex: 0,
        explanationAr: 'وسم slot يحدد النقطة الدقيقة التي يتم فيها تضمين واجهة الأب داخل الابن.',
        explanationEn: 'The slot tag specifies the exact placeholder for transcluded content.'
      }
    ],
    exam: {
      id: 's3-boss',
      titleAr: '🏆 امتحان نهاية الموسم الثالث: مهندس النظم والمكونات',
      titleEn: '🏆 Season 3 Boss Exam: Master Component Architect',
      rewardXp: 400,
      questions: [
        {
          qAr: 'كيف نكتب حلقة تكرار قائمة المهام `todos` مع مفتاح المعرف `todo.id` في Liquid؟',
          qEn: 'How do you write a keyed each loop for todos with id in Liquid?',
          options: [
            'each todos() as todo (todo.id)',
            'for todo in todos():',
            'todos.map(todo => (key=todo.id))',
            'each todo of todos'
          ],
          correct: 0,
          expAr: 'الصيغة القياسية في Liquid هي: each items() as item (item.id).'
        },
        {
          qAr: 'ما هو كود الخطأ الذي يظهر عند وجود خطأ في كتابة صيغة حلقة each؟',
          qEn: 'Which error code appears for a malformed each block?',
          options: ['LQ-104', 'LQ-101', 'LQ-201', 'LQ-402'],
          correct: 0,
          expAr: 'الخطأ LQ-104 مخصص لـ "Malformed each block syntax".'
        },
        {
          qAr: 'هل يمكن تمرير قيم الإشارات التفاعلية كـ Props للمكونات الفرعية؟',
          qEn: 'Can reactive signals be passed as props to child components?',
          options: [
            'نعم، إما بتمرير دالة الإشارة نفسها أو قيمتها الحالية ويتم تتبعها بدقة',
            'لا، المكونات تقبل النصوص فقط',
            'فقط إذا كانت القيمة رقماً زوجياً',
            'يجب تحويلها إلى سلسلة JSON دائماً'
          ],
          correct: 0,
          expAr: 'نعم، تمرير الإشارات أو القيم المحسوبة مدعوم بشكل أصيل ومرن.'
        },
        {
          qAr: 'ماذا يحدث إذا تكرر المفتاح نفسه لعدة عناصر داخل حلقة each؟',
          qEn: 'What happens if duplicate keys are used in an each loop?',
          options: [
            'يطلق Liquid التحذير LQ-204 لتنبيه المبرمج مع الحفاظ على استقرار التطبيق',
            'ينهار المتصفح بالكامل',
            'يتم حذف قاعدة البيانات',
            'يتوقف خادم الإنترنت'
          ],
          correct: 0,
          expAr: 'يقوم Liquid بمعالجة الخطأ بذكاء وإطلاق تنبيه تشخيصي LQ-204 مع معرف بديل.'
        },
        {
          qAr: 'في شروط if / elseif / else، كيف يتم تمييز نهاية كل فرع؟',
          qEn: 'In if / elseif / else blocks, how is the end of each branch recognized?',
          options: [
            'عبر العودة إلى مستوى المسافات البادئة السابق (Indentation dedent)',
            'بكتابة endif;',
            'بوضع قوس مغلق }',
            'بكتابة الكلمة المحجوزة stop'
          ],
          correct: 0,
          expAr: 'تعتمد لغة Liquid كلياً على الإزاحة البادئة دون الحاجة لأي وسوم إغلاق أو أقواس.'
        }
      ]
    }
  },

  {
    id: 4,
    titleAr: 'الموسم الرابع: الإتقان الشامل — التوجيه والحالة والإنتاج',
    titleEn: 'Season 4: Complete Mastery — Routing, Store & Production',
    badge: '👑',
    badgeNameAr: 'شارة غراند ماستر ليكويد',
    badgeNameEn: 'Liquid Grandmaster Badge',
    descriptionAr: 'أنشئ تطبيقات كاملة متعددة الصفحات مع createRouter و createStore و Scoped CSS والإنتاج فائق الخفة.',
    descriptionEn: 'Build full single-page apps with router, global store, scoped CSS, and sub-5KB production bundles.',
    totalXp: 1000,
    examThreshold: 80,
    episodes: [
      {
        id: 's4-e1',
        titleAr: 'الموجّه الذكي عالي السرعة (Liquid Router)',
        titleEn: 'The Lightweight Router (createRouter)',
        xp: 125,
        type: 'code',
        summaryAr: 'دعم كامل للـ SPA عبر createRouter({ routes, mode: "hash" }) و RouterView.',
        summaryEn: 'Built-in SPA routing with hash and history modes and dynamic params.',
        theoryAr: `إنشاء تطبيق متعدد الصفحات في Liquid:
\`\`\`javascript
import { createRouter } from 'liquid';
import Home from './pages/Home.liq';
import About from './pages/About.liq';

export const { RouterView, navigate } = createRouter({
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: About }
  ],
  mode: 'hash'
});
\`\`\`
ثم تضع \`RouterView\` في صفحتك الرئيسية لتتولى عرض المكون المطابق للمسار تلقائياً!`,
        theoryEn: `Setting up routes in Liquid:
\`\`\`javascript
const { RouterView, navigate } = createRouter({ routes, mode: 'hash' });
\`\`\``,
        starterCode: `--- logic
import { createRouter } from 'liquid';

const routes = [
  { path: '/', component: null },
  { path: '/dashboard', component: null },
  { path: '*', component: null }
];

const router = createRouter({ routes });

--- ui
div.app
  p نظام التوجيه جاهز
`,
        challengePromptAr: 'تأكد من وجود مسار بديل للـ 404 عبر path: "*" ثم اضغط فحص الكود.',
        challengePromptEn: 'Ensure a wildcard route path: "*" is present, then check.',
        validate(code) {
          try {
            compile(code);
            if (!code.includes("'*'") && !code.includes('"*"')) {
              return { success: false, msgAr: 'يجب أن تحتوي قائمة المسارات على المسار البديل "*"', msgEn: 'Must include wildcard route "*"' };
            }
            return { success: true };
          } catch (e) {
            return { success: false, msgAr: `خطأ ترجمة: ${e.message}`, msgEn: `Error: ${e.message}` };
          }
        }
      },
      {
        id: 's4-e2',
        titleAr: 'المخزن العام المشترك (createStore)',
        titleEn: 'Shared State Store (createStore)',
        xp: 125,
        type: 'quiz',
        summaryAr: 'إدارة الحالة المركزية لمشاركتها عبر كافة الصفحات والمكونات بسلاسة.',
        summaryEn: 'Centralized state management accessible anywhere in your component tree.',
        theoryAr: `عندما تحتاج لمشاركة بيانات المستخدم أو السلة عبر صفحات التطبيق:
\`\`\`javascript
import { createStore } from 'liquid';

export const userStore = createStore({
  name: 'عمر',
  cart: []
}, {
  addToCart(store, item) {
    store.cart.value = [...store.cart.value, item];
  }
});
\`\`\`
أي مكون يستورد \`userStore\` يرى نفس الإشارات المتفاعلة بدون تكرار!`,
        theoryEn: `Global reactive store:
\`\`\`javascript
const store = createStore(initialState, actions);
\`\`\``,
        questionAr: 'ما هي الفائدة الرئيسية لاستخدام createStore بدلاً من تمرير الـ Props يدوياً؟',
        questionEn: 'What is the primary advantage of createStore over prop drilling?',
        options: [
          'تجنب تمرير البيانات عبر طبقات متعددة من المكونات (Prop Drilling) وإتاحة وصول مباشر للحالة',
          'تحويل لغة التطبيق إلى لغة ثنائية',
          'تقليل سرعة الإنترنت',
          'حذف ملفات الـ CSS'
        ],
        correctIndex: 0,
        explanationAr: 'createStore يوفر وصولاً مباشراً للحالة المشتركة من أي مكون دون الحاجة لتمريرها يدوياً عبر كل أب.',
        explanationEn: 'createStore provides direct reactive state access avoiding prop drilling.'
      },
      {
        id: 's4-e3',
        titleAr: 'الأنماط المعزولة ودعم RTL العربي',
        titleEn: 'Scoped CSS & RTL Direction',
        xp: 125,
        type: 'code',
        summaryAr: 'قسم --- style يُعزل تلقائياً بنظام scoped hash ويمنع تسرب التنسيقات بين المكونات.',
        summaryEn: 'The --- style section is automatically scoped with zero style bleeding.',
        theoryAr: `في أي ملف \`.liq\`، قسم الأنماط محمي ومعزول بالكامل:
\`\`\`liquid
--- style
.title {
  color: #0284c7;
  font-weight: 800;
}

--- ui
h1.title أنا منسق بأمان بدون التأثير على أي عنصر آخر في الموقع
\`\`\`
مترجم Liquid يضيف تلقائياً محدد الـ scope الفريد لكل قاعدة CSS دون أن تشغل بالك!`,
        theoryEn: `Zero-leak scoped CSS:
\`\`\`liquid
--- style
.title { color: #0284c7; }
\`\`\``,
        starterCode: `--- style
.cyber-card {
  background: #0f172a;
  color: #38bdf8;
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid #0284c7;
}

--- ui
div.cyber-card
  h2 بطاقة معزولة التنسيق
`,
        challengePromptAr: 'افحص كود التنسيق المعزول ثم اضغط فحص.',
        challengePromptEn: 'Verify scoped styles syntax and check.',
        validate(code) {
          try {
            const res = compile(code);
            if (!res.css || !res.css.includes('cyber-card')) {
              return { success: false, msgAr: 'يجب أن يُنتج المترجم قواعد CSS لكلاس cyber-card', msgEn: 'Must produce CSS for cyber-card' };
            }
            return { success: true };
          } catch (e) {
            return { success: false, msgAr: `خطأ ترجمة: ${e.message}`, msgEn: `Error: ${e.message}` };
          }
        }
      },
      {
        id: 's4-e4',
        titleAr: 'الإنتاج عالي السرعة وأدوات الـ CLI',
        titleEn: 'Ultra-Fast Production & CLI',
        xp: 125,
        type: 'quiz',
        summaryAr: 'liquid build ينتج حزمة نقية وخفيفة بحجم أقل من 5 كيلوبايت، جاهزة لأي سيرفر VPS.',
        summaryEn: 'liquid build produces tiny <5KB bundles ready for zero-config VPS deployment.',
        theoryAr: `أوامر Liquid الأساسية للمطور:
- \`liquid create my-app\`: إنشاء مشروع جاهز بأفضل الممارسات.
- \`liquid dev\`: تشغيل خادم التطوير مع التحديث الفوري (HMR).
- \`liquid guide\`: فتح الدليل التفاعلي وموسوعة الأخطاء على المنفذ 4000.
- \`liquid guide --play\`: فتح أكاديمية التعلّم التفاعلية.
- \`liquid build\`: تجميع المشروع للإنتاج بسرعة فائقة (<150ms).
- \`lqe\` (أو \`liquid edit\`): محرر التيرمينال التفاعلي المخصص للهواتف وسيرفرات الـ VPS!`,
        theoryEn: `Core CLI commands: create, dev, guide, guide --play, build, and lqe.`,
        questionAr: 'ما هو الأمر الذي يقوم بتشغيل أكاديمية التعلّم التفاعلية ومواسم الـ XP مباشرة على المنفذ 4000؟',
        questionEn: 'Which command launches the gamified microlearning arena on port 4000?',
        options: [
          'liquid guide --play',
          'liquid run-game',
          'npm start --game-mode',
          'liquid play-music'
        ],
        correctIndex: 0,
        explanationAr: 'الأمر المعتمد هو liquid guide --play (أو اختصاره liquid play).',
        explanationEn: 'The verified command is liquid guide --play.'
      }
    ],
    exam: {
      id: 's4-boss',
      titleAr: '👑 الامتحان الكبير: تتويج غراند ماستر ليكويد (Grandmaster)',
      titleEn: '👑 Grandmaster Exam: The Ultimate Liquid Trial',
      rewardXp: 500,
      questions: [
        {
          qAr: 'ما هو حجم نواة بيئة التشغيل لـ Liquid في الإنتاج؟',
          qEn: 'What is the gzipped core runtime size of Liquid in production?',
          options: [
            'أقل من 5 كيلوبايت مضغوطة (< 5 KB gzipped)',
            'أكثر من 150 كيلوبايت',
            'نصف غيغابايت',
            'يتطلب تثبيت برامج خارجية على جهاز العميل'
          ],
          correct: 0,
          expAr: 'نواة Liquid بالكامل (Signals + DOM Helpers + Keyed Reconciliation) بحجم قياسي أقل من 5KB!'
        },
        {
          qAr: 'كيف يعزل مترجم Liquid قواعد CSS في كل مكون لمنع تداخل الأنماط؟',
          qEn: 'How does the Liquid compiler scope CSS rules to prevent bleeding?',
          options: [
            'بتوليد هاش فريد مثل [lq-xxxxx] وإضافته تلقائياً لكافة المحددات وعناصر الـ DOM المقابلة',
            'بتحويل كل التنسيقات إلى ملف وورد',
            'بمنع استخدام الألوان في الموقع',
            'بإلغاء خاصية التنسيق نهائياً'
          ],
          correct: 0,
          expAr: 'يتم احتساب هاش فريد لكل مكون وحقنه في محددات الـ CSS والوسوم الناتجة.'
        },
        {
          qAr: 'ما هو كود الخطأ الذي يظهر عندما يكون المنفذ المطلوب محجوزاً بالفعل من تطبيق آخر (EADDRINUSE)؟',
          qEn: 'Which error code indicates the requested port is already in use (EADDRINUSE)?',
          options: ['LQ-401', 'LQ-102', 'LQ-204', 'LQ-301'],
          correct: 0,
          expAr: 'الخطأ LQ-401 مخصص لـ "Port already in use".'
        },
        {
          qAr: 'هل يتطلب إطار عمل Liquid وجود Node.js أو بيئة خاصة في متصفح الزائر؟',
          qEn: 'Does Liquid require Node.js on the client browser?',
          options: [
            'لا، كود الإنتاج الناتج هو كود JavaScript متوافق نقي (Standard ESM) يعمل في أي متصفح حديث',
            'نعم، يجب تثبيت Node.js لدى كل زائر للموقع',
            'يعمل فقط عبر شبكة خاصة',
            'يحتاج لتنزيل إضافات للمتصفح'
          ],
          correct: 0,
          expAr: 'حزم Liquid المجمعة هي Standard Pure ESM خفيفة متوافقة 100% مع كافة المتصفحات.'
        },
        {
          qAr: 'ما هي الأداة المضمنة في Liquid لتحرير الأكواد مباشرة من التيرمينال وسيرفرات الـ VPS وهواتف أندرويد؟',
          qEn: 'Which built-in terminal editor is designed for VPS servers and Android Termux?',
          options: [
            'lqe (المحرر التفاعلي liquid-edit)',
            'vim-liquid-plugin',
            'vscode-cloud-daemon',
            'notepad-terminal'
          ],
          correct: 0,
          expAr: 'الأداة lqe (liquid-edit) هي محرر تيرمينال مصمم خصيصاً للمطورين على السيرفرات والهواتف.'
        }
      ]
    }
  }
];

// Helper to get Season by ID
export function getSeason(id) {
  return SEASONS.find(s => s.id === Number(id)) || SEASONS[0];
}

// Helper to get total potential XP across all seasons and exams
export function getMaxXp() {
  return SEASONS.reduce((acc, s) => {
    const epXp = s.episodes.reduce((eAcc, ep) => eAcc + ep.xp, 0);
    return acc + epXp + (s.exam ? s.exam.rewardXp : 0);
  }, 0);
}
