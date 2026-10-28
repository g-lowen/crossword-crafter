# crossword-crafter

A tool for building music quiz crosswords by hand and exporting them as images for PowerPoint.

See [SPEC.md](SPEC.md) for what it does and the plan.

## Development

Requires Node 20 or later.

```bash
npm install
npm run dev      # start the dev server
npm test         # run tests once
npm run build    # type-check and build
npm run lint
```

The Feedback button sends feedback to Discord through a Cloudflare Worker in [feedback/](feedback/),
which has its own setup steps.
