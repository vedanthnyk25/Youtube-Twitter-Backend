import {v2 as cloudinary} from 'cloudinary'
import fs from 'fs'

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
})

const cloudinaryUpload= async (localFilePath)=>{
    try {
        const response= await cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto"
        })
       // console.log("File is successfully uploaded to cloudinary", response.url)
        fs.unlinkSync(localFilePath)
        return response
    } catch (error) {
        fs.unlinkSync(localFilePath)
        console.log("Upload failed: ", error)
    }
}

export default cloudinaryUpload