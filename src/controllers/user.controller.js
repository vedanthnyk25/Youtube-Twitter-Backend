import {apiError} from "../utils/apiError.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {User} from "../models/user.model.js"
import cloudinaryUpload from "../utils/cloudinary.js"
import {apiResponse} from "../utils/apiResponse.js"
import jwt from 'jsonwebtoken'

const generateAccessandRefreshTokens= async (userId)=>{
    try {
        const user= await User.findById(userId)

        const accessToken= user.generateAccessToken()
        const refreshToken= user.generateRefreshToken()

        user.refreshToken= refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}

    } catch (error) {
        throw new apiError(500, "Something went wrong while generating tokens")
    }
}

const registerUser= asyncHandler( async (req, res)=>{
        const {fullName, userName, email, password}= req.body

        if(
            [fullName, userName, email, password].some((field)=> field?.trim()==="")
        ){
            throw new apiError(400, "All fields are required!")
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if(!emailRegex.test(email)) throw new apiError(400, "Invalid email!")
        
            const existingUser= await User.findOne({
                $or:[{email},{userName}]
            }
            )
            if(existingUser) throw new apiError(409, "The user already exists")

                const avatarLocalPath= req.files?.avatar[0]?.path
                //const coverImageLocalPath= req.files?.coverImage[0]?.path

                let coverImageLocalPath
                if(req.files && Array.isArray(req.files.coverImage)&& req.files.coverImage.length>0){
                    coverImageLocalPath= req.files.coverImage[0].path
                }

                if(!avatarLocalPath) throw new apiError(400, "avatar image is required")

                    const avatar= await cloudinaryUpload(avatarLocalPath)
                    const coverImage= await cloudinaryUpload(coverImageLocalPath)

                    if(!avatar) throw new apiError(400, "avatar image is required")

                    const user= await User.create({
                            avatar: avatar.url,
                            coverImage: coverImage?.url||"",
                            email: email,
                            userName: userName.toLowerCase(),
                            fullName,
                            password
                    })

                    const createdUser= await User.findById(user._id).select(
                        "-password -refreshToken"
                    )

                    if(!createdUser) throw new apiError(500, "Something went wrong while registering the user")
                    
                        res.status(201).json(
                            new apiResponse(200, createdUser, "The user has been registered successfully:)")
                        )


})

const loginUser= asyncHandler(async(req, res)=>{
    const {email, userName, password}= req.body

    if(!email && !userName) throw new apiError(400, "Email or userName is required")
    if(!password) throw new apiError(400, "Password is required")

    const user= await User.findOne({
        $or:[{email},{userName}]})
        if(!user) throw new apiError(404, "User not found")
            const isPasswordValid= await user.isPasswordCorrect(password)
            if(!isPasswordValid) throw new apiError(401, "Invalid password")

            const  {refreshToken, accessToken}= await generateAcessandRefreshTokens(user._id)

            const loggedInUser= await User.findById(user._id).select("-password -refreshToken")

            const options= {
                httpOnly: true,
                secure: true
            }

            res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new apiResponse(
                    200,
                    {
                        user: loggedInUser, accessToken, refreshToken
                    },
                    "User logged in successfully:)"
                )
            )

})
const logoutUser= asyncHandler(async (req, res)=>{
            await User.findByIdAndUpdate(
                req.user._id,
                {
                $set:{
                    refreshToken: undefined
                }
            },
        {
            new:true
        })
        const options={
            httpOnly: true,
            secure: true
        }

        res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new apiResponse(200,{}, "User logged out successfully")
        )
})

const refreshAccessToken= asyncHandler(async (req, res)=>{
    const incomingRefreshToken=  req.body.refreshToken||req.cookies.refreshToken

    if(!incomingRefreshToken) throw new apiError(401, "Unauthorised request!")

    try {
        const decodedToken= jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        const user= await User.findById(decodedToken._id)

        if(!user) throw new apiError(400, "Invalid refresh token!")

            if(incomingRefreshToken!== user.refreshToken) throw new apiError(400, "Refresh token invalid or is already expired!")

                const {accessToken: newAccessToken, refreshToken: newRefreshToken} = await generateAccessandRefreshTokens(user._id)
                
                const options= {
                    httpOnly: true,
                    secure: true
                }

                res.status(200)
                .cookie("accessToken", newAccessToken, options)
                .cookie("refreshToken", newRefreshToken, options)
                .json(new apiResponse(
                    200,
                    {
                        newAccessToken, 
                        refreshToken: newRefreshToken
                    },
                    "Tokens refreshed successfully"
                ))
    } catch (error) {
        throw new apiError(401, error?.message||"Invalid refresh token")
    }
})

const changeCurrentPassword= asyncHandler(async (req, res)=>{
    const {currentPassword, newPassword}= req.body

    const user= await User.findById(req.user?._id)

    if(!user) throw new apiError(401, "Invalid request!")

        const isPasswordValid= await user.isPasswordCorrect(currentPassword)

        if(!isPasswordValid) throw new apiError(401, "Invalid password!")

            user.password= newPassword
            await user.save({validateBeforeSave: false})

            return res.status(200).json(
                new apiResponse(200,{}, "Password has been changed successfully")
            )
})

const getCurrentUser= asyncHandler(async (req, res)=>{
    return res.status(200)
    .json(new apiResponse(200, req.user, "Current user fetched successfully"))
})

const updateUserDetails= asyncHandler(async (req, res)=>{
        const {fullName, email }= req.body

        if(!fullName || !email) throw new apiError(400, "All the fields are required")

            const user= await User.findByIdAndUpdate(req.user?._id,
                {
                    $set:{
                        fullName,
                        email
                    }
                },
                {new: true}
            ).select("-password")

        return res.status(200)
        .json(new apiResponse(200, user, "User details updated successfully"))    
})

const updateUserAvatar= asyncHandler(async (req, res)=>{
    const avatarLocalPath= req.file?.path

    if(!avatarLocalPath) throw new apiError(400, "Avatar file is missing")

        const avatar= await cloudinaryUpload(avatarLocalPath)

        const user= await User.findByIdAndUpdate(req.user?._id,{
            $set:{
                avatar: avatar.url
            }
        },{
            new: true
        }).select("-password")

        return res.status(200)
        .json(new apiResponse(200, user, "Avatar updated successfully"))
})

const updateUserCoverImage= asyncHandler(async (req, res)=>{
    const coverImageLocalPath= req.file?.path

    if(!coverImageLocalPath) throw new apiError(400, "CoverImage file is missing")

        const coverImage= await cloudinaryUpload(coverImageLocalPath)

        const user= await User.findByIdAndUpdate(req.user?._id,{
            $set:{
                coverImage: coverImage.url
            }
        },{
            new: true
        }).select("-password")

        return res.status(200)
        ,json(new apiResponse(200, user, "CoverImage has been updated successfully"))
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateUserDetails,
    updateUserAvatar,
    updateUserCoverImage

}