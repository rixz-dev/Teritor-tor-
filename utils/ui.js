/**
 * RXS Code — Terminal UI
 * Aesthetic: Claude Code-inspired clean element layout.
 * No ASCII art. Pure Unicode box-draw + structured whitespace.
 */
import chalk from 'chalk';
import ora from 'ora';
import { homedir } from 'os';
import { resolve, join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import readline from 'readline/promises';

// ── Palette ─────────────────────────────────────────────────────────────────
export const C = {
  brand:   t => chalk.hex('#a78bfa')(t),
  dim:     t => chalk.dim(t),
  white:   t => chalk.white(t),
  orange:  t => chalk.hex('#fb923c')(t),
  green:   t => chalk.hex('#4ade80')(t),
  red:     t => chalk.hex('#f87171')(t),
  cyan:    t => chalk.hex('#22d3ee')(t),
  yellow:  t => chalk.hex('#fbbf24')(t),
  bold:    t => chalk.bold(t),
  ai:      t => chalk.hex('#a78bfa')(t),
  user:    t => chalk.hex('#fb923c')(t),
  success: t => chalk.hex('#4ade80')(t),
  error:   t => chalk.hex('#f87171')(t),
  warn:    t => chalk.hex('#fbbf24')(t),
  tool:    t => chalk.hex('#22d3ee')(t),
  skill:   t => chalk.hex('#4ade80')(t),
  road:    t => chalk.hex('#a78bfa').bold(t),
  info:    t => chalk.blueBright(t),
};

export const getWidth = () => Math.min(process.stdout.columns || 80, 110);

// ── Active spinner (singleton, always clean) ─────────────────────────────────
let _sp = null;

export function stopActiveSpinner() {
  if (_sp) {
    try { _sp.stop(); } catch {}
    _sp = null;
  }
}

export function createSpinner(type = 'loading') {
  stopActiveSpinner(); // always kill previous before starting new
  const FAST = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
  const SLOW = ['◐','◓','◑','◒'];
  const MAP = {
    connecting:    { f: SLOW,  i: 140, t: 'connecting',  c: 'magenta' },
    streaming:     { f: FAST,  i: 80,  t: 'streaming',   c: 'cyan'    },
    thinking:      { f: SLOW,  i: 160, t: 'thinking',    c: 'magenta' },
    loading:       { f: FAST,  i: 80,  t: 'loading',     c: 'cyan'    },
    web_search:    { f: FAST,  i: 80,  t: 'searching',   c: 'yellow'  },
    web_fetch:     { f: FAST,  i: 80,  t: 'fetching',    c: 'yellow'  },
    tool_read:     { f: FAST,  i: 80,  t: 'reading',     c: 'blue'    },
    tool_write:    { f: FAST,  i: 80,  t: 'writing',     c: 'green'   },
    tool_shell:    { f: FAST,  i: 80,  t: 'executing',   c: 'red'     },
    tool_grep:     { f: FAST,  i: 80,  t: 'searching',   c: 'blue'    },
    tool_git:      { f: SLOW,  i: 120, t: 'git',         c: 'magenta' },
    tool_generic:  { f: FAST,  i: 80,  t: 'running',     c: 'white'   },
  };
  const cfg = MAP[type] || MAP.tool_generic;
  _sp = ora({
    spinner:    { interval: cfg.i, frames: cfg.f },
    text:       C.dim(cfg.t),
    color:      cfg.c,
    prefixText: '  ',
  }).start();
  return {
    stop:   () => stopActiveSpinner(),
    update: t  => { if (_sp) _sp.text = C.dim(t); },
  };
}

// ── Stream state ──────────────────────────────────────────────────────────────
let _buf     = '';
let _sol     = true;  // start-of-line
let _aiOpen  = false;

export function streamChunk(text) {
  // CRITICAL: kill any active spinner the moment first text arrives
  stopActiveSpinner();

  const parts = text.split('\n');
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.length > 0) {
      if (_sol) {
        process.stdout.write('  ');
        _sol = false;
      }
      process.stdout.write(part);
    }
    if (i < parts.length - 1) {
      process.stdout.write('\n');
      _sol = true;
    }
  }
}

export function streamFlush() {
  stopActiveSpinner(); // always clean up
  if (!_sol) {
    process.stdout.write('\n');
    _sol = true;
  }
  _buf = '';
}

// ── AI response frame ─────────────────────────────────────────────────────────
export function printAIHeader(providerName, modelId) {
  stopActiveSpinner(); // guarantee spinner is dead before drawing
  const w     = getWidth();
  const label = C.dim('  ' + providerName.toLowerCase() + '  ·  ' + modelId);
  process.stdout.write('\n');
  process.stdout.write('  ' + C.brand('◆') + label + '\n');
  process.stdout.write('  ' + C.dim('─'.repeat(w - 4)) + '\n');
  process.stdout.write('\n');
  _sol    = true;
  _aiOpen = true;
}

export function printAILine(text) {
  if (_aiOpen) process.stdout.write('  ' + text + '\n');
}

export function printAIFooterLine() {
  streamFlush();
}

export function printAIFooter() {
  stopActiveSpinner();
  streamFlush();
  const w = getWidth();
  if (_aiOpen) {
    process.stdout.write('\n');
    process.stdout.write('  ' + C.dim('─'.repeat(w - 4)) + '\n');
    _aiOpen = false;
  }
}

// ── User turn ─────────────────────────────────────────────────────────────────
export function printUserBox(text) {
  const w = getWidth();
  process.stdout.write('\n');
  process.stdout.write('  ' + C.dim('─'.repeat(w - 4)) + '\n');
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    process.stdout.write('  ' + (i === 0 ? C.orange('›') : ' ') + ' ' + chalk.white(line) + '\n');
  });
  process.stdout.write('\n');
}

// ── Banner ────────────────────────────────────────────────────────────────────
export function printBanner(providerName, model, cfg) {
  const version  = cfg?.version || '0.3.0';
  const ctx      = cfg?.contextWindow ? `${Math.round(cfg.contextWindow / 1000)}k ctx` : '';
  const thinking = cfg?.thinking && cfg.thinking !== 'off' ? `thinking:${cfg.thinking}` : '';
  const tools    = cfg?.toolsEnabled !== false ? 'tools:on' : 'tools:off';
  const w        = getWidth();

  const metaParts = [ctx, thinking, tools].filter(Boolean).join('  ');
  const cmds = '/help  /model  /provider  /thinking  /status  /save  /load  /clear';

  process.stdout.write('\n');
  process.stdout.write('  ' + C.brand('rxs-code') + '  ' + C.dim('v' + version) + '  ' + C.dim('·') + '  ' + chalk.white(providerName.toLowerCase()) + '  ' + C.dim('/') + '  ' + chalk.white(model) + '\n');
  if (metaParts) {
    process.stdout.write('  ' + C.dim(metaParts) + '\n');
  }
  process.stdout.write('  ' + C.dim(cmds.slice(0, w - 4)) + '\n');
  process.stdout.write('\n');
}

// ── Info / Error / Tool badges ────────────────────────────────────────────────
export function printInfoBox(content, label = 'INFO') {
  const w = getWidth();
  process.stdout.write('\n');
  process.stdout.write('  ' + C.brand('◈') + '  ' + C.dim(label.toLowerCase()) + '\n');
  process.stdout.write('  ' + C.dim('─'.repeat(w - 4)) + '\n');
  String(content).split('\n').forEach(line => {
    process.stdout.write('  ' + chalk.white(line) + '\n');
  });
  process.stdout.write('\n');
}

export function printErrorBox(msg) {
  process.stdout.write('\n');
  process.stdout.write('  ' + C.red('✖') + '  ' + chalk.white(String(msg)) + '\n');
  process.stdout.write('\n');
}

export function printToolBadge(toolName, detail = '') {
  const ICONS = {
    web_search:      '⚑',
    web_fetch:       '⚑',
    read_file:       '◉',
    write_file:      '◈',
    execute_command: '⚙',
    search_codebase: '⊛',
    git:             '⎇',
    write_content:   '✎',
  };
  const icon = ICONS[toolName] || '◆';
  const d    = detail ? C.dim('  ' + String(detail).slice(0, 60)) : '';
  process.stdout.write('\n  ' + C.tool(icon + '  ' + toolName) + d + '\n');
}

export function printAutoContinueBadge(n, max) {
  process.stdout.write('\n  ' + C.dim('↻  auto-continue ' + n + '/' + max) + '\n');
}

export function printRetryBadge(n, max, delay) {
  process.stdout.write('\n  ' + C.warn('⟳') + '  ' + C.dim('retry ' + n + '/' + max + '  ·  ' + delay + 'ms') + '\n');
}

// ── Roadmap ───────────────────────────────────────────────────────────────────
export function parseRoadmap(text) {
  const match = text.match(/<rxs-roadmap>([\s\S]*?)<\/rxs-roadmap>/);
  if (!match) return null;
  const lines   = match[1].trim().split('\n').map(l => l.trim()).filter(Boolean);
  const goalLine = lines.find(l => l.startsWith('GOAL:'));
  const goal     = goalLine ? goalLine.replace('GOAL:', '').trim() : '';
  const steps    = lines
    .filter(l => /^\[.\]/.test(l))
    .map(l => ({
      done: l.startsWith('[x]'),
      text: l.replace(/^\[.\]\s*\d*\.?\s*/, '').trim(),
    }));
  return steps.length >= 1 ? { goal, steps } : null;
}

export function printRoadmapStatus(roadmap) {
  if (!roadmap?.steps?.length) return;
  const w     = getWidth();
  const done  = roadmap.steps.filter(s => s.done).length;
  const total = roadmap.steps.length;
  const BAR   = 16;
  const fill  = Math.round((done / Math.max(total, 1)) * BAR);
  const bar   = C.success('█'.repeat(fill)) + C.dim('░'.repeat(BAR - fill));
  const pct   = total ? Math.round((done / total) * 100) : 0;

  process.stdout.write('\n');
  process.stdout.write('  ' + C.brand('◈') + '  ' + C.dim('roadmap') + '\n');
  process.stdout.write('  ' + C.dim('─'.repeat(w - 4)) + '\n');
  if (roadmap.goal) {
    process.stdout.write('  ' + C.dim('goal  ') + chalk.white(roadmap.goal) + '\n');
  }
  process.stdout.write('  ' + bar + C.dim(`  ${done}/${total}  (${pct}%)`) + '\n\n');
  roadmap.steps.forEach(s => {
    const icon = s.done ? C.success('✓') : C.dim('·');
    const text = s.done ? C.dim(s.text) : chalk.white(s.text);
    process.stdout.write('  ' + icon + '  ' + text + '\n');
  });
  process.stdout.write('\n');
}

export function buildRoadmapContinuePrompt(roadmap) {
  if (!roadmap?.steps?.length) {
    return 'The response was cut off. Resume from exactly where you stopped without repeating anything already written.';
  }
  const done    = roadmap.steps.filter(s => s.done).map(s => s.text);
  const pending = roadmap.steps.filter(s => !s.done).map(s => s.text);
  return [
    'Response was interrupted mid-stream. Resume from exactly where you stopped.',
    done.length    ? 'Already completed: ' + done.join(', ')    : '',
    pending.length ? 'Still remaining: '   + pending.join(', ') : '',
    'Do NOT repeat completed sections. Continue directly.',
  ].filter(Boolean).join('\n');
}

// ── Model history + selector ──────────────────────────────────────────────────
const HIST_DIR  = join(homedir(), '.rxscode');
const HIST_FILE = join(HIST_DIR,  'model-history.json');

async function loadModelHistory() {
  try {
    if (!existsSync(HIST_FILE)) return {};
    return JSON.parse(readFileSync(HIST_FILE, 'utf8'));
  } catch { return {}; }
}

export async function saveModelHistory(provName, model) {
  try {
    if (!existsSync(HIST_DIR)) mkdirSync(HIST_DIR, { recursive: true });
    const h = await loadModelHistory();
    if (!h[provName]) h[provName] = [];
    h[provName] = [model, ...h[provName].filter(m => m !== model)].slice(0, 5);
    writeFileSync(HIST_FILE, JSON.stringify(h, null, 2));
  } catch {}
}

export async function modelSelector(provider, currentModel, existingRl = null) {
  const h    = await loadModelHistory();
  const rec  = (h[provider.name] || []).slice(0, 5);
  const reco = (provider.getRecommendedModels?.() || []).filter(m => !rec.includes(m));
  const cur  = currentModel || provider.defaultModel;
  const all  = [...new Set([...rec, ...reco])];
  const w    = getWidth();

  process.stdout.write('\n');
  process.stdout.write('  ' + C.brand('◆') + '  ' + C.dim('model  ·  ' + provider.name.toLowerCase()) + '\n');
  process.stdout.write('  ' + C.dim('─'.repeat(w - 4)) + '\n\n');

  if (rec.length) {
    process.stdout.write('  ' + C.dim('recent') + '\n');
    rec.forEach((m, i) => {
      const tag = i === 0 ? C.dim('  ← last') : '';
      process.stdout.write('    ' + C.dim(String(i + 1).padStart(2)) + '  ' + chalk.white(m) + tag + '\n');
    });
    process.stdout.write('\n');
  }

  if (reco.length) {
    process.stdout.write('  ' + C.dim('recommended') + '\n');
    reco.forEach((m, i) => {
      const n = rec.length + i + 1;
      process.stdout.write('    ' + C.dim(String(n).padStart(2)) + '  ' + chalk.white(m) + '\n');
    });
    process.stdout.write('\n');
  }

  process.stdout.write('  ' + C.dim('current  ') + chalk.white(cur) + '\n');
  process.stdout.write('  ' + C.dim('enter number, model id, or ↵ to keep') + '\n\n');

  const rl  = existingRl || readline.createInterface({ input: process.stdin, output: process.stdout });
  process.stdout.write('  ' + C.brand('>') + ' ');
  const inp = (await rl.question('')).trim();
  if (!existingRl) rl.close();

  if (!inp) return cur;
  if (inp.startsWith('/')) {
    process.stdout.write('  ' + C.dim('cancelled — kept ' + cur) + '\n');
    return { model: cur, passthrough: inp };
  }
  const n = parseInt(inp, 10);
  if (!isNaN(n) && n >= 1 && n <= all.length) {
    await saveModelHistory(provider.name, all[n - 1]);
    return all[n - 1];
  }
  await saveModelHistory(provider.name, inp);
  return inp;
}
