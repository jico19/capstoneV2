/**
 * Converts a positive integer to uppercase English words.
 * Example: 15 -> "FIFTEEN", 1500 -> "ONE THOUSAND FIVE HUNDRED"
 */
export function numberToWords(num) {
    if (num === null || num === undefined || String(num).trim() === '' || isNaN(num)) return '';
    const n = Math.floor(Math.abs(Number(num)));
    if (n === 0) return 'ZERO';

    const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
    const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
    const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];

    function convertChunk(num) {
        let str = '';
        if (num >= 100) {
            str += ones[Math.floor(num / 100)] + ' HUNDRED ';
            num %= 100;
        }
        if (num >= 10 && num <= 19) {
            str += teens[num - 10] + ' ';
        } else if (num >= 20) {
            str += tens[Math.floor(num / 10)] + (num % 10 !== 0 ? '-' + ones[num % 10] : '') + ' ';
        } else if (num > 0) {
            str += ones[num] + ' ';
        }
        return str;
    }

    let result = '';
    if (n >= 1000000) {
        result += convertChunk(Math.floor(n / 1000000)) + 'MILLION ';
        const rem = n % 1000000;
        if (rem > 0) result += convertChunk(rem);
    } else if (n >= 1000) {
        result += convertChunk(Math.floor(n / 1000)) + 'THOUSAND ';
        const rem = n % 1000;
        if (rem > 0) result += convertChunk(rem);
    } else {
        result = convertChunk(n);
    }

    return result.trim().toUpperCase();
}

/**
 * Converts English word representation (e.g. "TEN", "TWENTY-FIVE") or numeric string back to an integer.
 * Returns null if phrase cannot be parsed into a number.
 */
export function wordsToNumber(wordsStr) {
    if (!wordsStr || String(wordsStr).trim() === '') return null;
    const clean = String(wordsStr).trim().toUpperCase();
    if (!isNaN(Number(clean))) return Math.floor(Math.abs(Number(clean)));

    const unitsMap = {
        'ZERO': 0, 'ONE': 1, 'TWO': 2, 'THREE': 3, 'FOUR': 4, 'FIVE': 5, 'SIX': 6,
        'SEVEN': 7, 'EIGHT': 8, 'NINE': 9, 'TEN': 10, 'ELEVEN': 11,
        'TWELVE': 12, 'THIRTEEN': 13, 'FOURTEEN': 14, 'FIFTEEN': 15,
        'SIXTEEN': 16, 'SEVENTEEN': 17, 'EIGHTEEN': 18, 'NINETEEN': 19,
    };
    const tensMap = {
        'TWENTY': 20, 'THIRTY': 30, 'FORTY': 40, 'FIFTY': 50,
        'SIXTY': 60, 'SEVENTY': 70, 'EIGHTY': 80, 'NINETY': 90,
    };

    let total = 0;
    let current = 0;
    const tokens = clean.split(/[\s-]+/);

    for (const token of tokens) {
        if (!token) continue;
        if (unitsMap[token] !== undefined) {
            current += unitsMap[token];
        } else if (tensMap[token] !== undefined) {
            current += tensMap[token];
        } else if (token === 'HUNDRED') {
            current *= 100;
        } else if (token === 'THOUSAND') {
            total += (current || 1) * 1000;
            current = 0;
        } else if (token === 'MILLION') {
            total += (current || 1) * 1000000;
            current = 0;
        } else {
            return null;
        }
    }

    return total + current;
}

/**
 * Converts a currency amount (number or string) to Title Case English words with Pesos/Cents suffix.
 * Example: 1500.00 -> "One Thousand Five Hundred Pesos Only"
 * Example: 1500 border / string -> "One Thousand Five Hundred Pesos Only"
 */
export function currencyToWords(amount) {
    if (amount === null || amount === undefined) return '';
    const cleanStr = String(amount).replace(/[^0-9.]/g, '');
    const num = parseFloat(cleanStr);
    if (isNaN(num)) return '';

    const pesos = Math.floor(Math.abs(num));
    const cents = Math.round((Math.abs(num) - pesos) * 100);

    const rawWords = numberToWords(pesos);
    if (!rawWords || rawWords === 'ZERO') {
        if (cents > 0) {
            const centWords = numberToWords(cents).toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            return `${centWords} Cents Only`;
        }
        return 'Zero Pesos Only';
    }

    const titleCaseWords = rawWords
        .toLowerCase()
        .split(' ')
        .map(w => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
        .join(' ');

    if (cents > 0) {
        const centWords = numberToWords(cents)
            .toLowerCase()
            .split(' ')
            .map(w => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
            .join(' ');
        return `${titleCaseWords} Pesos And ${centWords} Cents Only`;
    }

    return `${titleCaseWords} Pesos Only`;
}
