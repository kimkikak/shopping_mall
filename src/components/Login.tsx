import { useState } from 'react';
import { X } from 'lucide-react';
import { login, type LoginRequest } from '../services/api';

interface LoginProps {
  onClose: () => void;
  onLoginSuccess: (token: string, username: string, userId: number) => void;
  onSwitchToSignUp: () => void;
}

export default function Login({ onClose, onLoginSuccess, onSwitchToSignUp }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const credentials: LoginRequest = { username, password };
      const response = await login(credentials);
      
      // userId 가져오기
      let userId: number | null = null;
      
      // 응답에 userId가 있으면 사용
      if (response.userId) {
        userId = response.userId;
      } else {
        // 로컬 스토리지에서 사용자 정보 찾기 (회원가입한 사용자)
        const savedUsers = localStorage.getItem('registeredUsers');
        if (savedUsers) {
          const users = JSON.parse(savedUsers);
          const user = users.find((u: { username: string; password: string; id: number }) => 
            u.username === username && u.password === password
          );
          if (user) {
            userId = user.id;
          }
        }
      }
      
      // userId를 찾지 못한 경우 에러
      if (!userId) {
        throw new Error('사용자 ID를 찾을 수 없습니다.');
      }
      
      onLoginSuccess(response.token, username, userId);
      onClose();
    } catch (err) {
      setError('로그인에 실패했습니다. 사용자명과 비밀번호를 확인해주세요.');
      console.error(err);
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
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="w-full max-w-md mx-4 bg-white rounded-lg shadow-2xl">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">로그인</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block mb-2 text-gray-700">사용자명</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="사용자명을 입력하세요"
                />
              </div>

              <div>
                <label className="block mb-2 text-gray-700">비밀번호</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="비밀번호를 입력하세요"
                />
              </div>

              {error && (
                <div className="p-3 text-sm text-red-800 bg-red-100 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? '로그인 중...' : '로그인'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={onSwitchToSignUp}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                계정이 없으신가요? 회원가입
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

