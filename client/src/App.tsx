import { useState } from 'react';
import SQLEditor from './components/SQLEditor';
import AdminConsole from './components/AdminConsole';

type Tab = 'explorer' | 'admin';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('explorer');

  return (
    <div style={{ minHeight: '100vh', padding: '20px' }}>
      <h1 style={{ marginBottom: '20px', color: '#333' }}>Seren SQL Interface</h1>
      
      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '20px',
        borderBottom: '2px solid #dee2e6',
        paddingBottom: '8px'
      }}>
        <button
          onClick={() => setActiveTab('explorer')}
          style={{
            padding: '10px 20px',
            border: 'none',
            backgroundColor: activeTab === 'explorer' ? '#007bff' : 'transparent',
            color: activeTab === 'explorer' ? 'white' : '#495057',
            cursor: 'pointer',
            borderRadius: '4px 4px 0 0',
            fontWeight: activeTab === 'explorer' ? '600' : '400',
            fontSize: '16px',
          }}
        >
          Public Explorer
        </button>
        <button
          onClick={() => setActiveTab('admin')}
          style={{
            padding: '10px 20px',
            border: 'none',
            backgroundColor: activeTab === 'admin' ? '#dc3545' : 'transparent',
            color: activeTab === 'admin' ? 'white' : '#495057',
            cursor: 'pointer',
            borderRadius: '4px 4px 0 0',
            fontWeight: activeTab === 'admin' ? '600' : '400',
            fontSize: '16px',
          }}
        >
          Admin Console
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'explorer' && <SQLEditor />}
      {activeTab === 'admin' && <AdminConsole />}
    </div>
  );
}

export default App;

