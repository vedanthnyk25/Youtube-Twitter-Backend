import apiError from "../utils/apiError.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {User} from "../models/user.model.js"
import cloudinaryUpload from "../utils/cloudinary.js"
import {apiResponse} from "../utils/apiResponse.js"

const registerUser= asyncHandler( async (req, res)=>{
        const {fullName, userName, email, password}= req.body

        if(
            [fullName, userName, email, password].some((field)=> field?.trim==="")
        ){
            throw new apiError(400, "All fields are required!")
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if(!emailRegex.test(email)) throw new apiError(400, "Invalid email!")
        
            const exsitingUser= User.findOne({
                $or:[{email},{password}]
            }
            )
            if(exsitingUser) throw new apiError(409, "The user already exists")

                const avatarLocalPath= req.files?.avatar[0]?.path
                const coverImageLocalPath= req.files?.coverImage[0]?.path

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

export {registerUser}