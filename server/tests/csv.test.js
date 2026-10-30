const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCsv, toCsv, neutralizeFormula } = require('../src/utils/csv');

test('parses quoted values, escaped quotes and newlines', () => {
  const rows = parseCsv('name,note\n"Aarav","Hello, ""world"""\n"Ananya","line1\nline2"');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].name, 'Aarav');
  assert.equal(rows[0].note, 'Hello, "world"');
  assert.equal(rows[1].note, 'line1\nline2');
});

test('neutralizes spreadsheet formula injection', () => {
  assert.equal(neutralizeFormula('=HYPERLINK("http://evil")').startsWith("'="), true);
  assert.equal(neutralizeFormula('+1+1').startsWith("'+"), true);
  assert.equal(neutralizeFormula('@SUM(A1)').startsWith("'@"), true);
  assert.equal(neutralizeFormula('safe value'), 'safe value');
});

test('csv output quotes special characters and blocks formulas', () => {
  const csv = toCsv([{ title: '=cmd', note: 'a,b' }]);
  assert.equal(csv.split('\n')[1], `'=cmd,"a,b"`);
});
