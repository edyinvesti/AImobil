import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { SplashScreen } from "./components/SplashScreen";
import { useState, useEffect } from "react";
import { Dashboard } from "./components/Dashboard";
import { PropertyForm } from "./components/PropertyForm";
import { PropertyDetails } from "./components/PropertyDetails";
import { Sidebar } from "./components/Sidebar";
import { BottomBar } from "./components/BottomBar";
import { BusinessCard } from "./components/BusinessCard";
import { ProfileView } from "./components/ProfileView";
import { Appointments } from "./components/Appointments";
import { Campaigns } from "./components/Campaigns";
import { ConfirmationModal } from "./components/ConfirmationModal";
import { Bell } from "lucide-react";
import { useProperties } from "./hooks/useProperties";
import { useUser } from "./context/UserContext";
import { AnimatePresence, motion } from "framer-motion";
import { Property } from "./types";
import { useNotifications } from "./hooks/useNotifications";
import { useToast } from "./hooks/useToast";
import { getApiUrl } from "./utils";

function gerarThumbnail(imgBase64: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > 200) { h = (h * 200) / w; w = 200; }
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx?.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/jpeg', 0.2));
    };
    img.onerror = () => resolve(imgBase64);
    img.src = imgBase64;
  });
}

export default function App() {
  const { toast } = useToast();
  const [showSplash, setShowSplash] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useNotifications();
  const { profile, updateProfile, logout } = useUser();

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);
  const { properties, saveProperty, deleteProperty, loading } = useProperties(profile.login);
  const [propertyToView, setPropertyToView] = useState<Property | null>(null);
  const [propertyToEdit, setPropertyToEdit] = useState<Property | null>(null);
  const [propertyToDelete, setPropertyToDelete] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    setShowSplash(true);
    navigate('/');
  };

  const currentView = location.pathname.split('/')[1] || 'dashboard';

  const handleSaveProperty = async (property: Property) => {
    const p = { ...property };
    if (p.images?.length && !p.thumbnail) {
      p.thumbnail = await gerarThumbnail(p.images[0]);
    }
    await saveProperty(p, profile);
  };

  if (showSplash) return <SplashScreen onEnter={() => {
    setShowSplash(false);
    if (!profile.name) {
      navigate('/profile');
    }
  }} />;

  return (
    <div className="min-h-screen bg-[#030303] flex text-white font-sans selection:bg-orange-500 selection:text-white">
      <Sidebar 
        currentView={currentView} 
        onViewChange={(v) => {
          if (v === 'form') {
            setPropertyToEdit(null);
          }
          navigate(v === 'dashboard' ? '/' : `/${v}`);
        }} 
        profile={profile} 
        onLogout={handleLogout}
      />
      
      <div className="flex-1 flex flex-col h-screen relative min-w-0 overflow-hidden">
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 lg:px-12 bg-black/20 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center font-black text-xs">IA</div>
            <span className="font-black text-base tracking-tight">IAmobil</span>
          </div>

          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/5 text-[9px] font-black uppercase tracking-widest text-gray-500">
             <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
             Core Operacional
          </div>

          <div className="flex items-center gap-4">
              <button
                  onClick={() => toast('✅ Conectado ao servidor', 'success')}
                  className="p-1.5 text-gray-400 hover:text-white transition-colors relative"
               >
                  <Bell size={18} />
               </button>
             <div className="w-[1px] h-3 bg-white/10" />
             <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end gap-0.5">
                   <p className="text-[8px] font-black text-gray-600 uppercase tracking-[0.2em] leading-none">Corretor Premium</p>
                   <p className="text-[10px] font-bold text-white leading-none">ID: Active</p>
                </div>
             </div>
          </div>
        </header>

        {!isOnline && (
          <div className="bg-orange-500/90 backdrop-blur-sm text-center text-[10px] font-bold text-black py-1.5 px-4 tracking-wide uppercase sticky top-0 z-40">
            Você está offline — os dados podem estar desatualizados
          </div>
        )}
        <main className="flex-1 overflow-y-auto custom-scrollbar pb-32 lg:pb-12">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <Dashboard 
                    properties={properties} 
                    onAddClick={() => { setPropertyToEdit(null); navigate('/form'); }}
                    onPropertyClick={(p) => { 
                      setPropertyToView(p);
                    }}
                    onDelete={setPropertyToDelete}
                    onEdit={async (p) => { 
                      setPropertyToView(null); 
                      // Busca a mídia completa (vídeo/imagens grandes) que não vem na listagem
                      try {
                        const res = await fetch(`${getApiUrl()}/api/partner/property-image?id=${p.id}`);
                        const data = await res.json();
                        if (data.success) {
                          p.videoData = data.videoData || p.videoData;
                          p.videoType = data.videoType || p.videoType;
                          p.videoUrl = data.videoUrl || p.videoUrl;
                          p.images = data.images?.length > 0 ? data.images : p.images;
                        }
                      } catch (e) {
                        console.error('Erro pre-fetch edição:', e);
                      }
                      
                      setPropertyToEdit(p); 
                      navigate('/form'); 
                    }}
                    loading={loading}
                  />
                </motion.div>
              } />

              <Route path="/form" element={
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="p-6 lg:p-12">
                  <PropertyForm 
                    key={propertyToEdit ? propertyToEdit.id : 'new'}
                    onSave={handleSaveProperty}
                    onCancel={() => navigate('/')}
                    initialData={propertyToEdit || undefined}
                  />
                </motion.div>
              } />

              <Route path="/profile" element={
                <ProfileView />
              } />

              <Route path="/appointments" element={
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <Appointments />
                </motion.div>
              } />

              <Route path="/business-card" element={
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-0">
                  <BusinessCard profile={profile} />
                </motion.div>
              } />

              <Route path="/campanhas" element={
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <Campaigns />
                </motion.div>
              } />

              <Route path="/imovel/:id" element={
                <div className="p-4 text-center text-gray-500 text-sm">Redirecionando...</div>
              } />

            </Routes>
          </AnimatePresence>
        </main>

        <BottomBar 
          currentView={currentView} 
          onViewChange={(v) => navigate(v === 'dashboard' ? '/' : `/${v}`)} 
        />
      </div>

      <ConfirmationModal
        isOpen={!!propertyToDelete}
        onClose={() => setPropertyToDelete(null)}
        onConfirm={() => {
          if (propertyToDelete) {
            deleteProperty(propertyToDelete);
            setPropertyToDelete(null);
          }
        }}
        title="Excluir Imóvel"
        message="Tem certeza que deseja remover este imóvel da sua carteira?"
      />

      {/* PropertyDetails fora do layout para fixed funcionar corretamente */}
      <AnimatePresence>
      {propertyToView && (
          <PropertyDetails
            property={propertyToView}
            profile={profile}
            onClose={() => setPropertyToView(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
