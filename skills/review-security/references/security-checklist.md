# Security audit checklist - long form

Load when you want the full prompt. review-security's SKILL.md has the
short version inline.

## Authentication

| Question | What to look for | Common smell |
| --- | --- | --- |
| Is authentication required? | Middleware, decorator, or explicit check at the start of the handler | Endpoint with no `requireAuth` / `@login_required` / equivalent |
| Is the token actually verified? | Signature check, expiry check, issuer check | `jwt.decode()` without `jwt.verify()` |
| Is the algorithm pinned? | `verify(token, key, {algorithms: ['HS256']})` | `jwt.verify(token, key)` with default - allows `alg: none` |
| Is brute-force throttled? | Rate limiting, account lockout | Login endpoint with no throttle |
| Is password storage right? | bcrypt / argon2 / scrypt with proper cost | SHA-256(password + salt), MD5, plain hashes |
| Is "forgot password" safe? | Single-use, time-limited token; rotated on use | Reused tokens, long-lived (>1h) tokens |
| Are sessions invalidated on logout? | Server-side session/token blacklist or rotation | Client just deletes the cookie |
| Are sessions rotated on auth? | New session ID issued at login | Same session ID before and after login (fixation) |

## Authorization

| Question | What to look for | Common smell |
| --- | --- | --- |
| Is ownership / membership checked? | Explicit query that resource belongs to caller | Fetch by ID + return, no ownership filter |
| Are roles enforced where they matter? | `if (user.role !== 'admin') return 403` | UI hides admin button but API doesn't enforce |
| Are 401 vs 403 vs 404 used correctly? | 401 = no auth; 403 = wrong perms; 404 = not found (or hidden) | 200 with empty body for unauthorized |
| Is admin access audited? | Audit log entry for elevated actions | Silent privilege use |
| Is multi-tenant isolation enforced? | Tenant ID filter on every query | Queries that don't include tenant filter |
| Is "ID enumerable"? | `/orders/1`, `/orders/2`, `/orders/3`... | Sequential integer IDs in user-facing URLs (use UUIDs or hashed IDs) |

## Injection (SQL, NoSQL, command, LDAP, XPath, etc.)

| Family | Safe | Unsafe |
| --- | --- | --- |
| SQL | `db.query('SELECT * FROM users WHERE id = ?', [id])` | `db.query(\`SELECT * FROM users WHERE id = ${id}\`)` |
| NoSQL (Mongo) | `db.users.findOne({ _id: ObjectId(id) })` | `db.users.findOne({ _id: id })` where `id` could be `{$ne: null}` |
| Shell | `spawn('git', ['log', '--', userInput])` | `exec(\`git log -- ${userInput}\`)` |
| HTML | React/Vue auto-escape; `escapeHtml(s)` | `innerHTML = userInput`, `dangerouslySetInnerHTML` |
| URL params | `URLSearchParams` | String concatenation of query strings |

For each handler that takes user input → DB / shell / template / API:
trace input → output. If there's a path from untrusted input to a
sensitive sink without proper encoding, it's a finding.

## Cross-Site Scripting (XSS)

| Type | What it looks like |
| --- | --- |
| **Reflected** | `?q=<script>...</script>` is rendered into the response unescaped |
| **Stored** | User submits `<script>` in a profile field; later viewers execute it |
| **DOM** | `document.write(window.location.hash)` |

Defenses:

- Use a templating engine that escapes by default (React, Vue, Jinja2,
  ERB in Rails).
- For HTML you have to render (rich text, markdown), sanitize with a
  library: DOMPurify, bleach, sanitize-html.
- Content-Security-Policy header: `default-src 'self'` with a tight
  policy on what scripts can load.
- Don't disable React's escaping (`dangerouslySetInnerHTML`) without a
  sanitization step.

## Cross-Site Request Forgery (CSRF)

State-changing requests from a browser need CSRF protection. Options:

- **SameSite cookies** (`Lax` or `Strict`): the default for new
  browsers, protects against cross-site form posts.
- **CSRF tokens**: server-issued per-session token, validated on every
  POST/PUT/DELETE.
- **Custom header check**: requests must include `X-Requested-With:
  XMLHttpRequest` or similar; browsers won't send custom headers
  cross-origin without CORS preflight.
- **JSON-only APIs**: a content-type of `application/json` is
  effectively a custom-header check, because cross-origin form posts
  can't send JSON.

If the PR adds a state-changing endpoint and there's no CSRF protection
in the framework's middleware, flag it.

## Server-Side Request Forgery (SSRF)

If the server fetches a URL from user input (image uploads via URL,
webhook configuration, "preview this link" features), validate:

- **Block private CIDRs**: 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12,
  192.168.0.0/16, 169.254.0.0/16 (cloud metadata), 0.0.0.0/8.
- **Block non-http(s) schemes**: file://, gopher://, dict://, ldap://.
- **Resolve DNS yourself** and validate the resolved IP - don't trust
  the hostname check (DNS rebinding attacks).
- **Set a reasonable timeout** (5s) so SSRF can't hang the server.

## Sensitive data

| Question | What to look for |
| --- | --- |
| Are passwords ever logged? | grep for `console.log\|logger.*password\|debug.*password` |
| Are full request bodies logged on auth endpoints? | Logging middleware that logs body, not filtered |
| Are credit card numbers ever stored? | Better: don't store. If you must, PCI scope is a separate project |
| Are SSNs / PII at rest encrypted? | Database column encryption, or KMS-managed application-layer encryption |
| Is data sent over TLS? | URLs are `https://`, not `http://`; no `verify=False` |
| Are secrets in env vars (not config files in the repo)? | Don't commit `.env`, only `.env.example` with fake values |

## Cryptography

| Use case | Right choice | Wrong choice |
| --- | --- | --- |
| Password hashing | bcrypt, argon2, scrypt, PBKDF2 | sha256(password), md5, raw sha + salt |
| Symmetric encryption | AES-GCM, ChaCha20-Poly1305 (AEAD modes) | AES-ECB, AES-CBC without HMAC |
| Asymmetric encryption | RSA-OAEP, ECIES, libsodium boxes | RSA-PKCS1v1.5, raw RSA |
| Signing | Ed25519, ECDSA, RSA-PSS | DSA, RSA-PKCS1v1.5 |
| MAC / signing of data at rest | HMAC-SHA256, Ed25519 | hash(secret + data) |
| Random IDs | UUIDv4, `crypto.randomBytes(16).toString('hex')` | `Math.random()`, sequential, timestamps |
| Key derivation | HKDF, scrypt, argon2 | sha256(password) |
| Hashes for non-security checksums | sha256, blake3 | crc32 (only for non-adversarial), md5 (deprecated) |

Other smells:

- Hardcoded keys / IVs / nonces in source code.
- Reusing an IV across messages (catastrophic for AES-GCM).
- Not using a constant-time comparison for secrets
  (`crypto.timingSafeEqual` instead of `==`).
- Using `jwt.decode()` without `jwt.verify()` and trusting the
  payload.

## Insecure Deserialization

If the language allows it, untrusted-input deserialization can execute
code. Avoid these:

- Python: `pickle.loads()`, `yaml.load()` (use `yaml.safe_load()`)
- Ruby: `Marshal.load()`, `YAML.load()` (use `YAML.safe_load()`)
- PHP: `unserialize()`
- Java: `ObjectInputStream.readObject()`, `XMLDecoder`
- .NET: `BinaryFormatter`, `LosFormatter`, `ObjectStateFormatter`
- Node: `vm.runInThisContext()`, `eval()`, `Function()`

Use JSON or a typed schema (protobuf, Avro, Cap'n Proto) for
data-from-the-wire.

## Logging and Monitoring

- **Log security-relevant events**: failed logins, authz failures,
  admin actions, rate-limit hits, anomalous behaviours.
- **Don't log secrets**: tokens, passwords, full Authorization headers.
- **Don't log full PII**: redact emails to `a***@example.com`, mask
  card numbers, etc.
- **Make logs structured**: JSON, not raw text - easier to query for
  anomalies.
- **Logs are not security controls**: don't put security decisions
  inside a `try { logger.log() }` - if the log call throws, the
  decision shouldn't be skipped.
- **Don't log to stdout in serverless / container envs that ship to
  third parties** without redacting first.

## File Uploads

If the PR adds file upload handling:

- **Cap the size** at the framework level (not just at the database).
- **Validate the type** by content (magic bytes), not the extension.
- **Store outside the webroot** or behind a download endpoint that
  serves with `Content-Disposition: attachment` and a safe content
  type.
- **Don't preserve the user-provided filename** for the stored path.
  Use a generated UUID; map the user filename for display.
- **Scan for malware** in pipelines that take public uploads.
- **Resize images** server-side rather than serving originals.

## CORS

Common misconfigurations:

```ts
// Bad: reflects any origin AND allows credentials
res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
res.setHeader('Access-Control-Allow-Credentials', 'true');

// Bad: wildcard + credentials is invalid spec (browsers will reject),
// but the intent is wrong anyway
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Credentials', 'true');

// Good: explicit allowlist
const allowed = ['https://app.example.com', 'https://admin.example.com'];
if (allowed.includes(req.headers.origin)) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
  res.setHeader('Vary', 'Origin');
}
```

## Open Redirect

If your app redirects based on user input (post-login `?return_to=`,
post-action navigation):

- **Validate the target** against an allowlist of safe paths.
- **Always make the target same-origin** (`/path`, not `https://other.com/path`).
- **Strip the protocol and host** before redirecting.

```ts
// Bad
res.redirect(req.query.return_to);

// Good
const target = req.query.return_to;
if (target && target.startsWith('/') && !target.startsWith('//')) {
  res.redirect(target);
} else {
  res.redirect('/');
}
```

## Rate limiting / DoS

- **Bounded request bodies**: maxBytes on JSON parser.
- **Bounded query results**: max page size on list endpoints.
- **Bounded loops**: don't `while (cursor)` without a max iteration
  count.
- **Bounded async work per request**: don't make a request that
  spawns 100 sub-requests.
- **Rate limit auth endpoints** harder than other endpoints.
- **Rate limit by IP _and_ by user** - IP alone is insufficient
  against authenticated attacks.

## Headers worth setting

For HTTP responses (especially HTML responses):

| Header | Value | Why |
| --- | --- | --- |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Force HTTPS |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing attacks |
| `Content-Security-Policy` | Tight policy | XSS defense-in-depth |
| `X-Frame-Options` | `DENY` or `SAMEORIGIN` | Clickjacking defense (CSP `frame-ancestors` is better but X-Frame-Options is still useful) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Don't leak full URLs to third parties |
| `Permissions-Policy` | Restrict features you don't use | Defense-in-depth |

For APIs (JSON responses):

- `Cache-Control: no-store` on responses containing sensitive data.
- `X-Content-Type-Options: nosniff` (still useful).

## Dependency vulnerabilities

When `npm audit` / `pip-audit` / etc. surfaces a finding:

1. **Is it reachable?** A vulnerability in a code path you don't use
   may be fine to defer.
2. **Is there a patched version?** Bump it.
3. **Is it transitive?** `overrides` (npm), `[patch]` (Cargo) can pin
   a transitive dep, but verify the patched version is API-compatible
   with what your direct dep expects.
4. **Is there a fix in flight?** Check the advisory. If a fix is days
   away, sometimes the right call is to wait rather than apply a hasty
   workaround.

Don't ignore "Critical" advisories without a documented justification.

## Things that look scary but usually aren't

- Eval of literal strings (`eval('1 + 1')`): not a security issue.
- Hardcoded "secrets" that are clearly examples
  (`AKIAIOSFODNN7EXAMPLE` is AWS's own example key).
- Loose CORS on a fully-public read-only API (e.g., a docs search
  endpoint that returns the same data to everyone).
- Lack of CSRF token on a JSON-only API consumed by a SPA on the same
  origin (SameSite + custom-header check is sufficient).
- `Math.random()` in non-security code (test data, jitter, animations).

False-positive triage is a real skill. Calibrate severity to actual
risk, not pattern-match alone.

## Things that look fine but aren't

- "We're behind a VPN" - VPNs fail open or have stolen credentials.
  Defense in depth means assume the VPN doesn't help.
- "The endpoint is internal" - every "internal" endpoint that doesn't
  authenticate becomes a problem the moment someone proxies it
  externally or compromises one host.
- "The user must be logged in" - okay, are they the *right* logged-in
  user? Authn ≠ authz.
- "It's a feature flag, we'll secure it before launch" - flagged
  endpoints get hit; if the flag bypasses auth, that's the bug.
- "We sanitize on input" - output encoding belongs at output, not
  input. Input sanitization fails the moment you forget one place.
