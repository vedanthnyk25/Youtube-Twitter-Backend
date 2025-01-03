import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {apiError} from "../utils/apiError.js"
import {apiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {Video} from "../models/video.model.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

    if(!name?.trim() || !description?.trim()) throw new apiError(400, "Name and description cannot be empty!")

        const playlist= await Playlist.create({
            name: name,
            description: description,
            owner: req.user?._id,
            videos: []
        })

        if(!playlist) throw new apiError(500, "Playlist could not be created!")

            return res.status(201)
            .json(new apiResponse(201, playlist, "Playlist created successfully"))
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    
    if(!isValidObjectId(userId)) {
        throw new apiError(400, "Invalid user ID!")
    }

    const userPlaylists = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos"
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
                },
                totalVideos: {
                    $size: "$videos"
                }
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                videos: 1,
                totalVideos: 1,
                owner: {
                    username: 1,
                    fullName: 1,
                    avatar: 1
                },
                createdAt: 1,
                updatedAt: 1
            }
        }
    ])

    if (!userPlaylists?.length) {
        throw new apiError(404, "No playlists found for this user")
    }

    return res
        .status(200)
        .json(new apiResponse(200, userPlaylists, "User playlists fetched successfully"))
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params

    if (!isValidObjectId(playlistId)) {
        throw new apiError(400, "Invalid playlist ID")
    }

    const playlist = await Playlist.findById(playlistId)
        .populate({
            path: "videos",
            populate: {
                path: "owner",
                select: "username fullName avatar"
            },
            select: "title description thumbnail duration views videoFile owner"
        })
        .populate("owner", "username fullName avatar");

    if (!playlist) {
        throw new apiError(404, "Playlist not found")
    }

    // Check if playlist is private and user is not the owner
    if (!playlist.isPublic && 
        playlist.owner._id.toString() !== req.user?._id.toString()) {
        throw new apiError(403, "This playlist is private")
    }

    return res
        .status(200)
        .json(new apiResponse(200, playlist, "Playlist fetched successfully"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid playlist or video ID")
    }

    // Find playlist and check ownership
    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new apiError(404, "Playlist not found")
    }

    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new apiError(403, "You don't have permission to modify this playlist")
    }

    // Check if video exists
    const video = await Video.findById(videoId)
    if (!video) {
        throw new apiError(404, "Video not found")
    }

    // Check if video is already in playlist
    if (playlist.videos.includes(videoId)) {
        throw new apiError(400, "Video already exists in playlist")
    }

    // Add video to playlist
    playlist.videos.push(videoId)
    await playlist.save()

    return res
        .status(200)
        .json(new apiResponse(200, playlist, "Video added to playlist successfully"))
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid playlist or video ID")
    }

    // Find playlist and check ownership
    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new apiError(404, "Playlist not found")
    }

    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new apiError(403, "You don't have permission to modify this playlist")
    }

    // Check if video exists in playlist
    if (!playlist.videos.includes(videoId)) {
        throw new apiError(404, "Video not found in playlist")
    }

    // Remove video from playlist
    playlist.videos = playlist.videos.filter(
        (video) => video.toString() !== videoId
    )
    
    await playlist.save()

    return res
        .status(200)
        .json(new apiResponse(200, playlist, "Video removed from playlist successfully"))
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params

    if (!isValidObjectId(playlistId)) {
        throw new apiError(400, "Invalid playlist ID")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new apiError(404, "Playlist not found")
    }

    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new apiError(403, "You don't have permission to delete this playlist")
    }

    await Playlist.findByIdAndDelete(playlistId)

    return res
        .status(200)
        .json(new apiResponse(200, {}, "Playlist deleted successfully"))
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description, isPublic} = req.body

    if (!isValidObjectId(playlistId)) {
        throw new apiError(400, "Invalid playlist ID")
    }

    if (!name?.trim() && !description?.trim() && typeof isPublic !== "boolean") {
        throw new apiError(400, "At least one field is required to update")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new apiError(404, "Playlist not found")
    }

    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new apiError(403, "You don't have permission to update this playlist")
    }

    // Only update fields that are provided
    if (name?.trim()) playlist.name = name.trim()
    if (description?.trim()) playlist.description = description.trim()
    if (typeof isPublic === "boolean") playlist.isPublic = isPublic

    await playlist.save()

    return res
        .status(200)
        .json(new apiResponse(200, playlist, "Playlist updated successfully"))
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}
