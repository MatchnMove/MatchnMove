import { revalidateTag, unstable_cache } from "next/cache";

export const PUBLIC_SITE_TAG = "public-site";
export const PUBLIC_MOVERS_TAG = "public-movers";
export const ABOUT_PAGE_TAG = "about-page";
export const PUBLIC_SITE_REVALIDATE_SECONDS = 300;

export function cacheTaggedData<TArgs extends unknown[], TResult>(
  loader: (...args: TArgs) => Promise<TResult>,
  keyParts: string[],
  tags: string[],
) {
  return unstable_cache(loader, keyParts, {
    revalidate: PUBLIC_SITE_REVALIDATE_SECONDS,
    tags,
  });
}

export function cachePublicSite<TArgs extends unknown[], TResult>(
  loader: (...args: TArgs) => Promise<TResult>,
  keyParts: string[],
) {
  return cacheTaggedData(loader, keyParts, [PUBLIC_SITE_TAG]);
}

export function revalidatePublicMovers() {
  revalidateTag(PUBLIC_MOVERS_TAG, "max");
}

export function revalidateAboutPage() {
  revalidateTag(ABOUT_PAGE_TAG, "max");
}

export function revalidatePublicSite() {
  revalidateTag(PUBLIC_SITE_TAG, "max");
}
