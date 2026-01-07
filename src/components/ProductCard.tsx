import { useState } from 'react';
import type { Product } from '../types/product';

interface ProductCardProps {
  product: Product;
  onClick: (product: Product) => void;
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div 
      onClick={() => onClick(product)}
      className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(product);
        }
      }}
      aria-label={`${product.name} 상세보기`}
    >
      <div className="aspect-square overflow-hidden bg-gray-100">
        {imageError ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-200">
            <span className="text-gray-400 text-sm">이미지 없음</span>
          </div>
        ) : (
          <img 
            src={product.image} 
            alt={product.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        )}
      </div>
      <div className="p-4">
        <h3 className="mb-2 line-clamp-2">{product.name}</h3>
        <p className="text-blue-600 font-semibold">{product.price.toLocaleString()}원</p>
      </div>
    </div>
  );
}

