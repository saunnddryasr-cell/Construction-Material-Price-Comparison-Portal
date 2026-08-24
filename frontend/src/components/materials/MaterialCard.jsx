import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import Card from '../common/Card';
export default function MaterialCard({ material }) { return <Card><div className="material-icon">{material.icon}</div><h3>{material.name}</h3><p>{material.category} · {material.unit}</p><div className="card-meta"><span>from <strong className="price">${material.price.toFixed(2)}</strong></span><span>{material.suppliers} suppliers</span></div><Link className="btn btn-quiet" to={`/compare?material=${material.id}`} style={{ paddingLeft: 0, marginTop: 16 }}>Compare quotes <ArrowUpRight size={15} /></Link></Card>; }
