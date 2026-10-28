/**
 * Passes feedback from Crossword Crafter on to a Discord channel. The channel's webhook URL is a
 * secret here, so it never ends up in the app, where anyone could read it and post to the channel.
 */

export type Env = {
  /** Set with `npx wrangler secret put DISCORD_WEBHOOK_URL`. */
  DISCORD_WEBHOOK_URL: string
  /** Where the app runs, comma separated. Feedback from anywhere else is turned away. */
  ALLOWED_ORIGINS: string
}

export type Feedback = {
  message: string
  /** Who sent it, if they said. */
  name: string
  puzzleName: string
  /** The open puzzle as Copy puzzle puts it on the clipboard, if they sent it along. */
  puzzle?: string
}

/** Discord takes 2000 characters per message, and the name and puzzle name need room too. */
export const MAX_MESSAGE = 1500
const MAX_NAME = 100
const MAX_PUZZLE = 500_000

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') ?? ''
    if (!env.ALLOWED_ORIGINS.split(',').some((allowed) => allowed.trim() === origin)) {
      return new Response('Forbidden', { status: 403 })
    }
    const cors = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin',
    }
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors })

    const feedback = parseFeedback(await request.text())
    if (!feedback) return new Response('Bad request', { status: 400, headers: cors })

    const sent = await fetch(env.DISCORD_WEBHOOK_URL, { method: 'POST', body: discordMessage(feedback) })
    return new Response(null, { status: sent.ok ? 204 : 502, headers: cors })
  },
}

/** The feedback in a request body, or null when it isn't feedback the app would send. */
export function parseFeedback(body: string): Feedback | null {
  let data: unknown
  try {
    data = JSON.parse(body)
  } catch {
    return null
  }
  if (typeof data !== 'object' || data === null) return null
  const { message, name = '', puzzleName = '', puzzle } = data as Record<string, unknown>
  if (typeof message !== 'string' || !message.trim() || message.length > MAX_MESSAGE) return null
  if (typeof name !== 'string' || name.length > MAX_NAME) return null
  if (typeof puzzleName !== 'string' || puzzleName.length > MAX_NAME) return null
  if (puzzle !== undefined && (typeof puzzle !== 'string' || puzzle.length > MAX_PUZZLE)) return null
  return { message: message.trim(), name: name.trim(), puzzleName: puzzleName.trim(), puzzle }
}

/** The feedback as Discord's webhook takes it, with the puzzle as a file to download. */
export function discordMessage({ message, name, puzzleName, puzzle }: Feedback): FormData {
  const about = puzzleName ? ` about ${plain(puzzleName)}` : ''
  const body = new FormData()
  body.set(
    'payload_json',
    JSON.stringify({
      content: `**${plain(name) || 'Someone'}**${about}:\n${message}`,
      // Nobody gets pinged, whatever the feedback says.
      allowed_mentions: { parse: [] },
    }),
  )
  if (puzzle) body.set('files[0]', new Blob([puzzle], { type: 'application/json' }), 'puzzle.json')
  return body
}

/** Text with Discord's formatting characters escaped, so a name shows as typed. */
const plain = (text: string) => text.replace(/[\\*_~`|>]/g, '\\$&')
