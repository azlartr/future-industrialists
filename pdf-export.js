/* One canvas per A4 page prevents Safari's HTML pagination from splitting pages.
 * Dependencies: html2canvas 1.4.1 (MIT), jsPDF 2.5.2 (MIT), vendored locally. */
(()=>{'use strict';
let busy=false;
const WIDTH=794,HEIGHT=1123;
async function imageData(url){
 const response=await fetch(url,{mode:'cors'});if(!response.ok)throw new Error('تعذر تحميل صورة أو شعار ('+response.status+').');
 const blob=await response.blob();if(!blob.type.startsWith('image/'))throw new Error('رابط صورة لا يعيد ملف صورة.');
 return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('تعذر قراءة صورة التقرير.'));reader.readAsDataURL(blob)});
}
async function inlineAssets(root,cache){
 const jobs=[];
 const get=url=>{if(url.startsWith('data:'))return Promise.resolve(url);const absolute=new URL(url,location.href).href;if(!cache.has(absolute))cache.set(absolute,imageData(absolute));return cache.get(absolute)};
 for(const img of root.querySelectorAll('img')){img.loading='eager';jobs.push(async()=>{const src=img.getAttribute('src');if(src){img.src=await get(src);await img.decode()}})}
 for(const el of root.querySelectorAll('[style]')){
  const style=el.getAttribute('style');if(!/url\(/.test(style))continue;
  jobs.push(async()=>{const matches=[...style.matchAll(/url\(["']?([^"')]+)["']?\)/g)];let next=style;for(const m of matches)next=next.replace(m[0],'url("'+await get(m[1])+'")');el.setAttribute('style',next)});
 }
 // Bound concurrent requests and retain one source copy for reused partner logos.
 let index=0;await Promise.all(Array.from({length:Math.min(4,jobs.length)},async()=>{while(index<jobs.length)await jobs[index++]()}));
}
function fitImages(root){
 // html2canvas does not implement CSS object-fit. Bake the browser's crop into
 // each bitmap before rendering, including SVG marks that Safari may omit.
 const percentage=(value,axis)=>value==='center'?50:value==='left'||value==='top'?0:value==='right'||value==='bottom'?100:parseFloat(value)||0;
 for(const img of root.querySelectorAll('img')){
  const rect=img.getBoundingClientRect(),style=getComputedStyle(img),w=rect.width,h=rect.height;if(!w||!h||!img.naturalWidth)continue;
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.ceil(w*2));canvas.height=Math.max(1,Math.ceil(h*2));const ctx=canvas.getContext('2d');ctx.scale(2,2);
  let dw=w,dh=h,dx=0,dy=0;
  if(style.objectFit==='contain'||style.objectFit==='cover'){
   const scale=(style.objectFit==='cover'?Math.max:Math.min)(w/img.naturalWidth,h/img.naturalHeight);dw=img.naturalWidth*scale;dh=img.naturalHeight*scale;
   const position=style.objectPosition.split(/\s+/);dx=(w-dw)*percentage(position[0],0)/100;dy=(h-dh)*percentage(position[1]||'50%',1)/100;
  }
  ctx.drawImage(img,dx,dy,dw,dh);img.src=canvas.toDataURL('image/png');img.style.objectFit='fill';img.style.objectPosition='50% 50%';canvas.width=canvas.height=0;
 }
}
async function download({filename,onProgress=()=>{},onReady}){
 if(busy)throw new Error('هناك ملف PDF قيد التجهيز.');busy=true;let stage;
 try{
  const source=[...document.querySelectorAll('.print-pages>.print-page')];if(!source.length)throw new Error('افتح معاينة التقرير أولًا.');
  stage=document.createElement('div');stage.className='pdf-export-stage';stage.dir='rtl';
  document.body.append(stage);
  await document.fonts.ready;const assetCache=new Map();
  // A single page at 2x remains below iOS canvas limits; release it after encoding.
  const pdf=new window.jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});pdf.setProperties({title:filename.replace(/\.pdf$/,''),creator:'صناعيو المستقبل'});
  for(let i=0;i<source.length;i++){
   onProgress(i+1,source.length);const page=source[i].cloneNode(true);page.classList.add('pdf-export-page');stage.replaceChildren(page);await inlineAssets(page,assetCache);fitImages(page);await Promise.all([...page.querySelectorAll('img')].map(img=>img.decode()));await new Promise(resolve=>requestAnimationFrame(resolve));
   const canvas=await window.html2canvas(page,{scale:2,width:WIDTH,height:HEIGHT,windowWidth:1200,windowHeight:1400,scrollX:0,scrollY:0,backgroundColor:'#fff',useCORS:true,logging:false,imageTimeout:30000});
   if(i)pdf.addPage('a4','portrait');pdf.addImage(canvas.toDataURL('image/jpeg',.94),'JPEG',0,0,210,297,undefined,'FAST');canvas.width=canvas.height=0;
  }
  const blob=pdf.output('blob');onReady(blob);return {pages:source.length,bytes:blob.size};
 }finally{stage?.remove();busy=false}
}
window.FI_PDF={download};
})();
