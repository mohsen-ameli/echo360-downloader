import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App.tsx"
import "./index.css"
import { MainStore } from "./store.ts"
import LoadFFmpeg from "./LoadFFmpeg.tsx"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <div className="bg-[#242424] w-[400px] font-[3.2rem] h-screen text-white">
      <App />
      <LoadFFmpeg />
    </div>
  </React.StrictMode>
)

function webRequest(details: chrome.webRequest.WebRequestBodyDetails) {
  let ext = ""
  if (details.url.includes(".m4s")) {
    ext = ".m4s"
  } else if (details.url.includes(".mp4")) {
    ext = ".mp4"
  } else {
    return
  }

  // s1q1 -> full quality video
  const videoUrl = details.url.replace(
    details.url.split(ext)[0].split("/").at(-1),
    "s1q1"
  )

  // s0q0 -> audio
  const audioUrl = details.url.replace(
    details.url.split(ext)[0].split("/").at(-1),
    "s0q0"
  )

  // Transcript URL
  const xLid = details.url.split("x-lid=")[1].split("&")[0]
  const xMid = details.url.split("x-mid=")[1].split("&")[0]
  const transcriptUrl = `https://echo360.ca/api/ui/echoplayer/lessons/${xLid}/medias/${xMid}/transcript-file?format=vtt`

  MainStore.setState({ audioUrl, videoUrl, transcriptUrl })

  https: chrome.webRequest.onBeforeRequest.removeListener(webRequest)
}

chrome.webRequest.onBeforeRequest.addListener(webRequest, {
  urls: ["*://*.echo360.ca/*", "*://*.echo360.com/*"],
})
