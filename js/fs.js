const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.hg',
  '.svn',
  'node_modules',
  'bower_components',
  'vendor',
  'dist',
  'build',
  'target',
  'coverage',
  '.next',
  '.nuxt',
  '.cache'
]);

const MAX_LIST_DEPTH = 6;
const MAX_LIST_FILES = 500;

export class PathError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PathError';
    this.code = 'invalid-path';
  }
}

export class SourceError extends Error {
  constructor(code, message, options = {}) {
    super(message);
    this.name = 'SourceError';
    this.code = code;
    this.path = options.path || null;
  }
}

/**
 * Normalize a path relative to the granted folder.
 * Throws if the path is absolute or escapes the folder with “..”.
 */
export function normalizeRelativePath(input) {
  if (typeof input !== 'string') {
    throw new PathError('The file path must be a string.');
  }

  const raw = input.trim().replace(/\\/g, '/');

  if (!raw) {
    throw new PathError('The file path is empty.');
  }
  if (raw.includes('\0')) {
    throw new PathError('The file path contains an invalid character.');
  }
  if (raw.startsWith('/') || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) {
    throw new PathError('Absolute paths are not allowed. Use a path relative to the graph file.');
  }

  const parts = [];

  for (const segment of raw.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      if (parts.length === 0) {
        throw new PathError('The path points outside the granted folder.');
      }
      parts.pop();
      continue;
    }
    parts.push(segment);
  }

  if (parts.length === 0) {
    throw new PathError('The file path does not name a file.');
  }

  return parts.join('/');
}

/**
 * Resolve an exercise path against the directory that contains the graph file.
 * Absolute and scheme-based paths are rejected before the base is joined, so
 * “/etc/passwd” cannot be mistaken for a path inside the folder.
 */
export function resolveFrom(baseDirectory, relativePath) {
  if (typeof relativePath !== 'string') {
    throw new PathError('The file path must be a string.');
  }

  const rawRelative = relativePath.trim().replace(/\\/g, '/');

  if (!rawRelative) {
    throw new PathError('The file path is empty.');
  }
  if (
    rawRelative.startsWith('/') ||
    /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(rawRelative)
  ) {
    throw new PathError('Absolute paths are not allowed. Use a path relative to the graph file.');
  }

  const base = baseDirectory ? normalizeRelativePath(baseDirectory) : '';
  const combined = base ? `${base}/${rawRelative}` : rawRelative;
  return normalizeRelativePath(combined);
}

/**
 * Resolve a directory path against another directory in the granted folder.
 * Unlike resolveFrom, a “..” segment may resolve to the folder root, and “.”
 * names the base directory itself.
 */
export function resolveDirectoryFrom(baseDirectory, relativePath) {
  if (typeof relativePath !== 'string') {
    throw new PathError('The folder path must be a string.');
  }

  const rawRelative = relativePath.trim().replace(/\\/g, '/');

  if (!rawRelative) {
    throw new PathError('The folder path is empty.');
  }
  if (
    rawRelative.startsWith('/') ||
    /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(rawRelative)
  ) {
    throw new PathError('Absolute paths are not allowed. Use a path relative to the graph file.');
  }

  let base = '';
  if (baseDirectory) {
    const rawBase = String(baseDirectory).trim().replace(/\\/g, '/');
    if (rawBase && rawBase !== '.') {
      base = normalizeRelativePath(rawBase);
    }
  }

  const combined = base ? `${base}/${rawRelative}` : rawRelative;
  const parts = [];

  for (const segment of combined.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      if (parts.length === 0) {
        throw new PathError('The path points outside the granted folder.');
      }
      parts.pop();
      continue;
    }
    parts.push(segment);
  }

  return parts.join('/');
}

export function dirname(path) {
  const parts = String(path).replace(/\\/g, '/').split('/').filter(Boolean);
  parts.pop();
  return parts.join('/');
}

export function basename(path) {
  const parts = String(path).replace(/\\/g, '/').split('/').filter(Boolean);
  return parts.length ? parts[parts.length - 1] : String(path);
}

export function extensionOf(path) {
  const name = basename(path);
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}

export function isImagePath(path) {
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg', 'bmp', 'ico'].includes(
    extensionOf(path)
  );
}

function compareGraphFiles(a, b) {
  const depthA = a.path.split('/').length;
  const depthB = b.path.split('/').length;
  return depthA - depthB || a.path.localeCompare(b.path);
}

function mapReadError(error, path) {
  if (error instanceof SourceError || error instanceof PathError) return error;

  switch (error && error.name) {
    case 'NotFoundError':
    case 'TypeMismatchError':
      return new SourceError('not-found', `File not found in the folder: ${path}`, { path });
    case 'NotAllowedError':
    case 'SecurityError':
      return new SourceError(
        'permission',
        'Folder access was denied or revoked. Grant access to the folder again.',
        { path }
      );
    default:
      return new SourceError(
        'io',
        `Could not read ${path}: ${error && error.message ? error.message : 'unknown error'}`,
        { path }
      );
  }
}

/**
 * A folder chosen with the File System Access API.
 */
export class DirectorySource {
  constructor(handle) {
    this.kind = 'directory';
    this.name = handle.name || 'Selected folder';
    this.handle = handle;
  }

  async listGraphFiles() {
    const files = [];
    await walkDirectory(this.handle, '', 0, files);
    return files.sort(compareGraphFiles);
  }

  async read(path) {
    let normalized;
    try {
      normalized = normalizeRelativePath(path);
    } catch (error) {
      throw mapReadError(error, String(path));
    }

    const parts = normalized.split('/');

    try {
      let directory = this.handle;
      for (const segment of parts.slice(0, -1)) {
        directory = await directory.getDirectoryHandle(segment);
      }
      const fileHandle = await directory.getFileHandle(parts[parts.length - 1]);
      return await fileHandle.getFile();
    } catch (error) {
      throw mapReadError(error, normalized);
    }
  }
}

async function walkDirectory(directory, prefix, depth, files) {
  let entries;

  try {
    entries = [];
    for await (const entry of directory.values()) entries.push(entry);
  } catch (error) {
    throw mapReadError(error, prefix || directory.name);
  }

  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (files.length >= MAX_LIST_FILES) return;

    if (entry.kind === 'directory') {
      if (depth >= MAX_LIST_DEPTH) continue;
      if (entry.name.startsWith('.') || IGNORED_DIRECTORIES.has(entry.name)) continue;
      await walkDirectory(entry, `${prefix}${entry.name}/`, depth + 1, files);
      continue;
    }

    if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.json')) {
      files.push({
        path: `${prefix}${entry.name}`,
        name: entry.name
      });
    }
  }
}

/**
 * A folder provided by <input type="file" webkitdirectory>.
 * Works in browsers without the File System Access API.
 */
export class FileListSource {
  constructor(files) {
    this.kind = 'file-list';
    this.files = new Map();

    const list = Array.from(files || []);
    const paths = list.map((file) =>
      String(file.webkitRelativePath || file.name).replace(/\\/g, '/')
    );

    const first = paths[0] || '';
    const firstSlash = first.indexOf('/');
    const root = firstSlash > 0 ? first.slice(0, firstSlash) : '';
    this.name = root || 'Selected folder';

    list.forEach((file, index) => {
      const path = paths[index];
      let relative = path;
      if (root && path.startsWith(`${root}/`)) relative = path.slice(root.length + 1);
      relative = relative.replace(/^\/+/, '');
      if (relative) this.files.set(relative, file);
    });
  }

  async listGraphFiles() {
    return Array.from(this.files.keys())
      .filter((path) => path.toLowerCase().endsWith('.json'))
      .sort((a, b) => {
        const depthA = a.split('/').length;
        const depthB = b.split('/').length;
        return depthA - depthB || a.localeCompare(b);
      })
      .map((path) => ({ path, name: basename(path) }));
  }

  async read(path) {
    let normalized;
    try {
      normalized = normalizeRelativePath(path);
    } catch (error) {
      throw mapReadError(error, String(path));
    }

    const file = this.files.get(normalized);
    if (!file) {
      throw new SourceError('not-found', `File not found in the folder: ${normalized}`, {
        path: normalized
      });
    }
    return file;
  }
}

export function findGraphCandidates(files, fileName) {
  if (!fileName) return [];
  const wanted = basename(fileName).toLowerCase();
  return files.filter((file) => basename(file.path).toLowerCase() === wanted);
}
