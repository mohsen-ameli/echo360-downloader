import { FFmpeg } from "@ffmpeg/ffmpeg"
import { toBlobURL } from "@ffmpeg/util"
import { create } from "zustand"

type storeType = {
  videoUrl: string | null
  videoUrlSecondary: string | null
  audioUrl: string | null
  transcriptUrl: string | null
  mergeOperation: "Downloading" | "Merging"
  mergeProgress: number
  title: string
  ffmpeg: FFmpeg
  ffmpegLoaded: boolean
  load: () => void
}

export const MainStore = create<storeType>((set, get) => ({
  videoUrl: null,
  videoUrlSecondary: null,
  audioUrl: null,
  transcriptUrl: null,
  mergeOperation: "Downloading",
  mergeProgress: 0,
  title: "",
  ffmpegLoaded: false,
  ffmpeg: new FFmpeg(),
  load: async () => {
    const ffmpeg = get().ffmpeg

    // This is the progress for when ffmpeg is doing stuff (not including loading)
    ffmpeg.on("progress", ({ progress }) => {
      set({
        mergeProgress: Math.round(progress * 100),
        mergeOperation: "Merging",
      })
    })

    let config = {}
    if (import.meta.env.MODE === "development") {
      config = {
        coreURL: await toBlobURL("/ffmpeg-core.js", "text/javascript"),
        wasmURL: await toBlobURL("/ffmpeg-core.wasm", "application/wasm"),
        workerURL: await toBlobURL("/ffmpeg-core.worker.js", "text/javascript"),
      }
    } else {
      config = {
        coreURL: "/ffmpeg-core.js",
        wasmURL: "/ffmpeg-core.wasm",
        workerURL: "/ffmpeg-core.worker.js",
      }
    }
    await ffmpeg.load(config)
    set({ ffmpegLoaded: true })
  },
}))
