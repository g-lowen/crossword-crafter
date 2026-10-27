import type { Answer, Puzzle } from './puzzle'

function answer(id: string, text: string, row: number, col: number, dir: Answer['dir'], turns: Answer['turns'] = []): Answer {
  return { id, text, start: { row, col }, dir, turns, wideSpaces: [], visibleLetters: [] }
}

/** A real quiz ("På allas läppar"): five groups of five answers, with turns and thick borders. */
export const samplePuzzle: Puzzle = {
  answers: [
    answer('gorillaz', 'GORILLAZ', 3, 6, 'down'),
    answer('the-turtles', 'THE TURTLES', 5, 0, 'right'),
    answer('the-pussycat-dolls', 'THE PUSSYCAT DOLLS', 5, 0, 'down', [
      { atIndex: 4, dir: 'right' },
      { atIndex: 12, dir: 'down' },
    ]),
    answer('bjorn-afzelius', 'BJÖRN AFZELIUS', 2, 2, 'right'),
    answer('pantera', 'PANTERA', 0, 9, 'right', [{ atIndex: 2, dir: 'down' }]),
    answer('ebba-gron', 'EBBA GRÖN', 19, 22, 'right'),
    answer('simply-red', 'SIMPLY RED', 26, 20, 'right'),
    answer('pink', 'P!NK', 17, 30, 'down'),
    answer('bla-taget', 'BLÅ TÅGET', 25, 24, 'down', [{ atIndex: 3, dir: 'right' }]),
    answer('barry-white', 'BARRY WHITE', 16, 28, 'down'),
    answer('black-eyed-peas', 'BLACK EYED PEAS', 21, 7, 'right'),
    answer('bananarama', 'BANANARAMA', 18, 9, 'down'),
    answer('peaches', 'PEACHES', 16, 13, 'down'),
    answer('hall-and-oates', 'HALL&OATES', 27, 3, 'right'),
    answer('the-cranberries', 'THE CRANBERRIES', 24, 4, 'right'),
    answer('timbuktu', 'TIMBUKTU', 11, 25, 'right'),
    answer('florence-and-the-machine', 'FLORENCE + THE MACHINE', 7, 19, 'right'),
    answer('berlin', 'BERLIN', 6, 23, 'down'),
    answer('mora-trask', 'MORA TRÄSK', 2, 30, 'down'),
    answer('london-grammar', 'LONDON GRAMMAR', 2, 20, 'right'),
    answer('bee-gees', 'BEE GEES', 11, 11, 'right'),
    answer('nina-simone', 'NINA SIMONE', 1, 13, 'down'),
    answer('janis-joplin', 'JANIS JOPLIN', 7, 18, 'down'),
    answer('benjamin-and-carola', 'BENJAMIN & CAROLA', 17, 12, 'right'),
    answer('bonnie-tyler', 'BONNIE TYLER', 6, 21, 'down', [{ atIndex: 9, dir: 'right' }]),
  ],
  anagram: { showNumbersAndBar: false, cells: [] },
  separators: [
    { a: { row: 3, col: 6 }, b: { row: 2, col: 6 } },
    { a: { row: 7, col: 19 }, b: { row: 7, col: 18 } },
  ],
  groups: [
    { start: 0, name: 'Djur', color: '#d4ebfb' },
    { start: 5, name: 'Färg', color: '#fff1bf' },
    { start: 10, name: 'Ätbart', color: '#d6f0cf' },
    { start: 15, name: 'Städer', color: '#fbdbe6' },
    { start: 20, name: 'Samma låt', color: '#e4dcf6' },
  ],
  highlightColor: '#1e88e5',
  includeStartArrow: true,
  cellSizeMm: 7,
}
