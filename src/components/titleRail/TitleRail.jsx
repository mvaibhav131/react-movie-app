import { useState } from 'react'
import useAsync from '../../hooks/useAsync'
import Carousel from '../carousel/Carousel'
import SwitchTab from '../switchTabs/SwitchTab'

/** A rail whose data comes from `load(signal) -> { results }`. `deps` re-run the loader. */
export const TitleRail = ({ title, load, deps = [], ...rest }) => {
  const { data, loading, error, reload } = useAsync((signal) => load(signal), deps)
  return <Carousel title={title} data={data?.results} loading={loading} error={error} onRetry={reload} {...rest} />
}

/** A rail with a tab strip; each tab is { label, load, seeAllTo? }. */
export const TabbedRail = ({ title, tabs, ...rest }) => {
  const [active, setActive] = useState(tabs[0].label)
  const tab = tabs.find((t) => t.label === active) || tabs[0]
  const { data, loading, error, reload } = useAsync((signal) => tab.load(signal), [tab.label])
  return (
    <Carousel
      title={title}
      data={data?.results}
      loading={loading}
      error={error}
      onRetry={reload}
      seeAllTo={tab.seeAllTo}
      actions={tabs.length > 1 ? <SwitchTab data={tabs.map((t) => t.label)} value={active} onTabChange={setActive} label={`${title} filter`} /> : null}
      {...rest}
    />
  )
}
