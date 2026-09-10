# NN. Monitoring Guide Title

- **Status:** Active
- **Date:** YYYY-MM-DD
- **Deciders:** GitHub handles
- **Related:** links

## What to Monitor

Key metrics and signals.

## Health Checks

### Endpoint

```
GET /health
```

### Expected Response

```json
{"status":"ok"}
```

## Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `metric_name` | counter/gauge | ... |

## Alerts

| Alert | Condition | Severity |
|-------|-----------|----------|
| Alert name | condition | critical/warning |

## Dashboards

Links to Grafana or other dashboards.

## Log Queries

Useful grep / query patterns.
