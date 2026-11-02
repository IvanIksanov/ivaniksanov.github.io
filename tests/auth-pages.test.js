const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const pages = fs.readdirSync(root).filter(name => name.endsWith('.html'));

for (const page of pages) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  if (!html.includes('header.js')) continue;
  test(`${page} loads the shared auth bootstrap in head`, () => {
    const head = html.slice(0, html.indexOf('</head>'));
    assert.match(head, /auth\.bootstrap\.shared\.js\?v=/);
  });
}

test('questions page loads the same auth stack as the rest of the site', () => {
  const html = fs.readFileSync(path.join(root, 'questions.html'), 'utf8');
  for (const script of [
    'auth.bootstrap.shared.js',
    'auth.state.shared.js',
    'auth.core.shared.js',
    'questions-cloud-sync.shared.js',
    'sync.shared.js',
    'questions.js'
  ]) {
    assert.match(html, new RegExp(script.replace('.', '\\.')));
  }
});

test('interview page loads the AI dependencies before interview.js', () => {
  const html = fs.readFileSync(path.join(root, 'interview.html'), 'utf8');
  const interviewIndex = html.indexOf('interview.js');
  assert.notEqual(interviewIndex, -1);
  for (const dependency of ['ai-prompts.shared.js', 'ai-client.shared.js', 'ai-table-scroll.shared.js']) {
    const index = html.indexOf(dependency);
    assert.notEqual(index, -1, `${dependency} is missing`);
    assert.ok(index < interviewIndex, `${dependency} must load before interview.js`);
  }
});
