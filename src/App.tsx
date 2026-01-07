import { useState, useEffect, useCallback, useRef } from 'react';
import { ShoppingCart } from 'lucide-react';
import type { Product } from './types/product';
import { fetchProducts, fetchProductById, fetchBalance, purchaseProduct, fetchCategories, fetchProductsByCategory, resetAllBalances, resetAllPrices, migrateUserIds } from './services/api';
import BalanceDisplay from './components/BalanceDisplay';
import SearchBar from './components/SearchBar';
import CategoryFilter from './components/CategoryFilter';
import ProductSort, { type SortOption } from './components/ProductSort';
import ProductCard from './components/ProductCard';
import Pagination from './components/Pagination';
import ProductDetail from './components/ProductDetail';
import Login from './components/Login';
import SignUp from './components/SignUp';
import CartComponent from './components/Cart';
import LoadingSkeleton from './components/LoadingSkeleton';
import Toast from './components/Toast';
import { fetchUserCart } from './services/api';

const ITEMS_PER_PAGE = 8;

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [balance, setBalance] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState<string | null>(null); // token은 localStorage에 저장되지만 현재 코드에서 직접 사용되지 않음
  const [username, setUsername] = useState<string>('');
  const [userId, setUserId] = useState<number | null>(null); // 사용자 ID (로그인 시 설정)
  const [showLogin, setShowLogin] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>('default');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = selectedCategory
        ? await fetchProductsByCategory(selectedCategory, {
            page: currentPage,
            limit: ITEMS_PER_PAGE,
            search: searchQuery,
            userId: isLoggedIn && userId ? userId : undefined
          })
        : await fetchProducts({
            page: currentPage,
            limit: ITEMS_PER_PAGE,
            search: searchQuery,
            userId: isLoggedIn && userId ? userId : undefined
          });
      
      // 정렬 적용
      const sortedProducts = [...response.products];
      switch (sortOption) {
        case 'price-asc':
          sortedProducts.sort((a, b) => a.price - b.price);
          break;
        case 'price-desc':
          sortedProducts.sort((a, b) => b.price - a.price);
          break;
        case 'name-asc':
          sortedProducts.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
          break;
        default:
          // 기본 정렬 (ID 순) - 이미 API에서 정렬됨
          break;
      }
      
      setProducts(sortedProducts);
      setTotalPages(response.totalPages);
    } catch (err) {
      setError('상품을 불러오는데 실패했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, selectedCategory, sortOption, isLoggedIn, userId]);

  const loadBalance = useCallback(async () => {
    if (!isLoggedIn || !userId) return;
    try {
      const balanceData = await fetchBalance(userId);
      setBalance(balanceData);
    } catch (err) {
      console.error('잔액 조회 실패:', err);
    }
  }, [isLoggedIn, userId]);

  // 상품 목록 로딩
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // 페이지 로드 시 마이그레이션 및 초기화 (한 번만 실행)
  useEffect(() => {
    migrateUserIds(); // 기존 사용자들의 userId 재할당
    resetAllBalances();
    resetAllPrices(); // 환율 변경으로 인한 가격 데이터 초기화
  }, []);

  // 잔액 로딩 (로그인 상태와 userId 변경 시)
  useEffect(() => {
    if (isLoggedIn && userId) {
      loadBalance();
    } else {
      setBalance(0); // 로그아웃 시 잔액 초기화
    }
  }, [isLoggedIn, userId, loadBalance]);

  const handleProductClick = async (product: Product) => {
    // API에서 최신 상품 정보 가져오기
    try {
      const latestProduct = await fetchProductById(product.id, isLoggedIn && userId ? userId : undefined);
      if (latestProduct) {
        setSelectedProduct(latestProduct);
      } else {
        setSelectedProduct(product); // 실패 시 기존 정보 사용
      }
    } catch (err) {
      console.error('상품 정보 조회 실패:', err);
      setSelectedProduct(product); // 실패 시 기존 정보 사용
    }
    setQuantity(1);
    setMessage('');
  };

  const handleClose = () => {
    setSelectedProduct(null);
    setQuantity(1);
    setMessage('');
  };

  const handlePurchase = async () => {
    if (!selectedProduct) return;
    
    // 로그인 체크
    if (!isLoggedIn || !userId) {
      setMessage('구매하려면 로그인이 필요합니다.');
      setMessageType('error');
      setShowLogin(true);
      return;
    }
    
    try {
      const response = await purchaseProduct(userId, selectedProduct.id, quantity);
      
      if (response.success) {
        setBalance(response.newBalance);
        setMessage(response.message);
        setMessageType('success');
        setToast({ message: response.message, type: 'success' });
        setTimeout(() => {
          handleClose();
        }, 1500);
        // 잔액 업데이트 후 다시 로드
        await loadBalance();
      } else {
        setMessage(response.message);
        setMessageType('error');
        setToast({ message: response.message, type: 'error' });
      }
    } catch (err) {
      setMessage('구매 처리 중 오류가 발생했습니다.');
      setMessageType('error');
      console.error(err);
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    
    // 디바운싱: 500ms 후에 검색 실행
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      // 검색은 loadProducts에서 자동으로 실행됨
    }, 500);
  };

  const handleCategoryChange = (category: string | null) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  const handleSortChange = (option: SortOption) => {
    setSortOption(option);
    setCurrentPage(1);
  };

  const handleLoginSuccess = (authToken: string, userUsername: string, userUserId: number) => {
    setToken(authToken);
    setIsLoggedIn(true);
    setUsername(userUsername);
    setUserId(userUserId);
    localStorage.setItem('token', authToken);
    localStorage.setItem('username', userUsername);
    localStorage.setItem('userId', userUserId.toString());
    // 장바구니 아이템 수 업데이트
    loadCartItemCount();
  };

  const handleLogout = () => {
    setToken(null);
    setIsLoggedIn(false);
    setUsername('');
    setUserId(null);
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');
    setCartItemCount(0);
    setSelectedCategory(null);
  };

  const handleSignUpSuccess = (username: string, userId: number) => {
    // 회원가입 성공 시 자동 로그인 처리
    // FakeStoreAPI는 실제로 사용자를 저장하지 않으므로 로컬에서 관리
    const fakeToken = `fake_token_${Date.now()}_${userId}`;
    setToken(fakeToken);
    setIsLoggedIn(true);
    setUsername(username);
    setUserId(userId);
    localStorage.setItem('token', fakeToken);
    localStorage.setItem('username', username);
    localStorage.setItem('userId', userId.toString());
    setShowSignUp(false);
    // 장바구니 아이템 수 업데이트
    loadCartItemCount();
  };

  // 장바구니 아이템 수 로드
  const loadCartItemCount = useCallback(async () => {
    if (!isLoggedIn || !userId) return;
    
    try {
      const cart = await fetchUserCart(userId);
      if (cart) {
        const count = cart.products.reduce((sum, item) => sum + item.quantity, 0);
        setCartItemCount(count);
      } else {
        setCartItemCount(0);
      }
    } catch (err) {
      console.error('장바구니 아이템 수 조회 실패:', err);
    }
  }, [isLoggedIn, userId]);

  // 카테고리 목록 로드
  const loadCategories = useCallback(async () => {
    try {
      const cats = await fetchCategories();
      setCategories(cats);
    } catch (err) {
      console.error('카테고리 로드 실패:', err);
    }
  }, []);

  // 페이지 로드 시 토큰 확인
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUsername = localStorage.getItem('username');
    const savedUserId = localStorage.getItem('userId');
    if (savedToken && savedUsername) {
      setToken(savedToken);
      setIsLoggedIn(true);
      setUsername(savedUsername);
      if (savedUserId) {
        setUserId(parseInt(savedUserId, 10));
      }
    }
  }, []);
  
  // token이 변경되면 로그인 상태 동기화
  useEffect(() => {
    if (!token && isLoggedIn) {
      setIsLoggedIn(false);
    }
  }, [token, isLoggedIn]);

  // 카테고리 목록 로드
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // 로그인 상태 변경 시 장바구니 아이템 수 업데이트
  useEffect(() => {
    if (isLoggedIn) {
      loadCartItemCount();
    } else {
      setCartItemCount(0);
    }
  }, [isLoggedIn, loadCartItemCount]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b shadow-sm">
        <div className="px-4 py-4 mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-blue-600">쇼핑몰</h1>
            <div className="flex items-center gap-4">
              {isLoggedIn ? (
                <>
                  <span className="text-gray-700">{username || '사용자'}</span>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowLogin(true)}
                    className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    로그인
                  </button>
                  <button
                    onClick={() => setShowSignUp(true)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    회원가입
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-8 mx-auto max-w-7xl">
        {isLoggedIn && (
          <BalanceDisplay balance={balance}>
            <button
              onClick={() => setShowCart(true)}
              className="relative flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>장바구니</span>
              {cartItemCount > 0 && (
                <span className="absolute flex items-center justify-center w-5 h-5 text-xs text-white bg-red-500 rounded-full -top-2 -right-2">
                  {cartItemCount}
                </span>
              )}
            </button>
          </BalanceDisplay>
        )}

        <SearchBar searchQuery={searchQuery} onSearchChange={handleSearchChange} />

        <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
          />
          <ProductSort
            sortOption={sortOption}
            onSortChange={handleSortChange}
          />
        </div>

        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="py-12 text-center text-red-500">
            {error}
          </div>
        ) : products.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            검색 결과가 없습니다.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {products.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={handleProductClick}
                />
              ))}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>

      {selectedProduct && (
        <ProductDetail
          product={selectedProduct}
          quantity={quantity}
          balance={balance}
          message={message}
          messageType={messageType}
          isLoggedIn={isLoggedIn}
          onClose={handleClose}
          onQuantityChange={setQuantity}
          onPurchase={handlePurchase}
          onAddToCart={isLoggedIn && userId ? async () => {
            try {
              const { addToCart } = await import('./services/api');
              await addToCart(userId, selectedProduct.id, quantity);
              setMessage('장바구니에 추가되었습니다.');
              setMessageType('success');
              setToast({ message: '장바구니에 추가되었습니다.', type: 'success' });
              await loadCartItemCount();
              setTimeout(() => {
                handleClose();
              }, 1500);
            } catch (err) {
              setMessage('장바구니 추가에 실패했습니다.');
              setMessageType('error');
              setToast({ message: '장바구니 추가에 실패했습니다.', type: 'error' });
              console.error(err);
            }
          } : undefined}
        />
      )}

      {showLogin && (
        <Login
          onClose={() => setShowLogin(false)}
          onLoginSuccess={handleLoginSuccess}
          onSwitchToSignUp={() => {
            setShowLogin(false);
            setShowSignUp(true);
          }}
        />
      )}

      {showSignUp && (
        <SignUp
          onClose={() => setShowSignUp(false)}
          onSignUpSuccess={handleSignUpSuccess}
          onSwitchToLogin={() => {
            setShowSignUp(false);
            setShowLogin(true);
          }}
        />
      )}

      {showCart && isLoggedIn && userId && (
        <CartComponent
          userId={userId}
          balance={balance}
          onClose={() => {
            setShowCart(false);
            loadCartItemCount();
          }}
          onBalanceUpdate={(newBalance) => {
            setBalance(newBalance);
            loadBalance();
          }}
          onPurchase={() => {
            setShowCart(false);
            loadCartItemCount();
          }}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
