/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-constant-condition */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-require-imports */

import YoutubeAPITokenGenerator from '@src/tokens/YoutubeAPITokenGenerator.class';
import YoutubeAPI from '@src/youtubeapi/YoutubeAPI.class';
import FFMpegVideoTools from '@src/videotools/FFMpegVideoTools.class';
import PngResizer from '@src/pngresizer/PngResizer.class';

import { read_json_file } from '@src/utils/utils';
import fs_promises from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert';
import path from 'node:path';

require('ts-node').register({
  transpileOnly: true,
  project: './tsconfig.json'
});

// %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
// %%% Test Definitions %%%%%%%%%%%%%%%%%%%%%%%
// %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
const test_config_file = '/home/tourist/youtubetoolconfigs/test.config.json';

const test_dir = '/home/tourist/Videos/book7_split_chunks/';
const test_output_chunks_dir =
  '/home/tourist/Videos/book7_split_chunks/chunks/';
const test_title_card = '/home/tourist/Videos/book7_split_chunks/titlecard.png';
const test_video_file = path.join(test_dir, 'recording.mkv');

(async function () {
  test('PngResizer test', async function () {
    // PngResizer;

    const inputPath = path.resolve(
      path.join(__dirname, 'test_image', 'TestLargerImage.png')
    );
    const outputPath = path.resolve(
      path.join(__dirname, 'test_image', 'TestAfterResizeImage.png')
    );

    const resizer = new PngResizer(inputPath, outputPath);
    await resizer.resizeUntilUnderTarget();
  });

  if (false)
    test('FFMpeg ', async function () {
      const ffmpeg = new FFMpegVideoTools();

      // get video duration
      const video_duration = await ffmpeg.getVideoDuration({
        input_file: test_video_file
      });

      assert(video_duration);

      const video_chunk_count = await ffmpeg.getVideoChunkCount({
        input_file: test_video_file,
        chunk_desired_duration: 900
      });

      await ffmpeg.splitVideoIntoChunks({
        input_file: test_video_file,
        chunk_duration_secs: 900,
        chunk_suffix: 'some_suffix',
        output_dir: test_output_chunks_dir
      });

      await ffmpeg.addTitleCardToFileChunks({
        chunk_dir: test_output_chunks_dir,
        chunk_suffix: 'some_suffix',
        title_card_png: test_title_card
      });
    });

  if (false) {
    test('Get video category list.', async function () {
      const parsed_config_file: Record<string, any> =
        await read_json_file(test_config_file);

      const parsed_tokens_file: Record<string, any> = await read_json_file(
        parsed_config_file.tokens_file
      );
      const ytra = new YoutubeAPI({
        config: parsed_config_file,
        tokens: parsed_tokens_file
      });

      const video_categories = await ytra.listVideoCategories();
      assert(video_categories?.length);
    });

    test('Create and delete a new playlist.', async function () {
      const parsed_config_file: Record<string, any> =
        await read_json_file(test_config_file);

      const parsed_tokens_file: Record<string, any> = await read_json_file(
        parsed_config_file.tokens_file
      );
      const ytra = new YoutubeAPI({
        config: parsed_config_file,
        tokens: parsed_tokens_file
      });

      let playlists = await ytra.listPlaylists({
        playlist_title_regexp: /Test Playlist From API/i
      });

      if (playlists?.[0]) {
        const playlist_deleted_ok = await ytra.deletePlaylist({
          playlist_id: playlists[0].id
        });

        console.log(`Deleted Playlist: ${playlist_deleted_ok}`);
        playlists = await ytra.listPlaylists({
          playlist_title_regexp: /Test Playlist From API/i
        });
        if (playlists?.[0]) {
          assert.fail('Playlist still exists after deletion?');
        }
      }

      const new_playlist_id = await ytra.createPlaylist({
        title: 'Test Playlist from API',
        description: 'Whatever!',
        privacyStatus: 'public'
      });

      if (!new_playlist_id) assert.fail('Could not create new playlist');

      await ytra.updatePlaylist({
        playlist_id: new_playlist_id,
        title: 'Test Update Playlist from API',
        description: 'Whatever else!',
        privacyStatus: 'private'
      });

      const deleted_ok = await ytra.deletePlaylist({
        playlist_id: new_playlist_id
      });

      if (!deleted_ok) assert.fail('Could not delete playlist.');
    });

    test('List videos.', async function () {
      const parsed_config_file: Record<string, any> =
        await read_json_file(test_config_file);

      const parsed_tokens_file: Record<string, any> = await read_json_file(
        parsed_config_file.tokens_file
      );
      const ytra = new YoutubeAPI({
        config: parsed_config_file,
        tokens: parsed_tokens_file
      });

      const video_list = await ytra.listVideos({
        title_match_regex: /with intro chunk/i
      });
    });

    test('Get playlists.', async function () {
      const parsed_config_file: Record<string, any> =
        await read_json_file(test_config_file);

      const parsed_tokens_file: Record<string, any> = await read_json_file(
        parsed_config_file.tokens_file
      );
      const ytra = new YoutubeAPI({
        config: parsed_config_file,
        tokens: parsed_tokens_file
      });

      await ytra.listPlaylists();
    });

    test('Get context data.', async function () {
      const parsed_config_file: Record<string, any> =
        await read_json_file(test_config_file);

      const parsed_tokens_file: Record<string, any> = await read_json_file(
        parsed_config_file.tokens_file
      );
      const ytra = new YoutubeAPI({
        config: parsed_config_file,
        tokens: parsed_tokens_file
      });

      const context_data = await ytra.listChannelContextData();
    });
  }
})();
