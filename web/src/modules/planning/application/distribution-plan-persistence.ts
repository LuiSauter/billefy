import { DistributionPlan } from "../domain/distribution-plan";

interface PersistenceOptions {
  save: (plan: DistributionPlan) => Promise<unknown>;
  onError: (error: unknown, failedPlan: DistributionPlan) => void;
}

export function createPlanPersistence({ save, onError }: PersistenceOptions) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: DistributionPlan | null = null;
  let ready = false;
  let inFlight = false;

  const cancelPending = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    pending = null;
    ready = false;
  };

  // Never overlap PUTs: ignoring stale responses cannot undo a stale server write.
  const drain = async () => {
    if (inFlight || !ready || !pending) return;
    const snapshot = pending;
    pending = null;
    ready = false;
    inFlight = true;
    try {
      await save(snapshot);
    } catch (error) {
      onError(error, snapshot);
    } finally {
      inFlight = false;
      void drain(); // A failed write must not poison later user intent.
    }
  };

  const schedule = (plan: DistributionPlan, immediate = false) => {
    cancelPending();
    pending = plan; // Coalesce everything not yet sent, including a queued activation.
    if (immediate) {
      ready = true;
      void drain();
    } else {
      timer = setTimeout(() => {
        timer = null;
        ready = true;
        void drain();
      }, 500);
    }
  };
  return { schedule, cancelPending };
}
