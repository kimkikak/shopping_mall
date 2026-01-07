import { useState, useEffect, useCallback } from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { 
  fetchUserCart, 
  removeFromCart, 
  updateCartQuantity, 
  clearCart,
  fetchProductById,
  purchaseProduct,
  type Cart,
  type CartProduct 
} from '../services/api';
import type { Product } from '../types/product';

interface CartProps {
  userId: number;
  balance: number;
  onClose: () => void;
  onPurchase: (cart: Cart) => void;
  onBalanceUpdate: (newBalance: number) => void;
}

interface CartItem extends CartProduct {
  product?: Product;
}

export default function CartComponent({ userId, balance, onClose, onPurchase, onBalanceUpdate }: CartProps) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCart = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const cartData = await fetchUserCart(userId);
      setCart(cartData);

      if (cartData && cartData.products.length > 0) {
        // 각 상품의 상세 정보 가져오기 (사용자별 가격 적용)
        const productPromises = cartData.products.map(async (item) => {
          try {
            const product = await fetchProductById(item.productId, userId);
            if (product) {
              return {
                ...item,
                product
              };
            }
          } catch (err) {
            console.error(`상품 ${item.productId} 로드 실패:`, err);
          }
          return { ...item, product: undefined };
        });

        const items = await Promise.all(productPromises);
        // product가 있는 아이템만 필터링
        setCartItems(items.filter(item => item.product !== undefined));
      } else {
        setCartItems([]);
      }
    } catch (err) {
      setError('장바구니를 불러오는데 실패했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadCart();
    }
  }, [userId, loadCart]);

  const handleRemoveItem = async (productId: number) => {
    if (!cart) return;
    
    // 원본 데이터 백업 (에러 시 복구용)
    const originalCart = cart;
    const originalCartItems = [...cartItems];
    
    // 1. 로컬 state를 먼저 업데이트 (즉시 반영)
    const updatedProducts = cart.products.filter(p => p.productId !== productId);
    const updatedCart: Cart = {
      ...cart,
      products: updatedProducts,
      date: new Date().toISOString()
    };
    
    setCart(updatedCart);
    setCartItems(prevItems => prevItems.filter(item => item.productId !== productId));
    
    // 2. 백그라운드에서 API 호출
    try {
      await removeFromCart(userId, productId);
    } catch (err) {
      // 에러 발생 시 원래대로 되돌리기
      setCart(originalCart);
      setCartItems(originalCartItems);
      setError('상품 제거에 실패했습니다.');
      console.error(err);
    }
  };

  const handleUpdateQuantity = async (productId: number, newQuantity: number) => {
    if (!cart || newQuantity < 1) return;
    
    // 원본 데이터 백업 (에러 시 복구용)
    const originalCart = cart;
    const originalCartItems = [...cartItems];
    
    // 1. 로컬 state를 먼저 업데이트 (즉시 반영)
    const updatedProducts = cart.products.map(p => 
      p.productId === productId ? { ...p, quantity: newQuantity } : p
    );
    
    const updatedCart: Cart = {
      ...cart,
      products: updatedProducts,
      date: new Date().toISOString()
    };
    
    setCart(updatedCart);
    
    // cartItems도 즉시 업데이트
    setCartItems(prevItems => 
      prevItems.map(item => 
        item.productId === productId 
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
    
    // 2. 백그라운드에서 API 호출
    try {
      await updateCartQuantity(userId, productId, newQuantity);
    } catch (err) {
      // 에러 발생 시 원래대로 되돌리기
      setCart(originalCart);
      setCartItems(originalCartItems);
      setError('수량 변경에 실패했습니다.');
      console.error(err);
    }
  };

  const handleClearCart = async () => {
    if (!cart) return;
    
    try {
      setLoading(true);
      setError('');
      await clearCart(userId);
      setCart(null);
      setCartItems([]);
    } catch (err) {
      setError('장바구니 비우기에 실패했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseAll = async () => {
    if (!cart || cartItems.length === 0) return;

    // 총 금액 계산
    const totalPrice = calculateTotal();
    
    if (balance < totalPrice) {
      setError(`잔액이 부족합니다. (부족한 금액: ${(totalPrice - balance).toLocaleString()}원)`);
      return;
    }

    try {
      setLoading(true);
      setError('');

      // 각 상품을 순차적으로 구매
      for (const item of cartItems) {
        if (item.product) {
          await purchaseProduct(userId, item.product.id, item.quantity);
        }
      }

      // 장바구니 비우기
      await clearCart(userId);
      
      // 잔액 업데이트
      const newBalance = balance - totalPrice;
      onBalanceUpdate(newBalance);

      // 성공 메시지
      alert('구매가 완료되었습니다!');
      
      // 장바구니 닫기
      onClose();
      onPurchase(cart);
    } catch (err) {
      setError('구매 처리 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      if (item.product) {
        return total + (item.product.price * item.quantity);
      }
      return total;
    }, 0);
  };

  const totalPrice = calculateTotal();
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <div 
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />
      <div className="fixed top-0 right-0 z-50 w-full h-full max-w-md overflow-y-auto bg-white shadow-2xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-800">장바구니</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-gray-500">
              로딩 중...
            </div>
          ) : error ? (
            <div className="py-12 text-center text-red-500">
              {error}
            </div>
          ) : cartItems.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>장바구니가 비어있습니다.</p>
            </div>
          ) : (
            <>
              <div className="mb-6 space-y-4">
                {cartItems.map((item) => (
                  <div key={item.productId} className="flex gap-4 p-4 border border-gray-200 rounded-lg">
                    {item.product && (
                      <>
                        <div className="flex-shrink-0 w-20 h-20 overflow-hidden bg-gray-100 rounded-lg">
                          <img 
                            src={item.product.image} 
                            alt={item.product.name}
                            className="object-cover w-full h-full"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = 'https://via.placeholder.com/80x80?text=No+Image';
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="mb-1 font-semibold">{item.product.name}</h3>
                          <p className="mb-2 text-blue-600">
                            {(item.product.price * item.quantity).toLocaleString()}원
                          </p>
                          
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 border border-gray-300 rounded-lg">
                              <button
                                onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                                className="p-1 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={item.quantity <= 1}
                                aria-label="수량 감소"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  if (!isNaN(val) && val > 0) {
                                    handleUpdateQuantity(item.productId, val);
                                  }
                                }}
                                min="1"
                                className="w-16 px-2 py-1 text-center border-0 focus:outline-none"
                              />
                              <button
                                onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                                className="p-1 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="수량 증가"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                            <button
                              onClick={() => handleRemoveItem(item.productId)}
                              className="p-2 text-red-600 rounded-lg hover:bg-red-50"
                              aria-label="상품 삭제"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-4 mb-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-700">총 상품 수:</span>
                  <span className="font-semibold">{itemCount}개</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-semibold text-gray-800">총 금액:</span>
                  <span className="text-xl font-bold text-blue-600">
                    {totalPrice.toLocaleString()}원
                  </span>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-700">현재 잔액:</span>
                  <span className={balance >= totalPrice ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                    {balance.toLocaleString()}원
                  </span>
                </div>
                {balance < totalPrice && (
                  <div className="p-2 mb-2 text-sm text-red-600 rounded bg-red-50">
                    잔액이 부족합니다. (부족한 금액: {(totalPrice - balance).toLocaleString()}원)
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleClearCart}
                  className="flex-1 py-3 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  장바구니 비우기
                </button>
                <button
                  onClick={handlePurchaseAll}
                  disabled={loading || balance < totalPrice}
                  className="flex-1 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? '구매 중...' : '구매하기'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

