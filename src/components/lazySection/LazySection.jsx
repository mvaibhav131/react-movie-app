import useInView from '../../hooks/useInView'

/** Mounts children only once the section is near the viewport so off-screen rails don't fetch up front. */
const LazySection = ({ children, minHeight = 340, rootMargin = '360px' }) => {
  const [ref, inView] = useInView({ rootMargin })
  return (
    <div ref={ref} style={inView ? undefined : { minHeight }}>
      {inView ? children : null}
    </div>
  )
}

export default LazySection
