function getDepartmentSet(actions) {
    const departments = new Set()
    actions.forEach((item) => {
        const value = String(item.department || '').trim()
        if (!value || value === 'Needs Assignment' || value.toLowerCase().includes('manual review')) {
            return
        }
        departments.add(value)
    })
    return Array.from(departments)
}

function getDeadlineDays(action) {
    if (Number.isFinite(action.days_remaining)) {
        return action.days_remaining
    }
    const deadline = String(action.deadline || '').toLowerCase()
    if (deadline.includes('immediately') || deadline.includes('forthwith')) {
        return 0
    }
    const match = deadline.match(/within\s+(\d+)\s+(day|days|week|weeks|month|months)/)
    if (!match) {
        return null
    }
    const amount = Number.parseInt(match[1], 10)
    const unit = match[2]
    if (unit.includes('week')) {
        return amount * 7
    }
    if (unit.includes('month')) {
        return amount * 30
    }
    return amount
}

function formatDepartmentList(departments) {
    if (departments.length === 0) {
        return 'Departments are still being assigned.'
    }
    if (departments.length === 1) {
        return departments[0]
    }
    if (departments.length === 2) {
        return `${departments[0]} and ${departments[1]}`
    }
    return `${departments.slice(0, 2).join(', ')} and ${departments.length - 2} more`
}

export function buildSystemInsightBullets(actions) {
    const complyCount = actions.filter((item) => item.type === 'COMPLY').length
    const appealCount = actions.filter((item) => item.type === 'CONSIDER_APPEAL').length
    const urgentCount = actions.filter((item) => item.priority === 'HIGH' || (getDeadlineDays(item) !== null && getDeadlineDays(item) <= 3)).length
    const needsAssignmentCount = actions.filter((item) => String(item.department || '').includes('Needs Assignment')).length
    const departments = getDepartmentSet(actions)
    const deadlineActions = actions.filter((item) => getDeadlineDays(item) !== null)
    const strictDeadlineCount = deadlineActions.filter((item) => {
        const days = getDeadlineDays(item)
        return days !== null && days <= 30
    }).length

    const bullets = []

    if (urgentCount > 0 && complyCount > 0) {
        bullets.push('Judgment requires immediate compliance attention.')
    } else if (appealCount > 0 && complyCount > 0) {
        bullets.push('Judgment mixes compliance and possible appeal follow-up.')
    } else if (complyCount > 0) {
        bullets.push('Judgment is primarily compliance driven.')
    } else if (appealCount > 0) {
        bullets.push('Judgment signals appellate review considerations.')
    }

    if (departments.length > 0) {
        bullets.push(`Primary departments impacted: ${formatDepartmentList(departments)}.`)
    }

    if (strictDeadlineCount === 0) {
        bullets.push('No strict deadlines detected - monitoring required.')
    } else if (urgentCount > 0) {
        bullets.push('At least one action needs immediate human review.')
    }

    if (needsAssignmentCount > 0) {
        bullets.push(`${needsAssignmentCount} action${needsAssignmentCount === 1 ? '' : 's'} still need department assignment.`)
    }

    return bullets.slice(0, 3)
}

export default function SystemInsight({ actions, title = 'System Insight', compact = false }) {
    const bullets = buildSystemInsightBullets(actions)

    if (bullets.length === 0) {
        return null
    }

    return (
        <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${compact ? 'p-4' : 'p-5'}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
            <ul className="mt-3 space-y-2">
                {bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2 text-sm leading-6 text-slate-700">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-400" />
                        <span>{bullet}</span>
                    </li>
                ))}
            </ul>
        </div>
    )
}