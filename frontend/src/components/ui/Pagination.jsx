import React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

/**
 * Reusable Pagination Component
 * Follows the project's Flat UI style: rounded-none, strict colors, black typography.
 */
const Pagination = ({ count, limit, offset, onPageChange }) => {
    const totalPages = Math.ceil(count / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    if (count === 0) return null;

    const getPageNumbers = () => {
        const pages = [];
        const delta = 1;

        for (let i = 1; i <= totalPages; i++) {
            if (
                i === 1 || 
                i === totalPages || 
                (i >= currentPage - delta && i <= currentPage + delta)
            ) {
                pages.push(i);
            } else if (
                i === currentPage - delta - 1 || 
                i === currentPage + delta + 1
            ) {
                pages.push('...');
            }
        }
        return [...new Set(pages)];
    };

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-gray-200 bg-white px-4 py-6 sm:px-8 gap-4">
            <div className="text-center sm:text-left">
                <p className="text-[10px] font-black uppercase text-gray-400">
                    Showing <span className="text-gray-900 font-mono">{count > 0 ? offset + 1 : 0}</span> to{' '}
                    <span className="text-gray-900 font-mono">{Math.min(offset + limit, count)}</span> of{' '}
                    <span className="text-gray-900 font-mono">{count}</span> results
                </p>
            </div>
            
            <nav className="isolate inline-flex -space-x-px shadow-sm" aria-label="Pagination">
                <button
                    disabled={currentPage === 1}
                    onClick={() => onPageChange((currentPage - 2) * limit)}
                    className="relative inline-flex items-center border border-gray-300 bg-white p-2 text-gray-400 hover:bg-gray-50 focus:z-20 disabled:opacity-30 rounded-none transition-colors"
                >
                    <span className="sr-only">Previous</span>
                    <ChevronLeft size={16} />
                </button>
                
                {getPageNumbers().map((page, index) => (
                    <React.Fragment key={index}>
                        {page === '...' ? (
                            <span className="relative inline-flex items-center border border-gray-300 bg-white px-4 py-2 text-xs font-black text-gray-400 rounded-none">
                                <MoreHorizontal size={14} />
                            </span>
                        ) : (
                            <button
                                onClick={() => onPageChange((page - 1) * limit)}
                                className={`relative inline-flex items-center border px-4 py-2 text-xs font-black uppercase focus:z-20 rounded-none transition-all ${
                                    currentPage === page
                                        ? 'z-10 bg-gray-900 border-gray-900 text-white'
                                        : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
                                }`}
                            >
                                {page}
                            </button>
                        )}
                    </React.Fragment>
                ))}

                <button
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() => onPageChange(currentPage * limit)}
                    className="relative inline-flex items-center border border-gray-300 bg-white p-2 text-gray-400 hover:bg-gray-50 focus:z-20 disabled:opacity-30 rounded-none transition-colors"
                >
                    <span className="sr-only">Next</span>
                    <ChevronRight size={16} />
                </button>
            </nav>
        </div>
    );
};

export default Pagination;
