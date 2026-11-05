(() => {
'use strict';
const ordinals=['','الأول','الثاني','الثالث','الرابع','الخامس','السادس','السابع','الثامن','التاسع','العاشر','الحادي عشر','الثاني عشر','الثالث عشر','الرابع عشر','الخامس عشر','السادس عشر','السابع عشر','الثامن عشر','التاسع عشر','العشرون'];
const months=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const normalize=value=>String(value||'').normalize('NFKC').replace(/[\u064b-\u065f\u0670\u0640\u200e\u200f\u202a-\u202e\u2066-\u2069]/g,'').replace(/[أإآ]/g,'ا').replace(/[٠-٩]/g,c=>'٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[۰-۹]/g,c=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/االسبوع/g,'الاسبوع').replace(/ديسمبز/g,'ديسمبر').replace(/[_\s]+/g,' ').trim();
const title=number=>'الأسبوع '+(ordinals[number]||number);
function week(text){const value=normalize(text),numeric=value.match(/الاسبوع\s*(\d{1,2})(?!\d)/);if(numeric&&+numeric[1]>0)return +numeric[1];for(let i=ordinals.length-1;i>0;i--)if(value.includes('الاسبوع '+normalize(ordinals[i])))return i;return null}
function dates(text){
 const value=normalize(text),found=[];
 const add=(year,month,day)=>{year=Number(year);month=Number(month);day=Number(day);const date=new Date(Date.UTC(year,month-1,day));if(year>=2000&&year<=2100&&date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day)found.push({year,month,day,time:date.getTime()})};
 for(const match of value.matchAll(/\b(20\d{2})\s*[\/.-]\s*(\d{1,2})\s*[\/.-]\s*(\d{1,2})\b/g))add(match[1],match[2],match[3]);
 for(const match of value.matchAll(/\b(\d{1,2})\s*[\/.-]\s*(\d{1,2})\s*[\/.-]\s*(20\d{2})\b/g))add(match[3],match[2],match[1]);
 if(!found.length){
  const year=value.match(/\b20\d{2}\b/),names=months.map(normalize),pattern=names.join('|');
  if(year){
   let pairs=[...value.matchAll(new RegExp('(?<!\\d)([0-3]?\\d)\\s*('+pattern+')','g'))].map(m=>({day:+m[1],month:names.indexOf(m[2])+1}));
   if(pairs.length<2){const reversed=[...value.matchAll(new RegExp('('+pattern+')\\s*([0-3]?\\d)(?!\\d)','g'))].map(m=>({day:+m[2],month:names.indexOf(m[1])+1}));if(reversed.length>pairs.length)pairs=reversed;}
   for(const pair of pairs)add(year[0],pair.month,pair.day);
   const sameMonth=value.match(new RegExp('(?<!\\d)([0-3]?\\d)\\s*('+pattern+')\\s*(?:الى|[-–—])\\s*([0-3]?\\d)(?!\\d)'));
   if(sameMonth){add(year[0],names.indexOf(sameMonth[2])+1,sameMonth[1]);add(year[0],names.indexOf(sameMonth[2])+1,sameMonth[3]);}
   // Covers also use “14 إلى 18 ديسمبر 2025”.
   if(pairs.length===1){const short=value.match(/\b([0-3]?\d)\s*(?:الى|إلى|[-–—])\s*[0-3]?\d\s*/);if(short)add(year[0],pairs[0].month,short[1]);}
  }
 }
 return [...new Map(found.map(date=>[date.time,date])).values()].sort((a,b)=>a.time-b.time);
}
function parse(text,fileName=''){
 const coverWeek=week(text),nameWeek=week(fileName),weekNumber=coverWeek||nameWeek,coverDates=dates(text),nameDates=dates(fileName),range=coverDates.length?coverDates:nameDates,warnings=[];
 // Cross-check the start day against the filename when the month agrees;
 // thin leading digits in a scanned cover can be dropped by OCR.
 const nameDay=normalize(fileName).match(new RegExp('(?<!\\d)([0-3]?\\d)\\s*('+months.map(normalize).join('|')+')'));
 if(range.length>=2&&nameDay&&months.map(normalize).indexOf(nameDay[2])+1===range[0].month&&+nameDay[1]<=range.at(-1).day&&+nameDay[1]>range[0].day){const candidate=+nameDay[1],original=range[0].day;if(String(candidate).endsWith(String(original))){range[0]={...range[0],day:candidate,time:Date.UTC(range[0].year,range[0].month-1,candidate)};}}
 if(coverWeek&&nameWeek&&coverWeek!==nameWeek)warnings.push('تنبيه: الغلاف يذكر '+title(coverWeek)+' واسم الملف يذكر '+title(nameWeek)+'. راجع الملف قبل النشر.');
 if(coverDates.length&&nameDates.length&&!coverDates.some(x=>x.time===nameDates[0].time))warnings.push('تاريخ الغلاف مختلف عن التاريخ في اسم الملف.');
 const first=range[0],last=range.at(-1),format=date=>date.day+' '+months[date.month-1];
 const dateRange=first?(range.length>1?format(first)+(first.year!==last.year?' '+first.year:'')+' إلى '+format(last)+' '+last.year:format(first)+' '+first.year):'';
 return {weekNumber,title:weekNumber?title(weekNumber):'',dateRange,season:first?(first.month>=9?first.year+'-'+(first.year+1):(first.year-1)+'-'+first.year):'',complete:range.length>=2,warnings};
}
let enginePromise,workerPromise,queue=Promise.resolve(),progress=()=>{};
async function engine(){if(!enginePromise)enginePromise=import('https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.mjs').then(lib=>{lib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.worker.mjs';return lib}).catch(error=>{enginePromise=null;throw error});return enginePromise}
async function ocrWorker(){
 if(!workerPromise)workerPromise=(async()=>{
  if(!window.Tesseract)await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';script.onload=resolve;script.onerror=()=>reject(Error('تعذر تحميل قارئ الغلاف.'));document.head.append(script)});
  const worker=await window.Tesseract.createWorker(['ara','eng'],1,{workerPath:'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/worker.min.js',corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0',logger:message=>{if(message.status==='recognizing text')progress('جارٍ قراءة عنوان الأسبوع والتاريخ من الغلاف… '+Math.round(message.progress*100)+'%')}});
  await worker.setParameters({tessedit_pageseg_mode:'6'});return worker;
 })().catch(error=>{workerPromise=null;throw error});return workerPromise;
}
async function extract(file,onProgress){
 let pdf,loadingTask;progress=onProgress;
 try{
  onProgress('جارٍ قراءة بيانات ملف PDF…');const lib=await engine();
  loadingTask=lib.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,cMapUrl:'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/cmaps/',cMapPacked:true,standardFontDataUrl:'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/standard_fonts/',wasmUrl:'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/wasm/'});pdf=await loadingTask.promise;
  const page=await pdf.getPage(1),content=await page.getTextContent();let text=content.items.map(item=>item.str+(item.hasEOL?'\n':' ')).join(''),data=parse(text,file.name);
  if(!data.complete||!week(text)){
   onProgress('الملف مصوّر؛ جارٍ تجهيز قراءة الغلاف تلقائيًا…');const worker=await ocrWorker(),original=page.getViewport({scale:1}),viewport=page.getViewport({scale:2400/Math.max(original.width,original.height)}),canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
   await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
   // Footer first: the supplied reports place the week and dates below the cover image.
   const crop=document.createElement('canvas');crop.width=canvas.width;crop.height=Math.ceil(canvas.height*.16);crop.getContext('2d').drawImage(canvas,0,canvas.height*.84,canvas.width,canvas.height*.16,0,0,crop.width,crop.height);
   text=(await worker.recognize(crop)).data.text;data=parse(text,file.name);
   if(!week(text)||!data.complete){await worker.setParameters({tessedit_pageseg_mode:'11'});text+='\n'+(await worker.recognize(canvas)).data.text;await worker.setParameters({tessedit_pageseg_mode:'6'});data=parse(text,file.name);}
   canvas.width=canvas.height=crop.width=crop.height=0;
  }
  return {...data,source:'file'};
 }finally{progress=()=>{};try{if(loadingTask)await loadingTask.destroy();}catch(error){console.warn('تعذر تحرير قارئ PDF بعد القراءة.',error)}}
}
const api={parse,read(file,onProgress=()=>{}){const task=queue.catch(()=>{}).then(()=>extract(file,onProgress));queue=task.catch(()=>{});return task}};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.FI_PDF_METADATA=api;
})();
