import {
  createReduxFeatureModule,
  selectFeature
} from '../../impl/feature.module.impl';
import { featureModuleId } from '../../store/feature.module';
import { sampleEpic } from './feature.epics';
import { sampleReducer } from './feature.reducer';
import { SampleFeatureState } from './feature.state';

export const SAMPLE_FEATURE = featureModuleId<SampleFeatureState, any>(
  'SAMPLE_FEATURE'
);

export const sampleFeatureModule = createReduxFeatureModule(
  SAMPLE_FEATURE,
  sampleReducer,
  sampleEpic
);

export const selectSampleFeature = selectFeature(sampleFeatureModule);
