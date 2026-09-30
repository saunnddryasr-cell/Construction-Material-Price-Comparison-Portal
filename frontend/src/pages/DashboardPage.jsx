import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../api';

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/dashboard');
        if (isMounted) {
          setDashboard(data.data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err.response?.data?.message ||
              'Unable to load dashboard data. Please try again.'
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="container">
        <div className="empty">Loading dashboard data from the backend...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container">
        <div className="empty" style={{ color: '#dc2626' }}>
          {error}
        </div>
      </div>
    );
  }

  // No data state
  if (!dashboard) {
    return (
      <div className="container">
        <div className="empty">No dashboard data available.</div>
      </div>
    );
  }

  const { stats = {}, recent = [] } = dashboard;

  return (
    <div className="container">
      <header className="page-header">
        <span className="eyebrow">Your workspace</span>
        <h1>Your sourcing dashboard.</h1>
        <p className="section-intro">
          A live overview of materials, suppliers, and available prices.
        </p>
      </header>

      <div className="dashboard-grid">
        <div className="stat">
          <span>Active materials</span>
          <strong>{stats.materials ?? 0}</strong>
        </div>
        <div className="stat">
          <span>Active suppliers</span>
          <strong>{stats.suppliers ?? 0}</strong>
        </div>
        <div className="stat">
          <span>Price listings</span>
          <strong>{stats.prices ?? 0}</strong>
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Recent activity</span>
            <h2>Keep moving</h2>
          </div>
          <Link className="btn btn-primary" to="/materials">
            Browse materials
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="panel">
            <p className="empty">No recent activity yet.</p>
          </div>
        ) : (
          recent.map((item) => (
            <div
              className="panel"
              key={`${item.material}-${item.updated}`}
            >
              <div className="card-meta">
                <span>
                  <strong>{item.material}</strong>
                  <br />
                  Updated {item.updated}
                </span>
                <span className="best">{item.status}</span>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
