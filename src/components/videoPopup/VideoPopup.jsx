import Modal from '../modal/Modal'
import YouTubePlayer from '../youtubePlayer/YouTubePlayer'

/** Trailer / video popup. Playback stops when closed because the player unmounts with the modal. */
const VideoPopup = ({ open, onClose, videoId, title }) => (
  <Modal open={open && !!videoId} onClose={onClose} title={title || 'Video'} size="video">
    {videoId && <YouTubePlayer videoId={videoId} title={title} />}
  </Modal>
)

export default VideoPopup
