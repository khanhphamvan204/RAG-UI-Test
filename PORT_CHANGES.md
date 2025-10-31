# Cập nhật Port và Thread ID Management

## 📝 Tổng kết thay đổi:

### 1. **API Configuration** (`src/api.js`)

#### Thay đổi cấu hình port:
```javascript
export const API_CONFIG = {
    USE_PROXY_FOR_AUTH: false,
    USE_PROXY_FOR_RAG: false,
    AUTH_BASE_URL: 'http://localhost:8000',  // ✅ Port 8000 cho đăng nhập
    RAG_BASE_URL: 'http://localhost:3636',   // ✅ Port 3636 cho các endpoint khác
    ENDPOINTS: {
        LOGIN: '/api/auth/login',              // → 8000
        DOCUMENTS_LIST: '/documents/list',     // → 3636
        VECTOR_ADD: '/documents/vector/add',   // → 3636
        VECTOR_UPDATE: '/documents/vector',    // → 3636
        VECTOR_DELETE: '/documents/vector',    // → 3636
        PROCESS_QUERY: '/documents/vector/process-query', // → 3636
    },
};
```

#### Cập nhật hàm `getFullUrl`:
```javascript
export const getFullUrl = (endpoint, isLoginEndpoint = false) => {
    if (isLoginEndpoint) {
        // Login sử dụng port 8000
        return API_CONFIG.USE_PROXY_FOR_AUTH ? endpoint : `${API_CONFIG.AUTH_BASE_URL}${endpoint}`;
    } else {
        // Các endpoint khác sử dụng port 3636
        return API_CONFIG.USE_PROXY_FOR_RAG ? endpoint : `${API_CONFIG.RAG_BASE_URL}${endpoint}`;
    }
};
```

#### Cập nhật hàm `apiRequest`:
- Tự động phát hiện endpoint LOGIN để dùng port 8000
- Các endpoint khác tự động dùng port 3636

### 2. **Chat View** (`src/ChatView.jsx`)

#### Thread ID Management:
```javascript
// Hàm tạo thread_id mới
const generateThreadId = () => {
    return `thread_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};
```

#### Behavior mới:
1. **Khởi tạo component**: Tạo thread_id ban đầu
2. **Mỗi lần hỏi**: Sinh ra thread_id **MỚI** (không dùng lại thread cũ)
3. **Nút "Làm mới"**: Reset messages + tạo thread_id mới

#### Code implementation:
```javascript
const ChatView = () => {
    const [currentThreadId, setCurrentThreadId] = useState(null);
    
    // Tạo thread_id khi mount
    useEffect(() => {
        const newThreadId = generateThreadId();
        setCurrentThreadId(newThreadId);
    }, []);
    
    // Reset conversation
    const handleResetConversation = () => {
        setMessages([]);
        const newThreadId = generateThreadId();
        setCurrentThreadId(newThreadId);
    };
    
    // Mỗi lần hỏi tạo thread_id mới
    const handleSendMessage = async () => {
        const newThreadId = generateThreadId();
        
        const response = await apiRequest(API_CONFIG.ENDPOINTS.PROCESS_QUERY, {
            method: 'POST',
            body: JSON.stringify({
                query: currentQuery,
                thread_id: newThreadId  // ✅ Thread mới cho mỗi câu hỏi
            })
        }, true);
        
        setCurrentThreadId(newThreadId);
    };
};
```

#### UI Changes:
- Thêm nút "Làm mới" với icon `RotateCcw`
- Hiển thị thread_id hiện tại (16 ký tự đầu)
- Reset toàn bộ messages khi click "Làm mới"

## 🔄 Flow hoạt động:

### Đăng nhập:
```
User → LoginForm → apiRequest(LOGIN) → http://localhost:8000/api/auth/login
```

### Upload/Manage Documents:
```
User → DocumentsView → apiRequest(VECTOR_ADD) → http://localhost:3636/documents/vector/add
```

### Chat với AI:
```
User → ChatView → apiRequest(PROCESS_QUERY) → http://localhost:3636/documents/vector/process-query

Mỗi lần hỏi:
1. Generate thread_id mới: thread_1730300000_abc123
2. Gửi request với thread_id mới
3. Nhận response
4. Lưu thread_id hiện tại (để hiển thị)
```

### Refresh Chat:
```
User click "Làm mới":
1. Xóa toàn bộ messages
2. Generate thread_id mới
3. Update currentThreadId state
4. UI reset về trạng thái ban đầu
```

## ⚙️ Cấu hình Backend cần thiết:

### Port 8000 - Authentication Service:
```
POST /api/auth/login
Response: {
  "success": true,
  "data": {
    "token": "JWT...",
    "user": { ... }
  }
}
```

### Port 3636 - RAG Service:
```
GET  /documents/list
POST /documents/vector/add
PUT  /documents/vector/{id}
DELETE /documents/vector/{id}
POST /documents/vector/process-query
```

#### Process Query Endpoint:
```javascript
POST /documents/vector/process-query
Headers: { Authorization: "Bearer JWT_TOKEN" }
Body: {
  "query": "Câu hỏi của user",
  "thread_id": "thread_1730300000_abc123"  // Mỗi lần là một thread mới
}
```

## 🎯 Lưu ý quan trọng:

1. **Thread ID không được tái sử dụng**: Mỗi câu hỏi = 1 thread mới
2. **Không có conversation history giữa các câu hỏi** (do mỗi lần là thread mới)
3. **Refresh/Làm mới**: Chỉ reset UI, không ảnh hưởng backend
4. **Port separation**: 
   - 8000: Authentication only
   - 3636: All RAG operations

## 📁 Files đã thay đổi:

1. ✅ `src/api.js` - Dual port configuration
2. ✅ `src/ChatView.jsx` - Thread ID management + Reset button
3. ✅ `PORT_CHANGES.md` - Documentation

## 🚀 Kiểm tra hoạt động:

1. **Login**: Kiểm tra network tab → request đến `localhost:8000`
2. **Documents**: Kiểm tra network tab → request đến `localhost:3636`
3. **Chat**: 
   - Mỗi lần hỏi → new thread_id trong request
   - Click "Làm mới" → messages clear + new thread_id
4. **Console log**: Xem thread_id được tạo mới

## 🔍 Debug:

Mở Console để xem:
```
Created new thread: thread_1730300000_abc123
New question, new thread: thread_1730300456_def789
Reset conversation, new thread: thread_1730300789_ghi012
```
