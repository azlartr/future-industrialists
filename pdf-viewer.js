import {mountReader} from './pdf-reader.js?v=20261105-pdf-reader-1';
const params=new URLSearchParams(location.search),names={makkah:'مكة المكرمة',qassim:'القصيم',riyadh:'الرياض',sharqiyah:'الشرقية'};
const report={region:params.get('region')||'',title:params.get('title')||'التقرير',dateRange:params.get('date')||'',season:params.get('season')||''};
if(!report.region&&params.get('file')){try{const response=await fetch(new URL('pdf-archives.json',import.meta.url),{cache:'no-store'});if(response.ok){const data=await response.json(),match=data.archives?.find(item=>item.url===params.get('file'));if(match)Object.assign(report,match);}}catch{}}
document.getElementById('report-title').textContent=[names[report.region]||report.region,report.title].filter(Boolean).join(' · ');
document.getElementById('report-period').textContent=report.dateRange||report.season;
document.title=[names[report.region]||report.region,report.title,report.dateRange].filter(Boolean).join(' | ');
const root=document.getElementById('report-reader');
if(params.get('file')){const reader=mountReader(root,report,params.get('file'));window.addEventListener('pagehide',()=>reader.destroy(),{once:true});}
else root.textContent='لم يتم تحديد ملف التقرير. ارجع إلى قائمة التقارير واختر الأسبوع.';
