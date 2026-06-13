import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Property, UserProfile } from '../types';
import { getApiUrl, authFetch } from '../utils';
import { PropertyDetails } from './PropertyDetails';
import { useUser } from '../context/UserContext';

export function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useUser();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchProperty = async () => {
      try {
        const res = await authFetch(`${getApiUrl()}/api/partner/property-image?id=${id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setProperty({
              id,
              title: '',
              type: 'Casa',
              offerType: 'Venda',
              price: 0,
              status: 'Disponível',
              address: '',
              size: 0,
              sizeUnit: 'm²',
              bedrooms: 0,
              suites: 0,
              livingRooms: 0,
              kitchens: 0,
              bathrooms: 0,
              parkingSpaces: 0,
              description: '',
              amenities: [],
              images: data.images || [],
              videoData: data.videoData,
              videoType: data.videoType,
              video_url: data.videoUrl,
              createdAt: Date.now(),
            });
          }
        }
      } catch (e) {
        console.error('Error fetching property:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchProperty();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-[#030303] flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-gray-500 text-sm">Imóvel não encontrado</p>
        <button onClick={() => navigate('/')} className="text-orange-400 text-xs font-bold uppercase tracking-wider hover:text-orange-300">
          Voltar ao Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030303]">
      <PropertyDetails property={property} profile={profile as UserProfile} onClose={() => navigate('/')} />
    </div>
  );
}
