import { getApiBaseUrl } from './baseUrl';
import { FilterGroup } from '../types';

const API_BASE = `${getApiBaseUrl()}/api/filter-groups`;

export interface FilterGroupData {
  id: string;
  label: string;
  items: any;
  displayOrder?: number;
}

// Get all filter groups
export const fetchFilterGroups = async (): Promise<FilterGroup[]> => {
  const response = await fetch(API_BASE);
  if (!response.ok) {
    throw new Error(`Failed to fetch filter groups: ${response.statusText}`);
  }
  return response.json();
};

// Get single filter group
export const fetchFilterGroup = async (groupId: string): Promise<FilterGroup> => {
  const response = await fetch(`${API_BASE}/${encodeURIComponent(groupId)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch filter group: ${response.statusText}`);
  }
  return response.json();
};

// Create or update filter group
export const saveFilterGroup = async (group: FilterGroupData): Promise<void> => {
  const token = localStorage.getItem('token');
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(group),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Failed to save filter group: ${response.statusText}`);
  }
};

// Update filter group
export const updateFilterGroup = async (groupId: string, group: Omit<FilterGroupData, 'id'>): Promise<void> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE}/${encodeURIComponent(groupId)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(group),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Failed to update filter group: ${response.statusText}`);
  }
};

// Delete filter group
export const deleteFilterGroupAPI = async (groupId: string): Promise<void> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE}/${encodeURIComponent(groupId)}`, {
    method: 'DELETE',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Failed to delete filter group: ${response.statusText}`);
  }
};

// Get filter assignments
export const fetchFilterAssignments = async (): Promise<Record<string, string>> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE}/config/assignments`, {
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch filter assignments: ${response.statusText}`);
  }
  return response.json();
};

// Update filter assignments
export const updateFilterAssignments = async (assignments: Record<string, string>): Promise<void> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE}/config/assignments`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ assignments }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Failed to update filter assignments: ${response.statusText}`);
  }
};

// Update filter group order
export const updateFilterGroupOrder = async (order: string[]): Promise<void> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE}/config/order`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ order }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Failed to update filter group order: ${response.statusText}`);
  }
};

// Update filter items order within a group
export const updateFilterItemsOrder = async (groupId: string, itemOrder: string[], parentId?: string): Promise<void> => {
  const token = localStorage.getItem('token');
  const url = `${API_BASE}/items/order`;
  console.log('[updateFilterItemsOrder] Request URL:', url, { groupId, itemOrder, parentId });
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ groupId, itemOrder, parentId }),
  });
  
  console.log('[updateFilterItemsOrder] Response status:', response.status, response.statusText);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    console.error('[updateFilterItemsOrder] Error:', error);
    throw new Error(error.message || `Failed to update filter items order: ${response.statusText}`);
  }
};

// Legacy localStorage functions (for backward compatibility)
const FILTER_CONFIG_KEY = 'filterConfig';

export interface FilterConfig {
  order: string[];
  assignments: { genre: string; platform: string };
}

export const saveFilterConfig = (config: FilterConfig): void => {
  try {
    localStorage.setItem(FILTER_CONFIG_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save filter config:', error);
  }
};

export const loadFilterConfig = (): FilterConfig | null => {
  try {
    const raw = localStorage.getItem(FILTER_CONFIG_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FilterConfig;
  } catch (error) {
    console.error('Failed to load filter config:', error);
    return null;
  }
};

