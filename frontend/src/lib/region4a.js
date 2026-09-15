import rawData from '../data/region4A.json' with { type: 'json' };

const regionData = rawData?.['4A']?.province_list || {};

// Pre-parse municipalities and barangays map for O(1) lookups
const MUNICIPALITIES = [];
const BARANGAY_MAP = new Map();

for (const [province, provData] of Object.entries(regionData)) {
    const muniList = provData?.municipality_list || [];
    for (const muniObj of muniList) {
        for (const [muniName, mData] of Object.entries(muniObj)) {
            const key = `${province}:${muniName}`;
            const barangays = Array.isArray(mData?.barangay_list)
                ? [...mData.barangay_list].sort((a, b) => a.localeCompare(b))
                : [];

            MUNICIPALITIES.push({
                key,
                municipality: muniName,
                province,
                label: `${muniName}, ${province}`,
            });

            BARANGAY_MAP.set(key, barangays);
        }
    }
}

// Sort alphabetically by municipality name, then province
MUNICIPALITIES.sort((a, b) => {
    const nameComp = a.municipality.localeCompare(b.municipality);
    return nameComp !== 0 ? nameComp : a.province.localeCompare(b.province);
});

/**
 * Returns all Region 4A municipalities with their province.
 * @returns {Array<{ key: string, municipality: string, province: string, label: string }>}
 */
export function getMunicipalities() {
    return MUNICIPALITIES;
}

/**
 * Returns barangay list for a specific municipality key (format: "PROVINCE:MUNICIPALITY").
 * @param {string} municipalityKey
 * @returns {string[]}
 */
export function getBarangays(municipalityKey) {
    if (!municipalityKey) return [];
    return BARANGAY_MAP.get(municipalityKey) || [];
}

/**
 * Builds standard destination string for the permit application.
 * @param {Object} params
 * @param {string} [params.street]
 * @param {string} params.barangay
 * @param {string} params.municipalityKey
 * @returns {string}
 */
export function buildDestinationString({ street, barangay, municipalityKey }) {
    if (!municipalityKey || !barangay) return '';
    const muni = MUNICIPALITIES.find(m => m.key === municipalityKey);
    if (!muni) return '';

    const parts = [];
    if (street && street.trim()) {
        parts.push(street.trim());
    }
    parts.push(`Barangay ${barangay}`);
    parts.push(muni.municipality);
    parts.push(muni.province);

    return parts.join(', ');
}
