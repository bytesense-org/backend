import opencv from "@u4/opencv4nodejs";
import {
  getVideoDataStoryboard,
  getVideoDataText,
} from "./VideoDataDownloader";
import ModelWrapper from "./ModelWrapper";

export const getVideoAnalysis = async (
  videoID: string,
  categoryKeywords: { [key: string]: string[] },
) => {
  console.log(videoID);
  const images = await getVideoDataStoryboard(videoID);
  const filteredImages = (await filterDetailOutliers(images)).sort(
    (first, second) => {
      return first.score - second.score;
    },
  );
  const modelWrapper = await ModelWrapper.getInstance();
  const categoryScores = modelWrapper.predict(
    ModelWrapper.preprocess(filteredImages[0].image),
  );

  const quality = getVideoDetailScore(
    filteredImages.map((image) => image.score),
  );

  const videoText = await getVideoDataText(videoID);
  const keywordScores = getVideoKeywordScore(videoText, categoryKeywords);

  return {
    categoryScores,
    frameScores: { detailScore: quality },
    keywordScores,
  };
};

export const getVideoKeywordScore = (
  videoText: {
    title: string;
    description: string;
    category: string;
    channelId: string;
  },
  categoryKeywords: { [key: string]: string[] },
) => {
  const keywordScores: { [key: string]: number } = {};
  const textToSearch = Object.values(videoText).join(" ");

  Object.entries(categoryKeywords).forEach(([category, keywords]) => {
    const matchedScores = keywords.map(
      (keyword) =>
        (textToSearch.match(new RegExp(`\\W${keyword}\\W`, "g")) || []).length,
    );

    const numKeywordsMatched = matchedScores.filter(
      (matchCount) => matchCount > 0,
    ).length;

    keywordScores[category] = numKeywordsMatched;
  });

  return keywordScores;
};

export const getVideoDetailScore = (imageScores: number[]) => {
  // get the mean variance from all the frames
  // the mean variance of all frames is considered the mean
  // quality level for the video

  return imageScores.reduce((i, j) => i + j) / imageScores.length;
};

export const filterDetailOutliers = async (images: Buffer[]) => {
  // we have to work with multiple frames for a video
  // in order to avoid outlier frames (title cards etc)
  // from poisoning the data these frames must be discarded.
  // we find the standard deviation for the variance of all frames
  // and then discard any frames that may be outliers

  const { imageScores, laplaceMaps } = await getLaplacianMapVariance(images);

  const { numMean: scoresMean, numStdDev: scoresStdDev } =
    getMeanStdDev(imageScores);

  const devLowerBound = scoresMean - scoresStdDev;
  const devUpperBound = scoresMean + scoresStdDev;

  // filter out any frames that have a variance that is beyond the standard deviation
  const filteredImages = images
    .map((image, index) => {
      return {
        image,
        laplaceMap: laplaceMaps[index],
        score: imageScores[index],
      };
    })
    .filter(
      (imageScore) =>
        imageScore.score >= devLowerBound && imageScore.score <= devUpperBound,
    );

  return filteredImages;
};

const getLaplacianMapVariance = async (images: Buffer[]) => {
  // convolve the images (grayscale) with the laplacian operator.
  // this will return all the edges (rapid intensity changes) in the image
  // the higher the detail of the image the more variance there is
  // between edges and flat planes.

  const imageScores = [];
  const laplaceMaps = [];

  for (let index = 0; index < images.length; index++) {
    // the variance of a sequence is the standard deviation squared
    const laplaceMap = await (
      await opencv.imdecodeAsync(images[index], opencv.IMREAD_GRAYSCALE)
    ).laplacianAsync(opencv.CV_64F);

    const imageScore = (
      await laplaceMap.meanStdDevAsync()
    ).stddev.getDataAsArray();

    imageScores.push(Math.pow(imageScore[0][0], 2));
    laplaceMaps.push(laplaceMap);
  }

  return { imageScores: imageScores, laplaceMaps: laplaceMaps };
};

const getMeanStdDev = (numArray: number[]) => {
  const numMean = numArray.reduce((i, j) => i + j) / numArray.length;

  const numStdDev = Math.sqrt(
    numArray
      .map((frame) => Math.pow(frame - numMean, 2))
      .reduce((i, j) => i + j) / numArray.length,
  );

  return { numMean, numStdDev };
};
