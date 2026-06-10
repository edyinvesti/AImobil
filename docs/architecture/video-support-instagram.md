# Architecture: Video Support for Instagram Publishing

## 1. Storage Strategy — Cloudinary (Free Tier)

**Why Cloudinary over alternatives:**

| Option | Free Tier | Persistence | Instagram Fetch | Verdict |
|--------|-----------|-------------|-----------------|---------|
| Cloudinary | 25GB storage, 25GB/mo bw | Permanent CDN URL | Reliable, fast | **Primary choice** |
| Render disk (ephemeral) | Unlimited (tmp) | Lost on restart | Only during uptime | Fragile |
| Turso (base64) | 500MB total | Persistent | N/A (URL needed) | **Not possible** |
| Uploadthing | 2GB storage | Permanent URL | Reliable | Good alternative |
| Imgur | No video support | N/A | N/A | Incompatible |

**Flow:**

```
Broker → PropertyForm → POST /api/properties/:id/video (multipart)
                                    ↓
                          Express receives file (multer)
                                    ↓
                          Uploads to Cloudinary (upload API)
                                    ↓
                          Cloudinary returns public URL
                                    ↓
                          Save URL in properties.video_url (Turso)
                                    ↓
                          MarketingEngine uses URL for Instagram Graph API
```

**Cloudinary setup:**
- Sign up at cloudinary.com (free tier: 25GB storage, 25GB monthly bandwidth)
- Add env vars:
  ```
  CLOUDINARY_CLOUD_NAME=your_cloud
  CLOUDINARY_API_KEY=your_key
  CLOUDINARY_API_SECRET=your_secret
  ```
- Install `cloudinary` npm package (not currently in package.json)

**Alternative (if avoiding third-party storage):** Video can be uploaded to Express `public/videos/` dir and served via `GET /api/video/:id`. This works for the immediate publishing flow since Instagram fetches the video during the request. The URL will break on Render restart — acceptable if video is only needed transiently for publishing. Store `tempVideoUrl` instead of `videoUrl` to indicate ephemeral nature.

---

## 2. Database Schema Changes

**File:** `server/db/schema.cjs` — Tables → `properties`

Add one column:

```sql
video_url TEXT DEFAULT ''
```

**File:** `server/db/index.cjs` — `addProperty()` needs to include `video_url` in INSERT:

Update the SQL to include `video_url` parameter. Add `property.videoUrl || ''` to args array.

**File:** `server/db/index.cjs` — `getPropertyById()`:

Parse `video_url` from row into `videoUrl`.

The `getProperties()` list query does NOT need to return video URLs — only the detail view needs it.

---

## 3. Backend Endpoints

### 3.1 `POST /api/properties/:id/video` (auth required)

**Purpose:** Accept MP4 upload, store in Cloudinary, save URL in DB.

- **Input:** `multipart/form-data` with field `video`
- **File constraints:**
  - Format: MP4 only
  - Max size: 50MB (use multer's `limits.fileSize`)
  - Max duration: 60 seconds (validated server-side via ffprobe or client-side pre-validation)
- **Returns:** `{ success: true, videoUrl: "https://..." }`

**Implementation:**

```js
// server/index.cjs — add near image routes (around line 1344)

const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'video/mp4') {
      return cb(new Error('Only MP4 files are allowed'));
    }
    cb(null, true);
  }
});

const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

app.post('/api/properties/:id/video', authMiddleware, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No video file provided' });

    const property = await dataEngine.getPropertyById(req.params.id);
    if (!property) return res.status(404).json({ error: 'Property not found' });

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({
        resource_type: 'video',
        folder: 'aimobil',
        public_id: `property_${req.params.id}`,
        eager: [
          { format: 'mp4', quality: 'auto' }
        ],
        eager_async: true
      }, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
      stream.end(req.file.buffer);
    });

    // Save URL in DB
    const videoUrl = result.secure_url;
    await dataEngine.updatePropertyVideo(req.params.id, videoUrl);

    res.json({ success: true, videoUrl });
  } catch (err) {
    logger.error('Video upload error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});
```

### 3.2 `GET /api/properties/:id/video`

**Purpose:** Return video URL (public endpoints use this to display video player).

```js
app.get('/api/properties/:id/video', async (req, res) => {
  try {
    const property = await dataEngine.getPropertyById(req.params.id);
    if (!property) return res.status(404).json({ error: 'Not found' });
    res.json({ videoUrl: property.videoUrl || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

### 3.3 `DELETE /api/properties/:id/video` (auth required)

**Purpose:** Remove video from a property (also delete from Cloudinary).

```js
app.delete('/api/properties/:id/video', authMiddleware, async (req, res) => {
  try {
    const property = await dataEngine.getPropertyById(req.params.id);
    if (!property || !property.videoUrl) {
      return res.status(404).json({ error: 'No video to delete' });
    }

    // Delete from Cloudinary
    const publicId = `aimobil/property_${req.params.id}`;
    await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });

    // Clear DB field
    await dataEngine.updatePropertyVideo(req.params.id, '');

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

### 3.4 DataEngine changes in `server/db/index.cjs`

Add new method:

```js
async updatePropertyVideo(id, videoUrl) {
  if (!this.client) return null;
  try {
    return await this.client.execute({
      sql: 'UPDATE properties SET video_url = ? WHERE id = ?',
      args: [videoUrl, id]
    });
  } catch (e) {
    console.error('updatePropertyVideo error:', e.message);
    return null;
  }
}
```

---

## 4. Frontend Changes

### 4.1 Types (`src/types.ts`)

```ts
export interface Property {
  // ... existing fields
  images: string[];
  thumbnail?: string;
  videoUrl?: string;        // NEW
  videoFileName?: string;   // NEW — display name in UI
}
```

Update `MAX_IMAGES` → add `MAX_VIDEO_SIZE = 50 * 1024 * 1024` (50MB).

### 4.2 PropertyForm.tsx — Video Upload Section

Add a video upload section inside the gallery card (after the image grid, around line 311).

**UI pattern:**
- If no video uploaded: a dashed drop zone with "Adicionar Vídeo (MP4, máx 60s)"
- Input: `<input type="file" accept="video/mp4" />` with `capture` attribute for mobile
- On select, show video filename, file size, and duration
- If video already exists: show `<video>` player with controls + "Remover" button
- Progress bar during upload to backend

**Client-side validation before upload:**
1. Check MIME type is `video/mp4`
2. Check file size < 50MB
3. Use `HTMLVideoElement` to load file and check duration < 60s

```tsx
const handleVideoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (file.type !== 'video/mp4') {
    toast('Apenas arquivos MP4 são aceitos.', 'error');
    return;
  }
  if (file.size > MAX_VIDEO_SIZE) {
    toast('Vídeo muito grande. Máximo 50MB.', 'error');
    return;
  }

  // Check duration
  const duration = await getVideoDuration(file);
  if (duration > 60) {
    toast('Vídeo excede 60 segundos.', 'error');
    return;
  }

  // Upload to server
  setVideoUploading(true);
  try {
    const formData = new FormData();
    formData.append('video', file);
    const res = await fetch(`${getApiUrl()}/api/properties/${propertyId}/video`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    const data = await res.json();
    if (data.success) {
      setVideoUrl(data.videoUrl);
      toast('Vídeo enviado com sucesso!', 'success');
    }
  } catch (err) {
    toast('Erro ao enviar vídeo.', 'error');
  } finally {
    setVideoUploading(false);
  }
};
```

**Helper for duration check:**

```ts
function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => reject(new Error('Invalid video'));
    video.src = URL.createObjectURL(file);
  });
}
```

### 4.3 PropertyDetails.tsx — Video Display

After the image gallery section (after line 163), render a video player when `property.videoUrl` exists:

```tsx
{property.videoUrl && (
  <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden mt-3">
    <video
      src={property.videoUrl}
      controls
      playsInline
      className="w-full h-full object-contain"
      poster={property.images?.[0] ? resolveImageUrl(property.images[0]) : undefined}
    />
  </div>
)}
```

### 4.4 Public Property Page (`/imovel/:id`)

The public SPA in `server/index.cjs` (around line 1406) needs the video URL added to the property JSON it renders:

```js
property: {
  // ... existing fields
  videoUrl: property.videoUrl || null
}
```

And in the public HTML template, add a video player section.

---

## 5. Marketing Engine Changes

### 5.1 New method: `publicarInstagramReel`

**File:** `server/marketing-engine.cjs`

Add after `publicarInstagram()` (line 898):

```js
async publicarInstagramReel(property, copy, videoUrl) {
  try {
    if (!INSTAGRAM_BUSINESS_ID) {
      return { status: 'SKIPPED', reason: 'INSTAGRAM_BUSINESS_ID não configurado' };
    }

    if (!videoUrl) {
      return { status: 'SKIPPED', reason: 'Nenhum vídeo disponível' };
    }

    const legenda = copy?.fullCaption || this.montarLegendaCompleta({
      headline: copy?.headline || property.title,
      primaryText: copy?.primaryText || property.description || '',
      description: copy?.description || `R$ ${Number(property.price).toLocaleString('pt-BR')}`,
      cta: copy?.cta || 'Saiba mais',
      style: copy?.style || 'professional',
      hashtags: copy?.hashtags || this.gerarHashtags(property),
      engagement: copy?.engagement || this.gerarPerguntaEngajamento(property),
      whatsapp: copy?.whatsapp
    });

    this.logger.info('Publicando Reel no Instagram', { videoUrl });

    const creationResponse = await fetch(
      `${FACEBOOK_GRAPH_URL}/${INSTAGRAM_BUSINESS_ID}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'REELS',
          video_url: videoUrl,
          caption: legenda,
          access_token: INSTAGRAM_TOKEN
        })
      }
    );

    if (!creationResponse.ok) {
      const errorText = await creationResponse.text();
      this.logger.warn('Erro HTTP ao criar Reel', { status: creationResponse.status, error: errorText.substring(0, 200) });
      return { status: 'DRAFT', error: `HTTP ${creationResponse.status}`, apiResponse: errorText.substring(0, 200) };
    }

    const creationData = await creationResponse.json();
    if (creationData.error) {
      this.logger.warn('Erro ao criar Reel', { error: creationData.error });
      return { status: 'DRAFT', error: creationData.error.message, apiResponse: creationData };
    }

    // Instagram needs time to process the video
    await new Promise(r => setTimeout(r, 5000));

    const publishResponse = await fetch(
      `${FACEBOOK_GRAPH_URL}/${INSTAGRAM_BUSINESS_ID}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: creationData.id, access_token: INSTAGRAM_TOKEN })
      }
    );

    if (!publishResponse.ok) {
      const errorText = await publishResponse.text();
      return { status: 'DRAFT', error: `HTTP ${publishResponse.status}`, apiResponse: errorText.substring(0, 200) };
    }

    const publishData = await publishResponse.json();
    const mediaId = publishData.id || creationData.id;

    let shortcode = null;
    try {
      const mediaRes = await fetch(
        `${FACEBOOK_GRAPH_URL}/${mediaId}?fields=shortcode&access_token=${INSTAGRAM_TOKEN}`
      );
      if (mediaRes.ok) {
        const mediaData = await mediaRes.json();
        shortcode = mediaData.shortcode || null;
      }
    } catch (e) {
      this.logger.warn('Erro ao buscar shortcode do Reel', { error: e.message });
    }

    return {
      status: 'PUBLISHED',
      postId: mediaId,
      url: shortcode
        ? `https://instagram.com/reel/${shortcode}`
        : `https://instagram.com/reel/${mediaId}`,
      caption: legenda.substring(0, 100),
      carousel: false,
      isReel: true
    };

  } catch (error) {
    this.logger.error('Erro ao publicar Reel', { error: error.message });
    return { status: 'ERROR', error: error.message };
  }
}
```

### 5.2 Modify `criarCampanha()` to handle video

In `criarCampanha()` (around line 160), after the image-based Instagram publishing block, add a video publishing step:

```js
let instagramReelResult = null;
if (includeOrganic && INSTAGRAM_BUSINESS_ID && property.videoUrl) {
  instagramReelResult = await this.publicarInstagramReel(property, copys[0], property.videoUrl);
}
```

The campaign result should include both `instagram` (image carousel) and `instagramReel` (video).

### 5.3 Decision logic in `criarCampanha`

If a property has both images and video:
1. Publish the Reel (video) — this is primary, video drives engagement
2. Also publish the image carousel if images exist

If a property has ONLY video (no images):
1. Only publish the Reel

**Suggested logic change** (lines 160-175 in `marketing-engine.cjs`):

```js
let instagramResult = null;
let instagramReelResult = null;

if (includeOrganic && INSTAGRAM_BUSINESS_ID) {
  // Always try to publish Reel if video is available
  if (property.videoUrl) {
    instagramReelResult = await this.publicarInstagramReel(property, copys[0], property.videoUrl);
  }

  // Also publish image carousel if images are available
  if (publicImageUrl) {
    const imageUrls = [publicImageUrl];
    for (let i = 1; i < Math.min(property.images?.length || 1, 5); i++) {
      imageUrls.push(`${API_URL}/api/properties/${property.id}/image?index=${i}`);
    }
    instagramResult = await this.publicarInstagram(property, copys[0], imageUrls);
  } else if (!property.videoUrl) {
    instagramResult = { status: 'SKIPPED', reason: 'Nenhuma mídia disponível' };
  }
}
```

### 5.4 Campaign DB schema update

Add column for Reel:

```sql
instagram_reel_status TEXT DEFAULT '',
instagram_reel_post_id TEXT DEFAULT '',
instagram_reel_url TEXT DEFAULT ''
```

---

## 6. File Size/Format Limits & Validation

| Property | Value | Where Validated |
|----------|-------|-----------------|
| Format | MP4 only | Client (accept) + Server (multer fileFilter) |
| Max file size | 50MB | Client (before upload) + Server (multer limits) |
| Max duration | 60 seconds | Client (HTMLVideoElement) — Reels spec |
| Min duration | 3 seconds | Client + Server (optional, Instagram enforces) |
| Aspect ratio | 9:16 preferred, 0.01:1 to 10:1 allowed | Client guidance only |
| Audio | Required (Reels) | Client guidance only |
| Video codec | H.264 preferred | Client guidance only |
| Resolution | 1080×1920 recommended | Client guidance only |

**Client-side validation flow:**

```
File selected
  ├── type !== 'video/mp4' → ❌ toast error
  └── type === 'video/mp4'
        ├── size > 50MB → ❌ toast error
        └── size ≤ 50MB
              └── Load metadata, check duration
                    ├── duration > 60s → ❌ toast error
                    └── duration ≤ 60s → ✅ proceed to upload
```

**Server-side validation (multer + endpoint):**

```
multer middleware
  ├── mimetype !== 'video/mp4' → 400 error
  └── file.size > 50MB → 413 error

Endpoint handler
  └── Upload to Cloudinary
        └── Cloudinary rejects if invalid → 422 error
```

---

## 7. Error Handling

| Scenario | Response |
|----------|----------|
| Video too large | Client toast + 413 from server |
| Invalid format | Client toast + 400 from server |
| Cloudinary upload failure | 502 with error message |
| Instagram API rejects video | Return DRAFT status with detailed error |
| Video processing timeout | Instagram may take 30-60s to process — increase sleep to 15s before publish |

---

## 8. Instagram Reels Requirements (Graph API v22.0)

- `media_type`: `REELS`
- `video_url`: Must be HTTPS, publicly accessible, MP4
- `caption`: Max 2200 characters
- `thumb_offset`: Optional, integer in milliseconds for thumbnail
- Video container: MP4 only
- Max video file size: 100MB (Meta limit — our 50MB is under)
- Max duration: 60 seconds for Reels
- Audio: Required

No carousel with mixed images+video — Reels are single-video only.

---

## 9. Environment Variables (`.env`)

Add to `.env`, `render.yaml`, and `.env.example`:

```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## 10. Implementation Order

Build in this sequence — each step is independently verifiable:

### Phase 1 — Storage & Backend (1 day)
1. **Database**: Add `video_url` column to properties table in `server/db/schema.cjs`
2. **DataEngine**: Add `updatePropertyVideo(id, url)` method in `server/db/index.cjs`
3. **Cloudinary setup**: Sign up, get API keys, add env vars, install `cloudinary` npm package
4. **Upload endpoint**: Implement `POST /api/properties/:id/video` with multer
5. **Video info endpoint**: Implement `GET /api/properties/:id/video`
6. **Delete endpoint**: Implement `DELETE /api/properties/:id/video`

Verify: `curl -X POST -F "video=@test.mp4" https://...` returns a Cloudinary URL.

### Phase 2 — Frontend Upload (1 day)
7. **Types**: Add `videoUrl` and `videoFileName` to `Property` interface
8. **PropertyForm**: Add video upload section with file input, validation, progress, preview
9. **PropertyDetails**: Add `<video>` player when `property.videoUrl` exists
10. **Public property page**: Include video URL in JSON response and render a player

Verify: Upload a video through the UI, see it appear in the property detail view.

### Phase 3 — Marketing Engine (1 day)
11. **`publicarInstagramReel`**: Implement the Reels API method
12. **`criarCampanha`**: Add video publishing logic — publish Reel if video exists
13. **Campaign schema**: Add `instagram_reel_*` columns
14. **Campaign save**: Save Reel result in DB

Verify: Create campaign with a property that has a video — Reel appears on Instagram.

### Phase 4 — Polish (0.5 day)
15. **Error handling**: Graceful fallback if video publish fails but image publish succeeds
16. **Mobile responsiveness**: Video player styling on mobile
17. **Loading states**: Upload progress bar, publish status for video specifically
18. **Edge cases**: Remove video when property deleted, cleanup Cloudinary

---

## 11. Key Risk & Mitigation

| Risk | Mitigation |
|------|------------|
| Instagram takes too long to process video | Increase sleep time to 15s + retry logic |
| Cloudinary free tier bandwidth exceeded | Monitor usage, add bandwidth alert |
| Render free tier outbound bandwidth | Videos uploaded to Cloudinary directly from server — minimal Render bandwidth for upload |
| Broker uploads very large file | Client + server validation at 50MB |
| Video not available when Instagram fetches | Cloudinary CDN is stable — 99.9% uptime |
| Broker has no video but wants to publish | Fall back to image-only flow (existing behavior) |
