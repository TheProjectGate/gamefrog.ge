import { getApiBaseUrl } from './baseUrl';

export interface UploadImageResponse {
  message: string;
  imageUrl: string;
  filename: string;
}

export interface UploadImagesResponse {
  message: string;
  images: Array<{
    imageUrl: string;
    filename: string;
  }>;
}

export const uploadImage = async (file: File): Promise<UploadImageResponse> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Authentication token missing');
  }

  const formData = new FormData();
  formData.append('image', file);

  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/api/upload/image`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to upload image' }));
    throw new Error(error.message || 'Failed to upload image');
  }

  return response.json();
};

export const uploadImages = async (files: File[]): Promise<UploadImagesResponse> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Authentication token missing');
  }

  const formData = new FormData();
  files.forEach(file => {
    formData.append('images', file);
  });

  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/api/upload/images`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to upload images' }));
    throw new Error(error.message || 'Failed to upload images');
  }

  return response.json();
};

export const deleteUploadedImage = async (filename: string): Promise<void> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Authentication token missing');
  }

  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/api/upload/image/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to delete image' }));
    throw new Error(error.message || 'Failed to delete image');
  }
};

