import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import pb from '../../lib/pocketbase';

const AdminDashboard = () => {
  const {
    products,
    retailProducts,
    users,
    pendingRegistrations,
    refreshProducts,
    refreshUsers
  } = useApp();

  const [loading, setLoading] = useState(() => {
    return products.length === 0 && users.length === 0;
  });
  const [errorDetails, setErrorDetails] = useState(null);

  // Load data from PocketBase
  const loadData = async () => {
    try {
      if (products.length === 0 && users.length === 0) {
        setLoading(true);
      }
      setErrorDetails(null);
      await Promise.all([
        refreshProducts(),
        refreshUsers()
      ]);
      
      // Also log successful auth state to console as requested
      console.log('--- POCKETBASE SUCCESS ---');
      console.log('PB URL:', pb.baseUrl);
      console.log('Auth Valid:', pb.authStore.isValid);
      console.log('Auth Model:', pb.authStore.model ? pb.authStore.model.id : 'None');
      console.log('--------------------------');
    } catch (err) {
      console.error('[PB] loadData error:', err);
      
      const details = {
        message: err.message,
        status: err.status || 'Network Error / 0',
        url: err.url || 'N/A',
        data: err.data ? JSON.stringify(err.data) : 'N/A',
        pbUrl: pb.baseUrl,
        isAuthValid: pb.authStore.isValid,
        authModel: pb.authStore.model ? JSON.stringify(pb.authStore.model) : 'None'
      };
      
      console.error('--- POCKETBASE ERROR DETAILS ---');
      console.error('PB URL:', details.pbUrl);
      console.error('Auth Valid:', details.isAuthValid);
      console.error('Auth Model:', details.authModel);
      console.error('HTTP Status:', details.status);
      console.error('Request URL:', details.url);
      console.error('Error Message:', details.message);
      console.error('Error Data:', details.data);
      console.error('--------------------------------');

      setErrorDetails(details);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Metrics calculations
  console.log('Fetched products from PocketBase (Dashboard):', products);
  const totalProducts = products.length + (retailProducts?.length || 0);
  const wholesaleLiveCount = products.filter(p => p.isLive !== false).length;
  const retailLiveCount = (retailProducts || []).filter(p => p.isLive !== false).length;
  const liveProducts = wholesaleLiveCount + retailLiveCount;
  const totalUsers = users.length;
  const pendingRegs = pendingRegistrations.length;

  // Retrieve last 5 products added
  const allMergedProducts = [
    ...products.map(p => ({ ...p, type: 'WHOLESALE' })),
    ...(retailProducts || []).map(p => ({ ...p, type: 'RETAIL' }))
  ];
  const recentProducts = allMergedProducts
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  // Retrieve last 5 users created
  const recentUsers = [...users]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading dashboard...</div>;
  }
  
  if (errorDetails) {
    return (
      <div style={{ padding: '20px', color: '#b91c1c', backgroundColor: '#fee2e2', borderRadius: '4px', margin: '20px', border: '1px solid #ef4444', fontFamily: 'monospace' }}>
        <h3 style={{ marginTop: 0 }}>Failed to load dashboard data.</h3>
        <p style={{ marginBottom: '16px' }}>Please check your browser console (Network/Console tab) for the exact failing request.</p>
        <p><strong>HTTP Status Code:</strong> {errorDetails.status}</p>
        <p><strong>Error Message:</strong> {errorDetails.message}</p>
        <p><strong>Error Data:</strong> {errorDetails.data}</p>
        <p><strong>Request URL:</strong> {errorDetails.url}</p>
        <p><strong>PocketBase Server:</strong> {errorDetails.pbUrl}</p>
        <p><strong>Auth Valid:</strong> {errorDetails.isAuthValid ? 'Yes' : 'No'}</p>
        <p><strong>Auth Details:</strong> {errorDetails.authModel}</p>
      </div>
    );
  }

  return (
    <div className="dashboard-view-wrapper">
      
      {/* Page Title */}
      <div className="dashboard-title-row">
        <h1 className="dashboard-heading font-heading">Dashboard Overview</h1>
        <p className="dashboard-desc font-body">Real-time statistics and quick controls for DEVI TIMES e-commerce.</p>
      </div>

      {/* Metrics Row (4 Cards) */}
      <div className="metrics-row-grid">
        
        {/* Metric 1 */}
        <div className="metric-card">
          <div className="metric-icon">📦</div>
          <div className="metric-content">
            <span className="metric-label uppercase-label">Total Products</span>
            <span className="metric-value font-heading">
              {totalProducts}
              <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-muted)', marginLeft: '6px' }}>
                ({products.length} W / {(retailProducts || []).length} R)
              </span>
            </span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>🟢</div>
          <div className="metric-content">
            <span className="metric-label uppercase-label">Live Products</span>
            <span className="metric-value font-heading" style={{ color: '#10B981' }}>
              {liveProducts}
              <span style={{ fontSize: '11px', fontWeight: '500', color: '#10B981', opacity: 0.8, marginLeft: '6px' }}>
                ({wholesaleLiveCount} W / {retailLiveCount} R)
              </span>
            </span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' }}>👥</div>
          <div className="metric-content">
            <span className="metric-label uppercase-label">Total Clients</span>
            <span className="metric-value font-heading">{totalUsers}</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>📋</div>
          <div className="metric-content">
            <span className="metric-label uppercase-label">Pending Requests</span>
            <span className="metric-value font-heading" style={{ color: '#F59E0B' }}>{pendingRegs}</span>
          </div>
        </div>

      </div>

      {/* Quick Action bar */}
      <div className="quick-actions-card">
        <h3 className="card-heading font-heading">Quick Actions</h3>
        <div className="actions-buttons-grid">
          <Link to="/admin/add-product" className="btn-primary quick-action-btn font-body">
            ➕ &nbsp; Add Product
          </Link>
          <Link to="/admin/add-via-pdf" className="btn-secondary quick-action-btn font-body" style={{ borderColor: 'var(--accent-blue)', color: 'var(--accent-blue)' }}>
            📄 &nbsp; Upload PDF
          </Link>
          <Link to="/admin/users" className="btn-secondary quick-action-btn font-body">
            👥 &nbsp; Manage Users
          </Link>
        </div>
      </div>

      {/* Split Recent Activity grids */}
      <div className="recent-activity-split">
        
        {/* Recent Products Grid */}
        <div className="activity-card-panel">
          <h3 className="card-heading font-heading">Recently Added Timepieces</h3>
          <div className="activity-list-container">
            {recentProducts.length === 0 ? (
              <p className="no-activity font-body">No products in catalogue yet.</p>
            ) : (
              recentProducts.map(p => (
                <div key={p.id} className="activity-item-row font-body">
                  <div className="activity-item-main">
                    <strong>{p.name}</strong> 
                    <span className="activity-meta">
                      Model: {p.modelNumber} | Category: {p.category} | Type: <span style={{ fontWeight: '700', fontSize: '10px', color: p.type === 'RETAIL' ? '#3B82F6' : '#6B7280', letterSpacing: '0.04em' }}>{p.type}</span>
                    </span>
                  </div>
                  <div className="activity-item-badge">
                    {p.isLive !== undefined ? (p.isLive ? (
                      <span className="active-tag">LIVE</span>
                    ) : (
                      <span className="draft-tag">DRAFT</span>
                    )) : (
                      <span className="active-tag">LIVE</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Users Created */}
        <div className="activity-card-panel">
          <h3 className="card-heading font-heading">Recent User Registrations</h3>
          <div className="activity-list-container">
            {recentUsers.length === 0 ? (
              <p className="no-activity font-body">No client accounts created yet.</p>
            ) : (
              recentUsers.map(u => (
                <div key={u.userId} className="activity-item-row font-body">
                  <div className="activity-item-main">
                    <strong>{u.name}</strong>
                    <span className="activity-meta">User ID: {u.userId} | Mobile: {u.mobile}</span>
                  </div>
                  <div className="activity-item-date font-body" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      <style>{`
        .dashboard-view-wrapper {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .dashboard-title-row {
          margin-bottom: 8px;
        }

        .dashboard-heading {
          font-size: 32px;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .dashboard-desc {
          font-size: 14px;
          color: var(--text-muted);
        }

        /* Stats panel grid columns */
        .metrics-row-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        @media (max-width: 1024px) {
          .metrics-row-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .dashboard-heading {
            font-size: 24px;
          }
          .metrics-row-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .actions-buttons-grid {
            flex-direction: column;
          }
          .quick-action-btn {
            width: 100%;
            height: 48px;
          }
          .dashboard-view-wrapper {
            gap: 20px;
          }
          .metric-card {
            padding: 16px 20px;
          }
          .activity-card-panel {
            padding: 16px 20px;
          }
        }

        .metric-card {
          background-color: #ffffff;
          padding: 24px;
          border-radius: 4px;
          box-shadow: var(--card-shadow);
          border: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .metric-icon {
          width: 48px;
          height: 48px;
          background-color: rgba(45, 93, 161, 0.1);
          color: var(--accent-blue);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }

        .metric-content {
          display: flex;
          flex-direction: column;
        }

        .metric-label {
          font-size: 10px;
          color: var(--text-muted);
          margin-bottom: 4px;
        }

        .metric-value {
          font-size: 28px;
          font-weight: 700;
          line-height: 1;
          color: var(--text-primary);
        }

        /* Quick actions styling */
        .quick-actions-card {
          background-color: #ffffff;
          padding: 24px;
          border-radius: 4px;
          border: 1px solid var(--border-color);
          box-shadow: var(--card-shadow);
        }

        .card-heading {
          font-size: 18px;
          color: var(--text-primary);
          margin-bottom: 16px;
          font-weight: 700;
        }

        .actions-buttons-grid {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .quick-action-btn {
          height: 44px;
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          min-width: 160px;
        }

        /* Activity feeds split grid */
        .recent-activity-split {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
        }

        @media (max-width: 960px) {
          .recent-activity-split {
            grid-template-columns: 1fr;
          }
        }

        .activity-card-panel {
          background-color: #ffffff;
          padding: 24px;
          border-radius: 4px;
          border: 1px solid var(--border-color);
          box-shadow: var(--card-shadow);
        }

        .activity-list-container {
          display: flex;
          flex-direction: column;
        }

        .activity-item-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 0;
          border-bottom: 1px solid var(--border-color);
        }

        .activity-item-row:last-child {
          border-bottom: none;
        }

        .activity-item-main {
          display: flex;
          flex-direction: column;
        }

        .activity-item-main strong {
          color: var(--text-primary);
          font-size: 14px;
        }

        .activity-meta {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .no-activity {
          font-size: 13px;
          color: var(--text-muted);
          text-align: center;
          padding: 24px 0;
        }

        /* Status tags */
        .active-tag {
          font-size: 9px;
          font-weight: 700;
          color: #059669;
          background-color: #d1fae5;
          padding: 2px 6px;
        }

        .draft-tag {
          font-size: 9px;
          font-weight: 700;
          color: #6B7280;
          background-color: #F3F4F6;
          padding: 2px 6px;
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
