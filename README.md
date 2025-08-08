# SVG Images API Service

A simple and clean API service for uploading and fetching SVG images that you can use in any of your projects.

## Features

- ✅ Upload SVG images via API
- ✅ Fetch SVG images by filename
- ✅ List all uploaded images
- ✅ Direct image access via URL
- ✅ Delete images
- ✅ CORS enabled for cross-origin requests
- ✅ File size validation (5MB max)
- ✅ SVG format validation

## Installation

1. Install dependencies:

```bash
npm install
```

2. Start the server:

```bash
# Production
npm start

# Development (with auto-reload)
npm run dev
```

The server will run on `http://localhost:3000`

## API Endpoints

### 1. Upload SVG Image

**POST** `/upload`

Upload an SVG file to the server.

**Form Data:**

- `image`: SVG file

**Example using curl:**

```bash
curl -X POST -F "image=@your-icon.svg" http://localhost:3000/upload
```

**Response:**

```json
{
  "success": true,
  "message": "SVG image uploaded successfully",
  "data": {
    "filename": "1692123456789-your-icon.svg",
    "originalName": "your-icon.svg",
    "size": 2345,
    "url": "http://localhost:3000/images/1692123456789-your-icon.svg",
    "directUrl": "http://localhost:3000/images/1692123456789-your-icon.svg"
  }
}
```

### 2. List All Images

**GET** `/images/list`

Get a list of all uploaded SVG images.

**Example:**

```bash
curl http://localhost:3000/images/list
```

**Response:**

```json
{
  "success": true,
  "count": 2,
  "images": [
    {
      "filename": "1692123456789-icon1.svg",
      "url": "http://localhost:3000/images/1692123456789-icon1.svg",
      "directUrl": "http://localhost:3000/images/1692123456789-icon1.svg",
      "size": 2345,
      "uploadedAt": "2023-08-15T10:30:56.789Z"
    }
  ]
}
```

### 3. Get Image Info

**GET** `/api/images/:filename`

Get information about a specific image.

**Example:**

```bash
curl http://localhost:3000/api/images/1692123456789-icon1.svg
```

### 4. Direct Image Access

**GET** `/images/:filename`

Access the SVG image directly. This URL can be used in HTML `<img>` tags or any other project.

**Example:**

```html
<img
  src="http://localhost:3000/images/1692123456789-icon1.svg"
  alt="Icon"
  width="32"
  height="32"
/>
```

### 5. Delete Image

**DELETE** `/images/:filename`

Delete a specific image.

**Example:**

```bash
curl -X DELETE http://localhost:3000/images/1692123456789-icon1.svg
```

## Usage in Your Projects

### HTML

```html
<!-- Direct image usage -->
<img
  src="http://localhost:3000/images/your-filename.svg"
  alt="Icon"
  width="32"
  height="32"
/>

<!-- With different themes like your example -->
<img
  src="http://localhost:3000/images/tech-stack-typescript-light.svg"
  alt="TypeScript light icon"
  width="32"
  height="32"
  className="hidden [html.light_&]:block"
/>

<img
  src="http://localhost:3000/images/tech-stack-typescript-dark.svg"
  alt="TypeScript dark icon"
  width="32"
  height="32"
  className="hidden [html.dark_&]:block"
/>
```

### JavaScript/React

```javascript
// Fetch image list
fetch("http://localhost:3000/images/list")
  .then((response) => response.json())
  .then((data) => {
    console.log("Available images:", data.images);
  });

// Use in React component
function TechIcon({ technology, theme = "light" }) {
  const imageUrl = `http://localhost:3000/images/tech-stack-${technology}-${theme}.svg`;

  return (
    <img
      src={imageUrl}
      alt={`${technology} ${theme} icon`}
      width={32}
      height={32}
    />
  );
}
```

### CSS

```css
.tech-icon {
  background-image: url("http://localhost:3000/images/your-icon.svg");
  width: 32px;
  height: 32px;
  background-size: contain;
}
```

## File Structure

```
imagesapi/
├── server.js          # Main server file
├── package.json       # Dependencies and scripts
├── uploads/           # Directory where SVG files are stored
└── README.md         # This file
```

## Environment Variables

- `PORT`: Server port (default: 3000)

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- `400`: Bad request (invalid file, no file, etc.)
- `404`: File not found
- `500`: Server error

## Security Notes

- Only SVG files are accepted
- File size limit: 5MB
- CORS is enabled for all origins (configure as needed for production)
- Files are stored with timestamp prefixes to avoid naming conflicts

## Production Deployment

For production, consider:

- Setting up proper file storage (AWS S3, etc.)
- Adding authentication
- Setting up proper CORS policies
- Using environment variables for configuration
- Adding logging
- Setting up HTTPS
