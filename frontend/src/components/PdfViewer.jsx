import { useEffect, useMemo, useRef, useState } from 'react'

import { pdfjs, Document, Page } from 'react-pdf'

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase()
}

function highlightText(text, snippet) {
    const cleanedText = normalizeText(text)
    const cleanedSnippet = normalizeText(snippet)

    if (!cleanedText || !cleanedSnippet) {
        return text
    }

    if (cleanedSnippet === cleanedText) {
        return `<mark class="pdf-highlight">${text}</mark>`
    }

    if (cleanedSnippet.includes(cleanedText) && cleanedText.length >= 4) {
        return `<mark class="pdf-highlight">${text}</mark>`
    }

    const snippetWords = cleanedSnippet.split(' ').filter(Boolean)
    const probe = snippetWords.slice(0, Math.min(8, snippetWords.length)).join(' ')
    if (probe.length >= 8 && cleanedText.includes(probe)) {
        return `<mark class="pdf-highlight">${text}</mark>`
    }

    return text
}

function getSelectedPage(selectedAction, page_number) {
    if (Number.isFinite(page_number) && page_number > 0) {
        return page_number
    }
    if (selectedAction && Number.isFinite(selectedAction.page_number)) {
        return selectedAction.page_number
    }
    return 1
}

export default function PdfViewer({ pdfPreviewUrl, selectedAction, page_number, source_snippet }) {
    const [numPages, setNumPages] = useState(0)
    const [currentPage, setCurrentPage] = useState(1)
    const [zoom, setZoom] = useState(1)
    const [containerWidth, setContainerWidth] = useState(720)
    const containerRef = useRef(null)
    const pageRefs = useRef(new Map())

    const selectedPage = getSelectedPage(selectedAction, page_number)
    const activeSnippet = source_snippet || selectedAction?.source_snippet || ''

    useEffect(() => {
        if (selectedPage) {
            setCurrentPage(selectedPage)
        }
    }, [selectedPage])

    useEffect(() => {
        const element = containerRef.current
        if (!element) {
            return undefined
        }

        function updateWidth() {
            setContainerWidth(Math.max(element.clientWidth - 48, 480))
        }

        updateWidth()

        const observer = new ResizeObserver(updateWidth)
        observer.observe(element)

        return () => observer.disconnect()
    }, [])

    useEffect(() => {
        const pageElement = pageRefs.current.get(currentPage)
        if (!pageElement) {
            return
        }

        pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' })

        const timer = setTimeout(() => {
            const mark = pageElement.querySelector('mark.pdf-highlight')
            if (mark) {
                mark.classList.remove('pdf-highlight-pulse')
                void mark.offsetWidth
                mark.classList.add('pdf-highlight-pulse')
                mark.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [currentPage, activeSnippet])

    const pageNumbers = useMemo(() => {
        return Array.from({ length: numPages }, (_, index) => index + 1)
    }, [numPages])

    function handleDocumentLoadSuccess(documentProxy) {
        setNumPages(documentProxy.numPages)
    }

    function scrollToPage(page) {
        setCurrentPage(page)
    }

    const pageWidth = Math.round(containerWidth * zoom)

    return (
        <section className="sticky top-6 flex h-[calc(100vh-100px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <style>{`\n                .pdf-highlight { background: #fde68a; color: #111827; border-radius: 0.15rem; padding: 0 0.1rem; box-shadow: 0 0 0 1px rgba(217,119,6,0.18); }\n                .pdf-highlight-pulse { animation: pdfPulse 1.2s ease-in-out 0s 2; }\n                @keyframes pdfPulse { 0%, 100% { background: #fde68a; } 50% { background: #fcd34d; } }\n            `}</style>
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Source Document</p>
                        <h2 className="text-lg font-semibold text-slate-900">Click an action to jump to the exact page</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setZoom((value) => Math.max(0.75, Number((value - 0.1).toFixed(2))))}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                            Zoom -
                        </button>
                        <span className="text-xs font-semibold text-slate-500">{Math.round(zoom * 100)}%</span>
                        <button
                            type="button"
                            onClick={() => setZoom((value) => Math.min(1.5, Number((value + 0.1).toFixed(2))))}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                            Zoom +
                        </button>
                    </div>
                </div>

                {numPages > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {pageNumbers.map((page) => (
                            <button
                                key={page}
                                type="button"
                                onClick={() => scrollToPage(page)}
                                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${page === currentPage ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'}`}
                            >
                                Page {page}
                            </button>
                        ))}
                    </div>
                ) : null}

                <div className="mt-3 flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>Current page: {currentPage || 1}</span>
                    <span>{activeSnippet ? 'Highlighted source available' : 'No action selected'}</span>
                </div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-100/80 p-4" ref={containerRef}>
                {pdfPreviewUrl ? (
                    <Document
                        file={pdfPreviewUrl}
                        onLoadSuccess={handleDocumentLoadSuccess}
                        className="space-y-5"
                        loading={
                            <div className="grid min-h-[60vh] place-items-center rounded-2xl border border-dashed border-slate-300 bg-white text-sm font-medium text-slate-500">
                                Loading document...
                            </div>
                        }
                    >
                        {pageNumbers.map((page) => (
                            <div
                                key={page}
                                ref={(node) => {
                                    if (node) {
                                        pageRefs.current.set(page, node)
                                    } else {
                                        pageRefs.current.delete(page)
                                    }
                                }}
                                className={`rounded-2xl border bg-white p-3 shadow-sm ${page === currentPage ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200'}`}
                            >
                                <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    <span>Page {page}</span>
                                    {selectedPage === page ? <span className="text-blue-700">Active</span> : null}
                                </div>
                                <Page
                                    pageNumber={page}
                                    width={pageWidth}
                                    renderTextLayer={true}
                                    renderAnnotationLayer={true}
                                    className="mx-auto"
                                    customTextRenderer={({ str }) => highlightText(str, activeSnippet)}
                                    onRenderSuccess={() => {
                                        if (selectedPage === page) {
                                            setCurrentPage(page)
                                        }
                                    }}
                                />
                            </div>
                        ))}
                    </Document>
                ) : (
                    <div className="grid h-full place-items-center rounded-2xl border border-dashed border-slate-300 bg-white text-center text-sm text-slate-500">
                        <div className="space-y-2">
                            <p className="text-3xl">📄</p>
                            <p>Select an action to view the source document.</p>
                        </div>
                    </div>
                )}
            </div>
        </section>
    )
}