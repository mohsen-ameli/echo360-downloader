import { useEffect, useState } from "react"
import "./App.css"
import { MainStore } from "./store"

export default function App() {
  const { audioUrl, progress, videoUrl, title } = MainStore()
  const [rightPage, setRightPage] = useState(false)

  async function download() {
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
      if (tab.url.includes("echo360.ca")) {
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
    }
  }, [audioUrl, videoUrl])

  if (!rightPage) {
    return (
      <div>
        <h1>Wrong page</h1>
        <p>Go to Echo360 and click the extension</p>
      </div>
    )
  }

  return (
    <>
      <h3>
        Click the button below in to download the video and audio files :D
      </h3>
      <button onClick={download}>Download</button>
      {progress && <p>{progress}</p>}
    </>
  )
}
