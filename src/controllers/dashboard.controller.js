import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {apiError} from "../utils/apiError.js"
import {apiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {User} from "../models/user.model.js"

const getChannelStats = asyncHandler(async (req, res) => {
    const userId = req.user?._id

    const stats = await User.aggregate([
        {
            $match: {
                _id:  mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "_id",
                foreignField: "owner",
                as: "allVideos"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "allVideos._id",
                foreignField: "video",
                as: "allLikes"
            }
        },
        {
            $addFields: {
                totalVideos: { $size: "$allVideos" },
                totalViews: { $sum: "$allVideos.views" },
                totalSubscribers: { $size: "$subscribers" },
                totalLikes: { $size: "$allLikes" }
            }
        },
        {
            $project: {
                totalVideos: 1,
                totalViews: 1,
                totalSubscribers: 1,
                totalLikes: 1
            }
        }
    ])

    if (!stats?.length) {
        throw new apiError(404, "Channel stats not found")
    }

    return res.status(200).json(
        new apiResponse(200, stats[0], "Channel stats fetched successfully")
    )
})

const getChannelVideos = asyncHandler(async (req, res) => {
    const userId = req.user?._id

    const videos = await User.aggregate([
        {
            $match: {
                _id:  mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "_id",
                foreignField: "owner",
                as: "channelVideos"
            }
        },
        {
            $project: {
                channelVideos: {
                    $map: {
                        input: "$channelVideos",
                        as: "video",
                        in: {
                            _id: "$$video._id",
                            title: "$$video.title",
                            description: "$$video.description",
                            videoFile: "$$video.videoFile",
                            thumbnail: "$$video.thumbnail",
                            views: "$$video.views",
                            duration: "$$video.duration",
                            createdAt: "$$video.createdAt"
                        }
                    }
                }
            }
        }
    ])

    if (!videos?.length) {
        throw new apiError(404, "No videos found for this channel")
    }

    return res.status(200).json(
        new apiResponse(200, videos[0].channelVideos, "Channel videos fetched successfully")
    )
})

export {
    getChannelStats, 
    getChannelVideos
    }