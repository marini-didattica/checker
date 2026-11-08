import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGraph } from '../js/graph.js';

test('parses nodes, edges, confidence, and exercises', () => {
  const parsed = parseGraph(
    {
      name: '  My graph  ',
      elements: {
        nodes: [
          { data: { id: 'a' }, style: { label: 'A', width: 48, height: 40 } },
          { data: { id: 'b' } }
        ],
        edges: [
          {
            data: {
              id: 'a-b',
              source: 'a',
              target: 'b',
              confidence: 0.6,
              exercises: ['E1', 'E2']
            },
            style: { 'line-color': '#7ee2b8' }
          }
        ]
      }
    },
    'fallback'
  );

  assert.equal(parsed.name, 'My graph');
  assert.equal(parsed.elements.length, 3);
  assert.equal(parsed.stats.nodes, 2);
  assert.equal(parsed.stats.edges, 1);
  assert.equal(parsed.stats.withConfidence, 1);
  assert.equal(parsed.stats.withExercises, 1);

  const node = parsed.elements[0];
  assert.equal(node.data.label, 'a');
  assert.equal(node.scratch.baseWidth, 48);
  assert.equal(node.scratch.baseHeight, 40);
  assert.equal(node.scratch.styleOverride.label, 'A');
  assert.equal(node.scratch.styleOverride.width, undefined);

  const edge = parsed.elements[2];
  assert.equal(edge.scratch.confidence, 0.6);
  assert.equal(edge.scratch.baseWidth, 2);
  assert.deepEqual(edge.data.exercises, ['E1', 'E2']);
  assert.equal(edge.scratch.styleOverride['target-arrow-color'], '#7ee2b8');
});

test('edge labels default to exercise ids unless an explicit label is set', () => {
  const parsed = parseGraph({
    elements: {
      nodes: [{ data: { id: 'a' } }, { data: { id: 'b' } }],
      edges: [
        {
          data: {
            source: 'a',
            target: 'b',
            exercises: ['E1', 'E2']
          }
        },
        {
          data: {
            source: 'a',
            target: 'b',
            label: 'custom label',
            exercises: ['E1']
          }
        },
        { data: { source: 'b', target: 'a' } }
      ]
    }
  });

  assert.equal(parsed.elements[2].data.label, 'E1 E2');
  assert.equal(parsed.elements[3].data.label, 'custom label');
  assert.equal(parsed.elements[4].data.label, undefined);
});

test('accepts exercise ids and uses them as the default edge label', () => {
  const parsed = parseGraph({
    elements: {
      nodes: [{ data: { id: 'a' } }, { data: { id: 'b' } }],
      edges: [
        {
          data: {
            source: 'a',
            target: 'b',
            exercises: ['E1', 'E2', 'E2', '', 42]
          }
        },
        {
          data: {
            source: 'a',
            target: 'b',
            label: 'explicit',
            exercises: ['E1', 'S5']
          }
        }
      ]
    }
  });

  assert.deepEqual(parsed.elements[2].data.exercises, ['E1', 'E2']);
  assert.equal(parsed.elements[2].data.label, 'E1 E2');
  assert.deepEqual(parsed.elements[3].data.exercises, ['E1', 'S5']);
  assert.equal(parsed.elements[3].data.label, 'explicit');
  assert.match(parsed.warnings.join('\n'), /exercise id/);
});

test('reads the test folder path and warns about invalid values', () => {
  const parsed = parseGraph({
    'test-folder': '..',
    elements: { nodes: [{ data: { id: 'a' } }], edges: [] }
  });
  assert.equal(parsed.testFolder, '..');

  const missing = parseGraph({
    elements: { nodes: [{ data: { id: 'a' } }], edges: [] }
  });
  assert.equal(missing.testFolder, null);

  const invalid = parseGraph({
    'test-folder': 42,
    elements: { nodes: [{ data: { id: 'a' } }], edges: [] }
  });
  assert.equal(invalid.testFolder, null);
  assert.match(invalid.warnings.join('\n'), /test-folder/);
});

test('accepts a flat elements array and infers node/edge kinds', () => {
  const parsed = parseGraph({
    elements: [
      { data: { id: 'a' } },
      { data: { id: 'b' } },
      { data: { source: 'a', target: 'b' } }
    ]
  });

  assert.equal(parsed.elements.length, 3);
  assert.equal(parsed.stats.nodes, 2);
  assert.equal(parsed.stats.edges, 1);
  assert.equal(parsed.elements[2].data.id, 'edge-a-b');
});

test('clamps confidence and reports warnings', () => {
  const parsed = parseGraph({
    elements: {
      nodes: [{ data: { id: 'a' } }, { data: { id: 'b' } }],
      edges: [
        { data: { source: 'a', target: 'b', confidence: 1.7 } },
        { data: { source: 'a', target: 'b', confidence: 'nope' } }
      ]
    }
  });

  assert.equal(parsed.elements[2].scratch.confidence, 1);
  assert.equal(parsed.elements[3].scratch.confidence, null);
  assert.equal(parsed.warnings.length, 2);
});

test('parses node confidence and exercise notes', () => {
  const parsed = parseGraph({
    elements: {
      nodes: [
        {
          data: {
            id: 'a',
            confidence: 1.4,
            'exercise-notes': {
              E1: '  Uses an unusual construct.  ',
              E2: 42,
              '': 'orphan',
              E3: ''
            }
          }
        }
      ],
      edges: []
    }
  });

  const node = parsed.elements[0];
  assert.equal(node.scratch.confidence, 1);
  assert.equal(node.data.confidence, 1);
  assert.deepEqual(node.scratch.exerciseNotes, {
    E1: 'Uses an unusual construct.'
  });
  assert.deepEqual(node.data['exercise-notes'], {
    E1: 'Uses an unusual construct.'
  });
  assert.equal(parsed.stats.withNodeConfidence, 1);
  assert.equal(parsed.stats.withNodeNotes, 1);
  assert.match(parsed.warnings.join('\n'), /Node “a” has confidence/);
  assert.match(parsed.warnings.join('\n'), /must be a non-empty string/);
  assert.match(parsed.warnings.join('\n'), /empty exercise id/);
});

test('drops invalid exercise ids and keeps valid ones', () => {
  const parsed = parseGraph({
    elements: {
      nodes: [{ data: { id: 'a' } }, { data: { id: 'b' } }],
      edges: [
        {
          data: {
            source: 'a',
            target: 'b',
            exercises: ['E1', 'E1', '', 42, 'S5']
          }
        },
        {
          data: {
            source: 'a',
            target: 'b',
            exercises: 'not-an-array'
          }
        }
      ]
    }
  });

  assert.deepEqual(parsed.elements[2].data.exercises, ['E1', 'S5']);
  assert.equal(parsed.elements[3].data.exercises, undefined);
  assert.equal(parsed.stats.withExercises, 1);
  assert.match(parsed.warnings.join('\n'), /non-empty string/);
  assert.match(parsed.warnings.join('\n'), /invalid “exercises” value/);
});

test('does not accept legacy root-level nodes and edges', () => {
  assert.throws(
    () =>
      parseGraph({
        nodes: [{ data: { id: 'a' } }],
        edges: []
      }),
    /expected an “elements” object/
  );
});

test('rejects missing and duplicate node ids', () => {
  assert.throws(
    () => parseGraph({ elements: { nodes: [{ data: {} }], edges: [] } }),
    /missing a “data.id”/
  );

  assert.throws(
    () =>
      parseGraph({
        elements: {
          nodes: [{ data: { id: 'a' } }, { data: { id: 'a' } }],
          edges: []
        }
      }),
    /Duplicate node id/
  );
});

test('rejects edges that reference missing nodes', () => {
  assert.throws(
    () =>
      parseGraph({
        elements: {
          nodes: [{ data: { id: 'a' } }],
          edges: [{ data: { source: 'a', target: 'missing' } }]
        }
      }),
    /missing node “missing”/
  );
});

test('rejects a graph without nodes', () => {
  assert.throws(
    () => parseGraph({ elements: { nodes: [], edges: [] } }),
    /no nodes/
  );
});

test('generates unique edge ids', () => {
  const parsed = parseGraph({
    elements: {
      nodes: [{ data: { id: 'a' } }, { data: { id: 'b' } }],
      edges: [
        { data: { source: 'a', target: 'b' } },
        { data: { source: 'a', target: 'b' } }
      ]
    }
  });

  assert.equal(parsed.elements[2].data.id, 'edge-a-b');
  assert.equal(parsed.elements[3].data.id, 'edge-a-b-1');
});

test('ignores malformed per-element styles with a warning', () => {
  const parsed = parseGraph({
    elements: {
      nodes: [{ data: { id: 'a' }, style: 'nope' }],
      edges: []
    }
  });

  assert.equal(parsed.elements[0].scratch.styleOverride, null);
  assert.match(parsed.warnings[0], /invalid “style”/);
});

test('uses the fallback name when the graph has no name', () => {
  const parsed = parseGraph(
    { elements: { nodes: [{ data: { id: 'a' } }], edges: [] } },
    'graph'
  );
  assert.equal(parsed.name, 'graph');
  assert.equal(parsed.elements[0].data.label, 'a');
});
