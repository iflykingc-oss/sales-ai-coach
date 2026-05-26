import { useState, useCallback } from 'react';
import { type ZodTypeAny, type TypeOf } from 'zod';

type ValidationState = 'default' | 'error' | 'success';

interface FieldState {
  value: string;
  state: ValidationState;
  message: string;
}

interface UseFormValidationResult<S extends ZodTypeAny> {
  fields: Record<string, FieldState>;
  errors: Record<string, string>;
  setFieldValue: (field: string, value: string) => void;
  validateField: (field: string, value: string) => boolean;
  validateAll: () => boolean;
  getVariant: (field: string) => ValidationState | undefined;
  getErrorMessage: (field: string) => string | undefined;
  resetFields: () => void;
  parseData: () => TypeOf<S> | null;
}

export function useFormValidation<S extends ZodTypeAny>(
  schema: S,
  initialValues: Record<string, string>,
): UseFormValidationResult<S> {
  const [fields, setFields] = useState<Record<string, FieldState>>(
    Object.fromEntries(
      Object.entries(initialValues).map(([key]) => [key, { value: '', state: 'default' as const, message: '' }]),
    ),
  );

  const runValidation = useCallback(
    (data: Record<string, string>): { success: true } | { success: false; errors: Map<string, string> } => {
      const result = schema.safeParse(data);
      if (result.success) return { success: true };

      const errorMap = new Map<string, string>();
      for (const err of result.error.errors) {
        const path = err.path.join('.');
        if (!errorMap.has(path)) {
          errorMap.set(path, err.message);
        }
      }
      return { success: false, errors: errorMap };
    },
    [schema],
  );

  const validateField = useCallback(
    (field: string, value: string): boolean => {
      const data = { ...fields, [field]: { value, state: 'default' as const, message: '' } };
      const flatData = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.value]));
      const result = runValidation(flatData as Record<string, string>);

      if (result.success) {
        setFields((prev) => ({
          ...prev,
          [field]: { value, state: 'success', message: '' },
        }));
        return true;
      }

      const fieldError = result.errors.get(field);
      setFields((prev) => ({
        ...prev,
        [field]: {
          value,
          state: fieldError ? 'error' : 'success',
          message: fieldError ?? '',
        },
      }));
      return !fieldError;
    },
    [schema, fields, runValidation],
  );

  const validateAll = useCallback((): boolean => {
    const data = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v.value]));
    const result = runValidation(data as Record<string, string>);

    if (result.success) return true;

    const newFields = { ...fields };
    result.errors.forEach((message, path) => {
      if (newFields[path]) {
        newFields[path] = { ...newFields[path], state: 'error', message };
      }
    });
    setFields(newFields);
    return false;
  }, [schema, fields, runValidation]);

  const setFieldValue = useCallback((field: string, value: string) => {
    setFields((prev) => ({
      ...prev,
      [field]: { value, state: 'default', message: '' },
    }));
  }, []);

  const getVariant = useCallback(
    (field: string): ValidationState | undefined => fields[field]?.state,
    [fields],
  );

  const getErrorMessage = useCallback(
    (field: string): string | undefined => (fields[field]?.state === 'error' ? fields[field]?.message : undefined),
    [fields],
  );

  const parseData = useCallback((): TypeOf<S> | null => {
    const data = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v.value]));
    const result = schema.safeParse(data);
    return result.success ? result.data : null;
  }, [schema, fields]);

  const resetFields = useCallback(() => {
    setFields(
      Object.fromEntries(
        Object.entries(initialValues).map(([key]) => [key, { value: '', state: 'default', message: '' }]),
      ),
    );
  }, [initialValues]);

  const errors = Object.fromEntries(
    Object.entries(fields)
      .filter(([, v]) => v.state === 'error')
      .map(([k, v]) => [k, v.message]),
  );

  return {
    fields,
    errors,
    setFieldValue,
    validateField,
    validateAll,
    getVariant,
    getErrorMessage,
    resetFields,
    parseData,
  };
}
