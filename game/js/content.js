/* What each factory teaches: the safety gear its floor needs, three things to learn on the tour
   (raw materials, making, packing and quality), and a question on each for the supervisor's quiz.
   Every text has Arabic and English. a[0] is always the right answer (options are shuffled on screen). */
export const PPE = {
  helmet: { ar: 'خوذة', en: 'Hard hat' },
  goggles: { ar: 'نظارة واقية', en: 'Goggles' },
  gloves: { ar: 'قفازات', en: 'Gloves' },
  ears: { ar: 'واقي أذن', en: 'Ear muffs' },
  hairnet: { ar: 'غطاء شعر', en: 'Hairnet' },
  mask: { ar: 'كمامة', en: 'Face mask' },
  boots: { ar: 'حذاء سلامة', en: 'Safety boots' },
  vest: { ar: 'سترة عاكسة', en: 'Hi-vis vest' },
  coat: { ar: 'معطف مختبر', en: 'Lab coat' }
};
/* small line icons for the gear lockers (24×24 viewBox, stroke = currentColor) */
export const PPE_ICON = {
  helmet: '<path d="M3 17h18M5 17a7 7 0 0 1 14 0M12 6v4M9 7.5 10 10M15 7.5 14 10"/><path d="M2.5 17h19v2h-19z" fill="currentColor"/>',
  goggles: '<rect x="2.5" y="8" width="8" height="7" rx="3"/><rect x="13.5" y="8" width="8" height="7" rx="3"/><path d="M10.5 11h3M2.5 11H1M21.5 11H23"/>',
  gloves: '<path d="M7 21v-6L4.5 11a1.5 1.5 0 0 1 2.5-1.6L8.5 11V4.5a1.5 1.5 0 0 1 3 0V10V3.5a1.5 1.5 0 0 1 3 0V10V5a1.5 1.5 0 0 1 3 0v10l-1.5 6z"/>',
  ears: '<path d="M5 14V11a7 7 0 0 1 14 0v3"/><rect x="2.5" y="13" width="5" height="7" rx="2"/><rect x="16.5" y="13" width="5" height="7" rx="2"/>',
  hairnet: '<path d="M4 15a8 8 0 0 1 16 0z"/><path d="M8 9l8 6M16 9l-8 6M12 7v8M4 15h16"/>',
  mask: '<path d="M4 9c3-1 13-1 16 0v4c0 3-4 6-8 6s-8-3-8-6z"/><path d="M4 10 1.5 8.5M20 10l2.5-1.5M8 12h8M8 15h8"/>',
  boots: '<path d="M6 3h6v10l7 3.5a2 2 0 0 1 1 1.7V20H4V3z"/><path d="M4 17h16M6 7h6"/>',
  vest: '<path d="M8 3 5 5v16h5v-8h4v8h5V5l-3-2-4 4z"/><path d="M5 12h5M14 12h5M5 16h5M14 16h5"/>',
  coat: '<path d="M8 3h8l4 4-2 3v11H6V10L4 7z"/><path d="M12 7v14M8 3l4 4 4-4M9 14h1M14 14h1"/>'
};
const F = (ar, en) => ({ ar, en });
export const TOUR = {
  rabie: {
    ppe: ['hairnet', 'gloves', 'boots'], why: F('خط العصير خط غذائي: غطاء الشعر والقفازات تحمي العصير منا، وحذاء السلامة يحمينا من الأرض المبتلّة.', 'A juice line handles food: the hairnet and gloves protect the juice from us, the boots protect us on wet floors.'),
    facts: [
      { t: F('المواد الخام', 'Raw materials'), b: F('تصل الفواكه أو مركّزاتها إلى المصنع، وتُفحص عيّنة من كل شحنة في المختبر قبل استخدامها.', 'Fruit or fruit concentrate arrives at the plant, and a sample from every shipment is tested in the lab first.'),
        q: F('ماذا يحدث لكل شحنة فواكه عند وصولها؟', 'What happens to every fruit shipment on arrival?'), a: [F('تُفحص عيّنة منها في المختبر', 'A sample is tested in the lab'), F('تُعبّأ مباشرة', 'It goes straight into cartons'), F('تُخزّن سنة كاملة', 'It is stored for a year')] },
      { t: F('التصنيع', 'Processing'), b: F('يُبستَر العصير: يُسخَّن لدرجة عالية لثوانٍ ثم يُبرَّد بسرعة، فتموت الميكروبات ويبقى الطعم.', 'The juice is pasteurised: heated for a few seconds, then cooled fast, so germs die and the taste stays.'),
        q: F('لماذا يُبستَر العصير؟', 'Why is juice pasteurised?'), a: [F('لقتل الميكروبات مع الحفاظ على الطعم', 'To kill germs and keep the taste'), F('لتغيير لونه', 'To change its colour'), F('لزيادة السكر فيه', 'To add sugar')] },
      { t: F('التعبئة والجودة', 'Packing & quality'), b: F('تُعبّأ العصائر في عبوات كرتونية معقّمة من عدة طبقات تحمي العصير من الضوء والهواء.', 'Juice goes into sterile multi-layer cartons that keep out light and air.'),
        q: F('ما وظيفة طبقات العبوة الكرتونية؟', 'What do the carton’s layers do?'), a: [F('تحمي العصير من الضوء والهواء', 'Keep out light and air'), F('تزيّن العبوة فقط', 'Only decorate it'), F('تبرّد العصير', 'Chill the juice')] }
    ]
  },
  coca: {
    ppe: ['goggles', 'ears', 'boots'], why: F('خط التعبئة سريع وعالي الصوت وفيه عبوات تحت ضغط: نظارة للعينين، واقي للأذنين، وحذاء سلامة.', 'The bottling line is fast and loud, with bottles under pressure: goggles for your eyes, ear muffs and safety boots.'),
    facts: [
      { t: F('المواد الخام', 'Raw materials'), b: F('الماء هو المكوّن الأكبر في المشروب، لذلك يُنقّى بعدة مراحل ترشيح قبل الخلط.', 'Water is the biggest ingredient, so it is purified through several filter stages before mixing.'),
        q: F('ما المكوّن الأكبر في المشروب الغازي؟', 'What is the main ingredient of a soft drink?'), a: [F('الماء', 'Water'), F('السكر', 'Sugar'), F('الغاز', 'Gas')] },
      { t: F('التصنيع', 'Processing'), b: F('يُخلط الشراب المركّز مع الماء المنقّى، ثم يُذاب فيه غاز ثاني أكسيد الكربون فيصبح فوّاراً.', 'Syrup is mixed with purified water, then carbon dioxide is dissolved in it to make it fizzy.'),
        q: F('ما الغاز الذي يجعل المشروب فوّاراً؟', 'Which gas makes a drink fizzy?'), a: [F('ثاني أكسيد الكربون', 'Carbon dioxide'), F('الأكسجين', 'Oxygen'), F('النيتروجين', 'Nitrogen')] },
      { t: F('التعبئة والجودة', 'Packing & quality'), b: F('خطوط التعبئة تملأ وتغلق مئات العبوات في الدقيقة، وكاميرات تفحص مستوى التعبئة في كل عبوة.', 'Filling lines fill and cap hundreds of bottles a minute, and cameras check the fill level of each one.'),
        q: F('كيف يُفحص مستوى التعبئة في كل عبوة؟', 'How is every bottle’s fill level checked?'), a: [F('بكاميرات وأجهزة استشعار على الخط', 'By cameras and sensors on the line'), F('بالعين فقط في نهاية اليوم', 'By eye at the end of the day'), F('لا يُفحص', 'It isn’t')] }
    ]
  },
  kacst: {
    ppe: ['coat', 'goggles', 'gloves'], why: F('في المختبر والغرف النظيفة: معطف مختبر ونظارة وقفازات تحمينا وتحمي القطع الحساسة من الغبار والبصمات.', 'In labs and clean rooms a lab coat, goggles and gloves protect us, and keep dust and fingerprints off delicate parts.'),
    facts: [
      { t: F('الغرف النظيفة', 'Clean rooms'), b: F('تُجمَّع الأقمار الصناعية في غرف نظيفة شبه خالية من الغبار، لأن ذرة غبار قد تُتلف قطعة حساسة.', 'Satellites are built in clean rooms with almost no dust, because one speck can ruin a delicate part.'),
        q: F('لماذا تُجمَّع الأقمار الصناعية في غرف نظيفة؟', 'Why are satellites built in clean rooms?'), a: [F('لأن الغبار قد يُتلف القطع الحساسة', 'Dust can damage delicate parts'), F('لتبقى باردة', 'To keep them cold'), F('لتكون أخف وزناً', 'To make them lighter')] },
      { t: F('الاختبار', 'Testing'), b: F('قبل الإطلاق يُختبر القمر على الاهتزاز الشديد والحرارة والبرودة القاسية، ليتحمّل رحلته إلى الفضاء.', 'Before launch a satellite is shaken hard and tested in extreme heat and cold so it survives the trip to space.'),
        q: F('على ماذا يُختبر القمر قبل إطلاقه؟', 'What is a satellite tested for before launch?'), a: [F('الاهتزاز والحرارة والبرودة الشديدة', 'Shaking, heat and extreme cold'), F('لونه فقط', 'Only its colour'), F('سرعة الإنترنت', 'Internet speed')] },
      { t: F('الطاقة', 'Power'), b: F('يحصل القمر الصناعي على طاقته من ألواح شمسية تحوّل ضوء الشمس إلى كهرباء.', 'A satellite gets its power from solar panels that turn sunlight into electricity.'),
        q: F('من أين يحصل القمر الصناعي على طاقته في الفضاء؟', 'Where does a satellite get its power in space?'), a: [F('من ألواح شمسية', 'Solar panels'), F('من البنزين', 'Petrol'), F('من سلك طويل يصل إلى الأرض', 'A long cable to Earth')] }
    ]
  },
  york: {
    ppe: ['helmet', 'gloves', 'boots'], why: F('في مصنع المكيّفات قطع معدنية ثقيلة وحوافّ حادة: خوذة وقفازات وحذاء سلامة.', 'An air-conditioner plant has heavy metal parts and sharp edges: hard hat, gloves and safety boots.'),
    facts: [
      { t: F('مكوّنات المكيّف', 'Inside an AC'), b: F('يتكوّن المكيّف من ضاغط ومكثّف ومبخّر، يتنقّل بينها غاز التبريد في دائرة مغلقة.', 'An AC has a compressor, a condenser and an evaporator, with refrigerant flowing between them in a closed loop.'),
        q: F('أين يتنقّل غاز التبريد في المكيّف؟', 'Where does the refrigerant flow in an AC?'), a: [F('في دائرة مغلقة بين أجزائه', 'In a closed loop between its parts'), F('يخرج إلى الغرفة', 'Out into the room'), F('يُستبدل كل يوم', 'It is replaced every day')] },
      { t: F('الضاغط', 'The compressor'), b: F('الضاغط هو قلب المكيّف: يضغط غاز التبريد فترتفع حرارته، ثم يطرد المكثّف هذه الحرارة إلى الخارج.', 'The compressor is the heart of the AC: it squeezes the refrigerant so it heats up, and the condenser sends that heat outside.'),
        q: F('ما قلب جهاز التكييف؟', 'What is the heart of an AC?'), a: [F('الضاغط', 'The compressor'), F('جهاز التحكم', 'The remote'), F('الفلتر', 'The filter')] },
      { t: F('اختبار الجودة', 'Quality test'), b: F('يُختبر كل مكيّف تحت الضغط للتأكد من عدم وجود أي تسريب لغاز التبريد قبل شحنه.', 'Every unit is pressure-tested to make sure no refrigerant can leak before it ships.'),
        q: F('لماذا يُختبر المكيّف تحت الضغط؟', 'Why is each AC pressure-tested?'), a: [F('للتأكد من عدم تسريب غاز التبريد', 'To make sure no refrigerant leaks'), F('لتلوينه', 'To paint it'), F('لتخفيف وزنه', 'To make it lighter')] }
    ]
  },
  sadafco: {
    ppe: ['hairnet', 'mask', 'boots'], why: F('الحليب منتج حساس: غطاء الشعر والكمامة يمنعان أي تلوّث، وحذاء السلامة لأرضيات تُغسل دائماً.', 'Milk is delicate: hairnet and mask stop any contamination, and boots grip floors that are always being washed.'),
    facts: [
      { t: F('المواد الخام', 'Raw materials'), b: F('يصل الحليب الطازج في صهاريج مبرّدة، ويُفحص فوراً لدرجة حرارته ونظافته.', 'Fresh milk arrives in chilled tankers and is checked at once for temperature and cleanliness.'),
        q: F('كيف يصل الحليب الطازج إلى المصنع؟', 'How does fresh milk reach the plant?'), a: [F('في صهاريج مبرّدة', 'In chilled tankers'), F('في أكياس ورقية', 'In paper bags'), F('في براميل مفتوحة', 'In open barrels')] },
      { t: F('التصنيع', 'Processing'), b: F('تقنية UHT تسخّن الحليب إلى نحو 140 درجة لثوانٍ قليلة، فيبقى صالحاً لأشهر قبل فتحه.', 'UHT heats milk to about 140°C for a few seconds, so it keeps for months before opening.'),
        q: F('ماذا تفعل تقنية UHT؟', 'What does UHT do?'), a: [F('تسخّن الحليب بسرعة ليبقى صالحاً لأشهر', 'Heats milk briefly so it lasts months'), F('تجمّد الحليب', 'Freezes the milk'), F('تضيف السكر', 'Adds sugar')] },
      { t: F('التعبئة والجودة', 'Packing & quality'), b: F('يُعبّأ الحليب في عبوات معقّمة داخل بيئة معقّمة حتى لا تدخله أي ميكروبات.', 'Milk is packed into sterile cartons in a sterile space so no germs get in.'),
        q: F('لماذا يُعبّأ الحليب في بيئة معقّمة؟', 'Why is milk packed in a sterile space?'), a: [F('حتى لا تدخله الميكروبات', 'So no germs get in'), F('ليكون أسرع', 'To go faster'), F('ليلمع', 'To make it shiny')] }
    ]
  },
  yamamah: {
    ppe: ['helmet', 'goggles', 'gloves'], why: F('مصنع الحديد حار جداً وفيه شرر وقطع ثقيلة: خوذة ونظارة وقفازات مقاومة للحرارة.', 'A steel mill is very hot, with sparks and heavy loads: hard hat, goggles and heat-proof gloves.'),
    facts: [
      { t: F('الصهر', 'Melting'), b: F('يُصهر الحديد الخردة في أفران عملاقة تتجاوز حرارتها 1500 درجة مئوية.', 'Scrap steel is melted in huge furnaces hotter than 1,500°C.'),
        q: F('كم تقارب حرارة فرن صهر الحديد؟', 'How hot is a steel furnace?'), a: [F('أكثر من 1500 درجة', 'Over 1,500°C'), F('100 درجة', '100°C'), F('500 درجة', '500°C')] },
      { t: F('الدرفلة', 'Rolling'), b: F('يمرّ الحديد الساخن بين بكرات الدرفلة التي تضغطه وتشكّله إلى قضبان وأنابيب.', 'Hot steel passes between rollers that squeeze and shape it into bars and pipes.'),
        q: F('ما وظيفة بكرات الدرفلة؟', 'What do the rollers do?'), a: [F('تضغط الحديد الساخن وتشكّله', 'Squeeze and shape the hot steel'), F('تبرّده فقط', 'Only cool it'), F('تطليه بالألوان', 'Paint it')] },
      { t: F('إعادة التدوير', 'Recycling'), b: F('إعادة تدوير الحديد توفّر كثيراً من الطاقة والمواد الخام مقارنة باستخراجه من المناجم.', 'Recycling steel saves a lot of energy and raw material compared with mining new ore.'),
        q: F('لماذا نعيد تدوير الحديد؟', 'Why recycle steel?'), a: [F('لتوفير الطاقة والمواد الخام', 'To save energy and raw material'), F('لأنه يصبح أجمل', 'It looks nicer'), F('لأن الجديد لا يصدأ', 'New steel never rusts')] }
    ]
  },
  kareeda: {
    ppe: ['hairnet', 'gloves', 'mask'], why: F('التمور تؤكل مباشرة: غطاء الشعر والقفازات والكمامة تحافظ على نظافتها.', 'Dates are eaten straight from the box: hairnet, gloves and mask keep them clean.'),
    facts: [
      { t: F('الحصاد', 'Harvest'), b: F('تُحصد التمور في موسم «الصرام»، ثم تُنقل إلى المصنع لتُفرز حسب الحجم والجودة.', 'Dates are picked in the harvest season (al-sirām), then sorted at the plant by size and quality.'),
        q: F('على أي أساس تُفرز التمور؟', 'How are dates sorted?'), a: [F('حسب الحجم والجودة', 'By size and quality'), F('حسب اللون فقط', 'Only by colour'), F('لا تُفرز', 'They aren’t')] },
      { t: F('التجهيز', 'Preparation'), b: F('تُغسل التمور وتُعقّم وتُجفّف قبل التعبئة لتبقى نظيفة وطريّة.', 'Dates are washed, sanitised and dried before packing so they stay clean and soft.'),
        q: F('ماذا يحدث للتمور قبل التعبئة؟', 'What happens to dates before packing?'), a: [F('تُغسل وتُعقّم وتُجفّف', 'Washed, sanitised and dried'), F('تُطبخ', 'Cooked'), F('تُجمّد', 'Frozen')] },
      { t: F('القصيم', 'Qassim'), b: F('القصيم من أكبر مناطق إنتاج التمور في العالم، وتشتهر بتمر السكري.', 'Qassim is one of the world’s great date regions, famous for Sukkari dates.'),
        q: F('بأي نوع من التمور تشتهر القصيم؟', 'Which date is Qassim famous for?'), a: [F('السكري', 'Sukkari'), F('العجوة', 'Ajwa'), F('العنبرة', 'Anbara')] }
    ]
  },
  naqi: {
    ppe: ['hairnet', 'gloves', 'boots'], why: F('الماء الذي نشربه يجب أن يبقى نقياً: غطاء شعر وقفازات، وحذاء سلامة لأرضيات مبتلّة.', 'Drinking water must stay pure: hairnet and gloves, plus boots for wet floors.'),
    facts: [
      { t: F('المصدر', 'The source'), b: F('تُضخ المياه من آبار جوفية عميقة، ثم تمرّ بمراحل ترشيح تزيل الرمل والشوائب.', 'Water is pumped from deep wells, then filtered to remove sand and impurities.'),
        q: F('من أين تأتي مياه المصنع؟', 'Where does the plant’s water come from?'), a: [F('من آبار جوفية عميقة', 'Deep underground wells'), F('من البحر دون معالجة', 'The sea, untreated'), F('من المطر فقط', 'Only rain')] },
      { t: F('التنقية', 'Purifying'), b: F('التناضح العكسي يدفع الماء عبر أغشية دقيقة جداً لا تمرّ منها الأملاح الزائدة والجراثيم.', 'Reverse osmosis pushes water through very fine membranes that stop excess salts and germs.'),
        q: F('ماذا يفعل التناضح العكسي؟', 'What does reverse osmosis do?'), a: [F('يمرّر الماء عبر أغشية تحجز الأملاح والجراثيم', 'Pushes water through membranes that stop salts and germs'), F('يسخّن الماء', 'Heats the water'), F('يلوّن الماء', 'Colours the water')] },
      { t: F('التعقيم والتعبئة', 'Sterilising & filling'), b: F('تُعقّم المياه بالأوزون أو بالأشعة فوق البنفسجية، ثم تُعبّأ في عبوات نظيفة ومختومة.', 'Water is sterilised with ozone or UV light, then filled into clean, sealed bottles.'),
        q: F('بماذا تُعقّم المياه قبل تعبئتها؟', 'How is the water sterilised?'), a: [F('بالأوزون أو الأشعة فوق البنفسجية', 'Ozone or UV light'), F('بالسكر', 'Sugar'), F('بالملح', 'Salt')] }
    ]
  },
  tozeen: {
    ppe: ['hairnet', 'mask', 'gloves'], why: F('الحلويات تُصنع لتؤكل: غطاء الشعر والكمامة والقفازات تحفظها نظيفة.', 'Sweets are made to be eaten: hairnet, mask and gloves keep them clean.'),
    facts: [
      { t: F('الوزن الدقيق', 'Precise weighing'), b: F('تُوزن المكوّنات بدقة عالية، لأن أي فرق صغير يغيّر طعم الحلوى وقوامها.', 'Ingredients are weighed precisely, because a small difference changes the taste and texture.'),
        q: F('لماذا توزن المكوّنات بدقة؟', 'Why weigh ingredients precisely?'), a: [F('لأن أي فرق يغيّر الطعم والقوام', 'Any difference changes taste and texture'), F('لتقليل الألوان', 'To use fewer colours'), F('لأن الآلات تحب الأرقام', 'Machines like numbers')] },
      { t: F('التشكيل', 'Shaping'), b: F('تُشكَّل الحلويات بقوالب وآلات، ثم تُخبز أو تُبرَّد حسب نوعها.', 'Sweets are shaped by moulds and machines, then baked or cooled depending on the kind.'),
        q: F('بماذا تُشكَّل الحلويات في المصنع؟', 'How are sweets shaped?'), a: [F('بقوالب وآلات', 'Moulds and machines'), F('باليد فقط دائماً', 'Always by hand'), F('بالطابعة الورقية', 'A paper printer')] },
      { t: F('التغليف', 'Packing'), b: F('التغليف الجيد يحمي الحلويات من الرطوبة ويحافظ على شكلها حتى تصل إلى المتجر.', 'Good packaging keeps sweets dry and in shape until they reach the shop.'),
        q: F('ممّ يحمي التغليف الجيد الحلويات؟', 'What does good packaging protect sweets from?'), a: [F('من الرطوبة والتلف', 'Moisture and damage'), F('من ضوء القمر', 'Moonlight'), F('لا شيء', 'Nothing')] }
    ]
  },
  petro: {
    ppe: ['helmet', 'goggles', 'gloves'], why: F('في مجمع البتروكيماويات أنابيب ومواد كيميائية: خوذة ونظارة واقية وقفازات مقاومة للمواد الكيميائية.', 'A petrochemical complex has pipes and chemicals: hard hat, goggles and chemical-proof gloves.'),
    facts: [
      { t: F('من النفط إلى منتجاتنا', 'From oil to everyday things'), b: F('تُستخدم مشتقات النفط والغاز لصنع البلاستيك والأسمدة ومواد كثيرة نستخدمها كل يوم.', 'Oil and gas are turned into plastics, fertilisers and many things we use every day.'),
        q: F('ماذا يُصنع من البتروكيماويات؟', 'What is made from petrochemicals?'), a: [F('البلاستيك والأسمدة', 'Plastics and fertilisers'), F('الخشب', 'Wood'), F('القطن الطبيعي', 'Natural cotton')] },
      { t: F('أبراج التقطير', 'Distillation towers'), b: F('تفصل أبراج التقطير المواد حسب درجة غليانها: الخفيفة تصعد للأعلى والثقيلة تبقى في الأسفل.', 'Distillation towers separate substances by boiling point: light ones rise to the top, heavy ones stay low.'),
        q: F('ماذا تفعل أبراج التقطير؟', 'What do distillation towers do?'), a: [F('تفصل المواد حسب درجة غليانها', 'Separate substances by boiling point'), F('تبرّد ماء الشرب', 'Chill drinking water'), F('تولّد الكهرباء من الرياح', 'Make wind power')] },
      { t: F('الشعلة', 'The flare'), b: F('الشعلة العالية تحرق الغازات الزائدة بأمان بدل أن تتسرّب إلى الهواء.', 'The tall flare safely burns off extra gas instead of letting it escape into the air.'),
        q: F('لماذا توجد شعلة عالية في المجمع؟', 'Why is there a tall flare?'), a: [F('لحرق الغازات الزائدة بأمان', 'To burn off extra gas safely'), F('للإضاءة ليلاً', 'To light up the night'), F('للطبخ', 'For cooking')] }
    ]
  },
  desal: {
    ppe: ['helmet', 'ears', 'boots'], why: F('في محطة التحلية مضخّات قوية جداً وصوت عالٍ: خوذة وواقي أذن وحذاء سلامة.', 'A desalination plant has very powerful, loud pumps: hard hat, ear muffs and safety boots.'),
    facts: [
      { t: F('المملكة والتحلية', 'Saudi Arabia & desalination'), b: F('المملكة من أكبر منتجي المياه المحلّاة في العالم، وتصل مياهها إلى مدن بعيدة عن البحر.', 'Saudi Arabia is one of the world’s largest producers of desalinated water, piped to cities far from the sea.'),
        q: F('ما مكانة المملكة في تحلية المياه؟', 'Where does Saudi Arabia rank in desalination?'), a: [F('من أكبر المنتجين في العالم', 'One of the largest producers'), F('لا تحلّي المياه', 'It doesn’t desalinate'), F('تحلّي مياه الأمطار فقط', 'Only rainwater')] },
      { t: F('التناضح العكسي', 'Reverse osmosis'), b: F('يُدفع ماء البحر بضغط عالٍ جداً عبر أغشية تحجز الملح ولا تمرّر إلا الماء.', 'Seawater is pushed at very high pressure through membranes that hold back the salt and let only water through.'),
        q: F('كيف يُفصل الملح عن ماء البحر هنا؟', 'How is salt removed from seawater here?'), a: [F('بدفعه بضغط عالٍ عبر أغشية', 'High pressure through membranes'), F('بتركه في الشمس', 'By leaving it in the sun'), F('بإضافة السكر', 'By adding sugar')] },
      { t: F('ماء صالح للشرب', 'Fit to drink'), b: F('بعد التحلية تُضاف بعض المعادن المفيدة إلى الماء ليصبح صالحاً للشرب.', 'After desalination, useful minerals are added back so the water is good to drink.'),
        q: F('ماذا يُضاف إلى الماء بعد التحلية؟', 'What is added after desalination?'), a: [F('معادن مفيدة', 'Useful minerals'), F('ملح البحر من جديد', 'Sea salt again'), F('ألوان', 'Colours')] }
    ]
  },
  port: {
    ppe: ['helmet', 'vest', 'boots'], why: F('في الميناء رافعات وشاحنات تتحرك باستمرار: خوذة، وسترة عاكسة ليراك السائقون، وحذاء سلامة.', 'The port is full of cranes and trucks: a hard hat, a hi-vis vest so drivers see you, and safety boots.'),
    facts: [
      { t: F('الحاويات', 'Containers'), b: F('تُنقل البضائع في حاويات بمقاسات موحّدة، فتنتقل بسهولة بين السفن والقطارات والشاحنات.', 'Goods travel in standard-size containers that move easily between ships, trains and trucks.'),
        q: F('لماذا مقاسات الحاويات موحّدة؟', 'Why are containers a standard size?'), a: [F('لتنتقل بسهولة بين السفن والقطارات والشاحنات', 'So they move easily between ships, trains and trucks'), F('لأنها أجمل', 'They look nicer'), F('لتطفو على الماء', 'So they float')] },
      { t: F('الرافعات', 'Cranes'), b: F('رافعات الرصيف العملاقة تفرّغ الحاوية من السفينة في نحو دقيقتين.', 'Giant quay cranes lift a container off a ship in about two minutes.'),
        q: F('كم تحتاج رافعة الرصيف لتفريغ حاوية؟', 'How long does a quay crane take per container?'), a: [F('نحو دقيقتين', 'About two minutes'), F('يوماً كاملاً', 'A whole day'), F('أسبوعاً', 'A week')] },
      { t: F('ميناء الدمام', 'Dammam’s port'), b: F('ميناء الملك عبدالعزيز بالدمام من أكبر الموانئ على الخليج العربي.', 'King Abdulaziz Port in Dammam is one of the largest ports on the Arabian Gulf.'),
        q: F('أين يقع ميناء الملك عبدالعزيز؟', 'Where is King Abdulaziz Port?'), a: [F('في الدمام على الخليج العربي', 'In Dammam on the Arabian Gulf'), F('في الرياض', 'In Riyadh'), F('في تبوك', 'In Tabuk')] }
    ]
  }
};
