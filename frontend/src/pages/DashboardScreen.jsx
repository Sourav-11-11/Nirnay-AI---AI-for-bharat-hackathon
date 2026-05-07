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
        <div className="flex h-screen w-full flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden">
            <header className="flex-none h-14 bg-slate-900 text-white flex items-center justify-between px-6 border-b border-slate-800 shadow-sm z-20">
                <div className="flex items-center gap-4">
                    <div className="font-bold tracking-widest text-sm text-slate-200">NIRNAY AI</div>
                    <div className="h-4 w-px bg-slate-700"></div>
                    <div className="text-sm font-medium tracking-wide">FINALIZE</div>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium">
                    <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> System Online</span>
                    <button
                        onClick={onReset}
                        className="bg-slate-800 px-3 py-1.5 rounded text-slate-200 hover:bg-slate-700 transition text-xs font-semibold"
                    >
                        New Case
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto max-w-5xl mx-auto w-full px-4 py-6">

                <div className="grid md:grid-cols-2 gap-4 mb-8">

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