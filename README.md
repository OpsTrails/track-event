# OpsTrails Track Event Action

GitHub Action to track infrastructure events (deployments, rollbacks, releases, etc.) in [OpsTrails](https://opstrails.dev).

## Usage

```yaml
- uses: OpsTrails/track-event@v1
  with:
    api-key: ${{ secrets.OPSTRAILS_API_KEY }}
    type: deployment
    subject: production
    version: ${{ github.sha }}
    description: 'Deployed to production'
```

## Inputs

| Input         | Required | Description                                                 |
| ------------- | -------- | ----------------------------------------------------------- |
| `api-key`     | Yes      | OpsTrails API key (starts with `ot_`)                       |
| `type`        | Yes      | Event type (e.g., `deployment`, `rollback`, `release`)      |
| `subject`     | No       | Environment or target (e.g., `production`, `staging`)       |
| `version`     | No       | Version identifier or commit SHA                            |
| `description` | No       | Human-readable description of the event                     |
| `source`      | No       | Event source URI. Defaults to `//github.com/{owner}/{repo}` |
| `severity`    | No       | Event severity: `LOW`, `MINOR`, `MAJOR`, or `CRITICAL`      |
| `data`        | No       | Additional event data as a JSON string                      |
| `api-url`     | No       | API base URL (default: `https://api.opstrails.dev`)         |

## Outputs

| Output       | Description                               |
| ------------ | ----------------------------------------- |
| `event-id`   | The ID of the created event               |
| `event-time` | The server-assigned event time (ISO 8601) |

## Examples

### Basic deployment tracking

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # ... your deploy steps ...

      - uses: OpsTrails/track-event@v1
        with:
          api-key: ${{ secrets.OPSTRAILS_API_KEY }}
          type: deployment
          subject: production
          version: ${{ github.sha }}
```

### With severity and extra data

```yaml
- uses: OpsTrails/track-event@v1
  with:
    api-key: ${{ secrets.OPSTRAILS_API_KEY }}
    type: rollback
    subject: production
    version: v1.2.3
    severity: MAJOR
    description: 'Rolling back due to elevated error rate'
    data: '{"reason": "error_rate_spike", "rolled_back_from": "v1.3.0"}'
```

### Using the event ID output

```yaml
- uses: OpsTrails/track-event@v1
  id: track
  with:
    api-key: ${{ secrets.OPSTRAILS_API_KEY }}
    type: deployment
    subject: staging

- run: echo "Tracked event ${{ steps.track.outputs.event-id }}"
```

## License

MIT
