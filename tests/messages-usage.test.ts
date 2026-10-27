import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import en from '../frontend/messages/en.json'
import it from '../frontend/messages/it.json'

const SOURCE_DIRS = ['frontend', 'backend'].map((dir) => path.join(import.meta.dirname, '..', dir))

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) return name.startsWith('.') || name === 'node_modules' ? [] : sourceFiles(full)
    return /\.(ts|tsx)$/.test(name) ? [full] : []
  })
}

function has(messages: unknown, key: string): boolean {
  let node: unknown = messages
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object' || !(part in (node as Record<string, unknown>))) return false
    node = (node as Record<string, unknown>)[part]
  }
  return typeof node === 'string'
}

/** Namespace dichiarati nel file (`''` = radice, per `useTranslations()` senza argomenti). */
function namespacesOf(source: string): string[] {
  const out = new Set<string>()
  for (const m of source.matchAll(/(?:useTranslations|getTranslations)\(\s*'([^']*)'\s*\)/g)) out.add(m[1])
  for (const m of source.matchAll(/getTranslations\(\s*\{[^}]*namespace:\s*'([^']*)'/g)) out.add(m[1])
  if (/(?:useTranslations|getTranslations)\(\s*\)/.test(source)) out.add('')
  return [...out]
}

// Nomi con cui i traduttori sono chiamati nel codice. Le chiavi costruite con `${...}` non si controllano qui:
// le coprono i test di parità e dei codici di errore in i18n.test.ts.
const CALL = /\b(?:t|tb|tc|te|tAll)\(\s*'([A-Za-z0-9_.]+)'/g

describe('uso dei messaggi', () => {
  const files = SOURCE_DIRS.flatMap(sourceFiles).filter((f) => /useTranslations|getTranslations/.test(readFileSync(f, 'utf8')))

  test('trova i file che usano le traduzioni', () => {
    expect(files.length).toBeGreaterThan(10)
  })

  test.each(files.map((f) => [path.relative(path.join(import.meta.dirname, '..'), f), f]))('%s: ogni chiave letterale esiste in IT ed EN', (_rel, file) => {
    const source = readFileSync(file, 'utf8')
    const namespaces = namespacesOf(source)
    for (const [, key] of source.matchAll(CALL)) {
      const candidates = namespaces.map((ns) => (ns ? `${ns}.${key}` : key))
      expect(candidates.some((c) => has(it, c)), `it: ${key} (namespace ${namespaces.join(', ') || '—'})`).toBe(true)
      expect(candidates.some((c) => has(en, c)), `en: ${key} (namespace ${namespaces.join(', ') || '—'})`).toBe(true)
    }
  })
})
