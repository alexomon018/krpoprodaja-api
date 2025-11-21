# S3 Image Upload Implementation Guide

This guide explains how to use the S3 image storage functionality for product images in the KrpoProdaja API.

## Features

✅ Upload single or multiple images to AWS S3
✅ Automatic image optimization (resize, compress, format conversion)
✅ Support for JPEG, PNG, and WebP formats
✅ Delete images from S3
✅ Secure file upload with validation
✅ Protected endpoints requiring authentication

## Setup

### 1. Install Dependencies

All required dependencies are already installed:
- `@aws-sdk/client-s3` - AWS SDK for S3 operations
- `multer` - File upload middleware
- `sharp` - Image processing library
- `uuid` - Generate unique filenames

### 2. Configure Environment Variables

Add the following to your `.env` file:

```env
# AWS S3 Configuration
AWS_REGION=eu-central-1
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
S3_BUCKET_NAME=krpoprodaja-images

# Image Upload Configuration
MAX_IMAGE_SIZE=5242880                    # 5MB
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp
MAX_IMAGES_PER_PRODUCT=10
```

### 3. AWS S3 Bucket Setup

1. Create an S3 bucket in AWS Console
2. Configure bucket permissions:
   - Enable public read access if images should be publicly accessible
   - Or use presigned URLs for private access
3. Set CORS configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"]
  }
]
```

4. Create IAM user with S3 permissions:
   - `s3:PutObject`
   - `s3:GetObject`
   - `s3:DeleteObject`
   - `s3:ListBucket`

## API Endpoints

### Upload Single Image

**POST** `/api/upload/image`

**Authentication:** Required (JWT token)

**Request:**
- Content-Type: `multipart/form-data`
- Field name: `image`
- Supported formats: JPEG, PNG, WebP
- Max size: 5MB (configurable)

**Query Parameters:**
- `folder` (optional) - S3 folder path (default: "products")
- `maxWidth` (optional) - Max width in pixels (default: 1920)
- `maxHeight` (optional) - Max height in pixels (default: 1920)
- `quality` (optional) - Image quality 1-100 (default: 85)
- `format` (optional) - Output format: jpeg, png, webp (default: webp)

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://krpoprodaja-images.s3.eu-central-1.amazonaws.com/products/123e4567-e89b-12d3-a456-426614174000.webp",
    "key": "products/123e4567-e89b-12d3-a456-426614174000.webp",
    "size": 245678,
    "width": 1920,
    "height": 1080
  }
}
```

**Example (cURL):**
```bash
curl -X POST http://localhost:8080/api/upload/image \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@/path/to/image.jpg" \
  -F "folder=products" \
  -F "quality=90"
```

**Example (JavaScript/Fetch):**
```javascript
const formData = new FormData();
formData.append('image', fileInput.files[0]);

const response = await fetch('http://localhost:8080/api/upload/image?folder=products&quality=90', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  },
  body: formData
});

const result = await response.json();
console.log(result.data.url); // S3 URL
```

---

### Upload Multiple Images

**POST** `/api/upload/images`

**Authentication:** Required (JWT token)

**Request:**
- Content-Type: `multipart/form-data`
- Field name: `images` (array)
- Max files: 10 (configurable)
- Supported formats: JPEG, PNG, WebP
- Max size per file: 5MB

**Query Parameters:** Same as single upload

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "url": "https://krpoprodaja-images.s3.eu-central-1.amazonaws.com/products/image1.webp",
      "key": "products/image1.webp",
      "size": 245678,
      "width": 1920,
      "height": 1080
    },
    {
      "url": "https://krpoprodaja-images.s3.eu-central-1.amazonaws.com/products/image2.webp",
      "key": "products/image2.webp",
      "size": 312456,
      "width": 1600,
      "height": 900
    }
  ],
  "count": 2
}
```

**Example (JavaScript/Fetch):**
```javascript
const formData = new FormData();
// Add multiple files
for (let i = 0; i < fileInput.files.length; i++) {
  formData.append('images', fileInput.files[i]);
}

const response = await fetch('http://localhost:8080/api/upload/images?folder=products', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  },
  body: formData
});

const result = await response.json();
const imageUrls = result.data.map(img => img.url);
```

---

### Delete Single Image

**DELETE** `/api/upload/image/:key`

**Authentication:** Required (JWT token)

**Parameters:**
- `key` - S3 object key (URL encoded)

**Response:**
```json
{
  "success": true,
  "message": "Image deleted successfully"
}
```

**Example:**
```bash
curl -X DELETE http://localhost:8080/api/upload/image/products%2F123e4567-e89b-12d3-a456-426614174000.webp \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### Delete Multiple Images

**DELETE** `/api/upload/images`

**Authentication:** Required (JWT token)

**Request Body (Option 1 - By Keys):**
```json
{
  "keys": [
    "products/image1.webp",
    "products/image2.webp"
  ]
}
```

**Request Body (Option 2 - By URLs):**
```json
{
  "urls": [
    "https://krpoprodaja-images.s3.eu-central-1.amazonaws.com/products/image1.webp",
    "https://krpoprodaja-images.s3.eu-central-1.amazonaws.com/products/image2.webp"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "2 images deleted successfully"
}
```

---

### Extract S3 Key from URL

**GET** `/api/upload/extract-key`

**Authentication:** Not required

**Query Parameters:**
- `url` - S3 URL

**Response:**
```json
{
  "success": true,
  "key": "products/123e4567-e89b-12d3-a456-426614174000.webp"
}
```

**Example:**
```bash
curl "http://localhost:8080/api/upload/extract-key?url=https://krpoprodaja-images.s3.eu-central-1.amazonaws.com/products/image.webp"
```

## Integration with Product Controller

### Creating a Product with Images

**Workflow:**

1. **Upload images first:**
```javascript
// Upload product images
const formData = new FormData();
for (const file of selectedFiles) {
  formData.append('images', file);
}

const uploadResponse = await fetch('/api/upload/images?folder=products&quality=85', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  },
  body: formData
});

const uploadResult = await uploadResponse.json();
const imageUrls = uploadResult.data.map(img => img.url);
```

2. **Create product with image URLs:**
```javascript
// Create product with uploaded image URLs
const productData = {
  title: "Vintage Jacket",
  description: "Beautiful vintage leather jacket",
  price: 5000,
  images: imageUrls, // Array of S3 URLs
  size: "L",
  condition: "very-good",
  location: "Belgrade"
};

const productResponse = await fetch('/api/products', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(productData)
});
```

### Updating Product Images

**Add new images:**
```javascript
// 1. Upload new images
const newImageUrls = await uploadImages(newFiles);

// 2. Get existing product
const product = await fetch(`/api/products/${productId}`).then(r => r.json());

// 3. Update product with combined images
const updatedImages = [...product.images, ...newImageUrls];

await fetch(`/api/products/${productId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    ...product,
    images: updatedImages
  })
});
```

**Replace images:**
```javascript
// 1. Delete old images
await fetch('/api/upload/images', {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    urls: oldProduct.images
  })
});

// 2. Upload new images
const newImageUrls = await uploadImages(newFiles);

// 3. Update product
await fetch(`/api/products/${productId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    ...product,
    images: newImageUrls
  })
});
```

### Deleting a Product

When deleting a product, also clean up associated images:

```javascript
// 1. Get product
const product = await fetch(`/api/products/${productId}`).then(r => r.json());

// 2. Delete images from S3
await fetch('/api/upload/images', {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    urls: product.images
  })
});

// 3. Delete product
await fetch(`/api/products/${productId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

## Image Processing

Images are automatically processed with the following optimizations:

1. **Resizing:** Images larger than specified dimensions are resized while maintaining aspect ratio
2. **Format Conversion:** Images can be converted to WebP for better compression
3. **Quality Compression:** Adjustable quality settings (1-100)
4. **Size Validation:** Files exceeding max size are rejected

**Default Settings:**
- Max Width: 1920px
- Max Height: 1920px
- Quality: 85%
- Format: WebP

## Error Handling

**Common Errors:**

```javascript
// File too large
{
  "error": "File size exceeds the maximum limit of 5.00MB"
}

// Invalid file type
{
  "error": "Invalid file type. Only image/jpeg, image/png, image/webp are allowed."
}

// Too many files
{
  "error": "Cannot upload more than 10 images"
}

// Missing authentication
{
  "error": "Unauthorized"
}

// S3 upload failure
{
  "error": "Failed to upload image: [error details]"
}
```

## Security Considerations

1. **Authentication Required:** All upload/delete endpoints require valid JWT token
2. **File Type Validation:** Only allowed image types can be uploaded
3. **File Size Limits:** Prevents large file uploads
4. **Unique Filenames:** UUID-based naming prevents conflicts and overwrites
5. **Image Validation:** Uses Sharp to validate actual image content

## Frontend Example (React)

```jsx
import { useState } from 'react';

function ProductImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [imageUrls, setImageUrls] = useState([]);

  const handleUpload = async (event) => {
    const files = event.target.files;
    if (!files.length) return;

    setUploading(true);

    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('images', file);
    });

    try {
      const response = await fetch('/api/upload/images?folder=products&quality=85', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        const urls = result.data.map(img => img.url);
        setImageUrls(urls);
        console.log('Uploaded images:', urls);
      } else {
        alert('Upload failed: ' + result.error);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (url) => {
    try {
      const response = await fetch('/api/upload/images', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ urls: [url] })
      });

      const result = await response.json();
      if (result.success) {
        setImageUrls(imageUrls.filter(u => u !== url));
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  return (
    <div>
      <input
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        onChange={handleUpload}
        disabled={uploading}
      />

      {uploading && <p>Uploading...</p>}

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {imageUrls.map((url, index) => (
          <div key={index} style={{ position: 'relative' }}>
            <img src={url} alt={`Product ${index}`} style={{ width: '150px', height: '150px', objectFit: 'cover' }} />
            <button
              onClick={() => handleDelete(url)}
              style={{ position: 'absolute', top: 0, right: 0 }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Testing

Test the endpoints using tools like Postman or cURL:

```bash
# 1. Get access token
TOKEN=$(curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  | jq -r '.accessToken')

# 2. Upload image
curl -X POST http://localhost:8080/api/upload/image \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@test-image.jpg"

# 3. Upload multiple images
curl -X POST http://localhost:8080/api/upload/images \
  -H "Authorization: Bearer $TOKEN" \
  -F "images=@image1.jpg" \
  -F "images=@image2.jpg"
```

## Troubleshooting

**Images not uploading:**
- Check AWS credentials in `.env`
- Verify S3 bucket exists and has correct permissions
- Check IAM user has required S3 permissions

**Images not displaying:**
- Verify S3 bucket has public read access OR use presigned URLs
- Check CORS configuration on S3 bucket
- Verify bucket policy allows public access (if needed)

**Large file rejections:**
- Adjust `MAX_IMAGE_SIZE` in `.env`
- Consider adding client-side compression before upload

## Architecture

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │ multipart/form-data
       ▼
┌─────────────────────────────┐
│   Upload Middleware         │
│   (Multer)                  │
│   - File validation         │
│   - Memory storage          │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│   Upload Controller         │
│   - Process request         │
│   - Call S3 service         │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│   S3 Service                │
│   - Image processing (Sharp)│
│   - Upload to S3            │
│   - Generate URLs           │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│   AWS S3 Bucket             │
│   - Store images            │
│   - Serve images (CDN)      │
└─────────────────────────────┘
```

## Next Steps

1. Configure your AWS S3 bucket
2. Add AWS credentials to `.env`
3. Test image upload endpoints
4. Integrate with your frontend application
5. Consider adding CloudFront CDN for better performance
6. Implement image thumbnails for better UX
7. Add image metadata tracking in database (optional)

---

For questions or issues, please refer to the main project documentation.
