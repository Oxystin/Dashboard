import { t } from '@superset-ui/translation';

export default {
  controlPanelSections: [
    {
      label: t('Query'),
      expanded: true,
      controlSetRows: [
        ['metric'],
        ['adhoc_filters'],
      ],
    },
    {
      label: t('Chart Options'),
      expanded: true,
      controlSetRows: [
        ['subheader'],
        ['y_axis_format'],
        ['steps'],
        ['fill_background'],
      ],
    },
  ],
  controlOverrides: {
    y_axis_format: {
      label: t('Number format'),
    },
    steps: {
      isInt: false,
      validators: null,
      renderTrigger: false,
      default: '',
      label: t('Force Color JSON'),
      description: t('Force Color Steps by Range'),
    },
  },
};
