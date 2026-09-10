# NN. Endpoint Title

- **Status:** Proposed | Active | Deprecated
- **Date:** YYYY-MM-DD
- **Deciders:** GitHub handles
- **Related:** links

## Overview

One-paragraph summary of what this endpoint does.

## Method & Path

```
METHOD /path
```

## Request

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| `X-Header` | yes | ... |

### Body (JSON)

```json
{
  "field": "value"
}
```

### Parameters

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `param` | string | yes | — | ... |

## Response

### Success (200)

```json
{
  "field": "value"
}
```

### Errors

| Status | Meaning | Example |
|--------|---------|---------|
| 400 | Bad request | ... |
| 401 | Unauthorized | ... |
| 500 | Server error | ... |

## Example (curl)

```bash
curl -X POST http://localhost:3264/api/endpoint \
  -H "Content-Type: application/json" \
  -d '{"field": "value"}'
```

## Notes

- Caveats, limitations, known issues.
