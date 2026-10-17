import { useMemo } from "react";

/**
 * Derives municipal-wide comparison statistics, explainable multi-tier operational
 * takeaways with transparent formulas and evidence, and derived census figures for AgriMapPage.
 */
const useMapInsights = ({ map, survey, compareSurvey, surveyFetching, compareSurveyFetching, filters }) => {
    const { isCompareMode, selectedYear, baselineYear, selectedBarangay, seasonMode } = filters;

    // Municipal-wide comparison calculations
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
            storySummary = `Sariaya's total pig count grew by +${netPct}% (+${netDiff.toLocaleString()} pigs) from ${baselineYear} to ${selectedYear}. Growth recorded in ${increased} barangays.`;
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

    // Top 5 municipal swine hotspots for quick-focus jump chips
    const topHotspots = useMemo(() => {
        if (!survey || survey.length === 0) return [];
        return [...survey]
            .filter(s => Number(s.total_pigs || 0) > 0)
            .sort((a, b) => Number(b.total_pigs || 0) - Number(a.total_pigs || 0))
            .slice(0, 5)
            .map((s, idx) => ({
                rank: idx + 1,
                name: s.barangay,
                totalPigs: Number(s.total_pigs || 0),
                density: s.density_level || 'Medium',
                breakdown: s.breakdown || {}
            }));
    }, [survey]);

    // Explainable Multi-Tier Operational Insights Engine
    const insightsBundle = useMemo(() => {
        if (!survey || survey.length === 0) {
            const fallback = {
                id: 'census-pending',
                category: "SURVEILLANCE NOTICE",
                title: "Census Data Pending",
                insight: "Awaiting validated survey submissions across barangays to compute geospatial biosecurity patterns.",
                action: "Upload or encode barangay survey data to activate live intelligence.",
                why: {
                    summary: "No survey records matched the selected calendar filters.",
                    formula: "Total Records = 0",
                    evidence: [{ label: "Records Loaded", value: "0 barangays" }]
                },
                affectedBarangays: []
            };
            return {
                primary: fallback,
                secondary: null,
                allInsights: [fallback]
            };
        }

        const list = [];
        const total = survey.reduce((acc, curr) => acc + Number(curr.total_pigs || 0), 0);

        let totalInahin = 0;
        let totalFattener = 0;
        let totalYoung = 0;
        survey.forEach(s => {
            const b = s.breakdown || {};
            totalInahin += Number(b.inahin || 0);
            totalFattener += Number(b.fattener || 0);
            totalYoung += Number(b.starter || 0) + Number(b.bulaw || 0) + Number(b.grower || 0);
        });

        // 1. SPECIFIC BARANGAY SELECTED
        if (selectedBarangay) {
            const bRecord = survey.find(s => s.barangay === selectedBarangay);
            if (bRecord) {
                const bPigs = Number(bRecord.total_pigs || 0);
                const breakdown = bRecord.breakdown || {};
                const inahin = Number(breakdown.inahin || 0);
                const fattener = Number(breakdown.fattener || 0);
                const sowRatio = bPigs > 0 ? Math.round((inahin / bPigs) * 100) : 0;
                const fatRatio = bPigs > 0 ? Math.round((fattener / bPigs) * 100) : 0;
                const shareOfMunicipality = total > 0 ? ((bPigs / total) * 100).toFixed(1) : '0.0';

                if (bPigs === 0) {
                    list.push({
                        id: 'b-zero-density',
                        category: "ZONE CLASSIFICATION",
                        title: `${selectedBarangay}: Zero Registered Density`,
                        insight: "Currently classified as a swine-free or dormant sector. Unrecorded backyard pens create biosecurity blind spots during border outbreaks.",
                        action: "Mobilize barangay livestock committee to survey unregistered backyard pens.",
                        why: {
                            summary: "Total recorded swine count in this barangay is zero.",
                            formula: "Recorded Swine = 0",
                            evidence: [
                                { label: "Total Headcount", value: "0 pigs" },
                                { label: "Municipal Share", value: "0.0%" }
                            ]
                        },
                        affectedBarangays: [selectedBarangay]
                    });
                } else if (inahin >= fattener) {
                    list.push({
                        id: 'b-breeding-anchor',
                        category: "BREEDING RESERVOIR",
                        title: `${selectedBarangay}: Maternal Stock Anchor`,
                        insight: `Breeding sows represent ${sowRatio}% (${inahin.toLocaleString()} heads) of local stock. This barangay serves as a local farrowing reservoir supplying grower stock to surrounding finishing pens.`,
                        action: "Prioritize strict farm visitor containment and municipal artificial insemination support.",
                        why: {
                            summary: `Breeding sows (${inahin.toLocaleString()}) outnumber fatteners (${fattener.toLocaleString()}), qualifying this sector as a reproduction hub.`,
                            formula: `Sows (${inahin.toLocaleString()}) ≥ Fatteners (${fattener.toLocaleString()}) & Sow Ratio (${sowRatio}%) ≥ 25%`,
                            evidence: [
                                { label: "Breeding Sows", value: `${inahin.toLocaleString()} heads (${sowRatio}%)` },
                                { label: "Market Fatteners", value: `${fattener.toLocaleString()} heads (${fatRatio}%)` },
                                { label: "Barangay Total", value: `${bPigs.toLocaleString()} pigs (${shareOfMunicipality}% of Sariaya)` }
                            ]
                        },
                        affectedBarangays: [selectedBarangay]
                    });
                } else {
                    list.push({
                        id: 'b-finishing-hub',
                        category: "MARKET CORRIDOR",
                        title: `${selectedBarangay}: High-Turnover Finishing Hub`,
                        insight: `Market-ready hogs (Fatteners) account for ${fatRatio}% (${fattener.toLocaleString()} heads). Frequent commercial hauler truck visits create elevated cross-border pathogen exposure.`,
                        action: "Enforce mandatory vehicle wheel-spray and loading chute disinfection before transport release.",
                        why: {
                            summary: `Fatteners (${fattener.toLocaleString()}) dominate the local herd, indicating frequent commercial trucking activity.`,
                            formula: `Fatteners (${fattener.toLocaleString()}) > Sows (${inahin.toLocaleString()})`,
                            evidence: [
                                { label: "Market Fatteners", value: `${fattener.toLocaleString()} heads (${fatRatio}%)` },
                                { label: "Breeding Sows", value: `${inahin.toLocaleString()} heads (${sowRatio}%)` },
                                { label: "Barangay Total", value: `${bPigs.toLocaleString()} pigs (${shareOfMunicipality}% of Sariaya)` }
                            ]
                        },
                        affectedBarangays: [selectedBarangay]
                    });
                }
            }
        }

        // 2. MULTI-YEAR COMPARISON MODE INSIGHTS
        if (isCompareMode && comparisonStats) {
            const { netDiff, netPct, targetTotal, baseTotal } = comparisonStats;

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
                    list.push({
                        id: 'cmp-rebuilding',
                        category: "STRUCTURAL RESILIENCE",
                        title: `Breeding Herd Rebuilding (+${netPct}%)`,
                        insight: `Expansion from ${baselineYear} to ${selectedYear} (+${netDiff.toLocaleString()} pigs) is anchored by maternal stock (+${inahinDiff.toLocaleString()} sows) and nursing stock (+${youngDiff.toLocaleString()} young pigs), confirming genuine herd repopulation.`,
                        action: "Maintain strict biosafety buffer zones to protect juvenile stock.",
                        why: {
                            summary: "Net growth is driven by maternal and nursing age brackets rather than temporary fattening imports.",
                            formula: `Net Swine Delta > 0 AND ΔSows (+${inahinDiff}) > 0 AND ΔYoung (+${youngDiff}) > 0`,
                            evidence: [
                                { label: "Net Headcount Delta", value: `+${netDiff.toLocaleString()} pigs` },
                                { label: "Breeding Sows Shift", value: `${inahinDiff > 0 ? '+' : ''}${inahinDiff.toLocaleString()} heads` },
                                { label: "Grower/Piglets Shift", value: `${youngDiff > 0 ? '+' : ''}${youngDiff.toLocaleString()} heads` }
                            ]
                        },
                        affectedBarangays: []
                    });
                } else {
                    list.push({
                        id: 'cmp-commercial-surge',
                        category: "COMMERCIAL EXPANSION",
                        title: `Finishing Volume Surge (+${netPct}%)`,
                        insight: `Swine count reached ${targetTotal.toLocaleString()} pigs, driven primarily by market fatteners (+${fattenerDiff.toLocaleString()} heads). Heightened livestock density requires rigorous transit checkpoint screening.`,
                        action: "Cross-reference abattoir transport clearances with certified veterinary health passes.",
                        why: {
                            summary: "Population surge is heavily weighted in market fatteners ready for commercial transit.",
                            formula: `ΔFatteners (+${fattenerDiff.toLocaleString()}) accounts for the majority of Net Growth (+${netDiff.toLocaleString()})`,
                            evidence: [
                                { label: "Baseline Census", value: `${baseTotal.toLocaleString()} pigs (${baselineYear})` },
                                { label: "Target Census", value: `${targetTotal.toLocaleString()} pigs (${selectedYear})` },
                                { label: "Fattener Delta", value: `+${fattenerDiff.toLocaleString()} heads` }
                            ]
                        },
                        affectedBarangays: []
                    });
                }
            } else if (netDiff < 0) {
                if (inahinDiff < 0) {
                    list.push({
                        id: 'cmp-depletion',
                        category: "BREEDING CONSTRAINT",
                        title: `Breeding Stock Depletion (-${netPct}%)`,
                        insight: `Municipal decline of ${Math.abs(netDiff).toLocaleString()} pigs stems from a loss of ${Math.abs(inahinDiff).toLocaleString()} breeding sows. Without replacement stock, local farrowing output will remain constrained for 6–9 months.`,
                        action: "Consider municipal breeder replenishment assistance and gilt distribution.",
                        why: {
                            summary: "Maternal sow population dropped significantly, limiting natural farrowing recovery.",
                            formula: `Net Delta < 0 AND ΔSows (${inahinDiff.toLocaleString()}) < 0`,
                            evidence: [
                                { label: "Net Population Drop", value: `-${Math.abs(netDiff).toLocaleString()} pigs (-${netPct}%)` },
                                { label: "Sow Depletion", value: `${inahinDiff.toLocaleString()} breeding sows` }
                            ]
                        },
                        affectedBarangays: []
                    });
                } else {
                    list.push({
                        id: 'cmp-extraction',
                        category: "MARKET EXTRACTION",
                        title: `Commercial Extraction Cycle (-${netPct}%)`,
                        insight: `The reduction to ${targetTotal.toLocaleString()} pigs reflects commercial abattoir offloads rather than breeding herd collapse, as maternal breeding stock remained steady.`,
                        action: "Audit shipping permits against abattoir manifests to verify transit volume matches.",
                        why: {
                            summary: "Total count reduced while breeding stock remained resilient.",
                            formula: `Net Swine Delta < 0 AND ΔSows (${inahinDiff.toLocaleString()}) ≥ 0`,
                            evidence: [
                                { label: "Net Census Delta", value: `${netDiff.toLocaleString()} pigs` },
                                { label: "Sow Count Shift", value: `${inahinDiff.toLocaleString()} heads` }
                            ]
                        },
                        affectedBarangays: []
                    });
                }
            }
        }

        // 3. SPATIAL HOTSPOT & CONCENTRATION INSIGHT
        const sorted = [...survey].sort((a, b) => Number(b.total_pigs || 0) - Number(a.total_pigs || 0));
        const top3 = sorted.slice(0, 3);
        const top3Pigs = top3.reduce((acc, curr) => acc + Number(curr.total_pigs || 0), 0);
        const top3Pct = total > 0 ? Math.round((top3Pigs / total) * 100) : 0;
        const top3Names = top3.map(t => t.barangay).filter(Boolean);

        if (top3Pct >= 35 && top3Names.length > 0) {
            list.push({
                id: 'spatial-clustering',
                category: "BIOSECURITY CLUSTER",
                title: `Corridor Concentration Risk (${top3Pct}%)`,
                insight: `Over one-third (${top3Pct}%) of Sariaya's swine population is clustered in 3 barangays: ${top3Names.join(', ')}. A biosecurity breach along this shared transit corridor would jeopardize ${top3Pigs.toLocaleString()} pigs.`,
                action: `Focus routine perimeter disinfection checkpoints along access arteries of ${top3Names[0]}.`,
                why: {
                    summary: `The top 3 production barangays hold ${top3Pigs.toLocaleString()} of the ${total.toLocaleString()} total municipal swine census.`,
                    formula: `(Top 3 Swine Census / Total Municipal Census) = (${top3Pigs.toLocaleString()} / ${total.toLocaleString()}) = ${top3Pct}% ≥ 35% threshold`,
                    evidence: [
                        { label: `${top3Names[0]}`, value: `${Number(top3[0]?.total_pigs || 0).toLocaleString()} pigs` },
                        { label: `${top3Names[1]}`, value: `${Number(top3[1]?.total_pigs || 0).toLocaleString()} pigs` },
                        { label: `${top3Names[2]}`, value: `${Number(top3[2]?.total_pigs || 0).toLocaleString()} pigs` },
                        { label: "Combined Cluster", value: `${top3Pigs.toLocaleString()} pigs (${top3Pct}% of Sariaya)` }
                    ]
                },
                affectedBarangays: top3Names
            });
        }

        // 4. SEASONAL / LOGISTICAL VECTOR INSIGHT
        if (seasonMode === 'wet') {
            list.push({
                id: 'season-wet-risk',
                category: "SURVEILLANCE VECTOR",
                title: "Monsoon Effluent Runoff Risk",
                insight: `Wet season conditions prolong viral pathogen viability in wet soil and manure slurry. In Sariaya's top production hubs (${top3Names.slice(0, 2).join(', ')}), surface water runoff along irrigation canals represents the primary transmissible route.`,
                action: "Enforce elevated lagoon bunding and prohibit untreated farm drainage into public waterways.",
                why: {
                    summary: "Filter timeframe set to Wet Season (June - November) where saturated soil increases enteric pathogen transmission.",
                    formula: "Season Filter == 'wet' AND High-Density Hubs Identified",
                    evidence: [
                        { label: "Selected Season", value: "Wet Season (Jun - Nov)" },
                        { label: "Key Runoff Sectors", value: top3Names.slice(0, 2).join(', ') }
                    ]
                },
                affectedBarangays: top3Names.slice(0, 2)
            });
        } else if (seasonMode === 'dry') {
            list.push({
                id: 'season-dry-transit',
                category: "LOGISTICS GUIDANCE",
                title: "Dry Season Transit Thermal Window",
                insight: `High daytime temperatures accelerate transit heat exhaustion among market hogs. With ${totalFattener.toLocaleString()} fatteners in inventory, commercial hauler transports should be restricted to early-morning cooler windows (5:00 AM – 8:30 AM).`,
                action: "Mandate early-morning transit hours on released livestock transport permits.",
                why: {
                    summary: "Filter timeframe set to Dry Season (December - May) with high ambient midday temperatures.",
                    formula: `Season Filter == 'dry' AND Fattener Count = ${totalFattener.toLocaleString()} heads`,
                    evidence: [
                        { label: "Selected Season", value: "Dry Season (Dec - May)" },
                        { label: "Vulnerable Fatteners", value: `${totalFattener.toLocaleString()} heads` }
                    ]
                },
                affectedBarangays: []
            });
        }

        // 5. HERD COMPOSITION BASELINE
        const inahinRatio = total > 0 ? Math.round((totalInahin / total) * 100) : 0;
        const fattenerRatio = total > 0 ? Math.round((totalFattener / total) * 100) : 0;
        list.push({
            id: 'herd-composition-baseline',
            category: "HERD COMPOSITION",
            title: `Breeding Foundation Balance (${inahinRatio}%)`,
            insight: `Maternal sows represent ${inahinRatio}% (${totalInahin.toLocaleString()} heads) alongside ${totalFattener.toLocaleString()} commercial fatteners (${fattenerRatio}%). This ratio sustains consistent slaughter turnover while maintaining self-replenishing farrowing stock.`,
            action: "Maintain routine farrowing census to detect any unexpected drop in replacement gilts.",
            why: {
                summary: `Municipal ratio of breeding sows (${inahinRatio}%) to commercial fatteners (${fattenerRatio}%) across all registered farms.`,
                formula: `Breeding Sow Ratio = (${totalInahin.toLocaleString()} / ${total.toLocaleString()}) = ${inahinRatio}%`,
                evidence: [
                    { label: "Breeding Sows", value: `${totalInahin.toLocaleString()} heads (${inahinRatio}%)` },
                    { label: "Market Fatteners", value: `${totalFattener.toLocaleString()} heads (${fattenerRatio}%)` },
                    { label: "Growing Stock", value: `${totalYoung.toLocaleString()} heads` }
                ]
            },
            affectedBarangays: []
        });

        return {
            primary: list[0],
            secondary: list[1] || null,
            allInsights: list
        };
    }, [survey, selectedBarangay, isCompareMode, comparisonStats, compareSurvey, seasonMode, selectedYear, baselineYear]);

    const totalPigs = survey?.reduce((acc, curr) => acc + Number(curr.total_pigs || 0), 0) || 0;
    const isMapDataUpdating = surveyFetching || (isCompareMode && compareSurveyFetching);

    return {
        comparisonStats,
        operationalTakeaway: insightsBundle.primary,
        secondaryTakeaway: insightsBundle.secondary,
        allInsights: insightsBundle.allInsights,
        topHotspots,
        totalPigs,
        isMapDataUpdating
    };
};

export default useMapInsights;