window.FI_PARSE=(function(){
function arabicDigits(value) {
  return String(value ?? "")
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}

function normalize(value) {
  return arabicDigits(value)
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ـ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
}

function numberFrom(value) {
  const match = arabicDigits(value).match(/\d{1,5}/);
  return match ? Math.max(0, Number(match[0])) : 0;
}

function cleanValue(value) {
  return String(value ?? "")
    .replace(/^[\s:：\-–—|]+|[\s:：\-–—|]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Canonical names keep factory logos and image matching stable even when the
// report uses a spelling variant (for example "كوكاكولا" vs "كوكا كولا").
const FACTORY_ALIAS_GROUPS = [
  { canonical: "كوكا كولا", aliases: ["كوكا كولا", "كوكاكولا", "coca cola", "coca-cola"] },
  { canonical: "محمد سعد الدين", aliases: ["محمد سعد الدين", "محمد علي سعد الدين", "سعد الدين", "سعدالدين"] },
  { canonical: "سدافكو", aliases: ["سدافكو", "سدافو", "sadافكو", "sadafco"] },
  { canonical: "يونيتشارم", aliases: ["يونيتشارم", "يوني تشارم", "unicharm"] },
  { canonical: "مواد الإعمار", aliases: ["مواد الإعمار", "مواد الاعمار", "مواداعمار"] },
  { canonical: "فش فاش", aliases: ["فش فاش", "فشفاش", "fash fash"] },
  { canonical: "دار الأنظمة", aliases: ["دار الأنظمة", "دار الانظمة", "دارالأنظمة", "دارالانظمة"] },
  { canonical: "ديمة", aliases: ["ديمة", "ديما", "deemah"] },
  { canonical: "مورق", aliases: ["مورق", "مورّق", "moraq"] },
  { canonical: "صناعة البلاستيك", aliases: ["صناعة البلاستيك", "صناعه البلاستيك", "صناعةالبلاستيك"] },
  { canonical: "مركز القدرات", aliases: ["مركز القدرات", "مركزالقدرات"] },
  { canonical: "الدواء - بروسيد", aliases: ["الدواء", "الدواء بروسيد", "الدواء - بروسيد", "بروسيد", "proceed", "proseed"] },
  { canonical: "يورك", aliases: ["يورك", "york"] },
  { canonical: "مبكو", aliases: ["مبكو", "mepco"] },
  { canonical: "تمر", aliases: ["تمر", "tamer"] },
];

function compactName(value) {
  return normalize(value).replace(/^(?:(?:مصنع|مصانع|شركه|شركات)\s+)+/, "").replace(/\s+/g, "");
}

function canonicalFactoryName(value) {
  const cleaned = cleanValue(value);
  const normalized = compactName(cleaned);
  const group = FACTORY_ALIAS_GROUPS.find((item) => item.aliases.some((alias) => compactName(alias) === normalized));
  return group?.canonical || cleaned;
}

function factoryAliasForms(value) {
  const canonical = canonicalFactoryName(value);
  const group = FACTORY_ALIAS_GROUPS.find((item) => item.canonical === canonical);
  return [...new Set([value, canonical, ...(group?.aliases || [])].map(cleanValue).filter(Boolean))];
}

function reportLines(text) {
  return String(text ?? "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .map((line) => line.replace(/^\|\s*/, "").replace(/\s*\|$/, "").trim())
    .filter((line) => line && !/^[-:|\s]+$/.test(line));
}

const schoolPattern = /(?:اسم\s*)?(?:المدرسة|مدرسه|school)\s*[:：\-–—|]?\s*(.+)$/i;
const factoryPattern = /(?:اسم\s*)?(?:المصنع|الشركة|الشركه|factory|company)\s*[:：\-–—|]?\s*(.+)$/i;
const datePattern = /(\d{4}\s*[\/-]\s*\d{1,2}\s*[\/-]\s*\d{1,2}|\d{1,2}\s*[\/-]\s*\d{1,2}\s*[\/-]\s*\d{4})/;
const schoolWords = /^(?:مدرسة|مدرسه|مدارس|الثانوية|ثانوية|الثانويه|ابتدائية|الابتدائية|ابتدائيه|متوسطة|المتوسطة|متوسطه|معهد|كلية|الكليه|school)/i;
const factoryWords = /(?:مصنع|شركة|الشركه|factory|company)/i;

function schoolFromLine(line) {
  if(/اسم\s*المدرسة/.test(line)&&/عدد\s*المشاركين|التاريخ|ملاحظات/.test(line))return '';
  const value = line.match(schoolPattern)?.[1];
  if (value) return cleanValue(value.split(/\s+[-–—|]\s+|\|/)[0]);
  if (schoolWords.test(line)) return cleanValue(line.replace(/^زيارة\s*\d*\s*[:.)-]?\s*/i, ""));
  return "";
}

function factoryFromLine(line) {
  const value = line.match(factoryPattern)?.[1];
  if (value) return cleanValue(value.split(/\s+[-–—|]\s+|\|/)[0]);
  if (factoryWords.test(line)) {
    const match = line.match(/(?:مصنع|شركة|الشركه|factory|company)\s*[:：\-–—|]?\s*([^|\t]+?)(?=\s+(?:التاريخ|date|المشار|عدد|participants?)\b|\s*$)/i);
    return cleanValue(match?.[1] || line);
  }
  return "";
}

function dateFromText(text) {
  const match = arabicDigits(text).match(datePattern);
  return match ? match[1].replace(/\s+/g, "") : "";
}

function participantsFromText(text) {
  const normalized = arabicDigits(text);
  const labelled = normalized.match(/(?:عدد\s*)?(?:المشاركين|المشاركون|المشاركات|مشارك(?:ين|ون|ة)?|participants?)\s*[:：\-–—|]?\s*(\d{1,5})/i);
  if (labelled) return Number(labelled[1]);
  const trailing = normalized.match(/(\d{1,5})\s*(?:مشارك|مشاركه|مشاركة|طالب|طالبة|طلاب|طالبات)\b/i);
  return trailing ? Number(trailing[1]) : 0;
}

function standaloneNumber(value) {
  const line = arabicDigits(cleanValue(value));
  return /^\d{1,5}$/.test(line) ? Number(line) : 0;
}

function inferGender(schoolName) {
  const value = normalize(schoolName);
  if (/بنات|طالبات/.test(value)) return "girls";
  if (/بنين|طلاب/.test(value)) return "boys";
  return "unspecified";
}

function splitBlocks(text) {
  const rawLines = String(text ?? "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (!rawLines.length) return [];
  const blocks = [];
  let current = [];
  for (const line of rawLines) {
    const startsSchool = Boolean(schoolFromLine(line));
    if (startsSchool && current.some((item) => schoolFromLine(item))) {
      blocks.push(current);
      current = [];
    }
    if (/^(?:زيارة|visit)\s*\d*/i.test(line) && current.length && current.some((item) => schoolFromLine(item))) {
      blocks.push(current);
      current = [];
    }
    current.push(line);
  }
  if (current.length) blocks.push(current);
  return blocks.length > 1 ? blocks : String(text ?? "").split(/\n\s*\n+/).map((block) => block.split("\n").map((line) => line.trim()).filter(Boolean)).filter(Boolean);
}

function parseHeader(lines, regionName) {
  const firstVisit = lines.findIndex((line) => Boolean(schoolFromLine(line)));
  const headerLines = (firstVisit < 0 ? lines : lines.slice(0, firstVisit)).filter(Boolean);
  const weekLine = headerLines.find((line) => /(?:الأسبوع|الاسبوع|week)/i.test(line));
  const dateLine = headerLines.find((line) => /(?:الفترة|الفتره|من\s+.+(?:إلى|الى|حتى)|period)/i.test(line)) || headerLines.find((line) => dateFromText(line));
  const weekTitle = cleanValue((weekLine || "تقرير أسبوعي").split(/(?:الفترة|الفتره|period)/i)[0]) || "تقرير أسبوعي";
  const dateRange = cleanValue(dateLine || "")
    .replace(/^.*?(?:الفترة|الفتره|period)\s*[:：\-]?\s*/i, "");
  return { weekTitle, dateRange, region: regionName };
}

function parseOneBlock(block, index) {
  const joined = block.join(" | ");
  let school = "";
  let factory = "";
  let date = dateFromText(joined);
  let participants = participantsFromText(joined);
  for (const line of block) {
    school ||= schoolFromLine(line);
    factory ||= factoryFromLine(line);
    date ||= dateFromText(line);
    participants ||= participantsFromText(line);
  }
  if ((!school || !factory) && block.length === 1) {
    const pieces = block[0].split(/\s*\|\s*|\t+|\s+[-–—]\s+/).map(cleanValue).filter(Boolean);
    for (const piece of pieces) {
      school ||= schoolFromLine(piece);
      factory ||= factoryFromLine(piece);
      if (!school && schoolWords.test(piece)) school = cleanValue(piece);
      if (!factory && factoryWords.test(piece)) factory = cleanValue(piece);
      participants ||= participantsFromText(piece);
      date ||= dateFromText(piece);
    }
  }
  if (!school) return null;
  const rawFactory = cleanValue(factory || "مصنع غير محدد");
  const normalizedFactory = canonicalFactoryName(rawFactory);
  return {
    id: `auto-visit-${index + 1}`,
    schoolName: cleanValue(school),
    factory: normalizedFactory,
    ...(normalize(rawFactory) !== normalize(normalizedFactory) ? { factoryOriginal: rawFactory } : {}),
    date: cleanValue(date),
    participants: Math.max(0, Math.floor(Number(participants) || 0)),
    gender: inferGender(school),
    images: [],
  };
}

function parseTableVisits(text, regionName) {
  const lines=String(text||'').replace(/\r/g,'').split('\n');
  const headerIndex=lines.findIndex(line=>/اسم\s*المدرسة/.test(line)&&/المشاركين|المشاركون/.test(line)&&/التاريخ/.test(line));
  if(headerIndex<0)return null;
  const rows=[];let current=null;
  for(const line of lines.slice(headerIndex+1)){
    const value=arabicDigits(line).trim();
    if(/^(?:هاكثون|هاكاثون|جائزة|اجمالي|إجمالي|فئة\s|عدد\s)/.test(value))break;
    if(/^\d{1,3}\s+[^\d\s]/.test(value)){
      current={number:Number(value.match(/^\d+/)[0]),lines:[value]};rows.push(current);
    }else if(current&&value&&!/^0+$/.test(value))current.lines.push(value);
  }
  if(!rows.length)return null;
  const visits=[],warnings=[];
  for(const row of rows){
    const value=row.lines.join('\t').replace(/^\d+\s+/,'');
    const dateMatch=datePattern.exec(value);
    if(!dateMatch){warnings.push('الصف '+row.number+' يحتاج تاريخًا واضحًا.');continue;}
    const prefix=value.slice(0,dateMatch.index),countMatch=prefix.match(/(?:\s|\|)+(\d{1,5})\s*$/);
    if(!countMatch){warnings.push('الصف '+row.number+' يحتاج عدد المشاركين.');continue;}
    const schoolName=cleanValue(prefix.slice(0,countMatch.index).replace(/^\|\s*|\s*\|$/g,''));
    const tail=value.slice(dateMatch.index+dateMatch[0].length).replace(/^[\s|]+/,'');
    const factoryOriginal=cleanValue(tail.split(/\t+|\|+/)[0]||'');
    if(!schoolName||!factoryOriginal){warnings.push('الصف '+row.number+' يحتاج اسم المدرسة والمصنع.');continue;}
    const factory=canonicalFactoryName(factoryOriginal);
    visits.push({id:'auto-visit-'+row.number,schoolName,participants:Number(countMatch[1]),date:dateMatch[0].replace(/\s/g,''),factory,...(factory!==factoryOriginal?{factoryOriginal}:{}),gender:inferGender(schoolName),images:[]});
  }
  if(warnings.length)throw Error('لم يتم تطبيق الجدول لأن بعض الصفوف ناقصة: '+warnings.join(' '));
  if(!visits.length)throw Error('لم أتمكن من قراءة صفوف الجدول. تأكد من وجود اسم المدرسة، عدد المشاركين، التاريخ والمصنع.');
  return {header:parseHeader(reportLines(lines.slice(0,headerIndex).join('\n')),regionName),stats:parseStats(text),visits,warnings};
}

function parseStructuredVisits(text, regionName) {
  const lines = reportLines(text);
  const sectionIndex = lines.findIndex((line) => /الزيارات\s*الطلابي|زيارات\s*الطلاب|student\s*visits/i.test(line));
  const start = sectionIndex >= 0 ? sectionIndex + 1 : 0;
  const schools = [];
  for (let index = start; index < lines.length; index += 1) {
    if (schoolFromLine(lines[index])) schools.push(index);
  }
  if (!schools.length) return null;
  const visits = [];
  for (let position = 0; position < schools.length; position += 1) {
    const schoolIndex = schools[position];
    const nextSchoolIndex = schools[position + 1] ?? lines.length;
    const sectionEnd = lines.slice(schoolIndex, nextSchoolIndex).findIndex((line, index) => index > 0 && /^جائزة\s+صناعيو|^إجمالي\s+عدد\s+المستفيدين/i.test(line));
    const blockEnd = sectionEnd >= 0 ? schoolIndex + sectionEnd : nextSchoolIndex;
    const block = lines.slice(schoolIndex, blockEnd);
    const schoolName = cleanValue(schoolFromLine(lines[schoolIndex]));
    const dateIndex = block.findIndex((line, index) => index > 0 && dateFromText(line));
    const date = dateIndex >= 0 ? dateFromText(block[dateIndex]) : "";
    const participants = block.slice(1, dateIndex >= 0 ? dateIndex : block.length).map(standaloneNumber).find(Boolean) || 0;
    let factory = "";
    if (dateIndex >= 0) {
      factory = block.slice(dateIndex + 1).find((line) => {
        if (!line || standaloneNumber(line) || dateFromText(line)) return false;
        if (/^(?:ملاحظات|جائزة|إجمالي|اجمالي|عدد\s+(?:التغريدات|المنشورات|مقاطع)|فئة\s+)/i.test(line)) return false;
        return !schoolFromLine(line);
      }) || "";
    }
    if (!schoolName || (!date && !participants && !factory)) continue;
    const rawFactory = cleanValue(factory || "مصنع غير محدد");
    const normalizedFactory = canonicalFactoryName(rawFactory);
    visits.push({
      id: `auto-visit-${visits.length + 1}`,
      schoolName,
      factory: normalizedFactory,
      ...(normalize(rawFactory) !== normalize(normalizedFactory) ? { factoryOriginal: rawFactory } : {}),
      date: cleanValue(date),
      participants: Math.max(0, Math.floor(Number(participants) || 0)),
      gender: inferGender(schoolName),
      images: [],
    });
  }
  if (!visits.length) return null;
  return { header: parseHeader(lines, regionName), stats: parseStats(text), visits };
}

function parseStats(text) {
  const stats = {
    ambassadorCategory: 0,
    tvInterviews: 0,
    tweets: 0,
    videos: 0,
    posts: 0,
    discovererCategory: 0,
    creativeCategory: 0,
    totalBeneficiaries: 0,
    totalRegistered: 0,
    artistCategory: 0,
  };
  const labels = {
    ambassadorCategory: /(?:فئة\s*)?السفير/i,
    tvInterviews: /(?:لقاءات?|مقابلات?).*(?:تلفزيون|تلفزيوني)/i,
    tweets: /(?:التغريدات?|تغريدة)/i,
    videos: /(?:الفيديو|مقاطع\s*الفيديو|فيديوهات?)/i,
    posts: /(?:المنشورات?|منشور)/i,
    discovererCategory: /(?:فئة\s*)?(?:المكتشف|مكتشف)/i,
    creativeCategory: /(?:فئة\s*)?(?:المبدع|مبدع)/i,
    totalBeneficiaries: /(?:إجمالي|اجمالي|عدد)\s*(?:المستفيدين|المستفيد)/i,
    totalRegistered: /(?:إجمالي|اجمالي|عدد)\s*(?:المسجلين|المسجل)/i,
    artistCategory: /(?:فئة\s*)?(?:الفنان|فنان)/i,
  };
  const lines = reportLines(text);
  for (const [key, pattern] of Object.entries(labels)) {
    const index = lines.findIndex((item) => pattern.test(item));
    if (index < 0) continue;
    const matchedLabel=pattern.exec(lines[index]);
    const inlineMatch=arabicDigits(lines[index].slice(matchedLabel.index+matchedLabel[0].length)).match(/\d{1,5}/);
    const inline=inlineMatch?Number(inlineMatch[0]):0;
    if (inlineMatch) {
      stats[key] = inline;
      continue;
    }
    for (const candidate of lines.slice(index + 1, index + 4)) {
      const value = standaloneNumber(candidate);
      if (value) {
        stats[key] = value;
        break;
      }
      if (/^(?:فئة|عدد|إجمالي|اجمالي)/i.test(candidate)) break;
    }
  }
  return stats;
}

function parseJsonReport(text, regionName) {
  const trimmed = String(text ?? "").trim();
  if (!/^[\[{]/.test(trimmed)) return null;
  try {
    const input = JSON.parse(trimmed);
    const source = Array.isArray(input) ? { visits: input } : input;
    if (!Array.isArray(source?.visits)) return null;
    const visits = source.visits.map((item, index) => parseOneBlock([
      `المدرسة: ${item.schoolName || item.school || ""}`,
      `المصنع: ${item.factory || item.factoryName || ""}`,
      `التاريخ: ${item.date || ""}`,
      `المشاركون: ${item.participants || 0}`,
    ], index)).filter(Boolean);
    return {
      header: { weekTitle: cleanValue(source.weekTitle || source.week || "تقرير أسبوعي"), dateRange: cleanValue(source.dateRange || source.period || ""), region: regionName },
      stats: { ...parseStats(trimmed), ...(source.stats && typeof source.stats === "object" ? source.stats : {}) },
      visits,
    };
  } catch (error) {
    return null;
  }
}

function parseReport(text, regionName) {
  const jsonReport = parseJsonReport(text, regionName);
  if (jsonReport) return jsonReport;
  const tableReport = parseTableVisits(text, regionName);
  if(tableReport)return tableReport;
  const structuredReport = parseStructuredVisits(text, regionName);
  if (structuredReport) return structuredReport;
  const lines = reportLines(text);
  const header = parseHeader(lines, regionName);
  const visits = [];
  const seen = new Set();
  for (const [index, block] of splitBlocks(text).entries()) {
    const visit = parseOneBlock(block, index);
    if (!visit) continue;
    const key = `${normalize(visit.schoolName)}|${normalize(visit.factory)}|${visit.date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    visits.push(visit);
  }
  return { header, stats: parseStats(text), visits };
}


function tokens(value) {
  const normalized = normalize(value);
  const parts = normalized.split(/\s+/).filter((token) => token.length > 1 && !/^(?:jpg|jpeg|png|webp|gif|avif|image|img|photo|photos|picture|pictures|صوره|صورة|صور|زيارة|زياره|visit|copy|نسخه)$/i.test(token));
  const compact = normalized.replace(/\s+/g, "");
  return [...new Set([...parts, ...(compact.length > 2 ? [compact] : [])])];
}

function normalizationWarnings(visits) {
  const groups = new Map();
  for (const visit of visits || []) {
    const raw = cleanValue(visit.factoryOriginal || visit.factory);
    const canonical = canonicalFactoryName(raw);
    if (!raw || !canonical) continue;
    const values = groups.get(canonical) || new Set();
    values.add(raw);
    groups.set(canonical, values);
  }
  const notes = [];
  for (const [canonical, values] of groups) {
    const variants = [...values];
    if (variants.length > 1 || variants.some((value) => normalize(value) !== normalize(canonical))) {
      notes.push(`معلومة: تم توحيد أسماء المصنع (${variants.join("، ")}) ← ${canonical}`);
    }
  }
  const rawNames = [...new Set((visits || []).map((visit) => cleanValue(visit.factoryOriginal || visit.factory)).filter(Boolean))];
  const compact = (value) => normalize(value).replace(/\s+/g, "");
  for (let index = 0; index < rawNames.length; index += 1) {
    for (let next = index + 1; next < rawNames.length; next += 1) {
      const left = compact(rawNames[index]);
      const right = compact(rawNames[next]);
      if (left.length < 4 || right.length < 4 || canonicalFactoryName(rawNames[index]) === canonicalFactoryName(rawNames[next])) continue;
      if (left.includes(right) || right.includes(left)) {
        notes.push(`راجع احتمال اختلاف اسم المصنع: "${rawNames[index]}" و"${rawNames[next]}"`);
      }
    }
  }
  return notes;
}

function matchDriveImages(visits, files) {
  let matchedImages = 0;
  const stop = new Set(["مدرسه", "مدارس", "الثانويه", "ثانويه", "بنين", "بنات", "طلاب", "طالبات", "صوره", "صورة", "صور", "زياره", "زيارة", "مصنع", "مصانع", "image", "img", "photo", "photos", "picture", "copy", "نسخه"]);
  const distinctive = value => normalize(value).split(" ").filter(word => word.length > 1 && !stop.has(word) && !/^\d+$/.test(word));
  // Drive filenames are not always copied from the report exactly. In
  // particular, the folder may say "مدرسة" while the report says "مدارس",
  // or the filename may contain an extra suffix such as (1). Compare the
  // meaningful school words and a compact form as well as the exact tokens.
  const compactDistinctive = value => distinctive(value).join("");
  const editDistance = (left, right) => {
    const a = String(left || ""), b = String(right || "");
    if (a === b) return 0;
    if (Math.abs(a.length - b.length) > 2) return 3;
    let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let row = 1; row <= a.length; row += 1) {
      const current = [row];
      let rowBest = row;
      for (let column = 1; column <= b.length; column += 1) {
        current[column] = Math.min(current[column - 1] + 1, previous[column] + 1, previous[column - 1] + (a[row - 1] === b[column - 1] ? 0 : 1));
        rowBest = Math.min(rowBest, current[column]);
      }
      if (rowBest > 2) return 3;
      previous = current;
    }
    return previous[b.length];
  };
  const nearWord = (word, candidate) => {
    const min = Math.min(word.length, candidate.length);
    if (min < 5) return false;
    const limit = min >= 7 ? 2 : 1;
    if (editDistance(word, candidate) <= limit) return true;
    // Common Arabic typing slips swap two neighboring letters, such as
    // "العلمية" and "العملية". Treat that as one near-match only when the
    // rest of the school name also matches.
    if (word.length === candidate.length) {
      for (let index = 0; index < word.length - 1; index += 1) {
        if (word[index] === candidate[index + 1] && word[index + 1] === candidate[index]) {
          const swapped = word.slice(0, index) + word[index + 1] + word[index] + word.slice(index + 2);
          if (swapped === candidate) return true;
        }
      }
    }
    return false;
  };
  const schoolMatchScore = (schoolName, filename, filenameWords) => {
    const schoolWords = distinctive(schoolName);
    if (!schoolWords.length) return 0;
    const exact = schoolWords.filter(word => filenameWords.has(word)).length;
    const fileWords = [...filenameWords];
    const fuzzy = schoolWords.filter(word => !filenameWords.has(word) && fileWords.some(candidate => nearWord(word, candidate))).length;
    const compactSchool = schoolWords.join("");
    const compactFile = compactDistinctive(filename);
    if (schoolWords.length === 1 && exact === 1) return 155;
    if (exact === schoolWords.length) return 170 + schoolWords.length * 5;
    if (schoolWords.length > 1 && exact >= 1 && exact + fuzzy === schoolWords.length) return 138 + exact * 6;
    if (compactSchool.length >= 5 && (compactFile.includes(compactSchool) || compactSchool.includes(compactFile))) return 145;
    if (exact >= 2 && exact / schoolWords.length >= 0.67) return 105 + exact * 5;
    return 0;
  };
  const factoryMatchScore = (factoryName, filenameWords) => {
    let best = 0;
    for (const alias of factoryAliasForms(factoryName)) {
      const significant = distinctive(alias);
      if (!significant.length) continue;
      const exact = significant.filter(word => filenameWords.has(word)).length;
      if (exact === significant.length) best = Math.max(best, 32 + significant.length * 3);
      else if (exact >= 2 && exact / significant.length >= 0.67) best = Math.max(best, 18 + exact * 2);
    }
    return best;
  };
  const normalizedDate = value => {
    const date = dateFromText(value), parts = date.split(/[/-]/);
    if (parts.length !== 3) return "";
    const [year, month, day] = parts[0].length === 4 ? parts : parts.slice().reverse();
    return [Number(year), Number(month), Number(day)].join("-");
  };
  const unique = [...new Map(files.map(file => [file.id, file])).values()];
  const generic = [];
  const pending = [];
  for (const file of unique.sort((a,b) => a.name.localeCompare(b.name, "ar", { numeric: true }))) {
    const filename = normalize(file.name.replace(/\.[^.]+$/, "")), words = new Set(distinctive(filename));
    const gender = inferGender(filename), fileDate = normalizedDate(file.name);
    const ranked = visits.map((visit, index) => {
      const schoolWords = distinctive(visit.schoolName), visitDate = normalizedDate(visit.date);
      if (gender !== "unspecified" && visit.gender !== "unspecified" && gender !== visit.gender) return { index, score: 0 };
      if (fileDate && visitDate && fileDate !== visitDate) return { index, score: 0 };
      const schoolScore = schoolMatchScore(visit.schoolName, filename, words);
      const factoryScore = factoryMatchScore(visit.factory, words);
      // Common words such as "مدارس" or "بنين" alone are never a match.
      return { index, schoolScore, score: schoolScore + factoryScore + ((schoolScore || factoryScore) && fileDate ? 10 : 0) };
    }).filter(candidate => candidate.score > 0).sort((a,b) => b.score - a.score);
    if (!ranked.length) {
      // Camera defaults such as IMG_0001.jpg carry no useful name. Keep them
      // for the deterministic fallback below instead of silently discarding them.
      if (!words.size) generic.push({ file, fileDate });
      continue;
    }
    // If two visits have the same weak factory-only score, do not guess. An
    // exact/near-exact school match is safe even when another visit shares the
    // same factory name, which is common in weekly reports.
    if (ranked[1]?.score === ranked[0].score && ranked[0].schoolScore === 0) {
      pending.push({ file, fileDate });
      continue;
    }
    const visit = visits[ranked[0].index];
    if (visit.images.length >= 4) {
      pending.push({ file, fileDate });
      continue;
    }
    visit.images.push(file.url);
    matchedImages++;
  }
  let genericMatched = 0;
  for (const item of [...generic, ...pending]) {
    const candidates = visits.map((visit, index) => ({ visit, index })).filter(({ visit }) => visit.images.length < 4 && (!item.fileDate || !normalizedDate(visit.date) || normalizedDate(visit.date) === item.fileDate));
    const fileText = normalize(item.file.name.replace(/\.[^.]+$/, ""));
    const fileWords = new Set(distinctive(fileText));
    const ranked = candidates.map(({ visit, index }) => ({ visit, index, score: schoolMatchScore(visit.schoolName, fileText, fileWords) + factoryMatchScore(visit.factory, fileWords) })).sort((a,b) => b.score - a.score);
    const target = ranked[0]?.score > 0 && (ranked.length === 1 || ranked[1].score < ranked[0].score) ? ranked[0].visit : candidates[0]?.visit;
    if (!target) continue;
    target.images.push(item.file.url);
    matchedImages++;
    if (!fileWords.size) genericMatched++;
  }
  const unmatchedSchools = visits.filter(visit => !visit.images.length).map(visit => visit.schoolName).filter(Boolean);
  const warnings = [];
  if (genericMatched) warnings.push(`تم توزيع ${genericMatched} صورة باسم عام (مثل IMG_0001) حسب ترتيب الزيارات؛ سمِّ المجلد أو الصورة باسم المدرسة لرفع دقة المطابقة.`);
  if (unmatchedSchools.length) warnings.push(`لم تُطابق صور للزيارة: ${unmatchedSchools.slice(0, 6).join("، ")}. تأكد أن اسم المدرسة أو مجلدها ظاهر في اسم الملف.`);
  return {
    matchedImages,
    unmatchedImages: Math.max(0, unique.length - matchedImages),
    warnings,
  };
}



window.FI_MATCH=matchDriveImages;
return parseReport;})();