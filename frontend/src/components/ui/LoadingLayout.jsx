import { LoadingContext } from './loadingContext';

/** Share a read's loading state without introducing a competing page layout. */
export default function LoadingLayout({ loading, children, label = 'Loading content...' }) {
    return (
        <LoadingContext.Provider value={loading}>
            {loading && <span role="status" className="sr-only">{label}</span>}
            {children}
        </LoadingContext.Provider>
    );
}
