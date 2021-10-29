import {CliInternals} from '@remotion/cli';
import {BINARY_NAME} from '../shared/constants';
import {FUNCTIONS_COMMAND} from './commands/functions';
import {RENDER_COMMAND} from './commands/render/render';
import {STILL_COMMAND} from './commands/still';
import {SITES_COMMAND} from './commands/sites';
import {Log} from './log';

const packagejson = require('../../package.json');

export const printHelp = () => {
	Log.info(
		`${BINARY_NAME} ${
			packagejson.version
		} © ${new Date().getFullYear()} The Remotion developers`
	);
	Log.info();
	Log.info('Available commands:');
	Log.info('');

	Log.info(`${BINARY_NAME} ${RENDER_COMMAND} <s3-url> <composition-id>`);
	Log.info(CliInternals.chalk.gray('Render a video in the cloud.'));

	Log.info(`${BINARY_NAME} ${STILL_COMMAND} <s3-url> <composition-id>`);
	Log.info(CliInternals.chalk.gray('Render a still image in the cloud.'));

	Log.info();
	Log.info(`${BINARY_NAME} ${FUNCTIONS_COMMAND}`);
	Log.info(CliInternals.chalk.gray('Deploy and manage AWS Lambda functions.'));

	Log.info();
	Log.info(`${BINARY_NAME} ${SITES_COMMAND}`);
	Log.info(CliInternals.chalk.gray('Deploy and manage Remotion projects.'));
};
