/* Language: Arabic (the default) or English. Text built in code is written as tx(arabic, english); the bilingual
   objects from content.js are read with T(o); data fields with an English twin (name_en) are read with fx(o, 'name'). Static page text is swapped by translatePage() from i18n-html.js.
   Changing the language reloads the page, so every screen is built again in the new language. */
import { HTML_EN } from './i18n-html.js';
const KEY = 'fi-lang';
export const LANG = (() => {
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'en' || q === 'ar') { localStorage.setItem(KEY, q); return q; }
    return localStorage.getItem(KEY) === 'en' ? 'en' : 'ar';
  } catch (e) { return 'ar'; }
})();
export const EN = LANG === 'en';
export const tx = (ar, en) => (EN ? en : ar);
export const T = o => (EN && o.en ? o.en : o.ar);
/* a data object's own field, with its English twin when there is one: fx(F, 'name') reads F.name_en in English */
export const fx = (o, k) => (EN && o[k + '_en']) || o[k];
export function setLanguage(l) {
  try { localStorage.setItem(KEY, l); } catch (e) {}
  const u = new URL(location.href); u.searchParams.set('lang', l); location.href = u.href;
}
/* the page's own text and attributes: each Arabic string found in the HTML is replaced by its English */
const ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
export function translatePage() {
  document.documentElement.lang = LANG; document.documentElement.dir = EN ? 'ltr' : 'rtl';
  if (!EN) return;
  const title = document.title.trim(); if (HTML_EN[title]) document.title = HTML_EN[title];
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = walk.nextNode());) {
    const key = n.nodeValue.trim(); if (key && HTML_EN[key]) n.nodeValue = n.nodeValue.replace(key, HTML_EN[key]);
  }
  for (const el of document.querySelectorAll('[' + ATTRS.join('],[') + ']')) for (const a of ATTRS) {
    const v = el.getAttribute(a); if (v && HTML_EN[v.trim()]) el.setAttribute(a, HTML_EN[v.trim()]);
  }
}
