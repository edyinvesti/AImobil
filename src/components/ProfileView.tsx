import React from 'react';
import React from 'react';
import { useUser } from '../context/UserContext';
import { useUser } from '../context/UserContext';
import { User, ShieldCheck, Mail, Phone, Camera, Save, CheckCircle2, Send } from 'lucide-react';
import { User, ShieldCheck, Mail, Phone, Camera, Save, CheckCircle2, Send } from 'lucide-react';


export function ProfileView() {
export function ProfileView() {
  const { profile, updateProfile } = useUser();
  const { profile, updateProfile } = useUser();
  const [formData, setFormData] = React.useState(profile);
  const [formData, setFormData] = React.useState(profile);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [saved, setSaved] = React.useState(false);


  // Mantém os campos do formulário atualizados se o perfil mudar
  // Mantém os campos do formulário atualizados se o perfil mudar
  React.useEffect(() => {
  React.useEffect(() => {
    setFormData({
    setFormData({
      ...profile,
      ...profile,
      name: profile.name === 'Buscando perfil...' ? '' : profile.name
      name: profile.name === 'Buscando perfil...' ? '' : profile.name
    });
    });
  }, [profile]);
  }, [profile]);


  const handleSave = async (e: React.FormEvent) => {
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    e.preventDefault();
    if (!formData.Login) {
    if (!formData.Login) {
        alert("O campo Login é obrigatório para acessar sua conta.");
        alert("O campo Login é obrigatório para acessar sua conta.");
        return;
        return;
    }
    }
    
    
    const finalData = {
    const finalData = {
      ...formData,
      ...formData,
      name: formData.name === 'Buscando perfil...' ? '' : formData.name
      name: formData.name === 'Buscando perfil...' ? '' : formData.name
    };
    };
    
    
    setIsSaving(true);
    setIsSaving(true);
    
    
    try {
    try {
        // Agora o updateProfile do Context cuida da sincronização com a nuvem
        // Agora o updateProfile do Context cuida da sincronização com a nuvem
        await updateProfile(finalData);
        await updateProfile(finalData);
        setSaved(true);
        setSaved(true);
    } catch (err: any) {
    } catch (err: any) {
        console.error("Erro ao salvar perfil:", err);
        console.error("Erro ao salvar perfil:", err);
        alert("Erro ao salvar perfil: " + (err.message || "Verifique sua conexão"));
        alert("Erro ao salvar perfil: " + (err.message || "Verifique sua conexão"));
    } finally {
    } finally {
        setIsSaving(false);
        setIsSaving(false);
        setTimeout(() => setSaved(false), 2000);
        setTimeout(() => setSaved(false), 2000);
    }
    }
  };
  };


  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const file = e.target.files?.[0];
    if (file) {
    if (file) {
      const reader = new FileReader();
      const reader = new FileReader();
      reader.onloadend = () => {
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photo: reader.result as string }));
        setFormData(prev => ({ ...prev, photo: reader.result as string }));
      };
      };
      reader.readAsDataURL(file);
      reader.readAsDataURL(file);
    }
    }
  };
  };


  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 11) value = value.slice(0, 11);
    
    
    // Aplica a máscara (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
    // Aplica a máscara (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
    let formatted = value;
    let formatted = value;
    if (value.length > 0) {
    if (value.length > 0) {
      formatted = `(${value.slice(0, 2)}`;
      formatted = `(${value.slice(0, 2)}`;
      if (value.length > 2) {
      if (value.length > 2) {
        formatted += `) ${value.slice(2, 7)}`;
        formatted += `) ${value.slice(2, 7)}`;
        if (value.length > 7) {
        if (value.length > 7) {
            formatted += `-${value.slice(7)}`;
            formatted += `-${value.slice(7)}`;
        }
        }
      }
      }
    }
    }
    setFormData(prev => ({ ...prev, phone: formatted }));
    setFormData(prev => ({ ...prev, phone: formatted }));
  };
  };


  return (
  return (
    <div className="p-6 lg:p-10 w-full max-w-5xl mx-auto">
    <div className="p-6 lg:p-10 w-full max-w-5xl mx-auto">


      {/* Header */}
      {/* Header */}
      <div className="mb-10">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Meu Perfil</h1>
        <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Meu Perfil</h1>
        <p className="text-gray-500 text-xs mt-1 font-bold uppercase tracking-widest">Configurações do Corretor</p>
        <p className="text-gray-500 text-xs mt-1 font-bold uppercase tracking-widest">Configurações do Corretor</p>
      </div>
      </div>


      <div className="flex flex-col lg:flex-row gap-8">
      <div className="flex flex-col lg:flex-row gap-8">


        {/* LEFT: ID Card */}
        {/* LEFT: ID Card */}
        <div className="w-full lg:w-72 shrink-0">
        <div className="w-full lg:w-72 shrink-0">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 flex flex-col items-center gap-6">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 flex flex-col items-center gap-6">


            {/* Avatar */}
            {/* Avatar */}
            <div className="relative">
            <div className="relative">
              <div className="w-28 h-28 rounded-2xl bg-zinc-800 border-2 border-orange-500/30 overflow-hidden flex items-center justify-center">
              <div className="w-28 h-28 rounded-2xl bg-zinc-800 border-2 border-orange-500/30 overflow-hidden flex items-center justify-center">
                {formData.photo ? (
                {formData.photo ? (
                  <img src={formData.photo} className="w-full h-full object-cover" alt="Foto de perfil" />
                  <img src={formData.photo} className="w-full h-full object-cover" alt="Foto de perfil" />
                ) : (
                ) : (
                  <User size={44} className="text-orange-500/40" />
                  <User size={44} className="text-orange-500/40" />
                )}
                )}
              </div>
              </div>
              <label className="absolute -bottom-2 -right-2 p-2.5 bg-orange-500 text-white rounded-xl cursor-pointer hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/30">
              <label className="absolute -bottom-2 -right-2 p-2.5 bg-orange-500 text-white rounded-xl cursor-pointer hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/30">
                <Camera size={14} />
                <Camera size={14} />
                <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
              </label>
              </label>
            </div>
            </div>


            {/* Name & Login */}
            {/* Name & Login */}
            <div className="text-center">
            <div className="text-center">
              <h2 className="text-lg font-black text-white uppercase tracking-tighter leading-tight">
              <h2 className="text-lg font-black text-white uppercase tracking-tighter leading-tight">
                {formData.name || 'Seu Nome'}
                {formData.name || 'Seu Nome'}
              </h2>
              </h2>
              <div className="flex items-center justify-center gap-1.5 mt-2 px-3 py-1 bg-orange-500/10 rounded-full border border-orange-500/20 w-fit mx-auto">
              <div className="flex items-center justify-center gap-1.5 mt-2 px-3 py-1 bg-orange-500/10 rounded-full border border-orange-500/20 w-fit mx-auto">
                <ShieldCheck size={11} className="text-orange-500" />
                <ShieldCheck size={11} className="text-orange-500" />
                <span className="text-[10px] font-black text-orange-500 tracking-widest uppercase">
                <span className="text-[10px] font-black text-orange-500 tracking-widest uppercase">
                  {formData.Login || 'Login'}
                  {formData.Login || 'Login'}
                </span>
                </span>
              </div>
              </div>
            </div>
            </div>


            {/* Contact Info */}
            {/* Contact Info */}
            <div className="w-full border-t border-white/5 pt-5 space-y-3">
            <div className="w-full border-t border-white/5 pt-5 space-y-3">
              <div className="flex items-center gap-3">
              <div className="flex items-center gap-3">
                <Mail size={13} className="text-orange-500 shrink-0" />
                <Mail size={13} className="text-orange-500 shrink-0" />
                <span className="text-[11px] text-gray-400 font-bold truncate">{formData.email || '—'}</span>
                <span className="text-[11px] text-gray-400 font-bold truncate">{formData.email || '—'}</span>
              </div>
              </div>
              <div className="flex items-center gap-3">
              <div className="flex items-center gap-3">
                <Phone size={13} className="text-orange-500 shrink-0" />
                <Phone size={13} className="text-orange-500 shrink-0" />
                <span className="text-[11px] text-gray-400 font-bold">{formData.phone || '—'}</span>
                <span className="text-[11px] text-gray-400 font-bold">{formData.phone || '—'}</span>
              </div>
              </div>
              <div className="flex items-center gap-3">
              <div className="flex items-center gap-3">
                <Send size={13} className="text-orange-500 shrink-0" />
                <Send size={13} className="text-orange-500 shrink-0" />
                <span className="text-[11px] text-gray-400 font-bold">{formData.telegramId || '—'}</span>
                <span className="text-[11px] text-gray-400 font-bold">{formData.telegramId || '—'}</span>
              </div>
              </div>
            </div>
            </div>
          </div>
          </div>
        </div>
        </div>


        {/* RIGHT: Edit Form */}
        {/* RIGHT: Edit Form */}
        <div className="flex-1">
        <div className="flex-1">
          <form onSubmit={handleSave} className="bg-zinc-900 border border-white/10 rounded-3xl p-8 space-y-6">
          <form onSubmit={handleSave} className="bg-zinc-900 border border-white/10 rounded-3xl p-8 space-y-6">


            <h3 className="text-sm font-black text-white uppercase tracking-widest border-b border-white/5 pb-4">
            <h3 className="text-sm font-black text-white uppercase tracking-widest border-b border-white/5 pb-4">
              Editar Informações
              Editar Informações
            </h3>
            </h3>


            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">


              <div className="space-y-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">
                  Nome Completo
                  Nome Completo
                </label>
                </label>
                <input
                <input
                  className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-3.5 text-white text-sm font-bold outline-none focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-gray-700"
                  className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-3.5 text-white text-sm font-bold outline-none focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-gray-700"
                  value={formData.name}
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: João Silva"
                  placeholder="Ex: João Silva"
                />
                />
              </div>
              </div>


              <div className="space-y-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">
                  Login
                  Login
                </label>
                </label>
                <input
                <input
                  className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-3.5 text-white text-sm font-bold outline-none focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-gray-700"
                  className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-3.5 text-white text-sm font-bold outline-none focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-gray-700"
                  value={formData.Login} onChange={(e) => setFormData({...formData, Login: e.target.value})}
                  value={formData.Login} onChange={(e) => setFormData({...formData, Login: e.target.value})}
                  onChange={e => setFormData(prev => ({ ...prev, Login: e.target.value }))}
                  onChange={e => setFormData(prev => ({ ...prev, Login: e.target.value }))}
                  placeholder="Ex: 987456-F"
                  placeholder="Ex: 987456-F"
                />
                />
              </div>
              </div>


              <div className="space-y-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">
                  E-mail
                  E-mail
                </label>
                </label>
                <input
                <input
                  type="email"
                  type="email"
                  className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-3.5 text-white text-sm font-bold outline-none focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-gray-700"
                  className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-3.5 text-white text-sm font-bold outline-none focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-gray-700"
                  value={formData.email}
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="seu@email.com"
                  placeholder="seu@email.com"
                />
                />
              </div>
              </div>


              <div className="space-y-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">
                  WhatsApp
                  WhatsApp
                </label>
                </label>
                <input
                <input
                  className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-3.5 text-white text-sm font-bold outline-none focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-gray-700"
                  className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-3.5 text-white text-sm font-bold outline-none focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-gray-700"
                  value={formData.phone}
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  onChange={handlePhoneChange}
                  placeholder="(11) 99999-9999"
                  placeholder="(11) 99999-9999"
                />
                />
              </div>
              </div>


              <div className="space-y-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">
                  Telegram (ID ou @usuario)
                  Telegram (ID ou @usuario)
                </label>
                </label>
                <input
                <input
                  className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-3.5 text-white text-sm font-bold outline-none focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-gray-700"
                  className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-3.5 text-white text-sm font-bold outline-none focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-gray-700"
                  value={formData.telegramId || ''}
                  value={formData.telegramId || ''}
                  onChange={e => setFormData(prev => ({ ...prev, telegramId: e.target.value }))}
                  onChange={e => setFormData(prev => ({ ...prev, telegramId: e.target.value }))}
                  placeholder="@usuario ou 123456789"
                  placeholder="@usuario ou 123456789"
                />
                />
              </div>
              </div>


            </div>
            </div>


            <div className="pt-2 flex justify-end">
            <div className="pt-2 flex justify-end">
              <button
              <button
                type="submit"
                type="submit"
                disabled={isSaving}
                disabled={isSaving}
                className="flex items-center gap-2.5 px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-orange-500/20 active:scale-95 disabled:opacity-50"
                className="flex items-center gap-2.5 px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-orange-500/20 active:scale-95 disabled:opacity-50"
              >
              >
                {saved
                {saved
                  ? <><CheckCircle2 size={16} /> Salvo!</>
                  ? <><CheckCircle2 size={16} /> Salvo!</>
                  : isSaving
                  : isSaving
                    ? <><Save size={16} className="animate-spin" /> Salvando...</>
                    ? <><Save size={16} className="animate-spin" /> Salvando...</>
                    : <><Save size={16} /> Salvar Alterações</>
                    : <><Save size={16} /> Salvar Alterações</>
                }
                }
              </button>
              </button>
            </div>
            </div>


          </form>
          </form>
        </div>
        </div>


      </div>
      </div>
    </div>
    </div>
  );
  );
}
}
