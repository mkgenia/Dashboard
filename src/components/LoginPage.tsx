import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';

const LoginPage = () => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const success = await login(identifier, password);
            if (!success) {
                setError('Credenciales incorrectas. Por favor, inténtalo de nuevo.');
            }
        } catch (err) {
            setError('Error de conexión. Inténtalo más tarde.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            {/* Esferas de luz decorativas */}
            <div className="login-blob yellow"></div>
            <div className="login-blob red"></div>
            
            <div className="login-card">
                <div style={{ textAlign: 'center', marginBottom: 40 }}>
                    <div style={{ 
                        width: 64, 
                        height: 64, 
                        background: 'black', 
                        borderRadius: 20, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: 'white',
                        margin: '0 auto 20px'
                    }}>
                        <Building2 size={32} />
                    </div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-1px' }}>Bienvenido</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 8, fontWeight: 500 }}>
                        Gestiona tus leads con Grupo Hogares
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ position: 'relative' }}>
                        <Mail style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', color: '#888' }} size={20} />
                        <input
                            id="identifier"
                            name="identifier"
                            type="text"
                            placeholder="Usuario o Email corporativo"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            required
                            autoComplete="username"
                            style={{
                                width: '100%',
                                padding: '18px 20px 18px 54px',
                                borderRadius: 20,
                                border: '1px solid #eee',
                                background: '#f9f9f9',
                                outline: 'none',
                                fontSize: '1rem',
                                fontWeight: 500,
                                transition: '0.3s'
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = 'black'}
                            onBlur={(e) => e.currentTarget.style.borderColor = '#eee'}
                        />
                    </div>

                    <div style={{ position: 'relative' }}>
                        <Lock style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', color: '#888' }} size={20} />
                        <input
                            id="password"
                            name="password"
                            type="password"
                            placeholder="Contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                            style={{
                                width: '100%',
                                padding: '18px 20px 18px 54px',
                                borderRadius: 20,
                                border: '1px solid #eee',
                                background: '#f9f9f9',
                                outline: 'none',
                                fontSize: '1rem',
                                fontWeight: 500,
                                transition: '0.3s'
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = 'black'}
                            onBlur={(e) => e.currentTarget.style.borderColor = '#eee'}
                        />
                    </div>

                    {error && (
                        <div style={{ 
                            display: 'flex', 
                            gap: 10, 
                            padding: '16px', 
                            background: '#fff1f2', 
                            color: '#e11d48', 
                            borderRadius: 16, 
                            fontSize: '0.9rem', 
                            fontWeight: 600,
                            border: '1px solid #fecdd3'
                        }}>
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            marginTop: 10,
                            padding: '18px',
                            background: 'black',
                            color: 'white',
                            border: 'none',
                            borderRadius: 20,
                            fontSize: '1rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 10,
                            transition: '0.3s'
                        }}
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            'Iniciar Sesión'
                        )}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: 32, fontSize: '0.85rem', color: '#aaa', fontWeight: 500 }}>
                    © 2024 Grupo Hogares. Área Reservada.
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
