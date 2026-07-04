const API_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? `${window.location.origin}/api` : 'http://localhost:5000/api');

export async function api(path, options = {}) {
  const token = localStorage.getItem('alberca_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Request failed.');
  }

  return data;
}

export async function uploadProductImage(file) {
  const token = localStorage.getItem('alberca_token');
  const headers = {
    'Content-Type': file.type
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}/products/upload-image`, {
    method: 'POST',
    headers,
    body: file
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Image upload failed.');
  }

  return data;
}

export { API_URL };
