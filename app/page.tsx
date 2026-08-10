import Hero from '@/components/Hero'
import HomeFlow from '@/components/home/HomeFlow'
import HomeMenu from '@/components/HomeMenu'

export default function Page() {
  return (
    <>
      <Hero />
      <HomeFlow />
      {/* бургер выходит только после обложки — на hero его нет */}
      <HomeMenu />
    </>
  )
}
