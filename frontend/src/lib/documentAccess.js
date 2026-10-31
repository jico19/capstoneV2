export function documentAccessNotice(error) {
    const detail = error?.response?.data?.detail || error?.response?.data?.error;
    if (error?.response?.status !== 403) return null;
    if (detail === 'This permit has not been paid for yet.') {
        return {
            title: 'Payment required',
            message: 'Please pay the permit fee to view and download these documents.',
        };
    }
    return {
        title: 'Document access denied',
        message: 'You don’t have permission to view this document. Please make sure you’re signed in to the correct account.',
    };
}
