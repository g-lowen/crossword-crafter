# Feedback worker

The app's Feedback button sends feedback here, and this Cloudflare Worker posts it to a Discord
channel through a webhook. The webhook URL lives only in the worker, as a secret: anyone with that
URL can post to the channel, so it must not be in the app, which anyone can read.

The worker only takes feedback from the origins in `ALLOWED_ORIGINS` in `wrangler.toml`, checks
the lengths, and stops anyone from being pinged. A puzzle sent along arrives as `puzzle.json` in
the Copy puzzle format: open it, copy everything, and paste it into the app with Paste puzzle.

## Setting it up

Wrangler, Cloudflare's tool, needs Node 22 or later. `.node-version` here asks for 22, so with fnm
run `fnm use` in this folder first.

1. **Discord:** in the channel's settings, go to Integrations → Webhooks → New Webhook, give it a
   name such as "Crossword Crafter", and click Copy Webhook URL.
2. **Log in to Cloudflare** (opens the browser):

   ```bash
   cd feedback
   npx wrangler@4 login
   ```

3. **Deploy the worker.** The first time, Cloudflare asks you to pick a `workers.dev` subdomain.
   Note the URL it prints, like `https://crossword-crafter-feedback.<subdomain>.workers.dev`.

   ```bash
   npx wrangler@4 deploy
   ```

4. **Give it the webhook URL** from step 1, pasted when asked:

   ```bash
   npx wrangler@4 secret put DISCORD_WEBHOOK_URL
   ```

5. **Point the app at the worker:** put its URL in `.env` in the repository root and commit it.
   The URL isn't a secret: the worker only passes feedback on, so the app can show it.

   ```
   VITE_FEEDBACK_URL=https://crossword-crafter-feedback.<subdomain>.workers.dev
   ```

The Feedback button shows up once the app is built with that setting, with `npm run dev` too.

## Changing it

- Edit `src/index.ts`, test with `npm test` in the repository root, and run
  `npx wrangler@4 deploy` again.
- If the app moves to another address, add it to `ALLOWED_ORIGINS` and deploy.
- To send feedback to another channel, make a new webhook and run the `secret put` again.
