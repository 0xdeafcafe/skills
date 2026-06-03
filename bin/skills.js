#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const PACKAGE_ROOT = path.join(__dirname, '..');
const DEFAULT_TARGET = path.join(os.homedir(), '.claude', 'skills');

const VERSION = require('../package.json').version;

const COLOR = process.stdout.isTTY && !process.env.NO_COLOR;
const c = {
  reset: COLOR ? '\x1b[0m' : '',
  dim:   COLOR ? '\x1b[2m' : '',
  bold:  COLOR ? '\x1b[1m' : '',
  green: COLOR ? '\x1b[32m' : '',
  yellow:COLOR ? '\x1b[33m' : '',
  red:   COLOR ? '\x1b[31m' : '',
  cyan:  COLOR ? '\x1b[36m' : '',
};

function log(s)  { process.stdout.write(s + '\n'); }
function warn(s) { process.stderr.write(`${c.yellow}!${c.reset} ${s}\n`); }
function fail(s) { process.stderr.write(`${c.red}✗${c.reset} ${s}\n`); process.exit(1); }
function ok(s)   { process.stdout.write(`${c.green}✓${c.reset} ${s}\n`); }
function info(s) { process.stdout.write(`${c.dim}·${c.reset} ${s}\n`); }

function discoverSkills() {
  const entries = fs.readdirSync(PACKAGE_ROOT, { withFileTypes: true });
  const names = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (e.name.startsWith('.')) continue;
    if (e.name === 'node_modules' || e.name === 'bin' || e.name === 'shared') continue;
    const skillFile = path.join(PACKAGE_ROOT, e.name, 'SKILL.md');
    if (fs.existsSync(skillFile)) names.push(e.name);
  }
  return names.sort();
}

function readFrontmatter(skillName) {
  const skillFile = path.join(PACKAGE_ROOT, skillName, 'SKILL.md');
  const raw = fs.readFileSync(skillFile, 'utf8');
  if (!raw.startsWith('---\n')) return {};
  const end = raw.indexOf('\n---\n', 4);
  if (end === -1) return {};
  const block = raw.slice(4, end);
  const out = {};
  for (const line of block.split('\n')) {
    const m = line.match(/^([a-zA-Z_-]+):\s*(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else if (entry.isFile()) fs.copyFileSync(s, d);
  }
}

function removeDir(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function isSymlink(p) {
  try { return fs.lstatSync(p).isSymbolicLink(); }
  catch { return false; }
}

function exists(p) {
  try { fs.lstatSync(p); return true; }
  catch { return false; }
}

function parseFlags(argv) {
  const positional = [];
  const flags = { force: false, dir: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--force' || a === '-f') flags.force = true;
    else if (a === '--dir') flags.dir = argv[++i];
    else if (a.startsWith('--dir=')) flags.dir = a.slice('--dir='.length);
    else positional.push(a);
  }
  return { positional, flags };
}

function commandList() {
  const skills = discoverSkills();
  if (skills.length === 0) {
    warn('no skills found in this package');
    return;
  }
  log(`${c.bold}Available skills${c.reset} ${c.dim}(${skills.length})${c.reset}`);
  for (const name of skills) {
    const fm = readFrontmatter(name);
    const desc = fm.description || '(no description)';
    const truncated = desc.length > 100 ? desc.slice(0, 100) + '…' : desc;
    log(`  ${c.cyan}${name}${c.reset}  ${c.dim}${truncated}${c.reset}`);
  }
}

function commandInstalled(flags) {
  const target = flags.dir || DEFAULT_TARGET;
  if (!exists(target)) {
    info(`no skills directory at ${target}`);
    return;
  }
  const entries = fs.readdirSync(target, { withFileTypes: true });
  const installed = entries
    .filter(e => e.isDirectory() || e.isSymbolicLink())
    .map(e => ({
      name: e.name,
      symlink: isSymlink(path.join(target, e.name)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (installed.length === 0) {
    info(`no skills installed in ${target}`);
    return;
  }
  log(`${c.bold}Installed skills${c.reset} ${c.dim}(${installed.length} in ${target})${c.reset}`);
  for (const s of installed) {
    const tag = s.symlink ? ` ${c.dim}→ symlink${c.reset}` : '';
    log(`  ${c.cyan}${s.name}${c.reset}${tag}`);
  }
}

function commandAdd(positional, flags) {
  const available = discoverSkills();
  const wanted = positional.length > 0 ? positional : available;

  const unknown = wanted.filter(n => !available.includes(n));
  if (unknown.length) fail(`unknown skill(s): ${unknown.join(', ')}\nrun \`skills list\` to see what's available`);

  const target = flags.dir || DEFAULT_TARGET;
  fs.mkdirSync(target, { recursive: true });

  let installed = 0, skipped = 0, replaced = 0;
  for (const name of wanted) {
    const src = path.join(PACKAGE_ROOT, name);
    const dest = path.join(target, name);

    if (exists(dest)) {
      if (isSymlink(dest)) {
        if (!flags.force) {
          warn(`${name}: target is a symlink, skipping (use --force to replace)`);
          skipped++;
          continue;
        }
        fs.unlinkSync(dest);
        replaced++;
      } else {
        removeDir(dest);
        replaced++;
      }
    }
    copyDir(src, dest);
    ok(`${name}${replaced > installed ? ' (replaced)' : ''}`);
    installed++;
  }

  log('');
  log(`${c.bold}done${c.reset} ${c.dim}— ${installed} installed, ${skipped} skipped, target: ${target}${c.reset}`);
}

function commandRemove(positional, flags) {
  if (positional.length === 0) fail('usage: skills remove <name> [<name>...]');
  const target = flags.dir || DEFAULT_TARGET;
  let removed = 0, skipped = 0;
  for (const name of positional) {
    const dest = path.join(target, name);
    if (!exists(dest)) {
      info(`${name}: not installed`);
      continue;
    }
    if (isSymlink(dest) && !flags.force) {
      warn(`${name}: target is a symlink, skipping (use --force to remove)`);
      skipped++;
      continue;
    }
    if (isSymlink(dest)) fs.unlinkSync(dest);
    else removeDir(dest);
    ok(`removed ${name}`);
    removed++;
  }
  log('');
  log(`${c.bold}done${c.reset} ${c.dim}— ${removed} removed, ${skipped} skipped, target: ${target}${c.reset}`);
}

function help() {
  log(`${c.bold}skills${c.reset} — install Claude Code skills from ${c.dim}@0xdeafcafe/skills${c.reset}

${c.bold}Usage${c.reset}
  ${c.cyan}skills add${c.reset} [name...] [--force] [--dir <path>]
      Install all skills, or the named ones. Default target: ${DEFAULT_TARGET}
      Existing regular directories are replaced; symlinks are skipped unless --force.

  ${c.cyan}skills list${c.reset}
      List the skills available in this package.

  ${c.cyan}skills installed${c.reset} [--dir <path>]
      List the skills currently installed in the target directory.

  ${c.cyan}skills remove${c.reset} <name>... [--force] [--dir <path>]
      Remove the named skills from the target directory. Symlinks are skipped
      unless --force.

${c.bold}Examples${c.reset}
  ${c.dim}# Install everything via npx (no clone required)${c.reset}
  npx @0xdeafcafe/skills add
  npx github:0xdeafcafe/skills add

  ${c.dim}# Install just the PR + UX drivers${c.reset}
  npx @0xdeafcafe/skills add drive-pr drive-ux

  ${c.dim}# See what's available${c.reset}
  npx @0xdeafcafe/skills list

  ${c.dim}# Install into a per-project skills dir${c.reset}
  npx @0xdeafcafe/skills add --dir ./.claude/skills

${c.bold}Version${c.reset} ${VERSION}`);
}

function main(argv) {
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h' || argv[0] === 'help') return help();
  if (argv[0] === '--version' || argv[0] === '-v') return log(VERSION);

  const cmd = argv[0];
  const { positional, flags } = parseFlags(argv.slice(1));

  switch (cmd) {
    case 'add':       return commandAdd(positional, flags);
    case 'list':      return commandList();
    case 'installed': return commandInstalled(flags);
    case 'remove':
    case 'rm':        return commandRemove(positional, flags);
    default:          fail(`unknown command: ${cmd}\nrun \`skills --help\` for usage`);
  }
}

main(process.argv.slice(2));
