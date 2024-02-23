import { NextFunction, Request, Response } from "express";
import { VidInfoModel } from "../models/VidInfo";
import axios from "axios";

type VideoScores = {
  categoryScores: { [key: string]: number };
  frameScores: { [key: string]: number };
  keywordScores: { [key: string]: number };
};

// if vidInfo is not found in DB, obtain from classification and save to DB
export const getVidInfo = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const videoID = req.params.videoid;
  const vidInfo = await VidInfoModel.findById(videoID);

  if (vidInfo && !vidInfo.categoryScores) {
    // if vidInfo is found in DB, but has no categoryProbabilities, only userRated,
    // then get categoryProbabilities from classification and save to DB
    return res.json(vidInfo);
  }

  if (vidInfo) return res.json(vidInfo);

  // get video info from model and analysis
  const categoryKeywords = req.query.categoryKeywords ? req.query.categoryKeywords.toString() : "";

  const params = { video_id: videoID, category_keywords: categoryKeywords };
  const videoScores: VideoScores = (await axios.get(
    `${process.env.VIDEO_ANALYSIS_SERVICE_URI as string}/video-analysis`,
    { params }
  )).data;

  res.locals.videoID = videoID;
  res.locals.categoryScores = videoScores.categoryScores;
  res.locals.frameScores = videoScores.frameScores;
  res.locals.keywordScores = videoScores.keywordScores;
  next();
};

export const createVidInfo = async (req: Request, res: Response) => {
  let data = req.body;

  if (res.locals.videoID)
    data = {
      _id: res.locals.videoID,
      categoryScores: res.locals.categoryScores,
      frameScores: res.locals.frameScores,
      keywordScores: res.locals.keywordScores,
    };

  const newVidInfo = await VidInfoModel.create(data);

  res.json(newVidInfo);
};

export const updateVidInfo = async (req: Request, res: Response) => {
  const vidInfo = await VidInfoModel.findById(req.params.videoid);

  if (!vidInfo) return res.status(204).json({ message: "VidInfo not found" });

  const response = await VidInfoModel.updateOne(
    { _id: req.params.videoid },
    new VidInfoModel({
      ...vidInfo,
      ...req.body,
    })
  );
  res.json(response);
};

// returns null if nothing is found and deleted, return the deleted vidInfo if found
export const deleteVidInfo = async (req: Request, res: Response) => {
  const vid = await VidInfoModel.findByIdAndDelete(req.params.videoid);
  res.json(vid);
};
