import { Schema, model } from "mongoose";

const categoryProbabailities = new Schema(
  {
    food: Number,
    lowGraphics: Number,
    lowLight: Number,
    mechanicalItems: Number,
    nature: Number,
    person: Number,
    sports: Number,
    textHeavy: Number,
    urban: Number,
    news: Number,
  },
  { _id: false }
);

const vidInfoSchema = new Schema({
  _id: {
    type: String,
    required: true,
  },
  categoryScores: {
    type: categoryProbabailities,
    required: false,
  },
  // choose better name for this perhaps
  frameScores: {
    type: Object,
    required: false,
  },
  keywordScores: {
    type: Object,
    required: false,
  },
  userRated: {
    type: String,
    required: false,
  },
});

export const VidInfoModel = model("vidinfo", vidInfoSchema);
