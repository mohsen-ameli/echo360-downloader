import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App.tsx"
import "./index.css"
import { MainStore } from "./store.ts"
import LoadFFmpeg from "./LoadFFmpeg.tsx"
import axios from "axios"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <div className="bg-[#242424] w-[400px] font-[3.2rem] h-screen text-white">
      <App />
      <LoadFFmpeg />
    </div>
  </React.StrictMode>
)

export function webRequest(details: chrome.webRequest.WebRequestBodyDetails) {
  const { audioUrl, videoUrl, transcriptUrl } = MainStore.getState()
  if (audioUrl && videoUrl && transcriptUrl) {
    chrome.webRequest.onBeforeRequest.removeListener(webRequest)
  }

  if (details.url.includes("vtt")) {
    MainStore.setState({ transcriptUrl: details.url })
  } else if (details.url.includes("transcript") && !transcriptUrl) {
    MainStore.setState({ transcriptUrl: details.url + "-file?format=vtt" })
  }

  // Needed to filter out other non-useful media
  if (!details.url.includes(".m4s") && !details.url.includes(".mp4")) {
    return
  }

  if (details.url.includes("s1q1")) {
    // s0q0 -> audio
    // s1q1 -> First video with best quality
    // s2q1 -> Secondary video (if available) with best quality

    const videoUrlSecondary = details.url.replace("s1q1", "s2q1")
    const audioUrl = details.url.replace("s1q1", "s0q0")
    // send a head request to check if the url exists
    try {
      axios
        .head(videoUrlSecondary)
        .then(response => {
          if (response.status === 200) {
            MainStore.setState({
              audioUrl,
              videoUrl: details.url,
              videoUrlSecondary,
            })
          } else {
            MainStore.setState({ audioUrl, videoUrl: details.url })
          }
        })
        .catch(() => {
          MainStore.setState({ audioUrl, videoUrl: details.url })
        })
    } catch (error) {
      MainStore.setState({ audioUrl, videoUrl: details.url })
    }
  }
}

chrome.webRequest.onBeforeRequest.addListener(webRequest, {
  urls: [
    "*://*.echo360.ca/*",
    "*://*.echo360.com/*",
    "*://*.echo360.org/*",
    "*://*.echo360.net.au/*",
    "*://*.echo360.org.uk/*",
  ],
})
