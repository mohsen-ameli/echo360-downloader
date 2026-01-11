import { useEffect, useState } from "react"
import { MainStore, UrlStore } from "./store"
import { fetchFile } from "@ffmpeg/util"

export default function App() {
  const { audioUrl, videoUrl, videoUrlSecondary, transcriptUrl, title } =
    UrlStore()
  const [rightPage, setRightPage] = useState(false)
  const [clicked, setClicked] = useState(false)
  const ffmpeg = MainStore(s => s.ffmpeg)
  const [url, setUrl] = useState<string>(null)
  const [nameOfFile, setNameOfFile] = useState<string>(null)
  const mergeProgress = MainStore(s => s.mergeProgress)
  const mergeOperation = MainStore(s => s.mergeOperation)
  const [error, setError] = useState<string>(null)

  // Reload the page to trigger content script (in main.tsx)
  // This will retrieve the audioUrl, videoUrl and other urls that are set
  async function reloadAndGetURLs() {
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
  async function downloadAllInOne() {
    if (!audioUrl || !videoUrl || !transcriptUrl) {
      return
    }

    setClicked(true)
    let videoFile: Uint8Array = null
    let audioFile: Uint8Array = null
    let transcriptFile: Uint8Array = null
    let videoSecondaryFile: Uint8Array = null
    try {
      // Fetching files. ffmpeg doesn't provide progress for fetchFile so we do it manually
      MainStore.setState({ mergeProgress: 0, mergeOperation: "Downloading" })
      videoFile = await fetchFile(videoUrl)
      MainStore.setState({ mergeProgress: 25 })
      audioFile = await fetchFile(audioUrl)
      transcriptFile = await fetchFile(transcriptUrl)
      MainStore.setState({ mergeProgress: 50 })
      if (videoUrlSecondary) {
        videoSecondaryFile = await fetchFile(videoUrlSecondary)
        MainStore.setState({ mergeProgress: 100 })
      }
      MainStore.setState({ mergeProgress: 100 })
    } catch (e) {
      setError(
        "Failed to download files. Try again or kindly contact the developer."
      )
      setClicked(false)
      return
    }

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
    try {
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
    } catch (e) {
      setError(
        "Failed to merge files. Try again or kindly contact the developer."
      )
      setClicked(false)
      return
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
    setError(null)
    MainStore.setState({ mergeProgress: 0 })

    // download the file automatically using a fake anchor element
    const a = document.createElement("a")
    a.hidden = true
    a.href = mergedUrl
    a.download = title + ".mp4"
    a.click()
  }

  // Download only one stream (video + audio + transcript)
  async function downloadStream(videoUrlToDownload: string, streamId: number) {
    if (!audioUrl || !videoUrlToDownload || !transcriptUrl) {
      return
    }

    setClicked(true)
    let videoFile: Uint8Array = null
    let audioFile: Uint8Array = null
    let transcriptFile: Uint8Array = null
    try {
      // Fetching files. ffmpeg doesn't provide progress for fetchFile so we do it manually
      MainStore.setState({ mergeProgress: 0, mergeOperation: "Downloading" })
      videoFile = await fetchFile(videoUrlToDownload)
      MainStore.setState({ mergeProgress: 25 })
      audioFile = await fetchFile(audioUrl)
      MainStore.setState({ mergeProgress: 50 })
      transcriptFile = await fetchFile(transcriptUrl)
      MainStore.setState({ mergeProgress: 100 })
    } catch (e) {
      setError(
        "Failed to download files. Try again or kindly contact the developer."
      )
      setClicked(false)
      return
    }

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
    try {
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
    } catch (e) {
      setError(
        "Failed to merge files. Try again or kindly contact the developer."
      )
      setClicked(false)
      return
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
    setError(null)
    MainStore.setState({ mergeProgress: 0 })

    // download the file automatically using a fake anchor element
    const a = document.createElement("a")
    a.hidden = true
    a.href = mergedUrl
    a.download = `${title}_stream${streamId}.mp4`
    a.click()
  }

  function getDate() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const day = String(now.getDate()).padStart(2, "0")
    const hours = String(now.getHours()).padStart(2, "0")
    const minutes = String(now.getMinutes()).padStart(2, "0")
    const seconds = String(now.getSeconds()).padStart(2, "0")
    return `${year}-${month}-${day}_${hours}:${minutes}:${seconds}`
  }

  // Initializing extension
  useEffect(() => {
    async function initExtension() {
      const [tab] = await chrome.tabs?.query({ active: true })
      if (tab.url?.match("https://*.echo360.*/")) {
        setRightPage(true)
        const title = tab.title!.replace(/\W/g, "_")
        setNameOfFile(tab.title! + "_" + getDate())
        if (tab.url === UrlStore.getState().url) {
          return
        }
        UrlStore.setState({
          videoUrl: null,
          videoUrlSecondary: null,
          audioUrl: null,
          transcriptUrl: null,
          title,
          url: tab.url,
        })
        reloadAndGetURLs()
      }
    }
    initExtension()
  }, [])

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

  return (
    <div className="flex flex-col gap-4 p-4 justify-center items-center relative">
      {!error && (clicked || mergeProgress > 0) && (
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
      {!videoUrl || !audioUrl || !transcriptUrl ? (
        <div className="absolute w-full h-full bg-[#242424e8] text-lg left-0 top-0 flex flex-col items-center justify-center">
          <h1 className="text-xl text-white">Loading...</h1>
        </div>
      ) : (
        <div className="flex flex-col w-full gap-4">
          {videoUrlSecondary && (
            <>
              <button
                className="border-2 py-2 px-4 rounded-lg hover:bg-zinc-600 transition text-center disabled:cursor-not-allowed disabled:bg-zinc-600"
                onClick={() => downloadStream(videoUrl, 1)}
                disabled={clicked}
              >
                {!clicked ? "Download Stream 1 Only" : "Downloading..."}
              </button>
              <button
                className="border-2 py-2 px-4 rounded-lg hover:bg-zinc-600 transition text-center disabled:cursor-not-allowed disabled:bg-zinc-600"
                onClick={() => downloadStream(videoUrlSecondary, 2)}
                disabled={clicked}
              >
                {!clicked ? "Download Stream 2 Only" : "Downloading..."}
              </button>
            </>
          )}
          <button
            className="border-2 py-2 px-4 rounded-lg hover:bg-zinc-600 transition text-center disabled:cursor-not-allowed disabled:bg-zinc-600"
            onClick={downloadAllInOne}
            disabled={clicked}
          >
            {!clicked
              ? videoUrlSecondary
                ? "Download All In One"
                : "Download"
              : "Downloading..."}
          </button>
        </div>
      )}
      <p className="text-xs text-zinc-400 mt-2">
        <b>Tip:</b> After downloading, you can use a media player like{" "}
        <a
          href="https://www.videolan.org/vlc/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-blue-400"
        >
          VLC
        </a>{" "}
        to:
        <ul className="list-disc ml-5">
          <li>
            Select subtitles (closed captions) from the <b>Subtitles</b> menu.
          </li>
          <li>
            Switch between video streams (if available) from the <b>Video</b>{" "}
            menu.
          </li>
        </ul>
        <span>
          All available subtitles and video streams are embedded in your
          downloaded file for easy access.
        </span>
      </p>
    </div>
  )
}
