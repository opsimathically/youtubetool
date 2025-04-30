/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { google } from 'googleapis';
import fs from 'node:fs';
import path from 'node:path';

class YoutubeAPI {
  config: any = {};
  tokens: any = {};

  constructor(params: { config: any; tokens: any }) {
    this.config = params.config;
    this.tokens = params.tokens;
  }

  async createYoutubeHandle() {
    const ytra_ref = this;
    const oauth2Client = new google.auth.OAuth2(
      ytra_ref.config.client_id,
      ytra_ref.config.client_secret,
      ytra_ref.config.redirect_uri
    );

    oauth2Client.setCredentials(ytra_ref.tokens);

    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    return youtube;
  }

  async listChannelContextData() {
    // set self reference
    const ytra_ref = this;

    const youtube = await ytra_ref.createYoutubeHandle();

    const channelResponse = await youtube.channels.list({
      part: [
        // "auditDetails",
        'brandingSettings',
        'contentDetails',
        'contentOwnerDetails',
        'id',
        'localizations',
        'snippet',
        'statistics',
        'status',
        'topicDetails'
      ],
      mine: true // means "for the currently authenticated user"
    });

    const items = channelResponse?.data?.items;

    return items?.[0];
  }

  // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
  // %%% Video Categories %%%%%%%%%%%%%%%%%%%%%%%%%%%
  // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

  // Get a list of video categories
  async listVideoCategories() {
    // set self reference
    const ytra_ref = this;

    const youtube = await ytra_ref.createYoutubeHandle();

    const res = await youtube.videoCategories.list({
      part: ['snippet'],
      regionCode: 'US' // Required; use 'US' or your own country code
    });

    const category_array: any = [];
    for (const category of res.data.items ?? []) {
      console.log(`${category.id}: ${category.snippet?.title}`);
      category_array.push(category);
    }

    return category_array;
  }

  // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
  // %%% Videos %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
  // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

  async listVideos(params: { title_match_regex?: RegExp }) {
    // set self reference
    const ytra_ref = this;

    const youtube = await ytra_ref.createYoutubeHandle();

    const channelResponse = await youtube.channels.list({
      part: [
        // "auditDetails",
        'brandingSettings',
        'contentDetails',
        'contentOwnerDetails',
        'id',
        'localizations',
        'snippet',
        'statistics',
        'status',
        'topicDetails'
      ],
      mine: true // means "for the currently authenticated user"
    });

    const items = channelResponse?.data?.items;

    const uploadsPlaylistId =
      items?.[0].contentDetails?.relatedPlaylists?.uploads;

    let nextPageToken: string | undefined = undefined;

    const video_array: any[] = [];
    do {
      const res: any = await youtube.playlistItems.list({
        part: ['snippet', 'contentDetails'],
        playlistId: uploadsPlaylistId!,
        maxResults: 50,
        pageToken: nextPageToken
      });

      for (const item of res.data.items ?? []) {
        if (params?.title_match_regex) {
          if (!params?.title_match_regex.test(item.snippet.title)) continue;
        }
        video_array.push(item);
      }

      nextPageToken = res.data.nextPageToken;
    } while (nextPageToken);

    // return videos
    return video_array;
  }

  /* categoryId(s):
  1: Film & Animation
  2: Autos & Vehicles
  10: Music
  15: Pets & Animals
  17: Sports
  18: Short Movies
  19: Travel & Events
  20: Gaming
  21: Videoblogging
  22: People & Blogs
  23: Comedy
  24: Entertainment
  25: News & Politics
  26: Howto & Style
  27: Education
  28: Science & Technology
  29: Nonprofits & Activism
  30: Movies
  31: Anime/Animation
  32: Action/Adventure
  33: Classics
  34: Comedy
  35: Documentary
  36: Drama
  37: Family
  38: Foreign
  39: Horror
  40: Sci-Fi/Fantasy
  41: Thriller
  42: Shorts
  43: Shows
  44: Trailers
  */

  async createUploadVideo(params: {
    path_to_file: string;
    title: string;
    description: string;
    tags: string[];
    categoryId: string;
    defaultLanguage: string;
    privacyStatus: 'unlisted' | 'public' | 'private';
    selfDeclaredMadeForKids: boolean;
    embeddable: boolean;
    license: 'youtube' | 'creativeCommon';
    publicStatsViewable: boolean;
    caption: 'false' | 'true';
  }) {
    // set self reference
    const ytra_ref = this;
    const youtube = await ytra_ref.createYoutubeHandle();

    const res = await youtube.videos.insert({
      part: ['snippet', 'status', 'contentDetails'],
      requestBody: {
        snippet: {
          title: params.title,
          description: params.description,
          tags: params.tags,
          categoryId: params.categoryId,
          defaultLanguage: params.defaultLanguage
        },
        status: {
          privacyStatus: params.privacyStatus,
          selfDeclaredMadeForKids: params.selfDeclaredMadeForKids,
          embeddable: params.embeddable,
          license: params.license,
          publicStatsViewable: params.publicStatsViewable
        },
        contentDetails: {
          caption: params.caption
        }
      },
      media: {
        body: fs.createReadStream(path.resolve(params.path_to_file))
      }
    });

    // return the video id
    return res.data.id;
  }

  // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
  // %%% Create and Remove Playlists %%%%%%%%%%%%%%%%%
  // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

  async listPlaylists(params?: { playlist_title_regexp?: RegExp }) {
    const ytra_ref = this;
    const youtube = await ytra_ref.createYoutubeHandle();

    let nextPageToken: string | undefined = undefined;

    const playlist_array: any = [];
    do {
      const res: any = await youtube.playlists.list({
        part: ['snippet', 'contentDetails'],
        mine: true,
        maxResults: 50,
        pageToken: nextPageToken
      });

      const playlists = res.data.items ?? [];

      for (const playlist of playlists) {
        if (params?.playlist_title_regexp) {
          if (!params.playlist_title_regexp.test(playlist.snippet.title))
            continue;
        }
        playlist_array.push(playlist);
      }

      nextPageToken = res.data.nextPageToken;
    } while (nextPageToken);

    // return the playlist array or null
    if (playlist_array.length === 0) return null;
    return playlist_array;
  }

  async createPlaylist(params: {
    title: string;
    description: string;
    privacyStatus: 'public' | 'private' | 'unlisted';
  }) {
    // set self reference
    const ytra_ref = this;

    const youtube = await ytra_ref.createYoutubeHandle();

    const res = await youtube.playlists.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: params.title,
          description: params.description
        },
        status: {
          privacyStatus: params.privacyStatus
        }
      }
    });

    return res.data.id;
  }

  async deletePlaylist(params: { playlist_id: string }) {
    // set self reference
    const ytra_ref = this;

    const youtube = await ytra_ref.createYoutubeHandle();

    const delete_res = await youtube.playlists.delete({
      id: params.playlist_id
    });

    // status code 204 appears to be a true delete
    if (delete_res?.status === 204) return true;

    return false;
  }

  async updatePlaylist(params: {
    playlist_id: string;
    title: string;
    description: string;
    privacyStatus: 'public' | 'private' | 'unlisted';
  }) {
    // set self reference
    const ytra_ref = this;

    const youtube = await ytra_ref.createYoutubeHandle();

    const update_res = await youtube.playlists.update({
      part: ['snippet', 'status'],
      requestBody: {
        id: params.playlist_id,
        snippet: {
          title: params.title,
          description: params.description
        },
        status: {
          privacyStatus: params.privacyStatus
        }
      }
    });
    if (update_res?.status === 200) return true;
    return false;
  }

  // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
  // %%% Update Videos %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
  // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
}

export default YoutubeAPI;
