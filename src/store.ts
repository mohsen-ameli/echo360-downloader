import { create } from "zustand"

type storeType = {
  videoUrl: string
  audioUrl: string
  progress: string
  title: string
}

export const MainStore = create<storeType>(set => ({
  videoUrl: "",
  audioUrl: "",
  progress: "",
  title: "",
}))
