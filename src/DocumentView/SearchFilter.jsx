import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';

const SearchFilter = ({
    searchQuery,
    setSearchQuery,
    fileTypeFilter,
    setFileTypeFilter,
    fileTypes,
    setCurrentPage,
    searchLoading = false
}) => {
    // Refs để maintain focus
    const searchInputRef = useRef(null);
    const selectRef = useRef(null);

    // Auto-focus search input on mount and when searchQuery or searchLoading changes
    useEffect(() => {
        if (searchInputRef.current && !searchLoading) {
            searchInputRef.current.focus();
        }
    }, [searchQuery, searchLoading]);

    // Memoize handlers để tránh re-create
    const handleSearchChange = useCallback((e) => {
        const value = e.target.value;
        setSearchQuery(value);
        setCurrentPage(1);
    }, [setSearchQuery, setCurrentPage]);

    const handleFilterChange = useCallback((e) => {
        const value = e.target.value;
        setFileTypeFilter(value);
        setCurrentPage(1);
    }, [setFileTypeFilter, setCurrentPage]);

    // Memoize fileTypes options để tránh re-render
    const fileTypeOptions = useMemo(() => (
        fileTypes.map((type) => (
            <option key={type} value={type}>
                {type}
            </option>
        ))
    ), [fileTypes]);

    // Memoize loading indicator
    const loadingIndicator = useMemo(() => (
        searchLoading && (
            <div className="absolute right-4 top-3.5">
                <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
            </div>
        )
    ), [searchLoading]);

    return (
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                    <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        placeholder="Tìm kiếm tài liệu..."
                        className="w-full px-4 py-3 pl-12 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                        disabled={searchLoading}
                        autoComplete="off"
                    />
                    <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                    {loadingIndicator}
                </div>
                <select
                    ref={selectRef}
                    value={fileTypeFilter}
                    onChange={handleFilterChange}
                    className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all duration-200 min-w-[200px]"
                    disabled={searchLoading}
                >
                    <option value="">Tất cả loại tài liệu</option>
                    {fileTypeOptions}
                </select>
            </div>

            {/* Loading indicator cho toàn bộ search filter */}
            {searchLoading && (
                <div className="mt-4 flex items-center justify-center">
                    <div className="flex items-center space-x-2 text-blue-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Đang tìm kiếm...</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(SearchFilter);