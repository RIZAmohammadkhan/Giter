# Development Notes

## Core Scripts

```bash
bun install
bun run typecheck
bun test
bun run src/cli.ts doctor
```

## Useful Manual Checks

Run the doctor command:

```bash
bun run src/cli.ts doctor
```

Reconfigure locally:

```bash
bun run src/cli.ts setup
```

Try a request inside a temporary repository:

```bash
mkdir /tmp/giter-playground
cd /tmp/giter-playground
git init
echo "hello" > demo.txt
git add demo.txt
git commit -m "init"
giter "show me what changed in the last commit"
```

## Packaging

`package.json` exposes `src/cli.ts` as the CLI entrypoint and includes a Bun-targeted build script:

```bash
bun run build
```

That currently emits `dist/giter.js`. For npm publishing, the repository is set up so the source entrypoint can also be shipped directly.

## Testing Focus

The included tests cover:

- config normalization and defaults
- destructive Git command detection

The next worthwhile additions would be integration tests around:

- temporary home directories for setup
- temporary repositories for natural-language requests
- merge-conflict fixtures
