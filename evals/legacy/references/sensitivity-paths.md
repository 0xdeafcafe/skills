# Sensitivity paths

Path patterns that trigger Opus dispatch for fix-applier work. When `orchestrate-merge` builds a work packet, it checks every file path in the packet against this list (and inspects each finding's `category`). If any pattern matches, or any finding has `category: security`, the packet's `suggested_model` becomes `opus` regardless of severity.

Sensitivity gates on **blast radius if the fix is wrong**, not on severity. A P3 typo in `auth/session.ts` still goes to Opus because the file is load-bearing for security; a P0 lint complaint in `docs/` still goes to Sonnet because the worst case is a typo in a markdown file.

## Patterns

Patterns are glob-style for matching against `git diff --name-only` paths (case-insensitive, POSIX-style separators). The merger evaluates them in order — first match wins, but the match itself is what matters; ordering only affects which pattern is recorded as the `sensitivity_reason`.

```
# Auth / identity
**/auth/**                   # session lifecycle, login, logout
**/authn/**                  # authentication entrypoints
**/authz/**                  # authorization policy
**/*session*                 # session cookies, store, refresh
**/*cookie*                  # cookie set/clear, secure flag handling
**/*jwt*                     # JWT signing, verification, key rotation
**/*oauth*                   # OAuth handshakes, PKCE, redirect_uri allowlists
**/*sso*                     # SAML / OIDC bridges

# Secrets / crypto
**/*crypto*                  # hand-rolled or wrapper crypto code
**/*encrypt*                 # symmetric or asymmetric encryption surfaces
**/*decrypt*                 # decryption code (high blast radius if broken)
**/*hash*                    # password/PII hashing (timing-safe? salt?)
**/*password*                # password handling end-to-end
**/*secret*                  # secret loading, rotation, storage
**/*credential*              # credential constructors, vaults
**/*token*                   # API tokens, refresh tokens, CSRF tokens
**/*kms*                     # KMS integration, envelope encryption
**/*vault*                   # Vault / 1Password / Doppler integration

# Electron / IPC trust boundary
**/ipc-handler*              # explicit IPC handler convention
**/ipc/**                    # ipc directory
**/electron/main/**          # main-process entrypoints
**/electron/preload/**       # preload scripts (renderer ↔ main bridge)
**/preload*.{ts,js}          # preload by naming convention
**/main.{ts,js}              # Electron main process entry

# Web trust boundary
**/middleware/**             # auth / CSRF middleware
**/routes/**/*.{ts,tsx,js,jsx}   # public route handlers
```

## Adding a pattern

If you add a pattern, name the threat-model bit that motivated it in the trailing comment. Patterns without a rationale rot — six months later, no one remembers whether `**/*config*` was added because configs hold secrets or because of one specific incident, and the gate either gets over-applied (every config triggers Opus) or stripped out.

Good additions:

```
**/payment/**            # PCI scope; one bad fix here turns into a card-data breach
**/migration/*.sql       # data integrity; a bad rewrite drops production data
```

Bad addition (don't do this):

```
**/important/**          # important stuff
```

## What this does NOT cover

- Findings flagged `category: security` ALWAYS trigger Opus regardless of path. That's the merger's other rule, not this file's job.
- Sensitivity gating is about the **fix model**, not whether the finding gets generated. Every reviewer looks at every file in scope — sensitivity only changes who applies the fix.
- This file does not affect the slicer, the verifier, or the per-slice reviewers. Only `orchestrate-merge`'s sensitivity annotation reads it.
