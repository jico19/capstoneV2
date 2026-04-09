

const ActionGroup = ({ buttons = [] }) => {
    
    return (
        <div className="flex items-center justify-center-safe gap-1">
            {buttons.map((btn, i) => {
                const Icon = btn.icon;
                const isDestructive = btn.label.toLowerCase() === 'delete' || btn.label.toLowerCase() === 'reject';

                return (
                    <div key={i} className="tooltip tooltip-top" data-tip={btn.label}>
                        <button
                            onClick={btn.onclick}
                            disabled={btn.disable}
                            className={`
                                btn btn-square btn-sm border-base-300
                                ${isDestructive
                                    ? "hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                    : "hover:bg-primary/10 hover:text-primary hover:border-primary/20"}
                                bg-white transition-all
                            `}
                        >
                            {Icon && <Icon size={16} />}
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

export default ActionGroup;