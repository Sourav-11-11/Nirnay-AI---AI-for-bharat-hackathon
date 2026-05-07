import ActionItemCard from '../components/ActionItemCard';
import PdfViewer from '../components/PdfViewer';

function getDeadlineDays(action) {
    if (Number.isFinite(action.days_remaining)) return action.days_remaining;
    const deadline = String(action.deadline || '').toLowerCase();
    if (deadline.includes('immediate') || deadline.includes('forthwith')) return 0;
    const match = deadline.match(/within\s+(\d+)\s+(day|days|week|weeks|month|months)/);
    if (!match) return null;
    const amount = Number.parseInt(match[1], 10);
    const unit = match[2];
    if (unit.includes('week')) return amount * 7;
    if (unit.includes('month')) return amount * 30;
    return amount;
}

function getDepartmentLabel(department) {
    const value = String(department || '').trim();
    if (!value || value.toLowerCase().includes('needs assignment') || value.toLowerCase().includes('board')) {
        return 'Needs Assignment';
    }
    return value;
}

function sortByUrgency(actions) {
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return [...actions].sort((a, b) => {
        const aUrgent = a.urgent_now === true || (Number.isFinite(a.days_remaining) && a.days_remaining <= 3);
        const bUrgent = b.urgent_now === true || (Number.isFinite(b.days_remaining) && b.days_remaining <= 3);
        if (aUrgent !== bUrgent) return aUrgent ? -1 : 1;
        const aPriority = priorityOrder[a.priority] ?? 3;
        const bPriority = priorityOrder[b.priority] ?? 3;
        if (aPriority !== bPriority) return aPriority - bPriority;
        const aDays = getDeadlineDays(a);
        const bDays = getDeadlineDays(b);
        return (Number.isFinite(aDays) ? aDays : 999) - (Number.isFinite(bDays) ? bDays : 999);
    });
}

export default function ExtractionScreen({ actions, selectedActionId, onSelectAction, onApprove, onSaveEdit, onContinue, pdfPreviewUrl, note, isBusy, isVerifying, isFallback }) {
    const selectedAction = actions.find((item) => item.item_id === selectedActionId) ?? null;
    const totalActions = actions.length;
    const approvedCount = actions.filter((item) => item.status === 'approved').length;
    const unapprovedCount = totalActions - approvedCount;
    const allApproved = unapprovedCount === 0 && totalActions > 0;
    const urgentActions = actions.filter((item) => item.priority === 'HIGH' || (Number.isFinite(item.days_remaining) && item.days_remaining <= 3));
    const needsAssignmentCount = actions.filter((item) => getDepartmentLabel(item.department) === 'Needs Assignment').length;
    const departments = new Set(actions.map((item) => getDepartmentLabel(item.department)).filter((value) => value !== 'Needs Assignment'));

    const deadlineDays = actions.map(getDeadlineDays).filter(v => Number.isFinite(v)).sort((a, b) => a - b);
    const earliestDeadline = deadlineDays.length > 0 ? deadlineDays[0] : null;
    const topAttentionActions = sortByUrgency(actions).filter(a => a.priority === 'HIGH' || a.urgent_now || (Number.isFinite(a.days_remaining) && a.days_remaining <= 3));
    const regularActions = sortByUrgency(actions).filter(a => !topAttentionActions.includes(a));

    return (
        <div className="flex h-screen w-full flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden">
            {/* TOP NAVBAR (sticky) */}
            <header className="flex-none h-14 bg-slate-900 text-white flex items-center justify-between px-6 border-b border-slate-800 shadow-sm z-20">
                <div className="flex items-center gap-4">
                    <div className="font-bold tracking-widest text-sm text-slate-200">NIRNAY AI</div>
                    <div className="h-4 w-px bg-slate-700"></div>
                    <div className="text-sm font-medium tracking-wide">CASE: WP(C) 12345/2026</div>
                </div>
                <div className="flex items-center gap-8 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <span className="text-slate-600 line-through">Upload</span>
                    <span className="text-slate-600 line-through">Extract</span>
                    <span className="text-emerald-400 border-b-2 border-emerald-400 pb-1">Review</span>
                    <span>Finalize</span>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium">
                    <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> System Online</span>
                    <span className="bg-slate-800 px-2.5 py-1 rounded text-slate-300">Officer 48A</span>
                </div>
            </header>

            {/* MAIN WORKSPACE: 65/35 Split */}
            <div className="flex-1 flex overflow-hidden">

                {/* LEFT SIDE (65%) */}
                <div className="flex-[6.5] bg-slate-50/50 overflow-y-auto px-10 py-8 relative">
                    <div className="max-w-4xl mx-auto space-y-10 pb-32">

                        {/* CASE COMMAND CENTER */}
                        <div>
                            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-4">Case Command Center</h2>
                            <div className="grid grid-cols-5 gap-3">
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Actions</span>
                                    <span className="text-2xl font-bold text-slate-800 mt-2">{totalActions}</span>
                                </div>
                                <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 shadow-sm flex flex-col justify-between">
                                    <span className="text-[10px] uppercase font-bold text-red-600 tracking-wider">Urgent</span>
                                    <span className="text-2xl font-bold text-red-700 mt-2">{urgentActions.length}</span>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                                    <span className="text-[10px] uppercase font-bold text-slate-500 transition-wider">Departments</span>
                                    <span className="text-2xl font-bold text-slate-800 mt-2">{departments.size}</span>
                                </div>
                                <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 shadow-sm flex flex-col justify-between">
                                    <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">Needs Assign</span>
                                    <span className="text-2xl font-bold text-amber-800 mt-2">{needsAssignmentCount}</span>
                                </div>
                                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 shadow-sm flex flex-col justify-between">
                                    <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Nearest Due</span>
                                    <span className="text-2xl font-bold text-emerald-800 mt-2">{earliestDeadline === null ? 'N/A' : `${earliestDeadline}d`}</span>
                                </div>
                            </div>
                        </div>

                        {/* WHAT REQUIRES ACTION NOW */}
                        {topAttentionActions.length > 0 && (
                            <div>
                                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-600 mb-4 pb-2 border-b border-red-200/50">Requires Immediate Attention</h2>
                                <div className="space-y-4">
                                    {topAttentionActions.map(item => (
                                        <ActionItemCard key={item.item_id} item={item} isSelected={selectedActionId === item.item_id} onSelect={onSelectAction} onApprove={onApprove} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ALL ACTIONS */}
                        {regularActions.length > 0 && (
                            <div>
                                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-4 pb-2 border-b border-slate-200">Standard Queue</h2>
                                <div className="space-y-4">
                                    {regularActions.map(item => (
                                        <ActionItemCard key={item.item_id} item={item} isSelected={selectedActionId === item.item_id} onSelect={onSelectAction} onApprove={onApprove} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT SIDE (35%) - Live PDF verification panel */}
                <div className="flex-[3.5] bg-slate-200 border-l border-slate-300 relative shadow-[-10px_0_20px_-10px_rgba(0,0,0,0.05)] flex flex-col overflow-hidden">
                    <div className="h-10 bg-slate-100 border-b border-slate-300 flex items-center justify-between px-4 flex-none shadow-sm z-10">
                        <span className="text-|l font-bold uppercase tracking-wider text-slate-600">Verification Source</span>
                        <span className="text-[10px] font-semibold text-slate-400">PDF.js Render Engine</span>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <PdfViewer pdfPreviewUrl={pdfPreviewUrl} selectedAction={selectedAction} source_snippet={selectedAction?.source_snippet} page_number={selectedAction?.page_number} />
                    </div>
                </div>
            </div>

            {/* BOTTOM STICKY APPROVAL BAR */}
            <div className="fixed bottom-0 left-0 w-[65%] bg-white/90 backdrop-blur-xl border-t border-slate-200 p-4 flex items-center justify-between shadow-2xl z-30 transform transition-transform">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                    <span className="text-sm font-semibold text-slate-800">
                        {unapprovedCount} actions pending review
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                        ({approvedCount}/{totalActions} verified)
                    </span>
                </div>
                <div className="max-w-full">
                    <button
                        disabled={!allApproved}
                        onClick={onContinue}
                        className={`px-6 py-2.5 rounded text-sm font-bold tracking-wide uppercase transition-all shadow-sm ${allApproved ? 'bg-slate-900 text-white hover:bg-slate-800 ring-4 ring-slate-200' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                    >
                        Approve All &amp; Continue
                    </button>
                </div>
            </div>
        </div>
    );
}
