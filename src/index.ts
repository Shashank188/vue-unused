import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface Result {
  category: 'files' | 'exports' | 'configs';
  item: string;
  confidence: number;
  reason: string;
}

function getStagedFiles(): string[] {
  try {
    const output = execSync('git diff --name-only --cached', { encoding: 'utf8' });
    return output.trim().split('\n').filter(f => f && (f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.vue') || f.endsWith('.json')));
  } catch {
    return [];
  }
}

function getEntryPoints(): string[] {
  const entries = ['src/main.ts'];
  // Add stores
  if (fs.existsSync('src/stores')) {
    const stores = fs.readdirSync('src/stores').filter(f => f.endsWith('.ts')).map(f => path.join('src/stores', f));
    entries.push(...stores);
  }
  // views, pages, plugins, routes
  ['views', 'pages', 'plugins', 'routes'].forEach(dir => {
    if (fs.existsSync(`src/${dir}`)) {
      const files = fs.readdirSync(`src/${dir}`).filter(f => f.endsWith('.ts') || f.endsWith('.vue')).map(f => path.join(`src/${dir}`, f));
      entries.push(...files);
    }
  });
  // vite.config.ts
  if (fs.existsSync('vite.config.ts')) entries.push('vite.config.ts');
  // package.json scripts
  if (fs.existsSync('package.json')) {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    for (const script of Object.values(pkg.scripts || {})) {
      const str = script as string;
      const match = str.match(/(ts-node|node)\s+(.+)/);
      if (match) {
        const file = match[2].split(' ')[0];
        if (fs.existsSync(file)) entries.push(file);
      }
    }
  }
  return entries;
}

function getScriptContent(filePath: string): string {
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  return match ? match[1] : '';
}

const sourceFiles: Map<string, ts.SourceFile> = new Map();

function getSourceFile(filePath: string): ts.SourceFile | undefined {
  if (sourceFiles.has(filePath)) return sourceFiles.get(filePath);
  const content = path.extname(filePath) === '.vue' ? getScriptContent(filePath) : fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  sourceFiles.set(filePath, sourceFile);
  return sourceFile;
}

export function detectUnused() {
  const staged = getStagedFiles();
  const entries = getEntryPoints();

  // Map of file to exports
  const fileExports: Map<string, Set<string>> = new Map();
  // Set of used files
  const usedFiles = new Set<string>();
  // Set of used exports
  const usedExports = new Set<string>();

  // Function to get exports from file
  function getExports(filePath: string): Set<string> {
    if (fileExports.has(filePath)) return fileExports.get(filePath)!;
    const sourceFile = getSourceFile(filePath);
    if (!sourceFile) return new Set();
    const exports = new Set<string>();
    ts.forEachChild(sourceFile, node => {
      if (ts.isExportDeclaration(node)) {
        if (node.exportClause && ts.isNamedExports(node.exportClause)) {
          node.exportClause.elements.forEach(e => exports.add(e.name.text));
        }
      } else if (ts.isExportAssignment(node)) {
        exports.add('default');
      } else if (ts.isVariableStatement(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
        node.declarationList.declarations.forEach(d => {
          if (ts.isVariableDeclaration(d) && ts.isIdentifier(d.name)) {
            exports.add(d.name.text);
          }
        });
      } else if (ts.isFunctionDeclaration(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
        if (node.name) exports.add(node.name.text);
      } else if (ts.isClassDeclaration(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
        if (node.name) exports.add(node.name.text);
      }
    });
    fileExports.set(filePath, exports);
    return exports;
  }

  // Function to resolve module
  function resolveModule(from: string, module: string): string | null {
    let resolved = path.resolve(path.dirname(from), module);
    const exts = ['.ts', '.js', '.vue'];
    for (const ext of exts) {
      if (fs.existsSync(resolved + ext)) return resolved + ext;
    }
    if (fs.existsSync(resolved)) return resolved;
    if (fs.existsSync(resolved + '/index.ts')) return resolved + '/index.ts';
    return null;
  }

  // Function to traverse imports
  function traverse(filePath: string) {
    if (usedFiles.has(filePath)) return;
    usedFiles.add(filePath);
    const sourceFile = getSourceFile(filePath);
    if (!sourceFile) return;
    ts.forEachChild(sourceFile, node => {
      if (ts.isImportDeclaration(node)) {
        const module = (node.moduleSpecifier as ts.StringLiteral).text;
        const resolved = resolveModule(filePath, module);
        if (resolved) {
          traverse(resolved);
          if (node.importClause) {
            if (node.importClause.name) {
              usedExports.add(`${resolved}:default`);
            }
            if (node.importClause.namedBindings) {
              if (ts.isNamedImports(node.importClause.namedBindings)) {
                node.importClause.namedBindings.elements.forEach(e => {
                  usedExports.add(`${resolved}:${e.name.text}`);
                });
              } else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
                getExports(resolved).forEach(exp => usedExports.add(`${resolved}:${exp}`));
              }
            }
          }
        }
      } else if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'import' && node.arguments.length > 0) {
        const arg = node.arguments[0];
        if (ts.isStringLiteral(arg)) {
          const module = arg.text;
          const resolved = resolveModule(filePath, module);
          if (resolved) {
            traverse(resolved);
            getExports(resolved).forEach(exp => usedExports.add(`${resolved}:${exp}`));
          }
        }
      }
    });
  }

  // Start traversal from entries
  entries.forEach(traverse);

  // Now, collect results
  const results: Result[] = [];

  // For staged files not used
  staged.forEach(file => {
    if (!usedFiles.has(file)) {
      results.push({
        category: 'files',
        item: file,
        confidence: 100,
        reason: 'File not reachable from entry points'
      });
    }
  });

  // For exports in staged files not used
  staged.forEach(file => {
    const exports = getExports(file);
    exports.forEach(exp => {
      const key = `${file}:${exp}`;
      if (!usedExports.has(key)) {
        results.push({
          category: 'exports',
          item: key,
          confidence: 100,
          reason: 'Export not imported'
        });
      }
    });
  });

  // Segregate
  const segregated = {
    files: results.filter(r => r.category === 'files'),
    exports: results.filter(r => r.category === 'exports'),
    configs: results.filter(r => r.category === 'configs'),
  };

  console.log(JSON.stringify(segregated, null, 2));
}