import { useEffect, useState } from 'react';
import { BarChart3, Building2, ChevronLeft, ChevronRight, Download, RefreshCw, Search, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../assets/styles/admin.css';
import { deactivateAdminUser, getAdminStats, getAdminUsers, getPriceUpdates, getAdminReport, setSupplierVerified } from '../api/admin.api';

const sections = ['Overview', 'Users & suppliers', 'Price updates', 'Reports'];
const reportTypes = [
	{ value: 'users', label: 'User growth' },
	{ value: 'prices', label: 'Price activity' },
	{ value: 'inquiries', label: 'Inquiries' },
];

const dateInput = (date) => date.toISOString().slice(0, 10);
const formatDate = (date) => date ? new Date(date).toLocaleString() : 'Not available';
const formatReportLabel = (key) => key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase());

export default function AdminPanel() {
	const { user } = useAuth();
	const [section, setSection] = useState('Overview');
	const [stats, setStats] = useState(null);
	const [updates, setUpdates] = useState([]);
	const [users, setUsers] = useState([]);
	const [userTotal, setUserTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [pages, setPages] = useState(1);
	const [role, setRole] = useState('all');
	const [search, setSearch] = useState('');
	const [searchInput, setSearchInput] = useState('');
	const [reportType, setReportType] = useState('users');
	const [startDate, setStartDate] = useState(() => {
		const date = new Date();
		date.setDate(date.getDate() - 30);
		return dateInput(date);
	});
	const [endDate, setEndDate] = useState(() => dateInput(new Date()));
	const [report, setReport] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [busyId, setBusyId] = useState('');

	useEffect(() => {
		if (user?.role !== 'admin') return;
		setLoading(true);
		setError('');
		Promise.all([getAdminStats(), getPriceUpdates()])
			.then(([statsResponse, updatesResponse]) => {
				setStats(statsResponse.data.data.stats);
				setUpdates(updatesResponse.data.data.updates);
			})
			.catch((requestError) => setError(requestError.response?.data?.message || 'Unable to load admin data.'))
			.finally(() => setLoading(false));
	}, [user]);

	useEffect(() => {
		if (user?.role !== 'admin' || section !== 'Users & suppliers') return;
		setLoading(true);
		setError('');
		getAdminUsers({ page, role: role === 'all' ? undefined : role, search: search || undefined })
			.then((response) => {
				setUsers(response.data.data);
				setUserTotal(response.data.pagination.total);
				setPages(response.data.pagination.pages);
			})
			.catch((requestError) => setError(requestError.response?.data?.message || 'Unable to load users.'))
			.finally(() => setLoading(false));
	}, [user, section, page, role, search]);

	if (user?.role !== 'admin') {
		return <div className="container admin-page"><section className="admin-denied"><ShieldCheck size={28} /><h1>Admin access required</h1><p>Your account does not have permission to view this workspace.</p></section></div>;
	}

	const refresh = async () => {
		setLoading(true);
		setError('');
		try {
			if (section === 'Users & suppliers') {
				const response = await getAdminUsers({ page, role: role === 'all' ? undefined : role, search: search || undefined });
				setUsers(response.data.data);
				setUserTotal(response.data.pagination.total);
				setPages(response.data.pagination.pages);
			} else if (section === 'Price updates') {
				const response = await getPriceUpdates();
				setUpdates(response.data.data.updates);
			} else {
				const [statsResponse, updatesResponse] = await Promise.all([getAdminStats(), getPriceUpdates()]);
				setStats(statsResponse.data.data.stats);
				setUpdates(updatesResponse.data.data.updates);
			}
		} catch (requestError) {
			setError(requestError.response?.data?.message || 'Unable to refresh admin data.');
		} finally {
			setLoading(false);
		}
	};

	const verifySupplier = async (supplier) => {
		setBusyId(supplier._id);
		setError('');
		try {
			const response = await setSupplierVerified(supplier._id, !supplier.profile?.verified);
			setUsers((current) => current.map((item) => item._id === supplier._id ? response.data.data.user : item));
		} catch (requestError) {
			setError(requestError.response?.data?.message || 'Unable to update supplier verification.');
		} finally {
			setBusyId('');
		}
	};

	const deactivateAccount = async (account) => {
		if (!window.confirm(`Deactivate ${account.profile?.companyName || account.username}'s account?`)) return;
		setBusyId(account._id);
		setError('');
		try {
			await deactivateAdminUser(account._id);
			setUsers((current) => current.map((item) => item._id === account._id ? { ...item, isActive: false } : item));
		} catch (requestError) {
			setError(requestError.response?.data?.message || 'Unable to deactivate this account.');
		} finally {
			setBusyId('');
		}
	};

	const generateReport = async (event) => {
		event.preventDefault();
		setLoading(true);
		setError('');
		setReport(null);
		try {
			const response = await getAdminReport({ type: reportType, startDate, endDate });
			setReport(response.data.data);
		} catch (requestError) {
			setError(requestError.response?.data?.message || 'Unable to generate report.');
		} finally {
			setLoading(false);
		}
	};

	const downloadReport = () => {
		if (!report?.report) return;
		const rows = [['Metric', 'Value'], ...Object.entries(report.report).map(([key, value]) => [formatReportLabel(key), value])];
		const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
		const url = window.URL.createObjectURL(new window.Blob([csv], { type: 'text/csv' }));
		const link = document.createElement('a');
		link.href = url;
		link.download = `buildwise-${reportType}-report-${startDate}-to-${endDate}.csv`;
		link.click();
		window.URL.revokeObjectURL(url);
	};

	return (
		<div className="container admin-page">
			<header className="admin-heading">
				<div><span className="eyebrow">Marketplace operations</span><h1>Admin workspace</h1><p className="section-intro">Manage accounts, validate suppliers, and keep pricing accountable.</p></div>
				<button className="btn btn-quiet admin-refresh" type="button" onClick={refresh} disabled={loading}><RefreshCw size={16} /> Refresh</button>
			</header>

			<nav className="admin-tabs" aria-label="Admin sections">
				{sections.map((item) => <button key={item} type="button" className={section === item ? 'admin-tab active' : 'admin-tab'} onClick={() => setSection(item)}>{item}</button>)}
			</nav>

			{error && <div className="admin-alert" role="alert">{error}</div>}
			{loading && <p className="admin-status" role="status">Loading workspace...</p>}

			{section === 'Overview' && <>
				<section className="admin-metrics" aria-label="Marketplace summary">
					<article className="admin-metric"><span><Users size={17} /> Active accounts</span><strong>{stats?.totalUsers ?? '—'}</strong><small>{stats?.totalContractors ?? 0} contractors · {stats?.totalSuppliers ?? 0} suppliers</small></article>
					<article className="admin-metric"><span><Building2 size={17} /> Awaiting verification</span><strong>{stats?.pendingSuppliers ?? '—'}</strong><small>Supplier authenticity reviews</small></article>
					<article className="admin-metric"><span><RefreshCw size={17} /> Price records</span><strong>{stats?.totalPrices ?? '—'}</strong><small>{updates.length} latest updates loaded</small></article>
					<article className="admin-metric"><span><BarChart3 size={17} /> Inquiries</span><strong>{stats?.totalInquiries ?? '—'}</strong><small>{stats?.pendingInquiries ?? 0} awaiting response</small></article>
				</section>
				<section className="admin-section">
					<div className="admin-section-heading"><div><span className="eyebrow">Latest activity</span><h2>Price updates</h2></div><button className="btn btn-quiet" onClick={() => setSection('Price updates')}>View all</button></div>
					<PriceUpdateTable updates={updates.slice(0, 6)} />
				</section>
			</>}

			{section === 'Users & suppliers' && <section className="admin-section">
				<div className="admin-section-heading"><div><span className="eyebrow">Account directory</span><h2>Users & suppliers</h2></div><span className="admin-count">{userTotal} accounts</span></div>
				<form className="admin-filters" onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(searchInput.trim()); }}>
					<label className="admin-search"><Search size={16} /><input aria-label="Search accounts" placeholder="Search name, email, or company" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} /></label>
					<select aria-label="Filter by account type" value={role} onChange={(event) => { setPage(1); setRole(event.target.value); }}><option value="all">All account types</option><option value="contractor">Contractors</option><option value="supplier">Suppliers</option><option value="admin">Admins</option></select>
					<button className="btn btn-primary" type="submit">Search</button>
				</form>
				<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Account</th><th>Type</th><th>Supplier evidence</th><th>Status</th><th>Joined</th><th>Action</th></tr></thead><tbody>
					{users.map((account) => <tr key={account._id}><td><strong>{account.profile?.companyName || account.username}</strong><small>{account.email}</small></td><td className="capitalize">{account.role}</td><td>{account.role === 'supplier' ? <><small>GST: {account.profile?.gstNumber || 'Not provided'}</small><small>License: {account.profile?.businessLicense || 'Not provided'}</small></> : '—'}</td><td>{account.role === 'supplier' ? <span className={account.profile?.verified ? 'admin-badge verified' : 'admin-badge pending'}>{account.profile?.verified ? 'Verified' : 'Unverified'}</span> : account.isActive ? 'Active' : 'Deactivated'}</td><td>{formatDate(account.createdAt)}</td><td className="admin-row-actions">{account.role === 'supplier' && account.isActive && <button className="admin-action" disabled={busyId === account._id} onClick={() => verifySupplier(account)}>{account.profile?.verified ? 'Revoke verification' : 'Verify supplier'}</button>}{account.isActive && account._id !== user?._id && <button className="admin-action danger" disabled={busyId === account._id} onClick={() => deactivateAccount(account)}>Deactivate</button>}</td></tr>)}
					{!loading && users.length === 0 && <tr><td colSpan="6" className="admin-empty">No accounts match these filters.</td></tr>}
				</tbody></table></div>
				<div className="admin-pagination"><span>Page {page} of {pages}</span><div><button aria-label="Previous page" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}><ChevronLeft size={18} /></button><button aria-label="Next page" disabled={page >= pages || loading} onClick={() => setPage((current) => current + 1)}><ChevronRight size={18} /></button></div></div>
			</section>}

			{section === 'Price updates' && <section className="admin-section">
				<div className="admin-section-heading"><div><span className="eyebrow">Pricing activity</span><h2>Recent price updates</h2></div><span className="admin-count">Latest 50</span></div>
				<PriceUpdateTable updates={updates} />
			</section>}

			{section === 'Reports' && <section className="admin-section">
				<div className="admin-section-heading"><div><span className="eyebrow">Analytics & exports</span><h2>Generate a report</h2></div></div>
				<form className="admin-report-form" onSubmit={generateReport}>
					<label>Report type<select value={reportType} onChange={(event) => setReportType(event.target.value)}>{reportTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
					<label>From<input type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} required /></label>
					<label>To<input type="date" value={endDate} min={startDate} max={dateInput(new Date())} onChange={(event) => setEndDate(event.target.value)} required /></label>
					<button className="btn btn-primary" type="submit" disabled={loading}>Generate report</button>
				</form>
				{report && <div className="admin-report-result"><div className="admin-section-heading"><div><span className="eyebrow">{reportTypes.find((type) => type.value === reportType)?.label}</span><h2>{report.period.startDate} to {report.period.endDate}</h2></div><button className="btn btn-quiet" onClick={downloadReport}><Download size={16} /> Export CSV</button></div><dl>{Object.entries(report.report).map(([key, value]) => <div key={key}><dt>{formatReportLabel(key)}</dt><dd>{value}</dd></div>)}</dl></div>}
			</section>}
		</div>
	);
}

function PriceUpdateTable({ updates }) {
	return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Material</th><th>Supplier</th><th>Location</th><th>Price</th><th>Last updated</th></tr></thead><tbody>
		{updates.map((update) => <tr key={update._id}><td><strong>{update.materialId?.name || 'Material'}</strong><small>{update.unit}</small></td><td>{update.supplierId?.profile?.companyName || update.supplierId?.username || 'Supplier'}</td><td>{[update.location?.city, update.location?.state].filter(Boolean).join(', ') || '—'}</td><td className="admin-price">${Number(update.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td>{formatDate(update.lastUpdated || update.updatedAt)}</td></tr>)}
		{updates.length === 0 && <tr><td colSpan="5" className="admin-empty">No price updates found.</td></tr>}
	</tbody></table></div>;
}
