import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import { User, ShieldCheck, Mail, Phone, Camera, Save, Send, Search, LogOut, Eye, EyeOff, KeyRound, CheckCircle2, MessageCircle, Link2, Unlink, Copy, Check } from 'lucide-react';
import { getApiUrl, authFetch } from '../utils';
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
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [telegramCopied, setTelegramCopied] = useState(false);
  const [linkInput, setLinkInput] = useState('');

  useEffect(() => {
    const fetchTelegram = async () => {
      try {
        const res = await authFetch(`${getApiUrl()}/api/profile/telegram-id`);
        if (res.ok) {
          const data = await res.json();
          if (data.telegramId) setTelegramId(data.telegramId);
        }
      } catch (e) {}
    };
    if (profile.login) fetchTelegram();
  }, [profile.login]);

  const handleLinkTelegram = async () => {
    if (!linkInput.trim()) return;
    try {
      const res = await authFetch(`${getApiUrl()}/api/profile/telegram-id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: linkInput.trim() })
      });
      if (res.ok) {
        setTelegramId(linkInput.trim());
        setLinkInput('');
        toast('✅ Conta Telegram vinculada com sucesso!', 'success');
      } else {
        toast('Erro ao vincular conta Telegram', 'error');
      }
    } catch (e) {
      toast('Erro de conexão', 'error');
    }
  };

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
      const response = await authFetch(`${apiUrl}/api/partner/register?login=${encodeURIComponent(formData.login)}`);
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

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setSaved(false);
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
        setSaved(false);
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
    setSaved(false);
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
                <input name="name" className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-3.5 text-white text-sm" value={formData.name || ''} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-500">login (CRECI)</label>
                <div className="flex gap-2">
                  <input name="login" className="flex-1 bg-black/40 border border-white/5 rounded-2xl px-5 py-3.5 text-white text-sm" value={formData.login || ''} onChange={handleChange} />
                  <button type="button" onClick={handleFetchProfile} disabled={isLoading} className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 text-white p-3.5 rounded-2xl transition-colors">
                    <Search size={18} />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-500">E-mail</label>
                <input name="email" className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-3.5 text-white text-sm" value={formData.email || ''} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-500">WhatsApp</label>
                <input name="phone" className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-3.5 text-white text-sm" value={formData.phone || ''} onChange={handlePhoneChange} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-500">Nova Senha</label>
                <div className="flex gap-2">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    className="flex-1 bg-black/40 border border-white/5 rounded-2xl px-5 py-3.5 text-white text-sm"
                    value={formData.password || ''}
                    onChange={handleChange}
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
            <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sky-500/20 rounded-2xl flex items-center justify-center">
                  <MessageCircle size={20} className="text-sky-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase">Telegram</h3>
                  <p className="text-[10px] text-gray-500">Receba notificações e gerencie pelo bot</p>
                </div>
              </div>

              <div className="bg-black/40 border border-white/5 rounded-2xl p-4 space-y-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Bot do Telegram</p>
                <div className="flex items-center justify-between">
                  <code className="text-sm font-mono text-orange-400">@iamobil_br_bot</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('@iamobil_br_bot');
                      setTelegramCopied(true);
                      setTimeout(() => setTelegramCopied(false), 2000);
                    }}
                    className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    {telegramCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-gray-400" />}
                  </button>
                </div>
              </div>

              {telegramId ? (
                <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span className="text-xs text-emerald-400 font-bold">Vinculado (ID: {telegramId})</span>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await authFetch(`${getApiUrl()}/api/profile/telegram-id`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ telegramId: '' })
                        });
                        setTelegramId(null);
                        toast('❌ Conta Telegram desvinculada', 'info');
                      } catch (e) {
                        toast('Erro ao desvincular', 'error');
                      }
                    }}
                    className="p-2 bg-red-500/20 rounded-xl hover:bg-red-500/30 transition-colors"
                  >
                    <Unlink size={14} className="text-red-400" />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    1. Envie /start para <code className="text-orange-400">@iamobil_br_bot</code> no Telegram
                  </p>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    2. Digite /id no bot e cole abaixo:
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={linkInput}
                      onChange={e => setLinkInput(e.target.value)}
                      placeholder="Cole seu Telegram ID aqui..."
                      className="flex-1 bg-black/40 border border-white/5 rounded-2xl px-4 py-3 text-white text-sm"
                    />
                    <button
                      onClick={handleLinkTelegram}
                      disabled={!linkInput.trim()}
                      className="bg-sky-500 hover:bg-sky-600 disabled:bg-sky-500/50 text-white px-4 rounded-2xl transition-colors"
                    >
                      <Link2 size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6">
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
