import { useEffect } from "react"
import { MainStore } from "./store"

export default function LoadFFmpeg() {
  const ffmpegLoaded = MainStore(s => s.ffmpegLoaded)
  const ffmpegLoad = MainStore(s => s.load)

  useEffect(() => {
    ffmpegLoad()
  }, [])

  if (!ffmpegLoaded) {
    return (
      <div className="w-full h-full absolute left-0 top-0 bg-[#242424] bg-opacity-80 flex items-center justify-center">
        <div className="text-lg p-2">Loading FFmpeg...</div>
      </div>
    )
  }
  return <></>
}
