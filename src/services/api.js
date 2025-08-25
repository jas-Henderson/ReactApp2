import axios from 'axios'

const baseURL = import.meta.env.VITE_BACKEND_BASE_URL
export const api = axios.create({ baseURL })

export async function listProducts(params = {}) {
  const { data } = await api.get('/products', { params })
  return data
}

export async function createCheckoutSession(items) {
  const { data } = await api.post('/checkout/create-session', { items })
  return data   // { url }
}