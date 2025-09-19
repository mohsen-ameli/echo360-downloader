# Live extension link for Chrome store

https://chromewebstore.google.com/detail/echo360-downloader/ohbjdbfndaclncngjieknnehhecdfhci

# Usage

A browser extension to easily download videos/lectures from echo360 website.
The way it works is the extension downloads the appropriate audio and video files from the current
page the user is on using FFmpeg.

# Developing

First run `npm i`
Run `npm run dev` to develop normally but if you want to use the extension
and check made changes on echo360 website, you must run `npm run build`.
This will build a `dist` folder in the root of the project.
After this go to Chrome extensions and click on `load unpacked`, then select `dist`.

You only have to do this once. For subsequent changes you just run `npm run build`
and open your extension (no need to reload anything).

For uploading a new version run `npm run build-zip` then upload the generated zip
inside release folder.

# Notes

This project is made possible using the ffmpeg tool in Web Assembly: https://github.com/ffmpegwasm/ffmpeg.wasm

The ffmpeg scripts are from here: https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm

Interesting article: https://stackoverflow.com/questions/48268720/ffmpeg-commands-in-javascript
