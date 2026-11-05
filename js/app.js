import { parseGraph } from './graph.js';
import {
  DirectorySource,
  FileListSource,
  PathError,
  SourceError,
  basename,
  dirname,
  extensionOf,
  findGraphCandidates,
  isImagePath,
  resolveDirectoryFrom,
  resolveFrom
} from './fs.js';
import { highlightCode } from './highlight.js';

const PALETTE = [
  '#6ea8fe',
  '#7ee2b8',
  '#f6b26b',
  '#f78fb3',
  '#b39cff',
  '#66d3e8',
  '#e6d36f',
  '#9be36f',
  '#ff9f80'
];

const MAX_GRAPH_FILE_SIZE = 25 * 1024 * 1024;
const MAX_GRAPH_DISCOVERY_FILES = 60;
const MAX_GRAPH_DISCOVERY_BYTES = 8 * 1024 * 1024;
const MAX_PREVIEW_BYTES = 1024 * 1024;
const MAX_HIGHLIGHT_CHARS = 300000;
const CORRECTIONS_DIRECTORY = 'correzioni';

const DEFAULT_NODE_SIZE = 32;
const DEFAULT_EDGE_WIDTH = 2;
const MIN_CONFIDENCE_WIDTH = 1.2;
const MAX_CONFIDENCE_WIDTH = 9.5;
const DEFAULT_EDGE_COLOR = '#40506f';

const CY_STYLE = [
  {
    selector: 'node',
    style: {
      'background-color': 'data(color)',
      'background-opacity': 1,
      'border-width': 2,
      'border-color': '#08101f',
      'border-opacity': 1,
      width: DEFAULT_NODE_SIZE,
      height: DEFAULT_NODE_SIZE,
      label: 'data(label)',
      color: '#f4f7ff',
      'font-family':
        'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      'font-size': 12,
      'font-weight': 600,
      'text-valign': 'center',
      'text-halign': 'center',
      'text-opacity': 0,
      'text-background-color': '#060910',
      'text-background-opacity': 0.86,
      'text-background-padding': '3px',
      'text-background-shape': 'roundrectangle',
      'text-max-width': '96px',
      'text-wrap': 'wrap',
      'text-events': true,
      'overlay-opacity': 0,
      'shadow-blur': 14,
      'shadow-color': '#000000',
      'shadow-opacity': 0.38,
      'shadow-offset-x': 0,
      'shadow-offset-y': 4,
      'transition-property': 'opacity, border-color',
      'transition-duration': '0.15s'
    }
  },
  {
    selector: 'node.show-labels',
    style: {
      'text-opacity': 1
    }
  },
  {
    selector: 'node.highlighted',
    style: {
      'border-color': '#e4edff',
      'border-width': 3,
      'z-index': 10
    }
  },
  {
    selector: 'node.faded',
    style: {
      opacity: 0.16
    }
  },
  {
    selector: 'node:selected',
    style: {
      'border-color': '#ffffff',
      'border-width': 3
    }
  },
  {
    selector: 'edge',
    style: {
      width: DEFAULT_EDGE_WIDTH,
      'line-color': 'data(color)',
      'target-arrow-color': 'data(color)',
      'target-arrow-shape': 'none',
      'arrow-scale': 0.8,
      'curve-style': 'bezier',
      'line-cap': 'round',
      opacity: 0.95,
      'overlay-opacity': 0,
      'overlay-padding': 8,
      label: 'data(label)',
      color: '#dbe6ff',
      'font-family':
        'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      'font-size': 10,
      'font-weight': 500,
      'text-valign': 'center',
      'text-halign': 'center',
      'text-opacity': 0,
      'text-rotation': 'none',
      'text-margin-y': -8,
      'text-background-color': '#060910',
      'text-background-opacity': 0.9,
      'text-background-padding': '2px',
      'text-background-shape': 'roundrectangle',
      'text-max-width': '110px',
      'text-wrap': 'wrap',
      'text-events': true,
      'transition-property': 'opacity, line-color',
      'transition-duration': '0.15s'
    }
  },
  {
    selector: 'edge.arrows',
    style: {
      'target-arrow-shape': 'triangle'
    }
  },
  {
    selector: 'edge.confidence-hidden',
    style: {
      display: 'none'
    }
  },
  {
    selector: 'edge.show-labels',
    style: {
      'text-opacity': 1
    }
  },
  {
    selector: 'edge.highlighted',
    style: {
      opacity: 1,
      'z-index': 10
    }
  },
  {
    selector: 'edge.faded',
    style: {
      opacity: 0.07
    }
  },
  {
    selector: 'edge:selected',
    style: {
      'line-color': '#a9c8ff',
      'target-arrow-color': '#a9c8ff',
      'z-index': 20
    }
  }
];

const ICONS = {
  copy:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="7" width="9" height="9" rx="2"/><path d="M13 7V5.8A1.8 1.8 0 0 0 11.2 4H5.8A1.8 1.8 0 0 0 4 5.8v5.4A1.8 1.8 0 0 0 5.8 13H7"/></svg>',
  reload:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 10a6 6 0 1 1-1.7-4.2"/><path d="M16 4v4h-4"/></svg>',
  lock:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2.5"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10"/><circle cx="12" cy="15" r="1" fill="currentColor" stroke="none"/></svg>',
  warning:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4 3.5 19.5h17L12 4Z"/><path d="M12 9.5v4.2"/><circle cx="12" cy="16.6" r=".9" fill="currentColor" stroke="none"/></svg>',
  file:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3.5h7l5 5v12H6v-17Z"/><path d="M13 3.5v5h5"/></svg>'
};

const els = {
  cy: document.getElementById('cy'),
  overlay: document.getElementById('drop-overlay'),
  card: document.getElementById('drop-card'),
  dropError: document.getElementById('drop-error'),
  dropVeil: document.getElementById('drop-veil'),
  fileInput: document.getElementById('file-input'),
  folderInput: document.getElementById('folder-input'),
  browseFile: document.getElementById('browse-file'),
  openFolder: document.getElementById('open-folder'),
  panel: document.getElementById('panel'),
  graphName: document.getElementById('graph-name'),
  graphStats: document.getElementById('graph-stats'),
  openFile: document.getElementById('open-file'),
  folderRow: document.getElementById('folder-row'),
  folderTitle: document.getElementById('folder-title'),
  folderDetail: document.getElementById('folder-detail'),
  folderButton: document.getElementById('folder-button'),
  nodeSize: document.getElementById('node-size'),
  nodeSizeValue: document.getElementById('node-size-value'),
  edgeSize: document.getElementById('edge-size'),
  edgeSizeValue: document.getElementById('edge-size-value'),
  confidenceRange: document.getElementById('confidence-range'),
  confidenceRangeFill: document.getElementById('confidence-range-fill'),
  confidenceRangeValue: document.getElementById('confidence-range-value'),
  confidenceMin: document.getElementById('confidence-min'),
  confidenceMax: document.getElementById('confidence-max'),
  showNodeLabels: document.getElementById('show-node-labels'),
  showEdgeLabels: document.getElementById('show-edge-labels'),
  tooltips: document.getElementById('tooltips'),
  directed: document.getElementById('directed'),
  highlightNeighbors: document.getElementById('highlight-neighbors'),
  fitView: document.getElementById('fit-view'),
  rearrange: document.getElementById('rearrange'),
  tooltip: document.getElementById('graph-tooltip'),
  toast: document.getElementById('toast'),
  inspector: document.getElementById('inspector'),
  inspectorResizer: document.getElementById('inspector-resizer'),
  inspectorTitle: document.getElementById('inspector-title'),
  inspectorMeta: document.getElementById('inspector-meta'),
  inspectorConfidence: document.getElementById('inspector-confidence'),
  inspectorClose: document.getElementById('inspector-close'),
  exerciseTabs: document.getElementById('exercise-tabs'),
  inspectorNotice: document.getElementById('inspector-notice'),
  inspectorSplit: document.getElementById('inspector-split'),
  inspectorEmpty: document.getElementById('inspector-empty'),
  graphDialog: document.getElementById('graph-dialog'),
  graphDialogTitle: document.getElementById('graph-dialog-title'),
  graphDialogSubtitle: document.getElementById('graph-dialog-subtitle'),
  dialogFilterWrap: document.getElementById('dialog-filter-wrap'),
  dialogFilter: document.getElementById('dialog-filter'),
  graphList: document.getElementById('graph-list'),
  graphDialogEmpty: document.getElementById('graph-dialog-empty'),
  folderDialog: document.getElementById('folder-dialog'),
  folderDialogSubtitle: document.getElementById('folder-dialog-subtitle'),
  folderDialogCopy: document.getElementById('folder-dialog-copy'),
  folderDialogChoose: document.getElementById('folder-dialog-choose')
};

const settings = {
  nodeSizeMultiplier: Number(els.nodeSize.value),
  edgeSizeMultiplier: Number(els.edgeSize.value),
  confidenceMin: Number(els.confidenceMin.value),
  confidenceMax: Number(els.confidenceMax.value),
  showNodeLabels: els.showNodeLabels.checked,
  showEdgeLabels: els.showEdgeLabels.checked,
  tooltips: els.tooltips.checked,
  directed: els.directed.checked,
  highlightNeighbors: els.highlightNeighbors.checked
};

let cy = null;
let graphInfo = null;
let currentSource = null;
let sourceGeneration = 0;

let currentEdgeId = null;
let currentExercise = null;
let inspectorToken = 0;
let inspectorHideTimer = null;
let objectUrls = new Set();
let fileCache = new Map();
let correctionCache = new Map();

let dragDepth = 0;
let dropBusy = false;
let pointerDown = false;
let dragging = false;

let tooltipActive = false;
let tooltipHideTimer = null;
let toastTimer = null;
let toastHideTimer = null;

let pendingFolderIntent = null;
let pickingSource = false;

init();

function init() {
  updateRange(els.nodeSize, els.nodeSizeValue, formatMultiplier);
  updateRange(els.edgeSize, els.edgeSizeValue, formatMultiplier);
  updateConfidenceRange();

  bindUi();
  bindDragAndDrop();

  window.addEventListener('resize', () => {
    hideTooltip();
    if (cy) cy.resize();
    clampInspectorHeight();
  });

  window.addEventListener('pointerup', () => {
    pointerDown = false;
    dragging = false;
  });

  window.addEventListener('blur', () => {
    pointerDown = false;
    dragging = false;
    hideTooltip();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !els.graphDialog.open && currentEdgeId) {
      closeInspector();
      return;
    }

    if (
      (event.metaKey || event.ctrlKey) &&
      event.key.toLowerCase() === 'o' &&
      !els.graphDialog.open
    ) {
      event.preventDefault();
      els.fileInput.click();
    }
  });

  if (!window.isSecureContext) {
    console.warn('Folder access requires http://localhost or HTTPS.');
  }
}

function bindUi() {
  els.card.addEventListener('click', (event) => {
    if (event.target.closest('button')) return;
    requestSource('open');
  });

  els.card.addEventListener('keydown', (event) => {
    if (event.target !== els.card) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      requestSource('open');
    }
  });

  els.browseFile.addEventListener('click', (event) => {
    event.stopPropagation();
    browseGraphFile();
  });

  els.openFolder.addEventListener('click', (event) => {
    event.stopPropagation();
    requestSource('open');
  });

  els.openFile.addEventListener('click', () => els.fileInput.click());
  els.folderButton.addEventListener('click', () => requestGraphFolder());

  els.fileInput.addEventListener('change', () => {
    const [file] = els.fileInput.files || [];
    els.fileInput.value = '';
    if (file) openSingleFile(file);
  });

  els.folderInput.addEventListener('change', () => {
    const files = Array.from(els.folderInput.files || []);
    els.folderInput.value = '';
    const intent = pendingFolderIntent || 'open';
    pendingFolderIntent = null;

    if (!files.length) return;

    const source = new FileListSource(files);
    connectSource(source, { choose: intent === 'open' }).catch((error) => {
      failLoad(error.message);
    });
  });

  els.nodeSize.addEventListener('input', () => {
    settings.nodeSizeMultiplier = Number(els.nodeSize.value);
    updateRange(els.nodeSize, els.nodeSizeValue, formatMultiplier);
    applyNodeSize();
  });

  els.edgeSize.addEventListener('input', () => {
    settings.edgeSizeMultiplier = Number(els.edgeSize.value);
    updateRange(els.edgeSize, els.edgeSizeValue, formatMultiplier);
    applyEdgeSize();
  });

  els.confidenceMin.addEventListener('input', () => {
    const min = Number(els.confidenceMin.value);
    if (min > Number(els.confidenceMax.value)) {
      els.confidenceMax.value = String(min);
    }
    applyConfidenceRangeInputs();
  });

  els.confidenceMax.addEventListener('input', () => {
    const max = Number(els.confidenceMax.value);
    if (max < Number(els.confidenceMin.value)) {
      els.confidenceMin.value = String(max);
    }
    applyConfidenceRangeInputs();
  });

  els.confidenceRange.addEventListener('pointerdown', (event) => {
    if (event.target === els.confidenceMin || event.target === els.confidenceMax) {
      return;
    }

    const rect = els.confidenceRange.getBoundingClientRect();
    if (rect.width <= 0) return;

    const percent = Math.max(
      0,
      Math.min(100, Math.round(((event.clientX - rect.left) / rect.width) * 100))
    );
    const min = Number(els.confidenceMin.value);
    const max = Number(els.confidenceMax.value);
    const target = percent < (min + max) / 2 ? els.confidenceMin : els.confidenceMax;

    target.value = String(percent);
    applyConfidenceRangeInputs();
    target.focus();
  });

  els.showNodeLabels.addEventListener('change', () => {
    settings.showNodeLabels = els.showNodeLabels.checked;
    applyNodeLabels();
  });

  els.showEdgeLabels.addEventListener('change', () => {
    settings.showEdgeLabels = els.showEdgeLabels.checked;
    applyEdgeLabels();
  });

  els.tooltips.addEventListener('change', () => {
    settings.tooltips = els.tooltips.checked;
    if (!settings.tooltips) hideTooltip();
  });

  els.directed.addEventListener('change', () => {
    settings.directed = els.directed.checked;
    applyDirected();
  });

  els.highlightNeighbors.addEventListener('change', () => {
    settings.highlightNeighbors = els.highlightNeighbors.checked;
    if (!settings.highlightNeighbors) clearHighlight();
  });

  els.fitView.addEventListener('click', () => {
    fitGraph({ animate: true });
  });

  els.rearrange.addEventListener('click', () => runLayout(true));

  els.inspectorClose.addEventListener('click', closeInspector);

  els.inspectorResizer.addEventListener('pointerdown', startInspectorResize);
  els.inspectorResizer.addEventListener('dblclick', () => {
    els.inspector.style.removeProperty('height');
  });
  els.inspectorResizer.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown' && event.key !== 'Home') {
      return;
    }
    event.preventDefault();

    if (event.key === 'Home') {
      els.inspector.style.removeProperty('height');
      return;
    }

    const current = els.inspector.getBoundingClientRect().height;
    const next = current + (event.key === 'ArrowUp' ? 28 : -28);
    setInspectorHeight(next);
  });

  els.graphDialog.addEventListener('click', (event) => {
    if (event.target === els.graphDialog) els.graphDialog.close('cancel');
  });

  els.folderDialog.addEventListener('click', (event) => {
    if (event.target === els.folderDialog) els.folderDialog.close('cancel');
  });

  els.folderDialogChoose.addEventListener('click', () => {
    if (els.folderDialog.open) els.folderDialog.close('choose');
    requestGraphFolder();
  });

  els.dialogFilter.addEventListener('input', applyDialogFilter);
}

function bindDragAndDrop() {
  window.addEventListener('dragenter', (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth += 1;
    showDropTarget();
  });

  window.addEventListener('dragover', (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    showDropTarget();
  });

  window.addEventListener('dragleave', () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) hideDropTarget();
  });

  window.addEventListener('dragend', resetDrag);

  window.addEventListener('drop', (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    resetDrag();
    handleDrop(event).catch((error) => failLoad(error.message));
  });
}

function showDropTarget() {
  if (graphInfo) {
    els.dropVeil.hidden = false;
    requestAnimationFrame(() => els.dropVeil.classList.add('is-visible'));
  } else {
    els.card.classList.add('is-dragover');
  }
}

function hideDropTarget() {
  els.card.classList.remove('is-dragover');
  els.dropVeil.classList.remove('is-visible');
  setTimeout(() => {
    if (!els.dropVeil.classList.contains('is-visible')) els.dropVeil.hidden = true;
  }, 160);
}

function resetDrag() {
  dragDepth = 0;
  hideDropTarget();
}

function hasFiles(event) {
  return Boolean(
    event.dataTransfer && Array.from(event.dataTransfer.types || []).includes('Files')
  );
}

function readDirectoryEntries(reader) {
  return new Promise((resolve, reject) => {
    const entries = [];
    const readBatch = () => {
      reader.readEntries((batch) => {
        if (!batch.length) {
          resolve(entries);
          return;
        }
        entries.push(...batch);
        readBatch();
      }, reject);
    };
    readBatch();
  });
}

function readEntryFile(entry) {
  return new Promise((resolve, reject) => entry.file(resolve, reject));
}

async function collectEntryFiles(entry, path, files) {
  if (entry.isFile) {
    const file = await readEntryFile(entry);
    files.push({ file, path });
    return;
  }

  if (!entry.isDirectory) return;

  const entries = await readDirectoryEntries(entry.createReader());

  for (const child of entries) {
    if (child.name.startsWith('.')) continue;
    await collectEntryFiles(child, `${path}/${child.name}`, files);
  }
}

async function readDroppedDirectoryEntries(entries) {
  const files = [];

  for (const entry of entries) {
    if (!entry.isDirectory) continue;
    await collectEntryFiles(entry, entry.name, files);
  }

  return files;
}

async function handleDrop(event) {
  if (dropBusy) return;
  dropBusy = true;

  try {
    const dataTransfer = event.dataTransfer;
    const items = Array.from(dataTransfer.items || []).filter(
      (item) => item.kind === 'file'
    );

    // getAsFileSystemHandle must be called while the drop gesture is still active.
    const handlePromises = items.map((item) => {
      if (typeof item.getAsFileSystemHandle !== 'function') return null;
      try {
        return item.getAsFileSystemHandle();
      } catch {
        return null;
      }
    });

    const droppedEntries = items
      .map((item) => {
        if (typeof item.webkitGetAsEntry !== 'function') return null;
        try {
          return item.webkitGetAsEntry();
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const settled = await Promise.allSettled(handlePromises.filter(Boolean));
    const handles = settled
      .filter((result) => result.status === 'fulfilled' && result.value)
      .map((result) => result.value);

    const directory = handles.find((handle) => handle.kind === 'directory');
    if (directory) {
      const allowed = await ensureReadPermission(directory);

      if (allowed) {
        const source = new DirectorySource(directory);
        await connectSource(source, { choose: true });
        return;
      }

      if (!droppedEntries.some((entry) => entry.isDirectory)) {
        failLoad('Folder access was denied. Drop the folder again or use “Open test folder”.');
        return;
      }
    }

    if (droppedEntries.some((entry) => entry.isDirectory)) {
      try {
        const files = await readDroppedDirectoryEntries(droppedEntries);
        const source = new FileListSource(files);
        await connectSource(source, { choose: true });
        return;
      } catch (error) {
        failLoad(`Could not read the dropped folder: ${error.message}`);
        return;
      }
    }

    const entries = [];

    for (const handle of handles) {
      if (handle.kind !== 'file') continue;
      const allowed = await ensureReadPermission(handle);
      if (!allowed) continue;
      try {
        entries.push({ file: await handle.getFile(), handle });
      } catch {
        // Fall back to dataTransfer.files below.
      }
    }

    if (!entries.length) {
      entries.push(
        ...Array.from(dataTransfer.files || []).map((file) => ({ file, handle: null }))
      );
    }

    if (!entries.length) {
      failLoad(
        'That drop did not contain a readable file or folder. Use “Open test folder” instead.'
      );
      return;
    }

    await openDroppedFiles(entries);
  } finally {
    dropBusy = false;
  }
}

async function ensureReadPermission(handle) {
  if (typeof handle.queryPermission !== 'function') return true;

  try {
    const current = await handle.queryPermission({ mode: 'read' });
    if (current === 'granted') return true;
    if (typeof handle.requestPermission !== 'function') return false;
    const requested = await handle.requestPermission({ mode: 'read' });
    return requested === 'granted';
  } catch {
    return false;
  }
}

function openSingleFile(file) {
  if (!isJsonFile(file.name)) {
    failLoad('Choose a “.json” graph file.');
    return;
  }
  openDroppedFiles([{ file, handle: null }]).catch((error) => failLoad(error.message));
}

async function browseGraphFile() {
  if (typeof window.showOpenFilePicker === 'function' && window.isSecureContext) {
    let handles;

    try {
      handles = await window.showOpenFilePicker({
        id: 'cheating-graph-file',
        multiple: false,
        types: [
          {
            description: 'Graph JSON',
            accept: { 'application/json': ['.json'] }
          }
        ]
      });
    } catch (error) {
      if (error && error.name === 'AbortError') return;
      showToast(
        `Could not open the file picker: ${error && error.message ? error.message : 'unknown error'}`,
        'error'
      );
      return;
    }

    const [handle] = handles || [];

    if (!handle) return;

    try {
      await openDroppedFiles([{ file: await handle.getFile(), handle }]);
    } catch (error) {
      failLoad(error.message);
    }
    return;
  }

  els.fileInput.click();
}

async function openDroppedFiles(entries) {
  const candidates = entries.filter(({ file }) => isJsonFile(file.name));

  if (!candidates.length) {
    failLoad(
      'That drop did not contain a “.json” graph file. Use “Open test folder” to grant access to a whole folder.'
    );
    return;
  }

  const errors = [];

  for (const { file, handle } of candidates) {
    let source = null;
    let relPath = null;

    if (currentSource) {
      try {
        const sourceFiles = await currentSource.listGraphFiles();
        const matches = findGraphCandidates(sourceFiles, file.name);
        if (matches.length) {
          source = currentSource;
          relPath = matches[0].path;
        }
      } catch {
        // The source can be re-granted later if it is no longer readable.
      }
    }

    try {
      const parsed = await openFileContent(file, {
        source,
        relPath,
        fileHandle: handle
      });
      clearDropError();
      if (candidates.length > 1) {
        showToast(`Opened “${file.name}”.`, 'info');
      }
      notifyWarnings(parsed.warnings);
      return;
    } catch (error) {
      errors.push(`${file.name}: ${error.message}`);
    }
  }

  failLoad(errors[0] || 'Could not open the dropped file.');
}

async function openFileContent(file, options = {}) {
  if (file.size > MAX_GRAPH_FILE_SIZE) {
    throw new Error(
      `“${file.name}” is too large. The graph limit is ${MAX_GRAPH_FILE_SIZE / 1024 / 1024} MB.`
    );
  }

  let text;
  try {
    text = await file.text();
  } catch {
    throw new Error(`Could not read “${file.name}”.`);
  }

  let raw;
  try {
    raw = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch (error) {
    throw new Error(`Could not parse “${file.name}” as JSON: ${error.message}`);
  }

  const parsed = parseGraph(raw, stem(file.name));
  const source = options.source || null;
  const relPath = options.relPath || null;
  const fileHandle = options.fileHandle || null;

  setSourceState(source);
  graphInfo = {
    name: parsed.name,
    fileName: file.name,
    relPath,
    source,
    fileHandle,
    testFolder: parsed.testFolder,
    stats: parsed.stats,
    sourceMissingGraph: Boolean(source && !relPath)
  };

  renderGraph(parsed);

  if (!source) promptForFolderAccess();

  return parsed;
}

async function openFromSource(source, relPath) {
  const file = await source.read(relPath);

  if (file.size > MAX_GRAPH_FILE_SIZE) {
    throw new Error(
      `“${basename(relPath)}” is too large. The graph limit is ${
        MAX_GRAPH_FILE_SIZE / 1024 / 1024
      } MB.`
    );
  }

  return openFileContent(file, { source, relPath });
}

async function findGraphFiles(source, files) {
  const candidates = [];

  for (const file of files.slice(0, MAX_GRAPH_DISCOVERY_FILES)) {
    try {
      const blob = await source.read(file.path);
      if (blob.size > MAX_GRAPH_DISCOVERY_BYTES) continue;

      const text = await blob.text();
      const raw = JSON.parse(text.replace(/^\uFEFF/, ''));
      parseGraph(raw, stem(file.name));
      candidates.push(file);
    } catch {
      // Not a graph JSON; ignore it during discovery.
    }
  }

  return candidates;
}

async function selectGraphFile(source, files, preselectPath) {
  const graphFiles = await findGraphFiles(source, files);
  const candidates = graphFiles.length ? graphFiles : files;

  if (candidates.length === 1) return candidates[0];

  return chooseGraphFile(source, candidates, preselectPath);
}

async function connectSource(source, options = {}) {
  const choose = Boolean(options.choose);

  let files;
  try {
    files = await source.listGraphFiles();
  } catch (error) {
    failLoad(`Could not read “${source.name}”: ${error.message}`);
    return false;
  }

  if (!files.length) {
    failLoad(`No “.json” files were found in “${source.name}”.`);
    return false;
  }

  if (choose) {
    const selected = await selectGraphFile(
      source,
      files,
      graphInfo ? graphInfo.fileName : null
    );

    if (!selected) return false;

    try {
      const parsed = await openFromSource(source, selected.path);
      clearDropError();
      notifyWarnings(parsed.warnings);
      return true;
    } catch (error) {
      failLoad(error.message);
      return false;
    }
  }

  if (!graphInfo) {
    if (files.length === 1) {
      try {
        await openFromSource(source, files[0].path);
        return true;
      } catch (error) {
        failLoad(error.message);
        return false;
      }
    }

    const selected = await selectGraphFile(source, files, null);
    if (!selected) return false;

    try {
      await openFromSource(source, selected.path);
      return true;
    } catch (error) {
      failLoad(error.message);
      return false;
    }
  }

  setSourceState(source);

  const matches = findGraphCandidates(files, graphInfo.fileName);
  graphInfo.source = source;
  graphInfo.relPath = matches.length ? matches[0].path : null;
  graphInfo.sourceMissingGraph = matches.length === 0;

  updateFolderRow();
  refreshInspector();

  if (graphInfo.sourceMissingGraph) {
    showToast(
      `Connected to “${source.name}”, but “${graphInfo.fileName}” was not found there. Relative paths use the folder root.`,
      'warning'
    );
  } else {
    showToast(`Connected to “${source.name}”.`, 'info');
  }

  return true;
}

function setSourceState(source) {
  if (currentSource === source) return;

  currentSource = source;
  sourceGeneration += 1;
  fileCache.clear();
  correctionCache.clear();
  revokeObjectUrls();
}

function promptForFolderAccess() {
  if (!graphInfo || graphInfo.source) return;
  if (!graphInfo.stats.withExercises) return;
  if (els.folderDialog.open) return;

  els.folderDialogSubtitle.textContent = graphInfo.fileName;
  els.folderDialogCopy.textContent = graphInfo.testFolder
    ? `This graph reads its exercise files from its test folder (“${graphInfo.testFolder}”). Choose the folder that contains the whole test material, then you can open the exercises directly.`
    : 'Exercise files are read from the folder that contains this graph. Choose that folder to open them directly.';

  els.folderDialog.showModal();
}

function requestGraphFolder() {
  return requestSource('grant', {
    startIn: graphInfo && graphInfo.fileHandle ? graphInfo.fileHandle : null
  });
}

async function requestSource(intent, options = {}) {
  if (pickingSource) return;
  const startIn = options.startIn || null;
  pickingSource = true;
  els.folderButton.disabled = true;

  try {
    if (typeof window.showDirectoryPicker === 'function' && window.isSecureContext) {
      const pickerOptions = {
        id: 'cheating-graph-folder',
        mode: 'read'
      };

      if (startIn) pickerOptions.startIn = startIn;

      let handle;
      try {
        handle = await window.showDirectoryPicker(pickerOptions);
      } catch (error) {
        if (error.name === 'AbortError') return;
        if (error.name === 'SecurityError') {
          showToast(
            'Folder access needs http://localhost or HTTPS. Start the app with “npm start”.',
            'error'
          );
          return;
        }
        showToast(`Could not open the folder picker: ${error.message}`, 'error');
        return;
      }

      const source = new DirectorySource(handle);
      await connectSource(source, { choose: intent === 'open' });
      return;
    }

    pendingFolderIntent = intent;
    els.folderInput.click();
  } finally {
    pickingSource = false;
    els.folderButton.disabled = false;
  }
}

function chooseGraphFile(source, files, preselectPath) {
  return new Promise((resolve) => {
    let settled = false;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      els.graphDialog.removeEventListener('close', onClose);
      resolve(value);
    };

    const onClose = () => finish(null);

    els.graphDialog.addEventListener('close', onClose);
    els.graphDialogTitle.textContent = 'Choose a graph';
    els.graphDialogSubtitle.textContent = `${source.name} · ${formatCount(
      files.length,
      'JSON file'
    )}`;

    els.graphList.replaceChildren();

    const fragment = document.createDocumentFragment();
    let currentOption = null;

    for (const file of files) {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'graph-option';
      option.dataset.search = file.path.toLowerCase();

      const icon = document.createElement('span');
      icon.className = 'graph-option-icon';
      icon.textContent = '{ }';

      const copy = document.createElement('span');
      copy.className = 'graph-option-copy';

      const name = document.createElement('span');
      name.className = 'graph-option-name';
      name.textContent = file.name;

      const path = document.createElement('span');
      path.className = 'graph-option-path';
      path.textContent = file.path;

      copy.append(name, path);

      const go = document.createElement('span');
      go.className = 'graph-option-go';
      go.textContent = preselectPath === file.path ? 'Current' : 'Open';

      if (preselectPath === file.path) {
        option.classList.add('is-current');
        currentOption = option;
      }

      option.append(icon, copy, go);
      option.addEventListener('click', () => {
        finish(file);
        if (els.graphDialog.open) els.graphDialog.close('selected');
      });

      fragment.append(option);
    }

    els.graphList.append(fragment);

    const showFilter = files.length > 8;
    els.dialogFilterWrap.hidden = !showFilter;
    els.dialogFilter.value = '';
    els.graphDialogEmpty.hidden = true;
    applyDialogFilter();

    els.graphDialog.showModal();

    if (currentOption) {
      currentOption.scrollIntoView({ block: 'nearest' });
    } else if (showFilter) {
      els.dialogFilter.focus();
    } else {
      const first = els.graphList.querySelector('.graph-option');
      if (first) first.focus();
    }
  });
}

function applyDialogFilter() {
  const query = els.dialogFilter.value.trim().toLowerCase();
  const options = Array.from(els.graphList.querySelectorAll('.graph-option'));
  let visible = 0;

  for (const option of options) {
    const match = !query || option.dataset.search.includes(query);
    option.hidden = !match;
    if (match) visible += 1;
  }

  els.graphDialogEmpty.hidden = visible !== 0;
  if (visible === 0) {
    els.graphDialogEmpty.textContent = 'No JSON files match that filter.';
  }
}

function renderGraph(parsed) {
  if (typeof window.cytoscape !== 'function') {
    throw new Error('Cytoscape.js did not load. Make sure vendor/cytoscape.min.js is present.');
  }

  hideTooltip();
  closeInspector({ unselect: false });
  clearHighlight();

  if (cy) {
    cy.destroy();
    cy = null;
  }

  const elements = parsed.elements.map((element) => {
    if (element.data.source != null) {
      if (!isUsableColor(element.data.color)) element.data.color = DEFAULT_EDGE_COLOR;
    } else if (!isUsableColor(element.data.color)) {
      element.data.color = pickColor(element.data);
    }
    return element;
  });

  cy = window.cytoscape({
    container: els.cy,
    elements,
    style: CY_STYLE,
    wheelSensitivity: 0.9,
    minZoom: 0.05,
    maxZoom: 6,
    selectionType: 'single',
    boxSelectionEnabled: true
  });

  cy.resize();

  applyNodeLabels();
  applyEdgeLabels();
  applyDirected();
  applyConfidenceFilter();
  applyNodeSize();
  applyEdgeSize();
  bindCyEvents();

  els.graphName.textContent = graphInfo.name;
  els.graphName.title = graphInfo.name;
  updateGraphStats();
  updateFolderRow();

  els.panel.hidden = false;
  requestAnimationFrame(() => els.panel.classList.add('is-visible'));

  els.overlay.classList.add('is-hidden');
  els.overlay.setAttribute('aria-hidden', 'true');

  document.title = `${graphInfo.name} · Cheating Graph Viewer`;

  runInitialLayout();
  requestAnimationFrame(reapplyStyleOverrides);
}

function bindCyEvents() {
  cy.on('tapstart', () => {
    pointerDown = true;
    hideTooltip();
  });

  cy.on('tapend', () => {
    pointerDown = false;
    hideTooltip();
  });

  cy.on('grab', 'node, edge', () => {
    dragging = true;
    hideTooltip();
  });

  cy.on('free', 'node, edge', () => {
    dragging = false;
    hideTooltip();
  });

  cy.on('drag', 'node, edge', hideTooltip);
  cy.on('pan', hideTooltip);
  cy.on('zoom', hideTooltip);

  cy.on('mouseover', 'node', (event) => {
    showTooltip(event.target, event);
    if (!settings.highlightNeighbors) return;

    const node = event.target;
    cy.elements().addClass('faded');
    node.closedNeighborhood().removeClass('faded').addClass('highlighted');
  });

  cy.on('mouseover', 'edge', (event) => {
    showTooltip(event.target, event);
    if (!settings.highlightNeighbors) return;

    const edge = event.target;
    cy.elements().addClass('faded');
    edge.union(edge.connectedNodes()).removeClass('faded').addClass('highlighted');
  });

  cy.on('mousemove', 'node, edge', (event) => {
    positionTooltip(event.target, event);
  });

  cy.on('mouseout', 'node, edge', () => {
    hideTooltip();
    clearHighlight();
  });

  cy.on('tap', 'edge', (event) => {
    openInspector(event.target);
  });
}

function applyNodeSize() {
  if (!cy) return;

  cy.batch(() => {
    cy.nodes().forEach((node) => {
      const width = getNodeBaseWidth(node) * settings.nodeSizeMultiplier;
      const height = getNodeBaseHeight(node) * settings.nodeSizeMultiplier;
      const reference = Math.min(width, height);

      node.style({
        width,
        height,
        'font-size': Math.max(9, Math.min(18, Math.round(reference * 0.38))),
        'text-max-width': Math.max(48, Math.min(170, Math.round(width * 2.4))),
        'border-width': Math.max(1, Math.min(3, 2 * settings.nodeSizeMultiplier))
      });
    });
  });

  applyNodeStyleOverrides();
}

function applyEdgeSize() {
  if (!cy) return;

  cy.batch(() => {
    cy.edges().forEach((edge) => {
      const width = getEdgeWidth(edge);

      edge.style({
        width,
        'arrow-scale': Math.max(0.55, Math.min(0.85, width / 10))
      });
    });
  });

  applyEdgeStyleOverrides();
}

function applyDirected() {
  if (!cy) return;
  if (settings.directed) cy.edges().addClass('arrows');
  else cy.edges().removeClass('arrows');
}

function updateConfidenceRange() {
  const min = settings.confidenceMin;
  const max = settings.confidenceMax;

  els.confidenceRangeFill.style.left = `${min}%`;
  els.confidenceRangeFill.style.width = `${max - min}%`;
  els.confidenceRangeValue.textContent = `${min}–${max}%`;
  els.confidenceMin.setAttribute('aria-valuetext', `${min}%`);
  els.confidenceMax.setAttribute('aria-valuetext', `${max}%`);

  // Make sure each thumb stays reachable when the two values overlap.
  const minOnTop = min + max > 100;
  els.confidenceMin.style.zIndex = minOnTop ? '5' : '4';
  els.confidenceMax.style.zIndex = minOnTop ? '4' : '5';
}

function applyConfidenceRangeInputs() {
  settings.confidenceMin = Number(els.confidenceMin.value);
  settings.confidenceMax = Number(els.confidenceMax.value);
  updateConfidenceRange();
  applyConfidenceFilter();
}

function applyConfidenceFilter() {
  if (!cy) return;

  const min = settings.confidenceMin;
  const max = settings.confidenceMax;
  let selectedHidden = false;

  cy.batch(() => {
    cy.edges().forEach((edge) => {
      const confidence = getEdgeConfidence(edge);
      const percent = confidence == null ? null : Math.round(confidence * 100);
      // Edges with no confidence value stay visible: there is nothing to filter on.
      const hidden = percent != null && (percent < min || percent > max);

      if (hidden) {
        edge.addClass('confidence-hidden');
        if (edge.id() === currentEdgeId) selectedHidden = true;
      } else {
        edge.removeClass('confidence-hidden');
      }
    });
  });

  if (selectedHidden) closeInspector();
  updateGraphStats();
}

function applyNodeLabels() {
  if (!cy) return;
  if (settings.showNodeLabels) cy.nodes().addClass('show-labels');
  else cy.nodes().removeClass('show-labels');
}

function applyEdgeLabels() {
  if (!cy) return;
  if (settings.showEdgeLabels) cy.edges().addClass('show-labels');
  else cy.edges().removeClass('show-labels');
}

function applyNodeStyleOverrides() {
  if (!cy) return;

  cy.batch(() => {
    cy.nodes().forEach((node) => {
      const style = node.scratch('styleOverride');
      if (!isStyleObject(style)) return;

      try {
        node.style(style);
      } catch (error) {
        console.warn(`Ignoring invalid style override on node “${node.id()}”.`, error);
      }
    });
  });
}

function applyEdgeStyleOverrides() {
  if (!cy) return;

  cy.batch(() => {
    cy.edges().forEach((edge) => {
      const style = edge.scratch('styleOverride');
      if (!isStyleObject(style)) return;

      try {
        edge.style(style);
      } catch (error) {
        console.warn(`Ignoring invalid style override on edge “${edge.id()}”.`, error);
      }
    });
  });
}

function reapplyStyleOverrides() {
  applyNodeStyleOverrides();
  applyEdgeStyleOverrides();
}

function fitGraph(options = {}) {
  if (!cy || cy.elements().length === 0) return;

  const width = els.cy.clientWidth;
  const height = els.cy.clientHeight;
  const compact = window.innerWidth <= 760;
  const inspectorVisible = Boolean(currentEdgeId) && !compact;
  const panelVisible = !els.panel.hidden && !(compact && inspectorVisible);
  const panelRect = panelVisible ? els.panel.getBoundingClientRect() : null;
  const inspectorRect = inspectorVisible ? els.inspector.getBoundingClientRect() : null;

  const reservedRight = panelRect && !compact ? Math.min(width * 0.45, panelRect.width + 34) : 0;
  const reservedTop = panelRect && compact ? Math.min(height * 0.55, panelRect.height + 24) : 0;
  const reservedBottom = inspectorRect ? inspectorRect.height : 0;
  const padding = 70;
  const box = cy.elements().boundingBox({ includeLabels: true });

  const availableWidth = Math.max(160, width - reservedRight - padding * 2);
  const availableHeight = Math.max(
    160,
    height - reservedTop - reservedBottom - padding * 2
  );
  const zoom = Math.max(
    cy.minZoom(),
    Math.min(
      cy.maxZoom(),
      Math.min(availableWidth / Math.max(box.w, 1), availableHeight / Math.max(box.h, 1), 2.2)
    )
  );

  const pan = {
    x: (width - reservedRight) / 2 - (zoom * (box.x1 + box.x2)) / 2,
    y:
      reservedTop +
      (height - reservedTop - reservedBottom) / 2 -
      (zoom * (box.y1 + box.y2)) / 2
  };

  if (options.animate) {
    cy.animate({ zoom, pan }, { duration: 280, easing: 'ease-out' });
  } else {
    cy.zoom(zoom);
    cy.pan(pan);
  }
}

function getNodeBaseWidth(node) {
  const width = Number(node.scratch('baseWidth'));
  return Number.isFinite(width) && width > 0 ? width : DEFAULT_NODE_SIZE;
}

function getNodeBaseHeight(node) {
  const height = Number(node.scratch('baseHeight'));
  return Number.isFinite(height) && height > 0 ? height : DEFAULT_NODE_SIZE;
}

function getEdgeConfidence(edge) {
  const confidence = edge.scratch('confidence');
  return typeof confidence === 'number' && Number.isFinite(confidence)
    ? confidence
    : null;
}

function getEdgeWidth(edge) {
  const confidence = getEdgeConfidence(edge);
  const base =
    confidence != null
      ? MIN_CONFIDENCE_WIDTH +
        (MAX_CONFIDENCE_WIDTH - MIN_CONFIDENCE_WIDTH) * confidence
      : Math.max(1, Number(edge.scratch('baseWidth')) || DEFAULT_EDGE_WIDTH);

  return Math.max(0.8, base * settings.edgeSizeMultiplier);
}

function updateGraphStats() {
  if (!cy || !graphInfo) return;

  const exercises = countExercises(cy);
  const totalEdges = cy.edges().length;
  const hiddenEdges = cy.edges('.confidence-hidden').length;
  const edgeText =
    hiddenEdges > 0
      ? `${totalEdges - hiddenEdges} of ${formatCount(totalEdges, 'edge')}`
      : formatCount(totalEdges, 'edge');
  let text = `${formatCount(cy.nodes().length, 'node')} · ${edgeText}`;

  if (exercises > 0) text += ` · ${formatCount(exercises, 'exercise set')}`;

  els.graphStats.textContent = text;
  els.graphStats.title =
    hiddenEdges > 0
      ? `${graphInfo.fileName} · confidence filter hides ${formatCount(hiddenEdges, 'edge')}`
      : graphInfo.fileName;
}

function countExercises(collection) {
  let count = 0;

  collection.edges().forEach((edge) => {
    const exerciseIds = getExerciseIds(edge);
    if (exerciseIds) count += exerciseIds.length;
  });

  return count;
}

function updateFolderRow() {
  if (!graphInfo) {
    els.folderRow.hidden = true;
    return;
  }

  const exerciseSets = countExercises(cy || { edges: () => [] });
  const hasExercises = graphInfo.stats.withExercises > 0;

  if (!hasExercises) {
    els.folderRow.hidden = true;
    return;
  }

  els.folderRow.hidden = false;

  if (graphInfo.source) {
    els.folderRow.dataset.state = graphInfo.sourceMissingGraph ? 'warning' : 'connected';
    els.folderTitle.textContent = graphInfo.source.name;
    els.folderTitle.title = graphInfo.source.name;
    els.folderDetail.textContent = graphInfo.sourceMissingGraph
      ? 'Graph not found here · paths use the folder root'
      : `${formatCount(exerciseSets, 'exercise set')} · read-only`;
    els.folderButton.textContent = 'Change';
    els.folderButton.title = 'Choose a different folder';
  } else {
    els.folderRow.dataset.state = 'needed';
    els.folderTitle.textContent = 'Folder access needed';
    els.folderTitle.title = 'Grant read access to exercise files';
    els.folderDetail.textContent = graphInfo.testFolder
      ? `${formatCount(graphInfo.stats.withExercises, 'edge')} · select the test folder`
      : `${formatCount(graphInfo.stats.withExercises, 'edge')} with exercise files`;
    els.folderButton.textContent = 'Grant';
    els.folderButton.title = 'Grant read access to the test folder';
  }
}

function runInitialLayout() {
  if (!cy) return;

  const nodes = cy.nodes();
  const hasPositions =
    nodes.length > 0 &&
    nodes.every((node) => {
      const position = node.position();
      return (
        Number.isFinite(position.x) &&
        Number.isFinite(position.y) &&
        (position.x !== 0 || position.y !== 0)
      );
    });

  if (hasPositions) {
    cy.resize();
    fitGraph();
    requestAnimationFrame(reapplyStyleOverrides);
    return;
  }

  runLayout(false);
}

function runLayout(animate) {
  if (!cy) return;

  hideTooltip();
  const layoutCy = cy;
  els.rearrange.disabled = true;

  const layout = cy.layout({
    name: 'cose',
    animate,
    animationDuration: animate ? 650 : 0,
    fit: false,
    padding: 70,
    randomize: true,
    nodeRepulsion: 8000,
    idealEdgeLength: 90,
    componentSpacing: 110,
    nodeOverlap: 12,
    numIter: 1000
  });

  layout.one('layoutstop', () => {
    if (cy !== layoutCy) return;
    els.rearrange.disabled = false;
    fitGraph();
    reapplyStyleOverrides();
  });

  layout.run();
}

function openInspector(edge) {
  if (!edge || edge.removed()) return;

  hideTooltip();
  clearTimeout(inspectorHideTimer);

  currentEdgeId = edge.id();
  const exerciseIds = getExerciseIds(edge);
  currentExercise = exerciseIds ? exerciseIds[0] : null;

  cy.edges().forEach((otherEdge) => {
    if (otherEdge.id() !== edge.id()) {
      otherEdge.style({ 'underlay-opacity': 0, 'z-index': 0 });
    }
  });
  cy.edges().unselect();
  edge.select();
  edge.style({
    'underlay-color': '#78a9ff',
    'underlay-opacity': 0.2,
    'underlay-padding': 7,
    'z-index': 20
  });

  els.inspector.hidden = false;
  document.body.classList.add('inspector-open');
  requestAnimationFrame(() => els.inspector.classList.add('is-visible'));

  renderInspector();
}

function closeInspector(options = {}) {
  const edgeId = currentEdgeId;
  const unselect = options.unselect !== false;

  currentEdgeId = null;
  currentExercise = null;
  inspectorToken += 1;
  revokeObjectUrls();

  clearTimeout(inspectorHideTimer);
  els.inspector.classList.remove('is-visible');
  document.body.classList.remove('inspector-open');

  inspectorHideTimer = setTimeout(() => {
    if (!els.inspector.classList.contains('is-visible')) els.inspector.hidden = true;
  }, 240);

  if (unselect && edgeId && cy) {
    const edge = cy.getElementById(edgeId);
    if (edge && !edge.empty()) {
      edge.unselect();
      edge.style({ 'underlay-opacity': 0, 'z-index': 0 });
    }
  }

  hideTooltip();
}

function refreshInspector() {
  if (!currentEdgeId || els.inspector.hidden) return;
  renderInspector();
}

async function renderInspector() {
  if (!cy) return;

  const edge = cy.getElementById(currentEdgeId);
  if (!edge || edge.empty()) {
    closeInspector();
    return;
  }

  const token = ++inspectorToken;
  revokeObjectUrls();

  const data = edge.data();
  const source = String(data.source ?? '');
  const target = String(data.target ?? '');
  const confidence = getEdgeConfidence(edge);
  const hasConfidence = confidence != null;
  const exerciseIds = getExerciseIds(edge);

  if (exerciseIds && !exerciseIds.includes(currentExercise)) {
    currentExercise = exerciseIds[0];
  }

  const label = getElementLabel(edge);
  els.inspectorTitle.textContent = label || `${source} → ${target}`;
  els.inspectorTitle.title = label || `${source} → ${target}`;

  const exerciseCount = exerciseIds ? exerciseIds.length : 0;
  const metaParts = [`${source} → ${target}`, `id ${data.id}`];
  if (exerciseCount > 0) metaParts.push(formatCount(exerciseCount, 'exercise set'));
  els.inspectorMeta.textContent = metaParts.join(' · ');

  renderConfidenceBadge(hasConfidence ? confidence : null);

  renderExerciseTabs(exerciseIds);
  renderInspectorNotice();

  els.inspectorSplit.replaceChildren();
  els.inspectorSplit.hidden = true;
  els.inspectorEmpty.hidden = true;

  if (!exerciseIds) {
    showEmptyState({
      icon: 'file',
      title: 'No exercises on this edge',
      message:
        'Add an “exercises” array of exercise ids to the edge data to open the students’ answer files here.',
      sample: '"exercises": ["E1", "E2"]'
    });
    return;
  }

  if (!graphInfo || !graphInfo.source) {
    showEmptyState({
      icon: 'lock',
      title: 'Folder access needed',
      message: graphInfo && graphInfo.testFolder
        ? `The exercise files for “${graphInfo.fileName}” live in its test folder. Grant read access to the folder that contains the whole test material to open them here.`
        : `The exercise files for “${graphInfo ? graphInfo.fileName : 'this graph'}” live in its folder. Grant read access to that folder to open them here.`,
      actionLabel: 'Grant folder access',
      onAction: () => requestGraphFolder()
    });
    return;
  }

  els.inspectorEmpty.hidden = true;
  els.inspectorSplit.hidden = false;

  let filesByExercise;

  try {
    filesByExercise = await resolveExerciseFiles(edge, exerciseIds);
  } catch (error) {
    if (token !== inspectorToken) return;
    showEmptyState({
      icon: 'warning',
      title: 'Could not resolve exercise files',
      message: error && error.message ? error.message : String(error),
      actionLabel: 'Retry',
      onAction: () => renderInspector()
    });
    return;
  }

  if (token !== inspectorToken) return;

  const entry = filesByExercise[currentExercise] || [];
  renderPanes(entry, token);
}

function renderConfidenceBadge(confidence) {
  const badge = els.inspectorConfidence;
  badge.replaceChildren();

  if (confidence == null) {
    badge.classList.add('is-unknown');
    badge.title = 'This edge has no confidence value';
    const text = document.createElement('span');
    text.className = 'confidence-value';
    text.textContent = 'No confidence';
    badge.append(text);
    return;
  }

  badge.classList.remove('is-unknown');
  badge.title = `Confidence ${confidence} (${Math.round(confidence * 100)}%)`;

  const track = document.createElement('span');
  track.className = 'confidence-track';

  const fill = document.createElement('span');
  fill.className = 'confidence-fill';
  fill.style.width = `${Math.max(2, Math.round(confidence * 100))}%`;

  track.append(fill);

  const value = document.createElement('span');
  value.className = 'confidence-value';
  value.textContent = `${Math.round(confidence * 100)}%`;

  badge.append(track, value);
}

function renderExerciseTabs(exerciseIds) {
  els.exerciseTabs.replaceChildren();

  if (!exerciseIds || exerciseIds.length === 0) {
    els.exerciseTabs.hidden = true;
    return;
  }

  if (exerciseIds.length <= 1) {
    els.exerciseTabs.hidden = true;
    return;
  }

  els.exerciseTabs.hidden = false;

  for (const name of exerciseIds) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'exercise-tab';
    button.setAttribute('role', 'tab');
    button.textContent = name;
    button.title = name;
    button.setAttribute('aria-selected', String(name === currentExercise));

    if (name === currentExercise) button.classList.add('is-active');

    button.addEventListener('click', () => {
      if (currentExercise === name) return;
      currentExercise = name;
      renderInspector();
    });

    els.exerciseTabs.append(button);
  }
}

function renderInspectorNotice() {
  els.inspectorNotice.replaceChildren();
  els.inspectorNotice.hidden = true;

  if (!graphInfo || !graphInfo.source || !graphInfo.sourceMissingGraph) return;

  els.inspectorNotice.hidden = false;

  const icon = createIcon('warning');
  icon.classList.add('notice-icon');

  const copy = document.createElement('p');
  copy.className = 'notice-copy';
  copy.textContent = `“${graphInfo.fileName}” was not found in “${graphInfo.source.name}”. Relative paths are resolved from the folder root.`;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'ghost-button small';
  button.textContent = 'Change folder';
  button.addEventListener('click', () => requestGraphFolder());

  els.inspectorNotice.append(icon, copy, button);
}

function showEmptyState({ icon, title, message, sample, actionLabel, onAction }) {
  els.inspectorEmpty.replaceChildren();
  els.inspectorEmpty.hidden = false;
  els.inspectorSplit.hidden = true;

  const iconWrap = document.createElement('div');
  iconWrap.className = 'empty-icon';
  iconWrap.append(createIcon(icon));

  const heading = document.createElement('h3');
  heading.textContent = title;

  const paragraph = document.createElement('p');
  paragraph.textContent = message;

  els.inspectorEmpty.append(iconWrap, heading, paragraph);

  if (sample) {
    const pre = document.createElement('pre');
    pre.className = 'empty-sample';
    const code = document.createElement('code');
    code.textContent = sample;
    pre.append(code);
    els.inspectorEmpty.append(pre);
  }

  if (actionLabel && onAction) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'primary-button compact';
    button.textContent = actionLabel;
    button.addEventListener('click', onAction);
    els.inspectorEmpty.append(button);
  }
}

function renderPanes(files, token) {
  els.inspectorSplit.replaceChildren();
  els.inspectorSplit.hidden = false;

  if (!Array.isArray(files) || files.length === 0) {
    showEmptyState({
      icon: 'file',
      title: 'This exercise has no files',
      message:
        'No answer files were found. Check the students’ correction files for this exercise id.'
    });
    return;
  }

  els.inspectorSplit.dataset.count = String(files.length);

  for (const relativePath of files) {
    const pane = createFilePane(relativePath);
    els.inspectorSplit.append(pane.article);

    let resolvedPath;
    try {
      resolvedPath = resolveExercisePath(relativePath);
    } catch (error) {
      showPaneError(pane, error, relativePath);
      continue;
    }

    pane.resolvedPath = resolvedPath;
    loadPane(pane, relativePath, resolvedPath, token);
  }
}

function createFilePane(relativePath) {
  const article = document.createElement('article');
  article.className = 'file-pane';
  article.dataset.path = relativePath;

  const head = document.createElement('header');
  head.className = 'file-pane-head';

  const kind = document.createElement('span');
  kind.className = 'file-kind';
  kind.textContent = fileKindLabel(relativePath);

  const titleWrap = document.createElement('div');
  titleWrap.className = 'file-title-wrap';

  const name = document.createElement('h3');
  name.className = 'file-name';
  name.textContent = basename(relativePath);
  name.title = relativePath;

  const path = document.createElement('p');
  path.className = 'file-path';
  path.textContent = relativePath;
  path.title = relativePath;

  const meta = document.createElement('p');
  meta.className = 'file-meta';
  meta.textContent = 'Loading…';

  titleWrap.append(name, path, meta);

  const actions = document.createElement('div');
  actions.className = 'file-actions';

  const copyButton = document.createElement('button');
  copyButton.type = 'button';
  copyButton.className = 'icon-button';
  copyButton.title = 'Copy file contents';
  copyButton.setAttribute('aria-label', 'Copy file contents');
  copyButton.disabled = true;
  copyButton.append(createIcon('copy'));

  const reloadButton = document.createElement('button');
  reloadButton.type = 'button';
  reloadButton.className = 'icon-button';
  reloadButton.title = 'Reload file';
  reloadButton.setAttribute('aria-label', 'Reload file');
  reloadButton.append(createIcon('reload'));

  actions.append(copyButton, reloadButton);

  head.append(kind, titleWrap, actions);

  const body = document.createElement('div');
  body.className = 'file-pane-body';

  article.append(head, body);

  const pane = {
    article,
    body,
    meta,
    copyButton,
    reloadButton,
    text: null,
    resolvedPath: null
  };

  copyButton.addEventListener('click', () => {
    if (pane.text == null) return;
    copyText(pane.text, basename(relativePath));
  });

  reloadButton.addEventListener('click', () => {
    if (!pane.resolvedPath) return;
    fileCache.delete(cacheKey(pane.resolvedPath));
    renderInspector();
  });

  body.append(renderSkeleton());

  return pane;
}

function renderSkeleton() {
  const skeleton = document.createElement('div');
  skeleton.className = 'code-skeleton';
  skeleton.setAttribute('aria-hidden', 'true');

  for (let i = 0; i < 9; i += 1) {
    const line = document.createElement('span');
    line.style.width = `${42 + ((i * 17) % 50)}%`;
    skeleton.append(line);
  }

  const label = document.createElement('span');
  label.className = 'sr-only';
  label.textContent = 'Loading file…';
  skeleton.append(label);

  return skeleton;
}

async function loadPane(pane, relativePath, resolvedPath, token) {
  let file;

  try {
    file = await readSourceFile(resolvedPath);
  } catch (error) {
    if (token === inspectorToken) showPaneError(pane, error, relativePath);
    return;
  }

  if (token !== inspectorToken) return;

  pane.meta.textContent = formatBytes(file.size);

  if (isImagePath(resolvedPath)) {
    renderImagePane(pane, file, resolvedPath, token);
    return;
  }

  if (file.size === 0) {
    renderEmptyFile(pane);
    return;
  }

  let binary = false;
  try {
    const head = new Uint8Array(await file.slice(0, 8192).arrayBuffer());
    binary = head.includes(0);
  } catch {
    binary = false;
  }

  if (token !== inspectorToken) return;

  if (binary) {
    renderBinaryFile(pane, file, resolvedPath);
    return;
  }

  const truncated = file.size > MAX_PREVIEW_BYTES;
  const slice = truncated ? file.slice(0, MAX_PREVIEW_BYTES) : file;

  let text;
  try {
    text = (await slice.text()).replace(/^\uFEFF/, '');
  } catch (error) {
    if (token === inspectorToken) {
      showPaneError(pane, error, relativePath);
    }
    return;
  }

  if (token !== inspectorToken) return;

  pane.text = text;
  pane.copyButton.disabled = false;
  pane.copyButton.title = truncated ? 'Copy preview contents' : 'Copy file contents';

  const lines = text ? text.split('\n').length : 0;
  const highlighted = text.length <= MAX_HIGHLIGHT_CHARS;

  pane.meta.textContent = [
    formatBytes(file.size),
    formatCount(lines, 'line'),
    highlighted ? null : 'plain preview'
  ]
    .filter(Boolean)
    .join(' · ');

  pane.body.replaceChildren();

  if (truncated) {
    pane.body.append(
      makeBanner(
        `Preview limited to ${formatBytes(MAX_PREVIEW_BYTES)} of ${formatBytes(
          file.size
        )}. The file is read-only.`
      )
    );
  }

  const scroll = document.createElement('div');
  scroll.className = 'code-scroll';

  const pre = document.createElement('pre');
  pre.className = 'code';
  pre.tabIndex = 0;

  const code = document.createElement('code');
  code.innerHTML = highlightCode(text, resolvedPath, MAX_HIGHLIGHT_CHARS);

  pre.append(code);
  scroll.append(pre);
  pane.body.append(scroll);
}

function renderImagePane(pane, file, resolvedPath, token) {
  const url = URL.createObjectURL(file);
  objectUrls.add(url);

  if (token !== inspectorToken) {
    URL.revokeObjectURL(url);
    objectUrls.delete(url);
    return;
  }

  pane.meta.textContent = `${formatBytes(file.size)} · image`;
  pane.body.replaceChildren();

  const wrap = document.createElement('div');
  wrap.className = 'image-preview';

  const image = document.createElement('img');
  image.src = url;
  image.alt = `Preview of ${basename(resolvedPath)}`;
  image.loading = 'lazy';

  image.addEventListener('error', () => {
    if (token !== inspectorToken) return;
    renderPaneState(pane, {
      icon: 'file',
      title: 'Could not display this image',
      message: resolvedPath
    });
  });

  wrap.append(image);
  pane.body.append(wrap);
}

function renderEmptyFile(pane) {
  pane.body.replaceChildren();
  pane.meta.textContent = '0 B · empty file';

  const state = document.createElement('div');
  state.className = 'pane-state';
  state.append(createIcon('file'));

  const heading = document.createElement('h3');
  heading.textContent = 'Empty file';
  const message = document.createElement('p');
  message.textContent = 'This file exists but has no contents.';

  state.append(heading, message);
  pane.body.append(state);
}

function renderBinaryFile(pane, file, resolvedPath) {
  pane.body.replaceChildren();

  const state = document.createElement('div');
  state.className = 'pane-state';
  state.append(createIcon('file'));

  const heading = document.createElement('h3');
  heading.textContent = 'Binary file';
  const message = document.createElement('p');
  message.textContent = `${basename(resolvedPath)} is ${formatBytes(
    file.size
  )} and cannot be shown as text.`;

  state.append(heading, message);
  pane.body.append(state);
}

function showPaneError(pane, error, relativePath) {
  let title = 'Could not read file';
  let message = error && error.message ? error.message : String(error);
  let showGrant = false;

  if (error instanceof PathError) {
    title = 'Invalid path';
  } else if (error instanceof SourceError) {
    if (error.code === 'not-found') {
      title = 'File not found';
    } else if (error.code === 'permission') {
      title = 'Folder access needed';
      showGrant = true;
    }
  } else if (!graphInfo || !graphInfo.source) {
    title = 'Folder access needed';
    showGrant = true;
  }

  pane.meta.textContent = '';
  pane.copyButton.disabled = true;

  renderPaneState(pane, {
    icon: showGrant ? 'lock' : 'warning',
    title,
    message,
    path: relativePath,
    actions: [
      {
        label: 'Retry',
        onClick: () => renderInspector()
      },
      {
        label: showGrant ? 'Grant access' : 'Change folder',
        primary: showGrant,
        onClick: () => requestGraphFolder()
      }
    ]
  });
}

function renderPaneState(pane, options) {
  pane.body.replaceChildren();

  const state = document.createElement('div');
  state.className = 'pane-state';

  const icon = createIcon(options.icon || 'warning');
  state.append(icon);

  const heading = document.createElement('h3');
  heading.textContent = options.title;
  state.append(heading);

  const message = document.createElement('p');
  message.textContent = options.message;
  state.append(message);

  if (options.path) {
    const path = document.createElement('code');
    path.className = 'pane-state-path';
    path.textContent = options.path;
    state.append(path);
  }

  if (options.actions && options.actions.length) {
    const actions = document.createElement('div');
    actions.className = 'pane-state-actions';

    for (const action of options.actions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = action.primary ? 'primary-button compact' : 'ghost-button small';
      button.textContent = action.label;
      button.addEventListener('click', action.onClick);
      actions.append(button);
    }

    state.append(actions);
  }

  pane.body.append(state);
}

function resolveExercisePath(relativePath) {
  if (!graphInfo || !graphInfo.source) {
    throw new SourceError(
      'permission',
      'Grant read access to the folder that contains the test material to open its exercises.'
    );
  }

  return resolveFrom(getExerciseBaseDirectory(), relativePath);
}

function getExerciseBaseDirectory() {
  if (!graphInfo) return '';

  const graphDirectory = graphInfo.relPath ? dirname(graphInfo.relPath) : '';

  if (!graphInfo.testFolder) return graphDirectory;

  try {
    return resolveDirectoryFrom(graphDirectory, graphInfo.testFolder);
  } catch (error) {
    if (error instanceof PathError) {
      throw new SourceError(
        'permission',
        `The test folder “${graphInfo.testFolder}” is outside “${graphInfo.source.name}”. Grant access to the folder that contains the test material.`
      );
    }
    throw error;
  }
}

function readSourceFile(path) {
  if (!currentSource) {
    return Promise.reject(
      new SourceError(
        'permission',
        'Grant read access to the folder that contains the test material to open its exercises.'
      )
    );
  }

  const key = cacheKey(path);
  let promise = fileCache.get(key);

  if (!promise) {
    promise = currentSource.read(path);
    fileCache.set(key, promise);
    promise.catch(() => fileCache.delete(key));
  }

  return promise;
}

function cacheKey(path) {
  return `${sourceGeneration}:${path}`;
}

function getExerciseIds(edge) {
  const exercises = edge.data('exercises');

  if (Array.isArray(exercises)) {
    const ids = exercises
      .filter((id) => typeof id === 'string' && id.trim() !== '')
      .map((id) => id.trim());
    return ids.length ? ids : null;
  }

  if (!isStyleObject(exercises)) return null;

  const names = Object.entries(exercises)
    .filter(([name, files]) => name && Array.isArray(files) && files.length > 0)
    .map(([name]) => name);

  return names.length ? names : null;
}

async function resolveExerciseFiles(edge, exerciseIds) {
  const exercises = edge.data('exercises');

  // Legacy format: the edge already stores the explicit file paths.
  if (isStyleObject(exercises)) {
    return Object.fromEntries(
      Object.entries(exercises).filter(
        ([name, files]) => name && Array.isArray(files) && files.length > 0
      )
    );
  }

  const filesByExercise = Object.fromEntries(
    exerciseIds.map((exerciseId) => [exerciseId, []])
  );
  const studentIds = [
    ...new Set(
      [edge.data('source'), edge.data('target')]
        .filter((value) => value != null && String(value).trim() !== '')
        .map((value) => String(value).trim())
    )
  ];

  for (const studentId of studentIds) {
    const correction = await loadCorrection(studentId);
    if (!correction || !isStyleObject(correction.exercises)) continue;

    const answerFolder =
      typeof correction['answer-folder'] === 'string'
        ? correction['answer-folder'].trim()
        : '';
    let baseFolder;

    try {
      baseFolder = answerFolder
        ? resolveDirectoryFrom(CORRECTIONS_DIRECTORY, answerFolder)
        : CORRECTIONS_DIRECTORY;
    } catch (error) {
      throw new SourceError(
        'io',
        `Invalid answer folder in “${studentId}.json”: ${error.message}`
      );
    }

    for (const exerciseId of exerciseIds) {
      const entry = correction.exercises[exerciseId];
      if (!entry || !isStyleObject(entry)) continue;

      const answerFile =
        typeof entry['answer-file'] === 'string' ? entry['answer-file'].trim() : '';
      if (!answerFile) continue;

      try {
        filesByExercise[exerciseId].push(resolveFrom(baseFolder, answerFile));
      } catch (error) {
        throw new SourceError(
          'io',
          `Invalid answer file for exercise “${exerciseId}” in “${studentId}.json”: ${error.message}`
        );
      }
    }
  }

  return filesByExercise;
}

async function loadCorrection(studentId) {
  const key = String(studentId);

  if (correctionCache.has(key)) return correctionCache.get(key);

  const relativePath = `${CORRECTIONS_DIRECTORY}/${key}.json`;
  const resolvedPath = resolveExercisePath(relativePath);
  const file = await readSourceFile(resolvedPath);

  let text;
  try {
    text = await file.text();
  } catch {
    throw new SourceError('io', `Could not read correction “${relativePath}”.`, {
      path: relativePath
    });
  }

  let parsed;
  try {
    parsed = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch (error) {
    throw new SourceError(
      'io',
      `Could not parse correction “${relativePath}”: ${error.message}`,
      { path: relativePath }
    );
  }

  if (!isStyleObject(parsed)) {
    throw new SourceError(
      'io',
      `Correction “${relativePath}” must contain a JSON object.`,
      { path: relativePath }
    );
  }

  correctionCache.set(key, parsed);
  return parsed;
}

function getElementLabel(element) {
  const styleLabel = element.style('label');

  if (styleLabel != null) {
    const text = String(styleLabel).trim();
    if (text && !text.startsWith('data(')) return text;
  }

  const dataLabel = element.data('label');

  if (dataLabel != null) {
    const text = String(dataLabel).trim();
    if (text) return text;
  }

  return '';
}

function showTooltip(element, event) {
  if (
    !settings.tooltips ||
    pointerDown ||
    dragging ||
    !element ||
    element.removed() ||
    !graphInfo
  ) {
    return;
  }

  const data = element.data();
  const isEdge = element.isEdge();
  const source = data.source == null ? '' : String(data.source);
  const target = data.target == null ? '' : String(data.target);
  const fallback = isEdge ? `${source} → ${target}` : String(data.id ?? '');
  const label = getElementLabel(element);
  const title = label || fallback;
  const meta = [];
  const extra = [];

  if (isEdge) {
    const confidence = getEdgeConfidence(element);

    if (confidence != null) {
      meta.push(`Confidence ${Math.round(confidence * 100)}%`);
    } else {
      meta.push('No confidence value');
    }

    const exerciseIds = getExerciseIds(element);
    if (exerciseIds) {
      meta.push(formatCount(exerciseIds.length, 'exercise set'));
      extra.push(
        `Exercises: ${exerciseIds.slice(0, 4).join(', ')}${exerciseIds.length > 4 ? '…' : ''}`
      );
    } else {
      meta.push('No exercises');
    }
  } else {
    meta.push(`Node · ${data.id}`);
    if (data.group != null) meta.push(String(data.group));
  }

  els.tooltip.replaceChildren();

  const titleEl = document.createElement('div');
  titleEl.className = 'tooltip-title';
  titleEl.textContent = title;

  const metaEl = document.createElement('div');
  metaEl.className = 'tooltip-meta';
  metaEl.textContent = meta.join(' · ');

  els.tooltip.append(titleEl, metaEl);

  if (extra.length) {
    const extraEl = document.createElement('div');
    extraEl.className = 'tooltip-extra';
    extraEl.textContent = extra.join(' · ');
    els.tooltip.append(extraEl);
  }

  tooltipActive = true;
  clearTimeout(tooltipHideTimer);
  els.tooltip.hidden = false;
  positionTooltip(element, event);

  requestAnimationFrame(() => {
    if (tooltipActive) els.tooltip.classList.add('is-visible');
  });
}

function positionTooltip(element, event) {
  if (!tooltipActive || els.tooltip.hidden || !cy) return;

  const native = event && event.originalEvent;
  let x;
  let y;

  if (
    native &&
    Number.isFinite(native.clientX) &&
    Number.isFinite(native.clientY)
  ) {
    x = native.clientX;
    y = native.clientY;
  } else {
    const position = elementRenderedCenter(element);
    x = position.x;
    y = position.y;
  }

  const offset = 14;
  const rect = els.tooltip.getBoundingClientRect();
  let left = x + offset;
  let top = y + offset;

  if (left + rect.width > window.innerWidth - 8) {
    left = x - rect.width - offset;
  }
  if (top + rect.height > window.innerHeight - 8) {
    top = y - rect.height - offset;
  }

  els.tooltip.style.left = `${Math.max(8, left)}px`;
  els.tooltip.style.top = `${Math.max(8, top)}px`;
}

function elementRenderedCenter(element) {
  if (element.isEdge()) {
    const point = element.midpoint();
    const zoom = cy.zoom();
    const pan = cy.pan();

    return {
      x: point.x * zoom + pan.x,
      y: point.y * zoom + pan.y
    };
  }

  return element.renderedPosition();
}

function hideTooltip() {
  tooltipActive = false;

  if (!els.tooltip || els.tooltip.hidden) return;

  els.tooltip.classList.remove('is-visible');
  clearTimeout(tooltipHideTimer);
  tooltipHideTimer = setTimeout(() => {
    if (!tooltipActive) els.tooltip.hidden = true;
  }, 120);
}

function clearHighlight() {
  if (cy) cy.elements().removeClass('faded highlighted');
}

function startInspectorResize(event) {
  if (window.matchMedia('(max-width: 760px)').matches) return;
  if (event.button != null && event.button !== 0) return;

  event.preventDefault();

  const startY = event.clientY;
  const startHeight = els.inspector.getBoundingClientRect().height;
  els.inspector.classList.add('is-resizing');

  const onMove = (moveEvent) => {
    const height = startHeight + (startY - moveEvent.clientY);
    setInspectorHeight(height);
  };

  const onUp = () => {
    els.inspector.classList.remove('is-resizing');
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  };

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}

function setInspectorHeight(height) {
  const max = Math.max(280, window.innerHeight - 110);
  const clamped = Math.max(250, Math.min(max, height));
  els.inspector.style.height = `${Math.round(clamped)}px`;
}

function clampInspectorHeight() {
  if (!els.inspector.style.height) return;

  const height = Number.parseFloat(els.inspector.style.height);
  if (!Number.isFinite(height)) return;

  const max = Math.max(280, window.innerHeight - 110);
  if (height > max) els.inspector.style.height = `${Math.round(max)}px`;
}

async function copyText(text, label) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(`${label} copied to the clipboard.`, 'info');
    return;
  } catch {
    // Fall through to the legacy path for browsers without clipboard permission.
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.append(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
    showToast(`${label} copied to the clipboard.`, 'info');
  } catch {
    showToast('Could not copy to the clipboard.', 'error');
  }
}

function revokeObjectUrls() {
  for (const url of objectUrls) URL.revokeObjectURL(url);
  objectUrls.clear();
}

function createIcon(name) {
  const template = document.createElement('template');
  template.innerHTML = ICONS[name] || ICONS.file;
  return template.content.firstElementChild;
}

function makeBanner(text) {
  const banner = document.createElement('div');
  banner.className = 'file-banner';
  banner.textContent = text;
  return banner;
}

function notifyWarnings(warnings) {
  if (!warnings || warnings.length === 0) return;

  for (const warning of warnings) console.warn(warning);

  const extra = warnings.length > 1 ? ` (+${warnings.length - 1} more)` : '';
  showToast(`Loaded with warnings: ${warnings[0]}${extra}`, 'warning');
}

function failLoad(message) {
  if (!graphInfo) showDropError(message);
  showToast(message, 'error');
}

function showDropError(message) {
  els.dropError.textContent = message;
  els.dropError.hidden = false;
}

function clearDropError() {
  els.dropError.textContent = '';
  els.dropError.hidden = true;
}

function showToast(message, kind = 'info') {
  clearTimeout(toastTimer);
  clearTimeout(toastHideTimer);

  els.toast.textContent = message;
  els.toast.dataset.kind = kind;
  els.toast.hidden = false;
  requestAnimationFrame(() => els.toast.classList.add('is-visible'));

  toastTimer = setTimeout(() => {
    els.toast.classList.remove('is-visible');
    toastHideTimer = setTimeout(() => {
      els.toast.hidden = true;
    }, 220);
  }, 5200);
}

function updateRange(input, output, formatter = formatNumber) {
  const value = Number(input.value);
  const min = Number(input.min);
  const max = Number(input.max);
  const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;

  input.style.setProperty('--fill', `${percent}%`);
  if (output) output.textContent = formatter(value);
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatMultiplier(value) {
  return `${value.toFixed(1)}×`;
}

function formatCount(count, noun) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return 'unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fileKindLabel(path) {
  const extension = extensionOf(path);
  if (!extension) return 'FILE';
  return extension.slice(0, 4).toUpperCase();
}

function isJsonFile(name) {
  return String(name).toLowerCase().endsWith('.json');
}

function stem(name) {
  return String(name).replace(/\.[^.]+$/, '') || String(name);
}

function pickColor(data) {
  const key = String(data.group ?? data.id ?? '');
  let hash = 0;

  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }

  return PALETTE[hash % PALETTE.length];
}

function isUsableColor(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return true;
  return CSS.supports('color', value);
}

function isStyleObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}
