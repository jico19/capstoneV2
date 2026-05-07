import { getRelativeTime, getIconInfo } from './notifcationHelper';




const NotificationItem = ({ notif }) => {
    const { icon: Icon, color } = getIconInfo(notif.type);
    return (
        <div className={`p-4 flex gap-4 ${notif.is_read ? 'bg-white' : 'bg-green-50/30'}`}>
            <div className={`shrink-0 w-10 h-10 flex items-center justify-center border border-stone-200 bg-white ${color}`}>
                <Icon size={20} strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                    <h3 className={`text-xs font-black uppercase tracking-tight truncate ${notif.is_read ? 'text-stone-500' : 'text-stone-900'}`}>
                        {notif.title}
                    </h3>
                    <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest pl-2">
                        {getRelativeTime(notif.sent_at)}
                    </span>
                </div>
                <p className={`text-xs leading-relaxed mt-0.5 ${notif.is_read ? 'text-stone-500' : 'text-stone-700'}`}>
                    {notif.message}
                </p>
            </div>
        </div>
    );
};

export default NotificationItem