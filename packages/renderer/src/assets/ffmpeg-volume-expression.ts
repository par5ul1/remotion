// Example is here https://ffmpeg.org/ffmpeg-filters.html#volume
// Allowed syntax is here: https://ffmpeg.org/ffmpeg-utils.html#Expression-Evaluation

// If once, ffmpeg evaluates volume expression once.
// If frame, it evaluates it for each frame
import {roundVolumeToAvoidStackOverflow} from './round-volume-to-avoid-stack-overflow';
import {AssetVolume} from './types';

type FfmpegEval = 'once' | 'frame';

type VolumeArray = [number, number[]][];

// In FFMPEG expressions, the current frame is represented by 'n'
const FFMPEG_FRAME_VARIABLE = 'n';

const ffmpegIfOrElse = (condition: string, then: string, elseDo: string) => {
	return `if(${condition},${then},${elseDo})`;
};

const ffmpegIsOneOfFrames = (frames: number[]) => {
	return frames
		.map((f) => {
			return `eq(${FFMPEG_FRAME_VARIABLE},${f})`;
		})
		.join('+');
};

const ffmpegBuildVolumeExpression = (arr: VolumeArray): string => {
	if (arr.length === 0) {
		throw new Error('Volume array expression should never have length 0');
	}
	if (arr.length === 1) {
		// FFMpeg tends to request volume for frames outside the range
		// where the audio actually plays.
		// If this is the case, we just return volume 0 to clip it.
		return ffmpegIfOrElse(
			ffmpegIsOneOfFrames(arr[0][1]),
			String(arr[0][0]),
			String(0)
		);
	}
	const [first, ...rest] = arr;
	const [volume, frames] = first;
	return ffmpegIfOrElse(
		ffmpegIsOneOfFrames(frames),
		String(volume),
		ffmpegBuildVolumeExpression(rest)
	);
};

type FfmpegVolumeExpression = {
	eval: FfmpegEval;
	value: string;
};

// TODO: Should remove irrelevant frames
export const ffmpegVolumeExpression = (
	volume: AssetVolume,
	multiplier: number
): FfmpegVolumeExpression => {
	// If it's a static volume, we return it and tell
	// FFMPEG it only has to evaluate it once
	if (typeof volume === 'number') {
		return {
			eval: 'once',
			value: String(Math.min(1, volume) * multiplier),
		};
	}

	// Otherwise, we construct an FFMPEG expression. First step:
	// Make a map of all possible volumes
	// {possibleVolume1} => [frame1, frame2]
	// {possibleVolume2} => [frame3, frame4]
	const volumeMap: {[volume: string]: number[]} = {};
	volume.forEach((baseVolume, frame) => {
		// Adjust volume based on how many other tracks have not yet finished
		const actualVolume =
			roundVolumeToAvoidStackOverflow(Math.min(1, baseVolume)) * multiplier;
		if (!volumeMap[actualVolume]) {
			volumeMap[actualVolume] = [];
		}
		volumeMap[actualVolume].push(frame);
	});

	// Sort the map so that the most common volume is last
	// this is going to be the else statement so the expression is short
	const volumeArray: VolumeArray = Object.keys(volumeMap)
		.map((key): [number, number[]] => [Number(key), volumeMap[key]])
		.sort((a, b) => a[1].length - b[1].length);

	// Construct and tell FFMPEG it has to evaluate expression on each frame
	const expression = ffmpegBuildVolumeExpression(volumeArray);
	return {
		eval: 'frame',
		value: `'${expression}'`,
	};
};
