import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '/src/lib/api';

const MAX_RETRIES = 8;
const POLL_INTERVAL = 4000;

const PaymentSuccess = () => {
    const [status, setStatus] = useState('verifying');
    const { issued_permit_id } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        if (!issued_permit_id) return;

        let attempts = 0;
        let timeoutId;

        const verify = async () => {
            try {
                const res = await api.post(`/payment/${issued_permit_id}/verify_paymongo_session/`);
                console.log(res.data)

                if (res.data.verified) {
                    setStatus('success');
                    setTimeout(() => navigate('/farmer/'), 3000);
                }

                // not yet paid, retry
                attempts++;
                if (attempts < MAX_RETRIES) {
                    timeoutId = setTimeout(verify, POLL_INTERVAL);
                } else {
                    setStatus('error');
                }
            } catch (err) {
                console.error(err.response);
                setStatus('error');
            }
        };

        verify();

        return () => clearTimeout(timeoutId); // cleanup on unmount
    }, [issued_permit_id]);

    if (status === 'verifying') return (
        <div className="p-10 text-center">
            <p>Verifying your payment...</p>
            <p className="text-sm text-slate-400 mt-2">This may take a few seconds.</p>
        </div>
    );

    return (
        <div className="max-w-md mx-auto p-10 mt-20 bg-white shadow-xl rounded-2xl text-center">
            {status === 'success' ? (
                <>
                    <h1 className="text-2xl font-bold text-green-600">Payment Successful!</h1>
                    <p className="mt-4 text-slate-500">Your permit is now being generated.</p>
                    <button onClick={() => navigate('/farmer/dashboard')} className="btn btn-primary mt-6">
                        Go to Dashboard
                    </button>
                </>
            ) : (
                <>
                    <h1 className="text-2xl font-bold text-red-600">Verification Failed.</h1>
                    <p className="mt-2 text-slate-500">Contact support if you were charged.</p>
                </>
            )}
        </div>
    );
};

export default PaymentSuccess;