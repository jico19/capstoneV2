import { useState } from 'react';
import { FileText, Printer, RotateCcw } from 'lucide-react';
import useAuthStore from '../../../store/authStore';

const PRINT_STYLES = `
@media print {
    @page { size: A4; margin: 0; }
    html, body { height: auto !important; background: #fff !important; }
    body * { visibility: hidden !important; }
    #cis-print-area, #cis-print-area * { visibility: visible !important; }
    #cis-print-area {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        padding: 2cm;
        margin: 0;
        border: none;
        box-shadow: none;
        font-family: 'Times New Roman', Times, serif;
        font-size: 14pt;
        color: #000;
        background: #fff;
    }
    #cis-print-area * {
        color: #000 !important;
        background: #fff !important;
        border-color: #000 !important;
    }
}
`;

const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const formatShipmentDate = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) return iso;
    return `${months[m - 1]} ${String(d).padStart(2, '0')}, ${y}`;
};

const Blank = ({ minWidth, value = '' }) => (
    <span
        className="inline-block text-center border-b-2 border-stone-900 align-baseline px-1"
        style={{ minWidth }}
    >
        {value}
    </span>
);

const initialForm = {
    proprietorName: '',
    businessName: '',
    origin: '',
    numberText: '',
    numberDigit: '',
    destination: '',
    shipmentDate: '',
};

const CISGeneratorPage = () => {
    const { user } = useAuthStore();
    const barangayName = user?.barangay_name || 'Your Barangay';

    const [form, setForm] = useState(initialForm);

    const setField = (key) => (e) => {
        setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };

    const handleReset = () => setForm(initialForm);

    const fields = [
        { key: 'proprietorName', label: 'Farmer / Shipper Name', type: 'text', placeholder: 'e.g. Juan Dela Cruz' },
        { key: 'businessName', label: 'Business / Trucking Name', type: 'text', placeholder: 'e.g. Dela Cruz Trucking Services' },
        { key: 'origin', label: 'Origin Farm Address', type: 'text', placeholder: 'Farm or address of shipment' },
        { key: 'numberText', label: 'Number of Pigs (word form)', type: 'text', placeholder: 'e.g. TEN' },
        { key: 'numberDigit', label: 'Number of Pigs (digit)', type: 'number', placeholder: 'e.g. 10' },
        { key: 'destination', label: 'Destination', type: 'text', placeholder: 'e.g. Metro Manila' },
        { key: 'shipmentDate', label: 'Shipment Date', type: 'date' },
    ];

    return (
        <div className="p-4 md:p-8 space-y-6 bg-stone-50/50 min-h-full">
            <style>{PRINT_STYLES}</style>

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-stone-200 pb-6 gap-4">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Barangay {barangayName}</p>
                    <h1 className="text-2xl md:text-3xl font-black text-stone-800 uppercase tracking-tighter mt-1">CIS Generator</h1>
                    <p className="text-sm text-stone-500 font-medium mt-2">Fill the form, then print a ready-to-sign Certificate of Immediate Slaughter for your farmer.</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={handleReset}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-none transition-colors"
                    >
                        <RotateCcw size={14} /> Reset
                    </button>
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 text-white px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-none transition-colors"
                    >
                        <Printer size={14} /> Print
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Form */}
                <section className="bg-white border border-stone-200 p-6 h-fit">
                    <h2 className="text-[10px] font-black uppercase tracking-widest text-stone-400 border-b border-stone-100 pb-3">Certificate Details</h2>

                    <form className="mt-6 space-y-5" onSubmit={(e) => e.preventDefault()}>
                        {fields.map(({ key, label, type, placeholder }) => (
                            <div key={key} className="space-y-1.5">
                                <label
                                    htmlFor={`cis-${key}`}
                                    className="text-[10px] font-black uppercase tracking-widest text-stone-500"
                                >
                                    {label} <span className="text-red-600">*</span>
                                </label>
                                <input
                                    id={`cis-${key}`}
                                    type={type}
                                    value={form[key]}
                                    onChange={setField(key)}
                                    placeholder={placeholder}
                                    className="input input-bordered w-full rounded-none text-sm bg-stone-50 focus:border-stone-500"
                                />
                            </div>
                        ))}
                    </form>
                </section>

                {/* Print Preview */}
                <section className="bg-white border border-stone-200 p-6 h-fit">
                    <h2 className="text-[10px] font-black uppercase tracking-widest text-stone-400 border-b border-stone-100 pb-3 mb-6">Print Preview</h2>

                    <div id="cis-print-area" className="bg-white border border-stone-200 px-8 py-10 font-serif text-stone-900 leading-relaxed">
                        {/* Letterhead */}
                        <div className="text-center text-base">
                            <p>Republic of the Philippines</p>
                            <p className="font-bold">MUNICIPALITY OF SARIAYA</p>
                            <p>Province of Quezon</p>
                            <div className="mx-auto w-2/3 border-t-2 border-stone-900 mt-4" />
                        </div>

                        {/* Title */}
                        <div className="text-center mt-8">
                            <h3 className="text-2xl font-bold tracking-wide">CERTIFICATE OF IMMEDIATE SLAUGHTER</h3>
                            <h4 className="text-2xl font-bold tracking-wide mt-2">FOR SLAUGHTER ANIMALS</h4>
                            <p className="font-bold mt-5 text-lg">Barangay {barangayName}, Sariaya, Quezon</p>
                        </div>

                        {/* Body */}
                        <div className="mt-12 text-lg text-center leading-loose">
                            <p>
                                This is to certify that <Blank minWidth="6rem" value={form.numberText} /> (<Blank minWidth="2.5rem" value={form.numberDigit} />) of swine
                            </p>
                            <p>
                                from <Blank minWidth="10rem" value={form.origin} /> shipped on <Blank minWidth="7rem" value={formatShipmentDate(form.shipmentDate)} />
                            </p>
                            <p>
                                to <Blank minWidth="8rem" value={form.destination} /> are for immediate slaughter within
                            </p>
                            <p>twenty-four (24) hours.</p>
                        </div>

                        {/* Signature Block */}
                        <div className="mt-14 w-80 space-y-1">
                            <p className="border-b-2 border-stone-900 h-7 text-lg">{form.proprietorName}</p>
                            <p className="pt-1 text-base font-bold tracking-widest">PROPRIETOR / SHIPPER</p>
                            <p className="border-b-2 border-stone-900 h-7 text-lg mt-1">{form.businessName}</p>
                        </div>
                    </div>

                    <p className="mt-4 flex items-start gap-2 text-[10px] font-medium text-stone-400 leading-relaxed">
                        <FileText size={14} className="shrink-0 mt-0.5" />
                        Print uses your browser's print dialog. A blank PDF template is also available from the backend for download.
                    </p>
                </section>
            </div>
        </div>
    );
};

export default CISGeneratorPage;