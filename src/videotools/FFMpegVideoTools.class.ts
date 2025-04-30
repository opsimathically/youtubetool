/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { DirMap, file_info_t } from '@opsimathically/dirmap';
import { runShellScript } from '@src/utils/utils';
import * as fs from 'fs';
import * as fs_promises from 'fs/promises';
import path from 'path';

class FFMpegVideoTools {
  constructor() {}

  async getVideoDuration(params: { input_file: string }) {
    let resolved_path: string | null = null;
    try {
      resolved_path = path.resolve(params.input_file);
    } catch (err) {}

    if (!resolved_path) return null;
    if (!fs.existsSync(resolved_path)) return null;

    const shell_data = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${resolved_path}"`;

    const ret_info = await runShellScript(shell_data);

    if (typeof ret_info?.stdout === 'string') {
      const duration_data = parseFloat(ret_info?.stdout);
      if (isNaN(duration_data))
        throw new Error('Invalid format after cleanup.');
      return Math.round(duration_data);
    }
    return null;
  }

  async getVideoChunkCount(params: {
    input_file: string;
    chunk_desired_duration: number;
  }) {
    const ffmpeg_ref = this;

    const video_duration = await ffmpeg_ref.getVideoDuration({
      input_file: params.input_file
    });

    if (!video_duration) return null;

    const chunk_count =
      (video_duration + params.chunk_desired_duration - 1) /
      params.chunk_desired_duration;

    if (Math.ceil(chunk_count) > Math.floor(chunk_count))
      return Math.ceil(chunk_count);

    // return the chunk count
    return chunk_count;
  }

  async splitVideoIntoChunks(params: {
    input_file: string;
    output_dir: string;
    chunk_duration_secs: number;
  }) {
    const ffmpeg_ref = this;

    const video_duration = await ffmpeg_ref.getVideoDuration({
      input_file: params.input_file
    });
    const chunk_count = await ffmpeg_ref.getVideoChunkCount({
      input_file: params.input_file,
      chunk_desired_duration: params.chunk_duration_secs
    });
    if (!chunk_count) return null;

    for (let i = 0; i < chunk_count; i++) {
      const start = i * params.chunk_duration_secs;

      const file_padded_chunk_number = i.toString().padStart(7, '0');
      const output_file = path.join(
        params.output_dir,
        `${file_padded_chunk_number}__chunk.mp4`
      );

      const command = `ffmpeg -y -ss "${start}" -i "${params.input_file}" -t "${params.chunk_duration_secs}" -c copy "${output_file}"`;

      console.log(command);
      await runShellScript(command);
    }
  }

  async addTitleCardToFileChunks(params: {
    chunk_dir: string;
    title_card_png: string;
  }) {
    const ffmpeg_ref = this;

    const dirmap = new DirMap();

    if (!fs.existsSync(params.title_card_png)) return false;
    const found_chunks_array = [];
    await dirmap.run({
      base_dir: params.chunk_dir,
      onfoundcb: async function (this: DirMap, file_info: file_info_t) {
        if (file_info.absolute_path.endsWith('__chunk.mp4') === true) {
          const [chunk_number] = file_info.name.split('__');
          found_chunks_array.push(file_info.absolute_path);
          const out_filename = path.join(
            file_info.base_path,
            `${chunk_number}__with_titlecard.mp4`
          );
          const command = `ffmpeg -y -loop 1 -framerate 30 -t 2 -i "${params.title_card_png}" -i "${file_info.absolute_path}" -filter_complex "[0:v]scale=1280:720,setsar=1,format=yuv420p[v0]; [v0][1:v]concat=n=2:v=1:a=0[outv]" -map "[outv]" -map 1:a -c:v libx264 -c:a copy -vsync 2 "${out_filename}"`;
          console.log(command);
          await runShellScript(command);
        }
        return false;
      }
    });
  }
}

export default FFMpegVideoTools;
