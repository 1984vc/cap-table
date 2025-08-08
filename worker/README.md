# Real-time JSON API with Cloudflare Workers

A complete real-time JSON object API built with Cloudflare Workers and Durable Objects, featuring WebSocket support for live updates and anonymous authentication via composite IDs.

## Features

- **REST API**: GET and PUT endpoints for JSON object management
- **Anonymous Authentication**: Composite ID system with read/write permissions
- **Real-time Updates**: WebSocket connections for live data synchronization
- **Persistent Storage**: Durable Objects with automatic persistence
- **Version Control**: Automatic versioning and conflict resolution
- **CORS Support**: Cross-origin requests enabled
- **Input Validation**: JSON validation and error handling
- **Edge Computing**: Optimized for Cloudflare's global edge network

## Authentication System

### Composite ID Format

The API uses a composite ID system for anonymous authentication:

**Format:** `{base58ID}-{base58EditKey}`

- **ID Only** (`abc12345`): Read access + WebSocket connections
- **ID + Edit Key** (`abc12345-xyz98765`): Full read/write access

### Base58 Encoding

IDs use Base58 encoding (Bitcoin alphabet): `123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz`

- Excludes confusing characters: `0`, `O`, `I`, `l`
- URL-safe and human-readable
- Typically 8 characters for both ID and edit key

## API Endpoints

### HTTP Endpoints

#### GET `/api/objects/{id}` or `/api/objects/{id}-{editKey}`
Retrieve a JSON object. If an `editKey` is provided, it must be correct.

**Examples:**
- `GET /api/objects/abc12345` ✓ Read-only access
- `GET /api/objects/abc12345-xyz98765` ✓ Succeeds if edit key is correct
- `GET /api/objects/abc12345-wrongkey` ✗ Fails with 404 if edit key is incorrect

**Response:**
```json
{
  "data": { /* your JSON object */ },
  "version": 1,
  "lastModified": "2023-12-07T10:30:00.000Z"
}
```

**Status Codes:**
- `200`: Object found and returned
- `404`: Object not found, or incorrect edit key provided

#### PUT `/api/objects/{id-editKey}`
Create or update a JSON object (edit key required).

**Examples:**
- `PUT /api/objects/abc12345-xyz98765` ✓ Full access
- `PUT /api/objects/abc12345` ✗ Missing edit key (403)

**Request Body:** Any valid JSON
```json
{
  "name": "John Doe",
  "age": 30,
  "preferences": {
    "theme": "dark",
    "notifications": true
  }
}
```

**Response (New Object):**
```json
{
  "data": { /* your JSON object */ },
  "version": 1,
  "lastModified": "2023-12-07T10:35:00.000Z",
  "id": "abc12345",
  "editKey": "xyz98765"
}
```

**Response (Update):**
```json
{
  "data": { /* your JSON object */ },
  "version": 2,
  "lastModified": "2023-12-07T10:35:00.000Z"
}
```

**Status Codes:**
- `200`: Object created/updated successfully
- `400`: Invalid JSON or missing edit key
- `403`: Edit key required or incorrect
- `500`: Server error

### WebSocket Endpoint

#### `/api/objects/{id}/ws`
Real-time updates for JSON object changes (read-only, no edit key required).

**Examples:**
- `WS /api/objects/abc12345/ws` ✓ Read-only connection
- `WS /api/objects/abc12345-xyz98765/ws` ✓ Also works (edit key ignored)

**Connection:** Standard WebSocket upgrade request
**Messages:** JSON objects with update notifications

**Example Message:**
```json
{
  "type": "update",
  "data": { /* updated JSON object */ },
  "version": 3,
  "lastModified": "2023-12-07T10:40:00.000Z"
}
```

## Development Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Cloudflare account (for deployment)

### Installation

```bash
# Clone and install dependencies
npm install

# Generate TypeScript types
npm run cf-typegen
```

### Local Development

```bash
# Start development server
npm run dev

# The API will be available at:
# - HTTP: http://localhost:8787
# - WebSocket: ws://localhost:8787
```

### Testing

Open `example-client.html` in your browser to test the API:

1. **WebSocket Connection**: Connect to real-time updates
2. **Get Object**: Retrieve current object state
3. **Update Object**: Modify object and see real-time updates

### Example Usage

#### JavaScript/Fetch API

```javascript
// Create a new object (returns ID and edit key)
const createResponse = await fetch('/api/objects/abc12345-xyz98765', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Alice',
    status: 'active',
    metadata: { created: new Date().toISOString() }
  })
});

const newObject = await createResponse.json();
console.log('Created object:', newObject);
// Response includes: { data, version, lastModified, id, editKey }

// Update an existing object (edit key required)
const updateResponse = await fetch('/api/objects/abc12345-xyz98765', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Alice Updated',
    status: 'active'
  })
});

// Get an object (anyone with ID can read)
const getResponse = await fetch('/api/objects/abc12345');
const object = await getResponse.json();
console.log('Current state:', object);
```

#### WebSocket Connection

```javascript
// Connect with just the ID (read-only access)
const ws = new WebSocket('ws://localhost:8787/api/objects/abc12345/ws');

ws.onopen = () => console.log('Connected to real-time updates');

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log('Object updated:', update);
  
  // Handle the update in your application
  if (update.type === 'update') {
    updateUI(update.data);
  }
};

ws.onclose = () => console.log('Disconnected from updates');
```

#### cURL Examples

```bash
# Create a new object (with edit key)
curl -X PUT http://localhost:8787/api/objects/abc12345-xyz98765 \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "active": true}'

# Get an object (read-only, no edit key needed)
curl -X GET http://localhost:8787/api/objects/abc12345

# Update an object (edit key required)
curl -X PUT http://localhost:8787/api/objects/abc12345-xyz98765 \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated User", "active": false}'

# Try to update without edit key (will fail with 403)
curl -X PUT http://localhost:8787/api/objects/abc12345 \
  -H "Content-Type: application/json" \
  -d '{"name": "This will fail"}'

# Test CORS preflight
curl -X OPTIONS http://localhost:8787/api/objects/abc12345-xyz98765 \
  -H "Access-Control-Request-Method: PUT" \
  -H "Access-Control-Request-Headers: Content-Type"
```

## Deployment

### Deploy to Cloudflare Workers

```bash
# Login to Cloudflare (if not already logged in)
npx wrangler login

# Deploy to production
npm run deploy
```

### Environment Configuration

The application uses Durable Objects which are automatically configured in `wrangler.jsonc`. No additional environment variables are required.

## Architecture

### Durable Objects

Each JSON object is managed by a separate Durable Object instance:

- **Persistence**: Automatic storage in Cloudflare's edge storage
- **Consistency**: Strong consistency within each object
- **Isolation**: Each UUID gets its own isolated storage
- **WebSocket Management**: Each object maintains its own WebSocket connections

### Data Structure

```typescript
interface JSONObjectData {
  data: any;           // The actual JSON object
  version: number;     // Incremental version number
  lastModified: string; // ISO timestamp of last update
  id?: string;         // Base58 object ID (internal)
  editKey?: string;    // Base58 edit key (internal)
}
```

### Conflict Resolution

- **Last Write Wins**: Updates always increment version number
- **Optimistic Updates**: No locking, latest update overwrites
- **Version Tracking**: Clients can track version numbers for consistency

## Technical Details

### WebSocket Best Practices

Following [Cloudflare's WebSocket documentation](https://developers.cloudflare.com/durable-objects/best-practices/websockets/), the implementation:

- Uses WebSocketPair for proper connection handling
- Manages connection lifecycle with proper cleanup
- Broadcasts to all connected clients efficiently
- Handles connection errors gracefully

### Error Handling

- **Validation**: JSON parsing errors return 400 status
- **Not Found**: Missing objects return 404 status
- **Server Errors**: Internal errors return 500 status
- **WebSocket Errors**: Automatic cleanup and reconnection support

### Performance Considerations

- **Edge Computing**: Runs on Cloudflare's global edge network
- **Minimal Latency**: Durable Objects provide fast access
- **Efficient Broadcasting**: Only active WebSocket connections receive updates
- **Memory Management**: Automatic cleanup of closed connections

## Security

### Anonymous Authentication

- **Composite IDs**: Combines read access (ID) with write access (edit key)
- **URL-based Auth**: No headers or tokens required
- **Base58 Encoding**: Human-readable, URL-safe identifiers
- **Permission Separation**: Reading and writing have different requirements

### Security Features

- **Input Validation**: All JSON inputs and IDs are validated
- **CORS Configuration**: Configurable cross-origin access
- **Edit Key Protection**: Edit keys never exposed in GET responses
- **ID Validation**: Base58 format validation prevents injection
- **Read/Write Separation**: Clear permission boundaries

### Security Considerations

- **Edit Key Secrecy**: Keep edit keys private - they grant write access
- **URL Logging**: Be careful with server logs that might capture edit keys
- **HTTPS Required**: Use HTTPS in production to protect edit keys in transit
- **Rate Limiting**: Consider implementing rate limiting for production
- **Key Rotation**: No built-in key rotation - recreate objects if keys are compromised

## Troubleshooting

### Common Issues

1. **Edit Key Required (403)**
   - PUT requests need both ID and edit key: `/api/objects/id-editKey`
   - Check that you're using the full composite ID for updates
   - Verify edit key matches the one returned during creation

2. **Invalid ID Format (404)**
   - IDs must be Base58 format (no 0, O, I, l characters)
   - Format: `base58ID` or `base58ID-base58EditKey`
   - Example: `abc12345` or `abc12345-xyz98765`

3. **WebSocket Connection Failed**
   - Check URL format (`ws://` for HTTP, `wss://` for HTTPS)
   - WebSocket only needs the ID portion: `/api/objects/abc12345/ws`
   - Edit key is not needed for WebSocket connections

4. **Object Not Found (404)**
   - Objects are created on first PUT request with edit key
   - Check ID spelling and Base58 format
   - Ensure object was created with proper composite ID

5. **Invalid JSON (400)**
   - Validate JSON syntax before sending
   - Ensure Content-Type header is set to application/json

6. **TypeScript Errors**
   - Run `npm run cf-typegen` to regenerate types
   - Check TypeScript configuration in `tsconfig.json`

### Development Tips

- Use the example client for interactive testing
- Check browser DevTools for WebSocket connection status
- Monitor Cloudflare Dashboard for deployment status
- Use `wrangler dev --local` for completely local development

## Contributing

This project follows Cloudflare Workers best practices:

- TypeScript for type safety
- Proper error handling and logging
- CORS support for web applications
- WebSocket best practices implementation

## License

This project is private and proprietary.