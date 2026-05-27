import React, { useState } from 'react';
import { Property, PropertyType, OfferType, PropertyStatus, AreaUnit } from '../types';
import { X, Camera, MapPin, Bed, Trash2, CheckCircle2, DollarSign, Square, Target, Car } from 'lucide-react';
import { compressImage } from '../utils';

interface PropertyFormProps {
    onSave: (property: Property) => void;
    onCancel: () => void;
    initialData?: Property;
}

const AMENITIES_OPTIONS = [
    'Piscina', 'Churrasqueira', 'Academia', 'Portaria 24h',
    'Salão de Festas', 'Ar Condicionado', 'Mobiliado', 'Varanda Gourmet',
    'Elevador', 'Jardim', 'Pet Friendly', 'Sistema de Alarme'
];

export const PropertyForm: React.FC<PropertyFormProps> = ({ onSave, onCancel, initialData }) => {
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        type: initialData?.type || 'Apartamento' as PropertyType,
        offerType: initialData?.offerType || 'Venda' as OfferType,
        price: initialData?.price || 0,
        status: initialData?.status || 'Disponível' as PropertyStatus,
        address: initialData?.address || '',
        zipCode: initialData?.zipCode || '',
        neighborhood: initialData?.neighborhood || '',
        city: initialData?.city || '',
        state: initialData?.state || '',
        streetNumber: initialData?.streetNumber || '',
        complement: initialData?.complement || '',
        size: initialData?.size || 0,
        sizeUnit: initialData?.sizeUnit || 'm²' as AreaUnit,
        bedrooms: initialData?.bedrooms || 0,
        suites: initialData?.suites || 0,
        livingRooms: initialData?.livingRooms || 0,
        kitchens: initialData?.kitchens || 0,
        bathrooms: initialData?.bathrooms || 0,
        parkingSpaces: initialData?.parkingSpaces || 0,
        description: initialData?.description || '',
        amenities: initialData?.amenities || [] as string[],
    });
    const [displayPrice, setDisplayPrice] = useState(
        initialData?.price
            ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(initialData.price)
            : ''
    );
    const [displayArea, setDisplayArea] = useState(
        initialData?.size
            ? new Intl.NumberFormat('pt-BR').format(initialData.size)
            : ''
    );
    const [images, setImages] = useState<string[]>(initialData?.images || []);
    const [states, setStates] = useState<{ sigla: string, nome: string }[]>([]);
    const [cities, setCities] = useState<string[]>([]);
    const [statesLoading, setStatesLoading] = useState(true);
    const [citiesLoading, setCitiesLoading] = useState(false);
    const [cepError, setCepError] = useState<string | null>(null);

    React.useEffect(() => {
        const fetchStates = async () => {
            try {
                const response = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome');
                if (!response.ok) throw new Error('Failed to fetch');
                const data = await response.json();
                setStates(data.map((s: any) => ({ sigla: s.sigla, nome: s.nome })));
            } catch (err) {
                console.error("Erro IBGE Estados:", err);
                setStates([{ sigla: 'GO', nome: 'Goiás' }, { sigla: 'SP', nome: 'São Paulo' }]);
            } finally {
                setStatesLoading(false);
            }
        };
        fetchStates();
    }, []);

    React.useEffect(() => {
        if (formData.state && formData.state.length === 2) {
            const fetchCities = async () => {
                setCitiesLoading(true);
                try {
                    const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${formData.state}/municipios?orderBy=nome`);
                    if (!response.ok) throw new Error('Failed to fetch');
                    const data = await response.json();
                    setCities(data.map((c: any) => c.nome));
                } catch (err) {
                    console.error("Erro IBGE Cidades:", err);
                    setCities([]);
                } finally {
                    setCitiesLoading(false);
                }
            };
            fetchCities();
        }
    }, [formData.state]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const remainingSlots = 10 - images.length;
            if (remainingSlots <= 0) {
                alert('Máximo de 10 imagens por imóvel.');
                return;
            }

            const filesToProcess = Array.from(files).slice(0, remainingSlots);

            for (const file of filesToProcess) {
                try {
                    const compressed = await compressImage(file);
                    setImages(prev => [...prev, compressed]);
                } catch (err) {
                    console.error("Erro ao comprimir imagem:", err);
                }
            }
        }
    };

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        if (!value) {
            setFormData({ ...formData, price: 0 });
            setDisplayPrice('');
            return;
        }

        const numberValue = Number(value) / 100;
        setFormData({ ...formData, price: numberValue });
        setDisplayPrice(new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(numberValue));
    };

    const handleAreaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        if (!value) {
            setFormData({ ...formData, size: 0 });
            setDisplayArea('');
            return;
        }

        const numberValue = Number(value);
        setFormData({ ...formData, size: numberValue });
        setDisplayArea(new Intl.NumberFormat('pt-BR').format(numberValue));
    };

    const handleCEPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 8) value = value.slice(0, 8);

        let masked = value;
        if (value.length > 5) {
            masked = `${value.slice(0, 5)}-${value.slice(5)}`;
        }

        setFormData(prev => ({ ...prev, zipCode: masked }));
    };

    const handleCEPBlur = async () => {
        const cep = formData.zipCode?.replace(/\D/g, '');
        setCepError(null);
        if (cep?.length === 8) {
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                if (!response.ok) throw new Error('CEP not found');
                const data = await response.json();
                if (data.erro) {
                    setCepError('CEP não encontrado');
                } else {
                    setFormData(prev => ({
                        ...prev,
                        address: data.logradouro || '',
                        neighborhood: data.bairro || '',
                        city: data.localidade || '',
                        state: data.uf || ''
                    }));
                }
            } catch (error) {
                console.error("Erro ao buscar CEP:", error);
                setCepError('Erro ao buscar CEP');
            }
        }
    };

    const generateId = () => {
        try {
            return crypto.randomUUID();
        } catch (e) {
            return Math.random().toString(36).substring(2) + Date.now().toString(36);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const id = initialData?.id || generateId();
            onSave({
                ...formData,
                id,
                images,
                createdAt: initialData?.createdAt || Date.now(),
            } as Property);
        } catch (error) {
            console.error("Erro ao salvar:", error);
            setIsSaving(false);
            alert("Ocorreu um erro ao salvar o imóvel. Verifique os dados e tente novamente.");
        }
    };

    const handleAmenityToggle = (amenity: string) => {
        setFormData(prev => {
            const alreadySelected = prev.amenities.includes(amenity);
            if (alreadySelected) {
                return { ...prev, amenities: prev.amenities.filter(a => a !== amenity) };
            } else {
                return { ...prev, amenities: [...prev.amenities, amenity] };
            }
        });
    };

    const isRural = formData.type === 'Fazenda' || formData.type === 'Chácara';

    return (
        <div className="w-full max-w-6xl mx-auto p-4 lg:p-8">

            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter">
                        {initialData ? 'Editar Imóvel' : 'Novo Imóvel'}
                    </h2>
                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-1.5 mt-1">
                        <Target size={10} /> Certificação IAmobil Gestor Premium
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onCancel}
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-gray-400 hover:text-white transition-all border border-white/5"
                >
                    <X size={18} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">

                {/* Grid Superior: Fotos e Dados Principais */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

                    {/* Fotos */}
                    <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 space-y-6 h-full">
                        <p className="text-[10px] font-black uppercase text-gray-500 tracking-[0.3em] flex items-center gap-2">
                            <Camera size={12} className="text-orange-500" /> Galeria de Fotos ({images.length})
                        </p>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                            {images.map((img, idx) => (
                                <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-white/10 group">
                                    <img src={img} className="w-full h-full object-cover" alt="" />
                                    <button
                                        type="button"
                                        onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-500 transition-opacity"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            <label className="aspect-video rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:bg-white/5 hover:border-orange-500/30 transition-all text-gray-700 hover:text-orange-500 bg-black/20">
                                <Camera size={18} />
                                <span className="text-[8px] font-black uppercase">Adicionar</span>
                                <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                            </label>
                        </div>
                        <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest text-center mt-4">
                            Dica: Use fotos horizontais para melhor visualização
                        </p>
                    </div>

                    {/* Dados Principais */}
                    <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 space-y-6">
                        <p className="text-[10px] font-black uppercase text-gray-500 tracking-[0.3em]">Dados do Ativo</p>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-gray-600 tracking-widest pl-1">Título do Anúncio</label>
                            <input
                                required
                                className="w-full bg-black/40 border border-emerald-500/10 rounded-2xl px-5 py-4 text-white text-base font-bold outline-none focus:ring-1 focus:ring-orange-500 focus:bg-black/60 transition-all placeholder:text-gray-800"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Ex: Apartamento frente mar na Riviera"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-gray-600 tracking-widest pl-1">Tipo</label>
                                <select
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-4 text-white text-sm font-bold outline-none appearance-none cursor-pointer hover:bg-black/60"
                                    value={formData.type}
                                    onChange={e => {
                                        const newType = e.target.value as PropertyType;
                                        const ruralMode = newType === 'Fazenda' || newType === 'Chácara';
                                        setFormData({
                                            ...formData,
                                            type: newType,
                                            sizeUnit: ruralMode ? 'Hectares' : 'm²' as AreaUnit
                                        });
                                    }}
                                >
                                    <option className="bg-black text-white font-bold" value="Apartamento">Apartamento</option>
                                    <option className="bg-black text-white font-bold" value="Casa">Casa</option>
                                    <option className="bg-black text-white font-bold" value="Terreno">Terreno</option>
                                    <option className="bg-black text-white font-bold" value="Chácara">Chácara</option>
                                    <option className="bg-black text-white font-bold" value="Fazenda">Fazenda</option>
                                    <option className="bg-black text-white font-bold" value="Comercial">Comercial</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-gray-600 tracking-widest pl-1">Operação</label>
                                <select
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-4 text-orange-500 text-sm font-bold outline-none appearance-none cursor-pointer hover:bg-black/60"
                                    value={formData.offerType}
                                    onChange={e => setFormData({ ...formData, offerType: e.target.value as OfferType })}
                                >
                                    <option className="bg-black text-white" value="Venda">Venda</option>
                                    <option className="bg-black text-white" value="Aluguel">Aluguel</option>
                                </select>
                            </div>
                        </div>

                        <div className="relative">
                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-orange-500 font-black text-xs uppercase">R$</span>
                            <input
                                required
                                type="text"
                                inputMode="numeric"
                                className="w-full bg-black/60 border border-orange-500/10 rounded-2xl pl-14 pr-5 py-5 text-white text-2xl font-black outline-none focus:ring-1 focus:ring-orange-500 transition-all"
                                value={displayPrice}
                                onChange={handlePriceChange}
                                placeholder="0,00"
                            />
                        </div>
                        {isRural && formData.size > 0 && (
                            <p className="text-[9px] text-emerald-500/70 font-black uppercase tracking-widest pl-1 mt-2">
                                Valor Médio: R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(formData.price / formData.size)} por {formData.sizeUnit}
                            </p>
                        )}
                    </div>
                </div>

                {/* Grid Inferior: Endereço e Detalhes Técnicos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

                    {/* Localização e Descrição */}
                    <div className="space-y-8">
                        <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 space-y-5">
                            <p className="text-[10px] font-black uppercase text-gray-500 tracking-[0.3em]">Localização Profissional</p>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-600 tracking-widest pl-1">CEP</label>
                                    <input
                                        className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white text-sm font-bold outline-none focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-gray-800"
                                        value={formData.zipCode}
                                        onBlur={handleCEPBlur}
                                        onChange={handleCEPChange}
                                        maxLength={9}
                                        placeholder="00000-000"
                                    />
                                    {cepError && <p className="text-red-500 text-[10px] pl-1 font-bold">{cepError}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-600 tracking-widest pl-1">Número</label>
                                    <input
                                        className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white text-sm font-bold outline-none focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-gray-800"
                                        value={formData.streetNumber || ''}
                                        onChange={e => setFormData({ ...formData, streetNumber: e.target.value })}
                                        placeholder="Ex: 123"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-gray-600 tracking-widest pl-1 flex justify-between">
                                    <span>Logradouro (Rua/Av)</span>
                                    <span className="text-[8px] text-orange-500/50">Opcional • Privacidade</span>
                                </label>
                                <div className="relative">
                                    <MapPin size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-orange-500" />
                                    <input
                                        className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-5 py-4 text-white text-sm font-bold outline-none focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-gray-800"
                                        value={formData.address || ''}
                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                        placeholder="Digite apenas se desejar divulgar a rua"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-600 tracking-widest pl-1">Bairro</label>
                                    <input
                                        list="neighborhoods-list"
                                        className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white text-sm font-bold outline-none focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-gray-800"
                                        value={formData.neighborhood || ''}
                                        onChange={e => setFormData({ ...formData, neighborhood: e.target.value })}
                                        placeholder="Ex: Lourdes"
                                    />
                                    <datalist id="neighborhoods-list">
                                        {formData.city === 'Anápolis' && (
                                            <>
                                                <option value="Jundiaí" />
                                                <option value="Jaiara" />
                                                <option value="Centro" />
                                                <option value="Anápolis City" />
                                                <option value="Bairro de Lourdes" />
                                                <option value="Cidade Universitária" />
                                                <option value="Jardim Europa" />
                                                <option value="Vila Jaiara" />
                                                <option value="Jardim das Américas" />
                                                <option value="Setor Sul" />
                                                <option value="JK" />
                                                <option value="Ibirapuera" />
                                            </>
                                        )}
                                    </datalist>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-[2] space-y-2">
                                        <label className="text-[10px] font-black uppercase text-gray-600 tracking-widest pl-1">Cidade</label>
                                        <input
                                            list="cities-list"
                                            className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white text-sm font-bold outline-none focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-gray-800"
                                            value={formData.city || ''}
                                            onChange={e => setFormData({ ...formData, city: e.target.value })}
                                            placeholder="Ex: Goiânia"
                                        />
                                        <datalist id="cities-list">
                                            {cities.map(c => <option key={c} value={c} />)}
                                        </datalist>
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <label className="text-[10px] font-black uppercase text-gray-600 tracking-widest pl-1">UF</label>
                                        <select
                                            className="w-full bg-black/40 border border-white/5 rounded-2xl px-3 py-4 text-white text-[10px] font-black outline-none focus:ring-1 focus:ring-orange-500 transition-all appearance-none cursor-pointer text-center uppercase"
                                            value={formData.state || ''}
                                            onChange={e => setFormData({ ...formData, state: e.target.value })}
                                        >
                                            <option value="" disabled>UF</option>
                                            {states.map(s => (
                                                <option key={s.sigla} value={s.sigla} className="bg-zinc-900 text-white">
                                                    {s.sigla}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 space-y-4">
                            <label className="text-[10px] font-black uppercase text-gray-500 tracking-[0.3em]">Descrição Certificada</label>
                            <textarea
                                className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 text-white text-sm font-bold outline-none focus:ring-1 focus:ring-orange-500 transition-all min-h-[140px] placeholder:text-gray-800 resize-none leading-relaxed"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Descreva os detalhes e diferenciais deste ativo..."
                            />
                        </div>
                    </div>

                    {/* Especificações Técnicas */}
                    <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 space-y-8">
                        <div>
                            <p className="text-[10px] font-black uppercase text-gray-500 tracking-[0.3em]">Especificações Técnicas</p>
                            {isRural && (
                                <div className="mt-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                                    <p className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">
                                        🌾 Modo Rural Ativo — Medidas em {formData.sizeUnit}
                                    </p>
                                    <p className="text-[8px] text-gray-500 mt-1">Preencha a quantidade de cada estrutura existente na propriedade.</p>
                                </div>
                            )}
                        </div>

                        {/* Área Total */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-gray-600 tracking-widest pl-1 flex items-center gap-1">
                                <Square size={10} /> Área Total
                            </label>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    className="flex-1 bg-black/40 border border-white/5 rounded-2xl px-5 py-5 text-white text-2xl font-black outline-none focus:ring-1 focus:ring-orange-500 transition-all text-center"
                                    value={displayArea}
                                    onChange={handleAreaChange}
                                    placeholder="0"
                                />
                                <div className="flex flex-col gap-1">
                                    {(['m²', 'Hectares', 'Alqueires'] as AreaUnit[]).map(unit => (
                                        <button
                                            key={unit}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, sizeUnit: unit })}
                                            className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border ${formData.sizeUnit === unit ? 'bg-orange-500 border-orange-500 text-white' : 'bg-black/40 border-white/10 text-gray-500 hover:border-orange-500/40 hover:text-white'}`}
                                        >
                                            {unit}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {formData.sizeUnit === 'Alqueires' && (
                                <p className="text-[8px] text-gray-600 font-bold uppercase tracking-wider pl-1 italic">
                                    * Alqueire Goiano = 4,84 Hectares (48.400 m²)
                                </p>
                            )}
                        </div>

                        {/* Grid de Contadores Numéricos */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-gray-600 tracking-widest pl-1 block truncate">
                                    {isRural ? 'Sedes / Casas' : 'Quartos'}
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none text-center focus:border-orange-500/50 transition-all"
                                    value={formData.bedrooms}
                                    onChange={e => setFormData({ ...formData, bedrooms: parseInt(e.target.value) || 0 })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-gray-600 tracking-widest pl-1 block truncate">Suítes</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none text-center focus:border-orange-500/50 transition-all"
                                    value={formData.suites}
                                    onChange={e => setFormData({ ...formData, suites: parseInt(e.target.value) || 0 })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-gray-600 tracking-widest pl-1 block truncate">Banheiros</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none text-center focus:border-orange-500/50 transition-all"
                                    value={formData.bathrooms}
                                    onChange={e => setFormData({ ...formData, bathrooms: parseInt(e.target.value) || 0 })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-gray-600 tracking-widest pl-1 block truncate">
                                    {isRural ? 'Currais / Galpões' : 'Salas'}
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none text-center focus:border-orange-500/50 transition-all"
                                    value={formData.livingRooms}
                                    onChange={e => setFormData({ ...formData, livingRooms: parseInt(e.target.value) || 0 })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-gray-600 tracking-widest pl-1 block truncate">
                                    {isRural ? 'Represas / Tanques' : 'Cozinhas'}
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none text-center focus:border-orange-500/50 transition-all"
                                    value={formData.kitchens}
                                    onChange={e => setFormData({ ...formData, kitchens: parseInt(e.target.value) || 0 })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-gray-600 tracking-widest pl-1 block truncate">Vagas</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none text-center focus:border-orange-500/50 transition-all"
                                    value={formData.parkingSpaces}
                                    onChange={e => setFormData({ ...formData, parkingSpaces: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>

                        {/* Comodidades */}
                        <div className="space-y-3 pt-2">
                            <p className="text-[10px] font-black uppercase text-gray-600 tracking-widest pl-1">Características & Lazer</p>
                            <div className="flex flex-wrap gap-2">
                                {AMENITIES_OPTIONS.map(amenity => {
                                    const selected = formData.amenities.includes(amenity);
                                    return (
                                        <button
                                            key={amenity}
                                            type="button"
                                            onClick={() => handleAmenityToggle(amenity)}
                                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${selected ? 'bg-orange-500/10 border-orange-500 text-orange-400' : 'bg-black/20 border-white/5 text-gray-400 hover:border-white/10 hover:text-white'}`}
                                        >
                                            {selected && <CheckCircle2 size={12} className="text-orange-500" />}
                                            {amenity}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Botões */}
                <div className="flex items-center justify-end gap-4 pt-4 border-top border-white/5">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-6 py-4 bg-zinc-900 border border-white/10 rounded-2xl text-sm font-black text-gray-400 uppercase tracking-widest hover:text-white hover:bg-zinc-800 transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white text-sm font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-orange-500/10 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSaving ? 'Salvando...' : 'Salvar Imóvel'}
                    </button>
                </div>

            </form>
        </div>
    );
};
