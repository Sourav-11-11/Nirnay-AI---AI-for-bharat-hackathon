export default function UploadScreen({
    uploadedFileName,
    onFilePicked,
    onStart,
    isBusy,
    note,
}) {
    return (
        <section className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">Upload Judgment PDF</h2>
            <p className="mt-2 text-base text-slate-600">
                Step 1 for Nirnay AI demo: upload one court judgment and extract action items.
            </p>

            <div className="mt-6 space-y-4">
                <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Choose PDF file</span>
                    <input
                        type="file"
                        accept="application/pdf"
                        onChange={(event) => onFilePicked(event.target.files?.[0] ?? null)}
                        className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-blue-100 file:px-3 file:py-2 file:font-semibold file:text-blue-800 hover:file:bg-blue-200"
                    />
                </label>

                {uploadedFileName ? (
                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        Selected file: <span className="font-semibold">{uploadedFileName}</span>
                    </p>
                ) : null}

                <button
                    type="button"
                    onClick={onStart}
                    disabled={!uploadedFileName || isBusy}
                    className="w-full rounded-lg bg-blue-700 px-4 py-3 text-base font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                    {isBusy ? 'Processing PDF...' : 'Upload and Extract Actions'}
                </button>

                {note ? (
                    <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        {note}
                    </p>
                ) : null}
            </div>
        </section>
    )
}
