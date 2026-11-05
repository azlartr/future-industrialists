const regions={makkah:'مكة المكرمة',qassim:'القصيم',riyadh:'الرياض',sharqiyah:'الشرقية'};
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function reportFileName(report){
 const part=value=>String(value||'').normalize('NFKC').replace(/[\u0000-\u001f\u007f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g,'').replace(/[<>:"/\\|?*]/g,'-').replace(/\s+/g,' ').trim().replace(/[. ]+$/g,'');
 return [regions[report.region]||report.region,report.title||('الأسبوع '+(report.weekNumber||'')),report.dateRange||report.season].map(part).filter(Boolean).join(' - ').slice(0,180)+'.pdf';
}
export function reportViewerURL(report,url){const target=new URL('pdf-viewer.html',import.meta.url);for(const [key,value] of Object.entries({file:url,region:report.region||'',title:report.title||'',date:report.dateRange||'',season:report.season||''}))target.searchParams.set(key,value);return target.href;}
function safeURL(value){const url=new URL(value,location.href);if(!['https:','http:','blob:'].includes(url.protocol))throw Error('رابط التقرير غير صالح.');return url.href;}
export async function downloadReport(report,url){
 const response=await fetch(safeURL(url));if(!response.ok)throw Error('تعذر تنزيل التقرير. أعد المحاولة.');const blob=await response.blob();
 const signature=new TextDecoder().decode(await blob.slice(0,5).arrayBuffer());if(signature!=='%PDF-')throw Error('رابط التقرير لا يحتوي على ملف PDF صالح.');
 const local=URL.createObjectURL(new Blob([blob],{type:'application/pdf'})),link=document.createElement('a');link.href=local;link.download=reportFileName(report);link.hidden=true;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(local),60000);return link.download;
}
let library;
async function pdfLibrary(){if(!library)library=import('https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.mjs').then(lib=>{lib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.worker.mjs';return lib}).catch(error=>{library=null;throw error});return library;}
export function mountReader(root,report,url,{compact=false}={}){
 let task,pdf,disposed=false,zoom=1,current=1,renderQueue=Promise.resolve(),resizeTimer,observer,pageObserver;
 const pages=new Map(),activeTasks=new Set();
 root.classList.add('pdf-document');root.classList.toggle('pdf-document--compact',compact);
 root.innerHTML='<div class="pdf-reader-bar"><div class="pdf-reader-position"><span class="pdf-reader-mark" aria-hidden="true">▤</span><label><span>الصفحة</span><select class="pdf-page-select" aria-label="الانتقال إلى صفحة" disabled><option>1</option></select></label><span class="pdf-page-count">من …</span></div><div class="pdf-reader-tools"><button type="button" data-reader="zoom-out" aria-label="تصغير التقرير" disabled>−</button><button type="button" data-reader="fit" disabled>ملاءمة العرض</button><button type="button" data-reader="zoom-in" aria-label="تكبير التقرير" disabled>＋</button><button type="button" data-reader="fullscreen" class="pdf-fullscreen-button" disabled>ملء الشاشة</button></div><button type="button" data-reader="download" class="pdf-download-button">تنزيل التقرير <span>PDF ↓</span></button></div><div class="pdf-reader-notice" role="status" aria-live="polite">جارٍ تحميل التقرير…</div><div class="pdf-page-navigation" aria-label="فهرس صفحات التقرير"></div><div class="pdf-reading-surface"><div class="pdf-page-stack"></div></div>';
 const $=selector=>root.querySelector(selector),notice=$('.pdf-reader-notice'),surface=$('.pdf-reading-surface'),stack=$('.pdf-page-stack'),select=$('.pdf-page-select');
 function message(text,error=false){notice.textContent=text;notice.classList.toggle('pdf-reader-notice--error',error);notice.hidden=!text;}
 function position(number){current=number;select.value=String(number);root.querySelectorAll('[data-reader-page]').forEach(button=>button.setAttribute('aria-current',String(+button.dataset.readerPage===number)));}
 function scrollToPage(number){const page=pages.get(number);if(!page)return;position(number);page.section.scrollIntoView({behavior:'smooth',block:'start'});schedule(page);}
 function stickyOffset(){const header=document.querySelector('header.topbar'),offset=!compact&&header&&['sticky','fixed'].includes(getComputedStyle(header).position)?Math.ceil(header.getBoundingClientRect().height):0;root.style.setProperty('--reader-top-offset',offset+'px');}stickyOffset();
 function size(page){const width=Math.max(160,Math.min(1100,surface.clientWidth-(compact?24:48)))*zoom;return {width,height:width/page.ratio};}
 async function renderPage(page){
  if(disposed||!root.isConnected)return;const dimensions=size(page),key=Math.round(dimensions.width);if(page.rendered===key)return;
  const pdfPage=await pdf.getPage(page.number);if(disposed)return;
  const viewport=pdfPage.getViewport({scale:dimensions.width/page.originalWidth}),ratio=Math.min(devicePixelRatio||1,2,Math.sqrt(8000000/(viewport.width*viewport.height))),canvas=page.canvas;
  canvas.width=Math.floor(viewport.width*ratio);canvas.height=Math.floor(viewport.height*ratio);canvas.style.width=viewport.width+'px';canvas.style.height=viewport.height+'px';
  page.section.style.width=viewport.width+'px';page.section.style.minHeight=viewport.height+'px';
  const rendering=pdfPage.render({canvasContext:canvas.getContext('2d'),viewport,transform:ratio!==1?[ratio,0,0,ratio,0,0]:null});activeTasks.add(rendering);
  try{await rendering.promise;page.rendered=key;page.section.classList.add('pdf-page-ready');page.placeholder.hidden=true;}finally{activeTasks.delete(rendering);}
 }
 function schedule(page){if(page.pending)return renderQueue;page.pending=true;renderQueue=renderQueue.then(()=>renderPage(page)).catch(error=>{if(!disposed&&error.name!=='RenderingCancelledException')message('تعذر عرض إحدى الصفحات. يمكنك إعادة المحاولة أو تنزيل التقرير.',true)}).finally(()=>page.pending=false);return renderQueue;}
 function resize(){stickyOffset();if(!pdf||disposed)return;for(const page of pages.values()){const dimensions=size(page);page.section.style.width=dimensions.width+'px';page.section.style.minHeight=dimensions.height+'px';page.rendered=0;if(page.visible||page.number===current)schedule(page);}}
 async function download(button){const original=button.innerHTML;button.disabled=true;button.textContent='جارٍ تنزيل التقرير…';try{await downloadReport(report,url);}catch(error){message(error.message,true);}finally{button.disabled=false;button.innerHTML=original;}}
 const click=event=>{const button=event.target.closest('[data-reader],[data-reader-page]');if(!button||!root.contains(button))return;
  if(button.dataset.readerPage){scrollToPage(+button.dataset.readerPage);return;}
  const action=button.dataset.reader;if(action==='download'){download(button);return;}
  if(action==='fullscreen'){if(document.fullscreenElement===root){document.exitFullscreen();}else if(root.requestFullscreen){root.requestFullscreen().catch(()=>window.open(reportViewerURL(report,url),'_blank','noopener'));}else window.open(reportViewerURL(report,url),'_blank','noopener');return;}
  if(action==='fit')zoom=1;if(action==='zoom-in')zoom=Math.min(2.5,zoom+.25);if(action==='zoom-out')zoom=Math.max(.75,zoom-.25);resize();
 };
 const change=()=>scrollToPage(+select.value);
 root.addEventListener('click',click);select.addEventListener('change',change);
 const resizeObserver=new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(resize,150)});resizeObserver.observe(surface);
 (async()=>{
  try{
   const lib=await pdfLibrary();if(disposed)return;task=lib.getDocument({url:safeURL(url),isEvalSupported:false,cMapUrl:'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/cmaps/',cMapPacked:true,standardFontDataUrl:'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/standard_fonts/',wasmUrl:'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/wasm/'});
   task.onProgress=({loaded,total})=>{if(!disposed)message(total?'جارٍ تحميل التقرير… '+Math.min(100,Math.round(loaded/total*100))+'%':'جارٍ تحميل التقرير…')};pdf=await task.promise;if(disposed)return;
   const first=await pdf.getPage(1),original=first.getViewport({scale:1});
   select.innerHTML=Array.from({length:pdf.numPages},(_,i)=>'<option value="'+(i+1)+'">'+(i+1)+'</option>').join('');$('.pdf-page-count').textContent='من '+pdf.numPages;
   $('.pdf-page-navigation').innerHTML=Array.from({length:pdf.numPages},(_,i)=>'<button type="button" data-reader-page="'+(i+1)+'" aria-current="'+(i===0)+'"><span>'+String(i+1).padStart(2,'0')+'</span>'+(i===0?'الغلاف':'صفحة '+(i+1))+'</button>').join('');
   observer=new IntersectionObserver(entries=>{for(const entry of entries){const page=pages.get(+entry.target.dataset.page);page.visible=entry.isIntersecting;if(entry.isIntersecting)schedule(page);}},{root:compact?surface:null,rootMargin:'650px 0px'});
   pageObserver=new IntersectionObserver(entries=>{const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio);if(visible[0])position(+visible[0].target.dataset.page);},{root:compact?surface:null,threshold:[0,.15,.4,.7]});
   for(let number=1;number<=pdf.numPages;number++){
    const section=document.createElement('section');section.className='pdf-report-page';section.dataset.page=number;section.setAttribute('aria-label',number===1?'غلاف التقرير':'الصفحة '+number+' من '+pdf.numPages);
    section.innerHTML='<div class="pdf-page-placeholder"><span>'+ (number===1?'غلاف التقرير':'الصفحة '+number)+'</span><small>جارٍ تجهيز الصفحة…</small></div><canvas aria-label="الصفحة '+number+' من '+pdf.numPages+'"></canvas><span class="pdf-page-number" aria-hidden="true">'+number+' / '+pdf.numPages+'</span>';
    const page={number,section,canvas:section.querySelector('canvas'),placeholder:section.querySelector('.pdf-page-placeholder'),ratio:original.width/original.height,originalWidth:original.width,rendered:0,visible:false,pending:false};pages.set(number,page);const dimensions=size(page);section.style.width=dimensions.width+'px';section.style.minHeight=dimensions.height+'px';stack.append(section);observer.observe(section);pageObserver.observe(section);
   }
   root.querySelectorAll('button,select').forEach(control=>control.disabled=false);await schedule(pages.get(1));message('');
  }catch(error){if(!disposed){message('تعذر عرض التقرير. يمكنك تنزيل الملف من الزر أعلاه وإعادة فتح الصفحة.',true);console.warn('PDF reader',error);}}
 })();
 return {destroy(){disposed=true;clearTimeout(resizeTimer);observer?.disconnect();pageObserver?.disconnect();resizeObserver.disconnect();root.removeEventListener('click',click);select.removeEventListener('change',change);for(const render of activeTasks)render.cancel();if(task)task.destroy().catch(()=>{});}};
}
