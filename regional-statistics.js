/* Verified closing balances from the uploaded archive reports. */
(function () {
  'use strict';
  const baselines = {
    makkah: { through: '2026-05-07', totalBeneficiaries: 22490, totalRegistered: 4815, creativeCategory: 1520, discovererCategory: 2162, ambassadorCategory: 732, artistCategory: 401 },
    qassim: { through: '2026-05-07', totalBeneficiaries: 9270, totalRegistered: 1050, creativeCategory: 382, discovererCategory: 451, ambassadorCategory: 139, artistCategory: 78 }
  };
  const fields = ['totalRegistered', 'creativeCategory', 'discovererCategory', 'ambassadorCategory', 'artistCategory'];
  function count(value) {
    if (value === null || value === undefined || String(value).trim() === '') return null;
    const text = String(value).replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[۰-۹]/g, c => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/[,٬\s]/g, '');
    if (!/^\d+$/.test(text)) return null;
    const number = Number(text);
    return Number.isSafeInteger(number) ? number : null;
  }
  function calculate(report, records, dateOf, visitsOf = item => item.visits || []) {
    if (!report) return { totalBeneficiaries: 0 };
    const cutoff = dateOf(report), opening = baselines[report.region];
    const openingDate = opening ? Date.parse(opening.through + 'T23:59:59Z') : 0;
    const baseline = opening && cutoff > openingDate ? opening : null;
    const unique = new Map((records || []).filter(item => item.region === report.region).map(item => [item.id, item]));
    unique.set(report.id, report);
    const included = [...unique.values()].filter(item => {
      const date = dateOf(item);
      return item.id === report.id || (date > 0 && date <= cutoff && (!baseline || date > openingDate));
    }).sort((a, b) => dateOf(a) - dateOf(b) || String(a.id).localeCompare(String(b.id)));
    const result = { totalBeneficiaries: baseline?.totalBeneficiaries || 0 };
    for (const item of included) {
      result.totalBeneficiaries += visitsOf(item).reduce((sum, visit) => sum + (count(visit.participants) || 0), 0);
    }
    let previous = Object.fromEntries(fields.map(key => [key, baseline?.[key] || 0]));
    for (const item of included) {
      const source = item.stats || {};
      const mode = item.statisticsBasis || (!baseline || fields.some(key => count(source[key]) !== null && count(source[key]) >= baseline[key]) ? 'regional' : 'since-baseline');
      const values = Object.fromEntries(fields.map(key => {
        const value = count(source[key]);
        return [key, value === null ? null : value + (mode === 'weekly' ? previous[key] || 0 : mode === 'since-baseline' ? baseline?.[key] || 0 : 0)];
      }));
      if (item.id === report.id) Object.assign(result, values);
      previous = Object.fromEntries(fields.map(key => [key, values[key] ?? previous[key]]));
    }
    return result;
  }
  window.FI_STATISTICS = { calculate, count, baselines };
})();
