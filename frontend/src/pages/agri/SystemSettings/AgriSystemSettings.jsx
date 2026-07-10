import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { toast } from 'sonner';
import {
    SlidersHorizontal,
    Calendar,
    Save,
    RefreshCw,
    Receipt,
    Info,
    CheckCircle2,
} from 'lucide-react';

const SettingField = ({ label, description, children }) => (
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 py-5 border-b border-stone-100 last:border-b-0">
        <div className="flex-1">
            <p className="text-xs font-black text-stone-800 uppercase tracking-widest">{label}</p>
            {description && <p className="text-[10px] text-stone-400 font-medium mt-1 leading-relaxed max-w-xs">{description}</p>}
        </div>
        <div className="flex-shrink-0 w-full md:w-52">{children}</div>
    </div>
);

const SectionCard = ({ icon: Icon, title, subtitle, children }) => (
    <section className="bg-white border border-stone-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex items-center gap-3">
            <div className="p-1.5 bg-green-50 border border-green-100">
                <Icon size={15} className="text-green-700" />
            </div>
            <div>
                <h2 className="text-[10px] font-black text-stone-700 uppercase tracking-widest">{title}</h2>
                {subtitle && <p className="text-[10px] text-stone-400 font-medium mt-0.5">{subtitle}</p>}
            </div>
        </div>
        <div className="px-6">{children}</div>
    </section>
);

const AgriSystemSettings = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const [config, setConfig] = useState({
        vet_health_cert_fee: 50.00,
        transport_pass_fee: 50.00,
        local_transport_permit_fee: 50.00,
        validity_days: 3,
    });

    const totalFee = (
        parseFloat(config.vet_health_cert_fee || 0) +
        parseFloat(config.transport_pass_fee || 0) +
        parseFloat(config.local_transport_permit_fee || 0)
    );

    useEffect(() => {
        const fetchConfig = async () => {
            setIsLoading(true);
            try {
                const res = await api.get('/municipal-config/');
                if (res.data) {
                    setConfig({
                        vet_health_cert_fee: res.data.vet_health_cert_fee ?? 50.00,
                        transport_pass_fee: res.data.transport_pass_fee ?? 50.00,
                        local_transport_permit_fee: res.data.local_transport_permit_fee ?? 50.00,
                        validity_days: res.data.validity_days ?? 3,
                    });
                    if (res.data.updated_at) {
                        setLastSaved(new Date(res.data.updated_at));
                    }
                }
            } catch (err) {
                toast.error('Failed to load system settings.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchConfig();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const payload = {
                vet_health_cert_fee: parseFloat(config.vet_health_cert_fee),
                transport_pass_fee: parseFloat(config.transport_pass_fee),
                local_transport_permit_fee: parseFloat(config.local_transport_permit_fee),
                validity_days: parseInt(config.validity_days),
            };

            const res = await api.post('/municipal-config/', payload);
            if (res.data.updated_at) setLastSaved(new Date(res.data.updated_at));
            toast.success('System settings saved.', {
                description: `Total permit fee is now ₱${totalFee.toFixed(2)}.`
            });
        } catch (err) {
            const detail = err.response?.data;
            if (detail && typeof detail === 'object') {
                const firstError = Object.values(detail)[0];
                toast.error('Validation Error', { description: Array.isArray(firstError) ? firstError[0] : firstError });
            } else {
                toast.error('Failed to save system settings.');
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (field, value) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] bg-white">
                <div className="w-10 h-10 border-4 border-green-700 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-4">Loading system settings...</p>
            </div>
        );
    }

    return (
        <div className="min-h-full bg-stone-50/50">

            {/* Page Header */}
            <div className="bg-white border-b border-stone-200 px-6 md:px-10 py-8">
                <div className="max-w-2xl">
                    <div className="flex items-center gap-2 mb-2">
                        <SlidersHorizontal size={13} className="text-stone-400" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Agri Office</p>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-stone-900 uppercase tracking-tighter leading-none">
                        System Settings
                    </h1>
                    <p className="text-xs text-stone-500 font-medium mt-2">
                        Configure global fee structures and permit rules for the entire FarmPass system.
                    </p>
                    {lastSaved && (
                        <p className="text-[10px] text-stone-400 font-medium mt-3 flex items-center gap-1.5">
                            <CheckCircle2 size={11} className="text-green-600" />
                            Last saved: {lastSaved.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                    )}
                </div>
            </div>

            <form onSubmit={handleSave}>
                <div className="px-6 md:px-10 py-8 space-y-5">

                    {/* Permit Fee Breakdown */}
                    <SectionCard
                        icon={Receipt}
                        title="Permit Fee Breakdown"
                        subtitle="Each component is summed to form the total permit fee"
                    >
                        <SettingField
                            label="Veterinary Health Certificate"
                            description="Fee for official vet health certification of transported livestock."
                        >
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm font-black select-none">₱</span>
                                <input
                                    type="number" min="0" step="0.01"
                                    value={config.vet_health_cert_fee}
                                    onChange={(e) => handleChange('vet_health_cert_fee', e.target.value)}
                                    className="w-full h-10 pl-8 pr-3 bg-white border border-stone-200 text-sm font-bold text-stone-800 focus:outline-none focus:border-green-700 rounded-none"
                                />
                            </div>
                        </SettingField>

                        <SettingField
                            label="Transport Pass"
                            description="Fee for the official livestock transport pass per trip."
                        >
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm font-black select-none">₱</span>
                                <input
                                    type="number" min="0" step="0.01"
                                    value={config.transport_pass_fee}
                                    onChange={(e) => handleChange('transport_pass_fee', e.target.value)}
                                    className="w-full h-10 pl-8 pr-3 bg-white border border-stone-200 text-sm font-bold text-stone-800 focus:outline-none focus:border-green-700 rounded-none"
                                />
                            </div>
                        </SettingField>

                        <SettingField
                            label="Local Transport Permit"
                            description="Municipal-level fee for intra-local livestock transport."
                        >
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm font-black select-none">₱</span>
                                <input
                                    type="number" min="0" step="0.01"
                                    value={config.local_transport_permit_fee}
                                    onChange={(e) => handleChange('local_transport_permit_fee', e.target.value)}
                                    className="w-full h-10 pl-8 pr-3 bg-white border border-stone-200 text-sm font-bold text-stone-800 focus:outline-none focus:border-green-700 rounded-none"
                                />
                            </div>
                        </SettingField>

                        {/* Live Total */}
                        <div className="flex items-center justify-between py-4 border-t-2 border-stone-100">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-stone-500">Total Permit Fee</p>
                                <p className="text-[10px] text-stone-400 font-medium">Auto-computed from the 3 components above</p>
                            </div>
                            <span className="text-xl font-black text-green-700 font-mono tabular-nums">
                                ₱{totalFee.toFixed(2)}
                            </span>
                        </div>
                    </SectionCard>

                    {/* Validity */}
                    <SectionCard
                        icon={Calendar}
                        title="Permit Validity Period"
                        subtitle="How many days a transport permit stays valid after being issued"
                    >
                        <SettingField
                            label="Validity Duration"
                            description="Permits expire automatically after this many days. Minimum is 1 day."
                        >
                            <div className="flex items-center gap-2">
                                <input
                                    type="number" min="1" step="1"
                                    value={config.validity_days}
                                    onChange={(e) => handleChange('validity_days', e.target.value)}
                                    className="w-full h-10 px-3 bg-white border border-stone-200 text-sm font-bold text-stone-800 focus:outline-none focus:border-green-700 rounded-none text-center"
                                />
                                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest whitespace-nowrap">days</span>
                            </div>
                        </SettingField>
                    </SectionCard>

                    {/* Note */}
                    <div className="flex items-start gap-3 bg-stone-50 border border-stone-200 px-5 py-4">
                        <Info size={13} className="text-stone-400 mt-0.5 flex-shrink-0" />
                        <p className="text-[10px] text-stone-500 font-medium leading-relaxed">
                            These are global defaults. Changes take effect on all newly issued permits. Officers can still override the fee amount on individual applications.
                        </p>
                    </div>

                    {/* Save */}
                    <div className="flex justify-end pb-10">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="bg-green-700 hover:bg-green-600 disabled:opacity-60 text-white px-10 py-3.5 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2 rounded-none"
                        >
                            {isSaving
                                ? <><RefreshCw size={13} className="animate-spin" /> Saving...</>
                                : <><Save size={13} /> Save System Settings</>
                            }
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default AgriSystemSettings;
