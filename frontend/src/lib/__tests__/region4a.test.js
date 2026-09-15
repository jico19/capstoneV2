import test from 'node:test';
import assert from 'node:assert/strict';
import { getMunicipalities, getBarangays, buildDestinationString } from '../region4a.js';

test('getMunicipalities returns sorted list with province information', () => {
    const municipalities = getMunicipalities();
    assert.ok(Array.isArray(municipalities));
    assert.strictEqual(municipalities.length, 142);

    // Check Lucena City exists
    const lucena = municipalities.find(m => m.municipality === 'LUCENA CITY');
    assert.ok(lucena, 'LUCENA CITY should exist');
    assert.strictEqual(lucena.province, 'QUEZON');
    assert.strictEqual(lucena.key, 'QUEZON:LUCENA CITY');
});

test('getBarangays returns barangays for specific municipality key', () => {
    const barangays = getBarangays('QUEZON:LUCENA CITY');
    assert.ok(Array.isArray(barangays));
    assert.ok(barangays.length > 0);
    assert.ok(barangays.includes('COTTA'));
    assert.ok(barangays.includes('DALAHICAN'));

    // Sariaya check
    const sariayaBarangays = getBarangays('QUEZON:SARIAYA');
    assert.ok(sariayaBarangays.some(b => b.includes('LUTUCAN')));
});

test('getBarangays returns empty array for invalid key', () => {
    assert.deepStrictEqual(getBarangays(''), []);
    assert.deepStrictEqual(getBarangays(null), []);
    assert.deepStrictEqual(getBarangays('INVALID:KEY'), []);
});

test('buildDestinationString formats destination with and without street address', () => {
    const withoutStreet = buildDestinationString({
        municipalityKey: 'QUEZON:LUCENA CITY',
        barangay: 'COTTA'
    });
    assert.strictEqual(withoutStreet, 'Barangay COTTA, LUCENA CITY, QUEZON');

    const withStreet = buildDestinationString({
        street: 'Purok Maligaya, Slaughterhouse compound',
        municipalityKey: 'QUEZON:LUCENA CITY',
        barangay: 'COTTA'
    });
    assert.strictEqual(withStreet, 'Purok Maligaya, Slaughterhouse compound, Barangay COTTA, LUCENA CITY, QUEZON');
});

test('buildDestinationString returns empty string if missing required parts', () => {
    assert.strictEqual(buildDestinationString({ municipalityKey: '', barangay: 'COTTA' }), '');
    assert.strictEqual(buildDestinationString({ municipalityKey: 'QUEZON:LUCENA CITY', barangay: '' }), '');
    assert.strictEqual(buildDestinationString({}), '');
});
