import { useState, useEffect } from 'react';
import { 
  MessageSquare,
  Camera,
  Search,
  Sparkles,
  ShieldCheck,
  Globe,
  Image as ImageIcon,
  ArrowRight,
  RefreshCw,
  Rocket,
  DollarSign,
  Target,
  BarChart3,
  Wallet,
  Settings,
  Plus,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { marketingService, type AdCampaignData } from '../services/marketingService';

type Platform = 'meta' | 'google' | null;
type CampaignType = 'organic' | 'paid';

const MarketingView = () => {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(null);
  const [campaignType, setCampaignType] = useState<CampaignType>('paid');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isMetaConnected, setIsMetaConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Estados del Formulario
  const [campaignName, setCampaignName] = useState('');
  const [budget, setBudget] = useState('500');
  const [targetLocation, setTargetLocation] = useState('Madrid, España');
  const [adCopy, setAdCopy] = useState('');
  const [selectedAdAccount, setSelectedAdAccount] = useState('');
  const [realAccounts, setRealAccounts] = useState<any[]>([]);
  const [accountStats, setAccountStats] = useState<any>(null);

  useEffect(() => {
    if (isMetaConnected) {
      loadRealAccounts();
    }
  }, [isMetaConnected]);

  useEffect(() => {
    if (selectedPlatform === 'meta' && campaignType === 'paid' && selectedAdAccount) {
      const id = selectedAdAccount.split(' ')[0];
      fetchStats(id);
    }
  }, [selectedAdAccount, campaignType, selectedPlatform]);

  const loadRealAccounts = async () => {
    const accounts = await marketingService.getAdAccounts();
    if (accounts.length > 0) {
      setRealAccounts(accounts);
      if (!selectedAdAccount) {
        setSelectedAdAccount(`${accounts[0].id} (${accounts[0].name})`);
      }
    }
  };

  const fetchStats = async (id: string) => {
    try {
      const stats = await marketingService.getAccountStats(id);
      setAccountStats(stats);
    } catch (err) {
      // Error silenciado para mantener la consola limpia
    } finally {
    }
  };

  const platforms = [
    {
      id: 'meta',
      name: 'Meta Ads',
      description: 'Anuncia en Facebook e Instagram para captar leads visuales.',
      icon: <div style={{ display: 'flex', gap: 4 }}><MessageSquare size={24} color="#1877F2" /><Camera size={24} color="#E4405F" /></div>,
      color: '#1877F2',
      features: ['Lead Forms', 'Instagram Stories', 'Retargeting']
    },
    {
      id: 'google',
      name: 'Google Ads',
      description: 'Aparece cuando los clientes buscan propiedades en Google.',
      icon: <Search size={24} color="#4285F4" />,
      color: '#4285F4',
      features: ['Search Ads', 'Display Network', 'Google Maps']
    }
  ];

  const handleConnectMeta = async () => {
    setIsConnecting(true);
    try {
      const accounts = await marketingService.getAdAccounts();
      if (accounts && accounts.length > 0) {
        setRealAccounts(accounts);
        setSelectedAdAccount(`${accounts[0].id} (${accounts[0].name})`);
        setIsMetaConnected(true);
      } else {
        alert("Primero conecta tu cuenta de Facebook en n8n para que podamos importar tus cuentas publicitarias.");
      }
    } catch (err) {
      alert("Error al conectar con Meta. Verifica n8n.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleGenerateCopy = async () => {
    setIsGenerating(true);
    try {
      const improved = await marketingService.improveCopy(adCopy || "Casa en Russafa con terraza");
      if (improved) setAdCopy(improved);
      else {
        // Fallback si n8n no responde
        setAdCopy("🏠 ¡Tu casa ideal te espera en el corazón de Russafa! \n\nAcabamos de publicar esta joya modernista reformada. Sin comisiones de agencia y lista para entrar a vivir. \n\n📍 Ubicación inmejorable\n💎 Acabados de lujo\n🚀 ¡No la dejes escapar!");
      }
    } catch (err) {
      // Error silenciado
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLaunch = async () => {
    if (!campaignName || !adCopy) {
      alert("Por favor, rellena el nombre y el texto del anuncio.");
      return;
    }

    setIsLaunching(true);
    try {
      const data: AdCampaignData = {
        platform: selectedPlatform as 'meta' | 'google',
        campaignType,
        campaignName,
        budget: campaignType === 'paid' ? budget : '0',
        location: campaignType === 'paid' ? targetLocation : 'N/A',
        adCopy,
        adAccount: (selectedPlatform === 'meta' && campaignType === 'paid') ? selectedAdAccount.split(' ')[0] : undefined
      };

      await marketingService.launchCampaign(data);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (err) {
      alert("Error al lanzar la campaña. Revisa que tu webhook de n8n esté activo.");
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Header Informativo */}
      <div style={{ marginBottom: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: 10 }}>Ads Launch Center</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', fontWeight: 500 }}>
            Lanza campañas publicitarias profesionales en segundos usando IA.
          </p>
        </div>
        {isMetaConnected && (
          <div style={{ display: 'flex', gap: 12 }}>
             <div style={{ 
               padding: '10px 20px', background: '#22c55e11', color: '#22c55e', 
               borderRadius: 100, fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 
             }}>
               <ShieldCheck size={18} /> Meta Conectado
             </div>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!selectedPlatform ? (
          <motion.div 
            key="platform-selection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}
          >
            {platforms.map(p => (
              <div 
                key={p.id}
                className="card-hover"
                onClick={() => setSelectedPlatform(p.id as Platform)}
                style={{ 
                  background: 'var(--card-bg)', 
                  padding: 40, 
                  borderRadius: 32, 
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{ 
                  width: 64, height: 64, borderRadius: 20, background: 'var(--bg-color)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
                  boxShadow: '0 8px 20px rgba(0,0,0,0.05)'
                }}>
                  {p.icon}
                </div>
                <h3 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: 12 }}>{p.name}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: 30, lineHeight: 1.6 }}>{p.description}</p>
                
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 40 }}>
                  {p.features.map(f => (
                    <span key={f} style={{ 
                      padding: '8px 16px', background: 'var(--bg-color)', borderRadius: 100, 
                      fontSize: '0.85rem', fontWeight: 700, border: '1px solid var(--border-color)' 
                    }}>{f}</span>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900, color: p.color }}>
                  Empezar configuración <ArrowRight size={20} />
                </div>
              </div>
            ))}
          </motion.div>
        ) : selectedPlatform === 'meta' && !isMetaConnected ? (
          <motion.div 
            key="meta-connect-screen"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{ 
              maxWidth: 700, margin: '0 auto', background: 'var(--card-bg)', 
              padding: 60, borderRadius: 40, border: '1px solid var(--border-color)',
              textAlign: 'center'
            }}
          >
            <div style={{ 
              width: 100, height: 100, borderRadius: 30, background: '#1877F211', 
              color: '#1877F2', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 30px auto'
            }}>
              <MessageSquare size={48} />
            </div>
            <h3 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: 15 }}>Vincular cuenta de Meta</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', lineHeight: 1.6, marginBottom: 40 }}>
              Para lanzar anuncios directamente desde aquí, necesitamos conectar con tu <strong>Business Manager de Facebook</strong>. Podrás elegir tus cuentas publicitarias y páginas en el siguiente paso.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 40 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 24px', background: 'var(--bg-color)', borderRadius: 16, textAlign: 'left' }}>
                <ShieldCheck size={20} color="#22c55e" />
                <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>Conexión cifrada y segura via Meta Marketing API.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 24px', background: 'var(--bg-color)', borderRadius: 16, textAlign: 'left' }}>
                <Settings size={20} color="#6366f1" />
                <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>Gestiona presupuestos y audiencias sin salir del dashboard.</span>
              </div>
            </div>

            <button 
              onClick={handleConnectMeta}
              disabled={isConnecting}
              style={{ 
                width: '100%', height: 70, background: '#1877F2', color: 'white', border: 'none', 
                borderRadius: 20, fontSize: '1.2rem', fontWeight: 900, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                transition: '0.2s', boxShadow: '0 10px 30px rgba(24, 119, 242, 0.3)'
              }}
            >
              {isConnecting ? (
                <>
                  <RefreshCw size={24} className="animate-spin" /> Conectando...
                </>
              ) : (
                <>
                  <FacebookIcon /> Vincular con Facebook Business
                </>
              )}
            </button>
            <button 
              onClick={() => setSelectedPlatform(null)}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', marginTop: 20, fontWeight: 700, cursor: 'pointer' }}
            >
              Cancelar y volver
            </button>
          </motion.div>
        ) : (
          <motion.div 
            key="ad-config"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {/* Botón Volver */}
            <button 
              onClick={() => setSelectedPlatform(null)}
              style={{ 
                background: 'none', border: 'none', color: 'var(--text-secondary)', 
                fontWeight: 800, cursor: 'pointer', marginBottom: 30, display: 'flex', alignItems: 'center', gap: 8 
              }}
            >
              ← Volver a selección de plataforma
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 450px', gap: 40, alignItems: 'start' }}>
              {/* Formulario de Configuración */}
              <div style={{ background: 'var(--card-bg)', padding: 48, borderRadius: 40, border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 40 }}>
                  <div style={{ padding: 12, borderRadius: 16, background: selectedPlatform === 'meta' ? '#1877F222' : '#4285F422' }}>
                    {selectedPlatform === 'meta' ? <MessageSquare color="#1877F2" /> : <Search color="#4285F4" />}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.6rem', fontWeight: 900 }}>{campaignType === 'paid' ? 'Lanzar Anuncio' : 'Nueva Publicación'} {selectedPlatform === 'meta' ? 'Meta' : 'Google'}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Configura tu contenido publicitario</p>
                  </div>
                </div>

                {/* Selector de Tipo de Campaña */}
                <div style={{ 
                  background: 'var(--bg-color)', padding: 6, borderRadius: 20, 
                  display: 'flex', gap: 6, marginBottom: 40, border: '1px solid var(--border-color)' 
                }}>
                  <button 
                    onClick={() => setCampaignType('organic')}
                    style={{ 
                      flex: 1, padding: '12px', borderRadius: 16, border: 'none', cursor: 'pointer',
                      background: campaignType === 'organic' ? 'var(--card-bg)' : 'transparent',
                      color: campaignType === 'organic' ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: campaignType === 'organic' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                      transition: '0.2s'
                    }}
                  >
                    <Plus size={18} /> Orgánica (Gratis)
                  </button>
                  <button 
                    onClick={() => setCampaignType('paid')}
                    style={{ 
                      flex: 1, padding: '12px', borderRadius: 16, border: 'none', cursor: 'pointer',
                      background: campaignType === 'paid' ? 'var(--card-bg)' : 'transparent',
                      color: campaignType === 'paid' ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: campaignType === 'paid' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                      transition: '0.2s'
                    }}
                  >
                    <Zap size={18} color={campaignType === 'paid' ? '#f59e0b' : 'currentColor'} /> Patrocinada (Pago)
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                  {selectedPlatform === 'meta' && campaignType === 'paid' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 12 }}>Cuenta Publicitaria Destino</label>
                      <select 
                        className="search-pill" 
                        style={{ width: '100%', padding: '20px 24px', background: 'var(--bg-color)', cursor: 'pointer', border: '1px solid var(--border-color)' }}
                        value={selectedAdAccount}
                        onChange={(e) => setSelectedAdAccount(e.target.value)}
                      >
                        {realAccounts.length > 0 ? (
                          realAccounts.map(acc => {
                            const accountName = acc.name || acc.id;
                            const accountId = acc.id;
                            return (
                              <option key={accountId} value={`${accountId} (${accountName})`}>
                                {accountName} ({accountId})
                              </option>
                            );
                          })
                        ) : (
                          <option>Cargando cuentas...</option>
                        )}
                      </select>

                      {/* Tarjeta de Estadísticas de Cuenta */}
                      <AnimatePresence>
                        {accountStats && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{ 
                              marginTop: 15, padding: 20, borderRadius: 20, background: 'var(--card-bg)', 
                              border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 15 
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 12, background: '#22c55e11', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Wallet size={20} color="#22c55e" />
                                </div>
                                <div>
                                  <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Gastado este mes</span>
                                  <span style={{ fontSize: '1.2rem', fontWeight: 900 }}>{accountStats.spent} {accountStats.currency}</span>
                                </div>
                              </div>
                              <div style={{ padding: '6px 12px', borderRadius: 100, background: '#22c55e22', color: '#22c55e', fontSize: '0.75rem', fontWeight: 800 }}>
                                {accountStats.status}
                              </div>
                            </div>
                            
                            <div style={{ width: '100%', height: 8, background: 'var(--bg-color)', borderRadius: 10, overflow: 'hidden' }}>
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${(accountStats.spent / accountStats.limit) * 100}%` }}
                                style={{ height: '100%', background: 'linear-gradient(90deg, #22c55e, #4ade80)', borderRadius: 10 }}
                              />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                              <span>0€</span>
                              <span>Límite mensual: {accountStats.limit}€</span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 12 }}>
                      {campaignType === 'paid' ? 'Nombre de la Campaña' : 'Título de la Publicación'}
                    </label>
                    <input 
                      className="search-pill" 
                      style={{ width: '100%', padding: '20px 24px', background: 'var(--bg-color)' }}
                      placeholder={campaignType === 'paid' ? "Ej: Captación Russafa Mayo 2024" : "Ej: ¡Nuevo piso disponible!"}
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                    />
                  </div>

                  {campaignType === 'paid' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 12 }}>Presupuesto Mensual</label>
                        <div style={{ position: 'relative' }}>
                          <DollarSign size={18} style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                          <input 
                            className="search-pill" 
                            style={{ width: '100%', padding: '20px 24px 20px 48px', background: 'var(--bg-color)' }}
                            value={budget}
                            onChange={(e) => setBudget(e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 12 }}>Ubicación Objetivo</label>
                        <div style={{ position: 'relative' }}>
                          <Target size={18} style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                          <input 
                            className="search-pill" 
                            style={{ width: '100%', padding: '20px 24px 20px 48px', background: 'var(--bg-color)' }}
                            value={targetLocation}
                            onChange={(e) => setTargetLocation(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Texto del Anuncio (AI)</label>
                      <button 
                        onClick={handleGenerateCopy}
                        disabled={isGenerating}
                        style={{ background: 'black', color: 'white', border: 'none', padding: '6px 14px', borderRadius: 100, fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <Sparkles size={14} />
                        {isGenerating ? 'Generando...' : 'Mejorar con IA'}
                      </button>
                    </div>
                    <textarea 
                      style={{ 
                        width: '100%', minHeight: 150, padding: 24, borderRadius: 24, border: '1px solid var(--border-color)', 
                        background: 'var(--bg-color)', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '1rem', lineHeight: 1.5 
                      }}
                      placeholder="Describe lo que quieres anunciar..."
                      value={adCopy}
                      onChange={(e) => setAdCopy(e.target.value)}
                    />
                  </div>

                  {showSuccess && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      style={{ padding: 20, background: '#22c55e11', color: '#22c55e', borderRadius: 20, border: '1px solid #22c55e22', display: 'flex', alignItems: 'center', gap: 12, fontWeight: 700 }}
                    >
                      <ShieldCheck size={20} /> ¡Campaña enviada con éxito a n8n! Revisando en Meta...
                    </motion.div>
                  )}

                  <button 
                    onClick={handleLaunch}
                    disabled={isLaunching}
                    className="btn-primary" 
                    style={{ height: 70, borderRadius: 24, fontSize: '1.2rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}
                  >
                    {isLaunching ? (
                      <>
                        <RefreshCw size={24} className="animate-spin" /> Procesando Lanzamiento...
                      </>
                    ) : (
                      <>
                        <Rocket size={24} />
                        Lanzar Campaña Ahora
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Previsualización del Anuncio */}
              <div style={{ position: 'sticky', top: 20 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 12 }}>Previsualización Real-Time</div>
                <div style={{ 
                  background: 'white', borderRadius: 32, overflow: 'hidden', 
                  boxShadow: '0 20px 50px rgba(0,0,0,0.1)', border: '1px solid #eee' 
                }}>
                  {selectedPlatform === 'meta' ? (
                    <div style={{ color: '#1c1e21', fontFamily: 'system-ui' }}>
                      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#000' }} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Grupo Hogares</div>
                          <div style={{ fontSize: '0.75rem', color: '#65676b' }}>Publicidad • <Globe size={10} style={{ display: 'inline' }} /></div>
                        </div>
                      </div>
                      <div style={{ padding: '0 16px 12px 16px', fontSize: '0.9rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                        {adCopy || 'Escribe algo para ver cómo queda tu anuncio...'}
                      </div>
                      <div style={{ width: '100%', height: 250, background: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#bcc0c4' }}>
                        <ImageIcon size={48} />
                        <span style={{ fontSize: '0.8rem', marginTop: 10, fontWeight: 600 }}>Imagen del Anuncio</span>
                      </div>
                      <div style={{ padding: '12px 16px', background: '#f0f2f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: '#65676b', textTransform: 'uppercase' }}>GRUPOHOGARES.COM</div>
                          <div style={{ fontWeight: 700, fontSize: '1rem' }}>Encuentra tu casa ideal</div>
                        </div>
                        <button style={{ background: '#e4e6eb', border: 'none', padding: '8px 16px', borderRadius: 6, fontWeight: 700, fontSize: '0.85rem' }}>Más información</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: 30, color: '#202124' }}>
                      <div style={{ fontSize: '0.8rem', color: '#202124', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontWeight: 700 }}>Patrocinado</span> • https://www.grupohogares.com
                      </div>
                      <div style={{ fontSize: '1.2rem', color: '#1a0dab', marginBottom: 8, fontWeight: 500 }}>
                        {campaignName || 'Encuentra tu casa ideal con Grupo Hogares'}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#4d5156', lineHeight: 1.6 }}>
                        {adCopy.substring(0, 150) || 'Descubre las mejores propiedades en Madrid y Valencia. Sin comisiones de agencia y con el mejor servicio inmobiliario.'}...
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 24, padding: 24, background: 'rgba(37, 99, 235, 0.05)', borderRadius: 24, border: '1px solid rgba(37, 99, 235, 0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, color: '#2563eb' }}>
                    <BarChart3 size={18} />
                    <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>Estimación de Resultados</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, lineHeight: 1.5 }}>
                    Con un presupuesto de <strong>{budget}€</strong> en <strong>{targetLocation}</strong>, estimamos alcanzar a <strong>25k - 40k personas</strong> y generar unos <strong>15 - 30 leads</strong> cualificados.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FacebookIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

export default MarketingView;
