/* Game content: four regions, three playable factories each, each factory with its own mini-game.
   Eastern Province factories use generic names: no factory partners were listed for that region. */
export const TRACKS = {
  discoverer: { name: 'المكتشف', badge: 'assets/ui/badge_discoverer.webp', color: '#3f8fe0' },
  creative: { name: 'المبدع', badge: 'assets/ui/badge_creative.webp', color: '#5cc7a8' },
  artist: { name: 'الفنان', badge: 'assets/ui/badge_artist.webp', color: '#8a5bd6' },
  ambassador: { name: 'السفير', badge: 'assets/ui/badge_ambassador.webp', color: '#2bb3a0' }
};

export const ORDER = ['riyadh', 'makkah', 'qassim', 'eastern'];

export const REGIONS = {
  riyadh: {
    name: 'الرياض', sub: 'المدينة الصناعية', img: 'assets/ui/load_riyadh.webp', music: 'riyadh', theme: 'riyadh',
    factories: [
      { id: 'rabie', name: 'مصنع الربيع للأغذية', short: 'الربيع', logo: 'assets/img/r-alrabie.webp', color: '#0b7a35', product: 'juice', game: 'hazard', track: 'discoverer',
        title: 'مخاطر السلامة', brief: 'ابحث عن 3 أشياء تهدد سلامة العاملين على خط إنتاج العصائر واضغط عليها.' },
      { id: 'coca', name: 'مصنع كوكاكولا', short: 'كوكاكولا', logo: 'assets/img/r-cocacola.webp', color: '#d71a28', product: 'bottles', game: 'photo', track: 'ambassador',
        title: 'صوّر الإعلان', brief: 'أنت مصوّر الحملة: التقط صورة للعبوة الذهبية وهي في منتصف الإطار، ثم اختر شعار الإعلان.' },
      { id: 'kacst', name: 'مدينة الملك عبدالعزيز للعلوم والتقنية', short: 'كاكست', logo: 'assets/img/r-kacst.webp', color: '#1d3f8f', product: 'lab', game: 'circuit', track: 'creative',
        title: 'وصّل الدائرة', brief: 'دوّر القطع لتوصل الطاقة من المصدر إلى الأقمار الصناعية الثلاثة.' }
    ],
    soon: ['مصنع سعد الدين', 'مصنع ديمة']
  },
  makkah: {
    name: 'مكة المكرمة', sub: 'جدة · المدينة الصناعية', img: 'assets/ui/load_jeddah.webp', music: 'makkah_jeddah', theme: 'jeddah',
    factories: [
      { id: 'york', name: 'مصنع يورك للتكييف', short: 'يورك', logo: 'assets/img/f-york.webp', color: '#1f5fae', product: 'ac', game: 'pressure', track: 'discoverer',
        title: 'اختبار الضغط', brief: 'اضغط مطوّلاً لتشغيل الضاغط وأبقِ مؤشر الضغط في المنطقة الخضراء حتى يكتمل الاختبار.' },
      { id: 'sadafco', name: 'مصنع سدافكو للألبان', short: 'سدافكو', logo: 'assets/img/f-sadafco.webp', color: '#1c4fa0', product: 'dairy', game: 'design', track: 'creative',
        title: 'صمّم العبوة', brief: 'صمّم عبوة حليب جديدة تناسب طلب العميل، ثم اعرضها على لجنة التحكيم.' },
      { id: 'yamamah', name: 'اليمامة للصناعات الحديدية', short: 'اليمامة', logo: 'assets/img/f-yamamah.webp', color: '#2f3a4a', product: 'steel', game: 'crane', track: 'artist',
        title: 'منحوتة الحديد', brief: 'استخدم الرافعة لترص قضبان الحديد المتبقية فوق بعضها وتبني منحوتة فنية عالية.' }
    ],
    soon: ['مصنع مبكو', 'مصنع فلو']
  },
  qassim: {
    name: 'القصيم', sub: 'بريدة · المدينة الصناعية', img: 'assets/ui/load_qassim.webp', music: 'qassim', theme: 'qassim',
    factories: [
      { id: 'kareeda', name: 'الكريدا للتمور', short: 'الكريدا', logo: 'assets/img/f-kareeda.webp', color: '#7a5a2a', product: 'dates', game: 'sort', track: 'discoverer',
        title: 'فرز التمور', brief: 'التمور تمر على خط الفرز: اضغط على كل تمرة تالفة لتبعدها قبل أن تصل إلى العلبة.' },
      { id: 'naqi', name: 'نقي للمياه', short: 'نقي', logo: 'assets/img/f-naqi.webp', color: '#1aa0c8', product: 'water', game: 'fill', track: 'creative',
        title: 'تعبئة دقيقة', brief: 'اضغط مطوّلاً لتعبئة كل عبوة، وارفع إصبعك عندما يصل الماء إلى الخط تماماً.' },
      { id: 'tozeen', name: 'توزين للحلويات', short: 'توزين', logo: 'assets/img/f-tozeen.webp', color: '#8a6a3a', product: 'sweets', game: 'pattern', track: 'artist',
        title: 'علبة الهدايا', brief: 'احفظ تصميم علبة الحلويات، ثم رتّبها بنفس الشكل من الذاكرة.' }
    ],
    soon: ['مصنع تمر', 'بنتي للصناعة']
  },
  eastern: {
    name: 'الشرقية', sub: 'الدمام · الجبيل', img: 'assets/ui/load_eastern.webp', music: 'eastern', theme: 'eastern',
    factories: [
      { id: 'petro', name: 'مجمع البتروكيماويات', short: 'البتروكيماويات', icon: 'flask', color: '#e08a1e', product: 'chem', game: 'memory', track: 'discoverer',
        title: 'معدات الوقاية', brief: 'اقلب البطاقات وطابق كل أداة وقاية مع شبيهتها بأقل عدد من المحاولات.' },
      { id: 'desal', name: 'محطة تحلية المياه', short: 'التحلية', icon: 'drop', color: '#1f86c9', product: 'membranes', game: 'order', track: 'creative',
        title: 'مراحل التحلية', brief: 'رتّب مراحل تحويل مياه البحر إلى مياه شرب بالترتيب الصحيح.' },
      { id: 'port', name: 'الميناء الصناعي', short: 'الميناء', icon: 'ship', color: '#24496e', product: 'containers', game: 'quiz', track: 'ambassador',
        title: 'تحدي السفير', brief: 'أجب عن أسئلة الصناعة والمبادرة بسرعة لتصبح سفيراً لصناعيو المستقبل.' }
    ],
    soon: ['مصنع جديد', 'مصنع جديد']
  }
};

export const ALL = ORDER.flatMap(r => REGIONS[r].factories.map(f => ({ ...f, region: r })));
