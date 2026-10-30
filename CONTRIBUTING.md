# Contributing to CertTrack

Thanks for taking the time to improve CertTrack.

## Development setup

1. Install Node.js 20 or newer and MongoDB 6 or newer.
2. Install dependencies:

   ```bash
   npm run setup
   ```

3. Copy `server/.env.example` to `server/.env` and `client/.env.example` to `client/.env`.
4. Start both apps from the repository root:

   ```bash
   npm run dev
   ```

The API runs at `http://localhost:5000` and the client at `http://localhost:5173`.

## Before opening a pull request

Run the same checks as CI:

```bash
npm run lint
npm test
npm run build
```

Keep pull requests focused, include tests for behaviour changes, and describe any
schema or API changes in the PR body. Never commit secrets, `.env` files, uploaded
documents or signing keys.

## Code style

- Prettier is the source of truth for formatting (`npm run format`).
- The server follows CommonJS and the client follows ES modules.
- Prefer small modules and explicit error handling over silent failures.
- Add comments only where the code is not self-explanatory.

## Commit messages

Use short imperative subjects, for example `fix: require proof before approval`.
