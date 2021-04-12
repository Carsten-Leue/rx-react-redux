import { Action, AnyAction, Reducer } from "redux";
import { Epic } from "redux-observable";
import { Observable, OperatorFunction, pipe, UnaryFunction } from "rxjs";
import { filter, mapTo, take } from "rxjs/operators";
import { selectPayload } from "../store/actions";
import {
  isInitFeatureAction,
  ReduxFeatureModule,
  ReduxFeatureModuleId,
} from "../store/feature.module";
import { ReduxRootState } from "../store/root.state";
import { ReduxRootStore } from "../store/root.store";
import {
  getProperty,
  hashRandomIdentifier,
  isNotNil,
  isString,
} from "../utils/utils";
import { rxSelect, rxStore } from "./root.store.impl";

/**
 * Convenience method to create a feature module
 *
 * @param idOrModuleId  - ID of the store, if not set, generate a random identifier
 * @param reducer - optionally the reducer
 * @param epic - optionally the epic
 * @param dependencies - optionally the dependencies on other modules
 *
 * @returns a {@link ReduxFeatureModule} instance
 */
export function createReduxFeatureModule<
  S,
  FS = any,
  Input extends Action = AnyAction,
  Output extends Input = Input,
  Dependencies = any
>(
  idOrModuleId?: string | ReduxFeatureModuleId<S, FS>,
  reducer?: Reducer<S>,
  epic?: Epic<Input, Output, ReduxRootState, Dependencies>,
  dependencies?: ArrayLike<ReduxFeatureModule<any>>
): ReduxFeatureModule<S, FS, Input, Output, Dependencies> {
  // extract the ID
  const id = isString(idOrModuleId)
    ? idOrModuleId
    : isNotNil(idOrModuleId)
    ? idOrModuleId.id
    : hashRandomIdentifier();
  // just returns a simple wrapper
  return {
    id,
    reducer,
    epic,
    dependencies,
  };
}

/**
 * Convenience method to create a meta module, i.e. a module that bundles other modules
 *
 * @param dependencies - dependencies on other modules
 *
 * @returns a {@link ReduxFeatureModule} instance
 */
export function createReduxMetaModule<FS = any>(
  dependencies: ArrayLike<ReduxFeatureModule<any>>
): ReduxFeatureModule<any, FS> {
  // just dispatch with empty defaults
  return createReduxFeatureModule<any, FS>(
    undefined,
    undefined,
    undefined,
    dependencies
  );
}

/**
 * Selects the ID of a feature
 *
 * @param idOrModuleId - the identifier
 * @returns the ID
 */
function selectId(
  idOrModuleId: string | ReduxFeatureModuleId<any, any>
): string {
  return isString(idOrModuleId) ? idOrModuleId : idOrModuleId.id;
}

/**
 * Returns a selector that selects the given feature
 *
 * @param idOrModuleId - ID of the module
 *
 * @returns the selector
 */
export const selectFeature: <S, FS = any>(
  idOrModuleId: string | ReduxFeatureModuleId<S, FS>,
  aDefaultState?: S
) => UnaryFunction<ReduxRootState, S> = (idOrModuleId, aDefaultState) => (
  aState: ReduxRootState
) => {
  const key = selectId(idOrModuleId);
  return getProperty(aState, key, aDefaultState);
};

/**
 * Returns a selector that selects the given feature from the store and returns an observable to that feature state.
 *
 * @param idOrModuleId - ID of the module
 *
 * @returns an observable with the feature selected
 */
export function rxSelectFeature<S, FS = any>(
  idOrModuleId: string | ReduxFeatureModuleId<S, FS>
): UnaryFunction<ReduxRootStore, Observable<S>> {
  return (store) =>
    rxStore(store).pipe(rxSelect(selectFeature<S>(idOrModuleId)));
}

/**
 * Returns an operator function that filters the initialization actions for a particular feature. This
 * is typically used in feature epics. Since we know that an initialization can occur at most once,
 * the operator also terminates automatically after the first emission.
 *
 * @param idOrModuleId - the feature ID to filter for
 * @returns the operator function that filters for the initialization action and resolves to the ID of the feature
 */
export function ofInitFeature<A = AnyAction>(
  idOrModuleId: string | ReduxFeatureModuleId<any, any>
): OperatorFunction<A, string> {
  // extract the id
  const id = selectId(idOrModuleId);
  // return the operator
  return pipe(
    filter<A>((a) => isInitFeatureAction(a) && selectPayload(a) === id),
    take(1),
    mapTo(id)
  );
}

/**
 * Scopes the given ID with a feature prefix to make it unique
 *
 * @param idOrModuleId  - the module
 * @param aValue - optionally a identifier, will create a random identifier otherwise
 *
 * @returns the new identifier
 */
export function createIdentifier(
  idOrModuleId: string | ReduxFeatureModuleId<any, any>,
  aValue: string = hashRandomIdentifier()
) {
  // extract the id
  const id = selectId(idOrModuleId);
  // prefix
  return `[${id}]${aValue}`;
}
