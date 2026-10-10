import { useState, useEffect, useCallback } from 'react';
import { photoService } from '../services/api';

export function usePhotos(initialParams = {}) {
  const [photos, setPhotos] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [params, setParams] = useState(initialParams);

  const fetch = useCallback(async (fetchParams = params) => {
    setLoading(true);
    setError(null);
    try {
      const res = await photoService.getAll(fetchParams);
      setPhotos(res.data.photos);
      setPagination(res.data.pagination);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetch(params);
  }, [params]);

  const refetch = useCallback(() => fetch(params), [fetch, params]);

  return { photos, setPhotos, pagination, loading, error, params, setParams, refetch };
}
