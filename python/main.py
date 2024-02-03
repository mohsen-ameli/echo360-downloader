import requests
from ffmpeg import FFmpeg
import os

def main():
    url_audio = ""
    url_video = ""
    cookies = {
        "CloudFront-Signature": "",
        "ECHO_JWT": "",
        "PLAY_SESSION": "",
        "CloudFront-Key-Pair-Id": "",
        "CloudFront-Tracking2": "",
        "CloudFront-Policy": ""
    }

    audio = requests.get(url_audio, cookies=cookies)
    video = requests.get(url_video, cookies=cookies)

    with open("audio.mp4", mode="wb") as file:
        file.write(audio.content)
    with open("video.mp4", mode="wb") as file:
        file.write(video.content)

    FFmpeg().option("i", "audio.mp4").option("i", "video.mp4").option("c", "copy").output("output.mp4").execute()

    os.remove("audio.mp4")
    os.remove("video.mp4")

main()
