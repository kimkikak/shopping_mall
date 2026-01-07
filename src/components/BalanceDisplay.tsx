import { Wallet } from 'lucide-react';
import { ReactNode } from 'react';

interface BalanceDisplayProps {
  balance: number;
  children?: ReactNode;
}

export default function BalanceDisplay({ balance, children }: BalanceDisplayProps) {
  return (
    <div className="flex items-center justify-between gap-3 mb-6 p-4 bg-white rounded-lg shadow-sm">
      <div className="flex items-center gap-3">
        <Wallet className="w-6 h-6 text-blue-600" />
        <div>
          <p className="text-sm text-gray-600">현재 잔액</p>
          <p className="text-blue-600">{balance.toLocaleString()}원</p>
        </div>
      </div>
      {children}
    </div>
  );
}

