import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FileListSource,
  basename,
  dirname,
  extensionOf,
  findGraphCandidates,
  normalizeRelativePath,
  resolveDirectoryFrom,
  resolveFrom,
  resolveStudentAnswerFolder
} from '../js/fs.js';

test('normalizes relative paths', () => {
  assert.equal(normalizeRelativePath('a/b/c.js'), 'a/b/c.js');
  assert.equal(normalizeRelativePath('./a//b/../c.js'), 'a/c.js');
  assert.equal(normalizeRelativePath('a\\b\\c.js'), 'a/b/c.js');
});

test('rejects paths that escape the folder or are absolute', () => {
  for (const path of ['/etc/passwd', 'C:\\Users\\me\\file.js', 'file:///tmp/a.js', '../secret.js', 'a/../../secret.js', '']) {
    assert.throws(() => normalizeRelativePath(path), /Absolute paths|outside the granted folder|empty|does not name a file/);
  }
});

test('resolves exercise paths from the graph directory', () => {
  assert.equal(
    resolveFrom('examples', 'exercises/two-sum/mira.py'),
    'examples/exercises/two-sum/mira.py'
  );
  assert.equal(resolveFrom('examples/graphs', '../shared/a.js'), 'examples/shared/a.js');
  assert.equal(resolveFrom('', 'file.js'), 'file.js');
  assert.throws(() => resolveFrom('', '../file.js'), /outside the granted folder/);
  assert.throws(() => resolveFrom('graph', '/etc/passwd'), /Absolute paths/);
  assert.throws(() => resolveFrom('graph', 'C:\\Users\\me\\file.js'), /Absolute paths/);
  assert.throws(() => resolveFrom('graph', 'file:///tmp/a.js'), /Absolute paths/);
  assert.throws(() => resolveFrom('graph', '../../outside.js'), /outside the granted folder/);
});

test('resolves a test folder relative to the graph file', () => {
  assert.equal(resolveDirectoryFrom('misc', '..'), '');
  assert.equal(resolveDirectoryFrom('misc/sub', '../..'), '');
  assert.equal(resolveDirectoryFrom('misc', '.'), 'misc');
  assert.equal(resolveDirectoryFrom('', 'test'), 'test');
  assert.equal(resolveDirectoryFrom('a/b', '../../test'), 'test');
  assert.throws(() => resolveDirectoryFrom('', '..'), /outside the granted folder/);
  assert.throws(() => resolveDirectoryFrom('misc', '../..'), /outside the granted folder/);
  assert.throws(() => resolveDirectoryFrom('misc', '/tmp'), /Absolute paths/);
});

test('resolves each student folder under the manifest answer root', () => {
  assert.equal(
    resolveStudentAnswerFolder('risposte', 'bottea-sofia'),
    'risposte/bottea-sofia'
  );
  assert.equal(
    resolveStudentAnswerFolder('', 'bottea-sofia'),
    'risposte/bottea-sofia'
  );
  assert.equal(
    resolveStudentAnswerFolder('answers/set-b', 'melis-nicolò'),
    'answers/set-b/melis-nicolò'
  );
  assert.throws(
    () => resolveStudentAnswerFolder('risposte', ''),
    /empty|does not name/
  );
});

test('path helpers', () => {
  assert.equal(dirname('examples/graphs/graph.json'), 'examples/graphs');
  assert.equal(dirname('graph.json'), '');
  assert.equal(basename('examples/graphs/graph.json'), 'graph.json');
  assert.equal(extensionOf('a/b/file.TS'), 'ts');
  assert.equal(extensionOf('Makefile'), '');
});

test('FileListSource strips the selected root and reads files', async () => {
  const files = [
    { name: 'a.json', webkitRelativePath: 'root/a.json' },
    { name: 'b.js', webkitRelativePath: 'root/exercises/b.js' }
  ];
  const source = new FileListSource(files);

  assert.equal(source.name, 'root');
  assert.deepEqual(await source.listGraphFiles(), [{ path: 'a.json', name: 'a.json' }]);
  assert.equal(await source.read('exercises/b.js'), files[1]);
  await assert.rejects(() => source.read('missing.js'), /File not found/);
});

test('FileListSource accepts explicit relative paths', async () => {
  const graph = { name: 'a.json' };
  const exercise = { name: 'b.js' };
  const source = new FileListSource([
    { file: graph, path: 'root/a.json' },
    { file: exercise, path: 'root/exercises/b.js' }
  ]);

  assert.equal(source.name, 'root');
  assert.deepEqual(await source.listGraphFiles(), [{ path: 'a.json', name: 'a.json' }]);
  assert.equal(await source.read('exercises/b.js'), exercise);
});

test('findGraphCandidates matches by basename case-insensitively', () => {
  const files = [
    { path: 'graphs/Graph.json', name: 'Graph.json' },
    { path: 'other/Graph.json', name: 'Graph.json' },
    { path: 'other/other.json', name: 'other.json' }
  ];

  assert.equal(findGraphCandidates(files, 'graph.json').length, 2);
  assert.equal(findGraphCandidates(files, 'other.json').length, 1);
  assert.equal(findGraphCandidates(files, null).length, 0);
});
