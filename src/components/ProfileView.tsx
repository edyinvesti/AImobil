import React from 'react';
import { useUser } from '../context/UserContext';
import { User, ShieldCheck, Mail, Phone, Camera, Save, Send } from 'lucide-react';

export function ProfileView() {
  const { profile, updateProfile } = useUser();
  const [formData, setFormData] = React.useState(profile);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    setFormData({
      ...profile,
      name: profile.name === 'Buscando perfil...' ? '' : profile.name
    });
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.login) {
      alert("O campo login é obrigatório.");
      return;
    }
    setIsSaving(true);
    try {
      await updateProfile(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      alert("Erro ao salvar: " + (err.message || "Tente novamente"));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    let formatted = value;
    if (value.length > 0) {
      formatted = `(${value.slice(0, 2)}`;
      if (value.length > 2) {
        formatted += `) ${value.slice(2, 7)}`;
        if (value.length > 7) formatted += `-${value.slice(7)}`;
      }
    }
    setFormData(prev => ({ ...prev, phone: formatted }));
  };

  return (
    <div className="p-6 lg:p-10 w-full max-w-5xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Meu Perfil</h1>
      </div>
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-72 shrink-0">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 flex flex-col items-center gap-6">
            <div className="relative">
              <div className="w-28 h-28 rounded-2xl bg-zinc-800 border-2 border-orange-500/30 overflow-hidden flex items-center justify-center">
                {formData.photo ? <img src={formData.photo} className="w-full h-full object-cover" alt="Perfil" /> : <User size={44} className="text-orange-500/40" />}
              </div>
              <label className="absolute -bottom-2 -right-2 p-2.5 bg-orange-500 text-white rounded-xl cursor-pointer hover:bg-orange-600">
                <Camera size={14} />
                <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
              </label>
            </div>
            <h2 className="text-lg font-black text-white uppercase">{formData.name || 'Seu Nome'}</h2>
          </div>
        </div>

        <div className="flex-1">
          <form onSubmit={handleSave} className="bg-zinc-900 border border-white/10 rounded-3xl p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-500">Nome Completo</label>
                <input className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-3.5 text-white text-sm" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-500">login</label>
                <input className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-3.5 text-white text-sm" value={formData.login || ''} onChange={e => setFormData({ ...formData, login: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-500">E-mail</label>
                <input className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-3.5 text-white text-sm" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-500">WhatsApp</label>
                <input className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-3.5 text-white text-sm" value={formData.phone || ''} onChange={handlePhoneChange} />
              </div>
            </div>
            <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-lg transition-colors">
              {isSaving ? "Salvando..." : "Salvar Alterações"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
