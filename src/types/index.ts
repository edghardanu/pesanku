// ============================================================
//  src/types/index.ts
//  Shared TypeScript types untuk seluruh project Pesanku
// ============================================================

export interface SellerProfile {
  id?: string;
  userId?: string;
  storeName?: string | null;
  address?: string | null;
  category?: string | null;
  bankAccount?: string | null;
  ipaymuVa?: string | null;
  logoUrl?: string | null;
  description?: string | null;
  phone?: string | null;
  approvalStatus?: string | null;
}

export interface OrderItem {
  id: string;
  buyerId?: string;
  sellerId?: string;
  productId?: string;
  qty: number;
  minOrderQty?: number | null;
  totalPrice: number;
  status: string | null;
  notes?: string | null;
  selectedVariant?: string | null;
  selectedVariantPrice?: number | null;
  adminSplitAmount?: number | null;
  sellerSplitAmount?: number | null;
  createdAt?: string | Date | null;
  paymentProofUrl?: string | null;
  proofUrl?: string | null;
  deliveryProofUrl?: string | null;
  dispatchReceiptUrl?: string | null;
  buyerName?: string;
  buyerPhone?: string | null;
  buyerAddress?: string | null;
  productName?: string;
  productPrice?: number;
  productImageUrl?: string | null;
  requestedDeliveryDate?: string | null;
  deliveryDate?: string | null;
  fulfillmentStatus?: 'scheduled' | 'preparing' | 'ready' | 'shipped' | 'delivered' | null;
  scheduleReason?: string | null;
  trackingNumber?: string | null;
  scheduleUpdatedAt?: string | null;
  deliveryAddress?: string | null;
  storeName?: string | null;
  cancelReason?: string | null;
  returnReason?: string | null;
  returnProofUrl?: string | null;
  returnDate?: string | Date | null;
  isRead?: boolean | null;
}

export interface UmkmItem {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  status: string | null;
  storeName?: string | null;
  address?: string | null;
  category?: string | null;
  createdAt?: string | Date | null;
}

export interface TicketItem {
  id: string;
  category: string;
  customCategory?: string | null;
  notes: string;
  status: string;
  createdAt?: string | Date | null;
  userName?: string;
  userPhone?: string;
  userRole?: string;
}

export interface PayoutItem {
  id: string;
  storeName: string;
  rekening: string;
  diajukan: string;
  potongan: string;
  total: string;
}

export interface VerificationItem {
  id: string;
  pembeli: string;
  totalBayar: string;
  waktu: string;
}

export type PromotionRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface PromotionOfferItem {
  id: string;
  name: string;
  price: number;
  expiresAt: string | Date;
  isActive: boolean | null;
  createdAt?: string | Date | null;
}

export interface PromotionRequestItem {
  id: string;
  promotionId: string;
  productId: string;
  sellerId: string;
  status: PromotionRequestStatus | null;
  requestedAt?: string | Date | null;
  reviewedAt?: string | Date | null;
  offerName: string;
  offerPrice: number;
  expiresAt: string | Date;
  productName: string;
  storeName?: string | null;
}

export interface ChatMessage {
  id?: string;
  role?: string;
  sender?: string;
  senderId?: string;
  text: string;
  time?: string;
  createdAt?: string | null;
  isRead?: boolean;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  address?: string | null;
  profileImageUrl?: string | null;
}

export interface ProductVariant {
  name: string;
  price?: number | null;
}

export interface ProductItem {
  id: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  description?: string | null;
  status?: string | null;
  currentQty?: number | null;
  preorderMinQty?: number | null;
  minQty?: number | null;
  minOrderQty?: number | null;
  maxOrderQty?: number | null;
  deadlineDate?: Date | string | null;
  processingTime?: string | null;
  batchCategory?: string | null;
  sellerId?: string;
  createdAt?: Date | string | null;
  storeName?: string | null;
  sellerName?: string | null;
  sellerAddress?: string | null;
  storeAddress?: string | null;
  sellerLogoUrl?: string | null;
  sellerAvatar?: string | null;
  sellerApprovalStatus?: string | null;
  sellerPhone?: string | null;
  totalSold?: number;
  averageRating?: number | null;
  ratingCount?: number;
  variants?: ProductVariant[];
  isPromoted?: boolean;
  promotionLabel?: string | null;
  promotionExpiresAt?: Date | string | null;
}

export interface BuyerOrderViewItem {
  orderId: string;
  qty: number;
  totalPrice: number;
  status: string | null;
  notes?: string | null;
  selectedVariant?: string | null;
  selectedVariantPrice?: number | null;
  createdAt: string | Date | null;
  productId?: string;
  productName: string;
  productPrice?: number;
  productImageUrl?: string | null;
  storeName?: string | null;
  sellerId?: string;
  minQty?: number | null;
  maxQty?: number | null;
  processingTime?: string | null;
  paymentId?: string | null;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  paymentProofUrl?: string | null;
  deliveryProofUrl?: string | null;
  dispatchReceiptUrl?: string | null;
  trackingNumber?: string | null;
  deliveryDate?: string | Date | null;
  rating?: number | null;
  ratedAt?: string | Date | null;
  cancelReason?: string | null;
  returnReason?: string | null;
  returnProofUrl?: string | null;
  returnDate?: string | Date | null;
  unreadCount?: number;
  lastMessageAt?: string | Date | null;
  negotiationStatus?: 'approved' | 'rejected' | null;
}

export interface InvoiceOrder {
  id: string;
  status: string | null;
  qty: number;
  totalPrice: number;
  notes?: string | null;
  selectedVariant?: string | null;
  selectedVariantPrice?: number | null;
  createdAt: string | Date | null;
  productName: string;
  productPrice: number;
  buyerId?: string | null;
  sellerId?: string | null;
  sellerName?: string | null;
  sellerAddress?: string | null;
  buyerName?: string | null;
  buyerEmail?: string | null;
  buyerPhone?: string | null;
  buyerAddress?: string | null;
}
