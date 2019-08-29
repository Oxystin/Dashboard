import { t } from '@superset-ui/translation';

export default {
  controlPanelSections: [
    {
      label: t('Query'),
      expanded: true,
      controlSetRows: [
        ['metrics'],
        ['adhoc_filters'],
        ['groupby'],
        ['columns'],
        ['row_limit', null],
      ],
    },
    {
      label: t('Pivot Options'),
      controlSetRows: [
        ['pandas_aggfunc', 'pivot_margins'],
        ['number_format', 'combine_metric'],
      ],
    },
    {
      label: t('Advanced'),
      expanded: false,
      controlSetRows: [
        ['json_parameter'],
        ['json_parameter_2'],
      ],
    },
    {
      label: t('Options'),
      expanded: true,
      controlSetRows: [
        ['show_progress_bar','align_pn', 'color_pn'],
      ],
    },
  ],
  controlOverrides: {
    groupby: { includeTime: true },
    columns: { includeTime: true },
  },
};
