# Contributing

Thanks for taking a look.

## Running the project

There is no build step and there are no dependencies.

```bash
git clone https://github.com/andreyruvi/gridshift.git
cd gridshift
python3 -m http.server 8000     # any static server will do
```

Then open http://localhost:8000. Opening `index.html` straight from disk will
not work: browsers refuse ES modules over `file://`.

## Tests

```bash
node --test test/*.test.js
```

Node 20 or newer. The suite uses only `node:test` and `node:assert`.

## House rules

- `src/engine` must stay free of DOM references. If a change needs `document`,
  it belongs in `src/ui`.
- Anything random goes through the injected `random` function, never
  `Math.random()` directly — otherwise games stop being reproducible and the
  rules stop being testable.
- New rules behaviour comes with a test.
- Keep the attribution in `LICENSE` and the "About this game" section intact.
