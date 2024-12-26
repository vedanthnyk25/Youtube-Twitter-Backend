import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema= new Schema({
    videoFile: {
        typr: String,
        required: true
    },
    thumbnail: {
        typr: String,
        required: true
    },
    title: {
        typr: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    views: {
        type: Number,
        default: 0
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    duration: {
        type: Number,
        required: true
    },
    isPublished: {
        type: Boolean,
        default: false
    }

},{timestamps: true}
)

videoSchema.plugin(mongooseAggregatePaginate)

export const Video= mongoose.model("Video", videoSchema)