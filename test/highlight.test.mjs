import test from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeHtml,
  highlight,
  highlightCode,
  languageForPath
} from '../js/highlight.js';

test('escapes HTML-sensitive characters', () => {
  assert.equal(
    escapeHtml('<script>alert("x")</script>'),
    '&lt;script&gt;alert("x")&lt;/script&gt;'
  );
});

test('detects languages by extension', () => {
  assert.equal(languageForPath('a/b/solution.tsx'), 'typescript');
  assert.equal(languageForPath('README.md'), 'markdown');
  assert.equal(languageForPath('Dockerfile'), 'shell');
  assert.equal(languageForPath('unknown.zzz'), 'plain');
});

test('highlights JavaScript keywords, comments, and strings', () => {
  const html = highlight('const x = "hello"; // hi\nreturn x;', 'javascript');
  assert.match(html, /tok-keyword">const/);
  assert.match(html, /tok-string">"hello"/);
  assert.match(html, /tok-comment">\/\/ hi/);
  assert.match(html, /tok-keyword">return/);
});

test('highlights JSON keys and values', () => {
  const html = highlight('{"name": "graph", "confidence": 0.6}', 'json');
  assert.match(html, /tok-property">"name"/);
  assert.match(html, /tok-string">"graph"/);
  assert.match(html, /tok-number">0.6/);
});

test('escapes markup and highlights tags and attributes', () => {
  const html = highlight('<div class="x">&</div>', 'markup');
  assert.match(html, /tok-tag">div/);
  assert.match(html, /tok-attr">class/);
  assert.match(html, /&amp;/);
  assert.doesNotMatch(html, /<div/);
});

test('highlights markdown headings and code fences', () => {
  const html = highlight('# Title\n\n```js\nconst x = 1;\n```\n', 'markdown');
  assert.match(html, /tok-heading"># Title/);
  assert.match(html, /tok-comment">```js/);
  assert.match(html, /tok-code">const x = 1;/);
});

test('highlights diff lines', () => {
  const html = highlight('@@ -1 +1 @@\n-old\n+new', 'diff');
  assert.match(html, /tok-keyword">@@/);
  assert.match(html, /tok-removed">-old/);
  assert.match(html, /tok-added">\+new/);
});

test('falls back to plain text for unknown languages and huge files', () => {
  assert.equal(highlight('<b>x</b>', 'plain'), '&lt;b&gt;x&lt;/b&gt;');
  assert.equal(
    highlightCode('<b>x</b>', 'file.zzz'),
    '&lt;b&gt;x&lt;/b&gt;'
  );
  assert.equal(
    highlightCode('const x = 1;', 'file.js', 4),
    'const x = 1;'
  );
});

test('does not allow file content to inject markup through highlighting', () => {
  const payload = '<img src=x onerror=alert(1)>';
  const html = highlightCode(payload, 'payload.js');
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img/);
});

test('highlights Python triple-quoted strings', () => {
  const html = highlight('"""Doc"""\ndef f():\n    pass', 'python');
  assert.match(html, /tok-string">"""Doc"""/);
  assert.match(html, /tok-keyword">def/);
  assert.match(html, /tok-keyword">pass/);
});

test('highlights shell variables', () => {
  const html = highlight('echo "$HOME" && echo $USER', 'shell');
  assert.match(html, /tok-variable">\$HOME/);
  assert.match(html, /tok-variable">\$USER/);
});
