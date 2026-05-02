/**
 * Cloud Storage Import Service
 * Supports: Google Drive, Google Photos, Dropbox
 */

export interface CloudFile {
  id: string
  name: string
  url: string
  mimeType: string
  size: number
  createdTime: string
}

export interface CloudImportConfig {
  googleDriveApiKey: string
  googlePhotosApiKey: string
  dropboxAccessToken: string
}

/**
 * Initialize Google Drive API
 */
export async function initializeGoogleDriveAPI(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://apis.google.com/js/api.js'
    script.onload = () => {
      window.gapi.load('client', () => {
        window.gapi.client
          .init({
            apiKey: apiKey,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
          })
          .then(() => resolve())
          .catch(reject)
      })
    }
    script.onerror = reject
    document.head.appendChild(script)
  })
}

/**
 * Search for image files in Google Drive
 */
export async function searchGoogleDriveImages(query: string = ''): Promise<CloudFile[]> {
  try {
    if (!window.gapi || !window.gapi.client) {
      throw new Error('Google Drive API not initialized')
    }

    const response = await window.gapi.client.drive.files.list({
      q: `mimeType contains 'image/' and trashed = false ${query ? `and name contains '${query}'` : ''}`,
      spaces: 'drive',
      fields: 'files(id, name, mimeType, size, createdTime, webContentLink)',
      pageSize: 50,
    })

    return (response.result.files || []).map((file: any) => ({
      id: file.id,
      name: file.name,
      url: file.webContentLink,
      mimeType: file.mimeType,
      size: file.size,
      createdTime: file.createdTime,
    }))
  } catch (err) {
    console.error('Failed to search Google Drive:', err)
    return []
  }
}

/**
 * Initialize Google Photos API
 */
export async function initializeGooglePhotosAPI(accessToken: string): Promise<void> {
  // Store the access token for later use
  sessionStorage.setItem('google_photos_token', accessToken)
}

/**
 * Search for images in Google Photos
 */
export async function searchGooglePhotosImages(query: string = ''): Promise<CloudFile[]> {
  try {
    const accessToken = sessionStorage.getItem('google_photos_token')
    if (!accessToken) {
      throw new Error('Google Photos API not initialized')
    }

    const response = await fetch('https://photoslibrary.googleapis.com/v1/mediaItems:search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pageSize: 50,
        filters: {
          mediaTypeFilter: {
            mediaTypes: ['PHOTO'],
          },
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Google Photos API error: ${response.statusText}`)
    }

    const data = await response.json()

    return (data.mediaItems || []).map((item: any) => ({
      id: item.id,
      name: item.filename,
      url: `${item.baseUrl}=w800`,
      mimeType: 'image/jpeg',
      size: 0,
      createdTime: item.mediaMetadata.creationTime,
    }))
  } catch (err) {
    console.error('Failed to search Google Photos:', err)
    return []
  }
}

/**
 * Initialize Dropbox API
 */
export async function initializeDropboxAPI(accessToken: string): Promise<void> {
  // Store the access token for later use
  sessionStorage.setItem('dropbox_token', accessToken)
}

/**
 * Search for images in Dropbox
 */
export async function searchDropboxImages(query: string = ''): Promise<CloudFile[]> {
  try {
    const accessToken = sessionStorage.getItem('dropbox_token')
    if (!accessToken) {
      throw new Error('Dropbox API not initialized')
    }

    const response = await fetch('https://api.dropboxapi.com/2/files/search_v2', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query || 'image',
        options: {
          path: '/衣装',
          file_status: 'active',
          filename_only: false,
          max_results: 50,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Dropbox API error: ${response.statusText}`)
    }

    const data = await response.json()

    return (data.matches || []).map((match: any) => {
      const file = match.metadata
      return {
        id: file.id,
        name: file.name,
        url: '', // Will be fetched separately
        mimeType: 'image/jpeg',
        size: file.size,
        createdTime: file.client_modified,
      }
    })
  } catch (err) {
    console.error('Failed to search Dropbox:', err)
    return []
  }
}

/**
 * Get Dropbox file URL
 */
export async function getDropboxFileUrl(fileId: string): Promise<string> {
  try {
    const accessToken = sessionStorage.getItem('dropbox_token')
    if (!accessToken) {
      throw new Error('Dropbox API not initialized')
    }

    const response = await fetch('https://api.dropboxapi.com/2/files/get_temporary_link', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: fileId,
      }),
    })

    if (!response.ok) {
      throw new Error(`Dropbox API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.link
  } catch (err) {
    console.error('Failed to get Dropbox file URL:', err)
    return ''
  }
}

/**
 * Download image from URL and convert to base64
 */
export async function downloadImageAsBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
    })

    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`)
    }

    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (err) {
    console.error('Failed to download image:', err)
    return ''
  }
}

/**
 * Import costume from cloud file
 */
export async function importCostumeFromCloudFile(
  file: CloudFile,
  costumeName: string,
  metadata: {
    colors: string[]
    tone: string
    pattern: string
    season: string[]
  }
): Promise<{
  name: string
  image: string
  colors: string[]
  tone: string
  pattern: string
  season: string[]
}> {
  try {
    const imageBase64 = await downloadImageAsBase64(file.url)

    return {
      name: costumeName || file.name,
      image: imageBase64,
      colors: metadata.colors,
      tone: metadata.tone,
      pattern: metadata.pattern,
      season: metadata.season,
    }
  } catch (err) {
    console.error('Failed to import costume from cloud file:', err)
    throw err
  }
}

/**
 * Batch import costumes from cloud files
 */
export async function batchImportCostumes(
  files: CloudFile[],
  defaultMetadata: {
    colors: string[]
    tone: string
    pattern: string
    season: string[]
  }
): Promise<
  Array<{
    name: string
    image: string
    colors: string[]
    tone: string
    pattern: string
    season: string[]
  }>
> {
  const costumes = []

  for (const file of files) {
    try {
      const costume = await importCostumeFromCloudFile(file, file.name, defaultMetadata)
      costumes.push(costume)
    } catch (err) {
      console.error(`Failed to import ${file.name}:`, err)
    }
  }

  return costumes
}

/**
 * Authorize Google Drive
 */
export async function authorizeGoogleDrive(): Promise<string> {
  return new Promise((resolve, reject) => {
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID
    if (!clientId) {
      reject(new Error('Google Client ID not configured'))
      return
    }

    const scope = 'https://www.googleapis.com/auth/drive.readonly'
    const redirectUri = `${window.location.origin}/oauth/google-drive-callback`

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'token',
      scope: scope,
    }).toString()}`

    const popup = window.open(authUrl, 'google-drive-auth', 'width=500,height=600')

    const checkPopup = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkPopup)
        reject(new Error('Authorization cancelled'))
      }
    }, 1000)
  })
}

/**
 * Authorize Google Photos
 */
export async function authorizeGooglePhotos(): Promise<string> {
  return new Promise((resolve, reject) => {
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID
    if (!clientId) {
      reject(new Error('Google Client ID not configured'))
      return
    }

    const scope = 'https://www.googleapis.com/auth/photoslibrary.readonly'
    const redirectUri = `${window.location.origin}/oauth/google-photos-callback`

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'token',
      scope: scope,
    }).toString()}`

    const popup = window.open(authUrl, 'google-photos-auth', 'width=500,height=600')

    const checkPopup = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkPopup)
        reject(new Error('Authorization cancelled'))
      }
    }, 1000)
  })
}

/**
 * Authorize Dropbox
 */
export async function authorizeDropbox(): Promise<string> {
  return new Promise((resolve, reject) => {
    const clientId = process.env.REACT_APP_DROPBOX_CLIENT_ID
    if (!clientId) {
      reject(new Error('Dropbox Client ID not configured'))
      return
    }

    const redirectUri = `${window.location.origin}/oauth/dropbox-callback`

    const authUrl = `https://www.dropbox.com/oauth2/authorize?${new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'token',
      scope: 'files.metadata.read files.content.read',
    }).toString()}`

    const popup = window.open(authUrl, 'dropbox-auth', 'width=500,height=600')

    const checkPopup = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkPopup)
        reject(new Error('Authorization cancelled'))
      }
    }, 1000)
  })
}
