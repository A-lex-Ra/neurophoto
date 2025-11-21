# 📖 NeuroPhoto API Documentation

Base URL: `http://localhost:3001`

## 🖼️ Gallery Service

### Upload File

**POST** `/api/gallery/upload`

Upload an image file to MinIO and create a database record.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` (image file)

**Response:**
```json
{
  "id": "clxy123abc...",
  "originalName": "image.jpg",
  "filename": "uuid.jpg",
  "path": "uploads/uuid.jpg",
  "hash": "sha256...",
  "mimeType": "image/jpeg",
  "size": 123456,
  "userId": "user-id",
  "createdAt": "2025-10-12T10:00:00.000Z"
}
```

**Example (curl):**
```bash
curl -X POST http://localhost:3001/api/gallery/upload \
  -F "file=@/path/to/image.jpg"
```

---

### Get User Files

**GET** `/api/gallery/user/:userId?limit=50&offset=0`

Get list of files for a specific user.

**Parameters:**
- `userId` (path) - User ID
- `limit` (query, optional) - Max results (default: 50)
- `offset` (query, optional) - Pagination offset (default: 0)

**Response:**
```json
{
  "data": [
    {
      "id": "file-id",
      "originalName": "image.jpg",
      "path": "uploads/uuid.jpg",
      "mimeType": "image/jpeg",
      "size": 123456,
      "downloadCount": 5,
      "createdAt": "2025-10-12T10:00:00.000Z"
    }
  ],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

---

### Download File

**GET** `/api/gallery/:fileId`

Download a file by ID.

**Response:**
- Headers: `Content-Type`, `Content-Disposition`
- Body: File binary data

---

### Get Public URL

**GET** `/api/gallery/:fileId/url`

Get public URL for file access.

**Response:**
```json
{
  "url": "http://localhost:9000/generations/uploads/uuid.jpg"
}
```

---

### Delete File

**DELETE** `/api/gallery/:fileId`

Soft delete a file (mark as deleted, don't remove from storage).

**Response:**
```json
{
  "success": true
}
```

---

## 🎨 Generation Service

### Create Generation

**POST** `/api/generations/create`

Create a new AI image generation task.

**Request:**
```json
{
  "inputFileId": "file-id", // optional
  "prompt": "Transform this image into cyberpunk style",
  "model": "gemini-2.5-flash-image-preview" // optional
}
```

**Response:**
```json
{
  "id": "generation-id",
  "jobId": "job-uuid",
  "status": "PENDING",
  "streamUrl": "/api/generations/stream/job-uuid"
}
```

**Example (curl):**
```bash
curl -X POST http://localhost:3001/api/generations/create \
  -H "Content-Type: application/json" \
  -d '{
    "inputFileId": "clxy123abc",
    "prompt": "Make it look like a painting"
  }'
```

---

### Stream Progress (SSE)

**GET** `/api/generations/stream/:jobId`

Server-Sent Events stream for real-time progress updates.

**Response (SSE):**
```
data: {"type":"progress","data":{"jobId":"uuid","state":"active","progress":30}}

data: {"type":"progress","data":{"jobId":"uuid","state":"active","progress":70}}

data: {"type":"progress","data":{"jobId":"uuid","state":"completed","progress":100}}
```

**Example (JavaScript):**
```javascript
const eventSource = new EventSource('http://localhost:3001/api/generations/stream/job-uuid');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Progress:', data.data.progress);
  
  if (data.data.state === 'completed') {
    eventSource.close();
  }
};
```

---

### Get Generation

**GET** `/api/generations/:id`

Get generation details by ID.

**Response:**
```json
{
  "id": "generation-id",
  "jobId": "job-uuid",
  "userId": "user-id",
  "inputFileId": "file-id",
  "outputFileId": "output-file-id",
  "prompt": "Transform to cyberpunk",
  "model": "gemini-2.5-flash-image-preview",
  "status": "COMPLETED",
  "progress": 100,
  "textResponse": "AI generated description...",
  "creditsUsed": 1,
  "durationMs": 5234,
  "createdAt": "2025-10-12T10:00:00.000Z",
  "completedAt": "2025-10-12T10:00:05.234Z",
  "inputFile": { ... },
  "outputFile": { ... },
  "user": { ... }
}
```

---

### List User Generations

**GET** `/api/generations/list?limit=20&offset=0`

Get generation history for current user.

**Parameters:**
- `limit` (query, optional) - Max results (default: 20)
- `offset` (query, optional) - Pagination offset (default: 0)

**Response:**
```json
{
  "data": [
    {
      "id": "gen-id",
      "status": "COMPLETED",
      "prompt": "...",
      "createdAt": "2025-10-12T10:00:00.000Z",
      "inputFile": { ... },
      "outputFile": { ... }
    }
  ],
  "total": 15,
  "limit": 20,
  "offset": 0
}
```

---

### Delete Generation

**DELETE** `/api/generations/:id`

Cancel or delete a generation.

**Response:**
```json
{
  "success": true
}
```

---

## 🛠️ Tools Service

### List Tools

**GET** `/api/tools/list`

Get a list of available tools and their parameters.

**Response:**
```json
[
  {
    "name": "background_removal",
    "display_name": "Замена фона",
    "description": "Заменяет фон на выбранный цвет или изображение",
    "parameters": {
      "type": "object",
      "properties": {
        "image": {
          "type": "string",
          "description": "Input image (fileID)",
          "required": true
        },
        "background_color": {
          "type": "string",
          "description": "Выберите цвет фона",
          "default": "#FFFFFF (белый)",
          "enum": ["#FFFFFF (белый)", "#000000 (чёрный)", "transparent (прозрачный)"]
        },
        "background_image": {
          "type": "string",
          "description": "Replacement background image (fileID)",
          "default": null
        }
      },
      "required": ["image"]
    }
  }
]
```

---

### Call Tool

**POST** `/api/tools/:toolName/call`

Execute a specific tool. This internally creates a generation task.

**Request:**
```json
{
  "image": "file-id",
  "background_color": "#FFFFFF (белый)"
}
```

**Response:**
```json
{
  "id": "generation-id",
  "jobId": "job-uuid",
  "status": "PENDING",
  "streamUrl": "/api/generations/stream/job-uuid"
}
```

---

## 📊 Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error

---

## 🔐 Authentication

> **Note:** Authentication is not yet implemented in current version.
> All requests use demo user ID: `demo-user-id`

Future implementation will use JWT tokens:

```bash
# Login (future)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@neurophoto.com","password":"demo123"}'

# Use token
curl -X GET http://localhost:3001/api/generations/list \
  -H "Authorization: Bearer <token>"
```

---

## 🧪 Testing API

### Using curl

```bash
# 1. Upload image
FILE_RESPONSE=$(curl -s -X POST http://localhost:3001/api/gallery/upload \
  -F "file=@image.jpg")
FILE_ID=$(echo $FILE_RESPONSE | jq -r '.id')

# 2. Create generation
GEN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/generations/create \
  -H "Content-Type: application/json" \
  -d "{\"inputFileId\":\"$FILE_ID\",\"prompt\":\"Make it artistic\"}")
JOB_ID=$(echo $GEN_RESPONSE | jq -r '.jobId')

# 3. Check status
curl http://localhost:3001/api/generations/stream/$JOB_ID
```

### Using Postman

1. Import collection (coming soon)
2. Set base URL: `http://localhost:3001`
3. Test endpoints

### Using Thunder Client (VS Code)

1. Install Thunder Client extension
2. Create new request
3. Set method and URL
4. Add body/headers as needed

---

## 📝 Data Models

### GenerationStatus Enum
- `PENDING` - Waiting in queue
- `GENERATING` - AI processing
- `COMPLETED` - Successfully completed
- `FAILED` - Error occurred
- `CANCELLED` - Cancelled by user

### UserRole Enum
- `USER` - Regular user
- `ADMIN` - Administrator

### TransactionType Enum
- `PURCHASE` - Credits purchased
- `USAGE` - Credits used
- `REFUND` - Credits refunded
- `BONUS` - Bonus credits

---

## 🚀 Rate Limits

> Not implemented yet

Future limits:
- 10 generations per minute
- 100 file uploads per hour
- 1000 API requests per hour

---

## 📖 Examples

### Complete Flow Example (Node.js)

```javascript
const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

const API_URL = 'http://localhost:3001';

async function generateImage() {
  // 1. Upload image
  const form = new FormData();
  form.append('file', fs.createReadStream('./input.jpg'));
  
  const uploadRes = await axios.post(`${API_URL}/api/gallery/upload`, form, {
    headers: form.getHeaders(),
  });
  
  const fileId = uploadRes.data.id;
  console.log('Uploaded file:', fileId);
  
  // 2. Create generation
  const genRes = await axios.post(`${API_URL}/api/generations/create`, {
    inputFileId: fileId,
    prompt: 'Transform into oil painting style',
  });
  
  const { id, jobId } = genRes.data;
  console.log('Generation started:', id);
  
  // 3. Wait for completion (polling)
  let completed = false;
  while (!completed) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const statusRes = await axios.get(`${API_URL}/api/generations/${id}`);
    console.log('Status:', statusRes.data.status, statusRes.data.progress + '%');
    
    if (statusRes.data.status === 'COMPLETED') {
      completed = true;
      console.log('Result:', statusRes.data.textResponse);
      console.log('Output file:', statusRes.data.outputFileId);
    } else if (statusRes.data.status === 'FAILED') {
      throw new Error(statusRes.data.error);
    }
  }
}

generateImage().catch(console.error);
```

---

**Happy coding! 🎨**
