export interface WorkspaceRequestState { loading: boolean; error: string | null; }

// Shared external-store mechanics keep request state testable without a browser renderer.
export function createWorkspaceStore<T extends WorkspaceRequestState>(initial: T) {
  let state = initial;
  let pending = 0;
  let latestOperation = 0;
  const listeners = new Set<() => void>();
  const patch = (value: Partial<T>) => {
    state = { ...state, ...value };
    listeners.forEach((listener) => listener());
  };
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    patch,
    async run<R>(operation: () => Promise<R>): Promise<R> {
      const current = ++latestOperation;
      pending++;
      patch({ loading: true, error: null } as Partial<T>);
      try {
        return await operation();
      } catch (cause) {
        if (current === latestOperation) {
          patch({ error: cause instanceof Error ? cause.message : "Workspace request failed" } as Partial<T>);
        }
        throw cause;
      } finally {
        pending--;
        patch({ loading: pending > 0 } as Partial<T>);
      }
    },
  };
}
