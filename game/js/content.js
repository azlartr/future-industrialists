/* What each factory teaches: the safety gear its floor needs, three things to learn on the tour
   (raw materials, making, packing and quality), and a question on each for the supervisor’s quiz.
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
        q: F('إذا دخلت شحنة فاكهة إلى الخط دون فحص عيّنتها، ما أكبر خطر؟', 'If a fruit shipment reaches the line without its sample being tested, what is the biggest risk?'), a: [F('فاكهة فاسدة أو ملوّثة قد تُفسد العصير كله', 'Spoiled or contaminated fruit could ruin the whole batch'), F('لا خطر، الفحص شكلي فقط', 'No risk, the test is only a formality'), F('يصبح العصير أحلى من المعتاد', 'The juice becomes sweeter than usual')] },
      { t: F('التصنيع', 'Processing'), b: F('يُبستَر العصير: يُسخَّن لدرجة عالية لثوانٍ ثم يُبرَّد بسرعة، فتموت الميكروبات ويبقى الطعم.', 'The juice is pasteurised: heated for a few seconds, then cooled fast, so germs die and the taste stays.'),
        q: F('لو بقي العصير ساخناً أطول من اللازم بعد التسخين، ماذا يخسر؟', 'If juice stays hot for too long after heating, what does it lose?'), a: [F('طعمه الطازج ولونه الطبيعي', 'Its fresh taste and natural colour'), F('يزداد عدد الميكروبات فيه', 'Its number of germs goes up'), F('يفقد سكره فقط', 'It loses only its sugar')] },
      { t: F('التعبئة والجودة', 'Packing & quality'), b: F('تُعبّأ العصائر في عبوات كرتونية معقّمة من عدة طبقات تحمي العصير من الضوء والهواء.', 'Juice goes into sterile multi-layer cartons that keep out light and air.'),
        q: F('لو عُبّئ العصير في كرتون شفاف بطبقة واحدة، ماذا سيحدث له مع الوقت؟', 'If juice were packed in a clear single-layer carton, what would happen to it over time?'), a: [F('يتأثر طعمه بالضوء والهواء تدريجياً', 'Light and air would slowly spoil its taste'), F('يصبح أثقل وزناً', 'It would become heavier'), F('يتجمّد داخل العبوة', 'It would freeze inside the pack')] }
    ]
  },
  coca: {
    ppe: ['goggles', 'ears', 'boots'], why: F('خط التعبئة سريع وعالي الصوت وفيه عبوات تحت ضغط: نظارة للعينين، واقي للأذنين، وحذاء سلامة.', 'The bottling line is fast and loud, with bottles under pressure: goggles for your eyes, ear muffs and safety boots.'),
    facts: [
      { t: F('المواد الخام', 'Raw materials'), b: F('الماء هو المكوّن الأكبر في المشروب، لذلك يُنقّى بعدة مراحل ترشيح قبل الخلط.', 'Water is the biggest ingredient, so it is purified through several filter stages before mixing.'),
        q: F('لماذا لا يكفي خلط الشراب بماء من الصنبور مباشرة؟', 'Why isn’t it enough to mix the syrup with plain tap water?'), a: [F('لأن الشوائب والمعادن الزائدة تغيّر طعم المشروب', 'Impurities and extra minerals would change the drink’s taste'), F('لأن ماء الصنبور يجعل العبوة أثقل', 'Tap water would make the bottle heavier'), F('لأنه يبرّد الشراب أكثر من اللازم', 'It would chill the syrup too much')] },
      { t: F('التصنيع', 'Processing'), b: F('يُخلط الشراب المركّز مع الماء المنقّى، ثم يُذاب فيه غاز ثاني أكسيد الكربون فيصبح فوّاراً.', 'Syrup is mixed with purified water, then carbon dioxide is dissolved in it to make it fizzy.'),
        q: F('مشروب غازي فُتحت عبوته وتُرك مفتوحاً ساعة كاملة. ماذا يحدث لفوّاره؟', 'A fizzy drink was opened and left out for an hour. What happens to its fizz?'), a: [F('يفقد الغاز ويصبح مسطّحاً', 'The gas escapes and it goes flat'), F('يزداد فوراناً', 'It fizzes even more'), F('يتحوّل إلى ماء بلا طعم', 'It turns into tasteless water')] },
      { t: F('التعبئة والجودة', 'Packing & quality'), b: F('خطوط التعبئة تملأ وتغلق مئات العبوات في الدقيقة، وكاميرات تفحص مستوى التعبئة في كل عبوة.', 'Filling lines fill and cap hundreds of bottles a minute, and cameras check the fill level of each one.'),
        q: F('عبوة تُملأ أقل من المطلوب على الخط. ماذا يحدث لها؟', 'A bottle is filled below the required level on the line. What happens to it?'), a: [F('يرفضها الخط تلقائياً فلا تصل إلى المتجر', 'The line rejects it automatically, so it never reaches a shop'), F('تُباع بسعر أغلى لأنها أقل امتلاءً', 'It is sold at a higher price because it is less full'), F('تُغلق بغطاء أكبر وتكمل طريقها', 'It is sealed with a bigger cap and carries on')] }
    ]
  },
  kacst: {
    ppe: ['coat', 'goggles', 'gloves'], why: F('في المختبر والغرف النظيفة: معطف مختبر ونظارة وقفازات تحمينا وتحمي القطع الحساسة من الغبار والبصمات.', 'In labs and clean rooms a lab coat, goggles and gloves protect us, and keep dust and fingerprints off delicate parts.'),
    facts: [
      { t: F('الغرف النظيفة', 'Clean rooms'), b: F('تُجمَّع الأقمار الصناعية في غرف نظيفة شبه خالية من الغبار، لأن ذرة غبار قد تُتلف قطعة حساسة.', 'Satellites are built in clean rooms with almost no dust, because one speck can ruin a delicate part.'),
        q: F('ذرة غبار علقت بعدسة كاميرا القمر. ماذا تتوقع أن يحدث للصور؟', 'A dust speck gets stuck on a satellite camera lens. What do you expect to happen to the pictures?'), a: [F('تظهر بقعة فيها وتتشوّه الصورة', 'A spot appears and the picture gets distorted'), F('تصبح الصور أوضح من قبل', 'The pictures become sharper than before'), F('يزداد وزن القمر قليلاً', 'The satellite’s weight goes up a little')] },
      { t: F('الاختبار', 'Testing'), b: F('قبل الإطلاق يُختبر القمر على الاهتزاز الشديد والحرارة والبرودة القاسية، ليتحمّل رحلته إلى الفضاء.', 'Before launch a satellite is shaken hard and tested in extreme heat and cold so it survives the trip to space.'),
        q: F('لماذا لا يكفي أن يعمل القمر جيداً في المختبر عند حرارة الغرفة؟', 'Why isn’t it enough for a satellite to work well in a lab at room temperature?'), a: [F('لأن الصاروخ ثم الفضاء يعرّضانه لاهتزاز وحرارة وبرودة شديدة', 'Because the rocket and then space subject it to heavy shaking and extreme heat and cold'), F('لأن المختبرات لا تملك كهرباء كافية', 'Labs don’t have enough electricity'), F('لأن الألوان تتغيّر في الهواء الطلق', 'Colours change in open air')] },
      { t: F('الطاقة', 'Power'), b: F('يحصل القمر الصناعي على طاقته من ألواح شمسية تحوّل ضوء الشمس إلى كهرباء.', 'A satellite gets its power from solar panels that turn sunlight into electricity.'),
        q: F('القمر يدور حول الأرض ساعات طويلة بعيداً عن أي محطة وقود. ماذا يُشغّله؟', 'A satellite orbits Earth for hours, far from any fuel station. What powers it?'), a: [F('ضوء الشمس الذي تحوّله ألواحه إلى كهرباء', 'Sunlight, which its panels turn into electricity'), F('بطارية تكفي إلى الأبد', 'A battery that lasts forever'), F('محرّك يعمل بالرياح الكونية', 'An engine that runs on cosmic winds')] }
    ]
  },
  york: {
    ppe: ['helmet', 'gloves', 'boots'], why: F('في مصنع المكيّفات قطع معدنية ثقيلة وحوافّ حادة: خوذة وقفازات وحذاء سلامة.', 'An air-conditioner plant has heavy metal parts and sharp edges: hard hat, gloves and safety boots.'),
    facts: [
      { t: F('مكوّنات المكيّف', 'Inside an AC'), b: F('يتكوّن المكيّف من ضاغط ومكثّف ومبخّر، يتنقّل بينها غاز التبريد في دائرة مغلقة.', 'An AC has a compressor, a condenser and an evaporator, with refrigerant flowing between them in a closed loop.'),
        q: F('تسرّب غاز التبريد من وصلة في المكيّف. ماذا يعني ذلك لأداء المكيّف؟', 'Refrigerant leaks from a joint in an AC. What does that mean for the AC’s performance?'), a: [F('يفقد قدرته على التبريد لأن الغاز ينقص من دائرته', 'It loses its cooling, because gas is missing from its loop'), F('يبرد أكثر من المطلوب', 'It cools more than it should'), F('تزداد قدرته على التبريد كلما قلّ الغاز', 'Its cooling improves as the gas drops')] },
      { t: F('الضاغط', 'The compressor'), b: F('الضاغط هو قلب المكيّف: يضغط غاز التبريد فترتفع حرارته، ثم يطرد المكثّف هذه الحرارة إلى الخارج.', 'The compressor is the heart of the AC: it squeezes the refrigerant so it heats up, and the condenser sends that heat outside.'),
        q: F('المروحة تدور لكن الغرفة لا تبرد. أي جزء يُفحص أولاً لأنه يحرّك دائرة التبريد؟', 'The fan spins but the room does not cool. Which part should be checked first, since it drives the cooling loop?'), a: [F('الضاغط', 'The compressor'), F('جهاز التحكم عن بُعد', 'The remote control'), F('الفلتر فقط', 'Only the filter')] },
      { t: F('اختبار الجودة', 'Quality test'), b: F('يُختبر كل مكيّف تحت الضغط للتأكد من عدم وجود أي تسريب لغاز التبريد قبل شحنه.', 'Every unit is pressure-tested to make sure no refrigerant can leak before it ships.'),
        q: F('مكيّف يعمل اليوم جيداً، لكن غاز التبريد قد يتسرّب بعد أسابيع من الشحن. ما الذي يمنع ذلك؟', 'An AC works well today, but refrigerant could leak weeks after shipping. What prevents that?'), a: [F('الاختبار تحت الضغط قبل الشحن', 'The pressure test before shipping'), F('تغيير لون الغلاف', 'Changing the casing colour'), F('تقليل وزن الجهاز', 'Reducing the unit’s weight')] }
    ]
  },
  sadafco: {
    ppe: ['hairnet', 'mask', 'boots'], why: F('الحليب منتج حساس: غطاء الشعر والكمامة يمنعان أي تلوّث، وحذاء السلامة لأرضيات تُغسل دائماً.', 'Milk is delicate: hairnet and mask stop any contamination, and boots grip floors that are always being washed.'),
    facts: [
      { t: F('المواد الخام', 'Raw materials'), b: F('يصل الحليب الطازج في صهاريج مبرّدة، ويُفحص فوراً لدرجة حرارته ونظافته.', 'Fresh milk arrives in chilled tankers and is checked at once for temperature and cleanliness.'),
        q: F('حليب طازج وصل بعد ساعات في صهريج غير مبرّد. ما المشكلة الأولى؟', 'Fresh milk arrives after hours in a tanker that isn’t chilled. What’s the first problem?'), a: [F('تنمو فيه الميكروبات بسرعة قبل أن يُعالج', 'Germs multiply fast before it can be processed'), F('يصبح أكثر دسماً', 'It becomes richer and fattier'), F('يتحوّل إلى مسحوق', 'It turns into powder')] },
      { t: F('التصنيع', 'Processing'), b: F('تقنية UHT تسخّن الحليب إلى نحو 140 درجة لثوانٍ قليلة، فيبقى صالحاً لأشهر قبل فتحه.', 'UHT heats milk to about 140°C for a few seconds, so it keeps for months before opening.'),
        q: F('لماذا لا يُسخَّن الحليب بهدوء لساعات بدل تسخينه لثوانٍ قليلة؟', 'Why not heat milk gently for hours instead of for a few seconds?'), a: [F('لأن التسخين الطويل يُفسد طعمه ويغيّر قوامه', 'Long heating would spoil its taste and change its texture'), F('لأن التسخين الطويل يزيد فيتاميناته', 'Long heating makes the milk richer in vitamins'), F('لأن الساعات تكلّف المصنع أكثر فقط', 'Just because hours cost the plant more')] },
      { t: F('التعبئة والجودة', 'Packing & quality'), b: F('يُعبّأ الحليب في عبوات معقّمة داخل بيئة معقّمة حتى لا تدخله أي ميكروبات.', 'Milk is packed into sterile cartons in a sterile space so no germs get in.'),
        q: F('بعد فتح علبة الحليب في البيت تبقى مدة أقصر. لماذا؟', 'Once a milk carton is opened at home, it keeps for a shorter time. Why?'), a: [F('لأن الهواء والميكروبات دخلت إلى العبوة بعد الفتح', 'Because air and germs have entered the carton since it was opened'), F('لأن الكرتون يصبح أثقل بعد الفتح', 'Because the carton gets heavier once opened'), F('لأن الحليب يسخن تلقائياً بعد الفتح', 'Because the milk heats up by itself after opening')] }
    ]
  },
  yamamah: {
    ppe: ['helmet', 'goggles', 'gloves'], why: F('مصنع الحديد حار جداً وفيه شرر وقطع ثقيلة: خوذة ونظارة وقفازات مقاومة للحرارة.', 'A steel mill is very hot, with sparks and heavy loads: hard hat, goggles and heat-proof gloves.'),
    facts: [
      { t: F('الصهر', 'Melting'), b: F('يُصهر الحديد الخردة في أفران عملاقة تتجاوز حرارتها 1500 درجة مئوية.', 'Scrap steel is melted in huge furnaces hotter than 1,500°C.'),
        q: F('قطعة حديد خرجت من الفرن الساخن وبردت قبل وصولها إلى بكرات الدرفلة. ما المشكلة؟', 'A steel piece leaves the hot furnace and cools before it reaches the rollers. What is the problem?'), a: [F('يصلب الحديد ولا يتشكّل بسهولة بعد ذلك', 'The steel hardens and no longer shapes easily'), F('يصبح أخف وزناً', 'It becomes lighter'), F('يزداد لمعاناً', 'It becomes shinier')] },
      { t: F('الدرفلة', 'Rolling'), b: F('يمرّ الحديد الساخن بين بكرات الدرفلة التي تضغطه وتشكّله إلى قضبان وأنابيب.', 'Hot steel passes between rollers that squeeze and shape it into bars and pipes.'),
        q: F('بكرات الدرفلة تضغط قضيباً رقيقاً بقوة أكبر من اللازم. ماذا يحدث له؟', 'The rollers press a thin bar with too much force. What happens to it?'), a: [F('يتشوّه القضيب أو يتشقّق', 'The bar gets deformed or cracks'), F('يصبح أنظف من قبل', 'It becomes cleaner than before'), F('يزداد لمعانه فقط', 'It only gets shinier')] },
      { t: F('إعادة التدوير', 'Recycling'), b: F('إعادة تدوير الحديد توفّر كثيراً من الطاقة والمواد الخام مقارنة باستخراجه من المناجم.', 'Recycling steel saves a lot of energy and raw material compared with mining new ore.'),
        q: F('مصنع اعتاد استخراج الحديد من المنجم قرر التحوّل إلى تدوير الخردة. ماذا يتوقع أن يوفّر؟', 'A plant that used to mine iron switches to recycling scrap. What should it expect to save?'), a: [F('طاقة ومواد خام كثيرة', 'A lot of energy and raw material'), F('جودة الحديد ستنخفض دائماً', 'Steel quality will always drop'), F('عدد الأفران سيتضاعف', 'The number of furnaces will double')] }
    ]
  },
  kareeda: {
    ppe: ['hairnet', 'gloves', 'mask'], why: F('التمور تؤكل مباشرة: غطاء الشعر والقفازات والكمامة تحافظ على نظافتها.', 'Dates are eaten straight from the box: hairnet, gloves and mask keep them clean.'),
    facts: [
      { t: F('الحصاد', 'Harvest'), b: F('تُحصد التمور في موسم «الصرام»، ثم تُنقل إلى المصنع لتُفرز حسب الحجم والجودة.', 'Dates are picked in the harvest season (al-sirām), then sorted at the plant by size and quality.'),
        q: F('تمرتان من نفس النخلة: واحدة كبيرة لامعة وأخرى صغيرة باهتة. أين تذهب كل واحدة؟', 'Two dates from the same palm: one large and glossy, one small and dull. Where does each go?'), a: [F('في صفّين مختلفين، لأن الحجم والجودة يحددان سعرهما', 'On different lines, since size and quality set their price'), F('في صف واحد، لأنهما من نخلة واحدة', 'On the same line, since they come from one palm'), F('تُرمى الصغيرة فوراً', 'The small one is thrown away straight away')] },
      { t: F('التجهيز', 'Preparation'), b: F('تُغسل التمور وتُعقّم وتُجفّف قبل التعبئة لتبقى نظيفة وطريّة.', 'Dates are washed, sanitised and dried before packing so they stay clean and soft.'),
        q: F('تمرة بقيت عليها بقايا تراب بعد الحصاد وعُبّئت مباشرة. ما الخطر؟', 'A date still has dust on it after harvest and is packed straight away. What is the risk?'), a: [F('تنمو عليها الفطريات والجراثيم داخل العبوة', 'Mould and germs can grow on it inside the pack'), F('تصبح أحلى بسبب التراب', 'Dust makes it sweeter'), F('تزداد وزناً فيرتفع سعرها', 'It gets heavier, so its price goes up')] },
      { t: F('القصيم', 'Qassim'), b: F('القصيم من أكبر مناطق إنتاج التمور في العالم، وتشتهر بتمر السكري.', 'Qassim is one of the world’s great date regions, famous for Sukkari dates.'),
        q: F('لماذا تُعد القصيم مكاناً مناسباً لصناعة التمور بكميات كبيرة؟', 'Why is Qassim a good place to make dates in large quantities?'), a: [F('لأنها تزرع كميات كبيرة من التمر فتتوفّر المادة الخام بوفرة', 'Because it grows huge amounts of dates, so raw material is plentiful'), F('لأن أرضها لا تحتاج ماء أبداً', 'Because its land never needs water'), F('لأن الطقس بارد طوال السنة', 'Because its weather is cold all year')] }
    ]
  },
  naqi: {
    ppe: ['hairnet', 'gloves', 'boots'], why: F('الماء الذي نشربه يجب أن يبقى نقياً: غطاء شعر وقفازات، وحذاء سلامة لأرضيات مبتلّة.', 'Drinking water must stay pure: hairnet and gloves, plus boots for wet floors.'),
    facts: [
      { t: F('المصدر', 'The source'), b: F('تُضخ المياه من آبار جوفية عميقة، ثم تمرّ بمراحل ترشيح تزيل الرمل والشوائب.', 'Water is pumped from deep wells, then filtered to remove sand and impurities.'),
        q: F('لماذا يُرشَّح الماء قبل أغشية التناضح العكسي، مع أنها دقيقة جداً؟', 'Why is water filtered before the reverse-osmosis membranes, even though they are very fine?'), a: [F('حتى لا يسدّ الرمل والشوائب الأغشية الدقيقة', 'So sand and debris do not clog the fine membranes'), F('ليصبح الماء أحلى طعماً', 'So the water tastes sweeter'), F('ليكتسب الماء الأملاح المفيدة', 'So the water picks up useful salts')] },
      { t: F('التنقية', 'Purifying'), b: F('التناضح العكسي يدفع الماء عبر أغشية دقيقة جداً لا تمرّ منها الأملاح الزائدة والجراثيم.', 'Reverse osmosis pushes water through very fine membranes that stop excess salts and germs.'),
        q: F('غشاء تناضح عكسي توقف عن العمل فجأة. ماذا يحدث للماء بعد ذلك؟', 'A reverse-osmosis membrane suddenly stops working. What happens to the water?'), a: [F('تمرّ الجراثيم والأملاح الزائدة إلى الماء', 'Germs and extra salts pass into the water'), F('يصبح الماء أبرد', 'The water gets colder'), F('يتحوّل الماء إلى بخار', 'The water turns into steam')] },
      { t: F('التعقيم والتعبئة', 'Sterilising & filling'), b: F('تُعقّم المياه بالأوزون أو بالأشعة فوق البنفسجية، ثم تُعبّأ في عبوات نظيفة ومختومة.', 'Water is sterilised with ozone or UV light, then filled into clean, sealed bottles.'),
        q: F('لماذا تُعقَّم المياه قبل التعبئة وليس بعدها؟', 'Why is water disinfected before bottling rather than after?'), a: [F('لأن التعبئة بعد التعقيم تمنع دخول الجراثيم إلى العبوة', 'Because bottling after disinfection keeps germs out of the bottle'), F('لأن الأوزون يلوّن العبوة من الداخل', 'Because ozone colours the bottle from inside'), F('لأن الماء المعبّأ لا يحتاج أي تعقيم بعد ذلك', 'Because bottled water never needs disinfecting afterwards')] }
    ]
  },
  tozeen: {
    ppe: ['hairnet', 'mask', 'gloves'], why: F('الحلويات تُصنع لتؤكل: غطاء الشعر والكمامة والقفازات تحفظها نظيفة.', 'Sweets are made to be eaten: hairnet, mask and gloves keep them clean.'),
    facts: [
      { t: F('الوزن الدقيق', 'Precise weighing'), b: F('تُوزن المكوّنات بدقة عالية، لأن أي فرق صغير يغيّر طعم الحلوى وقوامها.', 'Ingredients are weighed precisely, because a small difference changes the taste and texture.'),
        q: F('مديرة الإنتاج تريد تسريع وزن المكوّنات. ما أول شيء قد يتأثر؟', 'The production manager wants to speed up weighing. What would be affected first?'), a: [F('طعم الحلوى وقوامها من دفعة إلى أخرى', 'The taste and texture from one batch to the next'), F('لون العلبة', 'The colour of the box'), F('عدد الموظفين على الخط', 'The number of staff on the line')] },
      { t: F('التشكيل', 'Shaping'), b: F('تُشكَّل الحلويات بقوالب وآلات، ثم تُخبز أو تُبرَّد حسب نوعها.', 'Sweets are shaped by moulds and machines, then baked or cooled depending on the kind.'),
        q: F('حلوى تحتاج إلى التبريد عوملت كأنها تُخبز. ماذا يحدث لها؟', 'A sweet that needs chilling is treated as if it should be baked. What happens to it?'), a: [F('تفقد شكلها وقوامها المطلوب', 'It loses its shape and the texture it needs'), F('تصبح أحلى طعماً', 'It tastes sweeter'), F('يتغيّر لونها إلى الأزرق', 'Its colour turns blue')] },
      { t: F('التغليف', 'Packing'), b: F('التغليف الجيد يحمي الحلويات من الرطوبة ويحافظ على شكلها حتى تصل إلى المتجر.', 'Good packaging keeps sweets dry and in shape until they reach the shop.'),
        q: F('حلويات مفتوحة العلب شُحنت إلى مكان رطب لأسابيع. ماذا يحدث لها؟', 'Sweets in open boxes are shipped to a damp place for weeks. What happens to them?'), a: [F('تلين وتفقد قوامها وتتغيّر أشكالها', 'They soften, lose their texture and change shape'), F('تصبح طعمها أقوى', 'Their taste becomes stronger'), F('تبقى كما هي تماماً', 'They stay exactly as they were')] }
    ]
  },
  petro: {
    ppe: ['helmet', 'goggles', 'gloves'], why: F('في مجمع البتروكيماويات أنابيب ومواد كيميائية: خوذة ونظارة واقية وقفازات مقاومة للمواد الكيميائية.', 'A petrochemical complex has pipes and chemicals: hard hat, goggles and chemical-proof gloves.'),
    facts: [
      { t: F('من النفط إلى منتجاتنا', 'From oil to everyday things'), b: F('تُستخدم مشتقات النفط والغاز لصنع البلاستيك والأسمدة ومواد كثيرة نستخدمها كل يوم.', 'Oil and gas are turned into plastics, fertilisers and many things we use every day.'),
        q: F('كيس بلاستيكي وسماد زراعي. ما الشيء المشترك بينهما؟', 'A plastic bag and a fertiliser. What do they have in common?'), a: [F('كلاهما من مشتقات النفط والغاز', 'Both come from oil and gas derivatives'), F('كلاهما مصنوع من الحديد', 'Both are made of iron'), F('كلاهما مصنوع من الماء فقط', 'Both are made only from water')] },
      { t: F('أبراج التقطير', 'Distillation towers'), b: F('تفصل أبراج التقطير المواد حسب درجة غليانها: الخفيفة تصعد للأعلى والثقيلة تبقى في الأسفل.', 'Distillation towers separate substances by boiling point: light ones rise to the top, heavy ones stay low.'),
        q: F('لماذا يحتاج المجمّع أكثر من برج تقطير واحد؟', 'Why does the complex need more than one distillation tower?'), a: [F('لأن كل مادة تغلي عند درجة مختلفة، فتُفصل كل واحدة في مرحلتها', 'Because each substance boils at its own temperature, so each is separated in its own stage'), F('لتبريد الهواء فقط', 'Only to cool the air'), F('لتوفير المساحة فقط', 'Only to save space')] },
      { t: F('الشعلة', 'The flare'), b: F('الشعلة العالية تحرق الغازات الزائدة بأمان بدل أن تتسرّب إلى الهواء.', 'The tall flare safely burns off extra gas instead of letting it escape into the air.'),
        q: F('غاز زائد في المجمع يجب التخلص منه. لماذا لا يُترك يتصاعد مباشرة إلى الهواء؟', 'Surplus gas at the complex has to go. Why not let it rise straight into the air?'), a: [F('لأنه يلوّث الهواء، فيُحرق بأمان في الشعلة', 'Because it pollutes the air, so it is burned safely in the flare'), F('لأن الغاز الحار يذيب الأنابيب', 'Hot gas melts the pipes'), F('لأنه يتحوّل إلى ماء في الجو', 'It turns into water in the air')] }
    ]
  },
  desal: {
    ppe: ['helmet', 'ears', 'boots'], why: F('في محطة التحلية مضخّات قوية جداً وصوت عالٍ: خوذة وواقي أذن وحذاء سلامة.', 'A desalination plant has very powerful, loud pumps: hard hat, ear muffs and safety boots.'),
    facts: [
      { t: F('المملكة والتحلية', 'Saudi Arabia & desalination'), b: F('المملكة من أكبر منتجي المياه المحلّاة في العالم، وتصل مياهها إلى مدن بعيدة عن البحر.', 'Saudi Arabia is one of the world’s largest producers of desalinated water, piped to cities far from the sea.'),
        q: F('لماذا تُقام محطات التحلية قرب البحر، بينما تصل مياهها إلى مدن داخلية بعيدة؟', 'Why are desalination plants built by the sea, when their water reaches far inland cities?'), a: [F('لأنها تأخذ مياه البحر مباشرة ثم تنقل المياه العذبة بالأنابيب', 'Because they take seawater directly, then pipe the fresh water inland'), F('لأن البحر أبرد من الصحراء', 'Because the sea is colder than the desert'), F('لأن المدن الداخلية لا تسمح ببناء أنابيب', 'Because inland cities do not allow pipes to be built')] },
      { t: F('التناضح العكسي', 'Reverse osmosis'), b: F('يُدفع ماء البحر بضغط عالٍ جداً عبر أغشية تحجز الملح ولا تمرّر إلا الماء.', 'Seawater is pushed at very high pressure through membranes that hold back the salt and let only water through.'),
        q: F('محطة تحلية تعمل بضغط أقل من المعتاد. ماذا تتوقع؟', 'A desalination plant runs at lower pressure than normal. What do you expect?'), a: [F('يمرّ ملح أكثر عبر الأغشية وتقل كمية الماء الصالح', 'More salt passes through the membranes and less fresh water is made'), F('يصبح الماء أعذب', 'The water tastes sweeter'), F('يصبح الماء أسخن بكثير', 'The water gets much hotter')] },
      { t: F('ماء صالح للشرب', 'Fit to drink'), b: F('بعد التحلية تُضاف بعض المعادن المفيدة إلى الماء ليصبح صالحاً للشرب.', 'After desalination, useful minerals are added back so the water is good to drink.'),
        q: F('لماذا يُضاف معدن مفيد إلى الماء بعد التحلية، مع أن الملح أُزيل منه؟', 'Why add a useful mineral to the water after desalination, even though the salt was removed?'), a: [F('لأن التحلية تُزيل المعادن المفيدة معه، فيُعاد بعضها', 'Because desalination also removes useful minerals, so some are put back'), F('لأن الماء المحلّى يحتاج ملحاً ليُشرب', 'Because desalinated water needs salt to be drinkable'), F('لتلوين الماء', 'To colour the water')] }
    ]
  },
  port: {
    ppe: ['helmet', 'vest', 'boots'], why: F('في الميناء رافعات وشاحنات تتحرك باستمرار: خوذة، وسترة عاكسة ليراك السائقون، وحذاء سلامة.', 'The port is full of cranes and trucks: a hard hat, a hi-vis vest so drivers see you, and safety boots.'),
    facts: [
      { t: F('الحاويات', 'Containers'), b: F('تُنقل البضائع في حاويات بمقاسات موحّدة، فتنتقل بسهولة بين السفن والقطارات والشاحنات.', 'Goods travel in standard-size containers that move easily between ships, trains and trucks.'),
        q: F('لو صُمّمت حاويات بمقاسات مختلفة لكل شركة، ماذا سيحدث للميناء؟', 'If every company used containers of a different size, what would happen at the port?'), a: [F('تتأخر السفن والشاحنات لأن كل حاوية تحتاج معدات خاصة', 'Ships and trucks would slow down, since each container would need its own equipment'), F('يصبح الميناء أهدأ', 'The port would get quieter'), F('تزداد سعة الشحن فجأة', 'Shipping capacity would suddenly rise')] },
      { t: F('الرافعات', 'Cranes'), b: F('رافعات الرصيف العملاقة تفرّغ الحاوية من السفينة في نحو دقيقتين.', 'Giant quay cranes lift a container off a ship in about two minutes.'),
        q: F('رافعة تتوقف في منتصف تفريغ سفينة. ماذا يحدث لجدولها؟', 'A quay crane stops in the middle of unloading a ship. What happens to the schedule?'), a: [F('تتأخر السفينة وتتراكم الحاويات على الرصيف', 'The ship falls behind and containers pile up on the quay'), F('تصل السفينة إلى وجهتها مبكراً', 'The ship reaches its destination early'), F('تصبح الحاويات أخف وزناً', 'The containers become lighter')] },
      { t: F('ميناء الدمام', 'Dammam’s port'), b: F('ميناء الملك عبدالعزيز بالدمام من أكبر الموانئ على الخليج العربي.', 'King Abdulaziz Port in Dammam is one of the largest ports on the Arabian Gulf.'),
        q: F('شركة في الرياض تريد شحن بضائعها إلى الخليج بأسرع طريق. أي ميناء تختار غالباً؟', 'A company in Riyadh wants to ship its goods to the Gulf by the fastest route. Which port does it usually choose?'), a: [F('ميناء الدمام على الخليج العربي', 'Dammam port on the Arabian Gulf'), F('ميناء على البحر الأحمر في جدة', 'A port on the Red Sea in Jeddah'), F('ميناء في أقصى الجنوب', 'A port far in the south')] }
    ]
  }
};
