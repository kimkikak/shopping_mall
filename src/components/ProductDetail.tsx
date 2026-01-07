import { X, Plus, Minus, ShoppingCart } from 'lucide-react';
import type { Product } from '../types/product';

interface ProductDetailProps {
  product: Product;
  quantity: number;
  balance: number;
  message: string;
  messageType: 'success' | 'error';
  isLoggedIn: boolean;
  onClose: () => void;
  onQuantityChange: (quantity: number) => void;
  onPurchase: () => void;
  onAddToCart?: () => void;
}

export default function ProductDetail({
  product,
  quantity,
  balance,
  message,
  messageType,
  isLoggedIn,
  onClose,
  onQuantityChange,
  onPurchase,
  onAddToCart
}: ProductDetailProps) {
  const totalPrice = product.price * quantity;
  const canAfford = balance >= totalPrice;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto">
        <div className="p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full"
            aria-label="닫기"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="mt-8">
            <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
              <img 
                src={product.image} 
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://via.placeholder.com/400x400?text=No+Image';
                }}
              />
            </div>

            <h2 className="mt-6 mb-2">{product.name}</h2>
            
            <p className="text-blue-600 font-semibold text-xl mb-4">{product.price.toLocaleString()}원</p>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700">{product.description}</p>
            </div>

            <div className="mb-6">
              <label className="block mb-2 text-gray-700">수량</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => quantity > 1 && onQuantityChange(quantity - 1)}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                  aria-label="수량 감소"
                  disabled={quantity <= 1}
                >
                  <Minus className="w-5 h-5" />
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val > 0) {
                      onQuantityChange(val);
                    }
                  }}
                  min="1"
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center"
                />
                <button
                  onClick={() => onQuantityChange(quantity + 1)}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                  aria-label="수량 증가"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="mb-6 p-4 bg-gray-100 rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-gray-700">총 금액:</span>
                <span className="text-blue-600">{totalPrice.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">현재 잔액:</span>
                <span className={canAfford ? 'text-green-600' : 'text-red-600'}>
                  {balance.toLocaleString()}원
                </span>
              </div>
            </div>

            {message && (
              <div className={`mb-4 p-4 rounded-lg ${
                messageType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {message}
              </div>
            )}

            <div className="flex gap-3">
              {isLoggedIn && onAddToCart && (
                <button
                  onClick={onAddToCart}
                  className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  장바구니 담기
                </button>
              )}
              <button
                onClick={onPurchase}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                예 (구매)
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

