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
- Answers are placed by dragging them from the list onto the grid, and can be dragged again to
  move them.
- An answer reads right or down, and can turn 90° at any letter. Usually at most once, but more
  turns must be possible. A small corner arrow (↱ ↳ etc.) marks where an answer starts or turns.

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
    is drawn below the grid, labelled with the same numbers.
  - Unchecked: only the red borders are drawn.
- Sammy sets the numbering order himself. It's usually left to right, but not always.
- An anagram cell is tied to an answer letter, so it moves with the answer.

## Exports

Images are transparent PNGs at a fixed size, so they stack exactly on top of each other in
PowerPoint.

1. **Skeleton:** the empty grid with spaces, turn arrows, separators, red anagram borders, and the
   anagram numbers and bar if enabled.
2. **Quiz images:** one per answer, in list order. The skeleton with that answer marked by a thick
   border in a color Sammy picks. Only the current answer is marked.
   - Sammy normally adds the pointer arrow to the start of the answer himself in PowerPoint.
     Checkbox "Include start arrow" adds it to the image instead.
3. **Correction images:** one per answer, in list order. The skeleton with answers filled in
   cumulatively: image N shows answers 1 to N.

Delivered as one zip with numbered file names.

## Saving

- Autosave to `localStorage`.
- "Copy state" / "Paste state" as JSON text, to move a puzzle to another computer.
- No backend.

## Data model (draft)

Grid cells are computed from the answers, not stored.

```ts
type Dir = "right" | "down" | "left" | "up";

type Answer = {
  id: string;
  text: string;
  start: { row: number; col: number };
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

## Build order

1. Scaffold: Vite, React, TypeScript, dnd kit, Vitest.
2. Layout engine: answers to cells, turns, wide spaces, conflicts. Pure TypeScript with tests.
3. Grid UI at fixed cell size, A4 landscape.
4. Answer import and drag and drop onto the grid.
5. Editing: turns, wide spaces, separators, anagram cells and numbering.
6. Save and load.
7. PNG exports as a zip.

## Open decisions

- **Exporting a `.pptx`.** A generated deck can contain the same PNGs, one per slide, already
  stacked in order. It costs no flexibility: Sammy can still copy slides into his own deck and add
  titles. It saves placing 20+ images by hand. Plan: ship the PNG zip first; add the `.pptx`
  (e.g. with `pptxgenjs`) once PNG rendering exists. Revisit after step 7.
- **Page margins.** Whether the 29 × 21 grid needs a margin for printing.
- **Special characters** in answers. Wait for Sammy's feedback.
