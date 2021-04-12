import { Action, AnyAction, Reducer } from "redux";
import { createAction } from "redux-actions";
import { Epic } from "redux-observable";
import { UnaryFunction } from "rxjs";
import { hashRandomIdentifier } from "../utils/utils";
import { PayloadAction } from "./actions";
import { ReduxRootState } from "./root.state";
import { STORE_ID } from "./store.id";

/**
 * Our internal action identifier for the initialization action. We only keep
 * this readable for debugging purposes.
 */
const ACTION_INIT_FEATURE = `ACTION_INIT_FEATURE [${STORE_ID}]`;

/**
 * Action that is sent after a feature has been initialized
 */
export interface InitFeatureAction extends PayloadAction<string> {}

/**
 * Tests if an action is an initialization action
 *
 * @param aAction - the action to test
 * @returns true if the action is an InitFeatureAction
 */
export function isInitFeatureAction(
  aAction: any
): aAction is InitFeatureAction {
  return aAction && aAction.type === ACTION_INIT_FEATURE;
}

/**
 * Creates the action to init a feature
 *
 * @param aId - the ID of the feature that is being registered
 *
 * @returns the init action
 */
export const initFeatureAction: UnaryFunction<
  string,
  InitFeatureAction
> = createAction(ACTION_INIT_FEATURE);

/**
 * Feature module identifier. This wrapper around an ID is useful, because it carries type
 * information.
 */
export interface ReduxFeatureModuleId<S, FS = any> {
  /**
   * ID of the feature module, will also be used as the key to the state
   */
  id: string;
}

/**
 * Constructs a feature module ID that carries type information
 *
 * @param id - the module identifier or empty to create a random identifier
 * @returns the ID
 */
export function featureModuleId<S, FS = any>(
  id: string = hashRandomIdentifier()
): ReduxFeatureModuleId<S, FS> {
  return { id };
}

/**
 * Defines the feature module. The ID identifies the section in the state and is also
 * used to globally discriminate features.
 *
 * After instantiating a feature store the store will fire an initialization action for that feature. Use {@link ofInitFeature}
 * to register for these initialization actions.
 */
export interface ReduxFeatureModule<
  S,
  FS = any,
  Input extends Action = AnyAction,
  Output extends Input = Input,
  Dependencies = any
> extends ReduxFeatureModuleId<S, FS> {
  /**
   * ID of the feature module, will also be used as the key to the state
   */
  id: string;

  /**
   * The reducer for the module.
   */
  reducer?: Reducer<S>;
  /**
   * The epic for side effects
   */
  epic?: Epic<Input, Output, ReduxRootState, Dependencies>;
  /**
   * Dependencies on other modules
   */
  dependencies?: ArrayLike<ReduxFeatureModule<any>>;
}
