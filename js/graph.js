const DEFAULT_NODE_SIZE = 32;
const DEFAULT_EDGE_WIDTH = 2;

/**
 * Parse and validate a graph document.
 *
 * Supported shapes (the standard Cytoscape.js element JSON forms):
 *   { "elements": { "nodes": [...], "edges": [...] } }
 *   { "elements": [ ...nodes and edges... ] }
 *
 * Graph-specific extensions:
 *   test-folder: path (relative to the graph file) containing the test material
 *
 * Node data extensions:
 *   confidence: number in [0, 1], drawn as a node contour
 *   exercise-notes: { [exerciseId: string]: string } notes shown in the inspector
 *
 * Edge data extensions:
 *   confidence: number in [0, 1]
 *   exercises:  one of
 *     - string[] of exercise ids (resolved through each student's correction file)
 *     - { [exerciseName: string]: string[] } of explicit file paths (legacy)
 *
 * Edges without an explicit label use the exercise names/ids as their label.
 */
export function parseGraph(raw, fallbackName = 'Untitled graph') {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('The graph file must contain a JSON object.');
  }

  const name =
    typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : fallbackName;

  let nodesRaw;
  let edgesRaw;

  if (Array.isArray(raw.elements)) {
    const split = splitElements(raw.elements);
    nodesRaw = split.nodes;
    edgesRaw = split.edges;
  } else if (isPlainObject(raw.elements)) {
    nodesRaw = raw.elements.nodes;
    edgesRaw = raw.elements.edges;
  } else {
    throw new Error(
      'Not a Cytoscape.js graph: expected an “elements” object or an “elements” array.'
    );
  }

  if (nodesRaw == null) nodesRaw = [];
  if (edgesRaw == null) edgesRaw = [];

  if (!Array.isArray(nodesRaw)) {
    throw new Error('“elements.nodes” must be an array.');
  }
  if (!Array.isArray(edgesRaw)) {
    throw new Error('“elements.edges” must be an array.');
  }
  if (nodesRaw.length === 0) {
    throw new Error('The graph has no nodes. Add at least one node.');
  }

  const warnings = [];
  const testFolder = normalizeTestFolder(raw['test-folder'], warnings);
  const nodeIds = new Set();
  let nodeConfidenceCount = 0;
  let nodeNoteCount = 0;

  const nodes = nodesRaw.map((item, index) => {
    const label = `Node ${index + 1}`;
    const element = normalizeElement(item, label);
    const data = element.data;

    if (data.id == null || data.id === '') {
      throw new Error(`${label} is missing a “data.id”.`);
    }

    const id = String(data.id);
    if (nodeIds.has(id)) {
      throw new Error(`Duplicate node id “${id}”.`);
    }
    nodeIds.add(id);
    data.id = id;

    if (data.label == null || data.label === '') {
      data.label = id;
    } else {
      data.label = String(data.label);
    }

    const confidence = normalizeConfidence(data.confidence, id, warnings, 'Node');
    if (confidence != null) {
      data.confidence = confidence;
      nodeConfidenceCount += 1;
    } else {
      delete data.confidence;
    }

    const exerciseNotes = normalizeExerciseNotes(data['exercise-notes'], id, warnings);
    if (exerciseNotes) {
      data['exercise-notes'] = exerciseNotes;
      nodeNoteCount += 1;
    } else {
      delete data['exercise-notes'];
    }

    const style = normalizeStyle(element.rawStyle, label, warnings);
    const styleWidth = takeNumericStyle(style, 'width');
    const styleHeight = takeNumericStyle(style, 'height');
    const baseWidth = styleWidth ?? styleHeight ?? DEFAULT_NODE_SIZE;
    const baseHeight = styleHeight ?? styleWidth ?? DEFAULT_NODE_SIZE;

    const scratch = isPlainObject(item.scratch) ? { ...item.scratch } : {};
    scratch.baseWidth = baseWidth;
    scratch.baseHeight = baseHeight;
    scratch.confidence = confidence;
    scratch.exerciseNotes = exerciseNotes;
    scratch.styleOverride = style;

    const node = { data, scratch };
    if (isPlainObject(item.position)) node.position = item.position;
    return node;
  });

  const edgeIds = new Set();
  let confidenceCount = 0;
  let exerciseCount = 0;

  const edges = edgesRaw.map((item, index) => {
    const label = `Edge ${index + 1}`;
    const element = normalizeElement(item, label);
    const data = element.data;

    if (data.source == null || data.source === '') {
      throw new Error(`${label} is missing a “data.source”.`);
    }
    if (data.target == null || data.target === '') {
      throw new Error(`${label} is missing a “data.target”.`);
    }

    const source = String(data.source);
    const target = String(data.target);

    if (!nodeIds.has(source)) {
      throw new Error(`${label} references a missing node “${source}”.`);
    }
    if (!nodeIds.has(target)) {
      throw new Error(`${label} references a missing node “${target}”.`);
    }

    data.source = source;
    data.target = target;

    const hasLabel = data.label != null && String(data.label).trim() !== '';
    if (hasLabel) data.label = String(data.label);

    let id = data.id == null || data.id === '' ? '' : String(data.id);
    if (!id) id = `edge-${source}-${target}`;
    const baseId = id;
    let suffix = 1;
    while (edgeIds.has(id)) id = `${baseId}-${suffix++}`;
    edgeIds.add(id);
    data.id = id;

    const confidence = normalizeConfidence(data.confidence, data.id, warnings);
    if (confidence != null) confidenceCount += 1;

    const exercises = normalizeExercises(data.exercises, data.id, warnings);
    if (exercises) {
      data.exercises = exercises;
      exerciseCount += 1;

      // Without an explicit label, use the exercise names/ids as the edge label.
      if (!hasLabel) {
        data.label = Array.isArray(exercises)
          ? exercises.join(' ')
          : Object.keys(exercises).join(' ');
      }
    } else {
      delete data.exercises;
    }

    const style = normalizeStyle(element.rawStyle, label, warnings);
    const baseWidth = takeNumericStyle(style, 'width') ?? DEFAULT_EDGE_WIDTH;

    if (style && style['line-color'] != null && style['target-arrow-color'] == null) {
      style['target-arrow-color'] = style['line-color'];
    }

    const scratch = isPlainObject(item.scratch) ? { ...item.scratch } : {};
    scratch.confidence = confidence;
    scratch.baseWidth = baseWidth;
    scratch.styleOverride = style;

    return {
      data,
      scratch
    };
  });

  return {
    name,
    testFolder,
    elements: [...nodes, ...edges],
    stats: {
      nodes: nodes.length,
      edges: edges.length,
      withConfidence: confidenceCount,
      withExercises: exerciseCount,
      withNodeConfidence: nodeConfidenceCount,
      withNodeNotes: nodeNoteCount,
      warnings
    },
    warnings
  };
}

function normalizeElement(item, label) {
  if (!isPlainObject(item)) {
    throw new Error(`${label} must be an object.`);
  }
  if (!isPlainObject(item.data)) {
    throw new Error(`${label} is missing a “data” object.`);
  }

  return {
    data: { ...item.data },
    rawStyle: item.style
  };
}

function splitElements(elements) {
  const nodes = [];
  const edges = [];

  for (const element of elements) {
    if (!isPlainObject(element) || !isPlainObject(element.data)) {
      throw new Error('Every entry in “elements” must be an object with a “data” object.');
    }

    if (element.data.source != null || element.data.target != null) {
      edges.push(element);
    } else {
      nodes.push(element);
    }
  }

  return { nodes, edges };
}

function normalizeTestFolder(value, warnings) {
  if (value == null) return null;

  if (typeof value !== 'string') {
    warnings.push('“test-folder” must be a string path; it was ignored.');
    return null;
  }

  const folder = value.trim();
  if (!folder) {
    warnings.push('“test-folder” is empty; it was ignored.');
    return null;
  }

  return folder;
}

function normalizeStyle(rawStyle, label, warnings) {
  if (rawStyle == null) return null;

  if (!isPlainObject(rawStyle)) {
    warnings.push(`${label} has an invalid “style” value; it was ignored.`);
    return null;
  }

  return { ...rawStyle };
}

function normalizeConfidence(value, elementId, warnings, kind = 'Edge') {
  if (value == null || value === '') return null;

  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(numeric)) {
    warnings.push(`${kind} “${elementId}” has a non-numeric confidence; it was ignored.`);
    return null;
  }

  if (numeric < 0 || numeric > 1) {
    const clamped = Math.min(1, Math.max(0, numeric));
    warnings.push(
      `${kind} “${elementId}” has confidence ${numeric}; values must be between 0 and 1. Clamped to ${clamped}.`
    );
    return clamped;
  }

  return numeric;
}

function normalizeExerciseNotes(value, nodeId, warnings) {
  if (value == null) return null;

  if (!isPlainObject(value)) {
    warnings.push(`Node “${nodeId}” has an invalid “exercise-notes” value; it was ignored.`);
    return null;
  }

  const normalized = {};
  let kept = 0;

  for (const [name, note] of Object.entries(value)) {
    const exerciseId = String(name).trim();

    if (!exerciseId) {
      warnings.push(
        `Node “${nodeId}” has an exercise note with an empty exercise id; it was skipped.`
      );
      continue;
    }

    if (typeof note !== 'string' || note.trim() === '') {
      warnings.push(
        `Exercise note “${exerciseId}” on node “${nodeId}” must be a non-empty string; it was skipped.`
      );
      continue;
    }

    normalized[exerciseId] = note.trim();
    kept += 1;
  }

  return kept > 0 ? normalized : null;
}

function normalizeExercises(value, edgeId, warnings) {
  if (value == null) return null;

  if (Array.isArray(value)) {
    const ids = [];
    const seen = new Set();

    for (const item of value) {
      if (typeof item !== 'string' || item.trim() === '') {
        warnings.push(
          `Edge “${edgeId}” has an exercise id that is not a non-empty string; it was skipped.`
        );
        continue;
      }

      const id = item.trim();
      if (seen.has(id)) continue;

      seen.add(id);
      ids.push(id);
    }

    return ids.length > 0 ? ids : null;
  }

  if (!isPlainObject(value)) {
    warnings.push(`Edge “${edgeId}” has an invalid “exercises” value; it was ignored.`);
    return null;
  }

  const normalized = {};
  let kept = 0;

  for (const [name, files] of Object.entries(value)) {
    const exerciseName = String(name).trim();

    if (!exerciseName) {
      warnings.push(`Edge “${edgeId}” has an exercise with an empty name; it was skipped.`);
      continue;
    }

    if (!Array.isArray(files)) {
      warnings.push(
        `Exercise “${exerciseName}” on edge “${edgeId}” must contain an array of file paths; it was skipped.`
      );
      continue;
    }

    const validFiles = files
      .filter((file) => typeof file === 'string' && file.trim() !== '')
      .map((file) => file.trim());

    if (validFiles.length === 0) {
      warnings.push(
        `Exercise “${exerciseName}” on edge “${edgeId}” has no valid file paths; it was skipped.`
      );
      continue;
    }

    if (validFiles.length !== files.length) {
      warnings.push(
        `Exercise “${exerciseName}” on edge “${edgeId}” contains non-string paths; those entries were dropped.`
      );
    }

    normalized[exerciseName] = validFiles;
    kept += 1;
  }

  return kept > 0 ? normalized : null;
}

function takeNumericStyle(style, property) {
  if (!style || !(property in style)) return null;

  const raw = style[property];
  const value =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string' && /^\s*\d+(?:\.\d+)?\s*$/.test(raw)
        ? Number(raw)
        : Number.NaN;

  if (!Number.isFinite(value) || value <= 0) return null;

  delete style[property];
  return value;
}

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

export { DEFAULT_NODE_SIZE, DEFAULT_EDGE_WIDTH };
