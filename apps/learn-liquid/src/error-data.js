export const ERROR_LIST = [
  {
    id: 'LQ-101',
    category: 'compiler',
    titleAr: 'استخدام علامات Tab في الإزاحة',
    titleEn: 'Tab Characters in Indentation',
    summaryAr: 'تم استخدام علامة Tab أو خلط مسافات مع علامات Tab في بداية السطر.',
    summaryEn: 'Tab characters or mixed tabs/spaces were used for indentation.',
    causeAr: 'إطار عمل Liquid يعتمد على إزاحة صارمة بمقدار مسافتين (2 Spaces) لكل مستوى. علامات Tab تسبب اختلالات في التنسيق عبر المحررات وأنظمة التشغيل المختلفة ولذلك يتم رفضها صراحة.',
    causeEn: 'Liquid requires strict 2-space indentation. Tabs cause inconsistent alignment and visual nesting ambiguities across different terminals and editors.',
    badCode: `div.box
\th1 عنوان باستخدام Tab (غير مسموح)`,
    goodCode: `div.box
  h1 عنوان باستخدام مسافتين صحيحتين`,
    fixAr: 'قم بضبط محرر الأكواد على استبدال علامات Tab بمسافات (Insert Spaces) بمقدار 2 مسافات، واستبدل كافة علامات Tab الحالية بمسافات عادية.',
    fixEn: 'Configure your editor to use spaces instead of tabs with an indent size of 2, and convert existing tabs to spaces.'
  },
  {
    id: 'LQ-102',
    category: 'compiler',
    titleAr: 'عنوان قسم غير معروف في ملف المكون',
    titleEn: 'Unknown Section Header',
    summaryAr: 'يحتوي ملف .liq على عنوان قسم غير مدعوم.',
    summaryEn: 'Unrecognized section header delimiter.',
    causeAr: 'يتكون ملف .liq من 3 أقسام صالحة فقط مفصولة بثلاث شرطات: "--- logic" للمنطق البرمجي، "--- style" للأنماط المعزولة، و "--- ui" للواجهة. أي عنوان آخر يُعد خطأ.',
    causeEn: 'A .liq component file only permits three section delimiters: "--- logic", "--- style", and "--- ui".',
    badCode: `--- html
h1 وسم في قسم غير معروف!`,
    goodCode: `--- ui
h1 وسم في قسم الواجهة الرسمي`,
    fixAr: 'استخدم فقط العناوين الرسمية الثلاثة: --- logic, --- style, --- ui.',
    fixEn: 'Use only standard delimiters: --- logic, --- style, --- ui.'
  },
  {
    id: 'LQ-103',
    category: 'compiler',
    titleAr: 'مستوى إزاحة غير متوافق',
    titleEn: 'Inconsistent Indentation Level',
    summaryAr: 'مقدار الإزاحة لا يتطابق مع أي مستوى حاوٍ خارجي أو يقفز بمقدار غير زوجي.',
    summaryEn: 'Indentation level does not match any outer nesting level or step.',
    causeAr: 'يجب أن تزداد الإزاحة بمقدار مسافتين دقيقاً لكل عنصر ابن، وأن تتراجع بدقة إلى أحد مستويات العناصر الأب السابقة.',
    causeEn: 'Indentation must increase by exactly 2 spaces per level and dedent to an existing outer level.',
    badCode: `div.container
    div.card
   p إزاحة 3 مسافات خاطئة`,
    goodCode: `div.container
  div.card
    p إزاحة 4 مسافات صحيحة`,
    fixAr: 'تأكد من أن كل مستوى تفرع يستخدم مضاعفات العدد 2 من المسافات (0, 2, 4, 6, 8...).',
    fixEn: 'Ensure all nested elements use multiples of 2 spaces (0, 2, 4, 6, 8...).'
  },
  {
    id: 'LQ-104',
    category: 'compiler',
    titleAr: 'صياغة غير صحيحة لتكرار each',
    titleEn: 'Malformed \'each\' Statement Syntax',
    summaryAr: 'صياغة كتلة التكرار each غير مكتملة أو مكتوبة بأسلوب أطر أخرى.',
    summaryEn: 'Malformed each-loop expression syntax.',
    causeAr: 'يتطلب Liquid صياغة واضحة ومحددة: each <collection> as <item> [, <index>] [(<key>)].',
    causeEn: 'Liquid requires: each <collection> as <item> [, <index>] [(<key>)]. Missing "as" or key expression throws this error.',
    badCode: `each item in items
  li {item.name}`,
    goodCode: `each items as item (item.id)
  li {item.name}`,
    fixAr: 'اكتب الكلمة as بعد المصفوفة، ثم اسم العنصر المفرد، ثم المفتاح الفريد بين قوسين (item.id).',
    fixEn: 'Use the "as" keyword followed by the item identifier and a unique key in parentheses: each items as item (item.id).'
  },
  {
    id: 'LQ-105',
    category: 'compiler',
    titleAr: 'استخدام أقواس الزوايا < > في الشروط أو التكرار',
    titleEn: 'HTML Angle Brackets in Control Flow',
    summaryAr: 'تمت كتابة <if> أو <each> أو <else> بأقواس زوايا HTML.',
    summaryEn: 'Angle brackets (<if>, <each>) used for control flow statements.',
    causeAr: 'يعتمد Liquid أسلوب المسافات الخالي من الأقواس (Pug-style). استخدام الأقواس يجعل المصرف يظنها عناصر DOM مخصصة ويحاول استدعاء document.createElement(\'<if\') مما يؤدي لخطأ InvalidCharacterError.',
    causeEn: 'Liquid uses clean indentation without angle brackets or closing tags. Writing <if> creates an invalid DOM element instead of a reactive conditional branch.',
    badCode: `// خطأ:
<if isLoggedIn>
  button تسجيل الخروج
</if>`,
    goodCode: `// صحيح:
if isLoggedIn
  button تسجيل الخروج`,
    fixAr: 'احذف أقواس الزوايا ووسم الإغلاق واكتب الكلمة المفتاحية if أو else أو each مباشرة متبوعة بإزاحة المحتوى.',
    fixEn: 'Remove angle brackets and closing tags. Write "if condition" and indent children by 2 spaces.'
  },
  {
    id: 'LQ-106',
    category: 'compiler',
    titleAr: 'نص غير مقتبس يبدأ بـ $ أو @',
    titleEn: 'Reserved Directive Prefix in Plain Text',
    summaryAr: 'تمت كتابة كلمة تبدأ برمز $ أو @ كأول كلمة في نص فرعي.',
    summaryEn: 'Word starting with $ or @ parsed as directive instead of text.',
    causeAr: 'الرموز $ و @ في بداية الكلمات مخصصة للتوجيهات ($bind و @event). كتابة نص مثل $100 تجعل المحلل يظنه توجيهاً ناقصاً.',
    causeEn: 'Leading $ and @ denote $bind and @event directives. Literal text starting with these symbols must be quoted.',
    badCode: `span.price $100`,
    goodCode: `span.price "$100"
// أو
span.price {'$' + 100}`,
    fixAr: 'ضع النص بين علامات اقتباس مزدوجة مثل "$100" أو استخدم تعبير جافاسكريبت مثل {\'$\' + amount}.',
    fixEn: 'Wrap the text in double quotes "$100" or use string concatenation {\'$\' + amount}.'
  },
  {
    id: 'LQ-107',
    category: 'compiler',
    titleAr: 'اختصار غير صالح لمعرف ID أو فئة Class',
    titleEn: 'Invalid ID or Class Shorthand',
    summaryAr: 'تم وضع رمز # أو . بدون كتابة اسم المعرف أو الفئة بعده.',
    summaryEn: 'Expected identifier after # or . in shorthand selector.',
    causeAr: 'في اختصارات الوسوم (مثل div#app.container)، يجب أن يتبع الرمز # اسم المعرف ويتبع الرمز . اسم الفئة فوراً.',
    causeEn: 'Shorthand selectors require an alphanumeric identifier immediately following # or .',
    badCode: `div#
button.`,
    goodCode: `div#app
button.btn-primary`,
    fixAr: 'اكتب اسم الفئة أو المعرف مباشرة بعد الرمز بدون مسافات.',
    fixEn: 'Provide a valid identifier name immediately after # or .'
  },
  {
    id: 'LQ-108',
    category: 'compiler',
    titleAr: 'كلمة مفتاحية في موقع غير صالح',
    titleEn: 'Unexpected Keyword Location',
    summaryAr: 'تم العثور على else أو elseif بدون وجود if يسبقها.',
    summaryEn: 'Found else or elseif without matching preceding if block.',
    causeAr: 'كتلة else و elseif تتطلب وجود كتلة if مباشرة في نفس المستوى من الإزاحة لتكون تابعة لها.',
    causeEn: 'An else or elseif branch must be directly preceded by an if or elseif at the same indent level.',
    badCode: `p مرحباً
else
  p غير مسبوق بشرط!`,
    goodCode: `if isReady
  p جاهز
else
  p قيد الانتظار`,
    fixAr: 'تأكد من أن الشرط يبدأ بـ if أولاً وأن كافة تفريعات else تكون في نفس مستوى الإزاحة.',
    fixEn: 'Ensure an if statement precedes else and both share the exact same indentation level.'
  },
  {
    id: 'LQ-201',
    category: 'runtime',
    titleAr: 'قراءة إشارة غير معرفة أو خالية',
    titleEn: 'Signal Read on Undefined Variable',
    summaryAr: 'تم استدعاء إشارة أو قراءة .value على متغير يحمل undefined.',
    summaryEn: 'Attempted to invoke accessor or read .value on undefined.',
    causeAr: 'محاولة قراءة إشارة لم يتم إنشاؤها عبر signal() أو تم تعريفها دون قيمة مبدئية في قسم المنطق.',
    causeEn: 'Accessing a signal property or calling it before initialization or passing undefined.',
    badCode: `let user;
const name = computed(() => user.value.name);`,
    goodCode: `const user = signal({ name: 'ضيف' });
const name = computed(() => user.value.name);`,
    fixAr: 'قم بتهيئة الإشارة دائماً بقيمة مبدئية عبر signal(initialValue) وتأكد من استيراد signal من @mkdevofficial/liquid.',
    fixEn: 'Always initialize signals with default values using signal(initialValue).'
  },
  {
    id: 'LQ-202',
    category: 'runtime',
    titleAr: 'حلقة تفاعلية لا نهائية داخل effect()',
    titleEn: 'Infinite Reactive Cycle in Effect',
    summaryAr: 'تم تعديل إشارة داخل effect يتتبع نفس الإشارة، مما سبب تكراراً لا نهائياً.',
    summaryEn: 'Writing to a tracked signal inside an effect creates an infinite update loop.',
    causeAr: 'عندما يقوم effect بقراءة إشارة، فإنه يشترك فيها تلقائياً. وإذا قام بتعديل نفس الإشارة، فسيتم تشغيله مجدداً إلى ما لا نهاية.',
    causeEn: 'Effects automatically track every signal accessed. Mutating the tracked signal inside triggers another run indefinitely.',
    badCode: `effect(() => {
  count.value = count.value + 1; // حلقة لا نهائية!
});`,
    goodCode: `// استخدم computed لاشتقاق القيم
const doubled = computed(() => count.value * 2);

// أو استخدم untrack لتجاوز الاشتراك
effect(() => {
  const current = untrack(() => count.value);
  saveToDatabase(current);
});`,
    fixAr: 'إذا كنت تشتق قيمة فاستخدم computed بدلاً من effect. وإذا كنت تقرأ القيمة لإرسالها فقط فاستخدم untrack(() => sig.value).',
    fixEn: 'Use computed for derived values. Use untrack(() => sig.value) if reading without subscribing.'
  },
  {
    id: 'LQ-203',
    category: 'runtime',
    titleAr: 'مفتاح مكرر في قائمة each',
    titleEn: 'Duplicate Key in Keyed List',
    summaryAr: 'يوجد عنصران أو أكثر في المصفوفة يشتركان في نفس المفتاح الفريد (Key).',
    summaryEn: 'Multiple items in an each-block share the identical key value.',
    causeAr: 'تعتمد خوارزمية تسوية الـ DOM في Liquid على تفرد المفتاح لكل عنصر للحفاظ على سلامة عقد الـ DOM والذاكرة. تكرار المفتاح يسبب سلوكاً غير متوقع.',
    causeEn: 'Liquid keyed reconciliation relies on strict uniqueness per key. Duplicate keys corrupt DOM node associations.',
    badCode: `const items = signal([
  { id: 1, name: 'A' },
  { id: 1, name: 'B' } // مفتاح 1 مكرر!
]);`,
    goodCode: `const items = signal([
  { id: 1, name: 'A' },
  { id: 2, name: 'B' } // معرفات فريدة
]);`,
    fixAr: 'تأكد من أن كل عنصر يمتلك معرفاً فريداً id، أو استخدم فهرس المصفوفة كبديل: each items as item, idx (idx).',
    fixEn: 'Ensure every item in the array has a globally unique ID, or fallback to index: each items as item, idx (idx).'
  },
  {
    id: 'LQ-301',
    category: 'router',
    titleAr: 'المسار المطلوب غير موجود (404)',
    titleEn: 'Route Not Found (404)',
    summaryAr: 'لم يتطابق الرابط المطلوب في المتصفح مع أي مسار مسجل في الموجه.',
    summaryEn: 'Requested URL hash does not match any registered route pattern.',
    causeAr: 'تم طلب مسار مثل #/profile دون أن يكون هناك مسار مطابق في مصفوفة routes لـ createRouter.',
    causeEn: 'No route pattern matches the requested pathname, and no catch-all route was provided.',
    badCode: `const routes = [
  { path: '/', component: Home }
  // لا يوجد مسار لـ *
];`,
    goodCode: `const routes = [
  { path: '/', component: Home },
  { path: '*', component: NotFound } // مسار شامل لأي رابط آخر
];`,
    fixAr: 'أضف مساراً شاملاً { path: "*", component: NotFound } في نهاية مصفوفة المسارات لمعالجة كافة الروابط غير المعروفة.',
    fixEn: 'Add a catch-all route { path: "*", component: NotFound } at the end of your routes array.'
  },
  {
    id: 'LQ-401',
    category: 'cli',
    titleAr: 'المنفذ المطلوب محجوز من برنامج آخر',
    titleEn: 'Port Already in Use',
    summaryAr: 'محاولة تشغيل خادم التطوير أو الدليل على منفذ مشغول بالفعل.',
    summaryEn: 'The requested TCP port is already bound by another process.',
    causeAr: 'يوجد برنامج آخر (أو جلسة سابقة لـ Liquid) تستخدم نفس المنفذ (مثل 3000 أو 4000).',
    causeEn: 'Another instance or application is actively listening on this port.',
    badCode: `liquid guide --port 4000 # (المنفذ مشغول بالفعل)`,
    goodCode: `liquid guide --port 4005 # (منفذ بديل متاح)`,
    fixAr: 'حدد منفذاً آخر عبر خيار --port <رقم>، أو أغلق البرنامج الذي يشغل المنفذ الحالي.',
    fixEn: 'Pass an alternative free port using --port <number> (e.g. --port 4005), or terminate the conflicting process.'
  },
  {
    id: 'LQ-402',
    category: 'cli',
    titleAr: 'ملف نقطة البداية للمشروع غير موجود',
    titleEn: 'Project Entry Point Not Found',
    summaryAr: 'تشغيل أداة liquid خارج مجلد مشروع صالح.',
    summaryEn: 'src/main.js or App.liq not found in current directory.',
    causeAr: 'تشغيل أمر liquid dev أو liquid build في مجلد لا يحتوي على هيكل مشروع Liquid (ملف src/main.js مفقود).',
    causeEn: 'Running CLI build/dev commands outside the root folder of a valid Liquid application.',
    badCode: `cd ~
liquid dev # لا يوجد مشروع هنا!`,
    goodCode: `cd my-site
liquid dev # يعمل بسلاسة داخل مجلد المشروع`,
    fixAr: 'انتقل إلى مجلد المشروع الصحيح أولاً بواسطة cd <اسم-المشروع>، أو أنشئ مشروعاً جديداً عبر liquid create my-site.',
    fixEn: 'Navigate into the project directory with cd <project-name>, or initialize a new app using liquid create <name>.'
  }
];

export function getErrorById(id) {
  if (!id) return null;
  const target = id.trim().toUpperCase();
  return ERROR_LIST.find(e => e.id === target) || null;
}
