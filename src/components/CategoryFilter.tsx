import { X } from 'lucide-react';

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
}

export default function CategoryFilter({
  categories,
  selectedCategory,
  onCategoryChange
}: CategoryFilterProps) {
  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      'electronics': '전자제품',
      'jewelery': '쥬얼리',
      "men's clothing": '남성 의류',
      "women's clothing": '여성 의류'
    };
    return labels[category] || category;
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => onCategoryChange(null)}
          className={`px-4 py-2 rounded-lg transition-colors ${
            selectedCategory === null
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
          aria-label="전체 카테고리"
          aria-pressed={selectedCategory === null}
        >
          전체
        </button>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onCategoryChange(category)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedCategory === category
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            aria-label={`${getCategoryLabel(category)} 카테고리`}
            aria-pressed={selectedCategory === category}
          >
            {getCategoryLabel(category)}
          </button>
        ))}
        {selectedCategory && (
          <button
            onClick={() => onCategoryChange(null)}
            className="p-2 text-gray-500 hover:text-gray-700"
            title="필터 초기화"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

