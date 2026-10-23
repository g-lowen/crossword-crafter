# Crossword Crafter – Specification

A desktop web tool for building music quiz crosswords by hand and exporting the images used in
PowerPoint presentations. Replaces the current workflow in Excel.

Existing crossword generators don't fit: every puzzle is hand-customized. The goal is not to
automate layout but to make manual layout fast.

## Users and context

- One primary user (Sammy), desktop only, UI in English.
- Puzzles are shown in PowerPoint during a quiz and again when the quiz is corrected.
- Titles like "Fråga 18:" and any extra notes are added in PowerPoint, not in this tool.
- No clues. Answers only.

## The page

- A4 landscape, 1 cm square cells. The grid is 29 × 21 cells.
- All cells have the same size in every puzzle and every export.

## Answers

- Imported as a list (pasted text, one answer per line). List order is the reveal order.
- The order can be changed after import.
- Text is uppercase. Letters (including Å, Ä, Ö) and digits are allowed. Other special characters
  are out of scope for now.
- A space inside an answer is drawn as a black cell.
- A space can be widened to span two cells to make an answer fit. A wide space is drawn as one
  black block with a white arrow showing the reading direction.
- Answers are placed by dragging them from the list onto the grid. The first letter lands under
  the pointer, and a preview shows where the answer will go. A placed answer can be dragged by any
  of its cells to move it, or dragged back to the list to take it off the grid.
- Each answer in the list has a button to switch it between across and down.
- The list order is changed by dragging answers within the list.
- An answer reads right or down, and can turn 90° at any letter. Usually at most once, but more
  turns must be possible.
- Arrows in cells only ever mean one of two things: a small corner arrow where an answer turns,
  and the white arrow in a wide space showing that the answer continues after it. There are no
  arrows at the start of an answer.

## Editing a placed answer

Clicking a cell selects that character of the answer and opens a panel above the grid. Clicking a
crossing cell again switches to the other answer. Esc or a click on an empty spot closes it. The
panel has:

- Whole answer: direction, take off grid.
- Turn here: one button per 90° direction. Clicking the active one again removes the turn.

A turn arrow sits in the corner of the cell where its bend is: ↳ in the bottom-left, ↱ in the
top-left, and so on.
- Cell: "Wide space" for a space, or "Anagram letter" with its number for a letter.
- Thick border: top, right, bottom, left of the selected cell.

## Crossings

- Answers may share cells. Mismatching letters are allowed; it's up to Sammy to fix them.
- The editor shows a warning on mismatching cells. Warnings never appear in exports.

## Separators

- When two unrelated answers end up next to each other, Sammy can thicken the border between two
  adjacent cells to show they are not connected.

## Anagram

- Any letter cell can be marked as an anagram cell. Anagram cells always have a red, thick border.
- Checkbox "Show anagram numbers and bar":
  - Checked: anagram cells show a small number, and a bar of empty cells (one per anagram letter)
    is drawn on the page, numbered 1, 2, 3… above each cell.
  - Unchecked: only the red borders are drawn.
- The bar sits in the middle of the bottom row of the page.
- Sammy sets the numbering order himself. It's usually left to right, but not always. A new anagram
  letter gets the next free number, and "Number anagram left to right" renumbers them all by column.
- An anagram cell is tied to an answer letter, so it moves with the answer.

## Exports

"Export images" opens a panel with the export settings, a preview of the first quiz image, and a
"Download zip" button. Images are transparent PNGs of the whole A4 page, 2283 × 1654 pixels
(200 dpi), so they stack exactly on top of each other in PowerPoint. Only answers on the grid get
images; the panel lists the ones left out, and says when the puzzle has issues.

1. **Skeleton** (`skeleton.png`): the empty grid with spaces, turn arrows, separators, red anagram
   borders, and the anagram numbers and bar if enabled.
2. **Quiz images** (`quiz/01-the-beatles.png`, …): one per answer, in list order. The skeleton
   with that answer outlined as one shape in the highlight color Sammy picks. Only the current
   answer is marked.
   - Sammy normally adds the pointer arrow to the start of the answer himself in PowerPoint. The
     checkbox "Arrow to the start of the answer in quiz images" draws one in the cell before the
     start instead. It may cover other cells, and is cut off for an answer starting at the page
     edge.
3. **Correction images** (`correction/01-the-beatles.png`, …): one per answer, in list order. The
   skeleton with answers filled in cumulatively: image N shows answers 1 to N.

The zip is named after the puzzle. The image rendering (`src/export/render-image.tsx`) is loaded
only when Sammy downloads, because it pulls in `react-dom/server`.

## Saving and My puzzles

There is no backend. Everything is saved in the browser Sammy uses, and nowhere else.

- Sammy can keep several puzzles. Each has a name and a last-changed time. The open puzzle
  autosaves to `localStorage` on every change, and the last one opened comes back when the page
  opens. If the browser won't store anything, a warning says so and points to Copy state.
- The name of the open puzzle is a clearly visible "Name" field at the start of the header. The
  page has no app title; the browser tab is still called "Crossword Crafter".
- "My puzzles" lists them all, most recently changed first, with their answer counts and last-edited time (labelled "Last edited" on hover). The open one
  has a highlighted background. Each can be opened, renamed in place with the pen next to its
  name (Enter or clicking away saves, Esc cancels), duplicated, or deleted after a confirm. Deleting the last one leaves one
  empty puzzle. Renaming doesn't count as a change, so the list doesn't reorder.
- The My puzzles and Paste state panels close on Esc or a click outside them.
- "New puzzle" and "Load sample" add a puzzle to the list and open it. Nothing is replaced.
- A new puzzle (from New puzzle, Load sample, Paste state or Duplicate) whose name is taken gets
  the lowest free number: "Untitled puzzle (1)", "Quiz 18 (2)". Renaming doesn't add numbers.
- "Copy state" puts the open puzzle and its name on the clipboard as JSON. "Paste state" adds a
  pasted puzzle to the list as a new puzzle. A broken or incomplete paste shows what's wrong and
  changes nothing. This is how a puzzle moves to another computer or gets kept somewhere safe.
- Saved shapes, in `src/model/persistence.ts`:
  - The list: `{ version, library: { currentId, entries: [{ id, name, updatedAt, puzzle }] } }`.
  - Copy state: `{ version, name, puzzle }`.
  - Before the list existed, a single puzzle was saved under `crossword-crafter/puzzle`. It is
    carried over as the first entry the first time the list is loaded.
  - Everything is validated field by field, with defaults for missing optional parts. Old versions
    must stay readable when a shape changes.
- There is no undo.

## Data model

Grid cells are computed from the answers, not stored.

```ts
type Dir = "right" | "down" | "left" | "up";

type Answer = {
  id: string;
  text: string;
  start: { row: number; col: number } | null; // null until placed on the grid
  dir: Dir;
  turns: { atIndex: number; dir: Dir }[];
  wideSpaces: number[]; // indices of spaces that span two cells
};

type CellRef = { row: number; col: number };

type Puzzle = {
  answers: Answer[]; // array order is reveal order
  anagram: {
    showNumbersAndBar: boolean;
    cells: { answerId: string; letterIndex: number; number?: number }[];
  };
  separators: { a: CellRef; b: CellRef }[];
  highlightColor: string;
  includeStartArrow: boolean;
};
```

The real types are in `src/model/puzzle.ts`. `layoutPuzzle` in `src/layout/layout.ts` turns a
puzzle into cells, markers and issues:

- A turn at letter N means letter N is the corner cell, and the next letters go in the new
  direction. A turn must be 90°. A turn on a wide space, or on the last letter, is reported and
  ignored.
- Issues (shown in the editor, never exported): mismatching crossings, an answer crossing itself,
  cells outside the page, invalid turns or wide spaces, invalid anagram cells, duplicate anagram
  numbers.

`GridView` in `src/grid/grid-view.tsx` draws a layout as SVG, with 1 unit = 1 mm. The same
component draws the editor (page background, guide lines, conflict warnings) and the exports
(none of those, transparent background), so what Sammy sees is what gets exported.

## Build order

1. Scaffold: Vite, React, TypeScript, dnd kit, Vitest.
2. Layout engine: answers to cells, turns, wide spaces, conflicts. Pure TypeScript with tests.
3. Grid UI at fixed cell size, A4 landscape.
4. Answer import and drag and drop onto the grid.
5. Editing: turns, wide spaces, separators, anagram cells and numbering.
6. Save and load: autosave, My puzzles, Copy state, Paste state.
7. PNG exports as a zip: skeleton, quiz and correction images.

## Open decisions

- **Exporting a `.pptx`.** A generated deck can contain the same PNGs, one per slide, already
  stacked in order. It costs no flexibility: Sammy can still copy slides into his own deck and add
  titles. It saves placing 20+ images by hand. Plan: ship the PNG zip first; add the `.pptx`
  (e.g. with `pptxgenjs`) now that PNG rendering exists. Up next for discussion.
- **Page margins.** Whether the 29 × 21 grid needs a margin for printing.
- **Special characters** in answers. Wait for Sammy's feedback.
- **Download backup.** A button that downloads all puzzles as one file, and a way to load it back.
  Wanted, but not now.
