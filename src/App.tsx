import { useEffect } from "react"
import "./App.css"
import { MainStore } from "./store"

export default function App() {
  const { audioUrl, progress, videoUrl, title } = MainStore()

  async function onClick() {
    const [tab] = await chrome.tabs.query({ active: true })
    chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      func: () => {
        location.reload()
      },
    })

    // print the current tab's title
    MainStore.setState({ title: tab.title!.replace(/\W/g, "_") })
  }

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

  return (
    <>
      <h3>Click the button below in to download the video :D</h3>
      <button onClick={onClick}>Download</button>
      {progress && <p>{progress}</p>}
    </>
  )
}
