import React from 'react';
import { LayoutGrid, List as ListIcon, Building2, Settings, RefreshCw, Search } from 'lucide-react';

interface CaptacionesHeaderProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  count: number;
  loading: boolean;
  onSync: () => void;
  onConfig: () => void;
  showConfig?: boolean;
}

const CaptacionesHeader: React.FC<CaptacionesHeaderProps> = ({
  searchTerm,
  setSearchTerm,
  viewMode,
  setViewMode,
  count,
  loading,
  onSync,
  onConfig,
  showConfig = true
}) => {
  return (
    <div className="section-header" style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20 }}>
      <div style={{ display: 'flex', gap: 16, flex: 1, alignItems: 'center' }}>
        <div className="search-pill" style={{ flex: 1, maxWidth: 450 }}>
          <Search size={22} color="var(--text-secondary)" />
          <input
            type="text"
            placeholder="Buscar por zona, calle o propietario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="toggle-group" style={{
          padding: '6px',
          borderRadius: 16,
          display: 'flex',
          height: 54,
          alignItems: 'center',
          background: 'var(--card-bg)',
          boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
        }}>
          <button
            onClick={() => setViewMode('grid')}
            style={{
              padding: '8px 16px',
              borderRadius: 12,
              background: viewMode === 'grid' ? 'var(--accent-yellow)' : 'transparent',
              color: viewMode === 'grid' ? '#000' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center',
              transition: '0.2s',
              fontWeight: 600
            }}
          >
            <LayoutGrid size={20} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            style={{
              padding: '8px 16px',
              borderRadius: 12,
              background: viewMode === 'list' ? 'var(--accent-yellow)' : 'transparent',
              color: viewMode === 'list' ? '#000' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center',
              transition: '0.2s',
              fontWeight: 600
            }}
          >
            <ListIcon size={20} />
          </button>
        </div>

        <div style={{
          padding: '0 24px',
          borderRadius: 16,
          height: 54,
          background: 'var(--card-bg)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontWeight: 600,
          boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
          fontSize: '0.9rem'
        }}>
          <Building2 size={20} />
          <span>{count} Propiedades</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        {showConfig && (
          <button
            className="btn-black"
            style={{
              height: 54,
              width: 54,
              padding: 0,
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              cursor: 'pointer'
            }}
            onClick={onConfig}
            title="Configurar zona de búsqueda"
          >
            <Settings size={22} />
          </button>
        )}

        <button
          className="btn-black"
          style={{ height: 54, padding: '0 24px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 10 }}
          onClick={onSync}
        >
          <RefreshCw size={20} className={loading ? 'spin' : ''} />
          <span>Sincronizar Idealista</span>
        </button>
      </div>
    </div>
  );
};

export default CaptacionesHeader;
