/**
 * Implementation of a {@link https://redux.js.org/api/store|Redux} store with support for adding feature modules, dynamically.
 *
 * @packageDocumentation
 */

export {
  createIdentifier,
  createReduxFeatureModule,
  createReduxMetaModule,
  ofInitFeature,
  rxSelectFeature,
  selectFeature
} from "./impl/feature.module.impl";
export {
  createReduxRootStore,
  rxDispatch,
  rxSelect,
  rxStore
} from "./impl/root.store.impl";
export { PayloadAction, selectPayload } from "./store/actions";
export {
  featureModuleId,
  ReduxFeatureModule,
  ReduxFeatureModuleId
} from "./store/feature.module";
export { ReduxRootState } from "./store/root.state";
export { ReduxRootStore, ReduxRootStoreDependencies } from "./store/root.store";
export { STORE_ID } from "./store/store.id";

