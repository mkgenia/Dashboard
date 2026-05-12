import { useState, useEffect } from 'react';

/**
 * Hook para gestionar datos persistentes en el dispositivo del usuario.
 * @param key La clave bajo la cual se guardará el dato.
 * @param initialValue El valor por defecto si no hay nada guardado.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  // Estado para guardar el valor
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error leyendo localStorage clave "${key}":`, error);
      return initialValue;
    }
  });

  // Efecto para actualizar localStorage cuando el valor cambie
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.warn(`Error guardando en localStorage clave "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue] as const;
}
