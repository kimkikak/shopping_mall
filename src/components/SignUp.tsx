import { useState } from 'react';
import { X } from 'lucide-react';
import { signUp, type SignUpRequest } from '../services/api';

interface SignUpProps {
  onClose: () => void;
  onSignUpSuccess: (username: string, userId: number) => void;
  onSwitchToLogin: () => void;
}

export default function SignUp({ onClose, onSignUpSuccess, onSwitchToLogin }: SignUpProps) {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    passwordConfirm: '',
    firstname: '',
    lastname: '',
    city: '',
    street: '',
    number: '',
    zipcode: '',
    phone: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 전화번호 포맷팅 (000-0000-0000)
  const formatPhoneNumber = (value: string): string => {
    // 숫자만 추출
    const numbers = value.replace(/\D/g, '');
    
    // 최대 11자리까지만 허용
    const limitedNumbers = numbers.slice(0, 11);
    
    // 포맷팅 적용
    if (limitedNumbers.length <= 3) {
      return limitedNumbers;
    } else if (limitedNumbers.length <= 7) {
      return `${limitedNumbers.slice(0, 3)}-${limitedNumbers.slice(3)}`;
    } else {
      return `${limitedNumbers.slice(0, 3)}-${limitedNumbers.slice(3, 7)}-${limitedNumbers.slice(7)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData({
      ...formData,
      phone: formatted
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 비밀번호 확인 검증
    if (formData.password !== formData.passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    // 비밀번호 최소 길이 검증
    if (formData.password.length < 4) {
      setError('비밀번호는 최소 4자 이상이어야 합니다.');
      return;
    }

    // 필수 필드 검증 (공백 제거 후 검증)
    const trimmedEmail = (formData.email || '').trim();
    const trimmedUsername = (formData.username || '').trim();
    const trimmedFirstname = (formData.firstname || '').trim();
    const trimmedLastname = (formData.lastname || '').trim();
    
    const missingFields: string[] = [];
    if (!trimmedEmail) missingFields.push('이메일');
    if (!trimmedUsername) missingFields.push('사용자명');
    if (!trimmedFirstname) missingFields.push('이름');
    if (!trimmedLastname) missingFields.push('성');
    
    if (missingFields.length > 0) {
      setError(`다음 필드를 입력해주세요: ${missingFields.join(', ')}`);
      return;
    }

    // 주소 필드 검증
    if (!formData.city.trim() || !formData.street.trim() || !formData.number.trim() || !formData.zipcode.trim()) {
      setError('주소 정보를 모두 입력해주세요.');
      return;
    }

    // 전화번호 검증
    const phoneNumber = formData.phone.replace(/-/g, '');
    if (phoneNumber.length < 10) {
      setError('전화번호를 올바르게 입력해주세요.');
      return;
    }
    setLoading(true);

    try {
      // 전화번호에서 하이픈 제거 (이미 위에서 검증됨)
      const phoneNumber = formData.phone.replace(/-/g, '');
      
      const userData: SignUpRequest = {
        email: trimmedEmail,
        username: trimmedUsername,
        password: formData.password,
        name: {
          firstname: trimmedFirstname,
          lastname: trimmedLastname
        },
        address: {
          city: formData.city.trim(),
          street: formData.street.trim(),
          number: parseInt(formData.number) || 0,
          zipcode: formData.zipcode.trim(),
          geolocation: {
            lat: '0',
            long: '0'
          }
        },
        phone: phoneNumber
      };

      const result = await signUp(userData);
      
      // 성공 메시지 표시
      alert('회원가입이 완료되었습니다! 자동으로 로그인됩니다.');
      
      // FakeStoreAPI는 실제로 사용자를 저장하지 않으므로
      // 회원가입 성공 시 자동으로 로그인 처리
      onSignUpSuccess(userData.username, result.id);
      onClose();
    } catch (err) {
      if (err instanceof Error) {
        const errorMessage = err.message || '회원가입에 실패했습니다. 다시 시도해주세요.';
        setError(errorMessage);
      } else {
        setError('회원가입에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
        <div className="w-full max-w-4xl mx-4 my-8 bg-white rounded-lg shadow-2xl">
          <div className="p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">회원가입</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form 
              onSubmit={handleSubmit} 
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
              noValidate
            >
              {/* 왼쪽: 사용자 정보 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">사용자 정보</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 text-gray-700">이름</label>
                    <input
                      type="text"
                      name="firstname"
                      value={formData.firstname}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="이름"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-gray-700">성</label>
                    <input
                      type="text"
                      name="lastname"
                      value={formData.lastname}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="성"
                    />
                  </div>
                </div>

                <div>
                  <label className="block mb-2 text-gray-700">이메일</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="이메일을 입력하세요"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-gray-700">사용자명</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="사용자명을 입력하세요"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-gray-700">비밀번호</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="비밀번호를 입력하세요"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-gray-700">비밀번호 확인</label>
                  <input
                    type="password"
                    name="passwordConfirm"
                    value={formData.passwordConfirm}
                    onChange={handleChange}
                    required
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formData.passwordConfirm && formData.password !== formData.passwordConfirm
                        ? 'border-red-500'
                        : 'border-gray-300'
                    }`}
                    placeholder="비밀번호를 다시 입력하세요"
                  />
                  {formData.passwordConfirm && formData.password !== formData.passwordConfirm && (
                    <p className="mt-1 text-sm text-red-600">비밀번호가 일치하지 않습니다.</p>
                  )}
                </div>

                <div>
                  <label className="block mb-2 text-gray-700">전화번호</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    required
                    maxLength={13}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="010-0000-0000"
                  />
                </div>
              </div>

              {/* 오른쪽: 주소 정보 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">주소 정보</h3>
                
                <div>
                  <label className="block mb-2 text-gray-700">도시</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="도시"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-gray-700">거리</label>
                  <input
                    type="text"
                    name="street"
                    value={formData.street}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="거리 주소"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 text-gray-700">건물 번호</label>
                    <input
                      type="text"
                      name="number"
                      value={formData.number}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="번호"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-gray-700">우편번호</label>
                    <input
                      type="text"
                      name="zipcode"
                      value={formData.zipcode}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="우편번호"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="col-span-1 md:col-span-2 p-3 text-sm text-red-800 bg-red-100 rounded-lg">
                  {error}
                </div>
              )}

              <div className="col-span-1 md:col-span-2">
                <button
                  type="submit"
                  disabled={loading}
                onClick={() => {}}
                  className="w-full py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? '가입 중...' : '회원가입'}
                </button>
              </div>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={onSwitchToLogin}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                이미 계정이 있으신가요? 로그인
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

