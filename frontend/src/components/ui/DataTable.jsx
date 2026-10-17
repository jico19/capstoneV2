import { Inbox, Loader2 } from "lucide-react";
import Pagination from "./Pagination";

/**
 * Universal DataTable Component
 * Strictly conforms to FarmPass Design System Version 2.0 (Design.MD):
 * - Flat UI, rounded-none, stone neutral borders and subtle background tiers.
 * - Stone-50 uppercase tracking-widest headers.
 * - Standardized empty states with centered icons and concise captions.
 * - Built-in loading state indicator.
 * - Optional integrated pagination.
 * - Optional mobile renderer slot for responsive card layouts.
 */
const DataTable = ({
    columns = [],
    data = [],
    keyField = "id",
    isLoading = false,
    loadingMessage = "Loading records...",
    emptyState = {},
    onRowClick,
    minWidth = "800px",
    className = "",
    pagination = null,
    mobileRenderer = null,
}) => {
    const {
        icon: EmptyIcon = Inbox,
        title: emptyTitle = "No records found",
        description: emptyDescription = "",
        action: emptyAction = null,
    } = emptyState;

    const getRowKey = (row, index) => {
        if (typeof keyField === "function") {
            return keyField(row, index);
        }
        return row[keyField] ?? index;
    };

    const getAlignmentClass = (align) => {
        if (align === "center") return "text-center";
        if (align === "right") return "text-right";
        return "text-left";
    };

    return (
        <div className={`border border-stone-200 bg-white rounded-xl overflow-hidden shadow-xs ${className}`}>
            {/* Optional Mobile Card View Slot */}
            {mobileRenderer && (
                <div className="block sm:hidden">
                    {isLoading ? (
                        <div className="p-4 space-y-3">
                            {[1, 2, 3].map((item) => (
                                <div key={item} className="p-4 border border-stone-200 rounded-xl space-y-2.5">
                                    <div className="skeleton-shimmer h-4 w-1/3 rounded-md" />
                                    <div className="skeleton-shimmer h-3 w-3/4 rounded-md" />
                                    <div className="skeleton-shimmer h-3 w-1/2 rounded-md" />
                                </div>
                            ))}
                        </div>
                    ) : data.length === 0 ? (
                        <div className="py-16 px-4 bg-stone-50/30 flex flex-col items-center justify-center text-center">
                            <EmptyIcon size={40} className="text-stone-300 mb-3" />
                            <p className="text-xs font-black uppercase tracking-wider text-stone-600">
                                {emptyTitle}
                            </p>
                            {emptyDescription && (
                                <p className="text-[11px] font-medium text-stone-400 mt-1 max-w-xs">
                                    {emptyDescription}
                                </p>
                            )}
                            {emptyAction && <div className="mt-4">{emptyAction}</div>}
                        </div>
                    ) : (
                        mobileRenderer(data)
                    )}
                </div>
            )}

            {/* Desktop / Responsive Table View */}
            <div className={`overflow-x-auto w-full ${mobileRenderer ? "hidden sm:block" : ""}`}>
                <table
                    className="w-full text-left border-collapse"
                    style={{ minWidth }}
                    aria-busy={isLoading}
                >
                    {isLoading && <caption className="sr-only">{loadingMessage}</caption>}
                    <thead className="bg-stone-50 border-b border-stone-200 text-[10px] font-black uppercase tracking-widest text-stone-600">
                        <tr>
                            {columns.map((col, idx) => (
                                <th
                                    key={col.key || col.accessor || idx}
                                    style={col.width ? { width: col.width } : undefined}
                                    className={`px-6 py-4.5 font-black ${getAlignmentClass(col.align)} ${
                                        col.headerClassName || ""
                                    }`}
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-xs text-stone-800">
                        {isLoading ? (
                            <>
                                {[1, 2, 3, 4].map((item) => (
                                    <tr key={item} className="animate-pulse">
                                        {columns.map((col, colIdx) => (
                                            <td key={colIdx} className="px-6 py-4.5">
                                                <div 
                                                    className="skeleton-shimmer h-4 rounded-md" 
                                                    style={{ width: `${Math.max(40, (colIdx * 17 + 55) % 85)}%` }}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </>
                        ) : data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="py-20 bg-stone-50/30">
                                    <div className="flex flex-col items-center justify-center text-center px-4">
                                        <EmptyIcon size={44} className="text-stone-300 mb-3" />
                                        <p className="text-xs font-black uppercase tracking-wider text-stone-600">
                                            {emptyTitle}
                                        </p>
                                        {emptyDescription && (
                                            <p className="text-[11px] font-medium text-stone-400 mt-1 max-w-sm">
                                                {emptyDescription}
                                            </p>
                                        )}
                                        {emptyAction && <div className="mt-4">{emptyAction}</div>}
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            data.map((row, rowIndex) => (
                                <tr
                                    key={getRowKey(row, rowIndex)}
                                    onClick={() => onRowClick && onRowClick(row, rowIndex)}
                                    className={`transition-colors duration-100 ease-out ${
                                        onRowClick
                                            ? "cursor-pointer hover:bg-stone-50/90"
                                            : "hover:bg-stone-50/60"
                                    }`}
                                >
                                    {columns.map((col, colIndex) => {
                                        const value = col.accessor ? row[col.accessor] : undefined;
                                        return (
                                            <td
                                                key={col.key || col.accessor || colIndex}
                                                className={`px-6 py-4.5 ${getAlignmentClass(col.align)} ${
                                                    col.className || ""
                                                }`}
                                            >
                                                {col.render ? col.render(row, rowIndex) : (value ?? "—")}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Integrated Pagination Footer */}
            {pagination && pagination.count > 0 && (
                <Pagination
                    count={pagination.count}
                    limit={pagination.limit}
                    offset={pagination.offset}
                    onPageChange={pagination.onPageChange}
                />
            )}
        </div>
    );
};

export default DataTable;
