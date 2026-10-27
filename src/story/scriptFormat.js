// @ts-check
/**
 * Format plików z dialogami (ten sam pomysł co w Zryw '44).
 *
 *   # komentarz
 *   [klucz]            początek bloku; kod gry odwołuje się do tego klucza
 *   [klucz] tekst      blok jednowierszowy (np. treść celu)
 *   kto: tekst         kwestia postaci (postacie z pliku postacie.json)
 *   - tekst            opcja wyboru dla gracza (kolejność ma znaczenie!)
 *   linia bez „kto:”   dokleja się do poprzedniej kwestii
 *   *kursywa*, **pogrubienie**
 *
 * Plik jest zwykłym JS (z typami w JSDoc), żeby ten sam parser działał
 * w grze i w skrypcie `npm run teksty` uruchamianym przez Node.
 */

/** @typedef {{ who: string, text: string }} Line */
/** @typedef {{ key: string, text: string, lines: Line[], choices: string[], line: number }} Block */
/** @typedef {{ line: number, kind: 'unknown-speaker' | 'duplicate-key' | 'orphan-line', message: string }} ScriptWarning */

/**
 * @param {string} source
 * @param {Iterable<string>} speakers znane identyfikatory postaci
 * @returns {{ blocks: Map<string, Block>, warnings: ScriptWarning[] }}
 */
export function parseScript(source, speakers) {
  const known = new Set(speakers);
  /** @type {Map<string, Block>} */
  const blocks = new Map();
  /** @type {ScriptWarning[]} */
  const warnings = [];
  /** @type {Block | null} */
  let cur = null;

  source.split(/\r?\n/).forEach((raw, idx) => {
    const lineNo = idx + 1;
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;

    const head = line.match(/^\[([^\]]+)\]\s*(.*)$/);
    if (head) {
      const key = head[1].trim();
      if (blocks.has(key)) warnings.push({ line: lineNo, kind: 'duplicate-key', message: `powtórzony klucz [${key}]` });
      cur = { key, text: head[2] ?? '', lines: [], choices: [], line: lineNo };
      blocks.set(key, cur);
      return;
    }
    if (!cur) {
      warnings.push({ line: lineNo, kind: 'orphan-line', message: 'tekst przed pierwszym [kluczem]' });
      return;
    }
    if (line.startsWith('- ')) {
      cur.choices.push(line.slice(2).trim());
      return;
    }
    const said = line.match(/^([a-z0-9_ąęłśżźćńó]+):\s+(.*)$/i);
    if (said && known.has(said[1].toLowerCase())) {
      cur.lines.push({ who: said[1].toLowerCase(), text: said[2] });
      return;
    }
    if (said && !/\s/.test(said[1]) && said[1] === said[1].toLowerCase()) {
      warnings.push({ line: lineNo, kind: 'unknown-speaker', message: `nieznana postać „${said[1]}”` });
    }
    const last = cur.lines[cur.lines.length - 1];
    if (last) last.text += ' ' + line;
    else cur.text = cur.text ? cur.text + ' ' + line : line;
  });

  return { blocks, warnings };
}

/**
 * Bezpieczny HTML z prostym formatowaniem.
 * @param {string} text
 */
export function formatInline(text) {
  return text
    .replace(/[&<>"]/g, (c) => /** @type {Record<string,string>} */ ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}
