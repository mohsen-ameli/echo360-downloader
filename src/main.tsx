import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App.tsx"
import "./index.css"
import { MainStore } from "./store.ts"
import MergePage from "./merge.tsx"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import LoadFFmpeg from "./LoadFFmpeg.tsx"

const router = createMemoryRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "merge",
    element: <MergePage />,
  },
])

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <div className="bg-[#242424] min-w-[320px] font-[3.2rem] h-fit text-white">
      <RouterProvider router={router} />
      <LoadFFmpeg />
    </div>
  </React.StrictMode>
)

function webRequest(details: chrome.webRequest.WebRequestBodyDetails) {
  if (details.url.includes("m4s")) {
    // s1q1 -> full quality video
    // s0q0 -> audio
    const url = details.url.toString()
    const format = url.split(".m4s")[0].split("/").at(-1)
    const videoUrl = url.replace(format, "s1q1")
    const audioUrl = url.replace(format, "s0q0")

    MainStore.setState({ audioUrl, videoUrl })

    chrome.webRequest.onBeforeRequest.removeListener(webRequest)
  }
}

chrome.webRequest.onBeforeRequest.addListener(webRequest, {
  urls: ["<all_urls>"],
})
