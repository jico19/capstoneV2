import { useState, useMemo, useCallback } from 'react';

export const PIG_CATEGORIES = ['inahin', 'barako', 'fattener', 'grower', 'bulaw', 'starter'];

export const SURVEY_QUERY_KEYS = [
    'barangay-hog-surveys',
    'barangay-density-data',
    'barangay-surveys-recent',
    'farmer-roster',
];

export const invalidateSurveyQueries = (queryClient) => {
    SURVEY_QUERY_KEYS.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
};

const createEmptyRow = (id) => ({
    id: id || Math.random().toString(36).substring(2, 9),
    farmer_name: '',
    contact_number: '',
    inahin: '',
    barako: '',
    fattener: '',
    grower: '',
    starter: '',
    bulaw: '',
});

export const useBatchSurvey = () => {
    const [batchDate, setBatchDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [batchRows, setBatchRows] = useState(() => [
        createEmptyRow('row-1'),
        createEmptyRow('row-2'),
        createEmptyRow('row-3'),
    ]);

    const getRowTotal = useCallback(
        (row) => PIG_CATEGORIES.reduce((acc, cat) => acc + (parseInt(row[cat], 10) || 0), 0),
        []
    );

    const handleRowChange = useCallback((index, field, value) => {
        setBatchRows((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    }, []);

    const handleAddRow = useCallback(() => {
        setBatchRows((prev) => [...prev, createEmptyRow()]);
    }, []);

    const handleRemoveRow = useCallback((index) => {
        setBatchRows((prev) =>
            prev.length <= 1 ? [createEmptyRow()] : prev.filter((_, i) => i !== index)
        );
    }, []);

    const handleClearRows = useCallback(() => {
        setBatchRows([createEmptyRow(), createEmptyRow(), createEmptyRow()]);
    }, []);

    const validBatchRows = useMemo(
        () =>
            batchRows.filter(
                (row) => (row.farmer_name || '').trim().length > 0 && getRowTotal(row) > 0
            ),
        [batchRows, getRowTotal]
    );

    const batchTotalPigs = useMemo(
        () => validBatchRows.reduce((acc, row) => acc + getRowTotal(row), 0),
        [validBatchRows, getRowTotal]
    );

    return {
        batchDate,
        setBatchDate,
        batchRows,
        getRowTotal,
        handleRowChange,
        handleAddRow,
        handleRemoveRow,
        handleClearRows,
        validBatchRows,
        batchTotalPigs,
    };
};