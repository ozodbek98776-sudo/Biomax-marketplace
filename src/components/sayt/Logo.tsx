import Link from 'next/link'
import { cn } from '@/lib/cn'

export default function Logo({ className, href = '/' }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      aria-label="BioMax — bosh sahifa"
      className={cn('flex items-baseline gap-px text-[21px] font-extrabold tracking-[-0.03em] text-siyoh lg:text-[23px]', className)}
    >
      <span>Bio</span>
      <span className="text-brend">Max</span>
    </Link>
  )
}
