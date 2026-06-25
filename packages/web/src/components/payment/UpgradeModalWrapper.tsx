import { useUpgradeStore } from '../../stores/upgradeStore';
import { UpgradeModal } from './UpgradeModal';

export function UpgradeModalWrapper() {
  const { open, feature, limit, resetAt, hideUpgrade } = useUpgradeStore();

  return (
    <UpgradeModal
      open={open}
      onOpenChange={(isOpen) => !isOpen && hideUpgrade()}
      feature={feature}
      limit={limit}
      resetAt={resetAt}
    />
  );
}
