import { describe, expect, it } from 'vitest'
import { cleanTitle, embedLink, parseSpotifyHtml, parseSpotifyPaste, parseSpotifyText, suggestedAnswer } from './spotify'

/** Two rows as Spotify's embed view renders them, trimmed to the parts that matter. */
const html = `
<h1>5x5 2025</h1>
<ol>
  <li class="TracklistRow_trackListRow__vrAAd" data-testid="tracklist-row-0">
    <div><button><span>1</span></button></div>
    <h3 class="TracklistRow_title__1RtS6">Rötter</h3>
    <h4 class="TracklistRow_subtitle___DhJK">Lasse Tennander</h4>
    <div data-testid="duration-cell">04:00</div>
  </li>
  <li class="TracklistRow_trackListRow__vrAAd" data-testid="tracklist-row-1">
    <div><button><span>2</span></button></div>
    <h3 class="TracklistRow_title__1RtS6">Everyday (feat. Rod Stewart, Miguel &amp; Mark Ronson)</h3>
    <h4 class="TracklistRow_subtitle___DhJK"><span aria-label="Explicit" title="Explicit" data-testid="tag">E</span>A$AP Rocky, Rod Stewart, Miguel, Mark Ronson</h4>
    <div data-testid="duration-cell">04:20</div>
  </li>
</ol>`

/** The plain text of the same view, as copied from the user's playlist. */
const text = `5x5 2025 cover
5x5 2025

    Preview

Gustav Löwen-Åberg

    Rötter
    Lasse Tennander
    04:00
    Everyday (feat. Rod Stewart, Miguel & Mark Ronson)
    EA$AP Rocky, Rod Stewart, Miguel, Mark Ronson
    04:20
    Ängeln i rummet
    Eva Dahlgren
    04:02
    Psycho Killer - 2005 Remaster
    Talking Heads
    04:21
`

describe('embedLink', () => {
  it('turns playlist and album links into the simple view', () => {
    expect(embedLink('https://open.spotify.com/playlist/5EqwTfwVNy778orBaIEWtY?si=abc123')).toBe(
      'https://open.spotify.com/embed/playlist/5EqwTfwVNy778orBaIEWtY',
    )
    expect(embedLink(' https://open.spotify.com/intl-sv/album/1A2b3C ')).toBe(
      'https://open.spotify.com/embed/album/1A2b3C',
    )
  })

  it('ignores track links, other text and several links', () => {
    expect(embedLink('https://open.spotify.com/track/6OOBC3MwzuNsxOTIDALiJu')).toBeNull()
    expect(embedLink('ABBA')).toBeNull()
    expect(
      embedLink('https://open.spotify.com/playlist/aaa\nhttps://open.spotify.com/playlist/bbb'),
    ).toBeNull()
  })
})

describe('parseSpotifyHtml', () => {
  it('reads titles and artists, leaving out the explicit badge', () => {
    expect(parseSpotifyHtml(html)).toEqual([
      { title: 'Rötter', artists: ['Lasse Tennander'] },
      {
        title: 'Everyday (feat. Rod Stewart, Miguel & Mark Ronson)',
        artists: ['A$AP Rocky', 'Rod Stewart', 'Miguel', 'Mark Ronson'],
      },
    ])
  })

  it('copes with line breaks between the artist names, as in a real copy', () => {
    const copied = `<li data-testid="tracklist-row-0"><h3>
      Crazy</h3><h4><a>Gnarls Barkley</a>,
      <a>CeeLo Green</a>,
      <a>Danger Mouse</a></h4></li>`
    expect(parseSpotifyHtml(copied)).toEqual([
      { title: 'Crazy', artists: ['Gnarls Barkley', 'CeeLo Green', 'Danger Mouse'] },
    ])
  })

  it('returns null for other HTML', () => {
    expect(parseSpotifyHtml('<ul><li><h3>A</h3><h4>B</h4></li></ul>')).toBeNull()
  })
})

describe('parseSpotifyText', () => {
  it('reads title, artists and length lines in order', () => {
    expect(parseSpotifyText(text)).toEqual([
      { title: 'Rötter', artists: ['Lasse Tennander'] },
      {
        title: 'Everyday (feat. Rod Stewart, Miguel & Mark Ronson)',
        artists: ['A$AP Rocky', 'Rod Stewart', 'Miguel', 'Mark Ronson'],
      },
      { title: 'Ängeln i rummet', artists: ['Eva Dahlgren'] },
      { title: 'Psycho Killer - 2005 Remaster', artists: ['Talking Heads'] },
    ])
  })

  it('keeps artist names that only start with an E', () => {
    const tracks = parseSpotifyText('Song\nEva Dahlgren\n03:00\nOther\nEd Sheeran\n02:00')
    expect(tracks?.map((t) => t.artists[0])).toEqual(['Eva Dahlgren', 'Ed Sheeran'])
  })

  it("doesn't mistake an ordinary answer list for Spotify", () => {
    expect(parseSpotifyText('ABBA\nQUEEN\nSTING')).toBeNull()
    expect(parseSpotifyText('Song\nArtist\n03:00')).toBeNull()
  })
})

describe('parseSpotifyPaste', () => {
  it('prefers the HTML and falls back to the text', () => {
    expect(parseSpotifyPaste(html, text)).toHaveLength(2)
    expect(parseSpotifyPaste('', text)).toHaveLength(4)
    expect(parseSpotifyPaste('<p>hi</p>', 'ABBA')).toBeNull()
  })
})

describe('cleanTitle', () => {
  it('drops featured artists and version notes', () => {
    expect(cleanTitle('Everyday (feat. Rod Stewart, Miguel & Mark Ronson)')).toBe('Everyday')
    expect(cleanTitle('Psycho Killer - 2005 Remaster')).toBe('Psycho Killer')
    expect(cleanTitle('The Next Episode - Instrumental')).toBe('The Next Episode')
    expect(cleanTitle('Rein Me In (with Olivia Dean)')).toBe('Rein Me In')
  })

  it('keeps titles that are just titles', () => {
    expect(cleanTitle("Ex's & Oh's")).toBe("Ex's & Oh's")
    expect(cleanTitle('What Else Is There?')).toBe('What Else Is There?')
  })
})

describe('suggestedAnswer', () => {
  const track = { title: 'Crazy - Live', artists: ['Gnarls Barkley', 'CeeLo Green', 'Danger Mouse'] }

  it('suggests the first artist, all artists or the clean title', () => {
    expect(suggestedAnswer(track, 'artist')).toBe('Gnarls Barkley')
    expect(suggestedAnswer(track, 'all-artists')).toBe('Gnarls Barkley, CeeLo Green, Danger Mouse')
    expect(suggestedAnswer(track, 'title')).toBe('Crazy')
  })
})
