import { FFmpeg } from "@ffmpeg/ffmpeg"
import { fetchFile, toBlobURL } from "@ffmpeg/util"
import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { MainStore } from "./store"

export default function MergePage() {
  const [files, setFiles] = useState<File[]>()
  const [url, setUrl] = useState("")
  const [loaded, setLoaded] = useState(false)
  const ffmpegRef = useRef(new FFmpeg())
  const progress = MainStore(s => s.progress)

  async function load() {
    const baseURL = "https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm"
    console.log(import.meta.env.MODE)
    const ffmpeg = ffmpegRef.current
    ffmpeg.on("progress", ({ progress }) => {
      MainStore.setState({ progress: (progress * 100).toFixed(0) })
    })
    let config = {}
    if (import.meta.env.MODE === "development") {
      config = {
        coreURL: await toBlobURL("/ffmpeg-core.js", "text/javascript"),
        wasmURL: await toBlobURL("/ffmpeg-core.wasm", "application/wasm"),
        workerURL: await toBlobURL("/ffmpeg-core.worker.js", "text/javascript"),
      }
    } else {
      config = {
        coreURL: "/ffmpeg-core.js",
        wasmURL: "/ffmpeg-core.wasm",
        workerURL: "/ffmpeg-core.worker.js",
      }
    }
    await ffmpeg.load(config)
    setLoaded(true)
  }

  async function merge() {
    setLoaded(false)

    const ffmpeg = ffmpegRef.current
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
    const data = new Uint8Array(fileData as ArrayBuffer)
    const mergedUrl = URL.createObjectURL(
      new Blob([data.buffer], { type: "video/mp4" })
    )
    setUrl(mergedUrl)
    setLoaded(true)
  }

  useEffect(() => {
    load()
  }, [])

  if (!loaded) {
    return <div className="text-center text-lg p-2">{progress}% loaded...</div>
  }

  if (url) {
    return (
      <div className="flex flex-col gap-4 p-4 justify-center items-center">
        <video controls src={url} width="250" />
        <a
          href={url}
          download="mergedVideo.mp4"
          className="border-2 py-2 px-4 rounded-lg hover:bg-zinc-600 transition text-center"
        >
          Download
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 justify-center items-center">
      <h1>Now you can merge the downloaded files :)</h1>
      <div className="flex flex-col gap-1">
        <label>Video and Audio Files</label>
        <input
          type="file"
          multiple
          onChange={e => setFiles([e.target.files![0], e.target.files![1]])}
        />
      </div>
      <button
        className="border-2 py-2 px-4 rounded-lg hover:bg-zinc-600 transition text-center"
        onClick={merge}
      >
        Merge the files
      </button>
    </div>
  )
}
