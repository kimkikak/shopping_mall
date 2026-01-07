import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export type SortOption = 'default' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc';

interface ProductSortProps {
  sortOption: SortOption;
  onSortChange: (option: SortOption) => void;
}

export default function ProductSort({ sortOption, onSortChange }: ProductSortProps) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => onSortChange('default')}
          className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
            sortOption === 'default'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
          aria-label="기본 정렬"
        >
          <ArrowUpDown className="w-4 h-4" />
          기본
        </button>
        <button
          onClick={() => onSortChange('price-asc')}
          className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
            sortOption === 'price-asc'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
          aria-label="가격 낮은순"
        >
          <ArrowUp className="w-4 h-4" />
          가격 낮은순
        </button>
        <button
          onClick={() => onSortChange('price-desc')}
          className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
            sortOption === 'price-desc'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
          aria-label="가격 높은순"
        >
          <ArrowDown className="w-4 h-4" />
          가격 높은순
        </button>
        <button
          onClick={() => onSortChange('name-asc')}
          className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
            sortOption === 'name-asc'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
          aria-label="이름순"
        >
          이름순
        </button>
      </div>
    </div>
  );
}

