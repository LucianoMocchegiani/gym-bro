export function getProduct(id: string) {
  return apiRequest<ProductDetail>(`/products/${id}`);
}

