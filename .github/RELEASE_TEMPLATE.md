# fetch-smartly v[VERSION] — [SHORT_TITLE]

## What's New
- <!-- List new features/changes -->

## Why Upgrade
<!-- Brief motivation -->

## Install / Upgrade
```bash
npm install fetch-smartly@[VERSION]
```

## Quick Example
```typescript
import { fetchWithRetry } from 'fetch-smartly';

const res = await fetchWithRetry({
  url: 'https://api.example.com/data',
  timeout: 5000,
  retry: { maxRetries: 3 },
});
console.log(res.data);
```

## Full Changelog
See [CHANGELOG.md](https://github.com/Ali-Raza-Arain/fetch-smartly/blob/main/CHANGELOG.md)
