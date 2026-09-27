export async function retryDatabaseRead<T>(
  operation: () => Promise<T>,
  attempts = 3,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        const jitter = Math.random() * 100;
        await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1) + jitter));
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Pembacaan database gagal setelah beberapa percobaan.');
}
