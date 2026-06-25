const FILE_URL_PREFIX = 'file://'
const WINDOWS_DRIVE_PATH = /^[A-Za-z]:\//

const encodeSegment = (segment: string) => encodeURIComponent(segment)

const encodePath = (path: string) =>
  path
    .split('/')
    .map((segment, index) => {
      if (index === 0 && /^[A-Za-z]:$/.test(segment)) {
        return segment
      }
      return encodeSegment(segment)
    })
    .join('/')

export const toFileUrl = (localPath: string): string => {
  if (localPath.startsWith(FILE_URL_PREFIX)) {
    return localPath
  }

  const normalizedPath = localPath.replace(/\\/g, '/')

  if (normalizedPath.startsWith('//')) {
    const [host = '', ...pathSegments] = normalizedPath.replace(/^\/+/, '').split('/')
    const encodedPath = pathSegments.map(encodeSegment).join('/')
    return encodedPath ? `${FILE_URL_PREFIX}${encodeURIComponent(host)}/${encodedPath}` : `${FILE_URL_PREFIX}${host}`
  }

  if (WINDOWS_DRIVE_PATH.test(normalizedPath)) {
    return `${FILE_URL_PREFIX}/${encodePath(normalizedPath)}`
  }

  if (normalizedPath.startsWith('/')) {
    return `${FILE_URL_PREFIX}${encodePath(normalizedPath)}`
  }

  return `${FILE_URL_PREFIX}/${encodePath(normalizedPath)}`
}
