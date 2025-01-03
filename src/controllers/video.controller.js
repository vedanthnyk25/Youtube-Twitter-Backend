import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {apiError} from "../utils/apiError.js"
import {apiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import cloudinaryUpload from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    if(!title || !description) throw new apiError(400, "Title and description are required!")

    const videoLocalPath = req.files?.videoFile[0]?.path
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path

    if(!videoLocalPath || !thumbnailLocalPath) throw new apiError(400, "Video file or thumbnail image missing!")

    
    const videoFile = await cloudinaryUpload(videoLocalPath, "video")
    const thumbnail = await cloudinaryUpload(thumbnailLocalPath)

    if(!videoFile || !thumbnail) throw new apiError(500, "Something went wrong while publishing!")

    const publishedVideo = await Video.create({
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        title,
        description,
        duration: videoFile.duration, 
        owner: req.user?._id,
        isPublished: true
    })

    return res.status(201).json(
        new apiResponse(201, publishedVideo, "Video published successfully")
    )
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(!isValidObjectId(videoId)) throw new apiError(400, "Invalid video ID!")

        const video= await Video.findById(videoId)

        if(!video) throw new apiError(404, "The video could not be found!")

            return res.status(200)
            .json(new apiResponse(200, video, "The video was fetched successfully"))

})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const {title, description}= req.body

    if(!isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid video ID!")
    }

    if(!title || !description) {
        throw new apiError(400, "Title and description are required!")
    }

    const thumbnailLocalPath = req.file?.path
    if(!thumbnailLocalPath) {
        throw new apiError(400, "Thumbnail image is required")
    }

    const thumbnail = await cloudinaryUpload(thumbnailLocalPath)
    if(!thumbnail) {
        throw new apiError(500, "Thumbnail could not be uploaded!")
    }

    const video = await Video.findByIdAndUpdate(
        {
            _id: videoId,
            owner: req.user?._id
        },
        {
            $set:{
                thumbnail: thumbnail.url,
                title,
                description
            }
        },
        {new: true}
    )

    if(!video) {
        throw new apiError(404, "Video not found or unauthorized")
    }

    return res.status(200).json(
        new apiResponse(200, video, "Video updated successfully")
    )
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid video ID!")
    }

    const video = await Video.findOneAndDelete({
        _id: videoId,
        owner: req.user?._id
    })

    if (!video) {
        throw new apiError(404, "Video not found or unauthorized")
    }

    return res.status(200).json(
        new apiResponse(200, {}, "Video deleted successfully")
    )
    //TODO: delete video
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    
    if(!isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid video ID!")
    }

    const video = await Video.findById(videoId)

    if(!video) {
        throw new apiError(404, "Video not found")
    }

    if(video.owner.toString() !== req.user?._id.toString()) {
        throw new apiError(403, "Unauthorized: You can't toggle someone else's video")
    }

    // Toggle the isPublished status
    video.isPublished = !video.isPublished

    await video.save()

    return res.status(200).json(
        new apiResponse(
            200, 
            video, 
            `Video ${video.isPublished ? "published" : "unpublished"} successfully`
        )
    )
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
