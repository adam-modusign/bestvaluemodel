# Best value LLM

A single static page that plots every model on the [Artificial Analysis](https://artificialanalysis.ai/) Intelligence Index against its blended API price and highlights the **value frontier** (models where nothing cheaper is also smarter). Runs locally with plain Node, no dependencies.

Based on [terryds/bestvaluemodel](https://github.com/terryds/bestvaluemodel), with the GitHub Actions / Cloudflare deploy removed.

## Run

Requires Node 20.12+.

```sh
cp .env.example .env   # then put your key in .env
npm start              # refresh data/ from the API, then serve http://127.0.0.1:8080
```

Get a free API key at https://artificialanalysis.ai/ (Insights Platform → API keys; 1,000 requests/day, attribution required).

Without a key, or if the fetch fails, `npm start` serves the snapshot already in `data/`.

| Command | What it does |
|---|---|
| `npm start` | Fetch latest data (if `AA_API_KEY` is set), then serve |
| `npm run serve` | Serve only, no fetch |
| `npm run fetch` | Fetch only |

Set `PORT` to use a port other than 8080.

## Layout

| Path | What it is |
|---|---|
| `index.html` | The page. Vanilla HTML/SVG/JS. Loads `data/models.json` at runtime. |
| `data/models.json` | Trimmed snapshot of the AA `/data/llms/models` response. |
| `data/changelog.json` | Per-fetch diff (added / removed / re-scored / re-priced), newest first, capped at 90 entries. |
| `scripts/fetch-aa.mjs` | Fetches the API, normalises, diffs against the previous snapshot, writes both files. Writes nothing if the data is identical. |
| `scripts/serve.mjs` | Runs the fetch, then serves the page and data files on 127.0.0.1. |

## Notes

- The frontier is computed client-side for whichever metric is selected (Intelligence, Coding, Math), over the full model set, so filtering by maker shows where that maker's models sit against everyone.
- Blended price is AA's 3:1 input:output blend. Cached-input, batch and fast-mode pricing are ignored.
- Data attribution: Artificial Analysis, https://artificialanalysis.ai/. Required by their API terms.
