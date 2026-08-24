export default function Input({ label, ...props }) { return <label className="form-label">{label}<input className="form-input" {...props} /></label>; }
