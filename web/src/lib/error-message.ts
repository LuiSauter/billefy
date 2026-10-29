export function getErrorMessage(err: unknown, fallback: string = "Ocurrió un error inesperado"): string {
  if (typeof err === "string" && err.trim().length > 0) {
    return err;
  }
  if (err instanceof Error) {
    return err.message.trim().length > 0 ? err.message : fallback;
  }
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    const msg = (err as { message: string }).message.trim();
    return msg.length > 0 ? msg : fallback;
  }
  return fallback;
}
