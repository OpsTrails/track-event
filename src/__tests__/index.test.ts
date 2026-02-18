import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock @actions/core before importing the module under test
const mockGetInput = vi.fn()
const mockSetOutput = vi.fn()
const mockSetFailed = vi.fn()
const mockSetSecret = vi.fn()
const mockInfo = vi.fn()
const mockWarning = vi.fn()

vi.mock('@actions/core', () => ({
  getInput: mockGetInput,
  setOutput: mockSetOutput,
  setFailed: mockSetFailed,
  setSecret: mockSetSecret,
  info: mockInfo,
  warning: mockWarning,
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function setInputs(inputs: Record<string, string>) {
  mockGetInput.mockImplementation((name: string, opts?: { required?: boolean }) => {
    const value = inputs[name] ?? ''
    if (opts?.required && !value) {
      throw new Error(`Input required and not supplied: ${name}`)
    }
    return value
  })
}

function mockSuccessResponse(id = 'evt_123', time = '2025-01-01T00:00:00Z') {
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ success: true, data: { id, time } }),
  })
}

function mockErrorResponse(status: number, error: string, code: string) {
  mockFetch.mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({ success: false, error, code }),
  })
}

describe('OpsTrails Track Event Action', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env.GITHUB_REPOSITORY = 'OpsTrails/my-app'
  })

  afterEach(() => {
    delete process.env.GITHUB_REPOSITORY
  })

  describe('successful event tracking', () => {
    it('sends a minimal event with required inputs only', async () => {
      setInputs({ 'api-key': 'ot_test', type: 'deployment' })
      mockSuccessResponse()

      const { run } = await import('../main.js')
      await run()

      expect(mockSetSecret).toHaveBeenCalledWith('ot_test')
      expect(mockFetch).toHaveBeenCalledOnce()

      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe('https://api.opstrails.dev/api/v1/events')
      expect(options.method).toBe('POST')
      expect(options.headers['Authorization']).toBe('Bearer ot_test')

      const body = JSON.parse(options.body)
      expect(body).toEqual({
        specversion: '1.0',
        type: 'deployment',
        source: '//github.com/OpsTrails/my-app',
        time: 'NOW',
      })

      expect(mockSetOutput).toHaveBeenCalledWith('event-id', 'evt_123')
      expect(mockSetOutput).toHaveBeenCalledWith('event-time', '2025-01-01T00:00:00Z')
      expect(mockInfo).toHaveBeenCalledWith('Event tracked successfully (id: evt_123)')
    })

    it('sends all optional fields when provided', async () => {
      setInputs({
        'api-key': 'ot_test',
        type: 'rollback',
        subject: 'production',
        version: 'v1.2.3',
        description: 'Rolling back',
        source: '//custom/source',
        severity: 'MAJOR',
        data: '{"reason": "error_spike"}',
      })
      mockSuccessResponse()

      const { run } = await import('../main.js')
      await run()

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body).toEqual({
        specversion: '1.0',
        type: 'rollback',
        source: '//custom/source',
        time: 'NOW',
        subject: 'production',
        version: 'v1.2.3',
        severity: 'MAJOR',
        data: {
          description: 'Rolling back',
          reason: 'error_spike',
        },
      })
    })

    it('uses custom api-url when provided', async () => {
      setInputs({
        'api-key': 'ot_test',
        type: 'deployment',
        'api-url': 'https://custom.api.dev/',
      })
      mockSuccessResponse()

      const { run } = await import('../main.js')
      await run()

      const url = mockFetch.mock.calls[0][0]
      expect(url).toBe('https://custom.api.dev/api/v1/events')
    })
  })

  describe('source defaults', () => {
    it('defaults source to GITHUB_REPOSITORY', async () => {
      process.env.GITHUB_REPOSITORY = 'myorg/myrepo'
      setInputs({ 'api-key': 'ot_test', type: 'deployment' })
      mockSuccessResponse()

      const { run } = await import('../main.js')
      await run()

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.source).toBe('//github.com/myorg/myrepo')
    })

    it('uses custom source when provided', async () => {
      setInputs({ 'api-key': 'ot_test', type: 'deployment', source: '//gitlab.com/org/repo' })
      mockSuccessResponse()

      const { run } = await import('../main.js')
      await run()

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.source).toBe('//gitlab.com/org/repo')
    })
  })

  describe('severity validation', () => {
    it.each(['LOW', 'MINOR', 'MAJOR', 'CRITICAL'])('accepts valid severity: %s', async (sev) => {
      setInputs({ 'api-key': 'ot_test', type: 'deployment', severity: sev })
      mockSuccessResponse()

      const { run } = await import('../main.js')
      await run()

      expect(mockSetFailed).not.toHaveBeenCalled()
      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.severity).toBe(sev)
    })

    it('rejects invalid severity', async () => {
      setInputs({ 'api-key': 'ot_test', type: 'deployment', severity: 'INVALID' })

      const { run } = await import('../main.js')
      await run()

      expect(mockSetFailed).toHaveBeenCalledWith(
        'Invalid severity "INVALID". Must be one of: LOW, MINOR, MAJOR, CRITICAL',
      )
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('data input parsing', () => {
    it('merges description and data JSON', async () => {
      setInputs({
        'api-key': 'ot_test',
        type: 'deployment',
        description: 'A deploy',
        data: '{"key": "value"}',
      })
      mockSuccessResponse()

      const { run } = await import('../main.js')
      await run()

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.data).toEqual({ description: 'A deploy', key: 'value' })
    })

    it('warns and ignores invalid JSON data', async () => {
      setInputs({
        'api-key': 'ot_test',
        type: 'deployment',
        data: 'not-json',
      })
      mockSuccessResponse()

      const { run } = await import('../main.js')
      await run()

      expect(mockWarning).toHaveBeenCalledWith(
        expect.stringContaining("Failed to parse 'data' input as JSON"),
      )
      // data object is created (dataInput is truthy) but empty after failed parse
      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.data).toEqual({})
    })

    it('ignores non-object JSON data', async () => {
      setInputs({
        'api-key': 'ot_test',
        type: 'deployment',
        description: 'test',
        data: '"just a string"',
      })
      mockSuccessResponse()

      const { run } = await import('../main.js')
      await run()

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.data).toEqual({ description: 'test' })
    })
  })

  describe('error handling', () => {
    it('handles API error response', async () => {
      setInputs({ 'api-key': 'ot_test', type: 'deployment' })
      mockErrorResponse(400, 'Bad request', 'INVALID_EVENT')

      const { run } = await import('../main.js')
      await run()

      expect(mockSetFailed).toHaveBeenCalledWith(
        'OpsTrails API error (400): Bad request [INVALID_EVENT]',
      )
    })

    it('handles non-JSON response', async () => {
      setInputs({ 'api-key': 'ot_test', type: 'deployment' })
      mockFetch.mockResolvedValue({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        json: () => Promise.reject(new Error('invalid json')),
      })

      const { run } = await import('../main.js')
      await run()

      expect(mockSetFailed).toHaveBeenCalledWith(
        'OpsTrails API returned non-JSON response (502): Bad Gateway',
      )
    })

    it('handles network error', async () => {
      setInputs({ 'api-key': 'ot_test', type: 'deployment' })
      mockFetch.mockRejectedValue(new Error('getaddrinfo ENOTFOUND api.opstrails.dev'))

      const { run } = await import('../main.js')
      await run()

      expect(mockSetFailed).toHaveBeenCalledWith('getaddrinfo ENOTFOUND api.opstrails.dev')
    })

    it('handles fetch timeout (AbortError)', async () => {
      setInputs({ 'api-key': 'ot_test', type: 'deployment' })
      const abortError = new Error('The operation was aborted')
      abortError.name = 'AbortError'
      mockFetch.mockRejectedValue(abortError)

      const { run } = await import('../main.js')
      await run()

      expect(mockSetFailed).toHaveBeenCalledWith('Request to OpsTrails API timed out after 30s')
    })

    it('handles non-Error thrown values', async () => {
      setInputs({ 'api-key': 'ot_test', type: 'deployment' })
      mockFetch.mockRejectedValue('string error')

      const { run } = await import('../main.js')
      await run()

      expect(mockSetFailed).toHaveBeenCalledWith('An unexpected error occurred')
    })
  })
})
