import {
  Action,
  AnyAction,
  applyMiddleware,
  combineReducers,
  createStore,
  Dispatch,
  Middleware,
  Reducer,
  Store
} from "redux";
import { composeWithDevTools } from "redux-devtools-extension";
import { createEpicMiddleware, Epic } from "redux-observable";
import {
  noop,
  Observable,
  Observer,
  of,
  OperatorFunction,
  queueScheduler,
  Subject,
  UnaryFunction
} from "rxjs";
import {
  distinct,
  filter,
  map,
  mergeAll,
  mergeMap,
  observeOn,
  scan,
  shareReplay,
  takeUntil
} from "rxjs/operators";
import { initFeatureAction, ReduxFeatureModule } from "../store/feature.module";
import { ReduxRootState } from "../store/root.state";
import {
  ReduxRootStore,
  ReduxRootStoreDependencies
} from "../store/root.store";
import {
  constGenerator,
  Consumer,
  EqualsPredicate,
  isEqual,
  isNil,
  isNotNil,
  pluckProperty,
  rxMemoize
} from "../utils/utils";

/**
 * Exposes the store as an {@link https://rxjs.dev/api/index/class/Observable|Observable}.
 *
 * @param aStore - the store
 * @returns the store as an {@link https://rxjs.dev/api/index/class/Observable|Observable}
 */
export function rxStore<S>(aStore: Store<S>): Observable<S> {
  return new Observable<S>((observer: Observer<S>) => {
    // current state
    observer.next(aStore.getState());
    // initial state
    const done = aStore.subscribe(() => observer.next(aStore.getState()));
    // cleanup
    return () => {
      // done
      done();
      // end the store sequence
      observer.complete();
    };
  });
}

/**
 * Exposes a memoized selector function
 *
 * @param aSelector - the selector function
 * @param aCmp - optional comparator used to tell if a value is identical
 *
 * @returns the memoized selector
 */
export const rxSelect: <T, R>(
  aSelector: UnaryFunction<T, R>,
  aCmp?: EqualsPredicate<R>
) => OperatorFunction<T, R> = (sel, cmp = isEqual) => rxMemoize(map(sel), cmp);

/**
 * Binds the dispatch method
 *
 * @param aStore - store to bind to
 * @returns the dispatch method
 */
export const rxDispatch: <S>(aStore: Store<S>) => Consumer<AnyAction> = (
  aStore
) => (aAction: AnyAction) => aStore.dispatch(aAction);

/**
 * ID selector
 */
const selectId = pluckProperty<ReduxFeatureModule<any>, "id">("id");

/**
 * Reducer selector
 */
const selectReducer = pluckProperty<ReduxFeatureModule<any>, "reducer">(
  "reducer"
);

/**
 * Epic selector
 */
const selectEpic = pluckProperty<ReduxFeatureModule<any>, "epic">("epic");

/**
 * Tests if the feature has a reducer
 *
 * @param aModule - the module to check
 * @returns true if the module has a reducer
 */
const hasReducer = (aModule: ReduxFeatureModule<any>): boolean =>
  isNotNil(selectReducer(aModule));

/**
 * Tests if the feature has an epic
 *
 * @param aModule - the module to check
 * @returns true if the module has an epic
 */
const hasEpic = (aModule: ReduxFeatureModule<any>): boolean =>
  isNotNil(selectEpic(aModule));

/**
 * Constructs a new store that can handle feature modules.
 *
 * @param aDependencies - the dependencies that will be injected into the epics
 * @param aPreLoadedState - optionally an initial state object
 *
 * @returns the store. Use the {@link ReduxRootStore.addFeatureModule} method to register a feature module.
 */
export function createReduxRootStore(
  aDependencies: any,
  aPreLoadedState?: ReduxRootState
): ReduxRootStore {
  // shutdown trigger in case we need it some time
  const done$ = new Subject<void>();

  /**
   * The set of known modules, to avoid cycles and duplicate registration
   */
  const modules: Record<string, ReduxFeatureModule<any>> = {};

  /**
   * Sequence of added modules
   */
  const moduleSubject = new Subject<ReduxFeatureModule<any>>();

  /**
   * Subscribe to the resolved modules
   */
  const module$ = moduleSubject.pipe(
    distinct(selectId),
    shareReplay(),
    takeUntil(done$)
  );

  /**
   * Build the reducers
   */
  const reducer$ = module$.pipe(
    /**
     * Only modules with a reducer
     */
    filter(hasReducer),
    /**
     * Build a map of all registered reducers
     */
    scan(
      (
        all: Record<string, Reducer<ReduxRootState>>,
        aModule: ReduxFeatureModule<any>
      ) => ({
        ...all,
        [selectId(aModule)]: selectReducer(aModule),
      }),
      {}
    ),
    /**
     * Combine all into one
     */
    map(combineReducers)
  );

  /**
   * Build the epics
   */
  const epic$ = module$.pipe(
    /**
     * Only modules with an epic
     */
    filter(hasEpic),
    /**
     * extract the epic
     */
    map(selectEpic)
  );

  /**
   * Root epic that combines all of the incoming epics
   */
  const rootEpic: Epic = (action$, state$, deps) =>
    epic$.pipe(
      mergeMap((epic) => epic(action$, state$, deps)),
      takeUntil(done$)
    );

  /**
   * augment the dependencies
   */
  const dependencies = {
    ...aDependencies,
  };

  /**
   * Construct the side effects
   */
  const epicMiddleware = createEpicMiddleware({
    dependencies,
  });

  const crashReporterMiddleware: Middleware = (aStore) => (next) => (
    action
  ) => {
    try {
      return next(action);
    } catch (err) {
      console.error("Caught an exception!", err);
      throw err;
    }
  };

  // initial reducer
  const defaultReducer = constGenerator({});
  const defaultEnhancer = composeWithDevTools(
    applyMiddleware(
      // this MUST be the first one
      epicMiddleware,
      crashReporterMiddleware
    )
  );

  // construct our store
  const store: Store<ReduxRootState> = isNotNil(aPreLoadedState)
    ? createStore(defaultReducer, aPreLoadedState, defaultEnhancer)
    : createStore(defaultReducer, defaultEnhancer);

  // start the middleware
  epicMiddleware.run(rootEpic);

  // dispatch
  const dispatch: Dispatch<AnyAction> = (action) => store.dispatch(action);
  const getState = () => store.getState();
  const subscribe = (listener: () => void) => store.subscribe(listener);
  const replaceReducer = noop;

  // changes in the set of reducers
  const reducerAdded$ = reducer$.pipe(
    map((reducer) => store.replaceReducer(reducer))
  );
  // notifications about new feature states
  const newModule$ = module$.pipe(
    map(selectId),
    map(initFeatureAction),
    observeOn(queueScheduler),
    map(dispatch)
  );

  // subscribe
  of(reducerAdded$, newModule$).pipe(mergeAll()).subscribe();

  /**
   * Registers a new feature module
   *
   * @param aModule - the feature module
   */
  function addFeatureModule<FS, RFS>(
    aModule: ReduxFeatureModule<RFS>
  ): ReduxRootStore<FS, Action> {
    // get the id
    const id = selectId(aModule);
    const oldModule = modules[id];
    if (isNil(oldModule)) {
      // register this module
      modules[id] = aModule;
      // iterate over the dependencies
      const deps = aModule.dependencies;
      if (isNotNil(deps)) {
        const len = deps.length;
        for (let i = 0; i < len; ++i) {
          addFeatureModule(deps[i]);
        }
      }
      // dispatch to the subject
      moduleSubject.next(aModule);
    }
    // returns a cast to the store
    return this;
  }
  /**
   * Returns our API
   */
  const rootStore: ReduxRootStore = {
    ...store,
    addFeatureModule,
    getState,
    subscribe,
    replaceReducer,
    dispatch,
  };

  /**
   * Epic dependencies
   */
  const rootDeps: ReduxRootStoreDependencies = { rootStore };

  /**
   * Augment the dependencies
   */
  Object.assign(dependencies, rootDeps);

  /**
   * Returns the API
   */
  return rootStore;
}
