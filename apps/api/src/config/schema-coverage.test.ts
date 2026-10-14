import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { CHILD_SCOPE_PATHS, EXEMPT_MODELS, OWNED_MODELS } from './tenant-scope';

/**
 * Guards the tenant policy against schema drift: add a model or a relation
 * without deciding how it is isolated and this file fails.
 */

interface ParsedModel {
  fields: Map<string, { type: string; optional: boolean }>;
}

const schemaPath = join(__dirname, '../../prisma/schema.prisma');

const parseModels = (): Map<string, ParsedModel> => {
  const source = readFileSync(schemaPath, 'utf8');
  const models = new Map<string, ParsedModel>();

  for (const match of source.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)) {
    const fields = new Map<string, { type: string; optional: boolean }>();

    for (const line of (match[2] ?? '').split('\n')) {
      const field = /^\s{2}(\w+)\s+(\w+)(\?|\[\])?/.exec(line);

      if (field && !line.trimStart().startsWith('@@') && !line.trimStart().startsWith('//')) {
        fields.set(field[1]!, { type: field[2]!, optional: field[3] === '?' });
      }
    }

    models.set(match[1]!, { fields });
  }

  return models;
};

const models = parseModels();
const owned = new Set<string>(OWNED_MODELS);
const exempt = new Set<string>(EXEMPT_MODELS);

describe('tenant policy covers the whole schema', () => {
  it('finds the models', () => {
    expect(models.size).toBeGreaterThan(20);
  });

  it('puts every model in exactly one bucket', () => {
    const unassigned: string[] = [];
    const doubled: string[] = [];

    for (const name of models.keys()) {
      const buckets = [owned.has(name), name in CHILD_SCOPE_PATHS, exempt.has(name)].filter(
        Boolean,
      );

      if (buckets.length === 0) unassigned.push(name);
      if (buckets.length > 1) doubled.push(name);
    }

    expect(unassigned, 'models without a tenant policy').toEqual([]);
    expect(doubled, 'models in more than one bucket').toEqual([]);
  });

  it('does not list models that no longer exist', () => {
    const listed = [...owned, ...Object.keys(CHILD_SCOPE_PATHS), ...exempt];

    expect(listed.filter((name) => !models.has(name))).toEqual([]);
  });

  it('gives every owned model a required organizationId', () => {
    for (const name of owned) {
      const field = models.get(name)?.fields.get('organizationId');

      expect(field, `${name}.organizationId`).toEqual({ type: 'String', optional: false });
    }
  });

  it('treats any model with its own organizationId as owned', () => {
    const withColumn = [...models.entries()]
      .filter(([name, model]) => name !== 'User' && model.fields.has('organizationId'))
      .map(([name]) => name);

    expect(withColumn.filter((name) => !owned.has(name))).toEqual([]);
  });

  it('resolves every child path through real relations up to an owned model', () => {
    for (const [name, path] of Object.entries(CHILD_SCOPE_PATHS)) {
      let current = name;

      for (const relation of path) {
        const field = models.get(current)?.fields.get(relation);

        expect(field, `${current}.${relation}`).toBeDefined();
        expect(field?.optional, `${current}.${relation} must be a required relation`).toBe(false);
        current = field!.type;
      }

      expect(owned.has(current), `${name} path ends at owned model ${current}`).toBe(true);
    }
  });
});

describe('services keep to scalar foreign keys', () => {
  const sourceFiles = (directory: string): string[] =>
    readdirSync(directory).flatMap((entry) => {
      const full = join(directory, entry);

      if (statSync(full).isDirectory()) {
        return entry === 'generated' ? [] : sourceFiles(full);
      }

      return full.endsWith('.ts') && !full.endsWith('.test.ts') ? [full] : [];
    });

  it('never uses relation connect, which the tenant extension cannot check', () => {
    const offenders = sourceFiles(join(__dirname, '..')).filter((file) =>
      /\b(connect|connectOrCreate)\s*:/.test(readFileSync(file, 'utf8')),
    );

    expect(offenders).toEqual([]);
  });

  it('only uses raw SQL where it is scoped by hand', () => {
    const rawSql = sourceFiles(join(__dirname, '..')).filter((file) =>
      /\$(queryRaw|executeRaw)(Unsafe)?\b/.test(readFileSync(file, 'utf8')),
    );
    const relative = rawSql.map((file) => file.slice(join(__dirname, '..').length + 1)).sort();

    // transaction.service filters by organizationId manually; health only runs SELECT 1.
    expect(relative).toEqual([
      'controllers/health.controller.ts',
      'services/transaction.service.ts',
    ]);
  });
});
