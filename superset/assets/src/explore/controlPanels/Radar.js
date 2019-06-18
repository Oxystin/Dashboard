import { t } from '@superset-ui/translation';
import { nonEmpty } from '../validators';

export default {
  controlPanelSections: [
    {
      label: t('Query'),
      expanded: true,
      controlSetRows: [
        ['groupby'],
        ['metrics'],
        ['adhoc_filters'],
      ],
    },
    {
      label: t('Chart Options'),
      expanded: true,
      controlSetRows: [
        ['color_scheme'],
        ['number_format'],
        ['radar_scale', 'radar_levels'],
        ['radar_label_dist', 'radar_label_wrap'],
        ['radar_fill_area','radar_line_smooth','radar_show_legend']
      ],
    },
  ],
};
