import { Link, NavLink } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
export default function Navbar() { const { user } = useAuth(); return <header className="navbar"><div className="container nav-inner"><Link to="/" className="logo"><span className="logo-mark">B</span> buildwise</Link><nav className="nav-links"><NavLink to="/materials">Materials</NavLink><NavLink to="/compare">Compare</NavLink><NavLink to="/dashboard">Dashboard</NavLink></nav><div className="nav-actions">{user ? <Link to="/dashboard">{user.name}</Link> : <><Link className="btn btn-quiet" to="/login">Sign in</Link><Link className="btn btn-primary" to="/register">Join portal <ArrowUpRight size={15} /></Link></>}</div></div></header>; }
