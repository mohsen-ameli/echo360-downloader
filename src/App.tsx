import { useEffect, useState } from "react"
import { MainStore } from "./store"
import { fetchFile } from "@ffmpeg/util"

export default function App() {
  const { audioUrl, videoUrl, title } = MainStore()
  const [rightPage, setRightPage] = useState(false)
  const [clicked, setClicked] = useState(false)
  const ffmpeg = MainStore(s => s.ffmpeg)
  const [url, setUrl] = useState("")
  const [loaded, setLoaded] = useState(true)
  const mergeProgress = MainStore(s => s.mergeProgress)

  useEffect(() => {
    MainStore.setState({ mergeProgress: 0, audioUrl: "", videoUrl: "" })
  }, [])

  async function download() {
    setClicked(true)
    const [tab] = await chrome.tabs?.query({ active: true })
    chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      func: () => {
        location.reload()
      },
    })
  }

  // Initializing extension
  useEffect(() => {
    async function initExtension() {
      const [tab] = await chrome.tabs?.query({ active: true })
      if (tab.url.match("https://echo360.*/lesson/*")) {
        setRightPage(true)
        MainStore.setState({ title: tab.title!.replace(/\W/g, "_") })
      }
    }
    initExtension()
  }, [])

  // Download files when audio and video urls are ready
  useEffect(() => {
    async function downloadFiles() {
      if (audioUrl && videoUrl && title) {
        await ffmpeg.writeFile("video.mp4", await fetchFile(videoUrl))
        await ffmpeg.writeFile("audio.mp4", await fetchFile(audioUrl))
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

        // download the file automatically
        const a = document.createElement("a")
        a.hidden = true
        a.href = mergedUrl
        a.download = title + ".mp4"
        a.click()
      }
    }
    downloadFiles()
  }, [audioUrl, videoUrl])

  if (!rightPage) {
    return (
      <div className="flex flex-col gap-4 p-4 justify-center items-center">
        <h1 className="text-2xl font-bold text-red-400">Wrong page</h1>
        <h1 className="text-lg">
          Go to a specific video on Echo360. Then click on the extension.
        </h1>
      </div>
    )
  } else if (url) {
    return (
      <div className="flex flex-col gap-4 p-4 justify-center items-center">
        <h1 className="text-2xl font-bold">Successfully downloaded!</h1>
        <video controls src={url} width="250" />
        <div className="flex gap-4">
          <button
            className="border-2 py-2 px-4 rounded-lg hover:bg-zinc-600 transition text-center"
            onClick={() => setUrl("")}
          >
            Go back
          </button>
        </div>
      </div>
    )
  } else if (!loaded) {
    return (
      <div className="w-full bg-[#242424] text-lg text-center py-16">
        {mergeProgress}% loaded...
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 justify-center items-center">
      <h1 className="text-2xl font-bold">Echo360 Downloader</h1>
      <h2 className="text-lg">Lecture: {title}</h2>
      <div className="flex gap-4">
        <button
          className="border-2 py-2 px-4 rounded-lg hover:bg-zinc-600 transition text-center disabled:cursor-not-allowed disabled:bg-zinc-600"
          onClick={download}
          disabled={clicked}
        >
          {!clicked ? "Download" : "Do not close the extension!"}
        </button>
      </div>
    </div>
  )
}
