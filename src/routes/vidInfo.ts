import { Router } from "express";
import {
  getVidInfo,
  createVidInfo,
  updateVidInfo,
  deleteVidInfo,
} from "../controllers/vidInfoController";
export const vidInfoRouter = Router();

vidInfoRouter
  .route("/vid/:videoid")
  .get(getVidInfo)
  .post(createVidInfo)
  .put(updateVidInfo)
  .delete(deleteVidInfo);
