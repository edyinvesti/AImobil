import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { SplashScreen } from "./components/SplashScreen";
import React, { useState, useEffect } from "react";
import { Dashboard } from "./components/Dashboard";
import { PropertyForm } from "./components/PropertyForm";
import { PropertyDetails } from "./components/PropertyDetails";
import { Sidebar } from "./components/Sidebar";
import { BottomBar } from "./components/BottomBar";
import { BusinessCard } from "./components/BusinessCard";
import { ProfileView } from "./components/ProfileView";
import { Appointments } from "./components/Appointments";
import { ConfirmationModal } from "./components/ConfirmationModal";
import { Bell } from "lucide-react";
import { useProperties } from "./hooks/useProperties";
import { useUser } from "./context/UserContext";
import { AnimatePresence, motion } from "framer-motion";
import { Property } from "./types";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const { profile, updateProfile, logout } = useUser();
  const { properties, saveProperty, deleteProperty, forceSync, loading, syncStatus } = useProperties(profile.creci);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
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
    await saveProperty(property, profile);
    navigate('/');
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
        onViewChange={(v) => navigate(v === 'dashboard' ? '/' : `/${v}`)} 
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
             <button className="p-1.5 text-gray-400 hover:text-white transition-colors relative">
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-orange-500 rounded-full border-2 border-[#030303]" />
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

        <main className="flex-1 overflow-y-auto custom-scrollbar pb-32 lg:pb-12">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <Dashboard 
                    properties={properties} 
                    onAddClick={() => { setSelectedProperty(null); navigate('/form'); }}
                    onPropertyClick={(p) => { setSelectedProperty(p); }}
                    onDelete={setPropertyToDelete}
                    onEdit={(p) => { setSelectedProperty(p); navigate('/form'); }}
                    onSync={forceSync}
                    loading={loading}
                    syncStatus={syncStatus}
                  />
                </motion.div>
              } />

              <Route path="/form" element={
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="p-6 lg:p-12">
                  <PropertyForm 
                    onSave={handleSaveProperty}
                    onCancel={() => navigate('/')}
                    initialData={selectedProperty || undefined}
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
        {selectedProperty && (
          <PropertyDetails
            property={selectedProperty}
            profile={profile}
            onClose={() => setSelectedProperty(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
