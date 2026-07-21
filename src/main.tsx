import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App.tsx"
import "./index.css"
import { UrlStore } from "./store.ts"
import LoadFFmpeg from "./LoadFFmpeg.tsx"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <div className="bg-[#242424] w-[400px] font-[3.2rem] h-screen text-white">
      <App />
      <LoadFFmpeg />
    </div>
  </React.StrictMode>
)

type ResourceProbe = {
  url: string
  exists: boolean
  sizeGb: number | null
}

async function getResource(url: string): Promise<ResourceProbe> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      credentials: "include",
      cache: "no-store",
    })
    const contentLength = Number(response.headers.get("content-length"))
    return {
      url,
      exists: response.ok,
      sizeGb: Number.isFinite(contentLength) && contentLength > 0 ? contentLength / 10 ** 9 : null,
    }
  } catch {
    return { url, exists: false, sizeGb: null }
  }
}

let transcriptChecks = [false, false] // [vtt, transcript]
let urlsFound = false
async function populateUrls(url: string) {
  const { transcriptUrl } = UrlStore.getState()

  // Downloading transcript file
  if (url.includes("vtt") && !transcriptUrl && !transcriptChecks[0]) {
    transcriptChecks[0] = true
    const { exists } = await getResource(url)
    if (exists) {
      UrlStore.setState({ transcriptUrl: url })
    }
  } else if (url.includes("transcript") && !transcriptUrl && !transcriptChecks[1]) {
    transcriptChecks[1] = true
    const { exists } = await getResource(url)
    if (exists) {
      UrlStore.setState({ transcriptUrl: url + "-file?format=vtt" })
    }
  }

  const mediaType1 = url.match("s\[0-2]\q\[0-1]\.m3u8")
  const mediaType2 = url.match("(hd\[1-2]\|sd\[1-2]\).mp4")

  if (!mediaType1 && !mediaType2) return
  if (urlsFound) return

  let stream1SD: ResourceProbe | null = null
  let stream1HD: ResourceProbe | null = null
  let stream2SD: ResourceProbe | null = null
  let stream2HD: ResourceProbe | null = null

  if (mediaType1) {
    urlsFound = true

    // Echo360 uses mp4 or m4s extensions for their media files.
    let extension = "mp4"
    const test = url.replace("m3u8", extension)
    const { exists } = await getResource(test)
    if (!exists) {
      extension = "m4s"
    }

    // These are the file names for different streams of audio/video
    // s0q0 -> audio stream with SD quality
    // s0q1 -> audio stream with HD quality (if available)
    // s1q0 -> First video with SD quality
    // s1q1 -> First video with HD quality
    // s2q0 -> Secondary video (if available) with SD quality
    // s2q1 -> Secondary video (if available) with HD quality
    const s0q0Url = url.replace(mediaType1[0], `s0q0.${extension}`)
    const s0q1Url = url.replace(mediaType1[0], `s0q1.${extension}`)
    const s1q0Url = url.replace(mediaType1[0], `s1q0.${extension}`)
    const s1q1Url = url.replace(mediaType1[0], `s1q1.${extension}`)
    const s2q0Url = url.replace(mediaType1[0], `s2q0.${extension}`)
    const s2q1Url = url.replace(mediaType1[0], `s2q1.${extension}`)

    const [s0q0, s0q1, s1q0, s1q1, s2q0, s2q1] = await Promise.all([
      getResource(s0q0Url),
      getResource(s0q1Url),
      getResource(s1q0Url),
      getResource(s1q1Url),
      getResource(s2q0Url),
      getResource(s2q1Url),
    ])

    if (!s0q0.exists && s0q1.exists) {
      // SD audio not available, downloading HD
      UrlStore.setState({ audioUrl: s0q1Url })
    } else if (s0q0.exists) {
      // Downloading SD audio
      UrlStore.setState({ audioUrl: s0q0Url })
    }

    stream1SD = s1q0
    stream1HD = s1q1
    stream2SD = s2q0
    stream2HD = s2q1
  } else if (mediaType2) {
    urlsFound = true

    // Echo360 uses mp4 or m4s extensions for their media files.
    let extension = ""
    const { exists } = await getResource(url)
    if (exists) {
      extension = "mp4"
    } else {
      const { exists } = await getResource(url.replace("mp4", "m4s"))
      if (exists) {
        extension = "m4s"
      }
    }

    // These are the file names for different streams of audio/video
    // sd1 -> First video including audio with SD quality
    // hd1 -> First video including audio with HD quality
    // sd2 -> Secondary video including audio (if available) with SD quality
    // hd2 -> Secondary video including audio (if available) with HD quality

    const sd1Url = url.replace(mediaType2[0], `sd1.${extension}`)
    const hd1Url = url.replace(mediaType2[0], `hd1.${extension}`)
    const sd2Url = url.replace(mediaType2[0], `sd2.${extension}`)
    const hd2Url = url.replace(mediaType2[0], `hd2.${extension}`)

    const [sd1, hd1, sd2, hd2] = await Promise.all([
      getResource(sd1Url),
      getResource(hd1Url),
      getResource(sd2Url),
      getResource(hd2Url),
    ])

    stream1SD = sd1
    stream1HD = hd1
    stream2SD = sd2
    stream2HD = hd2
  }

  if (!stream2SD?.exists && !stream2HD?.exists) {
    // No secondary video available
    if (!stream1HD?.exists || (stream1HD?.sizeGb !== null && stream1HD?.sizeGb > 1.9)) {
      // HD quality is too large. ffmpeg memory buffer limit is 2GB
      // Downloading SD
      if (stream1SD?.exists)
        UrlStore.setState({ videoUrl: stream1SD?.url, videoUrlSecondary: null })
    } else if (stream1HD?.exists) {
      // Downloading HD
      UrlStore.setState({ videoUrl: stream1HD?.url, videoUrlSecondary: null })
    }
  } else {
    // Secondary video is available
    if (!stream1HD?.exists || (stream1HD?.sizeGb !== null && stream1HD?.sizeGb > 1)) {
      // HD quality is too large. ffmpeg memory buffer limit is 2GB (1GB for each video stream)
      // Downloading SD
      if (!stream2HD?.exists || (stream2HD?.sizeGb !== null && stream2HD?.sizeGb > 1)) {
        // Secondary HD too large
        if (stream1SD?.exists && stream2SD?.exists) {
          UrlStore.setState({ videoUrl: stream1SD?.url, videoUrlSecondary: stream2SD.url })
        }
      } else {
        UrlStore.setState({ videoUrl: stream1SD?.url, videoUrlSecondary: stream2HD?.url })
      }
    } else {
      // Downloading HD
      if (!stream2HD?.exists || (stream2HD?.sizeGb !== null && stream2HD?.sizeGb > 1)) {
        // Secondary video HD too large
        if (stream2SD?.exists) {
          UrlStore.setState({ videoUrl: stream1HD?.url, videoUrlSecondary: stream2SD.url })
        }
      } else {
        UrlStore.setState({ videoUrl: stream1HD?.url, videoUrlSecondary: stream2HD.url })
      }
    }
  }

  UrlStore.setState({ loading: false })
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
