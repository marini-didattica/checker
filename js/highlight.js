const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;'
};

export function escapeHtml(value) {
  return String(value).replace(/[&<>]/g, (character) => ESCAPE_MAP[character]);
}

const JS_KEYWORDS = new Set(
  `as async await break case catch class const continue debugger default delete do else export extends finally for from function get if import in instanceof let new of return set static super switch this throw try typeof var void while with yield`.split(
    ' '
  )
);

const JS_LITERALS = new Set(['true', 'false', 'null', 'undefined', 'NaN', 'Infinity']);
const JS_TYPES = new Set(
  `Array BigInt Boolean Date Error JSON Map Math Number Object Promise Proxy RegExp Set String Symbol WeakMap WeakSet console document window`.split(
    ' '
  )
);

const TS_KEYWORDS = new Set([
  ...JS_KEYWORDS,
  ...`abstract any asserts async bigint boolean constructor declare enum implements infer interface is keyof module namespace never number object override private protected public readonly satisfies static string symbol type unique unknown void`.split(
    ' '
  )
]);

const PY_KEYWORDS = new Set(
  `and as assert async await break case class continue def del elif else except finally for from global if import in is lambda match nonlocal not or pass raise return try while with yield`.split(
    ' '
  )
);
const PY_LITERALS = new Set(['True', 'False', 'None', 'NotImplemented', 'Ellipsis']);
const PY_TYPES = new Set(
  `bool bytearray bytes dict float frozenset int list object set str tuple type self cls print len range open super enumerate zip map filter sum min max sorted reversed any all`.split(
    ' '
  )
);

const RUBY_KEYWORDS = new Set(
  `alias and begin break case class def defined do else elsif end ensure false for if in module next nil not or redo rescue retry return self super then true undef unless until when while yield require require_relative attr_accessor attr_reader attr_writer include extend`.split(
    ' '
  )
);

const GO_KEYWORDS = new Set(
  `break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var nil true false iota`.split(
    ' '
  )
);
const GO_TYPES = new Set(
  `any bool byte comparable complex64 complex128 error float32 float64 int int8 int16 int32 int64 rune string uint uint8 uint16 uint32 uint64 uintptr make new len cap append copy delete panic recover`.split(
    ' '
  )
);

const RUST_KEYWORDS = new Set(
  `as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while`.split(
    ' '
  )
);
const RUST_TYPES = new Set(
  `String Vec Option Result Box Rc Arc HashMap HashSet BTreeMap BTreeSet usize isize u8 u16 u32 u64 u128 i8 i16 i32 i64 i128 f32 f64 bool char str Some None Ok Err`.split(
    ' '
  )
);

const JAVA_KEYWORDS = new Set(
  `abstract assert break case catch class const continue default do else enum extends final finally for goto if implements import instanceof interface native new package private protected public return static strictfp super switch synchronized this throw throws transient try volatile while var record sealed permits yield`.split(
    ' '
  )
);
const JAVA_TYPES = new Set(
  `boolean byte char double float int long short void String Object Integer Long Double Float Boolean Character List Map Set ArrayList HashMap HashSet Optional Stream`.split(
    ' '
  )
);

const CS_KEYWORDS = new Set(
  `abstract as async await base break case catch checked class const continue default delegate do else enum event explicit extern finally fixed for foreach goto if implicit in interface internal is lock namespace new operator out override params private protected public readonly record ref return sealed sizeof stackalloc static struct switch this throw try typeof unchecked unsafe using virtual void volatile while var`.split(
    ' '
  )
);

const C_KEYWORDS = new Set(
  `auto break case char const continue default do double else enum extern float for goto if inline int long register restrict return short signed sizeof static struct switch typedef union unsigned void volatile while class namespace template typename public private protected virtual override new delete this using nullptr true false constexpr`.split(
    ' '
  )
);
const C_TYPES = new Set(
  `int8_t int16_t int32_t int64_t uint8_t uint16_t uint32_t uint64_t size_t ssize_t FILE std string vector map set unique_ptr shared_ptr`.split(
    ' '
  )
);

const PHP_KEYWORDS = new Set(
  `abstract and array as break callable case catch class clone const continue declare default die do echo else elseif empty enddeclare endfor endforeach endif endswitch endwhile enum eval exit extends final finally fn for foreach function global goto if implements include include_once instanceof insteadof interface isset list match namespace new or print private protected public readonly require require_once return static switch throw trait try unset use var while xor yield true false null`.split(
    ' '
  )
);

const SWIFT_KEYWORDS = new Set(
  `associatedtype break case catch class continue default defer deinit do else enum extension fallthrough false fileprivate for func guard if import in init inout internal is let nil open operator private protocol public repeat rethrows return self Self static struct subscript super switch throw throws true try typealias var where while async await`.split(
    ' '
  )
);

const SHELL_KEYWORDS = new Set(
  `if then elif else fi for while until do done case esac function in select time coproc break continue return exit export readonly local declare typeset unset shift source alias unalias eval exec trap set`.split(
    ' '
  )
);

const SQL_KEYWORDS = new Set(
  `add all alter and any as asc begin between by case cast check column commit constraint create cross current_date current_time current_timestamp database default delete desc distinct drop else end escape except exists foreign from full group having if in index inner insert intersect into is join key left like limit not null offset on or order outer primary references right rollback select set table then to top transaction trigger truncate union unique update values view when where with`.split(
    ' '
  )
);

const LUA_KEYWORDS = new Set(
  `and break do else elseif end false for function goto if in local nil not or repeat return then true until while`.split(
    ' '
  )
);

const R_KEYWORDS = new Set(
  `if else repeat while function for in next break TRUE FALSE NULL Inf NaN NA NA_integer_ NA_real_ NA_character_ library require`.split(
    ' '
  )
);

const KS_KEYWORDS = new Set(
  `package import class interface object fun val var if else when for while do try catch finally throw return break continue is as in by get set constructor init override open data sealed enum companion this super`.split(
    ' '
  )
);

const CONFIGS = {
  javascript: {
    comments: [['//', '\n'], ['/*', '*/']],
    strings: ['"', "'", '`'],
    multilineStrings: ['`'],
    keywords: JS_KEYWORDS,
    literals: JS_LITERALS,
    types: JS_TYPES
  },
  typescript: {
    comments: [['//', '\n'], ['/*', '*/']],
    strings: ['"', "'", '`'],
    multilineStrings: ['`'],
    keywords: TS_KEYWORDS,
    literals: JS_LITERALS,
    types: JS_TYPES
  },
  python: {
    comments: [['#', '\n']],
    strings: ['"', "'"],
    tripleQuotes: true,
    keywords: PY_KEYWORDS,
    literals: PY_LITERALS,
    types: PY_TYPES,
    decorators: true
  },
  ruby: {
    comments: [['#', '\n']],
    strings: ['"', "'"],
    keywords: RUBY_KEYWORDS,
    literals: new Set(['true', 'false', 'nil'])
  },
  go: {
    comments: [['//', '\n'], ['/*', '*/']],
    strings: ['"', "'", '`'],
    multilineStrings: ['`'],
    keywords: GO_KEYWORDS,
    literals: new Set(['true', 'false', 'nil']),
    types: GO_TYPES
  },
  rust: {
    comments: [['//', '\n'], ['/*', '*/']],
    strings: ['"'],
    keywords: RUST_KEYWORDS,
    literals: new Set(['true', 'false']),
    types: RUST_TYPES,
    rustLifetimes: true
  },
  java: {
    comments: [['//', '\n'], ['/*', '*/']],
    strings: ['"', "'"],
    keywords: JAVA_KEYWORDS,
    literals: new Set(['true', 'false', 'null']),
    types: JAVA_TYPES
  },
  csharp: {
    comments: [['//', '\n'], ['/*', '*/']],
    strings: ['"', "'"],
    keywords: CS_KEYWORDS,
    literals: new Set(['true', 'false', 'null']),
    types: new Set(['string', 'int', 'long', 'double', 'float', 'decimal', 'bool', 'char', 'byte', 'object', 'var', 'dynamic'])
  },
  c: {
    comments: [['//', '\n'], ['/*', '*/']],
    strings: ['"', "'"],
    keywords: C_KEYWORDS,
    literals: new Set(['true', 'false', 'nullptr', 'NULL']),
    types: C_TYPES
  },
  php: {
    comments: [['//', '\n'], ['#', '\n'], ['/*', '*/']],
    strings: ['"', "'"],
    keywords: PHP_KEYWORDS,
    literals: new Set(['true', 'false', 'null']),
    variablePrefix: '$'
  },
  swift: {
    comments: [['//', '\n'], ['/*', '*/']],
    strings: ['"'],
    keywords: SWIFT_KEYWORDS,
    literals: new Set(['true', 'false', 'nil'])
  },
  kotlin: {
    comments: [['//', '\n'], ['/*', '*/']],
    strings: ['"', "'"],
    keywords: KS_KEYWORDS,
    literals: new Set(['true', 'false', 'null'])
  },
  shell: {
    comments: [['#', '\n']],
    strings: ['"', "'"],
    keywords: SHELL_KEYWORDS,
    literals: new Set(['true', 'false']),
    variablePrefix: '$',
    interpolateStrings: true
  },
  sql: {
    comments: [['--', '\n'], ['/*', '*/']],
    strings: ["'", '"'],
    keywords: SQL_KEYWORDS,
    literals: new Set(['true', 'false', 'null']),
    caseInsensitive: true,
    doubledQuotes: true
  },
  lua: {
    comments: [['--', '\n']],
    strings: ['"', "'"],
    keywords: LUA_KEYWORDS,
    literals: new Set(['true', 'false', 'nil'])
  },
  r: {
    comments: [['#', '\n']],
    strings: ['"', "'"],
    keywords: R_KEYWORDS,
    literals: new Set(['TRUE', 'FALSE', 'NULL', 'NA', 'NaN', 'Inf'])
  },
  yaml: {
    comments: [['#', '\n']],
    strings: ['"', "'"],
    keywords: new Set(['true', 'false', 'null', 'yes', 'no', 'on', 'off']),
    yamlKeys: true
  },
  ini: {
    comments: [['#', '\n'], [';', '\n']],
    strings: ['"', "'"],
    literals: new Set(['true', 'false', 'yes', 'no', 'on', 'off']),
    iniKeys: true
  },
  css: {
    comments: [['/*', '*/']],
    strings: ['"', "'"],
    keywords: new Set(['important', 'media', 'supports', 'keyframes', 'import', 'charset', 'font-face', 'layer', 'container']),
    cssProperties: true,
    numberUnits: true
  },
  json: {
    strings: ['"'],
    literals: new Set(['true', 'false', 'null']),
    jsonKeys: true
  }
};

const EXTENSION_LANGUAGES = {
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  py: 'python',
  pyw: 'python',
  pyi: 'python',
  rb: 'ruby',
  rake: 'ruby',
  go: 'go',
  rs: 'rust',
  java: 'java',
  kt: 'kotlin',
  kts: 'kotlin',
  scala: 'kotlin',
  groovy: 'java',
  c: 'c',
  h: 'c',
  cc: 'c',
  cpp: 'c',
  cxx: 'c',
  hpp: 'c',
  hh: 'c',
  m: 'c',
  mm: 'c',
  cs: 'csharp',
  php: 'php',
  swift: 'swift',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  fish: 'shell',
  sql: 'sql',
  lua: 'lua',
  r: 'r',
  json: 'json',
  jsonc: 'json',
  json5: 'json',
  yml: 'yaml',
  yaml: 'yaml',
  toml: 'ini',
  ini: 'ini',
  cfg: 'ini',
  conf: 'ini',
  properties: 'ini',
  env: 'ini',
  css: 'css',
  scss: 'css',
  less: 'css',
  html: 'markup',
  htm: 'markup',
  xml: 'markup',
  svg: 'markup',
  vue: 'markup',
  svelte: 'markup',
  md: 'markdown',
  markdown: 'markdown',
  mdx: 'markdown',
  diff: 'diff',
  patch: 'diff',
  txt: 'plain',
  log: 'plain'
};

const SPECIAL_FILENAMES = {
  dockerfile: 'shell',
  makefile: 'shell',
  '.bashrc': 'shell',
  '.zshrc': 'shell',
  '.gitignore': 'plain'
};

export function languageForPath(path) {
  const name = String(path).replace(/\\/g, '/').split('/').pop() || '';
  const lowerName = name.toLowerCase();
  if (SPECIAL_FILENAMES[lowerName]) return SPECIAL_FILENAMES[lowerName];

  const dot = name.lastIndexOf('.');
  if (dot < 0) return 'plain';
  const extension = name.slice(dot + 1).toLowerCase();
  return EXTENSION_LANGUAGES[extension] || 'plain';
}

export function highlight(text, language = 'plain') {
  if (!text) return '';

  if (language === 'markup') return highlightMarkup(text);
  if (language === 'markdown') return highlightMarkdown(text);
  if (language === 'diff') return highlightDiff(text);
  if (language === 'plain' || !CONFIGS[language]) return escapeHtml(text);
  return highlightGeneric(text, CONFIGS[language]);
}

export function highlightCode(text, path, maxChars = 300000) {
  if (!text) return '';
  if (text.length > maxChars) return escapeHtml(text);

  try {
    return highlight(text, languageForPath(path));
  } catch (error) {
    console.warn(`Could not highlight ${path}.`, error);
    return escapeHtml(text);
  }
}

function highlightGeneric(text, config) {
  let html = '';
  let plain = '';
  let index = 0;

  const flush = () => {
    if (plain) {
      html += escapeHtml(plain);
      plain = '';
    }
  };

  const emit = (type, value) => {
    flush();
    html += `<span class="tok-${type}">${escapeHtml(value)}</span>`;
  };

  const emitInterpolatedString = (value) => {
    flush();
    let cursor = 0;

    html += '<span class="tok-string">';

    for (const match of value.matchAll(/\$\{?[A-Za-z_][A-Za-z0-9_]*\}?/g)) {
      html += escapeHtml(value.slice(cursor, match.index));
      html += '</span><span class="tok-variable">';
      html += escapeHtml(match[0]);
      html += '</span><span class="tok-string">';
      cursor = match.index + match[0].length;
    }

    html += escapeHtml(value.slice(cursor));
    html += '</span>';
  };

  while (index < text.length) {
    const rest = text.slice(index, index + 96);
    let consumed = false;

    for (const [start, end] of config.comments || []) {
      if (!text.startsWith(start, index)) continue;

      let stop;
      if (end === '\n') {
        stop = text.indexOf('\n', index + start.length);
        if (stop === -1) stop = text.length;
      } else {
        const found = text.indexOf(end, index + start.length);
        stop = found === -1 ? text.length : found + end.length;
      }

      emit('comment', text.slice(index, stop));
      index = stop;
      consumed = true;
      break;
    }
    if (consumed) continue;

    const character = text[index];

    if (config.tripleQuotes) {
      const triple = text.startsWith('"""', index)
        ? '"""'
        : text.startsWith("'''", index)
          ? "'''"
          : null;
      if (triple) {
        const found = text.indexOf(triple, index + 3);
        const stop = found === -1 ? text.length : found + 3;
        emit('string', text.slice(index, stop));
        index = stop;
        continue;
      }
    }

    if (config.rustLifetimes && character === "'") {
      if (/[A-Za-z_][A-Za-z0-9_]*/.test(rest.slice(1, 24)) && text[index + 2] !== "'") {
        const match = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest.slice(1));
        if (match) {
          emit('type', `'${match[0]}`);
          index += match[0].length + 1;
          continue;
        }
      }
    }

    if ((config.strings || []).includes(character)) {
      const stop = scanString(
        text,
        index,
        character,
        (config.multilineStrings || []).includes(character),
        Boolean(config.doubledQuotes)
      );
      const value = text.slice(index, stop);

      if (config.jsonKeys && /^\s*:/.test(text.slice(stop, stop + 32))) {
        emit('property', value);
      } else if (config.interpolateStrings && character !== "'" && value.includes('$')) {
        emitInterpolatedString(value);
      } else {
        emit('string', value);
      }

      index = stop;
      continue;
    }

    if (config.variablePrefix && character === config.variablePrefix) {
      const match = /^\$\{?[A-Za-z_][A-Za-z0-9_]*\}?/.exec(rest);
      if (match) {
        emit('variable', match[0]);
        index += match[0].length;
        continue;
      }
    }

    if (isDigit(character) || (character === '.' && isDigit(text[index + 1]))) {
      const match = /^(?:0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(?:\d[\d_]*(?:\.[\d_]*)?|\.\d[\d_]*)(?:[eE][+-]?\d+)?)(?:px|em|rem|vh|vw|vmin|vmax|ch|ex|pt|pc|cm|mm|in|deg|rad|turn|s|ms|fr|%)?/.exec(
        rest
      );
      if (match) {
        emit('number', match[0]);
        index += match[0].length;
        continue;
      }
    }

    if (character === '#') {
      const color = /^#[0-9a-fA-F]{3,8}\b/.exec(rest);
      if (color) {
        emit('number', color[0]);
        index += color[0].length;
        continue;
      }
    }

    if (config.decorators && character === '@') {
      const match = /^@[A-Za-z_][A-Za-z0-9_.]*/.exec(rest);
      if (match) {
        emit('keyword', match[0]);
        index += match[0].length;
        continue;
      }
    }

    if (config.yamlKeys && isWordStart(character) && isYamlKeyPosition(text, index)) {
      const match = /^([A-Za-z0-9_.-]+)(\s*):(?=\s|$)/.exec(rest);
      if (match) {
        emit('property', match[1]);
        plain += match[2] + ':';
        index += match[0].length;
        continue;
      }
    }

    if (config.iniKeys && isWordStart(character) && isIniKeyPosition(text, index)) {
      const match = /^([A-Za-z0-9_.-]+)(\s*)([=:])/.exec(rest);
      if (match) {
        emit('property', match[1]);
        plain += match[2] + match[3];
        index += match[0].length;
        continue;
      }
    }

    if (config.iniKeys && character === '[') {
      const section = /^\[[^\]\n]+\]/.exec(rest);
      if (section) {
        emit('type', section[0]);
        index += section[0].length;
        continue;
      }
    }

    const cssWord =
      config.cssProperties &&
      (isWordStart(character) ||
        (character === '-' && /[A-Za-z-]/.test(text[index + 1] || '')));

    if (isWordStart(character) || cssWord) {
      const match = (
        config.cssProperties
          ? /^(?:[A-Za-z_][A-Za-z0-9_-]*|-{1,2}[A-Za-z][A-Za-z0-9_-]*)/
          : /^[A-Za-z_$][A-Za-z0-9_$]*/
      ).exec(rest);
      if (match) {
        const word = match[0];
        const lower = config.caseInsensitive ? word.toLowerCase() : word;

        if (config.cssProperties) {
          const property = /^\s*:\s*/.test(text.slice(index + word.length, index + word.length + 24));
          if (property) {
            emit('property', word);
            index += word.length;
            continue;
          }
        }

        if ((config.keywords || new Set()).has(lower)) {
          emit('keyword', word);
        } else if ((config.literals || new Set()).has(lower)) {
          emit('literal', word);
        } else if ((config.types || new Set()).has(lower)) {
          emit('type', word);
        } else {
          const next = text.slice(index + word.length, index + word.length + 24);
          if (/^\s*\(/.test(next)) emit('function', word);
          else plain += word;
        }

        index += word.length;
        continue;
      }
    }

    plain += character;
    index += 1;
  }

  flush();
  return html;
}

function isYamlKeyPosition(text, index) {
  const lineStart = text.lastIndexOf('\n', index - 1) + 1;
  const before = text.slice(lineStart, index);
  return /^\s*(?:-\s+)?$/.test(before);
}

function isIniKeyPosition(text, index) {
  const lineStart = text.lastIndexOf('\n', index - 1) + 1;
  const before = text.slice(lineStart, index);
  return /^\s*$/.test(before);
}

function scanString(text, index, quote, multiline, doubledQuotes) {
  let cursor = index + 1;

  while (cursor < text.length) {
    const character = text[cursor];

    if (character === '\\') {
      cursor += 2;
      continue;
    }

    if (character === quote) {
      if (doubledQuotes && text[cursor + 1] === quote) {
        cursor += 2;
        continue;
      }
      return cursor + 1;
    }

    if (!multiline && character === '\n') return cursor;
    cursor += 1;
  }

  return cursor;
}

function highlightMarkup(text) {
  let html = '';
  let plain = '';
  let index = 0;

  const flush = () => {
    if (plain) {
      html += escapeHtml(plain);
      plain = '';
    }
  };

  const emit = (type, value) => {
    flush();
    html += `<span class="tok-${type}">${escapeHtml(value)}</span>`;
  };

  while (index < text.length) {
    if (text.startsWith('<!--', index)) {
      const found = text.indexOf('-->', index + 4);
      const stop = found === -1 ? text.length : found + 3;
      emit('comment', text.slice(index, stop));
      index = stop;
      continue;
    }

    if (text[index] === '<' && /[A-Za-z/!?]/.test(text[index + 1] || '')) {
      emit('punct', '<');
      index += 1;

      if (text[index] === '/') {
        emit('punct', '/');
        index += 1;
      } else if (text[index] === '!') {
        emit('keyword', '!');
        index += 1;
      } else if (text[index] === '?') {
        emit('keyword', '?');
        index += 1;
      }

      const tag = /^[A-Za-z][A-Za-z0-9:._-]*/.exec(text.slice(index, index + 96));
      if (tag) {
        emit('tag', tag[0]);
        index += tag[0].length;
      }

      let inTag = true;
      while (index < text.length && inTag) {
        const character = text[index];

        if (character === '>') {
          emit('punct', '>');
          index += 1;
          inTag = false;
          continue;
        }

        if (character === '/' && text[index + 1] === '>') {
          emit('punct', '/>');
          index += 2;
          inTag = false;
          continue;
        }

        if (character === '"' || character === "'") {
          const stop = scanString(text, index, character, true, false);
          emit('string', text.slice(index, stop));
          index = stop;
          continue;
        }

        if (character === '=') {
          emit('punct', '=');
          index += 1;
          continue;
        }

        if (/\s/.test(character)) {
          plain += character;
          index += 1;
          continue;
        }

        const attribute = /^[^\s=/>]+/.exec(text.slice(index, index + 96));
        if (attribute) {
          emit('attr', attribute[0]);
          index += attribute[0].length;
          continue;
        }

        plain += character;
        index += 1;
      }
      continue;
    }

    if (text[index] === '&') {
      const entity = /^&[A-Za-z#0-9]+;/.exec(text.slice(index, index + 24));
      if (entity) {
        emit('literal', entity[0]);
        index += entity[0].length;
        continue;
      }
    }

    plain += text[index];
    index += 1;
  }

  flush();
  return html;
}

function highlightMarkdown(text) {
  const lines = text.split(/(?<=\n)/);
  let html = '';
  let fence = null;

  for (const line of lines) {
    const fenceMatch = /^(\s*)(```|~~~)(.*)$/.exec(line.replace(/\n$/, ''));

    if (fenceMatch) {
      const marker = fenceMatch[2];
      if (!fence) fence = marker;
      else if (fence === marker) fence = null;
      html += `<span class="tok-comment">${escapeHtml(line)}</span>`;
      continue;
    }

    if (fence) {
      html += `<span class="tok-code">${escapeHtml(line)}</span>`;
      continue;
    }

    if (/^\s{0,3}#{1,6}\s/.test(line)) {
      html += `<span class="tok-heading">${escapeHtml(line)}</span>`;
      continue;
    }

    if (/^\s*([-*_])\1{2,}\s*$/.test(line.replace(/\n$/, ''))) {
      html += `<span class="tok-punct">${escapeHtml(line)}</span>`;
      continue;
    }

    const quote = /^(\s*>\s?)(.*)$/.exec(line);
    if (quote) {
      html += `<span class="tok-keyword">${escapeHtml(quote[1])}</span>`;
      html += highlightMarkdownInline(quote[2]);
      continue;
    }

    const list = /^(\s*(?:[-*+]|\d+\.)\s+)(.*)$/.exec(line);
    if (list) {
      html += `<span class="tok-keyword">${escapeHtml(list[1])}</span>`;
      html += highlightMarkdownInline(list[2]);
      continue;
    }

    html += highlightMarkdownInline(line);
  }

  return html;
}

function highlightMarkdownInline(text) {
  let html = '';
  let plain = '';
  let index = 0;

  const flush = () => {
    if (plain) {
      html += escapeHtml(plain);
      plain = '';
    }
  };

  const emit = (type, value) => {
    flush();
    html += `<span class="tok-${type}">${escapeHtml(value)}</span>`;
  };

  while (index < text.length) {
    const character = text[index];

    if (character === '`') {
      const found = text.indexOf('`', index + 1);
      if (found !== -1) {
        emit('string', text.slice(index, found + 1));
        index = found + 1;
        continue;
      }
    }

    if ((text.startsWith('**', index) || text.startsWith('__', index)) && !text.startsWith('***', index)) {
      const marker = text.slice(index, index + 2);
      const found = text.indexOf(marker, index + 2);
      if (found !== -1) {
        emit('strong', text.slice(index, found + 2));
        index = found + 2;
        continue;
      }
    }

    if (character === '[') {
      const link = /^\[([^\]]+)\]\(([^)]+)\)/.exec(text.slice(index, index + 512));
      if (link) {
        emit('link', link[0]);
        index += link[0].length;
        continue;
      }
    }

    if (character === '<') {
      const auto = /^<https?:\/\/[^>\s]+>/.exec(text.slice(index, index + 512));
      if (auto) {
        emit('link', auto[0]);
        index += auto[0].length;
        continue;
      }
    }

    if (character === '*' || character === '_') {
      const found = text.indexOf(character, index + 1);
      if (found !== -1 && found > index + 1) {
        emit('emphasis', text.slice(index, found + 1));
        index = found + 1;
        continue;
      }
    }

    plain += character;
    index += 1;
  }

  flush();
  return html;
}

function highlightDiff(text) {
  const lines = text.split(/(?<=\n)/);
  let html = '';

  for (const line of lines) {
    const content = line.replace(/\n$/, '');

    if (/^(diff --git|index |--- |\+\+\+ |new file|deleted file|similarity index|rename )/.test(content)) {
      html += `<span class="tok-meta">${escapeHtml(line)}</span>`;
    } else if (/^@@/.test(content)) {
      html += `<span class="tok-keyword">${escapeHtml(line)}</span>`;
    } else if (/^\+/.test(content)) {
      html += `<span class="tok-added">${escapeHtml(line)}</span>`;
    } else if (/^-/.test(content)) {
      html += `<span class="tok-removed">${escapeHtml(line)}</span>`;
    } else {
      html += escapeHtml(line);
    }
  }

  return html;
}

function isDigit(character) {
  return character >= '0' && character <= '9';
}

function isWordStart(character) {
  return /[A-Za-z_$]/.test(character || '');
}
