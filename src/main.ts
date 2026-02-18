import * as core from '@actions/core'

const VALID_SEVERITIES = ['LOW', 'MINOR', 'MAJOR', 'CRITICAL'] as const
const REQUEST_TIMEOUT_MS = 30_000

interface ApiSuccessResponse {
  success: true
  data: {
    id: string
    time: string
    [key: string]: unknown
  }
}

interface ApiErrorResponse {
  success: false
  error: string
  code: string
}

type ApiResponse = ApiSuccessResponse | ApiErrorResponse

export async function run(): Promise<void> {
  try {
    const apiKey = core.getInput('api-key', { required: true })
    const type = core.getInput('type', { required: true })
    const subject = core.getInput('subject')
    const version = core.getInput('version')
    const description = core.getInput('description')
    const sourceInput = core.getInput('source')
    const severity = core.getInput('severity')
    const dataInput = core.getInput('data')
    const apiUrl = core.getInput('api-url') || 'https://api.opstrails.dev'

    // Validate severity if provided
    if (severity && !VALID_SEVERITIES.includes(severity as (typeof VALID_SEVERITIES)[number])) {
      core.setFailed(
        `Invalid severity "${severity}". Must be one of: ${VALID_SEVERITIES.join(', ')}`,
      )
      return
    }

    // Default source to //github.com/{owner}/{repo}
    const githubRepository = process.env.GITHUB_REPOSITORY ?? ''
    const source = sourceInput || `//github.com/${githubRepository}`

    // Build event data payload
    let data: Record<string, unknown> | undefined
    if (description || dataInput) {
      data = {}
      if (description) {
        data.description = description
      }
      if (dataInput) {
        try {
          const parsed = JSON.parse(dataInput)
          if (typeof parsed === 'object' && parsed !== null) {
            Object.assign(data, parsed)
          }
        } catch {
          core.warning(`Failed to parse 'data' input as JSON, ignoring: ${dataInput}`)
        }
      }
    }

    // Build CloudEvent payload
    const event: Record<string, unknown> = {
      specversion: '1.0',
      type,
      source,
      time: 'NOW',
    }
    if (subject) event.subject = subject
    if (version) event.version = version
    if (severity) event.severity = severity
    if (data) event.data = data

    // Mask the API key in logs
    core.setSecret(apiKey)

    core.info(`Tracking "${type}" event for source "${source}"`)

    const url = `${apiUrl.replace(/\/+$/, '')}/api/v1/events`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    let response: Response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(event),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }

    let body: ApiResponse
    try {
      body = (await response.json()) as ApiResponse
    } catch {
      core.setFailed(
        `OpsTrails API returned non-JSON response (${response.status}): ${response.statusText}`,
      )
      return
    }

    if (!response.ok || !body.success) {
      const errorBody = body as ApiErrorResponse
      core.setFailed(
        `OpsTrails API error (${response.status}): ${errorBody.error} [${errorBody.code}]`,
      )
      return
    }

    const { data: result } = body as ApiSuccessResponse

    core.setOutput('event-id', result.id)
    core.setOutput('event-time', result.time)

    core.info(`Event tracked successfully (id: ${result.id})`)
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        core.setFailed(`Request to OpsTrails API timed out after ${REQUEST_TIMEOUT_MS / 1000}s`)
      } else {
        core.setFailed(error.message)
      }
    } else {
      core.setFailed('An unexpected error occurred')
    }
  }
}
