export default function StatusPill({ status }) {
    const isEdited = status === 'edited'

    return (
        <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${isEdited
                    ? 'border-orange-200 bg-orange-100 text-orange-800'
                    : 'border-emerald-200 bg-emerald-100 text-emerald-800'
                }`}
        >
            {isEdited ? 'Edited' : 'Approved'}
        </span>
    )
}
