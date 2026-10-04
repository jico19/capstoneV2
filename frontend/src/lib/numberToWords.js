/**
 * Converts a positive integer to uppercase English words.
 * Example: 15 -> "FIFTEEN", 1500 -> "ONE THOUSAND FIVE HUNDRED"
 */
export function numberToWords(num) {
    if (num === null || num === undefined || isNaN(num)) return '';
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
