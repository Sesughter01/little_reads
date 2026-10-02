# Temporary Build Workaround

This project is currently using Next.js 16.3.4 stable.

The default production build (`next build`) fails during prerender of the
internal `/_global-error` route with:

    Expected workStore to be initialized

This is being treated as an upstream Next.js build issue based on the previous
reproduction work from the prior FreBuff session.

## Temporary workaround

`package.json` now temporarily uses:

    "build": "next build --webpack"

The Webpack builder completes successfully where the default builder currently
fails.

## Removing the workaround

Remove `--webpack` after a confirmed stable Next.js release is verified to fix
the `/_global-error` workStore issue.

Do not add `force-dynamic` workarounds to `global-error.tsx` or unrelated pages.
