import type { Product } from '../types/product';

// 개발 모드 체크
const isDev = import.meta.env.DEV;

// 로그 헬퍼 함수
const log = (message: string, ...args: unknown[]) => {
  if (isDev) {
    console.log(message, ...args);
  }
};

const logError = (message: string, ...args: unknown[]) => {
  console.error(message, ...args);
};

export interface FetchProductsParams {
  page?: number;
  limit?: number;
  search?: string;
  userId?: number; // 사용자별 가격을 위해 추가
}

export interface FetchProductsResponse {
  products: Product[];
  total: number;
  totalPages: number;
}

/**
 * 기존 사용자들의 userId를 고유하게 재할당 (마이그레이션)
 */
export function migrateUserIds(): void {
  log('🔵 [마이그레이션] 사용자 ID 재할당 시작');
  
  try {
    const savedUsers = localStorage.getItem('registeredUsers');
    if (!savedUsers) {
      log('🟡 [마이그레이션] 저장된 사용자 없음');
      return;
    }
    
    const users = JSON.parse(savedUsers);
    if (users.length === 0) {
      log('🟡 [마이그레이션] 사용자 목록 비어있음');
      return;
    }
    
    // userId별로 그룹화하여 중복 확인
    interface UserInfo {
      id: number;
      username: string;
      password: string;
      email: string;
    }
    
    const userIdMap = new Map<number, Array<{ index: number; user: UserInfo }>>();
    users.forEach((user: UserInfo, index: number) => {
      if (!userIdMap.has(user.id)) {
        userIdMap.set(user.id, []);
      }
      userIdMap.get(user.id)!.push({ index, user });
    });
    
    // 중복된 userId가 있는지 확인
    let hasDuplicates = false;
    let nextUserId = 1000;
    
    // 기존 사용자들의 최대 id 찾기
    const existingMaxId = Math.max(...users.map((u: UserInfo) => u.id || 0));
    if (existingMaxId >= 1000) {
      nextUserId = existingMaxId + 1;
    }
    
    // 중복된 userId를 가진 사용자들 재할당
    const updatedUsers = [...users];
    const cartMigrations: Array<{ oldKey: string; newKey: string; userId: number }> = [];
    
    userIdMap.forEach((userList, oldUserId) => {
      if (userList.length > 1) {
        // 중복된 userId 발견
        hasDuplicates = true;
        log(`🔵 [마이그레이션] 중복 userId 발견: ${oldUserId} (${userList.length}명)`);
        
        // 첫 번째 사용자는 기존 id 유지, 나머지는 새 id 할당
        userList.forEach((item, idx) => {
          if (idx === 0) {
            // 첫 번째 사용자는 기존 id 유지
            log(`🟢 [마이그레이션] 사용자 "${item.user.username}" userId 유지: ${oldUserId}`);
          } else {
            // 나머지 사용자는 새 id 할당
            const newUserId = nextUserId++;
            (updatedUsers[item.index] as UserInfo).id = newUserId;
            log(`🟢 [마이그레이션] 사용자 "${item.user.username}" userId 변경: ${oldUserId} -> ${newUserId}`);
            
            // 장바구니 마이그레이션 정보 저장
            cartMigrations.push({
              oldKey: `cart_${oldUserId}`,
              newKey: `cart_${newUserId}`,
              userId: newUserId
            });
          }
        });
      } else if (oldUserId < 1000 && oldUserId > 0) {
        // userId가 1-999 범위인 경우 1000 이상으로 변경
        const newUserId = nextUserId++;
        (updatedUsers[userList[0].index] as UserInfo).id = newUserId;
        log(`🟢 [마이그레이션] 사용자 "${userList[0].user.username}" userId 변경: ${oldUserId} -> ${newUserId}`);
        
        cartMigrations.push({
          oldKey: `cart_${oldUserId}`,
          newKey: `cart_${newUserId}`,
          userId: newUserId
        });
      }
    });
    
    // 사용자 정보 업데이트
    if (hasDuplicates || cartMigrations.length > 0) {
      localStorage.setItem('registeredUsers', JSON.stringify(updatedUsers));
      log('🟢 [마이그레이션] 사용자 정보 업데이트 완료');
      
      // 장바구니 데이터 마이그레이션
      cartMigrations.forEach(({ oldKey, newKey, userId }) => {
        const oldCart = localStorage.getItem(oldKey);
        if (oldCart) {
          try {
            const cart = JSON.parse(oldCart);
            // userId 업데이트
            cart.userId = userId;
            localStorage.setItem(newKey, JSON.stringify(cart));
            // 기존 장바구니 삭제
            localStorage.removeItem(oldKey);
            log(`🟢 [마이그레이션] 장바구니 마이그레이션: ${oldKey} -> ${newKey}`);
          } catch (err) {
            logError('장바구니 마이그레이션 실패:', err);
          }
        }
      });
      
      log(`🟢 [마이그레이션] ${cartMigrations.length}개 장바구니 마이그레이션 완료`);
    } else {
      log('🟢 [마이그레이션] 중복 없음, 마이그레이션 불필요');
    }
  } catch (error) {
    logError('🔴 [마이그레이션] 사용자 ID 재할당 실패:', error);
  }
}

/**
 * 모든 사용자 가격 데이터 초기화 (환율 변경 시 사용)
 */
export function resetAllPrices(): void {
  log('🔵 [로컬] 모든 사용자 가격 데이터 초기화 시작');
  
  // 로컬 스토리지에서 price_로 시작하는 모든 키 찾기
  const keysToDelete: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('price_')) {
      keysToDelete.push(key);
    }
  }
  
  // 모든 가격 데이터 삭제 (최신 환율로 재계산되도록)
  keysToDelete.forEach(key => {
    localStorage.removeItem(key);
  });
  
  log(`🟢 [로컬] ${keysToDelete.length}개 가격 데이터 삭제 완료`);
}

/**
 * 사용자별 가격 조회 (로컬 스토리지)
 */
function getUserPrice(userId: number, productId: number, basePrice: number): number {
  const priceKey = `price_${userId}_${productId}`;
  const savedPrice = localStorage.getItem(priceKey);
  
  // 저장된 가격이 있고, 현재 basePrice와 비슷한 범위인지 확인
  // (환율이 변경되었을 수 있으므로 basePrice의 0.5배 ~ 2배 범위 내에 있는지 확인)
  if (savedPrice) {
    const savedPriceNum = parseInt(savedPrice, 10);
    // 저장된 가격이 현재 basePrice와 너무 다르면 재계산 (환율 변경 감지)
    if (savedPriceNum >= basePrice * 0.5 && savedPriceNum <= basePrice * 2) {
      return savedPriceNum;
    }
    // 환율이 변경된 것으로 보이면 저장된 가격 삭제하고 재계산
    localStorage.removeItem(priceKey);
  }
  
  // 사용자별 할인율 적용 (모든 사용자 동일)
  const discountRate = 0; // 할인 없음 (모든 사용자 동일)
  const userPrice = Math.round(basePrice * (1 - discountRate));
  
  // 로컬 스토리지에 저장
  localStorage.setItem(priceKey, userPrice.toString());
  
  return userPrice;
}

/**
 * 상품 목록 조회 (FakeStoreAPI)
 */
export async function fetchProducts(params?: FetchProductsParams): Promise<FetchProductsResponse> {
  log('🔵 [API] 상품 목록 조회 요청:', params);
  
  try {
    // FakeStoreAPI에서 모든 상품 가져오기 (타임아웃 설정)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃
    
    const response = await fetch('https://fakestoreapi.com/products', {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`상품 목록 조회 실패: ${response.status} ${response.statusText}`);
    }

    const apiProducts = await response.json();
    
    // 응답이 배열인지 확인
    if (!Array.isArray(apiProducts)) {
      logError('🔴 [API] 상품 목록 응답 형식 오류:', apiProducts);
      return {
        products: [],
        total: 0,
        totalPages: 0
      };
    }
    
    // Product 타입에 맞게 변환
    interface ApiProduct {
      id: number;
      title: string;
      price: number;
      image: string;
      description: string;
      category?: string;
    }
    
    const userId = params?.userId;
    const basePriceMultiplier = 1000; // 달러를 원으로 변환 (1달러 = 1000원)
    
    let products: Product[] = (apiProducts as ApiProduct[]).map((p) => {
      const basePrice = Math.round(p.price * basePriceMultiplier);
      const finalPrice = userId ? getUserPrice(userId, p.id, basePrice) : basePrice;
      
      return {
        id: p.id,
        name: p.title,
        price: finalPrice,
        image: p.image,
        description: p.description,
        category: p.category
      };
    });

    // ID 순으로 정렬 (오름차순)
    products = products.sort((a, b) => a.id - b.id);

  // 검색 필터링
  if (params?.search) {
    const searchLower = params.search.toLowerCase();
      products = products.filter(product =>
        product.name.toLowerCase().includes(searchLower) ||
        product.description.toLowerCase().includes(searchLower)
    );
  }

    const total = products.length;
  const limit = params?.limit || 8;
  const page = params?.page || 1;
  const totalPages = Math.ceil(total / limit);

  // 페이지네이션
  const startIndex = (page - 1) * limit;
    const paginatedProducts = products.slice(startIndex, startIndex + limit);

    log('🟢 [API] 상품 목록 반환:', {
    products: paginatedProducts.length,
    total,
      totalPages
  });

  return {
    products: paginatedProducts,
    total,
    totalPages
  };
  } catch (error) {
    logError('🔴 [API] 상품 목록 조회 실패:', error);
    // 에러 발생 시 빈 결과 반환
    return {
      products: [],
      total: 0,
      totalPages: 0
    };
  }
}

/**
 * 단일 상품 조회 (FakeStoreAPI)
 */
export async function fetchProductById(productId: number, userId?: number): Promise<Product | null> {
  log('🔵 [API] 상품 조회 요청:', { productId, userId });
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃
    
    const response = await fetch(`https://fakestoreapi.com/products/${productId}`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('상품을 찾을 수 없습니다.');
      }
      throw new Error(`상품 조회 실패: ${response.status} ${response.statusText}`);
    }

    const apiProduct = await response.json();
    
    // 응답 형식 검증
    if (!apiProduct || typeof apiProduct.id !== 'number' || !apiProduct.title) {
      logError('🔴 [API] 상품 응답 형식 오류:', apiProduct);
      throw new Error('상품 정보 형식이 올바르지 않습니다.');
    }
    
    // Product 타입에 맞게 변환
    const basePrice = Math.round(apiProduct.price * 1000); // 달러를 원으로 변환 (1달러 = 1000원)
    const finalPrice = userId ? getUserPrice(userId, apiProduct.id, basePrice) : basePrice;
    
    const product: Product = {
      id: apiProduct.id,
      name: apiProduct.title,
      price: finalPrice,
      image: apiProduct.image,
      description: apiProduct.description,
      category: apiProduct.category
    };

    log('🟢 [API] 상품 조회 성공');
    return product;
  } catch (error) {
    logError('🔴 [API] 상품 조회 실패:', error);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('요청 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.');
    }
    return null;
  }
}

/**
 * 모든 사용자 잔액 초기화 (500,000원으로 설정)
 */
export function resetAllBalances(): void {
  log('🔵 [로컬] 모든 사용자 잔액 초기화 시작');
  
  // 로컬 스토리지에서 balance_로 시작하는 모든 키 찾기
  const keysToUpdate: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('balance_')) {
      keysToUpdate.push(key);
    }
  }
  
  // 모든 잔액을 500,000원으로 설정
  keysToUpdate.forEach(key => {
    localStorage.setItem(key, '500000');
  });
  
  log(`🟢 [로컬] ${keysToUpdate.length}개 사용자 잔액 초기화 완료`);
}

/**
 * 잔액 조회 (로컬 스토리지 기반)
 * FakeStoreAPI에는 잔액 기능이 없으므로 로컬 스토리지 사용
 */
export async function fetchBalance(userId: number): Promise<number> {
  log('🔵 [로컬] 잔액 조회 요청:', userId);
  const balanceKey = `balance_${userId}`;
  const savedBalance = localStorage.getItem(balanceKey);
  const balance = savedBalance ? parseInt(savedBalance, 10) : 500000; // 기본 보유 잔액: 500,000원
  log('🟢 [로컬] 잔액 반환:', balance);
  return balance;
}

/**
 * 상품 구매 (목데이터)
 */
export interface PurchaseRequest {
  productId: number;
  quantity: number;
}

export interface PurchaseResponse {
  success: boolean;
  message: string;
  newBalance: number;
}

export async function purchaseProduct(
  userId: number,
  productId: number,
  quantity: number
): Promise<PurchaseResponse> {
  log('🔵 [로컬] 구매 요청:', { userId, productId, quantity });

  // 상품 정보 가져오기 (사용자별 가격 적용)
  const product = await fetchProductById(productId, userId);
  if (!product) {
    const currentBalance = await fetchBalance(userId);
    return {
      success: false,
      message: '상품을 찾을 수 없습니다.',
      newBalance: currentBalance
    };
  }

  const currentBalance = await fetchBalance(userId);
  const totalPrice = product.price * quantity;

  if (currentBalance >= totalPrice) {
    const newBalance = currentBalance - totalPrice;
    const balanceKey = `balance_${userId}`;
    localStorage.setItem(balanceKey, newBalance.toString());
    log('🟢 [로컬] 구매 성공, 새 잔액:', newBalance);
    return {
      success: true,
      message: '구매 성공!',
      newBalance: newBalance
    };
  } else {
    log('🔴 [로컬] 구매 실패: 잔액 부족');
    return {
      success: false,
      message: `잔액이 부족합니다. (부족한 금액: ${(totalPrice - currentBalance).toLocaleString()}원)`,
      newBalance: currentBalance
    };
  }
}

/**
 * 로그인 (FakeStoreAPI)
 */
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  userId?: number; // 선택적 userId (회원가입한 사용자의 경우)
}

export interface User {
  id: number;
  email: string;
  username: string;
  name: {
    firstname: string;
    lastname: string;
  };
  address: {
    city: string;
    street: string;
    number: number;
    zipcode: string;
    geolocation: {
      lat: string;
      long: string;
    };
  };
  phone: string;
}

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  log('🔵 [API] 로그인 요청:', credentials.username);
  
  // 로컬 스토리지에서 사용자 정보 확인 (회원가입한 사용자)
  const savedUsers = localStorage.getItem('registeredUsers');
  if (savedUsers) {
    const users = JSON.parse(savedUsers);
    const user = users.find((u: { username: string; password: string }) => 
      u.username === credentials.username && u.password === credentials.password
    );
    
    if (user) {
      // 로컬에 저장된 사용자로 로그인 성공
      const fakeToken = `fake_token_${Date.now()}_${user.id}`;
      log('🟢 [로컬] 로그인 성공 (회원가입한 사용자)');
      return { token: fakeToken, userId: user.id };
    }
  }
  
  // FakeStoreAPI 로그인 시도
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃
    
    const response = await fetch('https://fakestoreapi.com/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('사용자명 또는 비밀번호가 올바르지 않습니다.');
      }
      throw new Error(`로그인 실패: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // FakeStoreAPI는 token만 반환하므로 userId는 포함되지 않음
    // userId는 로컬 스토리지에서 찾거나 에러를 발생시켜야 함
    log('🟢 [API] 로그인 성공');
    
    // token만 반환 (userId는 없음)
    const token = data.token || data;
    if (typeof token !== 'string') {
      throw new Error('로그인 응답 형식이 올바르지 않습니다.');
    }
    
    // userId는 로컬 스토리지에서 찾아야 하므로 여기서는 반환하지 않음
    return { token };
  } catch (error) {
    logError('🔴 [API] 로그인 실패:', error);
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('요청 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.');
      }
      throw error;
    }
    throw new Error('로그인 중 오류가 발생했습니다.');
  }
}

/**
 * 사용자 정보 조회
 */
export async function fetchUser(userId: number): Promise<User | null> {
  log('🔵 [API] 사용자 정보 조회:', userId);
  
  try {
    const response = await fetch(`https://fakestoreapi.com/users/${userId}`);
    
    if (!response.ok) {
      throw new Error('사용자 정보 조회 실패');
    }

    const user = await response.json();
    log('🟢 [API] 사용자 정보 조회 성공');
    return user;
  } catch (error) {
    logError('🔴 [API] 사용자 정보 조회 실패:', error);
    return null;
  }
}

/**
 * 회원가입 (FakeStoreAPI)
 */
export interface SignUpRequest {
  email: string;
  username: string;
  password: string;
  name: {
    firstname: string;
    lastname: string;
  };
  address: {
    city: string;
    street: string;
    number: number;
    zipcode: string;
    geolocation: {
      lat: string;
      long: string;
    };
  };
  phone: string;
}

export interface SignUpResponse {
  id: number;
  email: string;
  username: string;
  name: {
    firstname: string;
    lastname: string;
  };
  address: {
    city: string;
    street: string;
    number: number;
    zipcode: string;
    geolocation: {
      lat: string;
      long: string;
    };
  };
  phone: string;
}

export async function signUp(userData: SignUpRequest): Promise<SignUpResponse> {
  log('🔵 [API] 회원가입 요청:', userData.username);
  log('🔵 [API] 회원가입 데이터:', JSON.stringify(userData, null, 2));
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃
    
    const response = await fetch('https://fakestoreapi.com/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    log('🔵 [API] 응답 상태:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      logError('🔴 [API] 회원가입 실패 응답:', errorText);
      if (response.status === 400) {
        throw new Error('입력한 정보가 올바르지 않습니다. 모든 필드를 확인해주세요.');
      }
      throw new Error(`회원가입 실패: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // 응답 형식 검증
    if (!data || typeof data.id !== 'number') {
      logError('🔴 [API] 회원가입 응답 형식 오류:', data);
      throw new Error('회원가입 응답 형식이 올바르지 않습니다.');
    }
    
    log('🟢 [API] 회원가입 성공:', data);
    
    // 로컬 스토리지에 사용자 정보 저장 (나중에 로그인할 수 있도록)
    try {
      const savedUsers = localStorage.getItem('registeredUsers');
      const users = savedUsers ? JSON.parse(savedUsers) : [];
      
      // 고유한 userId 생성 (기존 사용자들의 최대 id + 1 또는 타임스탬프 기반)
      let newUserId: number;
      if (users.length > 0) {
        // 기존 사용자들의 최대 id 찾기
        const maxId = Math.max(...users.map((u: { id: number }) => u.id));
        newUserId = maxId + 1;
      } else {
        // 첫 사용자는 1000부터 시작 (FakeStoreAPI 테스트 계정과 겹치지 않도록)
        newUserId = 1000;
      }
      
      users.push({
        id: newUserId,
        username: userData.username,
        password: userData.password,
        email: userData.email
      });
      localStorage.setItem('registeredUsers', JSON.stringify(users));
      log('🟢 [로컬] 사용자 정보 저장 완료, 생성된 userId:', newUserId);
      
      // 반환 데이터에 로컬에서 생성한 userId 사용
      return {
        ...data,
        id: newUserId
      };
    } catch (storageError) {
      logError('로컬 스토리지 저장 실패:', storageError);
      // 저장 실패 시에도 API 응답 반환
      return data;
    }
  } catch (error) {
    logError('🔴 [API] 회원가입 실패:', error);
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('요청 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.');
      }
      throw new Error(error.message);
    }
    throw new Error('회원가입 중 오류가 발생했습니다.');
  }
}

/**
 * 카테고리 관련 API
 */
export async function fetchCategories(): Promise<string[]> {
  log('🔵 [API] 카테고리 목록 조회 요청');
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃
    
    const response = await fetch('https://fakestoreapi.com/products/categories', {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`카테고리 목록 조회 실패: ${response.status} ${response.statusText}`);
    }

    const categories = await response.json();
    
    // 응답이 배열인지 확인
    if (!Array.isArray(categories)) {
      logError('🔴 [API] 카테고리 응답 형식 오류:', categories);
      return [];
    }
    
    log('🟢 [API] 카테고리 목록 조회 성공');
    return categories;
  } catch (error) {
    logError('🔴 [API] 카테고리 목록 조회 실패:', error);
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('요청 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.');
      }
      throw error;
    }
    return [];
  }
}

/**
 * 카테고리별 상품 조회
 */
export async function fetchProductsByCategory(
  category: string,
  params?: FetchProductsParams
): Promise<FetchProductsResponse> {
  log('🔵 [API] 카테고리별 상품 조회 요청:', category);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(`https://fakestoreapi.com/products/category/${category}`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`카테고리별 상품 조회 실패: ${response.status} ${response.statusText}`);
    }

    const apiProducts = await response.json();
    
    // 응답이 배열인지 확인
    if (!Array.isArray(apiProducts)) {
      logError('🔴 [API] 카테고리별 상품 응답 형식 오류:', apiProducts);
      return {
        products: [],
        total: 0,
        totalPages: 0
      };
    }
    
    // Product 타입에 맞게 변환
    interface ApiProduct {
      id: number;
      title: string;
      price: number;
      image: string;
      description: string;
      category?: string;
    }
    
    const userId = params?.userId;
    const basePriceMultiplier = 1000; // 달러를 원으로 변환 (1달러 = 1000원)
    
    let products: Product[] = (apiProducts as ApiProduct[]).map((p) => {
      const basePrice = Math.round(p.price * basePriceMultiplier);
      const finalPrice = userId ? getUserPrice(userId, p.id, basePrice) : basePrice;
      
      return {
        id: p.id,
        name: p.title,
        price: finalPrice,
        image: p.image,
        description: p.description,
        category: p.category
      };
    });

    // ID 순으로 정렬
    products = products.sort((a, b) => a.id - b.id);

    // 검색 필터링
    if (params?.search) {
      const searchLower = params.search.toLowerCase();
      products = products.filter(product =>
        product.name.toLowerCase().includes(searchLower) ||
        product.description.toLowerCase().includes(searchLower)
      );
    }

    const total = products.length;
    const limit = params?.limit || 8;
    const page = params?.page || 1;
    const totalPages = Math.ceil(total / limit);

    // 페이지네이션
    const startIndex = (page - 1) * limit;
    const paginatedProducts = products.slice(startIndex, startIndex + limit);

    log('🟢 [API] 카테고리별 상품 반환:', {
      category,
      products: paginatedProducts.length,
      total,
      totalPages
    });

    return {
      products: paginatedProducts,
      total,
      totalPages
    };
  } catch (error) {
    logError('🔴 [API] 카테고리별 상품 조회 실패:', error);
    return {
      products: [],
      total: 0,
      totalPages: 0
    };
  }
}

/**
 * 장바구니 관련 타입 및 API
 */
export interface CartProduct {
  productId: number;
  quantity: number;
}

export interface Cart {
  id: number;
  userId: number;
  date: string;
  products: CartProduct[];
}

export interface AddToCartRequest {
  userId: number;
  date: string;
  products: CartProduct[];
}

/**
 * 사용자의 장바구니 조회 (로컬 스토리지 사용)
 */
export async function fetchUserCart(userId: number): Promise<Cart | null> {
  log('🔵 [로컬] 장바구니 조회 요청:', userId);
  
  try {
    // 로컬 스토리지에서 장바구니 조회
    const cartKey = `cart_${userId}`;
    const savedCart = localStorage.getItem(cartKey);
    
    if (savedCart) {
      const cart: Cart = JSON.parse(savedCart);
      log('🟢 [로컬] 장바구니 조회 성공');
      return cart;
    }
    
    log('🟡 [로컬] 장바구니 없음');
    return null;
  } catch (error) {
    logError('🔴 [로컬] 장바구니 조회 실패:', error);
    return null;
  }
}

/**
 * 장바구니에 상품 추가 (로컬 스토리지 사용)
 */
export async function addToCart(userId: number, productId: number, quantity: number): Promise<Cart> {
  log('🔵 [로컬] 장바구니에 상품 추가:', { userId, productId, quantity });
  
  try {
    // 기존 장바구니 조회
    const existingCart = await fetchUserCart(userId);
    
    let products: CartProduct[] = [];
    let cartId: number;
    
    if (existingCart) {
      cartId = existingCart.id;
      // 기존 장바구니에 상품이 있는지 확인
      const existingProductIndex = existingCart.products.findIndex(
        p => p.productId === productId
      );
      
      if (existingProductIndex >= 0) {
        // 기존 상품 수량 증가
        products = existingCart.products.map((p, index) => 
          index === existingProductIndex 
            ? { ...p, quantity: p.quantity + quantity }
            : p
        );
      } else {
        // 새 상품 추가
        products = [...existingCart.products, { productId, quantity }];
      }
    } else {
      // 새 장바구니 생성
      cartId = Date.now(); // 고유 ID 생성
      products = [{ productId, quantity }];
    }
    
    // 로컬 스토리지에 저장
    const cart: Cart = {
      id: cartId,
      userId,
      date: new Date().toISOString(),
      products
    };
    
    const cartKey = `cart_${userId}`;
    localStorage.setItem(cartKey, JSON.stringify(cart));
    
    log('🟢 [로컬] 장바구니 업데이트 성공');
    return cart;
  } catch (error) {
    logError('🔴 [로컬] 장바구니 추가 실패:', error);
    throw error;
  }
}

/**
 * 장바구니에서 상품 제거 (로컬 스토리지 사용)
 */
export async function removeFromCart(userId: number, productId: number): Promise<Cart> {
  log('🔵 [로컬] 장바구니에서 상품 제거:', { userId, productId });
  
  try {
    // 사용자별 장바구니 조회
    const cart = await fetchUserCart(userId);
    
    if (!cart) {
      throw new Error('장바구니를 찾을 수 없습니다.');
    }
    
    // 상품 제거
    const updatedProducts = cart.products.filter(p => p.productId !== productId);
    
    // 장바구니 업데이트
    const updatedCart: Cart = {
      ...cart,
      products: updatedProducts,
      date: new Date().toISOString()
    };
    
    const cartKey = `cart_${userId}`;
    localStorage.setItem(cartKey, JSON.stringify(updatedCart));
    
    log('🟢 [로컬] 장바구니에서 상품 제거 성공');
    return updatedCart;
  } catch (error) {
    logError('🔴 [로컬] 장바구니에서 상품 제거 실패:', error);
    throw error;
  }
}

/**
 * 장바구니 수량 업데이트 (로컬 스토리지 사용)
 */
export async function updateCartQuantity(userId: number, productId: number, quantity: number): Promise<Cart> {
  log('🔵 [로컬] 장바구니 수량 업데이트:', { userId, productId, quantity });
  
  try {
    // 사용자별 장바구니 조회
    const cart = await fetchUserCart(userId);
    
    if (!cart) {
      throw new Error('장바구니를 찾을 수 없습니다.');
    }
    
    // 수량 업데이트
    const updatedProducts = cart.products.map(p => 
      p.productId === productId ? { ...p, quantity } : p
    );
    
    // 장바구니 업데이트
    const updatedCart: Cart = {
      ...cart,
      products: updatedProducts,
      date: new Date().toISOString()
    };
    
    const cartKey = `cart_${userId}`;
    localStorage.setItem(cartKey, JSON.stringify(updatedCart));
    
    log('🟢 [로컬] 장바구니 수량 업데이트 성공');
    return updatedCart;
  } catch (error) {
    logError('🔴 [로컬] 장바구니 수량 업데이트 실패:', error);
    throw error;
  }
}

/**
 * 장바구니 전체 삭제 (로컬 스토리지 사용)
 */
export async function clearCart(userId: number): Promise<void> {
  log('🔵 [로컬] 장바구니 전체 삭제:', userId);
  
  try {
    // 로컬 스토리지에서 삭제
    const cartKey = `cart_${userId}`;
    localStorage.removeItem(cartKey);
    
    log('🟢 [로컬] 장바구니 삭제 성공');
  } catch (error) {
    logError('🔴 [로컬] 장바구니 삭제 실패:', error);
    throw error;
  }
}

/**
 * 장바구니를 비우고 새 상품만 추가 (기존 장바구니 교체, 로컬 스토리지 사용)
 */
export async function replaceCart(userId: number, productId: number, quantity: number): Promise<Cart> {
  log('🔵 [로컬] 장바구니 교체:', { userId, productId, quantity });
  
  try {
    // 기존 장바구니 조회
    const existingCart = await fetchUserCart(userId);
    
    let cartId: number;
    
    if (existingCart) {
      cartId = existingCart.id;
    } else {
      // 새 장바구니 ID 생성
      cartId = Date.now();
    }
    
    // 장바구니 교체 (새 상품만 포함)
    const cart: Cart = {
      id: cartId,
      userId,
      date: new Date().toISOString(),
      products: [{ productId, quantity }]
    };
    
    const cartKey = `cart_${userId}`;
    localStorage.setItem(cartKey, JSON.stringify(cart));
    
    log('🟢 [로컬] 장바구니 교체 성공');
    return cart;
  } catch (error) {
    logError('🔴 [로컬] 장바구니 교체 실패:', error);
    throw error;
  }
}

