/** Map of africa-1 `assets.icon` paths → SVG components (Phase 4.3). */

import type { FC } from 'react';
import type { SvgProps } from 'react-native-svg';

import Icon_arrow_narrow_right from '@/city-icons/generic/arrow-narrow-right.svg';
import Icon_bolt from '@/city-icons/generic/bolt.svg';
import Icon_building_castle from '@/city-icons/generic/building-castle.svg';
import Icon_droplet from '@/city-icons/generic/droplet.svg';
import Icon_handcuffs from '@/city-icons/generic/handcuffs.svg';
import Icon_parking from '@/city-icons/generic/parking.svg';
import Icon_plane_tilt from '@/city-icons/generic/plane-tilt.svg';
import Icon_question_mark from '@/city-icons/generic/question-mark.svg';
import Icon_receipt_tax from '@/city-icons/generic/receipt-tax.svg';
import Icon_treasure_chest from '@/city-icons/generic/treasure-chest.svg';
import Icon_bf_ouagadougou from '@/city-icons/icons/bf-ouagadougou.svg';
import Icon_ci_yamoussoukro from '@/city-icons/icons/ci-yamoussoukro.svg';
import Icon_eg_cairo from '@/city-icons/icons/eg-cairo.svg';
import Icon_er_asmara from '@/city-icons/icons/er-asmara.svg';
import Icon_et_lalibela from '@/city-icons/icons/et-lalibela.svg';
import Icon_gh_accra from '@/city-icons/icons/gh-accra.svg';
import Icon_ke_nairobi from '@/city-icons/icons/ke-nairobi.svg';
import Icon_ls_maseru from '@/city-icons/icons/ls-maseru.svg';
import Icon_ly_benghazi from '@/city-icons/icons/ly-benghazi.svg';
import Icon_ma_casablanca from '@/city-icons/icons/ma-casablanca.svg';
import Icon_ma_fez from '@/city-icons/icons/ma-fez.svg';
import Icon_ma_marrakesh from '@/city-icons/icons/ma-marrakesh.svg';
import Icon_mg_antananarivo from '@/city-icons/icons/mg-antananarivo.svg';
import Icon_ml_timbuktu from '@/city-icons/icons/ml-timbuktu.svg';
import Icon_mu_port_louis from '@/city-icons/icons/mu-port-louis.svg';
import Icon_mz_maputo from '@/city-icons/icons/mz-maputo.svg';
import Icon_na_windhoek from '@/city-icons/icons/na-windhoek.svg';
import Icon_ng_lagos from '@/city-icons/icons/ng-lagos.svg';
import Icon_rw_kigali from '@/city-icons/icons/rw-kigali.svg';
import Icon_sd_meroe from '@/city-icons/icons/sd-meroe.svg';
import Icon_sn_dakar from '@/city-icons/icons/sn-dakar.svg';
import Icon_st_sao_tome from '@/city-icons/icons/st-sao-tome.svg';
import Icon_tn_tunis from '@/city-icons/icons/tn-tunis.svg';
import Icon_za_cape_town from '@/city-icons/icons/za-cape-town.svg';

type Icon = FC<SvgProps>;

const registry: Record<string, Icon> = {
  'city-icons/generic/arrow-narrow-right.svg': Icon_arrow_narrow_right,
  'city-icons/generic/bolt.svg': Icon_bolt,
  'city-icons/generic/building-castle.svg': Icon_building_castle,
  'city-icons/generic/droplet.svg': Icon_droplet,
  'city-icons/generic/handcuffs.svg': Icon_handcuffs,
  'city-icons/generic/parking.svg': Icon_parking,
  'city-icons/generic/plane-tilt.svg': Icon_plane_tilt,
  'city-icons/generic/question-mark.svg': Icon_question_mark,
  'city-icons/generic/receipt-tax.svg': Icon_receipt_tax,
  'city-icons/generic/treasure-chest.svg': Icon_treasure_chest,
  'city-icons/icons/bf-ouagadougou.svg': Icon_bf_ouagadougou,
  'city-icons/icons/ci-yamoussoukro.svg': Icon_ci_yamoussoukro,
  'city-icons/icons/eg-cairo.svg': Icon_eg_cairo,
  'city-icons/icons/er-asmara.svg': Icon_er_asmara,
  'city-icons/icons/et-lalibela.svg': Icon_et_lalibela,
  'city-icons/icons/gh-accra.svg': Icon_gh_accra,
  'city-icons/icons/ke-nairobi.svg': Icon_ke_nairobi,
  'city-icons/icons/ls-maseru.svg': Icon_ls_maseru,
  'city-icons/icons/ly-benghazi.svg': Icon_ly_benghazi,
  'city-icons/icons/ma-casablanca.svg': Icon_ma_casablanca,
  'city-icons/icons/ma-fez.svg': Icon_ma_fez,
  'city-icons/icons/ma-marrakesh.svg': Icon_ma_marrakesh,
  'city-icons/icons/mg-antananarivo.svg': Icon_mg_antananarivo,
  'city-icons/icons/ml-timbuktu.svg': Icon_ml_timbuktu,
  'city-icons/icons/mu-port-louis.svg': Icon_mu_port_louis,
  'city-icons/icons/mz-maputo.svg': Icon_mz_maputo,
  'city-icons/icons/na-windhoek.svg': Icon_na_windhoek,
  'city-icons/icons/ng-lagos.svg': Icon_ng_lagos,
  'city-icons/icons/rw-kigali.svg': Icon_rw_kigali,
  'city-icons/icons/sd-meroe.svg': Icon_sd_meroe,
  'city-icons/icons/sn-dakar.svg': Icon_sn_dakar,
  'city-icons/icons/st-sao-tome.svg': Icon_st_sao_tome,
  'city-icons/icons/tn-tunis.svg': Icon_tn_tunis,
  'city-icons/icons/za-cape-town.svg': Icon_za_cape_town,
};

export function resolveBoardIcon(iconPath: string | undefined | null): Icon | null {
  if (!iconPath) {
    return null;
  }
  return registry[iconPath] ?? null;
}

