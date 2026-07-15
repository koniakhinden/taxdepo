'use client';

import { useI18n } from './i18n-provider';
import { USAGE_TYPES } from '../lib/i18n';

export default function UsageFields({ form, set }) {
  const { t } = useI18n();
  const labels = { work: t('usageWork'), partial: t('usagePartial'), personal: t('usagePersonal') };

  return (
    <>
      <label>{t('usageTypeLabel')}</label>
      <div className="seg">
        {USAGE_TYPES.map((u) => (
          <button
            key={u}
            type="button"
            className={form.usage_type === u ? 'active' : ''}
            onClick={() => set('usage_type', u)}
          >
            {labels[u]}
          </button>
        ))}
      </div>

      {form.usage_type === 'partial' && (
        <>
          <label>{t('businessPercentLabel')}</label>
          <input
            type="number"
            min="0"
            max="100"
            value={form.business_percent}
            onChange={(e) => set('business_percent', e.target.value)}
          />
        </>
      )}
    </>
  );
}
