const STEPS = [
    { key: 'upload', label: '1. Upload' },
    { key: 'extraction', label: '2. Review & Verify' },
    { key: 'dashboard', label: '3. Dashboard' },
]

export default function StepProgress({ currentStep }) {
    const activeIndex = STEPS.findIndex((step) => step.key === currentStep)
    const currentLabel = activeIndex >= 0 ? STEPS[activeIndex].label : '1. Upload'

    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Workflow</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{currentLabel}</p>
                </div>
                <p className="text-xs text-slate-500">Upload → Review → Dashboard</p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {STEPS.map((step, index) => {
                    const isDone = index < activeIndex
                    const isActive = index === activeIndex

                    return (
                        <div
                            key={step.key}
                            className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm font-semibold ${isActive
                                ? 'border-blue-200 bg-blue-50 text-blue-800 shadow-sm'
                                : isDone
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                    : 'border-slate-200 bg-slate-50 text-slate-500'
                                }`}
                        >
                            <span
                                className={`grid h-8 w-8 place-items-center rounded-full text-xs ${isActive
                                    ? 'bg-blue-700 text-white'
                                    : isDone
                                        ? 'bg-emerald-700 text-white'
                                        : 'bg-slate-300 text-slate-700'
                                    }`}
                            >
                                {index + 1}
                            </span>
                            <span className="leading-tight">{step.label}</span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
