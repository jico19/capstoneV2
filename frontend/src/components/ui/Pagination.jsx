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
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-stone-200 bg-white px-4 py-4 sm:px-6 gap-4">
            <div className="text-center sm:text-left">
                <p className="text-[10px] font-black uppercase tracking-wider text-stone-500">
                    Showing <span className="text-stone-800 font-mono font-bold">{count > 0 ? offset + 1 : 0}</span> to{' '}
                    <span className="text-stone-800 font-mono font-bold">{Math.min(offset + limit, count)}</span> of{' '}
                    <span className="text-stone-800 font-mono font-bold">{count}</span> results
                </p>
            </div>
            
            <nav className="inline-flex items-center gap-1" aria-label="Pagination">
                <button
                    disabled={currentPage === 1}
                    onClick={() => onPageChange((currentPage - 2) * limit)}
                    className="h-8 w-8 flex items-center justify-center border border-stone-200 bg-white text-stone-500 hover:bg-stone-50 hover:text-stone-800 disabled:opacity-30 disabled:hover:bg-white rounded-lg shadow-2xs transition-colors"
                >
                    <span className="sr-only">Previous</span>
                    <ChevronLeft size={16} />
                </button>
                
                {getPageNumbers().map((page, index) => (
                    <React.Fragment key={index}>
                        {page === '...' ? (
                            <span className="h-8 px-2 flex items-center justify-center text-xs font-black text-stone-400">
                                <MoreHorizontal size={14} />
                            </span>
                        ) : (
                            <button
                                onClick={() => onPageChange((page - 1) * limit)}
                                className={`h-8 min-w-[2rem] px-2.5 text-xs font-black uppercase rounded-md transition-all shadow-2xs ${
                                    currentPage === page
                                        ? 'bg-green-700 border border-green-700 text-white'
                                        : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
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
                    className="h-8 w-8 flex items-center justify-center border border-stone-200 bg-white text-stone-500 hover:bg-stone-50 hover:text-stone-800 disabled:opacity-30 disabled:hover:bg-white rounded-lg shadow-2xs transition-colors"
                >
                    <span className="sr-only">Next</span>
                    <ChevronRight size={16} />
                </button>
            </nav>
        </div>
    );
};

export default Pagination;
