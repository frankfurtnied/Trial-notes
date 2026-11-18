// Read-only regression checks for the Trail Notes single-file web app.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const html = fs.readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');

for (const [i, match] of [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].entries()) {
  if (match[1].trim()) assert.doesNotThrow(() => new Function(match[1]), `Inline script ${i} parses`);
}

function extract(start, end, args, result) {
  const a = html.indexOf(start), b = html.indexOf(end, a + start.length);
  assert(a >= 0 && b > a, `${start} located`);
  return new Function(...args, html.slice(a, b) + '\nreturn ' + result);
}

const yearly = extract('function yearExpenseRows(', 'function renderCampingYearExpenses(', [], 'yearExpenseRows')();
const expenses = yearly([
  {date:'2024-07-01',sitefee:80,fuelCost:25},
  {date:'2024-08-03',sitefee:0,driveLog:{sitefee:55,fuelCost:30}},
  {date:'2025-03-12'},
  {date:'',sitefee:999}
]);
assert.equal(expenses[1].fees, 135);
assert.equal(expenses[1].fuelCost, 55);
assert.equal(expenses[1].feeCount, 2);
assert.equal(expenses[0].feeCount, 0, 'Missing amount is not treated as recorded');

const anniversaries = extract('function campingAnniversaryMatches(', 'function renderOnThisDay(', [], 'campingAnniversaryMatches')();
const trips = [
  {date:'2018-02-03',depart:'2018-02-07',_pid:1},
  {date:'2020-12-30',depart:'2021-01-03',_pid:2}
];
assert.equal(anniversaries(trips,new Date(2026,1,5)).trips[0]._pid,1);
assert.equal(anniversaries(trips,new Date(2026,0,1)).trips[0]._pid,2,'Cross-year campout is included');
assert.equal(anniversaries(trips,new Date(2026,1,9)).exact,false,'Nearby date is labeled as such');

const state={overrides:{7:{notes:'keep existing data',favoriteSites:['10']}}};
let saveCount=0;
const fav = extract('function favoriteSiteNumbers(', 'function visitedParksForInsights(',
  ['state','saveState','renderFavoriteSites','renderParkComparison','showToast'],
  '{favoriteSiteNumbers,toggleFavoriteSite}')(
    state,()=>saveCount++,()=>{},()=>{},()=>{}
  );
fav.toggleFavoriteSite(7,'11');
assert.deepEqual(fav.favoriteSiteNumbers(7),['10','11']);
assert.equal(state.overrides[7].notes,'keep existing data','Other park overrides preserved');
fav.toggleFavoriteSite(7,'10');
assert.deepEqual(fav.favoriteSiteNumbers(7),['11']);
assert.equal(saveCount,2);

for (const id of ['panel-insights','compareParkA','compareParkB','favoriteSiteParkSelect','dl-fuelcost','et-fuelcost']) {
  assert(html.includes(`id="${id}"`), `${id} present`);
}
console.log('Trail Notes insights checks passed.');
