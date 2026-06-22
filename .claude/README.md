# Atlantis frontend — QA con Claude

Validación del frontend React/Vite para que la demo no se rompa, en dos capas.

## Capa determinística (gratis, automática)
- **Hook `PostToolUse`** (`settings.json` → `scripts/check-build.mjs`): tras editar
  código de `src/`, corre `vite build`. Si no compila, `exit 2` y Claude se autocorrige.
  Atrapa errores de compilación/sintaxis. **No** atrapa crashes de runtime.

## Capa de runtime (lo que caza el blank-screen)
- **`npm run smoke`** (`scripts/smoke.mjs`): build → `vite preview` → carga headless con
  Playwright → verifica que `#root` renderice y que **no haya errores de consola**.
  Es lo que atrapa el crash que compila pero deja la pantalla en blanco (ej. TDZ / hook
  que referencia un `const` declarado más abajo). Probado: PASA sano, FALLA con un crash inyectado.
  - Requiere una vez:  `npm i -D playwright && npx playwright install chromium`
  - Corré `npm run smoke` antes de desplegar / como check de CI.

## Capa de juicio
- **Subagente `frontend-qa`** (`.claude/agents/`, model sonnet, read-only): audita `src/App.jsx`
  contra los invariantes que rompen la demo — orden de hooks/TDZ, render seguro, cripto
  invisible, flujos de los 5 actos cableados, mobile-first, marca. Invocalo en checkpoints:
  `usá el subagente frontend-qa sobre los cambios`.

## En sesión interactiva
Claude además valida runtime con el preview (cargar + consola + screenshot) — así se
encontró el TDZ. El smoke automatiza ese mismo chequeo para CI / pre-deploy.
