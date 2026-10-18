const ContentWrapper = ({ children, className = '' }) => (
  <div className={`contentWrapper ${className}`.trim()}>{children}</div>
)

export default ContentWrapper
