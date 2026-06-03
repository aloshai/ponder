# Upstream Sync Plan (ponder-sh/ponder → aloshai/ponder fork)

**Divergence point (merge base):** `6fcc15d4` (≈ ponder v0.16.1)
**Upstream is ahead by:** 39 commits (reaches v0.16.6)
**Our fork is ahead by:** 10 commits (custom work)

Our fork's custom work to preserve:
- `eth_getLogs` truncation **detection** (different from upstream #2247) + NodeReal support
- Memory-aware throttling (`internal/memory.ts`, `state.ts`, `metrics.ts`, `options.ts`)
- Performance optimizations (`utils/deque.ts`, `generators.ts`, `database/copy.ts`, `cache.ts`)
- Custom CI (`build-release.yml`), upstream workflows deleted intentionally

Strategy: **cherry-pick selected commits** instead of a full `git merge upstream/main`,
because upstream's runtime refactor (#2272) collides with our heavily-modified runtime/sync code.

---

## Decision Matrix

| PR / commit | Description | Decision | Conflict risk | Files |
|---|---|---|---|---|
| **#2265** `e68fec3d` | Assorted bug fixes (real bugs) | ✅ **TAKE** | Low–med | `rpc/index.ts`, `rpc/actions.ts`, `sync-store/index.ts`, `indexing-store/*` |
| **#2290** `eeeae472`+ | Case-insensitive GraphQL string filters (`*_nocase`) | ✅ **TAKE** | None | `graphql/index.ts` (+test) |
| **#2283** `df469170` | Factory `location` low-level config field | ✅ **TAKE** | None | `build/factory.ts`, `config/address.ts` (+test) |
| **#2247** `2547e2e1`+ | Disable truncation in critical error messages (`prettyPrint` toggle) | ✅ **TAKE** | Low (cache.ts) | `utils/print.ts`, `indexing-store/{cache,index,utils}.ts` |
| **#2259** `ee00fe2b` | Clean up graphiql html & imports | ✅ **TAKE** | None | `graphql/graphiql.html.ts`, `graphql/index.ts` |
| **#2287** `9fec2a97`+ | NPM publishing: ship `tsconfig.json` + `LICENSE`, `@ponder/client` exports | 🟡 **OPTIONAL** | None | `package.json`, `LICENSE` files |
| **#2280 / #2281** | README npm links, readme/docs copy refresh | 🟡 **OPTIONAL** | None | `README.md`, `docs/` |
| **#2272** `e6cd7a89`+ | Runtime cleanup — removes `runtime/init.ts`, `initEventGenerator`→`getLocalEventGenerator`, drops `finalizedBlocks` from `IndexingBuild` | 🔴 **DEFER / MANUAL** | High | `runtime/{historical,isolated,multichain,omnichain}.ts`, deletes `init.ts` |
| docs-only (marble, banner, sidebar, vocs) | Documentation | ❌ **SKIP** | None | `docs/` |
| CI (`main.yml`, `release.yml`, `windows.yml`) | Workflow tweaks | ❌ **SKIP** (we deleted these) | None | `.github/` |
| `version packages` / changeset chores | Release bookkeeping | ❌ **SKIP** (we manage our own versioning) | None | `CHANGELOG.md`, `package.json` |

---

## #2265 — Detailed take (all lines verified present in our fork)

1. **RPC array hostname bug** — in the `Array.isArray(chain.rpc)` branch, `new url.URL(chain.rpc).hostname` must become `new url.URL(rpc).hostname`. ⚠️ Our fork has this pattern at **two** lines (197 and 240). Only the one *inside* the `chain.rpc.map((rpc) => ...)` array branch (≈ line 240) should change. Line 197 (single-rpc branch) is correct as-is — do **not** touch it.
2. **Remove `console.log(logs)`** — `rpc/actions.ts:964`.
3. **`throw "unreachable"` → `throw new Error("Unreachable")`** — `rpc/index.ts:714`.
4. **WebSocket backoff jitter** — `rpc/index.ts:903`, add `+ Math.random() * BASE_DURATION`.
5. **`select_blocks` missing `context`** — `sync-store/index.ts:1082`, add `, context` 3rd arg to `qb.wrap`. (Verify `context` is in scope in our version.)
6. **`delimeter` → `delimiter` typo** — 4 occurrences in `indexing-store/{cache.ts:140, profile.ts:485, profile.test.ts:497,615}`.

> A raw `git cherry-pick e68fec3d` will likely conflict in `rpc/index.ts` and `sync-store/index.ts` (heavily modified by us). Safer to apply these 6 fixes **manually** as one focused commit.

## #2247 — Note
Conceptually unrelated to our `eth_getLogs` truncation-detection work. It only adds a
`{ truncate?: boolean }` option to `prettyPrint` (default unchanged) and passes `truncate: false`
at a few error sites. `print.ts`/`index.ts`/`utils.ts` don't overlap our fork; only `cache.ts` does,
so watch that one file when applying.

## #2272 — Why deferred
Removes `runtime/init.ts` and refactors the event-generator wiring across exactly the four runtime
files where our memory-throttling changes live. Cherry-picking it blind would produce large conflicts.
Recommendation: skip unless a specific downstream fix depends on it; if needed, port by hand after the
low-risk items land and tests pass.

---

## Proposed execution order

1. **Clean cherry-picks (no conflict):** `#2290`, `#2283`, `#2247`, `#2259`
   - `git cherry-pick` each; resolve only the `cache.ts` touch from #2247 if it conflicts.
2. **Manual bug-fix commit:** apply the 6 fixes from `#2265` by hand (don't cherry-pick).
3. **Build + typecheck + test** after each group: `pnpm build && pnpm typecheck && pnpm --filter ./packages/core test`.
4. **Optional packaging (#2287):** decide whether the fork publishes to NPM; if not, skip.
5. **Defer #2272** and all docs/CI/version chores.

Each group should be a separate commit so anything can be reverted independently.
