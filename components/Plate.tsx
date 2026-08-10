import { formats, type Asset } from '@/lib/assets'

/**
 * Кадр в трёх форматах. AVIF первым: подложки почти чёрные, с плавными
 * переходами в тенях, и JPEG на таком материале даёт ступеньки — AVIF
 * держит градиент и весит вдвое меньше. WebP — для браузеров без AVIF,
 * JPEG остаётся последним рубежом.
 *
 * Если передан `mobile`, до 767 px браузер берёт его: у локаций это не
 * обрезанный десктопный кадр, а отдельный вертикальный снимок.
 */
export default function Plate({
  asset,
  mobile,
  className,
  priority = false,
  ...rest
}: {
  asset: Asset
  mobile?: Asset
  className?: string
  priority?: boolean
} & React.ImgHTMLAttributes<HTMLImageElement>) {
  const f = formats(asset)
  const m = mobile ? formats(mobile) : null
  return (
    <picture>
      {m && <source media="(max-width: 767px)" srcSet={m.avif} type="image/avif" />}
      {m && <source media="(max-width: 767px)" srcSet={m.webp} type="image/webp" />}
      {m && <source media="(max-width: 767px)" srcSet={m.jpg} />}
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
