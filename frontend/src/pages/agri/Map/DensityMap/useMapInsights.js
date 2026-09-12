import { useMemo } from "react";

/**
 * Derives municipal-wide comparison statistics, the purpose-driven operational
 * takeaway narrative, and derived census figures for the AgriMapPage.
 */
const useMapInsights = ({ map, survey, compareSurvey, surveyFetching, compareSurveyFetching, filters }) => {
    const { isCompareMode, selectedYear, baselineYear, selectedBarangay, seasonMode } = filters;

    // Municipal-wide plain-English comparison calculations
    const comparisonStats = useMemo(() => {
        if (!isCompareMode || !survey || !compareSurvey) return null;

        const targetTotal = survey.reduce((acc, curr) => acc + Number(curr.total_pigs || 0), 0);
        const baseTotal = compareSurvey.reduce((acc, curr) => acc + Number(curr.total_pigs || 0), 0);
        const netDiff = targetTotal - baseTotal;
        const netPct = baseTotal > 0 ? Math.abs((netDiff / baseTotal) * 100).toFixed(1) : (netDiff > 0 ? '100' : '0.0');

        let increased = 0;
        let decreased = 0;
        let stable = 0;

        (map || []).forEach(b => {
            const tVal = survey.find(s => s.barangay === b.name)?.total_pigs || 0;
            const bVal = compareSurvey.find(s => s.barangay === b.name)?.total_pigs || 0;
            if (tVal > bVal) increased++;
            else if (tVal < bVal) decreased++;
            else stable++;
        });

        // Dynamic Plain-English Narrative Summary
        let storySummary = "";
        if (netDiff > 0) {
            storySummary = `Sariaya's total pig count grew by +${netPct}% (+${netDiff.toLocaleString()} pigs) from ${baselineYear} to ${selectedYear}. Growth was recorded in ${increased} barangays.`;
        } else if (netDiff < 0) {
            storySummary = `Sariaya's total pig count decreased by -${netPct}% (-${Math.abs(netDiff).toLocaleString()} pigs) from ${baselineYear} to ${selectedYear}, reflecting commercial sales or market transport offloads.`;
        } else {
            storySummary = `Sariaya's total pig population remained stable between ${baselineYear} and ${selectedYear} at ${targetTotal.toLocaleString()} pigs.`;
        }

        return {
            targetTotal,
            baseTotal,
            netDiff,
            netPct,
            increased,
            decreased,
            stable,
            storySummary
        };
    }, [isCompareMode, survey, compareSurvey, map, baselineYear, selectedYear]);

    // Purpose-driven Non-Obvious Map Operational Intelligence Takeaway
    const operationalTakeaway = useMemo(() => {
        if (!survey || survey.length === 0) {
            return {
                category: "SURVEILLANCE NOTICE",
                title: "Census Data Pending",
                insight: "Awaiting validated survey submissions across barangays to compute geospatial biosecurity patterns.",
                action: "Upload or encode barangay survey data to activate live intelligence."
            };
        }

        // 1. If a specific barangay is selected/searched
        if (selectedBarangay) {
            const bRecord = survey.find(s => s.barangay === selectedBarangay);
            if (bRecord) {
                const bPigs = Number(bRecord.total_pigs || 0);
                const breakdown = bRecord.breakdown || {};
                const inahin = Number(breakdown.inahin || 0);
                const fattener = Number(breakdown.fattener || 0);

                if (bPigs === 0) {
                    return {
                        category: "ZONE CLASSIFICATION",
                        title: `${selectedBarangay}: Zero Registered Density`,
                        insight: `Currently classified as a swine-free or dormant sector. If backyard farming exists here, unrecorded livestock represents an undetected biosecurity blind spot.`,
                        action: "Mobilize barangay livestock committee to verify unregistered backyard pens."
                    };
                }

                if (inahin > fattener) {
                    const sowRatio = Math.round((inahin / bPigs) * 100);
                    return {
                        category: "BREEDING RESERVOIR",
                        title: `${selectedBarangay}: Maternal Stock Anchor`,
                        insight: `Breeding sows constitute ${sowRatio}% (${inahin.toLocaleString()} heads) of local stock. This barangay serves as a local farrowing reservoir that supplies grower stock to surrounding finishing pens.`,
                        action: "Prioritize strict farm visitor containment and artificial insemination support."
                    };
                } else if (fattener >= inahin) {
                    const fatRatio = Math.round((fattener / bPigs) * 100);
                    return {
                        category: "MARKET CORRIDOR",
                        title: `${selectedBarangay}: High-Turnover Finishing Hub`,
                        insight: `Market-ready hogs (Fatteners) account for ${fatRatio}% (${fattener.toLocaleString()} heads). Frequent commercial hauler truck visits create elevated cross-border pathogen exposure.`,
                        action: "Enforce mandatory vehicle wheel-spray and loading chute disinfection."
                    };
                }
            }
        }

        // 2. If in Multi-Year Comparison Mode
        if (isCompareMode && comparisonStats) {
            const { netDiff, netPct, targetTotal } = comparisonStats;
            
            let inahinDiff = 0;
            let fattenerDiff = 0;
            let youngDiff = 0;

            (survey || []).forEach(curr => {
                const prev = (compareSurvey || []).find(s => s.barangay === curr.barangay);
                const cB = curr.breakdown || {};
                const pB = prev?.breakdown || {};
                inahinDiff += (Number(cB.inahin || 0) - Number(pB.inahin || 0));
                fattenerDiff += (Number(cB.fattener || 0) - Number(pB.fattener || 0));
                youngDiff += (
                    (Number(cB.starter || 0) + Number(cB.bulaw || 0) + Number(cB.grower || 0)) -
                    (Number(pB.starter || 0) + Number(pB.bulaw || 0) + Number(pB.grower || 0))
                );
            });

            if (netDiff > 0) {
                if (inahinDiff > 0 && youngDiff > 0) {
                    return {
                        category: "STRUCTURAL RESILIENCE",
                        title: `Breeding Herd Rebuilding (+${netPct}%)`,
                        insight: `Expansion from ${baselineYear} to ${selectedYear} (+${netDiff.toLocaleString()} pigs) is driven by maternal stock (+${inahinDiff.toLocaleString()} sows) and nursing stock (+${youngDiff.toLocaleString()}), confirming genuine post-outbreak herd repopulation.`,
                        action: "Maintain strict biosafety buffer zones to protect juvenile stock."
                    };
                }
                return {
                    category: "COMMERCIAL EXPANSION",
                    title: `Finishing Volume Surge (+${netPct}%)`,
                    insight: `Municipal swine count grew to ${targetTotal.toLocaleString()} pigs, driven primarily by market fatteners (+${fattenerDiff.toLocaleString()} heads). High livestock density along arterial roads requires heightened transit checkpoint screening.`,
                    action: "Align abattoir transport clearances with certified veterinary health passes."
                };
            } else if (netDiff < 0) {
                if (inahinDiff < 0) {
                    return {
                        category: "BREEDING CONSTRAINT",
                        title: `Breeding Stock Depletion (-${netPct}%)`,
                        insight: `The municipal decrease of ${Math.abs(netDiff).toLocaleString()} pigs stems from a loss of ${Math.abs(inahinDiff).toLocaleString()} breeding sows. Without maternal replacement stock, local farrowing output will remain constrained for 6–9 months.`,
                        action: "Consider municipal breeder replenishment assistance and gilt distribution."
                    };
                }
                return {
                    category: "MARKET EXTRACTION",
                    title: `Commercial Extraction Cycle (-${netPct}%)`,
                    insight: `The reduction to ${targetTotal.toLocaleString()} pigs reflects accelerated commercial slaughter and inter-municipal export offloads rather than breeding herd collapse.`,
                    action: "Audit shipping permits against abattoir receipts to verify transit integrity."
                };
            }
        }

        // 3. Municipal Single-Year Mode (The Default Map View)
        const sorted = [...survey].sort((a, b) => Number(b.total_pigs || 0) - Number(a.total_pigs || 0));
        const total = survey.reduce((acc, curr) => acc + Number(curr.total_pigs || 0), 0);
        
        let totalInahin = 0;
        let totalFattener = 0;
        survey.forEach(s => {
            const b = s.breakdown || {};
            totalInahin += Number(b.inahin || 0);
            totalFattener += Number(b.fattener || 0);
        });

        const top3 = sorted.slice(0, 3);
        const top3Pigs = top3.reduce((acc, curr) => acc + Number(curr.total_pigs || 0), 0);
        const top3Pct = total > 0 ? Math.round((top3Pigs / total) * 100) : 0;
        const top3Names = top3.map(t => t.barangay).filter(Boolean).join(', ');

        if (seasonMode === 'wet') {
            return {
                category: "SURVEILLANCE VECTOR",
                title: "Monsoon Effluent Runoff Risk",
                insight: `Wet season conditions prolong viral pathogen viability in wet soil and manure slurry. In Sariaya's top production hubs (${top3Names}), surface water runoff along irrigation canals represents the primary transmissible route.`,
                action: "Enforce elevated lagoon bunding and prohibit untreated farm drainage into creeks."
            };
        }

        if (seasonMode === 'dry') {
            return {
                category: "LOGISTICS GUIDANCE",
                title: "Dry Season Transit Thermal Window",
                insight: `High daytime temperatures accelerate transit heat exhaustion among market hogs. With ${totalFattener.toLocaleString()} fatteners in inventory, commercial hauler transports should be restricted to early-morning cooler windows (5:00 AM – 8:30 AM).`,
                action: "Mandate early-morning transit hours on released transport permits."
            };
        }

        if (top3Pct >= 40 && top3Names) {
            return {
                category: "BIOSECURITY CLUSTER",
                title: `Corridor Concentration Risk (${top3Pct}%)`,
                insight: `Nearly half (${top3Pct}%) of Sariaya's swine population is clustered in just 3 barangays: ${top3Names}. A biosecurity breach along this shared transit corridor would instantly jeopardize ${top3Pigs.toLocaleString()} pigs.`,
                action: `Focus routine perimeter disinfection checkpoints along the access arteries of ${top3[0]?.barangay}.`
            };
        }

        const inahinRatio = total > 0 ? Math.round((totalInahin / total) * 100) : 0;
        return {
            category: "HERD COMPOSITION",
            title: `Breeding Foundation Balance (${inahinRatio}%)`,
            insight: `Maternal sows represent ${inahinRatio}% (${totalInahin.toLocaleString()} heads) of the municipal census alongside ${totalFattener.toLocaleString()} commercial fatteners. This balanced ratio ensures consistent slaughter turnover while sustaining self-replenishing farrowing stock.`,
            action: "Maintain strict backyard reporting to prevent unmonitored farm turnover."
        };
    }, [survey, selectedBarangay, isCompareMode, comparisonStats, compareSurvey, seasonMode, selectedYear, baselineYear]);

    const totalPigs = survey?.reduce((acc, curr) => acc + Number(curr.total_pigs || 0), 0) || 0;
    const isMapDataUpdating = surveyFetching || (isCompareMode && compareSurveyFetching);

    return {
        comparisonStats,
        operationalTakeaway,
        totalPigs,
        isMapDataUpdating
    };
};

export default useMapInsights;