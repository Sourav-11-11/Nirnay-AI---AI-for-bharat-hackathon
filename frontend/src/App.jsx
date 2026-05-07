import { useEffect, useState } from 'react'

import { extractByDocument, getActions, uploadPdf, verifyItem } from './api/client'
import StepProgress from './components/StepProgress'
import { mockDocument, mockExtractedItems } from './mock/mockData'
import DashboardScreen from './pages/DashboardScreen'
import ExtractionScreen from './pages/ExtractionScreen'
import UploadScreen from './pages/UploadScreen'

function cloneMockItems() {
  return mockExtractedItems.map((item) => ({ ...item }))
}

function App() {
  const [step, setStep] = useState('upload')
  const [uploadedFile, setUploadedFile] = useState(null)
  const [uploadedFileName, setUploadedFileName] = useState('')
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState('')
  const [documentId, setDocumentId] = useState('')
  const [actions, setActions] = useState([])
  const [selectedActionId, setSelectedActionId] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [verifyingCount, setVerifyingCount] = useState(0)
  const [isFallback, setIsFallback] = useState(false)
  const [note, setNote] = useState('')
  const isVerifying = verifyingCount > 0

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl)
      }
    }
  }, [pdfPreviewUrl])

  const isBackendRun = Boolean(documentId) && !documentId.startsWith('mock-')

  function handleFilePicked(file) {
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl)
    }

    setUploadedFile(file)
    setUploadedFileName(file?.name ?? '')
    setPdfPreviewUrl(file ? URL.createObjectURL(file) : '')
    setNote('')
  }

  function moveToFallback(message) {
    const mockItems = cloneMockItems()
    setDocumentId(mockDocument.document_id)
    setActions(mockItems)
    setSelectedActionId(mockItems[0]?.item_id ?? '')
    setIsFallback(true)
    setStep('extraction')
    setNote(message)
  }

  async function handleStart() {
    if (!uploadedFile) {
      setNote('Please select a PDF before starting extraction.')
      return
    }

    setIsBusy(true)
    setNote('')

    try {
      const uploadResponse = await uploadPdf(uploadedFile)
      const extractionResponse = await extractByDocument(uploadResponse.document_id)
      const extractedItems = extractionResponse.items ?? []
      const fallbackUsed = extractionResponse.fallback === true

      if (extractedItems.length === 0) {
        moveToFallback('No extracted items returned by API. Showing fallback demo data.')
        return
      }

      setDocumentId(uploadResponse.document_id)
      setActions(extractedItems)
      setSelectedActionId(extractedItems[0].item_id)
      setIsFallback(fallbackUsed)
      setStep('extraction')

      if (fallbackUsed) {
        setNote('Backend responded with fallback extraction data (demo-safe mode).')
      } else {
        setNote('Live extraction completed successfully.')
      }
    } catch (error) {
      if (error?.status === 400) {
        const detail = String(error.message || '')
        const loweredDetail = detail.toLowerCase()
        if (loweredDetail.includes('file too large')) {
          setStep('upload')
          setNote('File too large for demo. Please upload a file under 10 MB.')
          return
        }

        if (loweredDetail.includes('empty') || loweredDetail.includes('invalid pdf')) {
          moveToFallback('Unable to process this PDF safely. Showing demo-safe fallback actions.')
          return
        }

        setStep('upload')
        setNote('Invalid PDF. Please upload a valid file.')
        return
      }

      if (error?.code === 'TIMEOUT') {
        moveToFallback('Network slow, showing fallback demo data')
        return
      }

      if (error?.code === 'NETWORK') {
        moveToFallback('Network issue, using demo data')
        return
      }

      if (typeof error?.status === 'number' && error.status >= 500) {
        moveToFallback('Extraction failed, showing fallback demo data')
        return
      }

      setStep('upload')
      setNote(error?.message || 'Extraction failed. Please try again.')
    } finally {
      setIsBusy(false)
    }
  }

  async function handleApprove(itemId) {
    setActions((current) =>
      current.map((item) =>
        item.item_id === itemId
          ? {
            ...item,
            status: 'approved',
          }
          : item,
      ),
    )

    if (!isBackendRun) {
      return
    }

    setVerifyingCount((count) => count + 1)
    try {
      await verifyItem(itemId, { status: 'approved' })
      if (documentId) {
        const refreshed = await getActions(documentId)
        if (Array.isArray(refreshed.actions) && refreshed.actions.length > 0) {
          setActions(refreshed.actions)
        }
      }
    } catch {
      setNote('Saved locally. Backend verification update failed for one item.')
    } finally {
      setVerifyingCount((count) => Math.max(0, count - 1))
    }
  }

  async function handleSaveEdit(itemId, draft) {
    setActions((current) =>
      current.map((item) =>
        item.item_id === itemId
          ? {
            ...item,
            direction: draft.direction,
            department: draft.department,
            deadline: draft.deadline,
            status: 'edited',
          }
          : item,
      ),
    )

    if (!isBackendRun) {
      return
    }

    setVerifyingCount((count) => count + 1)
    try {
      await verifyItem(itemId, {
        direction: draft.direction,
        department: draft.department,
        deadline: draft.deadline,
        status: 'edited',
      })
      if (documentId) {
        const refreshed = await getActions(documentId)
        if (Array.isArray(refreshed.actions) && refreshed.actions.length > 0) {
          setActions(refreshed.actions)
        }
      }
    } catch {
      setNote('Saved locally. Backend verification update failed for one item.')
    } finally {
      setVerifyingCount((count) => Math.max(0, count - 1))
    }
  }

  async function handleContinueToDashboard() {
    if (isVerifying) {
      setNote('Please wait for verification updates to finish.')
      return
    }

    if (isBackendRun) {
      try {
        const actionsResponse = await getActions(documentId)
        if (Array.isArray(actionsResponse.actions)) {
          if (actionsResponse.actions.length === 0) {
            setNote('No extracted actions yet. Please run extraction first.')
            return
          }
          setActions(actionsResponse.actions)
        }
      } catch {
        setNote('Showing local verification state because actions API is unavailable.')
      }
    }

    setStep('dashboard')
  }

  function handleRestart() {
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl)
    }

    setStep('upload')
    setUploadedFile(null)
    setUploadedFileName('')
    setPdfPreviewUrl('')
    setDocumentId('')
    setActions([])
    setSelectedActionId('')
    setIsFallback(false)
    setNote('')
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Hackathon Demo</p>
          <h1 className="mt-1 text-3xl font-extrabold text-slate-900 sm:text-4xl">Nirnay AI</h1>
          <p className="mt-2 text-base text-slate-600">
            Convert court judgments into verifiable action items in under 2 minutes.
          </p>
        </header>

        <StepProgress currentStep={step} />

        {step === 'upload' ? (
          <UploadScreen
            uploadedFileName={uploadedFileName}
            onFilePicked={handleFilePicked}
            onStart={handleStart}
            isBusy={isBusy}
            note={note}
          />
        ) : null}

        {step === 'extraction' ? (
          <ExtractionScreen
            actions={actions}
            selectedActionId={selectedActionId}
            onSelectAction={setSelectedActionId}
            onApprove={handleApprove}
            onSaveEdit={handleSaveEdit}
            onContinue={handleContinueToDashboard}
            pdfPreviewUrl={pdfPreviewUrl}
            note={note}
            isBusy={isBusy}
            isVerifying={isVerifying}
            isFallback={isFallback}
          />
        ) : null}

        {step === 'dashboard' ? (
          <DashboardScreen
            actions={actions}
            documentId={documentId}
            onBack={() => setStep('extraction')}
            onRestart={handleRestart}
            isFallback={isFallback}
          />
        ) : null}
      </div>
    </main>
  )
}

export default App
