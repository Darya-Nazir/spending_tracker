import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const MODULES_DIR = new URL('../../src/modules/', import.meta.url);

type SourceFile = {
    /** Путь от src/modules, например identity/auth/auth.service.ts */
    relativePath: string;
    imports: string[];
};

const collectSourceFiles = async (directory: URL, prefix = ''): Promise<SourceFile[]> => {
    const entries = await readdir(directory, { withFileTypes: true });
    const files: SourceFile[] = [];

    for (const entry of entries) {
        if (entry.isDirectory()) {
            files.push(...await collectSourceFiles(
                new URL(`${entry.name}/`, directory),
                `${prefix}${entry.name}/`,
            ));
            continue;
        }
        if (!entry.name.endsWith('.ts')) {
            continue;
        }
        const source = await readFile(new URL(entry.name, directory), 'utf8');
        const imports = [...source.matchAll(/from '([^']+)'/g)].map((match) => match[1] ?? '');
        files.push({ relativePath: `${prefix}${entry.name}`, imports });
    }

    return files;
};

/** Путь импорта, приведённый к виду identity/auth/auth.service.ts. */
const resolveInsideModules = (file: SourceFile, specifier: string): string | null => {
    if (!specifier.startsWith('.')) {
        return null;
    }
    const fromModulesRoot = path.posix.normalize(
        path.posix.join(path.posix.dirname(file.relativePath), specifier),
    );
    return fromModulesRoot.startsWith('..') ? null : fromModulesRoot;
};

const moduleOf = (relativePath: string): string => relativePath.split('/')[0] ?? '';

test('a module reaches a neighbour only through its contracts file', async () => {
    // модуль обращается к соседнему только через его contracts
    const files = await collectSourceFiles(MODULES_DIR);
    assert.ok(files.length > 0, 'src/modules must contain source files');
    const violations: string[] = [];

    for (const file of files) {
        const owner = moduleOf(file.relativePath);
        for (const specifier of file.imports) {
            const target = resolveInsideModules(file, specifier);
            if (target === null) {
                continue;
            }
            const targetOwner = moduleOf(target);
            if (targetOwner === owner || target === `${targetOwner}/contracts.ts`) {
                continue;
            }
            violations.push(`${file.relativePath} imports ${target}`);
        }
    }

    assert.deepEqual(violations, []);
});

test('modules keep application orchestration outside their dependencies', async () => {
    // модули сохраняют координацию уровня приложения за пределами своих зависимостей
    const files = await collectSourceFiles(MODULES_DIR);
    const violations: string[] = [];

    for (const file of files) {
        for (const specifier of file.imports) {
            if (!specifier.startsWith('.')) {
                continue;
            }
            const target = path.posix.normalize(
                path.posix.join(path.posix.dirname(file.relativePath), specifier),
            );
            if (target.startsWith('../application/')) {
                violations.push(`${file.relativePath} imports ${target}`);
            }
        }
    }

    assert.deepEqual(violations, []);
});
