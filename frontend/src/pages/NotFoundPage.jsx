import React from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowLeft } from 'lucide-react';

/**
 * Not Found (404) Page
 * Strictly adheres to Design.MD: Stone neutrals, flat UI, square edges.
 * Uses plain language per the Project Guidelines.
 */
const NotFoundPage = () => {
    return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white border border-stone-200 p-10 lg:p-16 text-center space-y-8 rounded-none">
                
                {/* 1. Visual Icon */}
                <div className="flex justify-center">
                    <div className="p-6 bg-stone-50 border border-stone-200 text-stone-300 rounded-none relative">
                        <Search size={48} strokeWidth={1.5} />
                        <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-stone-800 text-white text-[10px] font-black uppercase tracking-widest">
                            Error 404
                        </div>
                    </div>
                </div>

                {/* 2. Text Content */}
                <div className="space-y-3">
                    <h1 className="text-3xl font-black text-stone-800 uppercase tracking-tighter leading-none">
                        Page Not Found
                    </h1>
                    <p className="text-sm font-medium text-stone-500 leading-relaxed">
                        We couldn't find that page. It might have been moved or the link you followed is broken.
                    </p>
                </div>

                {/* 3. Action Button */}
                <div className="pt-4">
                    <Link 
                        to="/" 
                        className="inline-flex items-center justify-center gap-2 w-full bg-green-700 hover:bg-green-600 text-white px-8 py-4 text-xs font-black uppercase tracking-widest rounded-none transition-colors"
                    >
                        <ArrowLeft size={16} />
                        Return to Home
                    </Link>
                </div>

                {/* 4. Support Metadata */}
                <div className="pt-4 border-t border-stone-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-300">
                        LivestockPass Municipal Portal
                    </p>
                </div>
            </div>
        </div>
    );
};

export default NotFoundPage;
