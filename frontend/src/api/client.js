const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
const REQUEST_TIMEOUT_MS = 12000

function makeRequestError(message, { status, code } = {}) {
    const error = new Error(message)
    if (typeof status === 'number') {
        error.status = status
    }
    if (code) {
        error.code = code
    }
    return error
}

async function request(path, options = {}) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
        const response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            signal: controller.signal,
        })

        if (!response.ok) {
            let detail = `Request failed with status ${response.status}`
            try {
                const errorPayload = await response.json()
                if (errorPayload?.detail) {
                    detail = String(errorPayload.detail)
                }
            } catch {
                // Keep default message when the body is not JSON.
            }
            throw makeRequestError(detail, { status: response.status, code: 'HTTP_ERROR' })
        }

        return response.json()
    } catch (error) {
        if (error?.name === 'AbortError') {
            throw makeRequestError('Network slow, showing fallback demo data', { code: 'TIMEOUT' })
        }

        if (typeof error?.status === 'number') {
            throw error
        }

        throw makeRequestError('Network issue, using demo data', { code: 'NETWORK' })
    } finally {
        clearTimeout(timeoutId)
    }
}

export async function uploadPdf(file) {
    const formData = new FormData()
    formData.append('file', file)

    return request('/api/upload', {
        method: 'POST',
        body: formData,
    })
}

export async function extractByDocument(documentId) {
    return request(`/api/extract/${documentId}`, {
        method: 'POST',
    })
}

export async function verifyItem(itemId, payload) {
    return request(`/api/verify/${itemId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    })
}

export async function getActions(documentId) {
    return request(`/api/actions/${documentId}`)
}
