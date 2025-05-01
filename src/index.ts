/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import YoutubeAPITokenGenerator from '@src/tokens/YoutubeAPITokenGenerator.class';
import YoutubeAPI from '@src/youtubeapi/YoutubeAPI.class';
import FFMpegVideoTools from '@src/videotools/FFMpegVideoTools.class';
import * as utils from '@src/utils/utils';
import { read_json_file } from '@src/utils/utils';
import path from 'path';
import assert from 'assert';
import commandLineArgs from 'command-line-args';
import commandLineUsage from 'command-line-usage';

export { YoutubeAPI, YoutubeAPITokenGenerator, FFMpegVideoTools, utils };

if (require.main === module) {
  (async function () {
    const optionDefinitions = [
      { name: 'generate_new_token', alias: 'g', type: Boolean },
      { name: 'token_json_output_file_path', alias: 't', type: String },
      { name: 'config_file', alias: 'c', type: String }
    ];

    const sections = [
      {
        header: 'Youtube Tool',
        content:
          'Generic youtube tool, uploading, processing config files, getting information, etc.'
      },
      {
        header: 'Options',
        optionList: optionDefinitions
      }
    ];

    const usage = commandLineUsage(sections);
    const cli_options = commandLineArgs(optionDefinitions);

    // display options if there are no options provided
    if (!Object.keys(cli_options).length) {
      console.log(usage);
      return;
    }

    // check tokens
    if (cli_options.generate_new_token) {
      if (!cli_options.token_json_output_file_path) {
        console.log(usage);
        assert.fail(
          '--token_json_output_file_path is required when generating new tokens.'
        );
        return;
      }
    }

    if (cli_options.token_json_output_file_path) {
      if (!cli_options.generate_new_token) {
        console.log(usage);
        assert.fail(
          'Token json output path requires the --generate_new_token flag to be set.'
        );
        return;
      }
    }

    if (!cli_options.config_file) {
      console.log(usage);
      assert.fail(
        '--config_file option must be provided and contain a valid configuration.'
      );
      return;
    }

    const parsed_config_file: Record<string, any> = await read_json_file(
      cli_options.config_file
    );

    // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
    // %%% Generate Tokens %%%%%%%%%%%%%%%%%%%%%%%%%%%%
    // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

    // if we are generating, and have an output path, run the generator
    if (
      cli_options.generate_new_token &&
      cli_options.token_json_output_file_path &&
      cli_options.config_file
    ) {
      const tokengen = new YoutubeAPITokenGenerator();

      await tokengen.generateTokens({
        cli_options: cli_options,
        config: parsed_config_file
      });
      return;
    }

    console.log(usage);
    console.log(
      'Unknown flag selection, please run the application as instructed.'
    );
  })();
}
