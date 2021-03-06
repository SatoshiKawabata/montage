import React from "react";
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";
import { useState } from "react";
const messageMap = new Map<string, string[]>();
const ffmpeg = createFFmpeg({
  logger: (msg) => {
    const { message, type } = msg;
    if (!messageMap.has(type)) {
      messageMap.set(type, []);
    }
    messageMap.get(type)?.push(message);
    console.log("log", msg);
  },
  progress: (progress) => {
    console.log("progress", progress);
  },
});

export const Montage = () => {
  const [src, setSrc] = useState("");

  return (
    <>
      <h1>複数のビデオを連結して一つのビデオを作成するサンプル</h1>
      {src && <video style={{ width: "100vw" }} src={src} controls></video>}
      <input
        type="file"
        multiple
        accept="video/*"
        onChange={async (e) => {
          const { files } = e.target;
          if (!files) {
            return;
          }

          await ffmpeg.load();
          let text = "";
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!file) {
              continue;
            }
            const { name } = file;
            // transcode
            const fetchedFile = await fetchFile(file);
            ffmpeg.FS("writeFile", name, fetchedFile);
            const fileName = `convert_${i}.mp4`;
            await ffmpeg.run("-i", name, fileName);
            // text for list file
            text += `file '${fileName}'\n`;
          }

          ffmpeg.FS("writeFile", "list.txt", new TextEncoder().encode(text));
          await ffmpeg.run(
            "-f",
            "concat",
            "-i",
            "list.txt",
            "-vcodec",
            "libx264",
            // "-c","copy", // 再エンコードせずにコーデックをそのまま使う
            "result.mp4"
          );

          const data = ffmpeg.FS("readFile", "result.mp4");
          setSrc(
            URL.createObjectURL(new Blob([data.buffer], { type: "video/mp4" }))
          );
        }}
      />
      <button
        type="button"
        onClick={() => {
          console.log("messageMap", messageMap);
        }}
      >
        log messageMap
      </button>
    </>
  );
};
