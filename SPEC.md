# Crossword Crafter – Specification

A desktop web tool for building music quiz crosswords by hand and exporting the images used in
PowerPoint presentations. Replaces the current workflow in Excel.

Existing crossword generators don't fit: every puzzle is hand-customized. The goal is not to
automate layout but to make manual layout fast. "Generate solution" only gives a first layout to
adjust by hand.

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
- Page ▾ holds the page settings: Cell size and "Show letters" (shortcut L, outside
  text fields). Cell size belongs to the puzzle and goes into the exports. Show letters only
  changes the editor (the exports decide for themselves) and stays the same when switching
  puzzles. It also has "Center on page" and "Generate solution", which move the answers.
- Left column: the answer list. The paste box is open while there are no answers, and folds away
  behind "+ Add answers" once there are.
- Middle: the grid, as large as the window allows while keeping its A4 proportions.
- Right column: the selected cell's settings, then Anagram ("Show anagram numbers and bar",
  "Number anagram left to right" and "Create anagram") and any issues.
- A small Light / Dark / GG switch sits at the right end of the header. Until Sammy picks one, the
  app follows the computer's light or dark setting and the switch shows which theme that is. A
  picked theme is remembered in the browser.
- GG uses the colors of Sammy's company logo (GG Bar): brown `#5f4625` for the background and
  panels, off-white `#f1f1f2` text, orange-red `#ef4b25` for the main buttons and selected states,
  and blue `#63ccf0` for links, outlines and placed answers. In dark mode everything around
  the grid goes dark, but the A4 page stays white with black cells, like paper and like the
  exported images, in every theme. Colors are CSS variables at the top of `src/index.css`.
- A Feedback button sits in the bottom-right corner of the window (see Feedback).

## Answers

- Imported as a list (pasted text, one answer per line). List order is the reveal order. In the
  paste box, Enter adds the answers; Shift+Enter or Ctrl+Enter starts a new line.
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
- Cell: "Wide space" for a space. For a letter, "Always visible" and "Anagram letter" with its
  number.
- Thick border: top, right, bottom, left of the selected cell.

Shortcuts for the selected cell (⌘ instead of Ctrl on a Mac). Each button's tooltip says what it
does and its shortcut; the direction one says it works on the first letter of the answer:

- Ctrl+arrow does what the arrow buttons do. On the first letter, Ctrl+→ and Ctrl+↓ set the
  direction. Elsewhere, an arrow across the reading direction adds a turn at that letter, or
  removes it if it is already that turn. Arrows that would do nothing are ignored.
- The arrow keys step to the nearest filled cell that way, skipping empty cells. In a crossing the
  selection stays on the same answer if it can, and otherwise takes the answer reading along the
  arrow. With nothing selected, an arrow key selects the first letter of the first placed answer.
- Shift+arrow moves the selected cell's answer one cell (see below).
- Delete or Backspace takes the answer off the grid, like "Take off grid". With several answers
  selected, it takes them all off.

## Moving several answers

- Ctrl+click (⌘+click on a Mac) on a cell adds its answer to a selection, or removes it. If one
  cell was already selected, its answer is the first in the selection. Ctrl+A selects every placed
  answer, except in text fields. Esc, a plain click or a click on an empty spot ends it.
- The selected answers are tinted, and the right panel says how many are selected instead of
  showing the cell settings.
- Dragging any of them moves them all, with the same preview as a single answer. Dropping them on
  the answer list takes them all off the grid.
- The arrow keys move them one cell at a time. Shift+arrow moves the answer of a single selected
  cell (plain arrows step between cells there). A move that would push any of their cells off the page does nothing.
- Thick borders move along when they touch the moving answers and don't touch an answer that
  stays.
- Each move is one step for undo.
- "Center on page" in the Page menu moves every placed answer, and every thick border, so the
  puzzle sits in the middle of the page. When the anagram bar is shown, its row and the row with
  its numbers are kept free. It is greyed out when the puzzle is already centered, empty, or too big
  to fit. Handy after switching to smaller cells, since the puzzle stays in the top-left.

## Generate solution

"Generate solution" in the Page menu places every answer on the grid at random, as a starting
point. Each click gives a new layout, the same one again only when there is no other. The puzzle
ends up in the middle of the page, the thick borders of the old layout go, and Undo brings the old
layout back. The rules are in `src/generate/rules.ts`, apart from the search, so they are easy to
change:

1. Every answer crosses at least two other answers, or as many as it can: with two answers each
   can only cross one, an answer can't cross one it has no letter in common with, and an answer
   with its letters side by side, like U2, only crosses one. Crossings are at right angles on the
   same letter, never on a space or a bend.
2. The puzzle hangs together: from any answer, every other can be reached by going from answer to
   crossing answer.
3. Every answer is inside the page, and above the anagram bar when it's shown.
4. Only answers longer than 4 characters bend. Lengths count every character, spaces included.
5. At most 1 bend below 6 characters, 2 below 12, then 3.
6. Bends are at least 2 characters apart.
7. No bend on the second or second to last character, where it would leave one letter sticking
   out. This is why a 4-letter answer never bends.
8. Bends are on spaces when they can be. Every bend costs a little, so an answer only bends when
   that wins a crossing or room, and a bend on a space costs less than one on a letter.
9. Answers only touch where they cross, or end-on: where an answer ends against the side of
   another that goes at right angles there. Each place answers touch gets a thick border, and
   costs a little, so they stay few.

Answers read right or down all the way, so their bends take turns between the two.

When no layout turns up, rules are dropped one at a time, the most restrictive first, until one
does: 1, 9, 2, 5, 6, 7, then 4. Rules 3 and 8 are never dropped. A rule no layout can keep, such
as rule 2 when an answer has no letter in common with the rest, is dropped from the start. Without
rules 1 and 2, answers still cross as many others as they can and hang together as far as they
can. Without rule 9, answers may lie side by side, and get thick borders there too. The message
after generating names the rules the layout breaks. If the answers don't fit even then, a red
message says so and nothing changes.

The search is random and gets 0.4 seconds with every rule, and a third of that for each set after,
so on a hard puzzle it can miss a layout that keeps every rule; another click may find one. Groups
are ignored for now, so answers from different groups may cross and hang together.

## Groups (several mini puzzles in one grid)

Gustav sometimes builds one grid out of several mini puzzles, each with its own background color.
The answers of one mini puzzle are always next to each other in the list, so a group is a run of
answers in the list. Answers can also have no group, anywhere in the list, so they keep their place
in the reveal order:

- In edit mode, hovering an answer shows "+ New group" on its top edge. Clicking it starts a new
  group from that answer. Inside a group it splits that group in two; on an answer without a group
  the new group runs until the next group.
- Each group has a header in the list with a color swatch, its name (empty shows "Group N") and
  its answer count. In edit mode the swatch and name can be changed, and ✕ removes the group. Its
  answers join the group right above it, or have no group if there is none right above.
- An answer dragged within the list joins the group of the answer it's dropped on. Dropped on an
  answer without a group, it has no group either. Dropped on a group's header, it lands where the
  list made room for it: dragged down, as the group's first answer; dragged up, above the header at
  the end of what comes before (answers without a group, or the group above). That
  group grows and the one it left shrinks; no other answer changes group. A group whose last answer
  is dragged out is removed. Removing an answer moves the groups below it up.
- While an answer is dragged in edit mode, a "No group" spot shows after each group, and above the
  first group when it starts the list. Dropping the answer there takes it out of its group, at that
  place in the list.
- Answers added with "+ Add answers" go to the end of the list without a group.
- In edit mode each group header has a ⠿ handle. Dragging it moves the group with all its answers;
  a line shows where it will land. Dragged down it goes after the group, or the answers without a
  group, it's dropped on; dragged up it goes before them.
- The letter cells of a grouped answer get the group's color, in the editor, the exported images
  and the PowerPoint deck. Spaces stay black and anagram borders stay red. Where answers from
  different groups cross, the one earliest in the list decides the color. Answers without a group
  stay white, so puzzles without groups look exactly as before.
- New groups get the next unused color from a pale palette, so black letters stay readable.
- Stored as `groups: { start, end, name, color }[]` on the puzzle (`src/model/groups.ts`). Groups saved
  before they had an `end` run until the next group, as they used to.

## Crossings

- Answers may share cells. Mismatching letters are allowed; it's up to Sammy to fix them.
- The editor shows a warning on mismatching cells. Warnings never appear in exports.

## Always visible letters

- Any letter can be marked "Always visible" in the cell panel, to give a hint. It is drawn in every
  image (the empty grid, the quiz images and the correction images) and in the editor even when
  "Show letters" is off.
- It is tied to an answer letter, so it moves with the answer. Where answers cross, the cell shows
  its letter if either answer marks it.

## Separators

- When two unrelated answers end up next to each other, Sammy can thicken the border between two
  adjacent cells to show they are not connected.

## Anagram

- Any letter cell can be marked as an anagram cell. Anagram cells always have a red, thick border.
- Checkbox "Show anagram numbers and bar" in the Anagram section of the right column:
  - Checked: anagram cells show a small number, and a bar of empty cells (one per anagram letter)
    is drawn on the page, numbered 1, 2, 3… above each cell.
  - Unchecked: only the red borders are drawn.
- The bar sits in the middle of the bottom row of the page.
- When letters are shown, each bar cell shows the letter of the anagram cell with its number, once
  an answer through that cell is shown. Always visible letters don't fill the bar.
- Sammy sets the numbering order himself. It's usually left to right, but not always. A new anagram
  letter gets the next free number, and "Number anagram left to right" renumbers them all by column.
- An anagram cell is tied to an answer letter, so it moves with the answer.
- "Create anagram" asks for the word the anagram should spell, and marks a letter in the answers
  for each of its letters, ignoring spaces. They replace the anagram letters there were, as one step
  for undo, and are numbered left to right, so the bar shows them jumbled. Answers off the grid can
  give letters too; theirs come after the ones on the grid.
  - Each letter comes from a different answer when the answers allow it. A letter where answers
    cross counts for both. When there are too few answers with the letters, some give more than
    one, as few as possible, and a note under the button says which.
  - Letters on crossings and always visible letters are only used when nothing else will do.
    Otherwise the letters are picked at random, so another try may pick others.
  - When the answers don't have enough of a letter at all, nothing changes and the form says which
    letters are missing.
  - The note stays until the next Create anagram. The search is in `src/layout/pick-anagram.ts`.

## Exports

"Export images" opens a panel with "Export as" (Images (zip) or PowerPoint), the highlight
settings, a preview of the first quiz image, and one download button. Sammy decides which format
suits him; both contain the same images. Images are transparent PNGs of the grid at 200 dpi:
2283 × 1654 pixels with 1 cm cells, 2315 × 1654 with 7 mm cells. All images of a puzzle have the
same size, so they stack exactly on top of each other in PowerPoint. Only answers on the grid get
images; the panel lists the ones left out, and says when the puzzle has issues.

The **skeleton** is the empty grid with spaces, turn arrows, separators, red anagram borders,
always visible letters, and the anagram numbers and bar if enabled. The quiz and correction
folders (and deck sections) start with it, so stepping through either one begins at the empty grid.

1. **Print grid** (`print-grid.png`): the grid Sammy prints and hands out to the players. It is
   kept separate from the quiz and correction images because it may come to differ from them. For
   now it is the skeleton.
2. **Quiz images** (`quiz/00-empty-grid.png`, then `quiz/01-the-beatles.png`, …): the skeleton,
   then one per answer, in list order: the skeleton with that answer outlined as one shape in the
   highlight color Sammy picks. Only the current answer is marked. The anagram numbers and bar are
   left out of every quiz image, the empty grid included (the red borders stay).
   - Sammy normally adds the pointer arrow to the start of the answer himself in PowerPoint. The
     checkbox "Arrow to the start of the answer in quiz images" draws one in the cell before the
     start instead. It may cover other cells, and is cut off for an answer starting at the page
     edge.
3. **Correction images** (`correction/00-empty-grid.png`, then `correction/01-the-beatles.png`, …):
   the skeleton, then one per answer, in list order: the skeleton with answers filled in
   cumulatively: image N shows answers 1 to N. The anagram bar fills in the same way.

- **Images (zip):** the PNGs in the folders above.
- **PowerPoint (.pptx):** a 16:9 deck (13.33 × 7.5 in) with one slide per image, in the same order.
  Each image fills the slide height and is centred, in the same spot on every slide, so stepping
  through the slides behaves like stacked images. The deck has the sections "Print grid",
  "Quiz" and "Correction", and each slide's notes say "Print grid", "Empty grid",
  "Question 3: MADONNA" or "Answer 3: MADONNA".
  Sammy can copy the slides into his own deck and add titles there.

Both are named after the puzzle. The rendering (`src/export/render-image.tsx`, `react-dom/server`)
and the deck builder (`src/export/export-pptx.ts`, `pptxgenjs`) are loaded only when Sammy
downloads, to keep the editor small.

## Saving and the puzzle list

There is no backend. Everything is saved in the browser Sammy uses, and nowhere else. The only
thing that ever leaves the browser is feedback, when someone presses Send (see Feedback).

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
- The header panels (Puzzles, Edit, Page, Export images) close on Esc, a click outside them, or
  tabbing out of them. The header buttons can be reached with Tab. An opened panel puts the focus
  on its first control, and the Edit menu's items are moved between with ↑ and ↓ (Home, End).
  Closing with Esc, ✕ or a command puts the focus back on the button that opened the panel; a click
  outside leaves it where it was clicked.

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

Messages such as "Puzzle copied to the clipboard." pop up in the bottom-right corner of the window,
above the Feedback button, for 5 seconds: green for success, red when something didn't work.

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
  visibleLetters: number[]; // indices of letters drawn in every image
};

type CellRef = { row: number; col: number };

type Puzzle = {
  answers: Answer[]; // array order is reveal order
  anagram: {
    showNumbersAndBar: boolean;
    cells: { answerId: string; letterIndex: number; number?: number }[];
  };
  separators: { a: CellRef; b: CellRef }[];
  groups: { start: number; end: number; name: string; color: string }[]; // list indices start up to end
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
7. PNG exports as a zip: print grid, quiz and correction images.

## Feedback

The Feedback button in the bottom-right corner opens a box above it to tell the developers what
works, what doesn't and what's missing:

- A message of up to 1500 characters, an optional name, and "Include the open puzzle", which is
  ticked by default. Send is greyed out until there's a message.
- The name is remembered in the browser for next time.
- After sending, the box closes and a green message thanks the sender. If it can't be sent, the box
  stays open with the message, and says so.
- Esc, ✕ or a click outside closes the box. A message that wasn't sent stays for next time, until
  the page reloads.

The feedback lands in the developers' Discord channel, with the open puzzle attached as
`puzzle.json` in the Copy puzzle format, so it can be pasted into the app. It goes through a small
Cloudflare Worker in `feedback/`, which holds the Discord webhook as a secret: anyone with the
webhook URL could post to the channel, so it can't be in the app. The worker's address is set as
`VITE_FEEDBACK_URL` in `.env`; without it the app has no Feedback button. Setting it up is in
`feedback/README.md`.

## Open decisions

- **Export format.** Both a zip and a PowerPoint deck exist; see which one Sammy uses. Possible
  follow-ups: 4:3 slides, or putting everything on one slide with appear animations.
- **Page margins.** Whether the grid needs a margin for printing.
- **Special characters** in answers. Wait for Sammy's feedback.
- **Download backup.** A button that downloads all puzzles as one file, and a way to load it back.
  Wanted, but not now.
