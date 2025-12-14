import { FFmpeg } from "@ffmpeg/ffmpeg"
import { toBlobURL } from "@ffmpeg/util"
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

type storeType = {
  mergeOperation: "Downloading" | "Merging"
  mergeProgress: number
  ffmpeg: FFmpeg
  ffmpegLoaded: boolean
  load: () => void
}

type UrlStore = {
  videoUrl: string | null
  videoUrlSecondary: string | null
  audioUrl: string | null
  transcriptUrl: string | null
  title: string | null
}

export const UrlStore = create<UrlStore>()(
  persist(
    (set, get) => ({
      videoUrl: null,
      videoUrlSecondary: null,
      audioUrl: null,
      transcriptUrl: null,
      title: null,
    }),
    {
      name: "url-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
)

export const MainStore = create<storeType>((set, get) => ({
  mergeOperation: "Downloading",
  mergeProgress: 0,
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
