# GraphQL and gh api queries for drive-pr Phase 2

## Issue-level comments (timeline)

```bash
gh api repos/<owner>/<repo>/issues/<pr>/comments --paginate \
  --jq '[.[] | {id, user_login: .user.login, user_type: .user.type, body, created_at, updated_at, html_url}]'
```

## Inline review comments (line-attached)

```bash
gh api repos/<owner>/<repo>/pulls/<pr>/comments --paginate \
  --jq '[.[] | {id, user_login: .user.login, user_type: .user.type, body, path, line, original_line, in_reply_to_id, created_at, html_url, pull_request_review_id}]'
```

## Reviews (top-level state: APPROVED / CHANGES_REQUESTED / COMMENTED)

```bash
gh api repos/<owner>/<repo>/pulls/<pr>/reviews --paginate \
  --jq '[.[] | {id, user_login: .user.login, user_type: .user.type, state, body, submitted_at, html_url}]'
```

## Review threads (GraphQL - REST does not expose `isResolved`)

```bash
gh api graphql -F owner=<owner> -F repo=<repo> -F pr=<pr> -f query='
  query($owner:String!, $repo:String!, $pr:Int!) {
    repository(owner:$owner, name:$repo) {
      pullRequest(number:$pr) {
        reviewThreads(first:100) {
          nodes {
            id
            isResolved
            isOutdated
            comments(first:50) {
              nodes { id databaseId author { login } body path line }
            }
          }
        }
      }
    }
  }'
```

## Resolve a review thread (Phase 3)

```bash
gh api graphql -F threadId=<reviewThread.id> -f query='
  mutation($threadId:ID!) {
    resolveReviewThread(input:{threadId:$threadId}) { thread { isResolved } }
  }'
```
