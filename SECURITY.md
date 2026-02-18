# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly.

**Do not open a public issue.** Instead, email security@opstrails.dev with:

- A description of the vulnerability
- Steps to reproduce
- Potential impact

We will acknowledge your report within 48 hours and aim to release a fix within 7 days for critical issues.

## Supported Versions

| Version | Supported |
| ------- | --------- |
| v1.x    | Yes       |

## Security Best Practices

When using this action:

- **Always store your API key as a GitHub secret** (`${{ secrets.OPSTRAILS_API_KEY }}`). Never hardcode it in workflow files.
- The action automatically masks the API key in workflow logs using `core.setSecret()`.
- Use the minimum required permissions in your workflow (`permissions: contents: read`).
