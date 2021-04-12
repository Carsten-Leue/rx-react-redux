import { Action, AnyAction, Store } from "redux";
import { ReduxFeatureModule } from "./feature.module";
import { ReduxRootState } from "./root.state";

/**
 * Implementation of a store that manages sub-state as features. Features are added
 * to the store automatically, when required by the select method.
 */
export interface ReduxRootStore<
  S = ReduxRootState,
  A extends Action = AnyAction
> extends Store<S, A> {
  /**
   * Registers a feature module with the root store
   *
   * @param aFeature - the feature model
   */
  addFeatureModule<RFS = any, FS = any>(
    aFeature: ReduxFeatureModule<RFS, FS>
  ): ReduxRootStore<FS, A>;
}

/**
 * Dependencies object available for epics
 */
export interface ReduxRootStoreDependencies {
  /**
   * The root store dependencies
   */
  rootStore: ReduxRootStore;
}
