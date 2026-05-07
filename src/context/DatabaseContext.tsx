import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { initializeDatabase } from '../database/connection';
import { ensureSyncBootstrap } from '../services/sincronizacaoService';

interface DatabaseContextValue {
  isReady: boolean;
  error: string | null;
}

const DatabaseContext = createContext<DatabaseContextValue>({
  isReady: false,
  error: null,
});

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    initializeDatabase()
      .then(() => ensureSyncBootstrap())
      .then(() => {
        if (isMounted) {
          setIsReady(true);
        }
      })
      .catch((databaseError) => {
        if (isMounted) {
          setError(databaseError instanceof Error ? databaseError.message : 'Falha ao abrir o banco local.');
          setIsReady(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      isReady,
      error,
    }),
    [error, isReady]
  );

  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>;
}

export function useDatabaseContext() {
  return useContext(DatabaseContext);
}
