import React from 'react';

/**
 * Global ActionGroup Component
 * Used in tables and lists for consistent row actions.
 */
const ActionGroup = ({ buttons = [] }) => {
    return (
        <div className="flex items-center justify-end gap-1.5">
            {buttons.map((btn, i) => {
                const Icon = btn.icon;

                // Semantic check for destructive actions
                const label = btn.label || '';
                const labelLower = label.toLowerCase();
                const isDestructive =
                    labelLower === 'delete' ||
                    labelLower === 'reject' ||
                    labelLower === 'cancel';

                const handleClick = (e) => {
                    e.stopPropagation(); // Prevent row click events
                    const fn = btn.onClick || btn.onclick || btn.action;
                    if (typeof fn === 'function') {
                        fn(e);
                    }
                };

                const isDisabled = Boolean(btn.disabled || btn.disable);

                return (
                    <div
                        key={i}
                        className="group relative"
                    >
                        {/* Custom Flat Tooltip */}
                        {label && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-stone-800 text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md shadow-xs whitespace-nowrap z-50 pointer-events-none">
                                {label}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={handleClick}
                            disabled={isDisabled}
                            className={`
                                h-9 w-9 flex items-center justify-center
                                border border-stone-200
                                rounded-lg bg-white shadow-2xs transition-all duration-100
                                active:scale-[0.98]
                                ${isDisabled
                                    ? "bg-stone-50 text-stone-300 border-stone-100 cursor-not-allowed shadow-none"
                                    : isDestructive
                                        ? "text-stone-500 hover:bg-red-600 hover:text-white hover:border-red-600"
                                        : "text-stone-500 hover:bg-green-700 hover:text-white hover:border-green-700"
                                }
                            `}
                        >
                            {Icon && <Icon size={16} strokeWidth={2.5} />}
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

export default ActionGroup;