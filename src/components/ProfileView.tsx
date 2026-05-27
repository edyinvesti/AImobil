import React from 'react';
import { useUser } from '../context/UserContext';
import { User, ShieldCheck, Mail, Phone, Camera, Save, CheckCircle2, Send } from 'lucide-react';

export function ProfileView() {
  const { profile, updateProfile } = useUser();
  const [formData, setFormData] = React.useState(profile);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  // Mantém os campos do formulário atualizados se o perfil mudar
  React.useEffect(() => {
    setFormData({
      ...profile,
      name: profile.name === 'Buscando perfil...' ? '' : profile.name
    });
  }, [profile]);
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.Login) {
        alert("O campo Login é obrigatório para acessar sua conta.");
        return;
    }
    
    const finalData = {
      ...formData,
      name: formData.name === 'Buscando perfil...' ? '' : formData.name
    };
    setIsSaving(true);
    try {
        // Agora o updateProfile do Context cuida da sincronização com a nuvem
        await updateProfile(finalData);
        setSaved(true);
    } catch (err: any) {
        console.error("Erro ao salvar perfil:", err);
        alert("Erro ao salvar perfil: " + (err.message || "Verifique sua conexão"));
    } finally {
        setIsSaving(false);
        setTimeout(() => setSaved(false), 2000);
  };
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photo: reader.result as string }));
      };
      reader.readAsDataURL(file);
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    // Aplica a máscara (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
    let formatted = value;
    if (value.length > 0) {
      formatted = `(${value.slice(0, 2)}`;
      if (value.length > 2) {
        formatted += `) ${value.slice(2, 7)}`;
        if (value.length > 7) {
            formatted += `-${value.slice(7)}`;
        }
      }
    setFormData(prev => ({ ...prev, phone: formatted }));
  return (
    <div className="p-6 lg:p-10 w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Meu Perfil</h1>
        <p className="text-gray-500 text-xs mt-1 font-bold uppercase tracking-widest">Configurações do Corretor</p>
      </div>
      <div className="flex flex-col lg:flex-row gap-8">
        {/* LEFT: ID Card */}
        <div className="w-full lg:w-72 shrink-0">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 flex flex-col items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-28 h-28 rounded-2xl bg-zinc-800 border-2 border-orange-500/30 overflow-hidden flex items-center justify-center">
                {formData.photo ? (
                  <img src={formData.photo} className="w-full h-full object-cover" alt="Foto de perfil" />
                ) : (
                  <User size={44} className="text-orange-500/40" />
                )}
              </div>
              <label className="absolute -bottom-2 -right-2 p-2.5 bg-orange-500 text-white rounded-xl cursor-pointer hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/30">
                <Camera size={14} />
                <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
              </label>
            </div>
            {/* Name & Login */}
            <div className="text-center">
              <h2 className="text-lg font-black text-white uppercase tracking-tighter leading-tight">
                {formData.name || 'Seu Nome'}
              </h2>
              <div className="flex items-center justify-center gap-1.5 mt-2 px-3 py-1 bg-orange-500/10 rounded-full border border-orange-500/20 w-fit mx-auto">
                <ShieldCheck size={11} className="text-orange-500" />
                <span className="text-[10px] font-black text-orange-500 tracking-widest uppercase">
                  {formData.Login || 'Login'}
                </span>
            {/* Contact Info */}
            <div className="w-full border-t border-white/5 pt-5 space-y-3">
              <div className="flex items-center gap-3">
                <Mail size={13} className="text-orange-500 shrink-0" />
                <span className="text-[11px] text-gray-400 font-bold truncate">{formData.email || '—'}</span>
                <Phone size={13} className="text-orange-500 shrink-0" />
                <span className="text-[11px] text-gray-400 font-bold">{formData.phone || '—'}</span>
                <Send size={13} className="text-orange-500 shrink-0" />
                <span className="text-[11px] text-gray-400 font-bold">{formData.telegramId || '—'}</span>
          </div>
        </div>
        {/* RIGHT: Edit Form */}
        <div className="flex-1">
          <form onSubmit={handleSave} className="bg-zinc-900 border border-white/10 rounded-3xl p-8 space-y-6">
            <h3 className="text-sm font-black text-white uppercase tracking-widest border-b border-white/5 pb-4">
              Editar Informações
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">
                  Nome Completo
                </label>
                <input
                  className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-3.5 text-white text-sm font-bold outline-none focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-gray-700"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: João Silva"
                />
                  Login
                  value={formData.Login} onChange={(e) => setFormData({...formData, Login: e.target.value})}
                  onChange={e => setFormData(prev => ({ ...prev, Login: e.target.value }))}
                  placeholder="Ex: 987456-F"
                  E-mail
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="seu@email.com"
                  WhatsApp
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  placeholder="(11) 99999-9999"
                  Telegram (ID ou @usuario)
                  value={formData.telegramId || ''}
                  onChange={e => setFormData(prev => ({ ...prev, telegramId: e.target.value }))}
                  placeholder="@usuario ou 123456789"
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2.5 px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-orange-500/20 active:scale-95 disabled:opacity-50"
              >
                {saved
                  ? <><CheckCircle2 size={16} /> Salvo!</>
          </button>
        </form>
      </div>
    </div>
  );
}
