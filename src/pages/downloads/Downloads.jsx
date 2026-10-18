import { useEffect, useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { IoCloseCircleOutline, IoPlay, IoTrashOutline } from 'react-icons/io5'
import { removeDownloadRecord } from '../../store/librarySlice'
import { selectDownloads } from '../../store/selectors'
import {
  cancelDownload,
  deleteDownloadFile,
  dismissDownloadTask,
  downloadsSupported,
  getDownloadTasks,
  hasDownloadFile,
  storageEstimate,
  subscribeDownloads,
} from '../../services/downloads/downloadManager'
import { detailsPath, watchPath } from '../../config/routes'
import { tmdbImage } from '../../utils/api'
import { formatBytes, formatDate } from '../../utils/format'
import useAsync from '../../hooks/useAsync'
import useDocumentTitle from '../../hooks/useDocumentTitle'
import ContentWrapper from '../../components/contentWrapper/ContentWrapper'
import PageHeader from '../../components/pageHeader/PageHeader'
import Img from '../../components/lazyLoadImage/Img'
import { EmptyState } from '../../components/states/States'
import './style.scss'

const label = (item) => (item.mediaType === 'tv' ? `${item.title} · S${item.season} E${item.episode}` : item.title)

const Downloads = () => {
  useDocumentTitle('Downloads')
  const dispatch = useDispatch()
  const records = useSelector(selectDownloads)
  const tasks = useSyncExternalStore(subscribeDownloads, getDownloadTasks, getDownloadTasks)
  const [missing, setMissing] = useState({})
  const supported = downloadsSupported()

  // Browsers may evict stored files under storage pressure, so confirm each saved file still exists.
  useEffect(() => {
    let cancelled = false
    Promise.all(records.filter((r) => r.status === 'done').map(async (r) => [r.id, !(await hasDownloadFile(r.id))])).then((pairs) => {
      if (!cancelled) setMissing(Object.fromEntries(pairs.filter(([, gone]) => gone)))
    })
    return () => {
      cancelled = true
    }
  }, [records])

  const { data: storage } = useAsync(() => (supported ? storageEstimate() : null), [records.length], { enabled: supported })
  const used = records.reduce((sum, r) => sum + (r.size || 0), 0)

  const remove = async (record) => {
    await deleteDownloadFile(record.id)
    dispatch(removeDownloadRecord(record.id))
    toast.success('Download removed')
  }

  const active = tasks.filter((t) => t.status === 'preparing' || t.status === 'downloading' || t.status === 'failed')

  return (
    <div className="pageBody">
      <PageHeader
        title="Downloads"
        intro="Titles you saved for offline viewing. Only content with a licence and host that allow saving can be downloaded; files stay inside this browser."
      />
      <ContentWrapper>
        {!supported && <EmptyState title="Downloads aren’t supported here" message="This browser doesn’t provide the offline storage VM Flix needs." />}

        {supported && (records.length > 0 || active.length > 0) && (
          <p className="downloads__summary">
            {records.length} saved · {formatBytes(used) || '0 B'} used{storage ? ` · ${formatBytes(storage.available)} free on this device` : ''}
          </p>
        )}

        {active.length > 0 && (
          <ul className="downloads__list" aria-label="In progress">
            {active.map((task) => {
              const pct = task.total ? Math.min(100, Math.round((task.loaded / task.total) * 100)) : 0
              return (
                <li key={task.id} className="downloads__item">
                  <div className="downloads__poster">
                    <Img src={tmdbImage(task.meta.posterPath, 'w185')} ratio="2 / 3" />
                  </div>
                  <div className="downloads__body">
                    <h2>{label(task.meta)}</h2>
                    {task.status === 'failed' ? (
                      <p className="downloads__error">{task.error}</p>
                    ) : (
                      <>
                        <div className="downloads__bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`Downloading ${label(task.meta)}`}>
                          <i style={{ width: `${task.status === 'preparing' ? 3 : pct}%` }} />
                        </div>
                        <p>
                          {task.status === 'preparing' ? 'Preparing…' : `${pct}% · ${formatBytes(task.loaded)}${task.total ? ` of ${formatBytes(task.total)}` : ''}`}
                        </p>
                      </>
                    )}
                    <div className="downloads__actions">
                      {task.status === 'failed' ? (
                        <>
                          <Link to={detailsPath(task.meta.mediaType, task.meta.tmdbId)} className="btn btn--outline btn--sm">
                            Try again from details
                          </Link>
                          <button type="button" className="btn btn--ghost btn--sm" onClick={() => dismissDownloadTask(task.id)}>
                            Dismiss
                          </button>
                        </>
                      ) : (
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => cancelDownload(task.id)}>
                          <IoCloseCircleOutline /> Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {supported && records.length > 0 && (
          <ul className="downloads__list" aria-label="Saved downloads">
            {records.map((record) => {
              const gone = !!missing[record.id]
              return (
                <li key={record.id} className="downloads__item">
                  <div className="downloads__poster">
                    <Img src={tmdbImage(record.posterPath, 'w185')} ratio="2 / 3" />
                  </div>
                  <div className="downloads__body">
                    <h2>{label(record)}</h2>
                    <p>
                      {[record.label, formatBytes(record.size), `Saved ${formatDate(new Date(record.savedAt).toISOString())}`, record.license].filter(Boolean).join(' · ')}
                    </p>
                    {gone && <p className="downloads__error">The browser removed this file to free up space. Delete it and download again.</p>}
                    <div className="downloads__actions">
                      {!gone && (
                        <Link to={watchPath(record.mediaType, record.tmdbId, record.mediaType === 'tv' ? { season: record.season, episode: record.episode } : {})} className="btn btn--primary btn--sm">
                          <IoPlay /> Play offline
                        </Link>
                      )}
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => remove(record)}>
                        <IoTrashOutline /> Delete
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {supported && records.length === 0 && active.length === 0 && (
          <EmptyState
            title="No downloads yet"
            message="A Download button appears on titles whose licence and host allow saving a copy, such as open-licence films in the VM Flix catalogue."
            action={
              <Link to="/" className="btn btn--primary">
                Browse VM Flix
              </Link>
            }
          />
        )}
      </ContentWrapper>
    </div>
  )
}

export default Downloads
