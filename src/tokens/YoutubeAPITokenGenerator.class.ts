/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { google } from 'googleapis';
import { read_json_file, askQuestion } from '@src/utils/utils';
import fs from 'fs';
import assert from 'assert';

class YoutubeAPITokenGenerator {
  constructor() {}

  async generateTokens(params: any): Promise<any> {
    const config = params.config;

    const oauth2Client = new google.auth.OAuth2(
      config.client_id,
      config.client_secret,
      config.redirect_uri
    );

    let parsed_tokens_file: null | Record<string, any> = null;
    try {
      parsed_tokens_file = await read_json_file(config.tokens_file);
    } catch (err) {}

    if (parsed_tokens_file) {
      assert.fail(
        `Error, the token file already exists.  Delete it if you want to create a new file, with new token details (${config.tokens_file})`
      );
    }

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/youtube']
    });

    console.log('Authorize this app by visiting this URL:\n', authUrl);

    const redirect_url = await askQuestion(
      'Enter the url the app redirected to (should be like http://localhost/?code=any&scope=any): '
    );

    const parsed_url = new URL(redirect_url);
    const code_from_url = parsed_url.searchParams.get('code');
    const scope_from_url = parsed_url.searchParams.get('scope');

    if (!code_from_url) {
      assert.fail('No code found in provided url.');
      return;
    }

    if (!scope_from_url) {
      assert.fail('No scope found in provided url.');
      return;
    }

    const { tokens } = await oauth2Client.getToken(code_from_url);
    oauth2Client.setCredentials(tokens);

    // Save the tokens for next time
    fs.writeFileSync(config.tokens_file, JSON.stringify(tokens, null, 2));
    console.log('Tokens saved to', config.tokens_file);

    // return token data
    return {
      file: config.tokens_file,
      tokens: tokens
    };
  }
}

export default YoutubeAPITokenGenerator;
