import { Prisma } from '@prisma/client';

type Obj = Record<string, unknown>;

const asObj = (value: unknown): Obj =>
  typeof value === 'object' && value !== null ? (value as Obj) : {};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const toNumber = (value: unknown): number => {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (value instanceof Prisma.Decimal) return value.toNumber();
  return Number(value);
};

const toOptionalNumber = (value: unknown): number | undefined => {
  if (value == null) return undefined;
  const n = toNumber(value);
  return Number.isFinite(n) ? n : undefined;
};

const toLower = (value: unknown): string => String(value).toLowerCase();

export const serializeUser = (value: unknown) => {
  const user = asObj(value);
  return {
    id: String(user.id ?? ''),
    username: String(user.username ?? ''),
    email: (user.email as string | null | undefined) ?? null,
    phone: (user.phone as string | null | undefined) ?? null,
    displayName: (user.displayName as string | null | undefined) ?? null,
    avatarMediaId: (user.avatarMediaId as string | null | undefined) ?? null,
    trustScore: (user.trustScore as number | undefined) ?? 100,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt ?? null,
  };
};

export const serializeTag = (value: unknown) => {
  const tag = asObj(value);
  return {
    id: String(tag.id ?? ''),
    name: String(tag.name ?? ''),
    category: toLower(tag.category),
  };
};

export const serializeLocation = (value: unknown) => {
  const location = asObj(value);
  return {
    id: String(location.id ?? ''),
    latitude: toNumber(location.latitude),
    longitude: toNumber(location.longitude),
    city: (location.city as string | null | undefined) ?? null,
    area: (location.area as string | null | undefined) ?? null,
    fullAddress: (location.fullAddress as string | null | undefined) ?? null,
    plusCode: (location.plusCode as string | null | undefined) ?? null,
  };
};

export const serializeVendor = (value: unknown, options?: { distanceMeters?: number }) => {
  const vendor = asObj(value);
  const tags = asArray(vendor.tags)
    .map((vt) => {
      const vtObj = asObj(vt);
      return vtObj.tag ?? vt;
    })
    .filter((t) => t != null)
    .map(serializeTag);

  const location = vendor.location ? serializeLocation(vendor.location) : undefined;

  return {
    id: String(vendor.id ?? ''),
    locationId: String(vendor.locationId ?? ''),
    name: String(vendor.name ?? ''),
    description: (vendor.description as string | null | undefined) ?? null,
    priceBand: (vendor.priceBand as string | null | undefined) ?? null,
    isVerified: Boolean(vendor.isVerified),
    status: vendor.status,
    popularityScore: toNumber(vendor.popularityScore),
    createdAt: vendor.createdAt,
    location,
    distanceMeters: options?.distanceMeters,
    tags: tags.length > 0 ? tags : undefined,
    operationalInfo: vendor.operationalInfo ?? null,
  };
};

export const serializeMenuItem = (value: unknown) => {
  const item = asObj(value);
  return {
    id: String(item.id ?? ''),
    vendorId: String(item.vendorId ?? ''),
    name: String(item.name ?? ''),
    description: (item.description as string | null | undefined) ?? null,
    priceMin: toOptionalNumber(item.priceMin),
    priceMax: toOptionalNumber(item.priceMax),
    currency: String(item.currency ?? 'INR'),
    isAvailable: Boolean(item.isAvailable),
    sortOrder: (item.sortOrder as number | undefined) ?? 0,
  };
};

export const serializeWalletTransaction = (value: unknown) => {
  const txn = asObj(value);
  return {
    id: String(txn.id ?? ''),
    walletId: String(txn.walletId ?? ''),
    amount: Number(txn.amount ?? 0),
    reason: toLower(txn.reason),
    referenceType: (txn.referenceType as string | null | undefined) ?? null,
    referenceId: (txn.referenceId as string | null | undefined) ?? null,
    createdAt: txn.createdAt,
  };
};

export const serializeVisit = (value: unknown) => {
  const visit = asObj(value);
  return {
    id: String(visit.id ?? ''),
    userId: String(visit.userId ?? ''),
    vendorId: String(visit.vendorId ?? ''),
    visitedAt: visit.visitedAt,
    isVerified: Boolean(visit.isVerified),
    verificationMethod: visit.verificationMethod ? toLower(visit.verificationMethod) : null,
  };
};

export const serializeChallenge = (challengeValue: unknown, progressValue?: unknown) => {
  const challenge = asObj(challengeValue);
  const progress = progressValue ? asObj(progressValue) : null;
  return {
    id: String(challenge.id ?? ''),
    title: String(challenge.title ?? ''),
    description: (challenge.description as string | null | undefined) ?? null,
    challengeType: toLower(challenge.challengeType),
    targetCount: Number(challenge.targetCount ?? 0),
    rewardPoints: Number(challenge.rewardPoints ?? 0),
    startsAt: challenge.startsAt ?? null,
    endsAt: challenge.endsAt ?? null,
    isActive: Boolean(challenge.isActive),
    progress: progress
      ? {
          currentCount: Number(progress.currentCount ?? 0),
          isCompleted: Boolean(progress.isCompleted),
          completedAt: progress.completedAt ?? null,
        }
      : null,
  };
};

export const serializeMedia = (value: unknown) => {
  const media = asObj(value);
  return {
    id: String(media.id ?? ''),
    uploaderId: String(media.uploaderId ?? ''),
    mediaType: toLower(media.mediaType),
    url: String(media.url ?? ''),
    thumbnailUrl: (media.thumbnailUrl as string | null | undefined) ?? null,
    moderationStatus: toLower(media.moderationStatus),
    createdAt: media.createdAt,
  };
};

export const serializeFeedPost = (value: unknown) => {
  const post = asObj(value);
  const author = post.author ? serializeUser(post.author) : null;
  const vendor = post.vendor ? serializeVendor(post.vendor) : null;

  const media = asArray(post.media)
    .map((pm) => {
      const pmObj = asObj(pm);
      return pmObj.media ?? pm;
    })
    .filter((m) => m != null)
    .map(serializeMedia);

  return {
    id: String(post.id ?? ''),
    authorId: String(post.authorId ?? ''),
    vendorId: post.vendorId ? String(post.vendorId) : null,
    postType: toLower(post.postType),
    body: (post.body as string | null | undefined) ?? null,
    likeCount: Number(post.likeCount ?? 0),
    commentCount: Number(post.commentCount ?? 0),
    status: toLower(post.status),
    createdAt: post.createdAt,
    author,
    vendor,
    media: media.length > 0 ? media : null,
    isLiked: (post.isLiked as boolean | null | undefined) ?? null,
    isSaved: (post.isSaved as boolean | null | undefined) ?? null,
  };
};

export const serializeComment = (value: unknown) => {
  const comment = asObj(value);
  return {
    id: String(comment.id ?? ''),
    postId: String(comment.postId ?? ''),
    authorId: String(comment.authorId ?? ''),
    body: String(comment.body ?? ''),
    createdAt: comment.createdAt,
    author: comment.author ? serializeUser(comment.author) : null,
  };
};
