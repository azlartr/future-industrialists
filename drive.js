(() => {
'use strict';
const KEY='fi-drive-session';
const key=()=>sessionStorage.getItem(KEY)||'';
async function request(url,resource){
 const headers=resource?{'X-Goog-Drive-Resource-Keys':resource}:{};
 const response=await fetch(url,{headers});
 if(!response.ok){
  const body=await response.json().catch(()=>({})),error=body.error||{};
  const reasons=[...(error.errors||[]).map(item=>item.reason),...(error.details||[]).map(item=>item.reason)].filter(Boolean).join(' ');
  const activeKey=key();let detail=String(error.message||'');if(activeKey)detail=detail.split(activeKey).join('[محجوب]');detail=detail.replace(/AIza[A-Za-z0-9_-]+/g,'[محجوب]').replace(/https?:[/][/][^ ]+/g,'[رابط]').slice(0,350);
  const context=reasons+' '+detail;
  if(/API_KEY_INVALID|keyInvalid|API key not valid|invalid api key/i.test(context))throw Error('مفتاح Google Drive غير صالح. انسخ API key من صفحة Credentials؛ معرّف OAuth Client ID ليس مفتاح API.');
  if(/API_KEY_HTTP_REFERRER_BLOCKED|referer|referrer/i.test(context))throw Error('المفتاح لا يسمح بعنوان الموقع. أضف https://azlartr.github.io/* إلى Websites في إعدادات المفتاح.');
  if(/SERVICE_DISABLED|accessNotConfigured|has not been used|disabled/i.test(context))throw Error('Google Drive API غير مفعّل في مشروع المفتاح. فعّله من Google Cloud ثم أعد المحاولة.');
  if(/API_KEY_SERVICE_BLOCKED/i.test(context))throw Error('قيود المفتاح تمنع Google Drive API. أضف الخدمة إلى APIs المسموحة.');
  const message=response.status===403?'تعذر الوصول إلى Drive. راجع صلاحيات المجلد وقيود المفتاح.':response.status===404?'مجلد Drive غير موجود أو غير مشترك للعامة.':'تعذر قراءة Drive ('+response.status+').';
  throw Error(message+(detail?' سبب Google: '+detail:''));
 }
 return response;
}
function api(path){const url=new URL('https://www.googleapis.com/drive/v3/'+path);url.searchParams.set('key',key());return url;}
async function list(link){
 if(!key())throw Error('أدخل مفتاح Google Drive من تبويب «عام» أولًا.');
 let source;try{source=new URL(link)}catch{throw Error('أدخل رابط مجلد Google Drive الصحيح.');}
 if(source.hostname!=='drive.google.com')throw Error('أدخل رابط مجلد من drive.google.com.');
 const id=source.pathname.match(/\/folders\/([\w-]+)/)?.[1];
 if(!id)throw Error('الرابط يجب أن يكون لمجلد Google Drive.');
 const folders=[{id,path:'',depth:0,resourceKey:source.searchParams.get('resourcekey')||''}],seen=new Set(),images=[];
 for(let index=0;index<folders.length;index++){
  const folder=folders[index];if(seen.has(folder.id))continue;seen.add(folder.id);
  if(seen.size>250)throw Error('المجلد كبير جدًا. اختر مجلد الأسبوع فقط.');
  let page='';do{
   const url=api('files');url.searchParams.set('q',"'"+folder.id+"' in parents and trashed = false");url.searchParams.set('fields','nextPageToken,files(id,name,mimeType,resourceKey)');url.searchParams.set('pageSize','1000');if(page)url.searchParams.set('pageToken',page);
   const result=await (await request(url,folder.resourceKey?folder.id+'/'+folder.resourceKey:'')).json();
   for(const file of result.files||[]){
    const name=folder.path+file.name;
    if(file.mimeType==='application/vnd.google-apps.folder'){
     if(folder.depth>=8)throw Error('المجلد يحتوي مستويات كثيرة. اختر مجلدًا أقرب للصور.');
     folders.push({id:file.id,path:name+' / ',depth:folder.depth+1,resourceKey:file.resourceKey||''});
    }else if(['image/jpeg','image/png','image/webp','image/avif'].includes(file.mimeType))images.push({...file,name,url:'https://drive.google.com/file/d/'+file.id+'/view'});
    if(images.length>5000)throw Error('صور كثيرة جدًا. اختر مجلد الأسبوع فقط.');
   }
   page=result.nextPageToken||'';
  }while(page);
 }
 if(!images.length)throw Error('لم تظهر صور في المجلد. تأكد من مشاركة المجلد والصور مع أي شخص لديه الرابط.');
 return images;
}
async function rematch(data){
 if(!window.FI_GITHUB.connected())throw Error('اربط GitHub أولًا لحفظ صور Drive في المستودع.');
 const files=await list(data.driveUrl),original=data.visits||[],visits=original.map(v=>({...v,images:[]}));
 const matched=window.FI_MATCH(visits,files);
 if(!matched.matchedImages)throw Error('لم تطابق أسماء الصور أسماء الزيارات. الصور الحالية لم تتغير.');
 const selected=new Set(visits.flatMap(v=>v.images)),urls=new Map();
 for(const file of files.filter(f=>selected.has(f.url))){
  const url=api('files/'+file.id);url.searchParams.set('alt','media');
  const blob=await (await request(url,file.resourceKey?file.id+'/'+file.resourceKey:'')).blob();
  const response=await fetch('/api/assets',{method:'POST',body:blob});const saved=await response.json();
  if(!response.ok||!saved.url)throw Error(saved.error||'تعذر حفظ صورة Drive على GitHub. الصور الحالية لم تتغير.');
  urls.set(file.url,saved.url);
 }
 visits.forEach((visit,index)=>{visit.images=visit.images.length?visit.images.map(url=>urls.get(url)):[...(original[index].images||[])];visit.imagePositions={...(original[index].imagePositions||{})};});
 return {...matched,visits,source:'rules'};
}
window.FI_DRIVE={connected:()=>!!key(),setKey(value){if(value.trim())sessionStorage.setItem(KEY,value.trim());else sessionStorage.removeItem(KEY);},list,rematch};
})();
