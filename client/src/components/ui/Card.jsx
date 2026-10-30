export default function Card({ children, className = '', title, actions }) {
  return (
    <div className={`card ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between mb-3">
          {title && <h3 className="font-semibold">{title}</h3>}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}
