import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {apiError, ApiError} from "../utils/apiError.js"
import {apiResponse, ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    const {content}= req.body

    if(!content?.trim()) throw new apiError(400, "content cannot be empty!")

        const tweet= await Tweet.create({
            content,
            owner: req.user?._id
})
        if(!tweet) throw new apiError(500, "tweet could not be created!")
            
            return res.status(201)
            .json(new apiResponse(201, tweet, "Tweet created successfully"))
})

const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params

    if (!userId) {
        throw new apiError(400, "User id is required")
    }

    if (!isValidObjectId(userId)) {
        throw new apiError(400, "Invalid user id")
    }

    const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner"
                }
            }
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                "owner.username": 1,
                "owner.avatar": 1,
                "owner._id": 1
            }
        }
    ])

    if (!tweets?.length) {
        throw new apiError(404, "No tweets found")
    }

    return res
        .status(200)
        .json(
            new apiResponse(200, tweets, "User tweets fetched successfully")
        )
})

const updateTweet = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    const {content} = req.body

    if (!content) {
        throw new apiError(400, "Content is required")
    }

    if (!isValidObjectId(tweetId)) {
        throw new apiError(400, "Invalid tweet ID")
    }

    const updatedTweet = await Tweet.findOneAndUpdate(
        {
            _id: tweetId,
            owner: req.user?._id
        },
        {
            $set: {
                content
            }
        },
        {new: true}
    )

    if (!updatedTweet) {
        throw new apiError(404, "Tweet not found or unauthorized")
    }

    return res.status(200).json(
        new apiResponse(200, updatedTweet, "Tweet updated successfully")
    )
})

const deleteTweet = asyncHandler(async (req, res) => {
    const {tweetId} = req.params

    if (!isValidObjectId(tweetId)) {
        throw new apiError(400, "Invalid tweet ID")
    }

    const deletedTweet = await Tweet.findOneAndDelete({
        _id: tweetId,
        owner: req.user?._id
    })

    if (!deletedTweet) {
        throw new apiError(404, "Tweet not found or unauthorized")
    }

    return res.status(200).json(
        new apiResponse(200, {}, "Tweet deleted successfully")
    )
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}
