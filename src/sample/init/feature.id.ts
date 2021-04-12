import { featureModuleId } from '../../store/feature.module';
import { SampleFeatureState } from './feature.state';

export const INIT_FEATURE = featureModuleId<SampleFeatureState>('INIT_FEATURE');
