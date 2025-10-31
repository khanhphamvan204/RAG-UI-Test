// src/components/DocumentsView.jsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Upload, Edit2, Trash2, Eye, X, FileText, Calendar, User, Key, Users, Book, Loader2, Link2, Hash } from 'lucide-react';
import { useAuth } from './AuthContext';
import { apiRequest, API_CONFIG } from './api';

// Custom Hook: useDebounce
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};

// Component con để hiển thị một cặp key-value trong modal chi tiết
const DetailItem = ({ icon, label, value }) => {
    if (value === null || value === undefined || value === '') return null;
    return (
        <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl p-4 border border-gray-200/50 transition-all hover:shadow-sm">
            <div className="flex items-center gap-2 mb-2">
                {icon}
                <p className="text-sm font-semibold text-gray-600">{label}</p>
            </div>
            <p className="text-base text-gray-900 font-medium break-words">{value}</p>
        </div>
    );
};

// Backdrop chung cho tất cả modal
const ModalBackdrop = ({ children }) => (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all duration-300">
        {children}
    </div>
);

const DocumentsView = () => {
    const { user, isReady, logout } = useAuth();

    const isMountedRef = useRef(true);
    const currentRequestRef = useRef(null);

    // States
    const [documents, setDocuments] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loadingData, setLoadingData] = useState(true);
    const [searchLoading, setSearchLoading] = useState(false);
    const [totalDocuments, setTotalDocuments] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [error, setError] = useState('');
    const perPage = 10;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadedBy, setUploadedBy] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const [editingDocument, setEditingDocument] = useState(null);
    const [editFilename, setEditFilename] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    const [deletingDocument, setDeletingDocument] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [selectedDocument, setSelectedDocument] = useState(null);
    const [documentDetails, setDocumentDetails] = useState(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    const debouncedSearchQuery = useDebounce(searchQuery, 500);

    useEffect(() => {
        return () => { isMountedRef.current = false; };
    }, []);

    useEffect(() => {
        if (user?.full_name) {
            setUploadedBy(user.full_name);
        } else if (user?.user_code) {
            setUploadedBy(user.user_code);
        }
    }, [user]);

    const fetchDocuments = useCallback(async (search, page) => {
        if (!isReady || !isMountedRef.current) return;
        const requestId = Date.now();
        currentRequestRef.current = requestId;
        setLoadingData(page === 1 && !search);
        setSearchLoading(!!search);
        setError('');
        try {
            const skip = (page - 1) * perPage;
            const params = new URLSearchParams({ limit: perPage.toString(), skip: skip.toString() });
            if (search) params.append('q', search);
            const endpoint = `${API_CONFIG.ENDPOINTS.DOCUMENTS_LIST}?${params}`;
            const response = await apiRequest(endpoint, {}, true);
            if (currentRequestRef.current !== requestId || !isMountedRef.current) return;
            if (response.ok) {
                const data = await response.json();
                setDocuments(data.documents || []);
                setTotalDocuments(data.total || 0);
            } else {
                if (response.status === 401) { setError('Phiên đăng nhập hết hạn.'); logout(); }
                else { const err = await response.json().catch(() => ({})); setError(err.detail || 'Lỗi tải danh sách.'); }
                setDocuments([]);
                setTotalDocuments(0);
            }
        } catch (error) {
            if (isMountedRef.current) { setError(`Lỗi kết nối: ${error.message}`); }
        } finally {
            if (isMountedRef.current) { setLoadingData(false); setSearchLoading(false); }
        }
    }, [isReady, perPage, logout]);

    const fetchDocumentDetails = useCallback(async (documentId) => {
        if (!isReady || !documentId) return;
        setIsLoadingDetails(true);
        setDocumentDetails(null);
        try {
            const endpoint = `${API_CONFIG.ENDPOINTS.DOCUMENT_DETAILS}/${documentId}`;
            const response = await apiRequest(endpoint, {}, true);
            if (response.ok) {
                const data = await response.json();
                setDocumentDetails(data.document);
                setError('');
            } else {
                if (response.status === 401) logout();
                const err = await response.json().catch(() => ({}));
                throw new Error(err.detail || `HTTP error ${response.status}`);
            }
        } catch (error) {
            setError(`Lỗi khi tải chi tiết: ${error.message}`);
        } finally {
            setIsLoadingDetails(false);
        }
    }, [isReady, logout]);

    const handleAPIAction = useCallback(async (action, errorMessage) => {
        setError('');
        try {
            const response = await action();
            if (!response.ok) {
                if (response.status === 401) { setError('Phiên đăng nhập hết hạn.'); logout(); return { success: false }; }
                const errorData = await response.json().catch(() => ({}));
                setError(`${errorMessage}: ${errorData.detail || `Lỗi không xác định`}`);
                return { success: false };
            }
            fetchDocuments(debouncedSearchQuery, currentPage);
            return { success: true };
        } catch (error) {
            setError(`${errorMessage}: ${error.message}`);
            return { success: false };
        }
    }, [debouncedSearchQuery, currentPage, fetchDocuments, logout]);

    const handleDelete = async (docId) => {
        setIsDeleting(true);
        const result = await handleAPIAction(() => apiRequest(`${API_CONFIG.ENDPOINTS.VECTOR_DELETE}/${docId}`, { method: 'DELETE' }), 'Không thể xóa');
        if (result.success) {
            setIsDeleteModalOpen(false);
            setDeletingDocument(null);
        }
        setIsDeleting(false);
    };

    const handleUpdate = async () => {
        if (!editingDocument) return;
        setIsUpdating(true);
        const formData = new FormData();
        formData.append('filename', editFilename.replace(/\.[^/.]+$/, ''));
        const result = await handleAPIAction(() => apiRequest(`${API_CONFIG.ENDPOINTS.VECTOR_UPDATE}/${editingDocument._id}`, { method: 'PUT', body: formData }), 'Không thể cập nhật');
        if (result.success) {
            setIsEditModalOpen(false);
            setEditingDocument(null);
        }
        setIsUpdating(false);
    };

    const handleUpload = async () => {
        if (!selectedFile) { setError('Vui lòng chọn tệp.'); return; }
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('uploaded_by', uploadedBy);
        const result = await handleAPIAction(() => apiRequest(API_CONFIG.ENDPOINTS.VECTOR_ADD, { method: 'POST', body: formData }), 'Không thể tải lên');
        if (result.success) {
            setIsModalOpen(false);
            resetUploadForm();
        }
        setIsUploading(false);
    };

    const resetUploadForm = useCallback(() => {
        setSelectedFile(null);
        // Dùng user hiện tại thay vì lưu state cũ
        if (user?.full_name) {
            setUploadedBy(user.full_name);
        } else if (user?.user_code) {
            setUploadedBy(user.user_code);
        }
    }, [user]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const validExtensions = ['.pdf', '.txt', '.docx', '.csv33', '.xlsx', '.xls'];
            const fileExtension = file.name.toLowerCase().match(/\.[^/.]+$/);
            if (!fileExtension || !validExtensions.includes(fileExtension[0])) {
                setError('Định dạng tệp không được hỗ trợ.');
                setSelectedFile(null);
            } else {
                setSelectedFile(file);
                setError('');
            }
        }
    };

    const openEditModal = (doc) => {
        setEditingDocument(doc);
        setEditFilename(doc.filename);
        setIsEditModalOpen(true);
    };

    const openDeleteModal = (doc) => {
        setDeletingDocument(doc);
        setIsDeleteModalOpen(true);
    };

    const openDetailsModal = (doc) => {
        setSelectedDocument(doc);
        setIsDetailsModalOpen(true);
        fetchDocumentDetails(doc._id);
    };

    useEffect(() => {
        if (isReady) {
            fetchDocuments(debouncedSearchQuery, currentPage);
        }
    }, [debouncedSearchQuery, currentPage, isReady, fetchDocuments]);

    const handleSearchChange = useCallback((query) => {
        setSearchQuery(query);
        setCurrentPage(1);
    }, []);

    if (!isReady) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="animate-spin h-16 w-16 text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg font-medium">Đang khởi tạo...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            <div className="max-w-7xl mx-auto p-6 space-y-6">
                {/* Header */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Quản lý Tài liệu</h1>
                            <p className="text-gray--gray-500 mt-1">Tải lên, chỉnh sửa và theo dõi tài liệu của bạn</p>
                        </div>
                        <button
                            onClick={() => { resetUploadForm(); setIsModalOpen(true); }}
                            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                            <Upload size={20} />
                            <span className="font-semibold">Thêm Tài liệu</span>
                        </button>
                    </div>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4 shadow-md animate-pulse">
                        <div className="flex items-center justify-between">
                            <p className="text-red-800 font-medium">{error}</p>
                            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Search Bar */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-4 border border-white/20">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm tài liệu..."
                            value={searchQuery}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
                        />
                        {searchLoading && (
                            <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 animate-spin text-blue-600" size={20} />
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-white/20">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Tên tài liệu</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Người tải lên</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Ngày tạo</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {loadingData || searchLoading ? (
                                    <tr>
                                        <td colSpan="4" className="text-center py-16">
                                            <Loader2 className="animate-spin h-10 w-10 text-blue-600 mx-auto" />
                                        </td>
                                    </tr>
                                ) : documents.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="text-center py-16 text-gray-500 font-medium">
                                            Không có tài liệu nào.
                                        </td>
                                    </tr>
                                ) : (
                                    documents.map((doc) => (
                                        <tr key={doc._id} className="hover:bg-blue-50/50 transition-colors duration-200">
                                            <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                                                <FileText size={18} className="text-blue-600" />
                                                {doc.filename}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">{doc.uploaded_by}</td>
                                            <td className="px-6 py-4 text-gray-600">{new Date(doc.createdAt).toLocaleDateString('vi-VN')}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => openDetailsModal(doc)} className="p-2.5 text-blue-600 hover:bg-blue-100 rounded-xl transition-all duration-200 transform hover:scale-110">
                                                        <Eye size={18} />
                                                    </button>
                                                    <button onClick={() => openEditModal(doc)} className="p-2.5 text-green-600 hover:bg-green-100 rounded-xl transition-all duration-200 transform hover:scale-110">
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button onClick={() => openDeleteModal(doc)} className="p-2.5 text-red-600 hover:bg-red-100 rounded-xl transition-all duration-200 transform hover:scale-110">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                {totalDocuments > perPage && (
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-4 border border-white/20 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <p className="text-sm text-gray-600">
                            Hiển thị {((currentPage - 1) * perPage) + 1} - {Math.min(currentPage * perPage, totalDocuments)} trên {totalDocuments} tài liệu
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(c => c - 1)}
                                disabled={currentPage === 1}
                                className="px-5 py-2.5 border border-gray-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all duration-200 font-medium"
                            >
                                Trước
                            </button>
                            <span className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-md">
                                {currentPage}
                            </span>
                            <button
                                onClick={() => setCurrentPage(c => c + 1)}
                                disabled={currentPage * perPage >= totalDocuments}
                                className="px-5 py-2.5 border border-gray-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all duration-200 font-medium"
                            >
                                Sau
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Upload Modal */}
            {isModalOpen && (
                <ModalBackdrop>
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-300">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <Upload size={24} className="text-blue-600" />
                            Thêm Tài liệu Mới
                        </h2>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Chọn tệp</label>
                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    accept=".pdf,.txt,.docx,.csv,.xlsx,.xls"
                                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-colors cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                                {selectedFile && (
                                    <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
                                        <FileText size={16} /> Đã chọn: <span className="font-medium">{selectedFile.name}</span>
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Người tải lên</label>
                                <div className="flex items-center gap-2">
                                    <User size={18} className="text-gray-500" />
                                    <input
                                        type="text"
                                        value={uploadedBy}
                                        disabled
                                        className="flex-1 px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-700 cursor-not-allowed font-medium"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    Tài khoản: <span className="font-medium">{user?.user_code || 'N/A'}</span>
                                    {user?.full_name && ` – ${user.full_name}`}
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-6 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 font-medium transition-all"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={isUploading || !selectedFile}
                                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        Đang tải lên...
                                    </>
                                ) : (
                                    'Tải lên'
                                )}
                            </button>
                        </div>
                    </div>
                </ModalBackdrop>
            )}

            {/* Edit Modal - KHÔNG CHO SỬA uploaded_by */}
            {isEditModalOpen && editingDocument && (
                <ModalBackdrop>
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-300">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <Edit2 size={24} className="text-green-600" />
                            Chỉnh sửa Tên Tài liệu
                        </h2>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Tên tài liệu</label>
                                <input
                                    type="text"
                                    value={editFilename.replace(/\.[^/.]+$/, '')}
                                    onChange={(e) => {
                                        const ext = editingDocument.filename.match(/\.[^/.]+$/);
                                        setEditFilename(e.target.value + (ext ? ext[0] : ''));
                                    }}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                                />
                                <p className="text-xs text-gray-500 mt-1">Phần mở rộng: {editingDocument.filename.match(/\.[^/.]+$/)?.[0] || ''}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Người tải lên</label>
                                <input
                                    type="text"
                                    value={editingDocument.uploaded_by}
                                    disabled
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-100 text-gray-600 cursor-not-allowed"
                                />
                                <p className="text-xs text-gray-500 mt-1">Không thể thay đổi người tải lên</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="px-6 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 font-medium transition-all"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleUpdate}
                                disabled={isUpdating}
                                className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                            >
                                {isUpdating ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        Đang cập nhật...
                                    </>
                                ) : (
                                    'Cập nhật'
                                )}
                            </button>
                        </div>
                    </div>
                </ModalBackdrop>
            )}

            {/* Delete Modal */}
            {isDeleteModalOpen && deletingDocument && (
                <ModalBackdrop>
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl text-center animate-in fade-in zoom-in duration-300">
                        <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
                            <Trash2 size={36} className="text-red-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Xác nhận xóa</h2>
                        <p className="text-gray-600 mb-6">
                            Bạn có chắc muốn xóa tài liệu <span className="font-bold text-red-600">"{deletingDocument.filename}"</span>?
                        </p>
                        <div className="flex justify-center gap-3">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="px-6 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 font-medium transition-all"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={() => handleDelete(deletingDocument._id)}
                                disabled={isDeleting}
                                className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 disabled:opacity-50 font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        Đang xóa...
                                    </>
                                ) : (
                                    'Xóa'
                                )}
                            </button>
                        </div>
                    </div>
                </ModalBackdrop>
            )}

            {/* ==================== MODAL CHI TIẾT ==================== */}
            {isDetailsModalOpen && (
                <ModalBackdrop>
                    <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] shadow-2xl flex flex-col">
                        {/* Header */}
                        <div className="flex justify-between items-center mb-6 pb-4 border-b">
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                <FileText className="w-7 h-7 text-blue-600" />
                                Chi tiết tài liệu
                            </h2>
                            <button
                                onClick={() => setIsDetailsModalOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Body – scrollable */}
                        <div className="flex-1 overflow-y-auto space-y-5 pr-2">
                            {isLoadingDetails ? (
                                // Loading skeleton
                                <div className="space-y-4">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                                    ))}
                                </div>
                            ) : documentDetails ? (
                                <>
                                    {/* 1. Tên tài liệu */}
                                    <div className="flex items-start gap-3">
                                        <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-gray-600">Tên tài liệu</p>
                                            <p className="text-base font-medium text-gray-900 break-all">
                                                {documentDetails.filename}
                                            </p>
                                        </div>
                                    </div>

                                    {/* 2. Người tải lên */}
                                    <div className="flex items-start gap-3">
                                        <User className="w-5 h-5 text-green-600 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-gray-600">Người tải lên</p>
                                            <p className="text-base font-medium text-gray-900">
                                                {documentDetails.uploaded_by}
                                            </p>
                                        </div>
                                    </div>

                                    {/* 3. Ngày tạo */}
                                    <div className="flex items-start gap-3">
                                        <Calendar className="w-5 h-5 text-purple-600 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-gray-600">Ngày tạo</p>
                                            <p className="text-base font-medium text-gray-900">
                                                {new Date(documentDetails.createdAt).toLocaleString('vi-VN')}
                                            </p>
                                        </div>
                                    </div>

                                    {/* 4. Đường dẫn (URL) */}
                                    <div className="flex items-start gap-3">
                                        <Link2 className="w-5 h-5 text-indigo-600 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-gray-600">Đường dẫn</p>
                                            <p className="text-sm font-mono text-gray-700 bg-gray-50 p-2 rounded-lg break-all">
                                                {documentDetails.url}
                                            </p>
                                        </div>
                                    </div>

                                    {/* 5. ID tài liệu */}
                                    <div className="flex items-start gap-3">
                                        <Hash className="w-5 h-5 text-orange-600 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-gray-600">ID tài liệu</p>
                                            <p className="text-sm font-mono text-gray-700 bg-gray-50 p-2 rounded-lg">
                                                {documentDetails._id}
                                            </p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <p className="text-center text-gray-500 py-8">Không tải được chi tiết.</p>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="mt-6 pt-4 border-t flex justify-end">
                            <button
                                onClick={() => setIsDetailsModalOpen(false)}
                                className="px-6 py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 font-medium transition-all"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </ModalBackdrop>
            )}
        </div>
    );
};

export default DocumentsView;