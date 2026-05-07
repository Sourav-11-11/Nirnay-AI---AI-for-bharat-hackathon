import { useState } from 'react'

import StatusPill from './StatusPill'

function getTypeClasses(actionType) {
    if (actionType === 'CONSIDER_APPEAL') {
        return 'border-violet-200 bg-violet-100 text-violet-900'
    }
    if (actionType === 'COMPLY') {
        return 'border-blue-200 bg-blue-100 text-blue-900'
    }
    return 'border-slate-200 bg-slate-100 text-slate-700'
}

function getDepartmentLabel(department) {
    const value = String(department || '').trim()
    if (!value) {
        return 'Needs Assignment'
    }
    if (value.toLowerCase().includes('manual review required')) {
        return 'Needs Assignment'
    }
    return value
}

export default function DashboardTable({ actions }) {
    const [hoverItemId, setHoverItemId] = useState(null)
    const [hoverField, setHoverField] = useState(null)

    function truncate(text, maxChars = 40) {
        if (!text) return '-'
        return text.length > maxChars ? text.substring(0, maxChars) + '…' : text
    }

    return (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-700 border-b border-slate-200">
                    <tr>
                        <th className="px-3 py-2">Action</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">Dept</th>
                        <th className="px-3 py-2">Deadline</th>
                    </tr>
                </thead>
                <tbody>
                    {actions.map((item) => (
                        <tr
                            key={item.item_id}
                            onMouseEnter={() => setHoverItemId(item.item_id)}
                            onMouseLeave={() => {
                                setHoverItemId(null)
                                setHoverField(null)
                            }}
                            className={`border-t border-slate-100 transition ${item.priority === 'HIGH'
                                ? 'border-l-4 border-l-rose-500 bg-rose-50/40'
                                : ''
                                }`}
                        >
                            {/* Action column */}
                            <td className="px-3 py-3">
                                <div
                                    className="relative cursor-help"
                                    onMouseEnter={() => setHoverField('action')}
                                    onMouseLeave={() => setHoverField(null)}
                                >
                                    <p className="max-w-[20rem] font-semibold text-slate-900" title={item.action || item.direction}>{truncate(item.action || item.direction, 35)}</p>
                                    {hoverField === 'action' && hoverItemId === item.item_id && (
                                        <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border border-slate-300 bg-white p-3 text-xs shadow-lg">
                                            <p className="font-semibold text-slate-900">{item.action || item.direction}</p>
                                            <p className="mt-2 text-slate-700"><span className="font-semibold">Reason:</span> {item.reason}</p>
                                        </div>
                                    )}
                                </div>
                            </td>

                            {/* Type column */}
                            <td className="px-3 py-3">
                                <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-bold ${getTypeClasses(item.type)}`}>
                                    {item.type === 'CONSIDER_APPEAL' ? 'Appeal' : item.type === 'COMPLY' ? 'Comply' : 'Monitor'}
                                </span>
                            </td>

                            {/* Department column */}
                            <td className="px-3 py-3">
                                {getDepartmentLabel(item.department) === 'Needs Assignment' ? (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                                        ⚠️ Assign
                                    </span>
                                ) : (
                                    <span className="text-sm text-slate-800" title={getDepartmentLabel(item.department)}>{truncate(getDepartmentLabel(item.department), 25)}</span>
                                )}
                            </td>

                            {/* Deadline column */}
                            <td className="px-3 py-3">
                                <div
                                    className="relative cursor-help"
                                    onMouseEnter={() => setHoverField('deadline')}
                                    onMouseLeave={() => setHoverField(null)}
                                >
                                    <p className="font-semibold text-slate-900" title={item.deadline}>{truncate(item.deadline, 25)}</p>
                                    {Number.isFinite(item.days_remaining) && (
                                        <p className={`mt-0.5 text-xs ${item.days_remaining < 0 ? 'font-bold text-red-600' : item.days_remaining < 7 ? 'font-semibold text-rose-600' : 'text-slate-600'}`}>
                                            {item.days_remaining < 0
                                                ? `${Math.abs(item.days_remaining)}d overdue`
                                                : item.days_remaining === 0
                                                    ? 'Due today'
                                                    : `${item.days_remaining}d left`}
                                        </p>
                                    )}
                                    {hoverField === 'deadline' && hoverItemId === item.item_id && (
                                        <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-slate-300 bg-white p-3 text-xs shadow-lg">
                                            <p><span className="font-semibold">Deadline:</span> {item.deadline}</p>
                                            {item.exact_deadline_date && (
                                                <p className="mt-1"><span className="font-semibold">Due:</span> {new Date(item.exact_deadline_date).toLocaleDateString('en-IN')}</p>
                                            )}
                                            <p className="mt-2 text-slate-700"><span className="font-semibold">Next:</span> {item.next_step}</p>
                                        </div>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
