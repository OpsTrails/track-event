# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2025-01-01

### Added

- Initial release of OpsTrails Track Event GitHub Action
- Track infrastructure events (deployments, rollbacks, releases, etc.) in OpsTrails
- Inputs: `api-key`, `type`, `subject`, `version`, `description`, `source`, `severity`, `data`, `api-url`
- Outputs: `event-id`, `event-time`
- Automatic source detection from GitHub repository
- Severity validation (`LOW`, `MINOR`, `MAJOR`, `CRITICAL`)
- API key masking in workflow logs
- Request timeout (30s) to prevent hanging workflows
