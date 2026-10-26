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

- A4 landscape (297 × 210 mm) with square cells. The grid is as many whole cells as fit on the page.
- "Cell size" in the Page menu picks the size per puzzle: 1 cm (29 × 21, the
  default), 9 mm (33 × 23), 8 mm (37 × 26) or 7 mm (42 × 30). Smaller cells fit more answers.
- Answers keep their cells counted from the top left when the size changes, so after a switch to
  bigger cells the ones near the right or bottom edge can end up outside the page; they show up
  under Issues. Lines and letters scale with the cells.
- All cells in one puzzle have the same size, in the editor and in every export.

## Screen layout

Sammy works on a laptop, so the whole editor fits the window and the grid is always fully visible
without scrolling:

- A one-line header: the puzzle name on the left; Puzzles ▾, Edit ▾, Page ▾ and Export images on
  the right.
- Puzzles ▾ opens the puzzle list, with "New puzzle" at the top and "Add sample puzzle" at the
  bottom.
- Page ▾ holds the page settings: Cell size, "Show anagram numbers and bar", and "Show letters in
  the editor". The first two belong to the puzzle and go into the exports. Show letters only
  changes the editor (the exports decide for themselves) and stays the same when switching
  puzzles.
- Left column: the answer list. The paste box is open while there are no answers, and folds away
  behind "+ Add answers" once there are.
- Middle: the grid, as large as the window allows while keeping its A4 proportions.
- Right column: the selected cell's settings, then Anagram (number left to right) and any issues.
- A small Light / Dark / GG switch sits at the right end of the header. Until Sammy picks one, the
  app follows the computer's light or dark setting and the switch shows which theme that is. A
  picked theme is remembered in the browser.
- GG uses the colors of Sammy's company logo (GG Bar): brown `#5f4625` for the background and
  panels, off-white `#f1f1f2` text, orange-red `#ef4b25` for the main buttons and selected states,
  and blue `#63ccf0` for links, outlines and placed answers. In dark mode everything around
  the grid goes dark, but the A4 page stays white with black cells, like paper and like the
  exported images, in every theme. Colors are CSS variables at the top of `src/index.css`.

## Answers

- Imported as a list (pasted text, one answer per line). List order is the reveal order.
- The order can be changed after import.
- **From a Spotify playlist** (Sammy builds his quizzes from Spotify lists and usually uses the
  artists as answers):
  1. He pastes the playlist link (Share, then Copy link to playlist) into the paste box. The app
     shows a link to Spotify's simplified "embed" view of that list
     (`open.spotify.com/embed/playlist/<id>`). The normal Spotify player can't be copied because its
     rows are drag handles; the embed view can.
  2. There he presses Ctrl+A and Ctrl+C, and pastes into the box.
  3. The app recognises the list and opens "Add answers from Spotify": one row per track with the
     title and artists, a suggested answer he can edit, and a checkbox to leave it out. "Use"
     switches all suggestions between Artist (the first artist, the default), All artists and
     Title (without "(feat. …)", "- 2005 Remaster" and the like).
  - The copied HTML is preferred: it marks the explicit badge, which is left out. Plain text is a
    fallback; there an "E" glued to the front of the artists is removed when followed by a capital
    or a sign, which can be wrong for artists such as "ELO".
  - The embed view shows at most 100 tracks. It's only been tried with a public playlist.
  - No Spotify login and no server: the app never contacts Spotify itself
    (`src/editor/spotify.ts`).
- Text is uppercase. Letters (including Å, Ä, Ö) and digits are allowed. Other special characters
  are out of scope for now.
- A space inside an answer is drawn as a black cell.
- A space can be widened to span two cells to make an answer fit. A wide space is drawn as one
  black block with a white arrow showing the reading direction.
- Answers are placed by dragging them from the list onto the grid. The first letter lands under
  the pointer, and a preview shows where the answer will go. A placed answer can be dragged by any
  of its cells to move it, or dragged back to the list to take it off the grid.
- The list has two modes. Normally answers can only be dragged to and from the grid, and the list
  order can't change, so an answer dragged back from the grid can't land in a new place. "Edit
  list" above the list switches to edit mode, where each answer has a pen to edit its text and ✕
  to remove it, answers are reordered by dragging them within the list, and groups are added,
  named, recolored and removed. "Done" switches back. The mode isn't saved; the list opens in the
  normal mode.
- Editing an answer: Enter or leaving the field saves, Esc cancels. Turns, wide spaces and anagram
  letters that no longer fit the new text are dropped.
- Direction is set on the grid (click a cell, then Whole answer: direction). New answers go across.
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
top-left, and so on. It is black, or white when the turn is at a space (a black cell).
- Cell: "Wide space" for a space, or "Anagram letter" with its number for a letter.
- Thick border: top, right, bottom, left of the selected cell.

## Moving several answers

- Ctrl+click (⌘+click on a Mac) on a cell adds its answer to a selection, or removes it. If one
  cell was already selected, its answer is the first in the selection. Ctrl+A selects every placed
  answer, except in text fields. Esc, a plain click or a click on an empty spot ends it.
- The selected answers are tinted, and the right panel says how many are selected instead of
  showing the cell settings.
- Dragging any of them moves them all, with the same preview as a single answer. Dropping them on
  the answer list takes them all off the grid.
- The arrow keys move them one cell at a time. They also move the answer of a single selected
  cell. A move that would push any of their cells off the page does nothing.
- Thick borders move along when they touch the moving answers and don't touch an answer that
  stays.
- Each move is one step for undo.

## Groups (several mini puzzles in one grid)

Gustav sometimes builds one grid out of several mini puzzles, each with its own background color.
The answers of one mini puzzle are always next to each other in the list, so groups are made with
dividers in the list:

- In edit mode, hovering an answer shows "+ New group" on its top edge. Clicking it starts a new
  group from that answer; the group runs until the next divider. Answers before the first divider
  have no group.
- Each group has a header in the list with a color swatch, its name (empty shows "Group N") and
  its answer count. In edit mode the swatch and name can be changed, and ✕ removes the divider (its
  answers join the group above).
- A divider belongs to its position in the list, not to an answer: dragging an answer across it
  moves the answer into the other group. Removing an answer moves the dividers below it up.
- The letter cells of a grouped answer get the group's color, in the editor, the exported images
  and the PowerPoint deck. Spaces stay black and anagram borders stay red. Where answers from
  different groups cross, the one earliest in the list decides the color. Answers without a group
  stay white, so puzzles without groups look exactly as before.
- New groups get the next unused color from a pale palette, so black letters stay readable.
- Stored as `groups: { start, name, color }[]` on the puzzle (`src/model/groups.ts`).

## Crossings

- Answers may share cells. Mismatching letters are allowed; it's up to Sammy to fix them.
- The editor shows a warning on mismatching cells. Warnings never appear in exports.

## Separators

- When two unrelated answers end up next to each other, Sammy can thicken the border between two
  adjacent cells to show they are not connected.

## Anagram

- Any letter cell can be marked as an anagram cell. Anagram cells always have a red, thick border.
- Checkbox "Show anagram numbers and bar" in the Page menu:
  - Checked: anagram cells show a small number, and a bar of empty cells (one per anagram letter)
    is drawn on the page, numbered 1, 2, 3… above each cell.
  - Unchecked: only the red borders are drawn.
- The bar sits in the middle of the bottom row of the page.
- Sammy sets the numbering order himself. It's usually left to right, but not always. A new anagram
  letter gets the next free number, and "Number anagram left to right" renumbers them all by column.
- An anagram cell is tied to an answer letter, so it moves with the answer.

## Exports

"Export images" opens a panel with "Export as" (Images (zip) or PowerPoint), the highlight
settings, a preview of the first quiz image, and one download button. Sammy decides which format
suits him; both contain the same images. Images are transparent PNGs of the grid at 200 dpi:
2283 × 1654 pixels with 1 cm cells, 2315 × 1654 with 7 mm cells. All images of a puzzle have the
same size, so they stack exactly on top of each other in PowerPoint. Only answers on the grid get
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

- **Images (zip):** the PNGs in the folders above.
- **PowerPoint (.pptx):** a 16:9 deck (13.33 × 7.5 in) with one slide per image, in the same order.
  Each image fills the slide height and is centred, in the same spot on every slide, so stepping
  through the slides behaves like stacked images. The deck has the sections "Empty grid", "Quiz"
  and "Correction", and each slide's notes say "Question 3: MADONNA" or "Answer 3: MADONNA".
  Sammy can copy the slides into his own deck and add titles there.

Both are named after the puzzle. The rendering (`src/export/render-image.tsx`, `react-dom/server`)
and the deck builder (`src/export/export-pptx.ts`, `pptxgenjs`) are loaded only when Sammy
downloads, to keep the editor small.

## Saving and the puzzle list

There is no backend. Everything is saved in the browser Sammy uses, and nowhere else.

- Sammy can keep several puzzles. Each has a name and a last-changed time. The open puzzle
  autosaves to `localStorage` on every change, and the last one opened comes back when the page
  opens. If the browser won't store anything, a warning says so and points to Copy puzzle.
- The name of the open puzzle is a clearly visible "Name" field at the start of the header. The
  page has no app title; the browser tab is still called "Crossword Crafter".
- The list under Puzzles ▾ shows them all, most recently changed first, with their answer counts and
  last-edited time ("Last edited" on hover). The open one has a highlighted background. Each can
  be opened, renamed in place with the pen next to its name (Enter or clicking away saves, Esc
  cancels), or deleted after a confirm. Deleting the last one leaves one empty puzzle. Renaming
  doesn't count as a change, so the list doesn't reorder.
- "New puzzle" and "Add sample puzzle" add a puzzle to the list and open it. A new puzzle whose name is
  taken gets the lowest free number: "Untitled puzzle (1)", "Quiz 18 (2)". Renaming doesn't add
  numbers.
- The header panels (Puzzles, Edit, Page, Export images) close on Esc or a click outside them.

## Edit menu: undo, redo, copy and paste

"Edit ▾" in the header holds four commands, each with its keyboard shortcut shown next to it (⌘
on a Mac), so Sammy can learn the shortcuts once:

| Command      | Shortcut                 |
| ------------ | ------------------------ |
| Undo         | Ctrl+Z                   |
| Redo         | Ctrl+Y or Ctrl+Shift+Z   |
| Copy puzzle  | Ctrl+C                   |
| Paste puzzle | Ctrl+V                   |

- Undo and redo cover changes to the open puzzle's content, including a paste. Opening, renaming,
  adding and deleting puzzles aren't undone. Each puzzle has its own history of up to 100 steps,
  kept until the page is reloaded (`src/model/history.ts`). A burst of color changes or typing an
  anagram number counts as one step.
- Copy puzzle puts the open puzzle and its name on the clipboard as JSON. This is how a puzzle
  moves to another computer or gets kept somewhere safe.
- Paste puzzle reads the clipboard and, if it holds a copied puzzle, replaces the open puzzle's
  content with it. The open puzzle keeps its name. Undo brings the old content back. Anything else
  on the clipboard shows "The clipboard doesn't contain a copied puzzle." and changes nothing.
- The shortcuts work everywhere except in text fields, which keep their own undo, copy and paste.
  Ctrl+C also leaves selected page text alone. The keyboard uses the browser's copy and paste
  events, so it never asks for clipboard permission; the menu items use the clipboard API, which
  some browsers ask about the first time.

Messages such as "Puzzle copied to the clipboard." pop up in the bottom-right corner of the window
for 5 seconds: green for success, red when something didn't work.

## Saved shapes

In `src/model/persistence.ts`:

- The list: `{ version, library: { currentId, entries: [{ id, name, updatedAt, puzzle }] } }`.
- Copy puzzle: `{ version, name, puzzle }`.
- Before the list existed, a single puzzle was saved under `crossword-crafter/puzzle`. It is
  carried over as the first entry the first time the list is loaded.
- Everything is validated field by field, with defaults for missing optional parts. Old versions
  must stay readable when a shape changes.

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
  groups: { start: number; name: string; color: string }[]; // start = list index of first answer
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
6. Save and load: autosave, the puzzle list, Edit menu with undo, redo, copy and paste.
7. PNG exports as a zip: skeleton, quiz and correction images.

## Open decisions

- **Export format.** Both a zip and a PowerPoint deck exist; see which one Sammy uses. Possible
  follow-ups: 4:3 slides, or putting everything on one slide with appear animations.
- **Page margins.** Whether the grid needs a margin for printing.
- **Special characters** in answers. Wait for Sammy's feedback.
- **Download backup.** A button that downloads all puzzles as one file, and a way to load it back.
  Wanted, but not now.
