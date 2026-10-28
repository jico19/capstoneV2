import LoadingField from '../../components/ui/LoadingField';
import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import {
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
            <p className="text-xs font-bold text-stone-800 tracking-wide">{label}</p>
            {description && (
                <p className="text-xs text-stone-500 font-normal mt-1 leading-relaxed max-w-md">
                    {description}
                </p>
            )}
        </div>
        <div className="shrink-0 w-full md:w-56">{children}</div>
    </div>
);

const SectionCard = ({ icon: Icon, title, subtitle, children }) => (
    <section className="bg-white border border-stone-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex items-center gap-3">
            <div className="p-1.5 bg-green-50 border border-green-200 rounded-lg">
                <Icon size={16} className="text-green-700" />
            </div>
            <div>
                <h2 className="text-xs font-bold text-stone-800 uppercase tracking-wide">{title}</h2>
                {subtitle && <p className="text-xs text-stone-500 font-normal mt-0.5">{subtitle}</p>}
            </div>
        </div>
        <div className="px-6">{children}</div>
    </section>
);

/**
 * Municipal System Configuration
 * Allows authorized Agri officers to calibrate standard regulatory fees and permit validity rules.
 */
const MunicipalSystemConfig = () => {
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
            } catch {
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
                description: `Total municipal permit fee is now ₱${totalFee.toFixed(2)}.`
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


    return (
        <form onSubmit={handleSave} className="space-y-6" aria-busy={isLoading}>
            {isLoading && <span role="status" className="sr-only">Loading municipal settings...</span>}
            {/* Status indicator if previously saved */}
            {lastSaved && (
                <div className="flex items-center gap-1.5 text-xs text-stone-500">
                    <CheckCircle2 size={13} className="text-green-700" />
                    <span>Last synchronized: {lastSaved.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
            )}

            {/* Permit Fee Breakdown */}
            <SectionCard
                icon={Receipt}
                title="Municipal Permit Fee Breakdown"
                subtitle="Standard regulatory fees assessed during transport permit checkout"
            >
                <SettingField
                    label="Veterinary Health Certificate"
                    description="Standard fee for clinical inspection and issuance of official health certificate."
                >
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm font-bold select-none">₱</span>
                        <LoadingField loading={isLoading}><input
                            type="number"
                            min="0"
                            step="0.01"
                            value={config.vet_health_cert_fee}
                            onChange={(e) => handleChange('vet_health_cert_fee', e.target.value)}
                            className="w-full h-10 pl-8 pr-3 bg-white border border-stone-200 text-sm font-semibold text-stone-900 focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700/20 rounded-lg shadow-2xs font-mono"
                        /></LoadingField>
                    </div>
                </SettingField>

                <SettingField
                    label="Transport Pass"
                    description="Official municipality transport clearance fee per transit vehicle."
                >
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm font-bold select-none">₱</span>
                        <LoadingField loading={isLoading}><input
                            type="number"
                            min="0"
                            step="0.01"
                            value={config.transport_pass_fee}
                            onChange={(e) => handleChange('transport_pass_fee', e.target.value)}
                            className="w-full h-10 pl-8 pr-3 bg-white border border-stone-200 text-sm font-semibold text-stone-900 focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700/20 rounded-lg shadow-2xs font-mono"
                        /></LoadingField>
                    </div>
                </SettingField>

                <SettingField
                    label="Local Transport Permit"
                    description="Regulatory livestock transit fee under Sariaya Municipal Tax Ordinance."
                >
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm font-bold select-none">₱</span>
                        <LoadingField loading={isLoading}><input
                            type="number"
                            min="0"
                            step="0.01"
                            value={config.local_transport_permit_fee}
                            onChange={(e) => handleChange('local_transport_permit_fee', e.target.value)}
                            className="w-full h-10 pl-8 pr-3 bg-white border border-stone-200 text-sm font-semibold text-stone-900 focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700/20 rounded-lg shadow-2xs font-mono"
                        /></LoadingField>
                    </div>
                </SettingField>

                {/* Auto-Calculated Total */}
                <div className="flex items-center justify-between py-4 border-t border-stone-100">
                    <div>
                        <p className="text-xs font-bold text-stone-800">Total Statutory Fee</p>
                        <p className="text-xs text-stone-500 font-normal">Sum calculated across all 3 regulatory components</p>
                    </div>
                    <span className="text-xl font-bold text-green-700 font-mono tabular-nums">
                        ₱{totalFee.toFixed(2)}
                    </span>
                </div>
            </SectionCard>

            {/* Validity Duration */}
            <SectionCard
                icon={Calendar}
                title="Permit Validity Window"
                subtitle="Prescribed maximum lifespan of transport clearances before required re-inspection"
            >
                <SettingField
                    label="Validity Duration"
                    description="Issued permits expire automatically after this number of days (minimum 1 day)."
                >
                    <div className="flex items-center gap-2">
                        <LoadingField loading={isLoading}><input
                            type="number"
                            min="1"
                            step="1"
                            value={config.validity_days}
                            onChange={(e) => handleChange('validity_days', e.target.value)}
                            className="w-full h-10 px-3 bg-white border border-stone-200 text-sm font-semibold text-stone-900 focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700/20 rounded-lg shadow-2xs text-center font-mono"
                        /></LoadingField>
                        <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider shrink-0">days</span>
                    </div>
                </SettingField>
            </SectionCard>

            {/* Municipal Context Note */}
            <div className="flex items-start gap-3 bg-stone-50 border border-stone-200 px-5 py-4 rounded-xl">
                <Info size={16} className="text-stone-400 mt-0.5 shrink-0" />
                <p className="text-xs text-stone-600 leading-relaxed">
                    Changes take immediate effect across newly created permit applications. Authorized officers may still adjust or waive fees during individual permit reviews under statutory guidelines.
                </p>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pb-8">
                <button
                    type="submit"
                    disabled={isLoading || isSaving}
                    className="btn-tactile bg-green-700 hover:bg-green-600 disabled:opacity-60 text-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 rounded-lg shadow-xs cursor-pointer"
                >
                    {isSaving ? (
                        <><RefreshCw size={14} className="animate-spin" /> Saving Configuration...</>
                    ) : (
                        <><Save size={14} /> Save Municipal Settings</>
                    )}
                </button>
            </div>
        </form>
    );
};

export default MunicipalSystemConfig;
