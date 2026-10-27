const useMapInsights = ({ survey = [], compareSurvey = [], surveyFetching, compareSurveyFetching, filters }) => {
    const { isCompareMode, selectedBarangay, selectedYear, baselineYear } = filters;
    const observed = survey.filter(row => row.has_observations);
    const totalPigs = observed.reduce((sum, row) => sum + row.total_pigs, 0);
    const comparisonStats = (() => {
        if (!isCompareMode || !survey[0]?.quarter || survey[0].quarter !== compareSurvey[0]?.quarter) return null;
        const pairs = survey.flatMap(target => {
            const baseline = compareSurvey.find(row => row.barangay === target.barangay);
            return target.has_observations && baseline?.has_observations ? [{ target, baseline }] : [];
        });
        if (!pairs.length) return null;
        const targetTotal = pairs.reduce((sum, p) => sum + p.target.total_pigs, 0);
        const baseTotal = pairs.reduce((sum, p) => sum + p.baseline.total_pigs, 0);
        const netDiff = targetTotal - baseTotal;
        const netPct = baseTotal > 0 ? Math.abs(netDiff / baseTotal * 100).toFixed(1) : 'N/A';
        return {
            targetTotal, baseTotal, netDiff, netPct,
            increased: pairs.filter(p => p.target.total_pigs > p.baseline.total_pigs).length,
            decreased: pairs.filter(p => p.target.total_pigs < p.baseline.total_pigs).length,
            stable: pairs.filter(p => p.target.total_pigs === p.baseline.total_pigs).length,
            storySummary: `Q${survey[0].quarter} comparison, ${baselineYear} to ${selectedYear}, across ${pairs.length} barangays observed in both years.`,
        };
    })();
    const selected = survey.find(row => row.barangay === selectedBarangay);
    const date = survey[0]?.census_date;
    const coverage = survey[0]?.coverage;
    const insight = selectedBarangay
        ? selected?.has_observations
            ? `${selectedBarangay} recorded ${selected.total_pigs.toLocaleString()} pigs from ${selected.raiser_count} raisers in the census dated ${date}.`
            : `${selectedBarangay} has no observations in the selected census quarter.`
        : comparisonStats?.storySummary || (isCompareMode
            ? 'No matching quarter with observations is available for these years and filters.'
            : `${totalPigs.toLocaleString()} pigs recorded for ${date || 'the selected quarter'}. Coverage: ${coverage?.observed_barangays || 0} of ${coverage?.total_barangays || 0} barangays.`);
    const operationalTakeaway = {
        category: 'QUARTERLY CENSUS', title: selectedBarangay || 'Municipal census', insight,
        action: 'Review reporting coverage before comparing population totals.',
        why: {
            summary: 'Each raiser contributes only their latest observation within this quarter. Missing observations are excluded from counts.',
            formula: "Quarterly population = sum of six categories in each raiser's latest quarterly observation",
            evidence: [{ label: 'Census date', value: date || 'No data' }],
        },
        affectedBarangays: [],
    };
    return {
        comparisonStats, operationalTakeaway, secondaryTakeaway: null,
        allInsights: [operationalTakeaway], totalPigs,
        topHotspots: [...observed].sort((a, b) => b.total_pigs - a.total_pigs).slice(0, 5)
            .map((row, index) => ({ rank: index + 1, name: row.barangay, totalPigs: row.total_pigs,
                density: row.density_level, breakdown: row.breakdown })),
        isMapDataUpdating: surveyFetching || (isCompareMode && compareSurveyFetching),
    };
};

export default useMapInsights;
