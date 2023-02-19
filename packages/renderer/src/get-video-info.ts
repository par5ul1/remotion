import {RenderInternals} from '.';
import type {DownloadMap, Vp9Result} from './assets/download-map';
import {calculateDisplayVideoSize} from './calculate-sar-dar-pixels';
import {pLimit} from './p-limit';

const limit = pLimit(1);

export async function getVideoInfoUncached({
	src,
}: {
	src: string;
}): Promise<Vp9Result> {
	const task = await RenderInternals.callFf('ffprobe', [src]);

	const isVp9 = task.stderr.includes('Video: vp9');
	const isVp8 = task.stderr.includes('Video: vp8');

	const dimensions = task.stderr
		.split('\n')
		.find((n) => n.trim().startsWith('Stream #'))
		?.match(/([0-9]{2,6})x([0-9]{2,6})/);
	const dar = task.stderr.match(/DAR\s([0-9]+):([0-9]+)/);

	let needsResize: null | [number, number] = null;

	if (dimensions && dar) {
		const width = parseInt(dimensions[1], 10);
		const height = parseInt(dimensions[2], 10);
		const darWidth = parseInt(dar[1], 10);
		const darHeight = parseInt(dar[2], 10);

		const {width: actualWidth, height: actualHeight} =
			calculateDisplayVideoSize({
				darX: darWidth,
				darY: darHeight,
				x: width,
				y: height,
			});

		if (actualWidth !== width || actualHeight !== height) {
			needsResize = [actualWidth, actualHeight];
		}
	}

	const result: Vp9Result = {
		specialVcodecForTransparency: isVp9 ? 'vp9' : isVp8 ? 'vp8' : 'none',
		needsResize,
	};

	return result;
}

async function getVideoInfoUnlimited(
	downloadMap: DownloadMap,
	src: string
): Promise<Vp9Result> {
	if (typeof downloadMap.isVp9VideoCache[src] !== 'undefined') {
		return downloadMap.isVp9VideoCache[src];
	}

	const result = await getVideoInfoUncached({
		src,
	});

	downloadMap.isVp9VideoCache[src] = result;

	return downloadMap.isVp9VideoCache[src];
}

export const getVideoInfo = (
	downloadMap: DownloadMap,
	src: string
): Promise<Vp9Result> => {
	return limit(() => getVideoInfoUnlimited(downloadMap, src));
};
