import React from 'react';

/**
 * Global ActionGroup Component
 * Used in tables and lists for consistent row actions.
 * Style: Flat, Sharp, Minimal.
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
                        className="tooltip tooltip-top"
                        data-tip={btn.label}
                    >
                        <button
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent row click events
                                btn.onclick();
                            }}
                            disabled={btn.disable}
                            className={`
                /* Layout */
                btn btn-square btn-sm h-9 w-9
                
                /* Border Management: Collapses middle borders to look unified */
                border border-gray-200 -ml-[1px] first:ml-0
                
                /* Flat Styling */
                rounded-none bg-white transition-colors duration-150
                
                /* Interaction States */
                ${btn.disable
                                    ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                                    : isDestructive
                                        ? "text-gray-500 hover:bg-red-600 hover:text-white hover:border-red-600"
                                        : "text-gray-600 hover:bg-green-700 hover:text-white hover:border-green-700"
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