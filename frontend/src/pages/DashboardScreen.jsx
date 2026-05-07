export default function DashboardScreen({ actions = [], onReset }) {

    const totalActions = actions.length
    const completedCount = actions.filter(
        a => a.status === 'approved'
    ).length

    const pendingCount = totalActions - completedCount

    const urgentCount = actions.filter(
        a => a.priority === 'HIGH'
    ).length

    const overdueCount = actions.filter(
        a => Number.isFinite(a.days_remaining) && a.days_remaining < 0
    ).length

    const unassignedCount = actions.filter(
        a => !a.department
    ).length

    const departmentsCount = new Set(
        actions.map(a => a.department).filter(Boolean)
    ).size

    const topCritical = [...actions]
        .sort((a, b) => {
            const aDays = Number.isFinite(a.days_remaining)
                ? a.days_remaining
                : 999

            const bDays = Number.isFinite(b.days_remaining)
                ? b.days_remaining
                : 999

            return aDays - bDays
        })
        .slice(0, 3)

    return (
        <div className="min-h-screen bg-slate-50 pb-20">

            <header className="bg-slate-900 px-8 py-5 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">
                        Executive Decision Briefing
                    </h1>

                    <p className="text-xs uppercase tracking-widest text-slate-400">
                        Collectorate Intelligence System
                    </p>
                </div>

                <div className="flex gap-3">
                    <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded text-xs">
                        STATUS: OPERATIONAL
                    </span>

                    <button
                        onClick={onReset}
                        className="bg-white px-4 py-1 rounded text-sm font-semibold"
                    >
                        Load New Case
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-8 py-8">

                <h2 className="text-4xl font-bold mb-8">
                    What should be done immediately?
                </h2>

                <div className="grid md:grid-cols-2 gap-6 mb-12">

                    {topCritical.map(action => (
                        <div
                            key={action.item_id}
                            className="bg-white border border-slate-200 border-l-[6px] border-l-red-500 rounded-xl p-6 shadow-sm"
                        >
                            <div className="flex items-center gap-3 mb-4">

                                <span className="bg-red-50 text-red-700 text-xs font-bold px-2 py-1 rounded">
                                    CRITICAL
                                </span>

                                <span className="text-sm text-slate-500">
                                    {Number.isFinite(action.days_remaining)
                                        ? `${action.days_remaining}d left`
                                        : 'Unknown'}
                                </span>
                            </div>

                            <h3 className="text-xl font-bold text-slate-900 mb-2">
                                {action.action}
                            </h3>

                            <p className="text-slate-500 mb-4">
                                {action.department}
                            </p>

                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                                <p className="text-xs font-bold text-blue-700 mb-2 uppercase">
                                    Recommended Action
                                </p>

                                <p className="text-sm text-blue-900">
                                    {action.next_step}
                                </p>
                            </div>
                        </div>
                    ))}

                </div>

                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">
                    System Insights
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">

                    <MetricCard title="Urgent" value={urgentCount} />
                    <MetricCard title="Overdue" value={overdueCount} />
                    <MetricCard title="Pending" value={pendingCount} />
                    <MetricCard title="Departments" value={departmentsCount} />
                    <MetricCard title="Unassigned" value={unassignedCount} />

                </div>

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">

                    <div className="px-6 py-4 border-b border-slate-200">
                        <h3 className="text-lg font-bold">
                            Action Queue
                        </h3>
                    </div>

                    <table className="w-full text-sm">

                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs">

                            <tr>
                                <th className="text-left px-6 py-4">Action</th>
                                <th className="text-left px-6 py-4">Department</th>
                                <th className="text-left px-6 py-4">Priority</th>
                                <th className="text-left px-6 py-4">Deadline</th>
                                <th className="text-left px-6 py-4">Status</th>
                            </tr>

                        </thead>

                        <tbody>

                            {actions.map(action => (
                                <tr
                                    key={action.item_id}
                                    className="border-t border-slate-100"
                                >
                                    <td className="px-6 py-5">
                                        <div className="font-semibold">
                                            {action.action}
                                        </div>

                                        <div className="text-slate-500 text-xs mt-1">
                                            {action.next_step}
                                        </div>
                                    </td>

                                    <td className="px-6 py-5">
                                        {action.department}
                                    </td>

                                    <td className="px-6 py-5">
                                        <span className="bg-amber-50 text-amber-700 text-xs font-bold px-2 py-1 rounded">
                                            {action.priority}
                                        </span>
                                    </td>

                                    <td className="px-6 py-5">
                                        {action.deadline}
                                    </td>

                                    <td className="px-6 py-5">
                                        <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-1 rounded">
                                            {action.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}

                        </tbody>

                    </table>

                </div>

            </main>
        </div>
    )
}

function MetricCard({ title, value }) {
    return (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                {title}
            </p>

            <p className="text-3xl font-bold text-slate-900">
                {value}
            </p>
        </div>
    )
}