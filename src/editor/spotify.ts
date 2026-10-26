/**
 * Reading track lists copied from Spotify's simplified "embed" view of a playlist. The full
 * Spotify player can't be copied (its rows are drag handles), but the embed view can: Ctrl+A,
 * Ctrl+C there gives every track's title, artists and length.
 */

export type SpotifyTrack = { title: string; artists: string[] }

export type AnswerChoice = 'artist' | 'all-artists' | 'title'

const PLAYLIST_LINK = /https?:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(?:embed\/)?(playlist|album)\/([A-Za-z0-9]+)/

/** The simplified view's address for a pasted playlist or album link, or null when it isn't one. */
export function embedLink(text: string): string | null {
  const match = text.trim().match(PLAYLIST_LINK)
  if (!match || text.trim().split(/\s+/).length > 1) return null
  return `https://open.spotify.com/embed/${match[1]}/${match[2]}`
}

/** Collapses the line breaks and indentation the copied HTML has between and inside names. */
const tidy = (text: string) => text.replace(/\s+/g, ' ').trim()

function splitArtists(text: string): string[] {
  return tidy(text)
    .split(/\s*,\s*/)
    .filter(Boolean)
}

/** Tracks from the HTML Spotify's embed view puts on the clipboard, or null when it isn't that. */
export function parseSpotifyHtml(html: string): SpotifyTrack[] | null {
  if (!html.includes('tracklist-row') && !html.includes('TracklistRow')) return null
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const tracks: SpotifyTrack[] = []
  for (const row of doc.querySelectorAll('li')) {
    const title = tidy(row.querySelector('h3')?.textContent ?? '')
    const subtitle = row.querySelector('h4')
    if (!title || !subtitle) continue
    // The "E" badge on explicit songs is its own element; leave it out of the artist names.
    subtitle.querySelectorAll('[title="Explicit"], [data-testid="tag"]').forEach((badge) => badge.remove())
    tracks.push({ title, artists: splitArtists(subtitle.textContent ?? '') })
  }
  return tracks.length > 0 ? tracks : null
}

const DURATION = /^\d{1,2}:\d{2}(?::\d{2})?$/

/**
 * Tracks from the plain text of the embed view: each track is a title line, an artists line and a
 * length line like "04:00". Needs at least two tracks, so ordinary answer lists aren't mistaken for
 * one. Without the HTML the explicit badge can't be told apart for sure, so an "E" glued to the
 * front of the artists ("EA$AP Rocky") is taken off when the next character is a capital or a sign.
 */
export function parseSpotifyText(text: string): SpotifyTrack[] | null {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const tracks: SpotifyTrack[] = []
  lines.forEach((line, i) => {
    if (!DURATION.test(line) || i < 2) return
    const title = lines[i - 2]
    let artists = lines[i - 1]
    if (DURATION.test(title) || DURATION.test(artists)) return
    if (/^E[^a-zà-öø-ÿ\s]/.test(artists)) artists = artists.slice(1)
    tracks.push({ title, artists: splitArtists(artists) })
  })
  return tracks.length >= 2 ? tracks : null
}

/** Pasted clipboard content as Spotify tracks, preferring the HTML when there is any. */
export function parseSpotifyPaste(html: string, text: string): SpotifyTrack[] | null {
  return (html ? parseSpotifyHtml(html) : null) ?? parseSpotifyText(text)
}

/** Drops the parts of a title that aren't the song's name: "(feat. …)", "- 2005 Remaster" and so on. */
export function cleanTitle(title: string): string {
  return title
    .replace(/\s*[([](?:feat\.?|ft\.?|featuring|with)\s[^)\]]*[)\]]/gi, '')
    .replace(/\s+-\s+.*$/, '')
    .trim()
}

export function suggestedAnswer(track: SpotifyTrack, choice: AnswerChoice): string {
  if (choice === 'title') return cleanTitle(track.title)
  if (choice === 'all-artists') return track.artists.join(', ')
  return track.artists[0] ?? ''
}
