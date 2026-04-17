import Image from "next/image";

import { cn } from "@/lib/utils";

const BRAND_ASSET_VERSION = "2026-04-17-transparent";

const BRAND_LOGOS = {
  primary: {
    src: `/brand/riwak-primary.png?v=${BRAND_ASSET_VERSION}`,
    width: 281,
    height: 195,
    alt: "Logo Riwak",
  },
  navbar: {
    src: `/brand/riwak-navbar.png?v=${BRAND_ASSET_VERSION}`,
    width: 239,
    height: 130,
    alt: "Logo Riwak compact",
  },
  icon: {
    src: `/brand/riwak-icon-only.png?v=${BRAND_ASSET_VERSION}`,
    width: 186,
    height: 145,
    alt: "Icone Riwak",
  },
} as const;

type BrandLogoVariant = keyof typeof BRAND_LOGOS;

export function BrandLogo({
  variant,
  className,
  priority = false,
  alt,
}: {
  variant: BrandLogoVariant;
  className?: string;
  priority?: boolean;
  alt?: string;
}) {
  const logo = BRAND_LOGOS[variant];

  return (
    <Image
      src={logo.src}
      alt={alt ?? logo.alt}
      width={logo.width}
      height={logo.height}
      priority={priority}
      unoptimized
      sizes="(max-width: 640px) 40vw, 240px"
      className={cn("h-auto w-auto object-contain", className)}
    />
  );
}
