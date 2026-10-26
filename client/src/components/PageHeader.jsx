export default function PageHeader({ title, subtitle, actions, className = "" }) {
  return (
    <div className={`page-head page-heading ${className}`}>
      <div className="page-heading-copy">
        <h2>{title}</h2>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-heading-actions">{actions}</div>}
    </div>
  );
}
