import Skeleton from 'react-loading-skeleton';
import { useRef } from "react";
import { ArrowLeft, ArrowUpRight, Truck } from "lucide-react";

const CensusStatusPanel = ({
    filters, totalPigs, operationalTakeaway, secondaryTakeaway, comparisonStats,
    survey = [], transportVolume = [], isMapDataUpdating = false,
    surveyLoading = false, surveyPlaceholder = false, surveyError = false,
    comparisonLoading = false, comparisonPlaceholder = false, comparisonError = false,
    transportLoading = false, transportError = false,
}) => {
    const { isCompareMode, selectedYear, baselineYear, selectedBarangay, setSelectedBarangay } = filters;
    const headingRef = useRef(null);
    const selectedRecord = selectedBarangay
        ? survey.find(row => row.barangay.toLowerCase() === selectedBarangay.toLowerCase()) : null;
    const transportRecord = selectedBarangay
        ? transportVolume.find(row => row.barangay.toLowerCase() === selectedBarangay.toLowerCase()) : null;
    const censusUpdating = surveyLoading || surveyPlaceholder || isMapDataUpdating
        || (isCompareMode && (comparisonLoading || comparisonPlaceholder));
    const hasObservations = selectedBarangay
        ? Boolean(selectedRecord?.has_observations) : survey.some(row => row.has_observations);
    const periodRecord = selectedRecord || survey[0];
    const coverage = survey[0]?.coverage;
    const pigs = selectedBarangay ? Number(selectedRecord?.total_pigs ?? 0) : totalPigs;
    const share = totalPigs > 0 ? (pigs / totalPigs * 100).toFixed(1) : null;
    const censusReady = !censusUpdating && !surveyError;
    const censusDate = periodRecord?.census_date
        ? new Date(`${periodRecord.census_date}T00:00:00`).toLocaleDateString('en-PH', {
            month: 'short', day: 'numeric', year: 'numeric',
        }) : null;

    return (
        <section aria-label={selectedBarangay ? `${selectedBarangay} census` : 'Sariaya census'}
            className="min-w-0 rounded-xl border border-stone-200 bg-white p-4 font-sans text-sm text-stone-800 shadow-xs sm:p-5">
            {selectedBarangay && (
                <button type="button" onClick={() => {
                    setSelectedBarangay(null);
                    headingRef.current?.focus();
                }} className="mb-4 flex min-h-10 w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-green-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700">
                    <ArrowLeft size={16} aria-hidden="true" className="shrink-0" />
                    Back to Sariaya overview
                </button>
            )}

            <header className="space-y-2 border-b border-stone-200 pb-4">
                <p className="text-xs font-medium text-green-700">{selectedBarangay ? 'Barangay census' : 'Municipal census'}</p>
                <h2 ref={headingRef} tabIndex={-1}
                    className="rounded-md text-lg font-bold leading-snug tracking-tight wrap-break-word focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700">
                    {selectedBarangay || 'Sariaya census'}
                </h2>
                <p className="text-xs leading-relaxed text-stone-600">
                    {censusReady && periodRecord?.quarter
                        ? `Q${periodRecord.quarter} ${periodRecord.year || selectedYear}${censusDate ? ` · Census dated ${censusDate}` : ''}`
                        : `Selected year: ${selectedYear}`}
                </p>
            </header>

            <div aria-busy={censusUpdating} className="space-y-5 py-5">
                <p role="status" className={censusUpdating ? 'text-xs text-stone-600' : 'sr-only'}>
                    {censusUpdating ? (surveyLoading ? 'Loading census…' : 'Updating census…') : ''}
                </p>
                {censusUpdating ? (
                    <div aria-hidden="true" className="space-y-3">
                        <Skeleton width={96} height={12} />
                        <Skeleton width={144} height={40} />
                        <Skeleton width="75%" height={12} />
                    </div>
                ) : surveyError ? (
                    <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 leading-relaxed">
                        <p className="font-semibold">Census could not be loaded</p>
                        <p className="mt-1 text-stone-600">Refresh the page to try again.</p>
                    </div>
                ) : !hasObservations ? (
                    <div className="space-y-2 leading-relaxed">
                        <p className="font-semibold">No census observations for this period</p>
                        <p className="text-stone-600">Try another year or date filter. Missing observations do not mean zero pigs.</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-2">
                            <p className="text-xs font-medium text-stone-600">Recorded pigs</p>
                            <p className="text-4xl font-semibold tracking-tight tabular-nums">{pigs.toLocaleString()}</p>
                            {selectedBarangay ? (
                                <div className="space-y-1 text-xs leading-relaxed text-stone-600">
                                    {share !== null && <p>{share}% of the recorded municipal total</p>}
                                    <p>{selectedRecord.raiser_count.toLocaleString()} reporting raisers</p>
                                    <p>Population level: <span className="font-medium text-stone-800">{selectedRecord.density_level}</span></p>
                                </div>
                            ) : coverage && (
                                <p className="text-xs leading-relaxed text-stone-600">
                                    {coverage.observed_barangays} of {coverage.total_barangays} barangays reporting
                                </p>
                            )}
                        </div>
                        {selectedBarangay && (
                            <div className="space-y-3 border-t border-stone-200 pt-4">
                                <h3 className="text-base font-semibold">Herd breakdown</h3>
                                <dl className="space-y-3">
                                    {[
                                        { key: 'inahin', label: 'Breeding sows' },
                                        { key: 'fattener', label: 'Market fatteners' },
                                        { key: 'grower', label: 'Growing stock' },
                                        { key: 'starter', label: 'Piglets / starters' },
                                        { key: 'barako', label: 'Breeding boars' },
                                        { key: 'bulaw', label: 'Bulaw' },
                                    ].map(stage => {
                                        const count = Number(selectedRecord.breakdown?.[stage.key] ?? 0);
                                        const percentage = pigs > 0 ? Math.round(count / pigs * 100) : null;
                                        return (
                                            <div key={stage.key} className="space-y-1.5">
                                                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                                                    <dt className="text-stone-600">{stage.label}</dt>
                                                    <dd className="font-medium tabular-nums">
                                                        {count.toLocaleString()}
                                                        {percentage !== null && <span className="ml-2 text-xs font-normal text-stone-600">{percentage}%</span>}
                                                    </dd>
                                                </div>
                                                <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-stone-100">
                                                    <div className="h-full rounded-full bg-stone-500" style={{ width: `${percentage ?? 0}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </dl>
                            </div>
                        )}
                    </>
                )}

                {censusReady && !selectedBarangay && isCompareMode && (
                    <div className="space-y-3 border-t border-stone-200 pt-4">
                        <h3 className="text-base font-semibold">{baselineYear} to {selectedYear}</h3>
                        {comparisonError ? (
                            <p role="alert" className="text-stone-600">Comparison could not be loaded. Refresh the page to try again.</p>
                        ) : comparisonStats ? (
                            <>
                                <dl className="grid grid-cols-2 gap-4">
                                    <div>
                                        <dt className="text-xs text-stone-600">{baselineYear} pigs</dt>
                                        <dd className="mt-1 text-lg font-semibold tabular-nums">{comparisonStats.baseTotal.toLocaleString()}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-stone-600">{selectedYear} pigs</dt>
                                        <dd className="mt-1 text-lg font-semibold tabular-nums">{comparisonStats.targetTotal.toLocaleString()}</dd>
                                    </div>
                                </dl>
                                <p className={`font-semibold tabular-nums ${comparisonStats.netDiff > 0 ? 'text-green-700' : comparisonStats.netDiff < 0 ? 'text-red-700' : 'text-stone-800'}`}>
                                    {comparisonStats.netDiff === 0
                                        ? 'No change in recorded pigs'
                                        : `${comparisonStats.netDiff > 0 ? '+' : '−'}${Math.abs(comparisonStats.netDiff).toLocaleString()} pigs (${comparisonStats.netDiff > 0 ? 'increase' : 'decrease'})`}
                                    {comparisonStats.baseTotal > 0 && comparisonStats.netDiff !== 0 && ` · ${comparisonStats.netPct}%`}
                                </p>
                                {comparisonStats.baseTotal === 0 && <p className="text-xs text-stone-600">Percentage change unavailable because the baseline is zero.</p>}
                                <p className="text-xs leading-relaxed text-stone-600">
                                    Only barangays observed in both years are included. These comparison totals may differ from the municipal total above.
                                </p>
                                {comparisonStats.storySummary && <p className="text-xs leading-relaxed text-stone-600">{comparisonStats.storySummary}</p>}
                            </>
                        ) : (
                            <p className="leading-relaxed text-stone-600">No matching quarter with observations is available for these years and filters.</p>
                        )}
                    </div>
                )}

                {censusReady && hasObservations && operationalTakeaway && (
                    <div className="space-y-3 border-t border-stone-200 pt-4">
                        <h3 className="text-base font-semibold">{selectedBarangay ? 'Census note' : 'Census summary'}</h3>
                        <p className="leading-relaxed text-stone-600">{operationalTakeaway.insight}</p>
                        {operationalTakeaway.affectedBarangays?.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {operationalTakeaway.affectedBarangays.map(name => (
                                    <button key={name} type="button" onClick={() => {
                                        setSelectedBarangay(name);
                                        headingRef.current?.focus();
                                    }} className="inline-flex min-h-10 max-w-full items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-green-50 hover:text-green-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700">
                                        <span className="min-w-0 wrap-break-word">{name}</span>
                                        <ArrowUpRight size={14} aria-hidden="true" className="shrink-0" />
                                    </button>
                                ))}
                            </div>
                        )}
                        {operationalTakeaway.action && (
                            <p className="border-l-2 border-green-700 pl-3 leading-relaxed text-stone-600">
                                <span className="block font-semibold text-stone-800">Suggested action</span>
                                {operationalTakeaway.action}
                            </p>
                        )}
                    </div>
                )}

                {censusReady && secondaryTakeaway && (
                    <div className="space-y-2 border-t border-stone-200 pt-4">
                        <h3 className="text-base font-semibold">{secondaryTakeaway.title}</h3>
                        <p className="leading-relaxed text-stone-600">{secondaryTakeaway.insight}</p>
                    </div>
                )}
                {censusReady && operationalTakeaway?.why && (
                    <details key={`${selectedBarangay || 'municipal'}-${selectedYear}-${baselineYear}-${periodRecord?.census_date}`}
                        className="border-t border-stone-200 pt-3">
                        <summary className="min-h-10 cursor-pointer rounded-lg py-2 text-sm font-medium text-stone-600 marker:text-green-700 hover:text-green-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700">
                            How this is calculated
                        </summary>
                        <div className="mt-2 space-y-3 text-xs leading-relaxed text-stone-600">
                            <p>{operationalTakeaway.why.summary}</p>
                            {operationalTakeaway.why.formula && <p className="wrap-anywhere">{operationalTakeaway.why.formula}</p>}
                            <dl className="space-y-2">
                                {operationalTakeaway.why.evidence?.map((item, index) => (
                                    <div key={index} className="flex flex-wrap justify-between gap-x-3 gap-y-1">
                                        <dt className="min-w-0 wrap-anywhere">{item.label}</dt>
                                        <dd className="min-w-0 font-medium text-stone-800 tabular-nums wrap-anywhere">{item.value}</dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                    </details>
                )}
            </div>

            {selectedBarangay && (
                <div className="space-y-2 border-t border-stone-200 pt-4">
                    <h3 className="flex items-start gap-2 text-sm font-semibold">
                        <Truck size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-sky-700" />
                        Pigs on issued/released permits
                    </h3>
                    {transportLoading ? (
                        <p role="status" className="text-xs text-stone-600">Loading transport figures…</p>
                    ) : transportError ? (
                        <p role="alert" className="text-xs leading-relaxed text-stone-600">Transport figures could not be loaded. Refresh the page to try again.</p>
                    ) : transportRecord?.total_transported != null ? (
                        <p className="text-xl font-semibold tabular-nums">{Number(transportRecord.total_transported).toLocaleString()} <span className="text-xs font-normal text-stone-600">pigs</span></p>
                    ) : (
                        <p className="text-xs text-stone-600">Transport figures unavailable for this barangay.</p>
                    )}
                    <p className="text-xs leading-relaxed text-stone-600">All dates; independent of census filters.</p>
                </div>
            )}
        </section>
    );
};

export default CensusStatusPanel;
