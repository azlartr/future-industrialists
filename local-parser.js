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
  const weekTitle = cleanValue(weekLine || "تقرير أسبوعي") || "تقرير أسبوعي";
  const dateRange = cleanValue(dateLine || "")
    .replace(/^(?:الفترة|الفتره|period)\s*[:：\-]?\s*/i, "");
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
    const inline = numberFrom(lines[index]);
    if (inline) {
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


return parseReport;})();