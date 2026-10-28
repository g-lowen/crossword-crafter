// @vitest-environment node
// Node has the same Request, Response, FormData and Blob as the Workers runtime; jsdom's differ.
import { afterEach, describe, expect, it, vi } from 'vitest'
import worker, { discordMessage, MAX_MESSAGE, parseFeedback, type Env } from './index'

const env: Env = {
  DISCORD_WEBHOOK_URL: 'https://discord.example/webhook',
  ALLOWED_ORIGINS: 'https://g-lowen.github.io, http://localhost:5173',
}

function post(body: unknown, origin = 'https://g-lowen.github.io') {
  return worker.fetch(
    new Request('https://feedback.example/', {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    env,
  )
}

/** Stands in for Discord, answering with `status`. */
function discord(status = 204) {
  const fetch = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(
    async () => new Response(null, { status }),
  )
  vi.stubGlobal('fetch', fetch)
  return fetch
}

async function payload(body: FormData) {
  return JSON.parse(String(body.get('payload_json')))
}

afterEach(() => vi.unstubAllGlobals())

describe('feedback worker', () => {
  it('passes feedback on to Discord', async () => {
    const sent = discord()
    const response = await post({ message: 'Love it!', name: 'Sammy', puzzleName: 'Quiz 18' })
    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://g-lowen.github.io')
    const [url, init] = sent.mock.calls[0]
    expect(url).toBe(env.DISCORD_WEBHOOK_URL)
    expect(await payload(init.body as FormData)).toEqual({
      content: '**Sammy** about Quiz 18:\nLove it!',
      allowed_mentions: { parse: [] },
    })
  })

  it('answers the browser asking first whether it may post', async () => {
    const response = await worker.fetch(
      new Request('https://feedback.example/', { method: 'OPTIONS', headers: { Origin: 'http://localhost:5173' } }),
      env,
    )
    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173')
  })

  it('turns away other sites, and feedback the app would never send', async () => {
    const sent = discord()
    expect((await post({ message: 'Hi' }, 'https://elsewhere.example')).status).toBe(403)
    expect((await post({ message: '  ' })).status).toBe(400)
    expect((await post({ message: 'x'.repeat(MAX_MESSAGE + 1) })).status).toBe(400)
    expect((await post('just text')).status).toBe(400)
    expect(sent).not.toHaveBeenCalled()
  })

  it('says so when Discord does not take it', async () => {
    discord(500)
    expect((await post({ message: 'Hi' })).status).toBe(502)
  })
})

describe('discordMessage', () => {
  it('sends the puzzle along as a file, and shows names as typed', async () => {
    const body = discordMessage({ message: 'Hm', name: '*Gustav*', puzzleName: '', puzzle: '{"version":1}' })
    expect((await payload(body)).content).toBe('**\\*Gustav\\***:\nHm')
    const file = body.get('files[0]') as File
    expect(file.name).toBe('puzzle.json')
    expect(await file.text()).toBe('{"version":1}')
  })

  it('says someone when there is no name', async () => {
    expect((await payload(discordMessage(parseFeedback('{"message":"Hi"}')!))).content).toBe('**Someone**:\nHi')
  })
})
