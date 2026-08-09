import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { products, sellerProfiles, users } from "@/lib/schema";
import { ProductItem } from "@/types";
import { parseStoredProductVariants } from "@/lib/productVariants";

export async function getProductDetail(productId: string): Promise<ProductItem | undefined> {
  const product = await db
    .select({
      id: products.id,
      sellerId: products.sellerId,
      name: products.name,
      description: products.description,
      price: products.price,
      imageUrl: products.imageUrl,
      minQty: products.preorderMinQty,
      currentQty: products.currentQty,
      minOrderQty: products.minOrderQty,
      maxOrderQty: products.maxOrderQty,
      processingTime: products.processingTime,
      batchCategory: products.batchCategory,
      variantsJson: products.variantsJson,
      deadlineDate: products.deadlineDate,
      status: products.status,
      createdAt: products.createdAt,
      storeName: sellerProfiles.storeName,
      storeAddress: sellerProfiles.address,
      sellerAddress: sellerProfiles.address,
      sellerLogoUrl: sellerProfiles.logoUrl,
      sellerAvatar: sellerProfiles.logoUrl,
      sellerApprovalStatus: sellerProfiles.approvalStatus,
      sellerName: users.name,
    })
    .from(products)
    .innerJoin(users, eq(products.sellerId, users.id))
    .leftJoin(sellerProfiles, eq(users.id, sellerProfiles.userId))
    .where(eq(products.id, productId))
    .get();

  if (!product) return undefined;

  const { variantsJson, ...productDetail } = product;
  return {
    ...productDetail,
    variants: parseStoredProductVariants(variantsJson),
  };
}
