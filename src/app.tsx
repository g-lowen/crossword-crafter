import { useMemo, useState } from 'react'
import { GridView } from './grid/grid-view'
import { describeIssue } from './layout/describe-issue'
import { layoutPuzzle } from './layout/layout'
import { samplePuzzle } from './model/sample-puzzle'

function App() {
  const [puzzle] = useState(samplePuzzle)
  const [showLetters, setShowLetters] = useState(true)
  const layout = useMemo(() => layoutPuzzle(puzzle), [puzzle])

  return (
    <main className="app">
      <header className="app-header">
        <h1>Crossword Crafter</h1>
        <label>
          <input type="checkbox" checked={showLetters} onChange={(e) => setShowLetters(e.target.checked)} /> Show
          letters
        </label>
      </header>

      <div className="page">
        <GridView puzzle={puzzle} layout={layout} mode="editor" showLetters={showLetters} />
      </div>

      {layout.issues.length > 0 && (
        <section className="issues" aria-label="Issues">
          <h2>Issues</h2>
          <ul>
            {layout.issues.map((issue, i) => (
              <li key={i}>{describeIssue(issue, puzzle)}</li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}

export default App
