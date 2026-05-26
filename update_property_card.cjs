const fs = require('fs');
const path = 'src/components/PropertyCard.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  "import React from 'react';", 
  "import React, { useState, useEffect } from 'react';"
);

code = code.replace(
  "import { resolveImageUrl } from '../utils';", 
  "import { resolveImageUrl, getApiUrl } from '../utils';"
);

code = code.replace(
  "  const thumbnail = property.thumbnail || (property.images && property.images.length > 0 ? property.images[0] : null);", 
  `  const [thumbnail, setThumbnail] = useState<string | null>(property.thumbnail || (property.images && property.images.length > 0 ? property.images[0] : null));

  useEffect(() => {
    if (property.thumbnail || (property.images && property.images.length > 0)) {
      setThumbnail(property.thumbnail || (property.images ? property.images[0] : null));
      return;
    }

    let isMounted = true;
    if (!thumbnail && property.id && !property.id.includes('prop_migrated')) {
      const targetId = property.remoteId || property.id;
      fetch(\`\${getApiUrl()}/api/partner/property-image?id=\${targetId}\`)
        .then(res => res.json())
        .then(data => {
          if (isMounted && data.success && data.images && data.images.length > 0) {
            setThumbnail(data.images[0]);
          }
        })
        .catch(err => console.error("Erro ao carregar imagem sob demanda:", err));
    }
    
    return () => { isMounted = false; };
  }, [property.id, property.remoteId, property.thumbnail, property.images, thumbnail]);`
);
fs.writeFileSync(path, code);
console.log('Done!');
