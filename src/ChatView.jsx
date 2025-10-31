import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { Send, Bot, RefreshCw, RotateCcw } from 'lucide-react';
import { apiRequest, safeJsonParse, API_CONFIG } from './api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Hàm tạo thread_id mới
const generateThreadId = () => {
    return `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const ChatView = () => {
    const { token, isReady } = useAuth();
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentThreadId, setCurrentThreadId] = useState(null);
    const messagesEndRef = useRef(null);

    // Tạo thread_id mới khi mount
    useEffect(() => {
        const newThreadId = generateThreadId();
        setCurrentThreadId(newThreadId);
        console.log('New thread created:', newThreadId);
    }, []);

    // Tự động cuộn xuống cuối
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Reset cuộc trò chuyện
    const handleResetConversation = () => {
        setMessages([]);
        const newThreadId = generateThreadId();
        setCurrentThreadId(newThreadId);
        console.log('Conversation reset. New thread:', newThreadId);
    };

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || isLoading || !currentThreadId) return;

        const userMessage = {
            id: Date.now(),
            type: 'user',
            content: inputMessage,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMessage]);
        const query = inputMessage.trim();
        setInputMessage('');
        setIsLoading(true);

        try {
            if (!isReady || !token) {
                throw new Error('Vui lòng đăng nhập để tiếp tục');
            }

            const response = await apiRequest(API_CONFIG.ENDPOINTS.PROCESS_QUERY, {
                method: 'POST',
                body: JSON.stringify({
                    query: query,
                    thread_id: currentThreadId
                })
            }, true);

            if (!response.ok) {
                const err = await safeJsonParse(response).catch(() => ({}));
                throw new Error(err.error || `Lỗi server: ${response.status}`);
            }

            const data = await safeJsonParse(response);

            if (data.status !== 'success' || !data.data) {
                throw new Error(data.error || 'Phản hồi không hợp lệ');
            }

            // Cập nhật thread_id từ server (nếu có)
            if (data.thread_id) {
                setCurrentThreadId(data.thread_id);
            }

            // Xử lý nội dung theo search_type
            let content = '';
            let metadata = {};

            if (data.data.search_type === 'rag' && data.data.answer) {
                content = data.data.answer;
                metadata.searchType = 'rag';
            } else if (data.data.search_type === 'direct' && data.data.message) {
                content = data.data.message;
                metadata.searchType = 'direct';
            } else {
                content = 'Không có phản hồi từ AI.';
            }

            const aiMessage = {
                id: Date.now() + 1,
                type: 'ai',
                content,
                timestamp: new Date(),
                metadata
            };

            setMessages(prev => [...prev, aiMessage]);

        } catch (error) {
            const errorMessage = {
                id: Date.now() + 1,
                type: 'ai',
                content: `Xin lỗi, đã xảy ra lỗi: *${error.message}*. Vui lòng thử lại.`,
                timestamp: new Date(),
                metadata: { searchType: 'error' }
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-blue-50 to-indigo-50">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Bot className="w-6 h-6 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Trò chuyện với AI</h3>
                        {currentThreadId && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                ID: {currentThreadId.substring(0, 12)}...
                            </span>
                        )}
                    </div>
                    <button
                        onClick={handleResetConversation}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Làm mới cuộc trò chuyện"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Làm mới
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && !isLoading && (
                    <div className="text-center py-16">
                        <div className="w-20 h-20 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                            <Bot className="w-12 h-12 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Chào bạn!</h3>
                        <p className="text-gray-600 max-w-md mx-auto">
                            Tôi có thể trả lời câu hỏi dựa trên tài liệu hoặc trò chuyện tự do. Hãy hỏi gì đó nhé!
                        </p>
                    </div>
                )}

                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-3xl px-5 py-3 rounded-2xl shadow-sm ${message.type === 'user'
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                                : message.metadata?.searchType === 'rag'
                                    ? 'bg-white border border-green-200 shadow-green-100'
                                    : message.metadata?.searchType === 'direct'
                                        ? 'bg-white border border-blue-200 shadow-blue-100'
                                        : 'bg-white border border-gray-200'
                                }`}
                        >
                            {/* Nội dung Markdown */}
                            <div className={`prose prose-sm max-w-none ${message.type === 'user' ? 'prose-invert' : ''}`}>
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {message.content}
                                </ReactMarkdown>
                            </div>

                            {/* Tag loại tìm kiếm */}
                            {message.metadata?.searchType && message.type === 'ai' && (
                                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-200/50">
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${message.metadata.searchType === 'rag'
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-blue-100 text-blue-700'
                                        }`}>
                                        {message.metadata.searchType === 'rag' ? 'Tìm kiếm tài liệu' : 'Trò chuyện tự do'}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {message.timestamp.toLocaleTimeString('vi-VN')}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {/* Loading */}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-gray-200 shadow-sm px-5 py-3 rounded-2xl flex items-center gap-3">
                            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                            <span className="text-gray-600 font-medium">AI đang xử lý...</span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 bg-white/90 backdrop-blur-sm p-4">
                <div className="flex gap-3 w-full">
                    <textarea
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Nhập câu hỏi của bạn... (Enter để gửi)"
                        className="flex-1 min-h-12 px-5 py-3 border border-gray-300 rounded-2xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 text-base placeholder:text-gray-400"
                        rows="2"
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={!inputMessage.trim() || isLoading}
                        className="min-w-32 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <RefreshCw className="w-5 h-5 animate-spin" />
                                <span>Đang gửi...</span>
                            </>
                        ) : (
                            <>
                                <Send className="w-5 h-5" />
                                <span>Gửi</span>
                            </>
                        )}
                    </button>
                </div>
                <p className="text-xs text-gray-500 text-center mt-2.5">
                    Nhấn <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs font-medium">Enter</kbd> để gửi •{' '}
                    <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs font-medium">Shift + Enter</kbd> để xuống dòng
                </p>
            </div>
        </div>
    );
};

export default ChatView;