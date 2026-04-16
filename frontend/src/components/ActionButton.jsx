import React from 'react';

/**
 * Global ActionGroup Component
 * Used in tables and lists for consistent row actions.
 * Style: Flat, Sharp, Minimal. Strictly adheres to GEMINI.md.
 */
const ActionGroup = ({ buttons = [] }) => {
    return (
        <div className="flex items-center justify-end gap-0">
            {buttons.map((btn, i) => {
                const Icon = btn.icon;

                // Semantic check for destructive actions
                const labelLower = btn.label.toLowerCase();
                const isDestructive =
                    labelLower === 'delete' ||
                    labelLower === 'reject' ||
                    labelLower === 'cancel';

                return (
                    <div
                        key={i}
                        className="group relative"
                    >
                        {/* Custom Flat Tooltip - Replacing DaisyUI tooltip for full control */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-none whitespace-nowrap z-10 pointer-events-none">
                            {btn.label}
                        </div>

                        <button
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent row click events
                                btn.onclick();
                            }}
                            disabled={btn.disable}
                            className={`
                                /* Fixed Dimensions - Sharp Square */
                                h-10 w-10 flex items-center justify-center
                                
                                /* Border Management: Collapses middle borders to look unified */
                                border border-gray-200 -ml-[1px] first:ml-0
                                
                                /* Flat Styling: No radius, no shadows */
                                rounded-none bg-white transition-all duration-75
                                
                                /* Interaction States - High Contrast Semantic Fills */
                                ${btn.disable
                                    ? "bg-gray-50 text-gray-200 border-gray-100 cursor-not-allowed"
                                    : isDestructive
                                        ? "text-gray-400 hover:bg-red-600 hover:text-white hover:border-red-600"
                                        : "text-gray-400 hover:bg-green-600 hover:text-white hover:border-green-600"
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