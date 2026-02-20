import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App.tsx"
import "./index.css"
import { UrlStore } from "./store.ts"
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

async function getSize(url: string) {
  try {
    const response = await axios.head(url)
    const contentLength = response.headers["content-length"]
    if (contentLength) {
      return parseInt(contentLength) / 10 ** 9
    } else {
      return null
    }
  } catch (error) {
    return null
  }
}

async function populateUrls(url: string) {
  const { transcriptUrl } = UrlStore.getState()

  // Downloading transcript file
  if (url.includes("vtt")) {
    UrlStore.setState({ transcriptUrl: url })
  } else if (url.includes("transcript") && !transcriptUrl) {
    UrlStore.setState({ transcriptUrl: url + "-file?format=vtt" })
  }

  const media = url.match("s\.q\..m3u8")

  if (!media) return

  // Echo360 uses mp4 or m4s extensions for their media files.
  let extension = "mp4"
  const test = url.replace("m3u8", extension)
  const size = await getSize(test)
  if (size == null) {
    extension = "m4s"
  }

  // These are the file names for different streams of audio/video
  // s0q0 -> audio stream with SD quality
  // s0q1 -> audio stream with HD quality (if available)
  // s1q0 -> First video with SD quality
  // s1q1 -> First video with HD quality
  // s2q0 -> Secondary video (if available) with SD quality
  // s2q1 -> Secondary video (if available) with HD quality
  const s0q0 = url.replace(media[0], `s0q0.${extension}`)
  const s0q1 = url.replace(media[0], `s0q1.${extension}`)
  const s1q0 = url.replace(media[0], `s1q0.${extension}`)
  const s1q1 = url.replace(media[0], `s1q1.${extension}`)
  const s2q0 = url.replace(media[0], `s2q0.${extension}`)
  const s2q1 = url.replace(media[0], `s2q1.${extension}`)

  const s0q0size = await getSize(s0q0)
  if (s0q0size == null) {
    // SD audio not available, downloading HD
    UrlStore.setState({ audioUrl: s0q1 })
  } else {
    // Downloading SD audio
    UrlStore.setState({ audioUrl: s0q0 })
  }

  const s2q1size = await getSize(s2q1)

  if (s2q1size == null) {
    const s1q1size = await getSize(s1q1)
    // No secondary video available
    if (s1q1size > 1.9) {
      // HD quality is too large. ffmpeg memory buffer limit is 2GB
      // Downloading SD
      UrlStore.setState({ videoUrl: s1q0, videoUrlSecondary: null })
    } else {
      // Downloading HD
      UrlStore.setState({ videoUrl: s1q1, videoUrlSecondary: null })
    }
  } else {
    const s1q1size = await getSize(s1q1)
    // Secondary video is available
    if (s1q1size > 1) {
      // HD quality is too large. ffmpeg memory buffer limit is 2GB
      // Downloading SD
      if (s2q1size > 1) {
        // Secondary HD too large
        UrlStore.setState({ videoUrl: s1q0, videoUrlSecondary: s2q0 })
      } else {
        UrlStore.setState({ videoUrl: s1q0, videoUrlSecondary: s2q1 })
      }
    } else {
      // Downloading HD
      if (s2q1size > 1) {
        // Secondary video HD too large
        UrlStore.setState({ videoUrl: s1q1, videoUrlSecondary: s2q0 })
      } else {
        UrlStore.setState({ videoUrl: s1q1, videoUrlSecondary: s2q1 })
      }
    }
  }
}

function webRequest(details: chrome.webRequest.WebRequestBodyDetails) {
  const { audioUrl, videoUrl, transcriptUrl } = UrlStore.getState()
  if (audioUrl && videoUrl && transcriptUrl) {
    chrome.webRequest.onBeforeRequest.removeListener(webRequest)
  }

  populateUrls(details.url)
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
