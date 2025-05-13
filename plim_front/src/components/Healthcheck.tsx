import { useCallback, useEffect, useRef, useState } from "react";

function useHealthcheck(url, interval = 5000, immediate = true) {
    const [healthcheckStatus, setHealthcheckStatus] = useState(null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const intervalRef = useRef(null);
  
    const fetchData = useCallback(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const result = await response.json();
        console.log(result);
        setHealthcheckStatus(result.status);
        setError(null);
      } catch (err) {
        setHealthcheckStatus("error");
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }, [url]);
  
    const startPolling = useCallback(() => {
      if (!intervalRef.current) {
        fetchData();
        intervalRef.current = setInterval(fetchData, interval);
      }
    }, [fetchData, interval]);
  
    const stopPolling = useCallback(() => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, []);
  
    useEffect(() => {
      if (immediate) {
        startPolling();
      }
      return stopPolling;
    }, [immediate, startPolling, stopPolling]);
  
    return { healthcheckStatus, error, isLoading, startPolling, stopPolling };
  }

export default useHealthcheck;