import React from 'react';
import { FileText, User, Building, Eye, Edit2, Trash2, Cloud, RefreshCw } from 'lucide-react';

const DocumentsTable = ({ documents, loading, openDetailsModal, openEditModal, openDeleteModal }) => {
    return (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Tên tài liệu
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Loại
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Người tải lên
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Ngày tạo
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Quyền truy cập
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Hành động
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                    <div className="flex items-center justify-center">
                                        <RefreshCw className="h-8 w-8 animate-spin mr-3 text-blue-500" />
                                        <span className="text-lg font-medium">Đang tải...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : documents.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-16 text-center text-gray-500">
                                    <Cloud className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                    <p className="text-lg font-medium mb-2">Chưa có tài liệu nào</p>
                                    <p className="text-sm text-gray-400">Thử thay đổi bộ lọc hoặc thêm tài liệu mới</p>
                                </td>
                            </tr>
                        ) : (
                            documents.map((doc, index) => {
                                // Tính userCount
                                const userCount = Array.isArray(doc.role?.user)
                                    ? doc.role.user.length
                                    : doc.role?.user ? 1 : 0;
                                // Tính deptCount
                                const deptCount = Array.isArray(doc.role?.subject)
                                    ? doc.role.subject.length
                                    : doc.role?.subject ? 1 : 0;
                                return (
                                    <tr key={doc._id} className={`hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center mr-3">
                                                    <FileText className="h-5 w-5 text-white" />
                                                </div>
                                                <div>
                                                    <span className="text-sm font-semibold text-gray-900">{doc.filename}</span>
                                                    <p className="text-xs text-gray-500">Tệp tài liệu</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {doc.file_type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center mr-2">
                                                    <span className="text-white text-xs font-bold">
                                                        {doc.uploaded_by?.charAt(0)?.toUpperCase() || 'U'}
                                                    </span>
                                                </div>
                                                <span className="text-sm text-gray-900 font-medium">{doc.uploaded_by}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {new Date(doc.createdAt).toLocaleDateString('vi-VN', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {userCount > 0 && (
                                                    <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-600">
                                                        <User className="h-3 w-3 mr-1" />
                                                        {userCount} {userCount === 1 ? 'người' : 'người'}
                                                    </div>
                                                )}
                                                {deptCount > 0 && (
                                                    <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                                                        <Building className="h-3 w-3 mr-1" />
                                                        {deptCount} {deptCount === 1 ? 'phòng ban' : 'phòng ban'}
                                                    </div>
                                                )}
                                                {(userCount === 0 && deptCount === 0) && (
                                                    <span className="text-xs text-gray-400">Công khai</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => openDetailsModal(doc)}
                                                    className="p-2 text-green-600 hover:text-green-800 hover:bg-green-100 rounded-lg transition-all duration-200"
                                                    title="Xem chi tiết"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => openEditModal(doc)}
                                                    className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-all duration-200"
                                                    title="Chỉnh sửa"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => openDeleteModal(doc)}
                                                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-all duration-200"
                                                    title="Xóa"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DocumentsTable;