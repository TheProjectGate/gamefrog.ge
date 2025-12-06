# Platform-Specific Theming

The UI can now switch between a **web** and **android** flavor without duplicating components. Styling hooks live in CSS custom properties and utility attributes (`platform-card`, `data-platform-button`, `data-platform-chip`).

## How the platform is chosen

Priority is:

1. `VITE_PLATFORM` env var at build time (`web` | `android`).
2. `?platform=android` / `?platform=web` query parameter.
3. Saved preference in `localStorage` (`gamefrog.platformPreference`).
4. Capacitor native platform detection.
5. Default `web`.

### Overriding in the browser console

```js
import { setPlatformPreference, clearPlatformPreference, syncDocumentPlatformState } from './platform';

setPlatformPreference('android');
syncDocumentPlatformState('android'); // applies classes immediately
// reload to pick up React context & tokens
```

`clearPlatformPreference()` removes the override and falls back to auto detection.

## Styling hooks

- Apply the `platform-card` class to containers that should adopt dynamic radius, border, and shadow.
- Use `data-platform-button` for CTA controls; CSS handles radius, height, and hover behavior per platform.
- Use `data-platform-chip` for badges/pills (genres, tags, etc.).
- `document.documentElement.dataset.platform` is set to `web` or `android`, so you can target `[data-platform="android"]` in CSS or JS if needed.

Feel free to introduce more semantic helpers (e.g. `data-platform-surface`) following the same pattern. The goal is to share structure while exposing enough hooks to fine-tune each platform’s aesthetic.

