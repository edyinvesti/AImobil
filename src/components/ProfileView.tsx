import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import { User, ShieldCheck, Mail, Phone, Camera, Save, Send, Search, LogOut, Eye, EyeOff, KeyRound, CheckCircle2 } from 'lucide-react';
import { getApiUrl } from '../utils';
import { useToast } from '../hooks/useToast';

export function ProfileView() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { profile, updateProfile, logout } = useUser();
  const [formData, setFormData] = useState(profile);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setFormData({
      ...profile,
      name: profile.name === 'Buscando perfil...' ? '' : profile.name
    });
  }, [profile]);

  const handleFetchProfile = async () => {
    if (!formData.login) {
      toast("Digite o login primeiro.", 'warning');
      return;
    }
    setIsLoading(true);
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/partner/register?login=${encodeURIComponent(formData.login)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.broker) {
          setFormData({
            login: data.broker.login,
            name: data.broker.name || '',
            email: data.broker.email || '',
            phone: data.broker.phone || '',
            photo: data.broker.photo || '',
            password: ''
          });
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        } else {
          toast("Corretor não encontrado no banco de dados.", 'error');
        }
      } else {
        toast("Erro ao buscar perfil.", 'error');
      }
    } catch (err: unknown) {
      toast("Erro ao buscar perfil: " + (err instanceof Error ? err.message : "Tente novamente"), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.login) {
      toast("O campo login é obrigatório.", 'warning');
      return;
    }
    setIsSaving(true);
    try {
      await updateProfile(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: unknown) {
      toast("Erro ao salvar: " + (err instanceof Error ? err.message : "Tente novamente"), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
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
                <label className="text-[10px] font-black uppercase text-gray-500">login (CRECI)</label>
                <div className="flex gap-2">
                  <input className="flex-1 bg-black/40 border border-white/5 rounded-2xl px-5 py-3.5 text-white text-sm" value={formData.login || ''} onChange={e => setFormData({ ...formData, login: e.target.value })} />
                  <button type="button" onClick={handleFetchProfile} disabled={isLoading} className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 text-white p-3.5 rounded-2xl transition-colors">
                    <Search size={18} />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-500">E-mail</label>
                <input className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-3.5 text-white text-sm" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-500">WhatsApp</label>
                <input className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-3.5 text-white text-sm" value={formData.phone || ''} onChange={handlePhoneChange} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-500">Nova Senha</label>
                <div className="flex gap-2">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="flex-1 bg-black/40 border border-white/5 rounded-2xl px-5 py-3.5 text-white text-sm"
                    value={formData.password || ''}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Deixe em branco para manter a atual"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="bg-black/40 border border-white/5 text-gray-400 p-3.5 rounded-2xl hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>
            <button 
              type="submit" 
              disabled={isSaving}
              className={`w-full ${saved ? 'bg-emerald-600' : 'bg-orange-500 hover:bg-orange-600'} text-white font-bold py-3.5 px-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 transform active:scale-[0.98] disabled:opacity-70`}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Salvando...
                </>
              ) : saved ? (
                <>
                  <CheckCircle2 size={18} />
                  Salvo na sua Carteira
                </>
              ) : (
                <>
                  <Save size={18} />
                  Salvar Alterações
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10">
            <button
              onClick={() => { logout(); navigate('/'); }}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all text-[9px] font-black uppercase tracking-widest border border-red-500/20"
            >
              <LogOut size={14} /> Encerrar Sessão
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
