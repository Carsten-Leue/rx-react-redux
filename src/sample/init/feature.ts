import {
  createReduxFeatureModule,
  selectFeature
} from '../../impl/feature.module.impl';
import { sampleEpic } from './feature.epics';
import { INIT_FEATURE } from './feature.id';
import { sampleReducer } from './feature.reducer';

export const initFeatureModule = createReduxFeatureModule(
  INIT_FEATURE,
  sampleReducer,
  sampleEpic
);

export const selectInitFeature = selectFeature(initFeatureModule);
