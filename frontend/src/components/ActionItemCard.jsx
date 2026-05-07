import { useState } from 'react'

function getActionLabel(actionType) {
    if (actionType === 'CONSIDER_APPEAL') return 'Legal Review Recommended';
    if (actionType === 'COMPLY') return 'Immediate Compliance Required';
    return 'Monitoring Recommended';
}

function getPriorityTone(priority) {
    if (priority === 'HIGH') return 'bg-red-50 text-red-700 ring-red-200';
    if (priority === 'MEDIUM') return 'bg-amber-50 text-amber-700 ring-amber-200';
    return 'bg-slate-50 text-slate-700 ring-slate-200';
}

function getLeftStripColor(priority) {
    if (priority === 'HIGH') return 'border-l-red-500';
    if (priority === 'MEDIUM') return 'border-l-amber-500';
    return 'border-l-slate-400';
}

function getDepartmentLabel(department) {
    const value = String(department || '').trim();

    if (!value || value.toLowerCase().includes('needs assignment')) {
        return 'Needs Assignment';
    }

    return value;
}

function formatDeadline(action) {
    if (Number.isFinite(action.days_remaining)) {
        if (action.days_remaining < 0) {
            return `${Math.abs(action.days_remaining)}d overdue`;
        }

        if (action.days_remaining === 0) {
            return 'Due today';
        }

        return `${action.days_remaining}d remaining`;
    }

    return action.deadline || 'Not time-bound';
}

export default function ActionItemCard({
    item,
    isSelected,
    onSelect,
    onApprove,
    disabled
}) {
    const [isExpanded, setIsExpanded] = useState(false);

    const isApproved = item.status === 'approved';

    const departmentLabel = getDepartmentLabel(item.department);

    return (
        <article
            onClick={() => onSelect(item.item_id)}
            className={`cursor-pointer rounded-2xl bg-white p-5 shadow-sm ring-1 transition-all duration-200 border-l-[6px]
            ${getLeftStripColor(item.priority)}
            ${isSelected
                    ? 'ring-slate-300 shadow-md -translate-y-0.5'
                    : 'ring-slate-200 hover:shadow-md'}
            ${isApproved ? 'opacity-70' : 'opacity-100'}
            `}
        >
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex flex-wrap gap-2">

                    <span className="inline-flex items-center rounded-sm bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                        {getActionLabel(item.type)}
                    </span>

                    <span
                        className={`inline-flex items-center rounded-sm ring-1 ring-inset px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getPriorityTone(item.priority)}`}
                    >
                        {item.priority === 'HIGH'
                            ? 'HIGH PRIORITY'
                            : item.priority === 'MEDIUM'
                                ? 'MEDIUM PRIORITY'
                                : 'ROUTINE'}
                    </span>

                    {isApproved && (
                        <span className="inline-flex items-center rounded-sm ring-1 ring-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                            VERIFIED
                        </span>
                    )}
                </div>
            </div>

            <h3 className="text-xl font-semibold leading-snug text-slate-900 tracking-tight">
                {item.action || item.direction}
            </h3>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-medium text-slate-600">

                <span className="px-2 py-1 rounded bg-slate-50 border border-slate-100">
                    Dept: {departmentLabel}
                </span>

                <span className="px-2 py-1 rounded bg-slate-50 border border-slate-100">
                    Deadline: {formatDeadline(item)}
                </span>

            </div>

            <div className="mt-4 rounded-xl bg-blue-50 border border-blue-100 p-3 flex items-start gap-3">

                <div className="mt-0.5 text-blue-600 text-lg">
                    →
                </div>

                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-blue-800/70 mb-1">
                        Next Officer Step
                    </p>

                    <p className="text-sm font-medium leading-relaxed text-blue-900">
                        {item.next_step ||
                            'Awaiting assignment and processing by responsible officer.'}
                    </p>
                </div>
            </div>

            {isExpanded && (
                <div className="mt-5 border-t border-slate-100 pt-4 space-y-4">

                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Why Detected
                        </p>

                        <p className="rounded bg-slate-50 p-3 text-sm text-slate-700 leading-relaxed">
                            {item.reason || 'Derived from directive language and deadline cues.'}
                        </p>
                    </div>

                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Source Snippet
                        </p>

                        <p className="rounded border border-slate-200 bg-white px-3 py-2 leading-relaxed text-slate-800 italic border-l-4 border-l-slate-300">
                            "{item.source_snippet}"
                        </p>
                    </div>

                </div>
            )}

            <div className="mt-5 flex items-center gap-2">

                <button
                    type="button"
                    disabled={disabled}
                    onClick={(e) => {
                        e.stopPropagation();
                        onApprove(item.item_id);
                    }}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                >
                    Approve
                </button>

                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded((prev) => !prev);
                    }}
                    className="ml-auto text-xs font-medium text-slate-500 hover:text-slate-900"
                >
                    {isExpanded ? 'Hide Details' : 'View Details'}
                </button>

            </div>
        </article>
    );
}