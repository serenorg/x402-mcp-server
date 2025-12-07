import { useState } from 'react';
import { Play, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

type Status = 'idle' | 'executing' | 'error' | 'success';

interface AdminQueryResult {
  rows?: unknown[];
  rowCount?: number;
  estimatedCost?: string;
  actualCost?: string;
  executionTime?: number;
}

export default function AdminConsole() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AdminQueryResult | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<string>('');

  const executeQuery = async () => {
    if (!query.trim()) {
      setError('Please provide a SQL query');
      setStatus('error');
      setOutput('Error: Please provide a SQL query');
      return;
    }

    setStatus('executing');
    setError(null);
    setResults(null);
    setOutput('Executing admin command...\n');

    try {
      const response = await axios.post<{
        success: boolean;
        rows?: unknown[];
        rowCount?: number;
        estimatedCost?: string;
        actualCost?: string;
        executionTime?: number;
        error?: string;
      }>('http://localhost:3000/api/admin/execute', {
        sql: query,
      });

      if (response.data.success) {
        const result = {
          rows: response.data.rows,
          rowCount: response.data.rowCount || 0,
          estimatedCost: response.data.estimatedCost || '0',
          actualCost: response.data.actualCost || '0',
          executionTime: response.data.executionTime || 0,
        };
        setResults(result);
        setStatus('success');
        
        // Build output message
        let outputMsg = `✓ Query executed successfully.\n`;
        if (result.rowCount !== undefined) {
          outputMsg += `Rows affected: ${result.rowCount}\n`;
        }
        if (result.executionTime !== undefined) {
          outputMsg += `Execution time: ${result.executionTime}ms\n`;
        }
        if (result.rows && result.rows.length > 0) {
          outputMsg += `\nReturned ${result.rows.length} row(s).\n`;
        }
        setOutput(outputMsg);
      } else {
        const errorMsg = response.data.error || 'Query execution failed';
        setError(errorMsg);
        setStatus('error');
        setOutput(`✗ Error: ${errorMsg}\n`);
      }
    } catch (err) {
      let errorMsg = 'Unknown error occurred';
      if (axios.isAxiosError(err)) {
        errorMsg = err.response?.data?.error || err.message || errorMsg;
      } else if (err instanceof Error) {
        errorMsg = err.message;
      }
      setError(errorMsg);
      setStatus('error');
      setOutput(`✗ Error: ${errorMsg}\n`);
    }
  };

  const insertTemplate = (template: string) => {
    setQuery(template);
    setOutput('');
    setError(null);
    setResults(null);
    setStatus('idle');
  };

  const templates = [
    {
      label: 'Create Table',
      sql: `CREATE TABLE new_table (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`,
    },
    {
      label: 'Insert Row',
      sql: `INSERT INTO table_name (column1, column2, column3)
VALUES ('value1', 'value2', 'value3');`,
    },
    {
      label: 'Update Row',
      sql: `UPDATE table_name
SET column1 = 'new_value', column2 = 'updated_value'
WHERE id = 1;`,
    },
    {
      label: 'Drop Table',
      sql: `DROP TABLE IF EXISTS table_name;`,
    },
  ];

  const renderTable = () => {
    if (!results || !results.rows || results.rows.length === 0) {
      return null;
    }

    const firstRow = results.rows[0] as Record<string, unknown>;
    const columns = Object.keys(firstRow);

    return (
      <div style={{ marginTop: '20px', overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: 'white',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              {columns.map((col) => (
                <th
                  key={col}
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    borderBottom: '2px solid #dee2e6',
                    fontWeight: '600',
                    color: '#495057',
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.rows.map((row, idx) => (
              <tr
                key={idx}
                style={{
                  borderBottom: '1px solid #dee2e6',
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col}
                    style={{
                      padding: '12px',
                      color: '#212529',
                    }}
                  >
                    {String((row as Record<string, unknown>)[col] ?? 'null')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', gap: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Left Sidebar - Templates */}
      <div
        style={{
          width: '250px',
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          height: 'fit-content',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#495057', fontSize: '18px' }}>
          Quick Actions
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {templates.map((template, idx) => (
            <button
              key={idx}
              onClick={() => insertTemplate(template.sql)}
              style={{
                padding: '10px 16px',
                backgroundColor: 'white',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '14px',
                color: '#495057',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#e9ecef';
                e.currentTarget.style.borderColor = '#007bff';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.borderColor = '#ced4da';
              }}
            >
              {template.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Area - Console */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            backgroundColor: '#1e1e1e',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="admin-query"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '500',
                color: '#d4d4d4',
              }}
            >
              SQL Console (Admin Mode)
            </label>
            <textarea
              id="admin-query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter SQL command (CREATE, INSERT, UPDATE, DROP, etc.)"
              rows={12}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #3c3c3c',
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'monospace',
                backgroundColor: '#252526',
                color: '#d4d4d4',
                resize: 'vertical',
              }}
            />
          </div>

          <button
            onClick={executeQuery}
            disabled={status === 'executing'}
            style={{
              backgroundColor: status === 'executing' ? '#6c757d' : '#dc3545',
              color: 'white',
              border: '2px solid',
              borderColor: status === 'executing' ? '#6c757d' : '#dc3545',
              padding: '12px 24px',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: status === 'executing' ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {status === 'executing' ? (
              <>
                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                Executing Admin Command...
              </>
            ) : (
              <>
                <Play size={20} />
                Execute Admin Command
              </>
            )}
          </button>

          {/* Output Console */}
          <div style={{ marginTop: '20px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '500',
                color: '#d4d4d4',
              }}
            >
              Output Console
            </label>
            <div
              style={{
                width: '100%',
                minHeight: '150px',
                padding: '12px',
                border: '1px solid #3c3c3c',
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'monospace',
                backgroundColor: '#1e1e1e',
                color: '#d4d4d4',
                whiteSpace: 'pre-wrap',
                overflowY: 'auto',
                maxHeight: '300px',
              }}
            >
              {output || 'Ready. Enter a SQL command and click Execute.'}
            </div>
          </div>

          {/* Status Messages */}
          {status === 'error' && error && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#f8d7da',
                border: '1px solid #dc3545',
                borderRadius: '4px',
                color: '#721c24',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {status === 'success' && results && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#d4edda',
                border: '1px solid #28a745',
                borderRadius: '4px',
                color: '#155724',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={20} />
              <span>Command executed successfully!</span>
            </div>
          )}

          {renderTable()}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

