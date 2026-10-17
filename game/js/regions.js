/* Game content: four regions, three playable factories each, each factory with its own mini-game.
   Eastern Province factories use generic names: no factory partners were listed for that region. */
export const TRACKS = {
  discoverer: { missions_en: [['🔍', 'Hazard hunt'], ['✅', 'Quality check'], ['🧪', 'Machine tests']], missions: [['🔍', 'صيد المخاطر'], ['✅', 'فحص الجودة'], ['🧪', 'اختبار الآلات']], name_en: 'Discoverer', name: 'المكتشف', badge: 'assets/ui/badge_discoverer.webp', color: '#3f8fe0', verb_en: 'Discover', verb: 'اكتشف',
    desc_en: 'Your eye misses nothing: you check safety and quality on the production lines and test machines before mistakes happen.', desc: 'عينك لا تفوّت شيئاً: تفحص السلامة والجودة على خطوط الإنتاج وتختبر الآلات قبل أن تخطئ.', skills_en: ['Safety', 'Quality', 'Testing'], skills: ['السلامة', 'الجودة', 'الاختبار'] },
  creative: { missions_en: [['🏭', 'Build the production line'], ['⚡', 'Connect the power'], ['🎯', 'Precise packing']], missions: [['🏭', 'بناء خط الإنتاج'], ['⚡', 'توصيل الطاقة'], ['🎯', 'التعبئة الدقيقة']], name_en: 'Creator', name: 'المبدع', badge: 'assets/ui/badge_creative.webp', color: '#5cc7a8', verb_en: 'Create', verb: 'ابتكر',
    desc_en: 'You love knowing how things work: you build the production line, power the machines and fine-tune accuracy.', desc: 'تحب أن تعرف كيف تعمل الأشياء: تبني خط الإنتاج، توصل الطاقة للآلات، وتضبط الدقة.', skills_en: ['Engineering', 'Energy', 'Precision'], skills: ['الهندسة', 'الطاقة', 'الدقة'] },
  artist: { missions_en: [['🎨', 'Package design'], ['🧩', 'Display layout'], ['🗿', 'Art sculpture']], missions: [['🎨', 'تصميم العبوة'], ['🧩', 'تنسيق العرض'], ['🗿', 'منحوتة فنية']], name_en: 'Artist', name: 'الفنان', badge: 'assets/ui/badge_artist.webp', color: '#8a5bd6', verb_en: 'Design', verb: 'صمّم',
    desc_en: 'You see beauty in every product: you design packaging, match colours and turn materials into works of art.', desc: 'ترى الجمال في كل منتج: تصمم العبوات وتنسّق الألوان وتصنع من المواد أعمالاً فنية.', skills_en: ['Design', 'Colours', 'Creativity'], skills: ['التصميم', 'الألوان', 'الإبداع'] },
  ambassador: { missions_en: [['📸', 'Ad campaign'], ['📖', 'Picture story'], ['🏆', 'Quick challenge']], missions: [['📸', 'حملة إعلانية'], ['📖', 'قصة مصوّرة'], ['🏆', 'تحدٍّ سريع']], name_en: 'Ambassador', name: 'السفير', badge: 'assets/ui/badge_ambassador.webp', color: '#2bb3a0', verb_en: 'Promote', verb: 'روّج',
    desc_en: 'The voice of national industry: you make ads, tell the product’s story and introduce people to the factories.', desc: 'صوت الصناعة الوطنية: تصنع الإعلانات وتحكي قصة المنتج وتعرّف الناس بالمصانع.', skills_en: ['Advertising', 'Storytelling', 'Communication'], skills: ['الإعلان', 'القصة', 'التواصل'] }
};

export const ORDER = ['riyadh', 'makkah', 'qassim', 'eastern'];

export const REGIONS = {
  riyadh: {
    name_en: 'Riyadh', name: 'الرياض', sub_en: 'Industrial City', sub: 'المدينة الصناعية', img: 'assets/ui/load_riyadh.webp', music: 'riyadh', theme: 'riyadh',
    factories: [
      { id: 'rabie', name_en: 'Al Rabie Food Factory', name: 'مصنع الربيع للأغذية', short_en: 'Al Rabie', short: 'الربيع', logo: 'assets/img/r-alrabie.webp', color: '#0b7a35', product: 'juice', game: 'hazard', track: 'discoverer',
        title_en: 'Safety hazards', title: 'مخاطر السلامة', brief_en: 'Find 3 things that threaten workers’ safety on the juice production line and tap them.', brief: 'ابحث عن 3 أشياء تهدد سلامة العاملين على خط إنتاج العصائر واضغط عليها.' },
      { id: 'coca', name_en: 'Coca-Cola Factory', name: 'مصنع كوكاكولا', short_en: 'Coca-Cola', short: 'كوكاكولا', logo: 'assets/img/r-cocacola.webp', color: '#d71a28', product: 'bottles', game: 'photo', track: 'ambassador',
        title_en: 'Shoot the ad', title: 'صوّر الإعلان', brief_en: 'You are the campaign photographer: take a photo of the golden bottle in the middle of the frame, then choose the ad’s logo.', brief: 'أنت مصوّر الحملة: التقط صورة للعبوة الذهبية وهي في منتصف الإطار، ثم اختر شعار الإعلان.' },
      { id: 'kacst', name_en: 'King Abdulaziz City for Science and Technology', name: 'مدينة الملك عبدالعزيز للعلوم والتقنية', short_en: 'KACST', short: 'كاكست', logo: 'assets/img/r-kacst.webp', color: '#1d3f8f', product: 'lab', game: 'circuit', track: 'creative',
        title_en: 'Wire the circuit', title: 'وصّل الدائرة', brief_en: 'Rotate the pieces to connect power from the source to the three satellites.', brief: 'دوّر القطع لتوصل الطاقة من المصدر إلى الأقمار الصناعية الثلاثة.' }
    ],
    soon_en: ['Saad Al-Din Factory', 'Dimah Factory'], soon: ['مصنع سعد الدين', 'مصنع ديمة']
  },
  makkah: {
    name_en: 'Makkah', name: 'مكة المكرمة', sub_en: 'Jeddah · Industrial City', sub: 'جدة · المدينة الصناعية', img: 'assets/ui/load_jeddah.webp', music: 'makkah_jeddah', theme: 'jeddah',
    factories: [
      { id: 'york', name_en: 'York Air Conditioning Factory', name: 'مصنع يورك للتكييف', short_en: 'York', short: 'يورك', logo: 'assets/img/f-york.webp', color: '#1f5fae', product: 'ac', game: 'pressure', track: 'discoverer',
        title_en: 'Pressure test', title: 'اختبار الضغط', brief_en: 'Press and hold to run the compressor, and keep the pressure needle in the green zone until the test is complete.', brief: 'اضغط مطوّلاً لتشغيل الضاغط وأبقِ مؤشر الضغط في المنطقة الخضراء حتى يكتمل الاختبار.' },
      { id: 'sadafco', name_en: 'Sadafco Dairy Factory', name: 'مصنع سدافكو للألبان', short_en: 'Sadafco', short: 'سدافكو', logo: 'assets/img/f-sadafco.webp', color: '#1c4fa0', product: 'dairy', game: 'design', track: 'creative',
        title_en: 'Design the carton', title: 'صمّم العبوة', brief_en: 'Design a new milk carton that suits the customer’s request, then show it to the judging panel.', brief: 'صمّم عبوة حليب جديدة تناسب طلب العميل، ثم اعرضها على لجنة التحكيم.' },
      { id: 'yamamah', name_en: 'Yamamah Steel Industries', name: 'اليمامة للصناعات الحديدية', short_en: 'Yamamah', short: 'اليمامة', logo: 'assets/img/f-yamamah.webp', color: '#2f3a4a', product: 'steel', game: 'crane', track: 'artist',
        title_en: 'Steel sculpture', title: 'منحوتة الحديد', brief_en: 'Use the crane to stack the leftover iron bars on top of each other and build a tall art sculpture.', brief: 'استخدم الرافعة لترص قضبان الحديد المتبقية فوق بعضها وتبني منحوتة فنية عالية.' }
    ],
    soon_en: ['Mabco Factory', 'Flo Factory'], soon: ['مصنع مبكو', 'مصنع فلو']
  },
  qassim: {
    name_en: 'Qassim', name: 'القصيم', sub_en: 'Buraydah · Industrial City', sub: 'بريدة · المدينة الصناعية', img: 'assets/ui/load_qassim.webp', music: 'qassim', theme: 'qassim',
    factories: [
      { id: 'kareeda', name_en: 'Al Kareeda Dates', name: 'الكريدا للتمور', short_en: 'Al Kareeda', short: 'الكريدا', logo: 'assets/img/f-kareeda.webp', color: '#7a5a2a', product: 'dates', game: 'sort', track: 'discoverer',
        title_en: 'Sort the dates', title: 'فرز التمور', brief_en: 'Dates travel along the sorting line: tap every spoiled date to remove it before it reaches the box.', brief: 'التمور تمر على خط الفرز: اضغط على كل تمرة تالفة لتبعدها قبل أن تصل إلى العلبة.' },
      { id: 'naqi', name_en: 'Naqi Water Factory', name: 'نقي للمياه', short_en: 'Naqi', short: 'نقي', logo: 'assets/img/f-naqi.webp', color: '#1aa0c8', product: 'water', game: 'fill', track: 'creative',
        title_en: 'Precise filling', title: 'تعبئة دقيقة', brief_en: 'Press and hold to fill each bottle, and lift your finger when the water reaches the line exactly.', brief: 'اضغط مطوّلاً لتعبئة كل عبوة، وارفع إصبعك عندما يصل الماء إلى الخط تماماً.' },
      { id: 'tozeen', name_en: 'Tozeen Sweets Factory', name: 'توزين للحلويات', short_en: 'Tozeen', short: 'توزين', logo: 'assets/img/f-tozeen.webp', color: '#8a6a3a', product: 'sweets', game: 'pattern', track: 'artist',
        title_en: 'Gift box', title: 'علبة الهدايا', brief_en: 'Memorise the sweet box design, then arrange the boxes in the same pattern from memory.', brief: 'احفظ تصميم علبة الحلويات، ثم رتّبها بنفس الشكل من الذاكرة.' }
    ],
    soon_en: ['Tamr Factory', 'Benti for Industry'], soon: ['مصنع تمر', 'بنتي للصناعة']
  },
  eastern: {
    name_en: 'Eastern Province', name: 'الشرقية', sub_en: 'Dammam · Al Jubail', sub: 'الدمام · الجبيل', img: 'assets/ui/load_eastern.webp', music: 'eastern', theme: 'eastern',
    factories: [
      { id: 'petro', name_en: 'Petrochemical Complex', name: 'مجمع البتروكيماويات', short_en: 'Petrochem', short: 'البتروكيماويات', icon: 'flask', color: '#e08a1e', product: 'chem', game: 'memory', track: 'discoverer',
        title_en: 'Protective gear', title: 'معدات الوقاية', brief_en: 'Flip the cards and match each piece of protective gear with its twin in as few tries as possible.', brief: 'اقلب البطاقات وطابق كل أداة وقاية مع شبيهتها بأقل عدد من المحاولات.' },
      { id: 'desal', name_en: 'Water Desalination Plant', name: 'محطة تحلية المياه', short_en: 'Desal', short: 'التحلية', icon: 'drop', color: '#1f86c9', product: 'membranes', game: 'order', track: 'creative',
        title_en: 'Desalination stages', title: 'مراحل التحلية', brief_en: 'Put the stages that turn seawater into drinking water in the correct order.', brief: 'رتّب مراحل تحويل مياه البحر إلى مياه شرب بالترتيب الصحيح.' },
      { id: 'port', name_en: 'Industrial Port', name: 'الميناء الصناعي', short_en: 'Port', short: 'الميناء', icon: 'ship', color: '#24496e', product: 'containers', game: 'quiz', track: 'ambassador',
        title_en: 'Ambassador challenge', title: 'تحدي السفير', brief_en: 'Answer questions about industry and the initiative quickly to become an ambassador for Future Industrialists.', brief: 'أجب عن أسئلة الصناعة والمبادرة بسرعة لتصبح سفيراً لصناعيو المستقبل.' }
    ],
    soon_en: ['New factory', 'New factory'], soon: ['مصنع جديد', 'مصنع جديد']
  }
};

export const ALL = ORDER.flatMap(r => REGIONS[r].factories.map(f => ({ ...f, region: r })));
