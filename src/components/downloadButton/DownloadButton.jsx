import { useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { IoCheckmarkCircle, IoClose, IoDownloadOutline, IoInformationCircleOutline } from 'react-icons/io5'
import { selectDownloads } from '../../store/selectors'
import { upsertDownload } from '../../store/librarySlice'
import {
  cancelDownload,
  dismissDownloadTask,
  downloadsSupported,
  getDownloadTasks,
  makeDownloadId,
  probeDownload,
  startDownload,
  storageEstimate,
  subscribeDownloads,
} from '../../services/downloads/downloadManager'
import { formatBytes } from '../../utils/format'
import useAsync from '../../hooks/useAsync'
import Modal from '../modal/Modal'
import './style.scss'

const percent = (task) => (task.total ? Math.min(100, Math.round((task.loaded / task.total) * 100)) : 0)

const QualitySheet = ({ options, onPick, onClose, title }) => {
  const { data: sizes } = useAsync(
    async (signal) => Object.fromEntries(await Promise.all(options.map(async (o) => [o.id, (await probeDownload(o, { signal }).catch(() => ({}))).size]))),
    [options.map((o) => o.id).join(',')]
  )
  const { data: storage } = useAsync(() => storageEstimate(), [])

  return (
    <Modal open onClose={onClose} title={`Download ${title}`} size="sheet">
      <h2 className="downloadSheet__title">Download</h2>
      <p className="downloadSheet__sub">{title}</p>
      <ul className="downloadSheet__list">
        {options.map((option) => (
          <li key={option.id}>
            <button type="button" className="downloadSheet__option" onClick={() => onPick(option, sizes?.[option.id])}>
              <span>
                <strong>{option.label || option.kind.toUpperCase()}</strong>
                <small>{option.kind === 'webm' ? 'WebM' : 'MP4'}</small>
              </span>
              <span className="downloadSheet__size">{sizes ? formatBytes(sizes[option.id]) || 'Size unknown' : 'Checking size…'}</span>
              <IoDownloadOutline />
            </button>
          </li>
        ))}
      </ul>
      <p className="downloadSheet__note">
        <IoInformationCircleOutline aria-hidden="true" />
        Saved inside this browser for offline viewing in VM Flix. {storage ? `${formatBytes(storage.available)} of storage is free.` : ''}
      </p>
    </Modal>
  )
}

/**
 * Download control for playable titles. Appears only when a source is marked downloadable;
 * for other playable titles it explains why saving is not offered.
 */
const DownloadButton = ({ item, availability, season, episode }) => {
  const dispatch = useDispatch()
  const records = useSelector(selectDownloads)
  const tasks = useSyncExternalStore(subscribeDownloads, getDownloadTasks, getDownloadTasks)
  const [sheet, setSheet] = useState(false)

  if (!availability || availability.status !== 'playable') return null

  if (!availability.downloadable || !downloadsSupported()) {
    return (
      <p className="downloadNote">
        <IoInformationCircleOutline aria-hidden="true" />
        {downloadsSupported() ? 'Downloads aren’t offered for this title: its licence or host doesn’t allow saving a copy.' : 'Downloads need a browser with offline storage support.'}
      </p>
    )
  }

  const prefix = `${item.mediaType}:${item.id}:${season ?? 0}x${episode ?? 0}:`
  const task = tasks.find((t) => t.id.startsWith(prefix))
  const record = records.find((r) => r.id.startsWith(prefix) && r.status === 'done')
  const options = availability.sources.filter((s) => s.downloadable)

  const begin = (option) => {
    setSheet(false)
    const id = makeDownloadId({ mediaType: item.mediaType, tmdbId: item.id, season, episode, sourceId: option.id })
    toast(`Downloading ${item.title} (${option.label})`, { id })
    startDownload(
      {
        id,
        source: option,
        meta: {
          mediaType: item.mediaType,
          tmdbId: item.id,
          title: item.title,
          posterPath: item.posterPath,
          season: season ?? null,
          episode: episode ?? null,
          license: option.license?.name || null,
        },
      },
      {
        onDone: (rec) => {
          dispatch(upsertDownload(rec))
          toast.success(`${item.title} is ready offline`, { id })
        },
      }
    )
  }

  if (task && (task.status === 'preparing' || task.status === 'downloading')) {
    const pct = percent(task)
    return (
      <div className="downloadBtn downloadBtn--busy" role="status">
        <div className="downloadBtn__bar" aria-hidden="true">
          <i style={{ width: `${task.status === 'preparing' ? 4 : pct}%` }} />
        </div>
        <span>{task.status === 'preparing' ? 'Preparing…' : `Downloading ${pct}%${task.total ? ` of ${formatBytes(task.total)}` : ''}`}</span>
        <button type="button" className="downloadBtn__cancel" aria-label="Cancel download" onClick={() => cancelDownload(task.id)}>
          <IoClose />
        </button>
      </div>
    )
  }

  if (task?.status === 'failed') {
    return (
      <div className="downloadBtn downloadBtn--failed" role="alert">
        <span>{task.error}</span>
        <button type="button" className="btn btn--outline btn--sm" onClick={() => { dismissDownloadTask(task.id); setSheet(true) }}>
          Try again
        </button>
        {sheet && <QualitySheet options={options} title={item.title} onClose={() => setSheet(false)} onPick={begin} />}
      </div>
    )
  }

  if (record) {
    return (
      <Link to="/downloads" className="btn btn--glass downloadBtn--done">
        <IoCheckmarkCircle /> Downloaded · {formatBytes(record.size)}
      </Link>
    )
  }

  return (
    <>
      <button type="button" className="btn btn--glass" onClick={() => setSheet(true)}>
        <IoDownloadOutline /> Download
      </button>
      {sheet && <QualitySheet options={options} title={item.title} onClose={() => setSheet(false)} onPick={begin} />}
    </>
  )
}

export default DownloadButton
