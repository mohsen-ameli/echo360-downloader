import { useEffect, useState } from "react"
import { MainStore } from "./store"
import { Link, useNavigate } from "react-router-dom"

export default function App() {
  const { audioUrl, videoUrl, title } = MainStore()
  const [rightPage, setRightPage] = useState(false)
  const [clicked, setClicked] = useState(false)
  const nav = useNavigate()

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

  // Initilizing extension
  useEffect(() => {
    async function initExtension() {
      const [tab] = await chrome.tabs?.query({ active: true })
      if (tab.url.includes("echo360")) {
        setRightPage(true)
        MainStore.setState({ title: tab.title!.replace(/\W/g, "_") })
      }
    }
    initExtension()
  }, [])

  // Download files when audio and video urls are ready
  useEffect(() => {
    if (audioUrl && videoUrl && title) {
      chrome.downloads.download({
        url: videoUrl,
        filename: "video__" + title + ".mp4",
      })
      chrome.downloads.download({
        url: audioUrl,
        filename: "audio__" + title + ".mp4",
      })
      nav("/merge", { replace: true })
    }
  }, [audioUrl, videoUrl])

  const [popupOpened, setPopupOpened] = useState(
    localStorage.getItem("echo360popup") === null ? false : true
  )

  useEffect(() => {
    if (localStorage.getItem("echo360popup")) {
      nav("/merge", { replace: true })
    }
  }, [])

  const handleOpenPopup = async () => {
    localStorage.setItem("echo360popup", "1")
    window.open(
      window.location.origin + "/index.html",
      "Echo360Popup",
      "width=400,height=300"
    )
    setPopupOpened(true)
    setInterval(() => {
      localStorage.removeItem("echo360popup")
      window.close()
    }, 100)
  }

  if (!rightPage) {
    return (
      <div className="flex flex-col gap-4 p-4 justify-center items-center">
        <h1 className="text-2xl font-bold text-red-400">Wrong page</h1>
        <h1 className="text-lg">
          Go to a specific lesson on Echo360. Then click the extension.
        </h1>
        <p>
          If you already have a video and audio file to merge, click popup then
          merge.
        </p>
        {!popupOpened && (
          <button
            className="border-2 py-2 px-4 rounded-lg hover:bg-zinc-600 transition text-center"
            onClick={handleOpenPopup}
          >
            Open Popup
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 justify-center items-center">
      <p>
        Click on "Download" to start downloading this lecture. <br />
        Click on "Merge Files" to merge any audio and video files.
      </p>
      <div className="flex gap-4">
        {!clicked && (
          <Link
            className="border-2 py-2 px-4 rounded-lg hover:bg-zinc-600 transition text-center"
            to="/merge"
          >
            Merge Files
          </Link>
        )}
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
