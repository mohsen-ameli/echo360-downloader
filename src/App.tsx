import { useEffect, useState } from "react"
import { MainStore } from "./store"
import { fetchFile } from "@ffmpeg/util"

export default function App() {
  const { audioUrl, videoUrl, videoUrlSecondary, transcriptUrl, title } =
    MainStore()
  const [rightPage, setRightPage] = useState(false)
  const [clicked, setClicked] = useState(false)
  const ffmpeg = MainStore(s => s.ffmpeg)
  const [url, setUrl] = useState("")
  const [nameOfFile, setNameOfFile] = useState("")
  const mergeProgress = MainStore(s => s.mergeProgress)
  const mergeOperation = MainStore(s => s.mergeOperation)
  const [error, setError] = useState("")

  // Reload the page to trigger content script (in main.tsx)
  // Then once the videoUrl and other urls are set, the useEffect below will call downloadFiles
  async function initDownload() {
    setClicked(true)
    const [tab] = await chrome.tabs?.query({ active: true })
    chrome.scripting
      .executeScript({
        target: { tabId: tab.id! },
        func: () => {
          location.reload()
        },
      })
      .then(() => {
        // click button after reloading to trigger content script
        chrome.scripting.executeScript({
          target: { tabId: tab.id! },
          func: () => {
            const downloadButton = document.getElementById(
              "close-caption-menu-toggle-btn"
            ) as HTMLButtonElement
            if (downloadButton) {
              downloadButton.click()
            }
          },
        })
      })
  }

  // Download and merge audio and video files using ffmpeg.wasm
  async function downloadFiles() {
    // Fetching files. ffmpeg doesn't provide progress for fetchFile so we do it manually
    MainStore.setState({ mergeProgress: 0, mergeOperation: "Downloading" })
    const videoFile = await fetchFile(videoUrl)
    MainStore.setState({ mergeProgress: 25 })
    const audioFile = await fetchFile(audioUrl)
    const transcriptFile = await fetchFile(transcriptUrl)
    let videoSecondaryFile: Uint8Array | null = null
    MainStore.setState({ mergeProgress: 50 })
    if (videoUrlSecondary) {
      videoSecondaryFile = await fetchFile(videoUrlSecondary)
      MainStore.setState({ mergeProgress: 100 })
    }
    MainStore.setState({ mergeProgress: 100 })

    const video = await ffmpeg.writeFile("video.mp4", videoFile)
    const audio = await ffmpeg.writeFile("audio.mp4", audioFile)
    const transcript = await ffmpeg.writeFile("transcript.vtt", transcriptFile)

    if (!video || !audio || !transcript) {
      setError(
        "Failed to download files. Try again or kindly contact the developer."
      )
      setClicked(false)
      return
    }

    let code: number
    if (videoUrlSecondary) {
      await ffmpeg.writeFile("videoSecondary.mp4", videoSecondaryFile)
      // ffmpeg -i video.mp4 -i videoSecondary.mp4 -i audio.mp4 -i transcript.vtt -map 0 -map 1 -map 2 -map 3 -c copy -c:s mov_text -disposition:0 default -disposition:1 0 output.mp4
      code = await ffmpeg.exec([
        "-i",
        "video.mp4",
        "-i",
        "videoSecondary.mp4",
        "-i",
        "audio.mp4",
        "-i",
        "transcript.vtt",
        "-map",
        "0",
        "-map",
        "1",
        "-map",
        "2",
        "-map",
        "3",
        "-c",
        "copy",
        "-c:s",
        "mov_text",
        "-disposition:0",
        "default",
        "-disposition:1",
        "0",
        "output.mp4",
      ])
    } else {
      // ffmpeg -i video.mp4 -i audio.mp4 -i transcript.vtt -c copy -c:s mov_text -disposition:s:0 default output.mp4
      code = await ffmpeg.exec([
        "-i",
        "video.mp4",
        "-i",
        "audio.mp4",
        "-i",
        "transcript.vtt",
        "-c",
        "copy",
        "-c:s",
        "mov_text",
        "-disposition:s:0",
        "default",
        "output.mp4",
      ])
    }

    if (code !== 0) {
      setError(
        "Failed to merge files. Try again or kindly contact the developer."
      )
      setClicked(false)
      return
    }

    const fileData = await ffmpeg.readFile("output.mp4")
    const data = new Uint8Array(fileData as unknown as ArrayBuffer)
    const mergedUrl = URL.createObjectURL(
      new Blob([data.buffer], { type: "video/mp4" })
    )
    setUrl(mergedUrl)
    setClicked(false)

    // download the file automatically using a fake anchor element
    const a = document.createElement("a")
    a.hidden = true
    a.href = mergedUrl
    a.download = title + ".mp4"
    a.click()
  }

  // Initializing extension
  useEffect(() => {
    async function initExtension() {
      const [tab] = await chrome.tabs?.query({ active: true })
      if (tab.url?.match("https://*.echo360.*/")) {
        setRightPage(true)
        MainStore.setState({ title: tab.title!.replace(/\W/g, "_") })
        setNameOfFile(tab.title!)
      }
    }
    initExtension()
  }, [])

  // Download files when audio and video urls are ready
  useEffect(() => {
    if (clicked && audioUrl && videoUrl && transcriptUrl) {
      downloadFiles()
    }
  }, [audioUrl, videoUrl, videoUrlSecondary, transcriptUrl])

  /**
   * User is on the wrong page
   */
  if (!rightPage) {
    return (
      <div className="flex flex-col gap-4 p-4 justify-center items-center">
        <h1 className="text-2xl font-bold text-red-400">Wrong page</h1>
        <h1 className="text-lg">
          Go to a specific video on Echo360. Then click on the extension.
        </h1>
      </div>
    )
  }

  /**
   * User has successfully downloaded the video
   */
  if (url) {
    return (
      <div className="flex flex-col gap-4 p-4 justify-center items-center">
        <h1 className="text-2xl font-bold">Successfully Downloaded!</h1>
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
  }

  return (
    <div className="flex flex-col gap-4 p-4 justify-center items-center relative">
      {(clicked || mergeProgress > 0) && (
        <div className="absolute w-full h-full bg-[#242424e8] text-lg left-0 top-0 flex flex-col items-center justify-center">
          <h1 className="text-xl text-red-400">Do not close the extension!</h1>
          <h1 className="text-sm">
            {mergeOperation}: {mergeProgress}%
          </h1>
        </div>
      )}
      <h1 className="text-2xl font-bold">Echo360 Downloader</h1>
      <h2 className="text-lg">{nameOfFile}</h2>
      {error && <h2 className="text-red-500">{error}</h2>}
      <div className="flex gap-4">
        <button
          className="border-2 py-2 px-4 rounded-lg hover:bg-zinc-600 transition text-center disabled:cursor-not-allowed disabled:bg-zinc-600"
          onClick={initDownload}
          disabled={clicked}
        >
          {!clicked ? "Download" : "Downloading..."}
        </button>
      </div>
    </div>
  )
}
