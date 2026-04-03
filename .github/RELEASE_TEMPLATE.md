# smart-fetch v[VERSION] — [SHORT_TITLE]

## What's New
- <!-- List new features/changes -->

## Why Upgrade
<!-- Brief motivation -->

## Install / Upgrade
```bash
npm install smart-fetch@[VERSION]
```

## Quick Example
```typescript
import { fetchWithRetry } from 'smart-fetch';

const res = await fetchWithRetry({
  url: 'https://api.example.com/data',
  timeout: 5000,
  retry: { maxRetries: 3 },
});
console.log(res.data);
```

## Full Changelog
See [CHANGELOG.md](https://github.com/Ali-Raza-Arain/smart-fetch/blob/main/CHANGELOG.md)
