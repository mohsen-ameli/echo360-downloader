import { fetchFile } from "@ffmpeg/util"
import { useEffect, useState } from "react"
import { MainStore } from "./store"

export default function MergePage() {
  const [files, setFiles] = useState<File[]>([])
  const [url, setUrl] = useState("")
  const [loaded, setLoaded] = useState(true)
  const mergeProgress = MainStore(s => s.mergeProgress)
  const ffmpeg = MainStore(s => s.ffmpeg)

  useEffect(() => {
    MainStore.setState({ mergeProgress: 0, audioUrl: "", videoUrl: "" })
  }, [])

  async function merge() {
    setLoaded(false)

    // chrome.downloads.removeFile({
    //   query: ["audio__"],
    //   state: "complete",
    // })
    // const audio = await chrome.downloads.search({
    //   query: ["audio__"],
    //   state: "complete",
    // })
    // const video = await chrome.downloads.search({
    //   query: ["video__"],
    //   state: "complete",
    // })

    await ffmpeg.writeFile("video.mp4", await fetchFile(files[0]))
    await ffmpeg.writeFile("audio.mp4", await fetchFile(files[1]))
    await ffmpeg.exec([
      "-i",
      "video.mp4",
      "-i",
      "audio.mp4",
      "-c",
      "copy",
      "output.mp4",
    ])
    const fileData = await ffmpeg.readFile("output.mp4")
    const data = new Uint8Array(fileData as unknown as ArrayBuffer)
    const mergedUrl = URL.createObjectURL(
      new Blob([data.buffer], { type: "video/mp4" })
    )
    setUrl(mergedUrl)
    setLoaded(true)
  }

  if (!loaded) {
    return (
      <div className="w-full bg-[#242424] text-lg text-center py-16">
        {mergeProgress}% loaded...
      </div>
    )
  }

  if (url) {
    return (
      <div className="flex flex-col gap-4 p-4 justify-center items-center">
        <video controls src={url} width="250" />
        <div className="flex gap-4">
          <button
            className="border-2 py-2 px-4 rounded-lg hover:bg-zinc-600 transition text-center"
            onClick={() => {
              setUrl("")
              setFiles([])
            }}
          >
            Go back
          </button>
          <a
            href={url}
            download="mergedVideo.mp4"
            className="border-2 py-2 px-4 rounded-lg hover:bg-zinc-600 transition text-center"
          >
            Download
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 justify-center items-center">
      <h1>Please select a video and audio file to merge</h1>
      <input
        type="file"
        multiple
        onChange={e => {
          if (e.target.files.length != 2) return
          else setFiles([e.target.files![0], e.target.files![1]])
        }}
      />
      <div className="flex gap-4">
        {files.length == 2 && (
          <button
            className="border-2 py-2 px-4 rounded-lg hover:bg-zinc-600 transition text-center"
            onClick={merge}
          >
            Merge the files
          </button>
        )}
      </div>
    </div>
  )
}
