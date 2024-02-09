import { useEffect, useState } from "react"
import { MainStore } from "./store"
import { useNavigate } from "react-router-dom"

export default function App() {
  const { audioUrl, videoUrl, title } = MainStore()
  const [rightPage, setRightPage] = useState(false)
  const [clicked, setClicked] = useState(false)
  const nav = useNavigate()

  async function download() {
    setClicked(true)
    const [tab] = await chrome.tabs.query({ active: true })
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
      const [tab] = await chrome.tabs.query({ active: true })
      if (tab.url.includes("echo360.ca/lesson")) {
        setRightPage(true)
        MainStore.setState({ title: tab.title!.replace(/\W/g, "_") })
      }
    }
    initExtension()
  }, [])

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

  if (!rightPage) {
    return (
      <div className="flex flex-col gap-4 p-4 justify-center items-center">
        <h1 className="text-lg">Wrong page</h1>
        <p>Go to a specific lesson on Echo360. Then click the extension</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 justify-center items-center">
      <h3>
        Click the button below in to download the video and audio files :D
      </h3>
      <button
        className="border-2 py-2 px-4 rounded-lg hover:bg-zinc-600 transition text-center"
        onClick={download}
        disabled={clicked}
      >
        {!clicked ? "Download" : "Do not close the extension!"}
      </button>
    </div>
  )
}
