import { useState } from 'react'

function getClasses(confidence) {
    if (confidence >= 0.85) {
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    }
    if (confidence >= 0.60) {
        return 'bg-amber-50 text-amber-700 border-amber-200'
    }
    return 'bg-slate-50 text-slate-600 border-slate-200'
}

function getLabel(confidence) {
    if (confidence >= 0.85) {
        return '✓ High confidence'
    }
    if (confidence >= 0.60) {
        return 'Moderate confidence'
    }
    return 'Low confidence'
}

export default function ConfidenceBadge({ confidence, explanation }) {
    const [showExplanation, setShowExplanation] = useState(false)
    const label = getLabel(confidence)

    return (
        <div className="relative inline-block">
            <button
                type="button"
                onMouseEnter={() => setShowExplanation(true)}
                onMouseLeave={() => setShowExplanation(false)}
                onClick={() => setShowExplanation(!showExplanation)}
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium cursor-help transition ${getClasses(confidence)} hover:shadow-sm`}
            >
                {label}
            </button>
            {showExplanation && explanation && (
                <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-md border border-slate-200 bg-slate-800 px-3 py-2 text-xs text-slate-100 shadow-xl shadow-slate-900/20">
                    <p>{explanation}</p>
                </div>
            )}
        </div>
    )
}
