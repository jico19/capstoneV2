import { useState, useMemo } from "react";

/**
 * Owns all map filter/selection state for the AgriMapPage operations toolbar:
 * season mode, custom month range, year pickers, compare mode, density filters,
 * and barangay search focus.
 *
 * Effective years are derived during render (instead of synced in an effect)
 * so the slot always reflects a valid year once survey years are known.
 */
const useMapFilters = (availableYears) => {
    const [seasonMode, setSeasonMode] = useState('all') // 'all' | 'wet' | 'dry' | 'custom'
    const [startMonth, setStartMonth] = useState('')
    const [endMonth, setEndMonth] = useState('')
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
    const [isCompareMode, setIsCompareMode] = useState(false)
    const [baselineYear, setBaselineYear] = useState('')
    const [activeFilters, setActiveFilters] = useState(['Low', 'Medium', 'High', 'Very High', 'None'])
    const [selectedBarangay, setSelectedBarangay] = useState(null)

    const toggleFilter = (level) => {
        setActiveFilters(prev =>
            prev.includes(level)
                ? prev.filter(f => f !== level)
                : [...prev, level]
        )
    }

    const years = useMemo(() => {
        if (availableYears && availableYears.length > 0) {
            return availableYears.map(y => y.toString());
        }
        return [new Date().getFullYear().toString()];
    }, [availableYears]);

    // Fall back to the most recent available survey year if the current
    // selection is no longer part of the known survey years.
    const effectiveSelectedYear = useMemo(() => {
        if (years.length > 0 && !years.includes(selectedYear)) {
            return years[0];
        }
        return selectedYear;
    }, [years, selectedYear]);

    // Baseline defaults to the survey year immediately preceding the target
    // year (prev === 'earlier' in a descending year list).
    const effectiveBaselineYear = useMemo(() => {
        const currentIdx = years.indexOf(effectiveSelectedYear);
        const fallbackBaseline = years[currentIdx + 1] || years[1] || years[0];
        if (!baselineYear || !years.includes(baselineYear) || baselineYear === effectiveSelectedYear) {
            return fallbackBaseline;
        }
        return baselineYear;
    }, [years, effectiveSelectedYear, baselineYear]);

    const handleSeasonModeChange = (mode) => {
        setSeasonMode(mode);
        if (mode !== 'custom') {
            setStartMonth('');
            setEndMonth('');
        } else {
            if (!startMonth) setStartMonth('1');
            if (!endMonth) setEndMonth('3');
        }
    }

    const clearFilters = () => {
        setSeasonMode('all');
        setStartMonth('');
        setEndMonth('');
        const defaultYear = years[0] || new Date().getFullYear().toString();
        setSelectedYear(defaultYear);
        setSelectedBarangay(null);
        setIsCompareMode(false);
        setActiveFilters(['Low', 'Medium', 'High', 'Very High', 'None']);
    }

    const months = [
        { id: '1', name: 'January', short: 'Jan' },
        { id: '2', name: 'February', short: 'Feb' },
        { id: '3', name: 'March', short: 'Mar' },
        { id: '4', name: 'April', short: 'Apr' },
        { id: '5', name: 'May', short: 'May' },
        { id: '6', name: 'June', short: 'Jun' },
        { id: '7', name: 'July', short: 'Jul' },
        { id: '8', name: 'August', short: 'Aug' },
        { id: '9', name: 'September', short: 'Sep' },
        { id: '10', name: 'October', short: 'Oct' },
        { id: '11', name: 'November', short: 'Nov' },
        { id: '12', name: 'December', short: 'Dec' },
    ];

    const hasActiveFilters = seasonMode !== 'all' || selectedBarangay !== null || isCompareMode || activeFilters.length < 5;

    return {
        seasonMode,
        startMonth,
        endMonth,
        selectedYear: effectiveSelectedYear,
        isCompareMode,
        baselineYear: effectiveBaselineYear,
        activeFilters,
        selectedBarangay,
        setSelectedYear,
        setBaselineYear,
        setIsCompareMode,
        setSelectedBarangay,
        setStartMonth,
        setEndMonth,
        toggleFilter,
        handleSeasonModeChange,
        clearFilters,
        years,
        months,
        hasActiveFilters
    };
};

export default useMapFilters;