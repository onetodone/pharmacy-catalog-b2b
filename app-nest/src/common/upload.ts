import { BadRequestException } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { existsSync, mkdirSync } from 'fs'
import { extname, join } from 'path'
import { diskStorage } from 'multer'
import type { Request } from 'express'

const IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/webp'])

export function imageUpload(subdir: string) {
  const dest = join(process.cwd(), 'uploads', subdir)
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true })

  return {
    storage: diskStorage({
      destination: dest,
      filename: (_req: Request, file: Express.Multer.File, cb: (e: Error | null, name: string) => void) => {
        const ext = extname(file.originalname).toLowerCase() || '.jpg'
        cb(null, `${randomUUID()}${ext}`)
      },
    }),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req: Request, file: Express.Multer.File, cb: (e: Error | null, ok: boolean) => void) => {
      if (!IMAGE_MIME.has(file.mimetype)) {
        return cb(new BadRequestException('Only PNG, JPEG or WEBP images are allowed'), false)
      }
      cb(null, true)
    },
  }
}

export function relativeUploadPath(subdir: string, file: Express.Multer.File) {
  return `${subdir}/${file.filename}`
}
