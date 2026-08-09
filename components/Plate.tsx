import { formats, type Asset } from '@/lib/assets'

/**
 * Кадр в трёх форматах. AVIF первым: подложки почти чёрные, с плавными
 * переходами в тенях, и JPEG на таком материале даёт ступеньки — AVIF
 * держит градиент и весит вдвое меньше. WebP — для браузеров без AVIF,
 * JPEG остаётся последним рубежом.
 */
export default function Plate({
  asset,
  className,
  priority = false,
  ...rest
}: {
  asset: Asset
  className?: string
  priority?: boolean
} & React.ImgHTMLAttributes<HTMLImageElement>) {
  const f = formats(asset)
  return (
    <picture>
      <source srcSet={f.avif} type="image/avif" />
      <source srcSet={f.webp} type="image/webp" />
      <img
        className={className}
        src={f.jpg}
        alt={asset.alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        {...rest}
      />
    </picture>
  )
}
