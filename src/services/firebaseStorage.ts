import { storage } from '../config/firebase'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'

/**
 * Firebase Storage service for image uploads
 */

export class FirebaseStorage {
  private userId: string

  constructor(userId: string) {
    this.userId = userId
  }

  /**
   * Upload costume image to Firebase Storage
   * @param costumeId - Costume ID
   * @param file - Image file
   * @returns Download URL of uploaded image
   */
  async uploadCostumeImage(costumeId: string, file: File): Promise<string> {
    const timestamp = new Date().getTime()
    const filename = `${timestamp}_${file.name}`
    const storageRef = ref(storage, `users/${this.userId}/costumes/${costumeId}/${filename}`)

    await uploadBytes(storageRef, file)
    const downloadURL = await getDownloadURL(storageRef)
    return downloadURL
  }

  /**
   * Upload event thumbnail
   * @param eventId - Event ID
   * @param file - Image file
   * @returns Download URL of uploaded image
   */
  async uploadEventThumbnail(eventId: string, file: File): Promise<string> {
    const timestamp = new Date().getTime()
    const filename = `thumbnail_${timestamp}_${file.name}`
    const storageRef = ref(storage, `users/${this.userId}/events/${eventId}/${filename}`)

    await uploadBytes(storageRef, file)
    const downloadURL = await getDownloadURL(storageRef)
    return downloadURL
  }

  /**
   * Delete image from Firebase Storage
   * @param imagePath - Full path to image in storage
   */
  async deleteImage(imagePath: string): Promise<void> {
    const imageRef = ref(storage, imagePath)
    await deleteObject(imageRef)
  }

  /**
   * Get download URL for an image
   * @param imagePath - Full path to image in storage
   */
  async getImageURL(imagePath: string): Promise<string> {
    const imageRef = ref(storage, imagePath)
    return await getDownloadURL(imageRef)
  }
}
